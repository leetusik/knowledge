"""Chapter image assets (P30.S4) — the very-core guarantees only.

* EXIF GPS is gone from a stored JPEG, and the pixels are the uploaded ones.
* A magic-byte mismatch and each limit produce a 422 entry (one list).
* Publishing stores the image content-addressed, records the map in the header
  (re-derived by reindex), and ``.assets/`` never appears in a tenant #1 commit.
* Deleting the document removes its image files.
* An asset of a private project's document is a 404 identical to a missing one,
  and an asset not in the document's map is a 404 (Postgres-gated).
"""
from __future__ import annotations

import base64
import io
import subprocess
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from server import assets as assets_mod
from server import db

_INDEX = "# Knowledge Base\n\n## Recent\n\n<!-- explain:recent -->\n\n## Browse\n"
_PAYLOAD = {
    "title": "Images",
    # Only a native chapter may carry images (P30.S5, OQ14).
    "format": "native",
    "markdown": "## Images\n\nA body.\n",
    "project": "pics",
    "tags": ["testing", "images"],
    "source_repo": "acme/repo",
    "date": "2026-10-21",
    "slug": "images",
}
_REL = "pics/2026-10-21-images.md"
_ASSET_DIR = ".assets/pics/2026-10-21-images"


def _gps_jpeg() -> bytes:
    exif = Image.Exif()
    exif[0x010F] = "PhoneMaker"
    exif[0x0112] = 6  # rotated 90 degrees: displayed width/height swap
    gps = exif.get_ifd(0x8825)
    gps[1], gps[2], gps[3], gps[4] = "N", (37.0, 33.0, 0.0), "E", (126.0, 58.0, 0.0)
    im = Image.new("RGB", (40, 30))
    for x in range(40):
        for y in range(30):
            im.putpixel((x, y), (x * 6, y * 8, (x * y) % 255))
    buf = io.BytesIO()
    im.save(buf, "JPEG", exif=exif.tobytes(), quality=90)
    return buf.getvalue()


def _png(color=(200, 10, 10)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (8, 6), color).save(buf, "PNG")
    return buf.getvalue()


def _item(name, data, media_type):
    return {"name": name, "media_type": media_type, "content_base64": base64.b64encode(data).decode()}


def _git(root, *args):
    return subprocess.run(
        ["git", "-C", str(root), *args], capture_output=True, text=True, check=True
    )


# --- validation + stripping (pure) --------------------------------------------


def test_stored_jpeg_has_no_gps_and_keeps_its_pixels():
    original = _gps_jpeg()
    assert b"PhoneMaker" in original
    (asset,) = assets_mod.prepare_assets([_item("photo", original, "image/jpeg")])

    stored = Image.open(io.BytesIO(asset.data))
    exif = stored.getexif()
    assert exif.get_ifd(0x8825) == {}  # no GPS IFD
    assert dict(exif) == {0x0112: 6}  # only the orientation survives
    assert b"PhoneMaker" not in asset.data
    with Image.open(io.BytesIO(original)) as before:
        assert stored.tobytes() == before.tobytes()  # lossless: same decoded pixels
    assert (asset.width, asset.height) == (30, 40)  # displayed size after rotation
    assert asset.file.endswith(".jpg") and len(asset.file) == 64 + 4


def test_magic_mismatch_and_every_limit_is_one_422_list():
    junk = b"\x89PNG\r\n\x1a\n" + b"\0" * (1_900_000)
    items = [
        _item("liar", _gps_jpeg(), "image/png"),  # JPEG bytes declared as PNG
        _item("huge", b"\x89PNG\r\n\x1a\n" + b"\0" * (2 * 1024 * 1024), "image/png"),
        _item("vector", b"<svg/>", "image/svg+xml"),
    ] + [_item(f"j{i}", junk, "image/png") for i in range(19)]  # 22 images, > 12 MB
    with pytest.raises(assets_mod.AssetError) as err:
        assets_mod.prepare_assets(items)
    codes = {(v["code"], v.get("asset")) for v in err.value.to_detail()}
    assert ("asset-magic", "liar") in codes
    assert ("asset-size", "huge") in codes
    assert ("asset-type", "vector") in codes
    assert ("asset-count", None) in codes
    assert ("asset-total", None) in codes
    for v in err.value.to_detail():
        assert set(v) >= {"line", "col", "code", "message"}  # S3's to_detail() shape


# --- the write path over a temp git repo (tenant #1 / legacy public root) -----


@pytest.fixture
def client(tmp_path, monkeypatch):
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "index.md").write_text(_INDEX, encoding="utf-8")
    _git(tmp_path, "init")
    _git(tmp_path, "config", "user.name", "kb-test")
    _git(tmp_path, "config", "user.email", "kb-test@example.com")
    _git(tmp_path, "add", "docs/index.md")
    _git(tmp_path, "commit", "-m", "seed")
    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    monkeypatch.setenv("KB_DB_PATH", str(tmp_path / "data" / "kb.sqlite3"))
    from server.main import app

    return TestClient(app), tmp_path


def test_publish_stores_assets_out_of_git_and_delete_removes_them(client):
    tc, root = client
    photo, red = _gps_jpeg(), _png()
    r = tc.post(
        "/api/documents",
        json={**_PAYLOAD, "assets": [
            _item("photo", photo, "image/jpeg"),
            _item("red", red, "image/png"),
            _item("red-again", red, "image/png"),  # identical bytes: stored once
        ]},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    amap = body["assets"]
    assert body["committed"] is True
    assert amap["red"]["file"] == amap["red-again"]["file"]
    assert amap["photo"]["media_type"] == "image/jpeg" and amap["photo"]["animated"] is False

    asset_dir = root / "docs" / _ASSET_DIR
    stored = sorted(p.name for p in asset_dir.iterdir())
    assert stored == sorted({amap["photo"]["file"], amap["red"]["file"]})
    assert b"PhoneMaker" not in (asset_dir / amap["photo"]["file"]).read_bytes()

    # The header records the map, and reindex re-derives the row from it.
    assert "\nassets:\n" in (root / "docs" / _REL).read_text(encoding="utf-8")
    from server import reindex as reindex_mod

    conn = db.connect()
    try:
        conn.execute("UPDATE documents SET assets = NULL")
        conn.commit()
        reindex_mod.reindex(conn)
        assert db.get_document_by_path(conn, _REL)["assets"] == amap
    finally:
        conn.close()

    # Never committed: not in the publish commit, and not even untracked.
    names = _git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD").stdout
    assert ".assets" not in names
    assert ".assets" not in _git(root, "status", "--porcelain", "--untracked-files=all").stdout
    assert ".assets" not in _git(root, "log", "--all", "--name-only", "--pretty=").stdout

    # A v2 without images: v1 keeps its own map (and its files), v2 has none.
    v2 = tc.post("/api/documents", json={**_PAYLOAD, "new_version": True})
    assert v2.status_code == 201 and "assets" not in v2.json()
    conn = db.connect()
    try:
        assert db.get_document_by_path(conn, _REL)["assets"] is None
        assert db.get_document_version(conn, _REL, 1)["assets"] == amap
    finally:
        conn.close()
    assert sorted(p.name for p in asset_dir.iterdir()) == stored

    # Deleting the document removes its image files.
    d = tc.delete(f"/api/documents/{body['id']}")
    assert d.status_code == 200 and d.json()["assets_removed"] is True
    assert not asset_dir.exists()
    assert ".assets" not in _git(root, "log", "--all", "--name-only", "--pretty=").stdout


# --- the read routes (Postgres-gated: the accounts plane decides visibility) --

from tests.test_documents_api import _project, _signup, documents_client  # noqa: E402,F401
from tests.test_public_read import _set_public, _set_slug  # noqa: E402


def _seed_with_asset(tmp_path, tenant_id, project, slug, data):
    """One document whose map names one stored PNG, under the tenant's own root."""
    (asset,) = assets_mod.prepare_assets([_item("fig", data, "image/png")])
    rel = f"{project}/2026-01-01-{slug}.md"
    assets_mod.store_assets(tmp_path / "tenants" / tenant_id, rel, [asset])
    conn = db.connect()
    try:
        doc_id = db.upsert_document(
            conn, project=project, slug=slug, date="2026-01-01", title=slug, tags=[],
            source_repo="acme/repo", rel_path=rel, markdown="body", tenant_id=tenant_id,
            assets=assets_mod.asset_map([asset]),
        )
    finally:
        conn.close()
    return doc_id, asset.file


def test_private_asset_is_the_same_404_as_a_missing_one(documents_client, tmp_path, monkeypatch):
    client, _ = documents_client
    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    headers, tenant = _signup(client, f"assets-{uuid4()}@example.com")
    pub = _project(client, headers, "pub")
    _project(client, headers, "priv")  # left private
    _set_public(client, headers, pub)
    org = _set_slug(client, headers)

    pub_id, pub_file = _seed_with_asset(tmp_path, tenant, "pub", "open", _png((1, 2, 3)))
    priv_id, priv_file = _seed_with_asset(tmp_path, tenant, "priv", "closed", _png((4, 5, 6)))

    # Anonymous, public project: served with the stated headers.
    ok = client.get(f"/app/documents/{pub_id}/assets/{pub_file}")
    assert ok.status_code == 200
    assert ok.headers["content-type"] == "image/png"
    assert ok.headers["x-content-type-options"] == "nosniff"
    assert ok.headers["content-security-policy"] == "default-src 'none'; sandbox"
    assert ok.headers["cache-control"].startswith("public")
    assert client.get(f"/app/orgs/{org}/pub/open/assets/{pub_file}").status_code == 200

    # The member reads their own private document's image (private cache).
    mine = client.get(f"/app/documents/{priv_id}/assets/{priv_file}", headers=headers)
    assert mine.status_code == 200 and mine.headers["cache-control"].startswith("private")

    # Anonymous, private project: byte-identical to a missing document's asset.
    private = client.get(f"/app/documents/{priv_id}/assets/{priv_file}")
    missing = client.get(f"/app/documents/99999999/assets/{priv_file}")
    assert private.status_code == missing.status_code == 404
    assert private.content == missing.content
    pretty_private = client.get(f"/app/orgs/{org}/priv/closed/assets/{priv_file}")
    assert pretty_private.status_code == 404 and pretty_private.content == missing.content

    # A file that exists on disk but is not in THIS document's map: the same 404.
    not_mine = client.get(f"/app/documents/{pub_id}/assets/{priv_file}")
    unknown = client.get(f"/app/documents/{pub_id}/assets/{'0' * 64}.png")
    malformed = client.get(f"/app/documents/{pub_id}/assets/..%2F..%2Fsecret.png")
    for res in (not_mine, unknown, malformed):
        assert res.status_code == 404 and res.content == missing.content

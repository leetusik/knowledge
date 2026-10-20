"""Reader state (P30.S8) — the core guarantees only (P29 *S3 build inputs*, core tests 1 and 2).

1. **Isolation:** user B cannot read, list, update or delete user A's rows; every
   attempt is the constant 404, and every query is ``user_id``-scoped.
2. **Visibility:** after a project turns private, or a document is deleted, every
   read, list and count omits it and every write to it is a 404; the rows come back
   when access does.
3. **Purge:** both document-delete handlers purge every reader's state for it.
4. **Conflict rules:** position last-write-wins, ``max_fraction`` grow-only,
   ``finished`` set-only except Mark as unread; quiz attempts numbered by the server
   and idempotent by id.
5. **Unit:** binding a document into a book re-writes its rows' ``unit``.
6. **Migration:** ``0006_reader_state`` upgrades, downgrades and re-upgrades on a
   fresh database on the test Postgres, and matches the ORM models.

Postgres-gated: reuses ``tests/test_documents_api``'s harness, so the suite skips
without a disposable ``KB_TEST_DATABASE_URL``.
"""

from __future__ import annotations

from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, make_url, text

from server import db

from tests.test_documents_api import (  # noqa: F401
    _RAW_DSN,
    _project,
    _signup,
    _url,
    documents_client,
)

_SOURCE = "---\nformat: native\nsyntax: 1\n---\n\n## Intro {#intro}\n\nBody.\n"


@pytest.fixture
def reader(documents_client, tmp_path, monkeypatch):
    """The documents harness with a throwaway content root (deletes and books write files)."""

    import server.api_auth as api_auth

    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    monkeypatch.delenv("KB_OPERATOR_EMAIL", raising=False)
    monkeypatch.setattr(api_auth, "_tenant_one_cache", None)
    return documents_client


def _seed(tenant, project, slug, *, fmt="native", version=1, lang=None) -> tuple[int, str]:
    """One document row in the throwaway SQLite; returns ``(id, doc stem)``."""

    date = "2026-01-01"
    conn = db.connect()
    try:
        doc_id = db.upsert_document(
            conn, project=project, slug=slug, date=date, title=f"Doc {slug}", tags=[],
            source_repo=None, rel_path=f"{project}/{date}-{slug}.md", markdown="Body.",
            format=fmt, version=version, tenant_id=tenant, lang=lang,
            source=_SOURCE if fmt == "native" else None,
        )
    finally:
        conn.close()
    return doc_id, f"{date}-{slug}"


def _key(org, project, doc):
    return {"org": org, "project": project, "doc": doc}


def _bookmark(org, project, doc, **over):
    return {"id": str(uuid4()), **_key(org, project, doc), "anchor": {"block_id": "intro"},
            "snippet": "Body.", **over}


def _annotation(org, project, doc, **over):
    return {"id": str(uuid4()), **_key(org, project, doc), "block_id": "intro",
            "quote": {"exact": "Body", "prefix": "", "suffix": "."}, "note": "mine", **over}


def _attempt(org, project, doc, **over):
    return {"id": str(uuid4()), **_key(org, project, doc), "block_id": "quiz-1",
            "item_id": "q1", "item_type": "recall", "response": {"self_grade": "got"},
            "correct": True, **over}


def _fill(client, h, org, project, doc) -> dict[str, str]:
    """Write one row of every kind; return their ids."""

    r = client.put("/app/reader/positions", headers=h,
                   json={**_key(org, project, doc), "fraction": 0.4, "anchor_id": "intro"})
    assert r.status_code == 200, r.text
    bm = client.post("/app/reader/bookmarks", headers=h, json=_bookmark(org, project, doc))
    assert bm.status_code == 201, bm.text
    an = client.post("/app/reader/annotations", headers=h, json=_annotation(org, project, doc))
    assert an.status_code == 201, an.text
    qa = client.post("/app/reader/quiz-attempts", headers=h, json=_attempt(org, project, doc))
    assert qa.status_code == 201, qa.text
    return {"bookmark": bm.json()["bookmark"]["id"], "annotation": an.json()["annotation"]["id"]}


def _count(engine, user_tenant_doc) -> int:
    tenant, doc = user_tenant_doc
    with engine.connect() as conn:
        return sum(
            conn.execute(
                text(f"SELECT count(*) FROM {t} WHERE tenant_id = :t AND doc = :d"),
                {"t": tenant, "d": doc},
            ).scalar_one()
            for t in ("reader_positions", "reader_bookmarks", "reader_annotations", "quiz_attempts")
        )


def test_isolation_another_users_rows_are_404(reader):
    client, _ = reader
    a, a_tenant = _signup(client, f"ra-{uuid4()}@example.com")
    b, _ = _signup(client, f"rb-{uuid4()}@example.com")
    pid = _project(client, a, "pub")
    assert client.patch(f"/app/projects/{pid}", json={"visibility": "public"}, headers=a).status_code == 200
    _, doc = _seed(a_tenant, "pub", "shared")
    ids = _fill(client, a, a_tenant, "pub", doc)

    # B reads the same public document and sees none of A's state.
    got = client.get(f"/app/reader/docs/{a_tenant}/pub/{doc}", headers=b)
    assert got.status_code == 200, got.text
    body = got.json()
    assert body["position"] is None and body["bookmarks"] == [] and body["annotations"] == []
    assert body["quiz"] == [] and body["chapter"]["state"] == "unopened"
    assert client.get("/app/reader/continue", headers=b).json()["items"] == []
    assert client.get("/app/reader/library", headers=b).json() == {"books": [], "docs": []}

    # B cannot update or delete A's rows, nor claim A's ids on a create: all 404.
    for kind in ("bookmark", "annotation"):
        rid = ids[kind]
        patch = {"label": "x"} if kind == "bookmark" else {"note": "x"}
        assert client.patch(f"/app/reader/{kind}s/{rid}", json=patch, headers=b).status_code == 404
        assert client.delete(f"/app/reader/{kind}s/{rid}", headers=b).status_code == 404
    taken = _bookmark(a_tenant, "pub", doc, id=ids["bookmark"])
    assert client.post("/app/reader/bookmarks", json=taken, headers=b).status_code == 404

    # B clearing ALL of their own state leaves A's untouched.
    assert client.delete("/app/reader/state?scope=all", headers=b).status_code == 200
    mine = client.get(f"/app/reader/docs/{a_tenant}/pub/{doc}", headers=a).json()
    assert mine["position"]["fraction"] == 0.4
    assert [x["id"] for x in mine["bookmarks"]] == [ids["bookmark"]]
    assert [x["id"] for x in mine["annotations"]] == [ids["annotation"]]
    assert [q["attempt"] for q in mine["quiz"]] == [1]

    # Anonymous: nothing is stored, every write is a 401.
    assert client.put("/app/reader/positions", json={**_key(a_tenant, "pub", doc)}).status_code == 401


def test_visibility_private_hides_and_delete_purges(reader):
    client, engine = reader
    a, a_tenant = _signup(client, f"va-{uuid4()}@example.com")
    b, _ = _signup(client, f"vb-{uuid4()}@example.com")
    pid = _project(client, a, "pub")
    assert client.patch(f"/app/projects/{pid}", json={"visibility": "public"}, headers=a).status_code == 200
    doc_id, doc = _seed(a_tenant, "pub", "lantern")
    _fill(client, a, a_tenant, "pub", doc)
    ids = _fill(client, b, a_tenant, "pub", doc)

    # The project turns private: B's reads omit it, B's writes are 404; A still reads.
    assert client.patch(f"/app/projects/{pid}", json={"visibility": "private"}, headers=a).status_code == 200
    assert client.get(f"/app/reader/docs/{a_tenant}/pub/{doc}", headers=b).status_code == 404
    assert client.get("/app/reader/continue", headers=b).json()["items"] == []
    assert client.get("/app/reader/library", headers=b).json()["docs"] == []
    key = _key(a_tenant, "pub", doc)
    assert client.put("/app/reader/positions", json={**key, "fraction": 0.9}, headers=b).status_code == 404
    assert client.post("/app/reader/bookmarks", json=_bookmark(a_tenant, "pub", doc), headers=b).status_code == 404
    assert client.patch(f"/app/reader/bookmarks/{ids['bookmark']}", json={"label": "x"}, headers=b).status_code == 404
    assert client.delete(f"/app/reader/annotations/{ids['annotation']}", headers=b).status_code == 404
    assert client.post("/app/reader/quiz-attempts", json=_attempt(a_tenant, "pub", doc), headers=b).status_code == 404
    assert client.get(f"/app/reader/docs/{a_tenant}/pub/{doc}", headers=a).status_code == 200

    # Access returns: the rows were kept, hidden, and come back unchanged.
    assert client.patch(f"/app/projects/{pid}", json={"visibility": "public"}, headers=a).status_code == 200
    back = client.get(f"/app/reader/docs/{a_tenant}/pub/{doc}", headers=b).json()
    assert back["position"]["fraction"] == 0.4 and len(back["bookmarks"]) == 1
    assert len(client.get("/app/reader/continue", headers=b).json()["items"]) == 1

    # The owner deletes the document (the /app handler): every reader's rows go.
    assert _count(engine, (a_tenant, doc)) == 8
    assert client.delete(f"/app/documents/{doc_id}", headers=a).status_code == 204
    assert _count(engine, (a_tenant, doc)) == 0
    assert client.get(f"/app/reader/docs/{a_tenant}/pub/{doc}", headers=a).status_code == 404
    assert client.get("/app/reader/continue", headers=a).json()["items"] == []
    assert client.post("/app/reader/bookmarks", json=_bookmark(a_tenant, "pub", doc), headers=a).status_code == 404


def test_api_delete_purges_and_book_binding_rewrites_unit(reader):
    client, engine = reader
    a, a_tenant = _signup(client, f"ba-{uuid4()}@example.com")
    _project(client, a, "lab")
    key = client.post("/app/credentials", headers=a).json()["key"]
    bearer = {"Authorization": f"Bearer {key}"}
    _, en = _seed(a_tenant, "lab", "chapter-one", lang="en")
    _, ko = _seed(a_tenant, "lab", "chapter-one-ko", lang="ko")
    _, two = _seed(a_tenant, "lab", "chapter-two", lang="en")
    loose_id, loose = _seed(a_tenant, "lab", "loose")
    for doc in (en, loose):
        r = client.put("/app/reader/positions", headers=a, json={**_key(a_tenant, "lab", doc), "fraction": 0.5})
        assert r.json()["position"]["unit"] == f"d:{doc}"

    # Binding the document into a book (S2's PUT) re-writes its stored unit.
    manifest = {"title": "Guide", "kind": "codebase", "commit": False, "chapters": [
        {"key": "ch1", "position": 1, "variants": {"en": f"lab/{en}.md", "ko": f"lab/{ko}.md"}},
        {"key": "ch2", "position": 2, "variants": {"en": f"lab/{two}.md"}},
    ]}
    put = client.put("/api/books/lab/guide", json=manifest, headers=bearer)
    assert put.status_code in (200, 201), put.text
    with engine.connect() as conn:
        unit = conn.execute(
            text("SELECT unit FROM reader_positions WHERE tenant_id = :t AND doc = :d"),
            {"t": a_tenant, "d": en},
        ).scalar_one()
    assert unit == "c:guide/ch1"

    # Finishing the Korean variant finishes the chapter; book progress counts every chapter.
    client.put("/app/reader/positions", headers=a, json={**_key(a_tenant, "lab", ko), "finished": True})
    book = client.get(f"/app/reader/books/{a_tenant}/lab/guide", headers=a).json()
    assert book["progress"] == {"finished": 1, "started": 0, "total": 2}
    assert book["chapters"][0]["state"] == "finished"
    chapter = client.get(f"/app/reader/chapters/{a_tenant}/lab/guide/ch1?lang=en", headers=a).json()
    assert chapter["doc"]["doc"] == en and chapter["chapter"]["state"] == "finished"

    # Clear this book: its rows go, the loose document's stay.
    assert client.delete(f"/app/reader/state?scope=book&org={a_tenant}&project=lab&book=guide", headers=a).status_code == 200
    assert _count(engine, (a_tenant, en)) == 0 and _count(engine, (a_tenant, loose)) == 1

    # The /api delete handler purges too.
    r = client.delete(f"/api/documents/{loose_id}?commit=false", headers=bearer)
    assert r.status_code == 200, r.text
    assert r.json()["reader_state_purged"]["reader_positions"] == 1
    assert _count(engine, (a_tenant, loose)) == 0


def test_position_and_attempt_conflict_rules(reader):
    client, _ = reader
    a, tenant = _signup(client, f"ca-{uuid4()}@example.com")
    _project(client, a, "lab")
    _, doc = _seed(tenant, "lab", "rules", version=3)
    key = _key(tenant, "lab", doc)

    def put(**body):
        r = client.put("/app/reader/positions", headers=a, json={**key, **body})
        assert r.status_code == 200, r.text
        return r.json()["position"]

    assert put(fraction=0.5)["max_fraction"] == 0.5
    p = put(fraction=0.3, anchor_id="intro")  # last write wins; the max only grows
    assert (p["fraction"], p["max_fraction"], p["anchor_id"], p["state"]) == (0.3, 0.5, "intro", "started")
    p = put(fraction=0.96, version=2)  # the end reached: finished, on version 2
    assert (p["state"], p["finished_version"], p["updated"]) == ("finished", 2, True)
    p = put(fraction=0.1, version=3)  # finished only sets
    assert (p["state"], p["finished_version"], p["max_fraction"]) == ("finished", 2, 0.96)
    p = put(unread=True)  # Mark as unread: the one reset; the row stays
    assert (p["state"], p["max_fraction"], p["fraction"], p["anchor_id"], p["finished_version"]) == (
        "started", 0.0, 0.0, None, None)
    assert put(finished=True)["state"] == "finished"  # Mark as finished
    assert client.put("/app/reader/positions", headers=a, json={**key, "version": 4}).status_code == 422

    first = _attempt(tenant, "lab", doc)
    assert client.post("/app/reader/quiz-attempts", headers=a, json=first).json()["attempt"] == 1
    retry = client.post("/app/reader/quiz-attempts", headers=a, json=first)
    assert retry.status_code == 200 and retry.json()["attempt"] == 1  # idempotent by id
    second = client.post("/app/reader/quiz-attempts", headers=a,
                         json=_attempt(tenant, "lab", doc, correct=False, response={"self_grade": "missed"}))
    assert second.json()["attempt"] == 2 and second.json()["result"]["unit"] == f"d:{doc}"
    latest = client.get(f"/app/reader/docs/{tenant}/lab/{doc}", headers=a).json()["quiz"]
    assert [(q["attempt"], q["correct"]) for q in latest] == [(2, False)]


def test_migration_upgrades_and_downgrades_on_a_fresh_database(monkeypatch):
    if not _RAW_DSN:
        pytest.skip("set KB_TEST_DATABASE_URL to a disposable Postgres to run the migration test")
    ini = Path(__file__).resolve().parents[1] / "alembic.ini"
    if not ini.is_file():
        pytest.skip("no alembic/ here (the plugin template ships none)")
    from alembic import command
    from alembic.autogenerate import compare_metadata
    from alembic.config import Config
    from alembic.migration import MigrationContext

    from server.persistence import models  # noqa: F401
    from server.persistence.base import Base

    base = make_url(_url(_RAW_DSN))
    name = f"kb_mig_{uuid4().hex[:10]}"
    admin = create_engine(base.render_as_string(hide_password=False), isolation_level="AUTOCOMMIT")
    try:
        with admin.connect() as conn:
            conn.execute(text(f'CREATE DATABASE "{name}"'))
    except Exception as exc:  # pragma: no cover - environment dependent
        admin.dispose()
        pytest.skip(f"cannot create a scratch database: {exc}")
    url = base.set(database=name).render_as_string(hide_password=False)
    monkeypatch.setenv("DATABASE_URL", url)
    cfg = Config(str(ini))
    tables = ("reader_positions", "reader_bookmarks", "reader_annotations", "quiz_attempts",
              "review_cards", "review_logs", "reader_profiles")
    engine = create_engine(url)
    try:
        command.upgrade(cfg, "head")
        command.downgrade(cfg, "0005_tenant_slug")
        with engine.connect() as conn:
            left = conn.execute(text(
                "SELECT count(*) FROM pg_tables WHERE tablename = ANY(:t)"), {"t": list(tables)}
            ).scalar_one()
        assert left == 0
        command.upgrade(cfg, "head")
        with engine.connect() as conn:
            assert conn.execute(text(
                "SELECT count(*) FROM pg_tables WHERE tablename = ANY(:t)"), {"t": list(tables)}
            ).scalar_one() == 7
            diff = compare_metadata(
                MigrationContext.configure(conn, opts={"compare_type": True}), Base.metadata
            )
        assert diff == []
    finally:
        engine.dispose()
        with admin.connect() as conn:
            conn.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))
        admin.dispose()

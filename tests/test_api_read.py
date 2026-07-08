"""Read/search API over a temp KB tree: healthz, list/get/by-path, BM25, reindex, auth."""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from server import reindex

_DOC_A = (
    '---\n'
    'title: "Shared nginx explained"\n'
    'date: 2026-07-02\n'
    'tags:\n'
    '  - docker\n'
    '  - nginx\n'
    'source:\n'
    '  project: hi2vi_web\n'
    '  repo: /tmp/hi2vi_web\n'
    '---\n\n'
    '# Shared nginx explained\n\nThe reverse proxy routes requests by host.\n'
)
def _explainer(title, date, tags, project, body):
    fm = (
        f'---\ntitle: "{title}"\ndate: {date}\ntags:\n'
        + "".join(f"  - {t}\n" for t in tags)
        + f'source:\n  project: {project}\n  repo: /tmp/{project}\n---\n\n{body}\n'
    )
    return fm


# Three docs so BM25 has a real IDF: "nginx" appears in only one of three, which
# keeps its score meaningfully > 0 (a term present in every doc, or in a 2-doc
# corpus, collapses the IDF term toward zero).
_DOC_B = _explainer("Postgres basics", "2026-07-01", ["postgres", "sql"], "other",
                    "# Postgres basics\n\nA relational database engine.")
_DOC_C = _explainer("Redis caching", "2026-06-30", ["redis", "cache"], "other",
                    "# Redis caching\n\nAn in-memory key value store.")
_REL_A = "hi2vi_web/2026-07-02-shared-nginx-explained.md"

# CJK/recency corpus: two docs identical except date, so any query term scores an
# equal bm25 across them and the recency signal decides order (newer first). Their
# body carries only inflected 검색을 (never the bare stem 검색) so a hit on q=검색
# proves the CJK prefix expansion; 창플 is a 2-char proper noun; sharedprobe is a
# unique ASCII token present in both for a deterministic pagination/recency test.
_KO_BODY = "# 창플 검색 노트\n\n창플 이야기와 미라클 모닝. 검색을 개선한다. sharedprobe"
_DOC_D = _explainer("창플 검색 노트", "2026-07-05", ["p26", "search"], "changple5", _KO_BODY)
_DOC_E = _explainer("창플 검색 노트", "2026-07-03", ["p26", "search"], "changple5", _KO_BODY)


def _write(p: Path, text: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    monkeypatch.setenv("KB_DB_PATH", str(tmp_path / "data" / "kb.sqlite3"))
    _write(tmp_path / "docs" / _REL_A, _DOC_A)
    _write(tmp_path / "docs" / "other" / "2026-07-01-postgres-basics.md", _DOC_B)
    _write(tmp_path / "docs" / "other" / "2026-06-30-redis-caching.md", _DOC_C)
    _write(tmp_path / "docs" / "changple5" / "2026-07-05-recency-probe.md", _DOC_D)
    _write(tmp_path / "docs" / "changple5" / "2026-07-03-recency-probe.md", _DOC_E)
    reindex.reindex()
    from server.main import app  # imported after env is set

    return TestClient(app)


def test_healthz(client):
    body = client.get("/healthz").json()
    assert body["status"] == "ok" and body["db"] == "ok"
    assert body["documents"] == 5


def test_list_shape_and_filters(client):
    body = client.get("/api/documents").json()
    assert body["total"] == 5 and len(body["items"]) == 5
    assert all("markdown" not in it and "tags_text" not in it for it in body["items"])
    proj = client.get("/api/documents", params={"project": "hi2vi_web"}).json()
    assert proj["total"] == 1 and proj["items"][0]["project"] == "hi2vi_web"
    tagged = client.get("/api/documents", params={"tag": "postgres"}).json()
    assert tagged["total"] == 1 and tagged["items"][0]["slug"] == "postgres-basics"


def test_get_by_id_by_path_and_404(client):
    doc_id = client.get("/api/documents").json()["items"][0]["id"]
    by_id = client.get(f"/api/documents/{doc_id}")
    assert by_id.status_code == 200 and "markdown" in by_id.json()
    by_path = client.get(f"/api/documents/by-path/{_REL_A}")
    assert by_path.status_code == 200 and by_path.json()["rel_path"] == _REL_A
    assert client.get("/api/documents/9999").status_code == 404


def test_search_bm25(client):
    body = client.get("/api/search", params={"q": "nginx"}).json()
    assert body["mode"] == "bm25" and len(body["results"]) >= 1
    top = body["results"][0]
    assert "<mark>" in top["snippet"]
    assert top["score"] > 0 and "bm25" in top["signals"]
    assert "markdown" not in top


def test_search_operator_syntax_is_safe(client):
    r = client.get("/api/search", params={"q": "NEAR/AND("})
    assert r.status_code == 200 and r.json()["results"] == []


def test_reindex_endpoint(client):
    body = client.post("/api/reindex").json()
    assert body["indexed"] == 5 and body["removed"] == 0
    assert "skipped" in body and "duration_ms" in body


def test_build_match_query_units():
    from server import search as s
    assert s.build_match_query("검색") == '"검색"*'            # CJK token -> prefix
    assert s.build_match_query("nginx") == '"nginx"'          # ASCII token unchanged
    assert s.build_match_query('a"b') == '"a""b"'             # internal quote doubled
    assert s.build_match_query("검색 nginx") == '"검색"* "nginx"'  # mixed


def test_search_cjk_recency_and_pagination(client):
    # (a) CJK prefix expansion: the bare stem 검색 hits a doc that carries only 검색을
    ko = client.get("/api/search", params={"q": "검색"}).json()
    assert ko["total"] >= 1
    assert any("recency-probe" in r["rel_path"] for r in ko["results"])
    assert {"bm25", "recency"} <= set(ko["results"][0]["signals"])

    # (b) 2-char Korean proper noun matches exactly (both probe docs carry 창플)
    assert client.get("/api/search", params={"q": "창플"}).json()["total"] == 2

    # (c) pagination: offset walks the result set while total stays stable
    p0 = client.get("/api/search", params={"q": "sharedprobe", "limit": 1, "offset": 0}).json()
    p1 = client.get("/api/search", params={"q": "sharedprobe", "limit": 1, "offset": 1}).json()
    assert p0["total"] == p1["total"] == 2
    assert len(p0["results"]) == len(p1["results"]) == 1
    assert p0["results"][0]["id"] != p1["results"][0]["id"]

    # (d) recency: equal-relevance docs -> newer date first
    ranked = client.get("/api/search", params={"q": "sharedprobe"}).json()["results"]
    assert [r["date"] for r in ranked] == ["2026-07-05", "2026-07-03"]


def test_bearer_auth_on_mutating(client, monkeypatch):
    monkeypatch.setenv("KB_API_TOKEN", "secret")
    assert client.post("/api/reindex").status_code == 401
    assert client.post(
        "/api/reindex", headers={"Authorization": "Bearer secret"}
    ).status_code == 200
    assert client.get("/healthz").status_code == 200  # reads stay open

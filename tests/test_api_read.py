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
    reindex.reindex()
    from server.main import app  # imported after env is set

    return TestClient(app)


def test_healthz(client):
    body = client.get("/healthz").json()
    assert body["status"] == "ok" and body["db"] == "ok"
    assert body["documents"] == 3


def test_list_shape_and_filters(client):
    body = client.get("/api/documents").json()
    assert body["total"] == 3 and len(body["items"]) == 3
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
    assert body["indexed"] == 3 and body["removed"] == 0
    assert "skipped" in body and "duration_ms" in body


def test_bearer_auth_on_mutating(client, monkeypatch):
    monkeypatch.setenv("KB_API_TOKEN", "secret")
    assert client.post("/api/reindex").status_code == 401
    assert client.post(
        "/api/reindex", headers={"Authorization": "Bearer secret"}
    ).status_code == 200
    assert client.get("/healthz").status_code == 200  # reads stay open

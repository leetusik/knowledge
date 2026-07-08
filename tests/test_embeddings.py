"""Hybrid semantic search (P4.S6) over a temp KB — a deterministic fake embedder, NO network.

The fake maps text to a 3-dim concept vector by keyword; ``vectorprobe`` is a token
that appears in NO document, so a query for it is a pure semantic (vector-only) hit.
"""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from server import embeddings, reindex

# Concept keywords -> vector dimension. Doc keywords + the query-only 'vectorprobe'
# all map to dim 0 (the nginx concept), so 'vectorprobe' matches the nginx doc
# semantically while sharing no FTS-searchable token with it.
_CONCEPT = {
    "nginx": 0, "proxy": 0, "vectorprobe": 0,
    "postgres": 1, "relational": 1,
    "redis": 2, "cachestore": 2,
}


def _fake_vec(text: str) -> list[float]:
    low = text.lower()
    v = [0.0, 0.0, 0.0]
    for kw, idx in _CONCEPT.items():
        if kw in low:
            v[idx] += 1.0
    return v if sum(v) else [0.01, 0.01, 0.01]


class FakeEmbedder:
    def __init__(self) -> None:
        self.calls = 0
        self.texts: list[str] = []

    def __call__(self, texts, *, kind, retries=0):
        self.calls += 1
        items = list(texts)
        self.texts.extend(items)
        return [_fake_vec(t) for t in items]


def _explainer(title, date, tags, project, body):
    return (
        f'---\ntitle: "{title}"\ndate: {date}\ntags:\n'
        + "".join(f"  - {t}\n" for t in tags)
        + f'source:\n  project: {project}\n  repo: /tmp/{project}\n---\n\n{body}\n'
    )


_DOC_N = _explainer("Nginx proxy guide", "2026-07-02", ["nginx"], "web",
                    "# Nginx proxy guide\n\nReverse proxy routing by host. nginx notes.")
_DOC_P = _explainer("Postgres basics", "2026-07-01", ["postgres"], "other",
                    "# Postgres basics\n\nA relational database engine.")
_DOC_R = _explainer("Redis notes", "2026-06-30", ["redis"], "other",
                    "# Redis notes\n\nAn in-memory key value cachestore.")
_REL_N = "web/2026-07-02-nginx-proxy-guide.md"


def _write(p: Path, text: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def _seed(tmp_path, monkeypatch):
    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    monkeypatch.setenv("KB_DB_PATH", str(tmp_path / "data" / "kb.sqlite3"))
    _write(tmp_path / "docs" / _REL_N, _DOC_N)
    _write(tmp_path / "docs" / "other" / "2026-07-01-postgres-basics.md", _DOC_P)
    _write(tmp_path / "docs" / "other" / "2026-06-30-redis-notes.md", _DOC_R)


def _enable(monkeypatch) -> FakeEmbedder:
    monkeypatch.setenv("GOOGLE_API_KEY", "test-fake-key-not-real")
    fake = FakeEmbedder()
    monkeypatch.setattr(embeddings, "embed_texts", fake)
    return fake


def test_reindex_embeds_caches_and_reembeds(tmp_path, monkeypatch):
    _seed(tmp_path, monkeypatch)
    fake = _enable(monkeypatch)

    r1 = reindex.reindex()["embeddings"]
    assert r1 == {"embedded": 3, "cached": 0, "removed": 0}

    # Second reindex: content-hash cache -> nothing re-embedded.
    r2 = reindex.reindex()["embeddings"]
    assert r2 == {"embedded": 0, "cached": 3, "removed": 0}

    # Edit one doc's body -> only that doc re-embeds.
    _write(tmp_path / "docs" / _REL_N, _DOC_N.replace("nginx notes", "nginx notes updated"))
    r3 = reindex.reindex()["embeddings"]
    assert r3 == {"embedded": 1, "cached": 2, "removed": 0}


def test_hybrid_search_vector_only_and_fused(tmp_path, monkeypatch):
    _seed(tmp_path, monkeypatch)
    _enable(monkeypatch)
    reindex.reindex()
    from server.main import app

    client = TestClient(app)

    # (a) vector-only hit: 'vectorprobe' matches no FTS token, but embeds to the nginx
    #     concept -> nginx doc is the semantic top hit with a fallback excerpt snippet.
    vo = client.get("/api/search", params={"q": "vectorprobe"}).json()
    assert vo["mode"] == "hybrid"
    top = vo["results"][0]
    assert top["rel_path"] == _REL_N
    assert "vector" in top["signals"] and "bm25" not in top["signals"]
    assert "<mark>" not in top["snippet"] and "Reverse proxy" in top["snippet"]

    # (b) fused hit: 'nginx' matches the nginx doc by keyword AND by vector.
    fused = client.get("/api/search", params={"q": "nginx"}).json()
    assert fused["mode"] == "hybrid"
    ntop = fused["results"][0]
    assert ntop["rel_path"] == _REL_N
    assert {"bm25", "recency", "vector"} <= set(ntop["signals"])


def test_no_key_degrades_to_bm25(tmp_path, monkeypatch):
    _seed(tmp_path, monkeypatch)  # no GOOGLE_API_KEY -> embeddings disabled
    assert reindex.reindex()["embeddings"]["skipped_reason"] == "no api key"
    from server.main import app

    body = TestClient(app).get("/api/search", params={"q": "nginx"}).json()
    assert body["mode"] == "bm25"
    sig = body["results"][0]["signals"]
    assert set(sig) == {"bm25", "recency"}

"""FastAPI read/search surface over the S1 library.

Reads (healthz, list/get/by-path, search) are always open. The bearer dependency
guards mutating endpoints only — today just ``POST /api/reindex`` (the write path
lands in S3) — and is a no-op when ``KB_API_TOKEN`` is unset. A fresh
``db.connect()`` is opened per request (a dependency) so config stays
env-at-call-time: tests retarget ``KB_ROOT``/``KB_DB_PATH`` via env, and the
container injects config through compose ``environment:``. Nothing is cached at
import time.
"""
from __future__ import annotations

from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query

from server import config, db
from server import reindex as reindex_mod
from server import search as search_mod

app = FastAPI(title="kb-api", version="0.1.0")


def get_conn():
    """Per-request SQLite connection (closed after the response)."""
    conn = db.connect()
    try:
        yield conn
    finally:
        conn.close()


def require_bearer(authorization: Optional[str] = Header(default=None)) -> None:
    """Guard for mutating endpoints (reused by S3's POST /api/documents).

    No-op when ``KB_API_TOKEN`` is unset (localhost-open); otherwise require an
    exact ``Authorization: Bearer <token>`` header, else 401.
    """
    token = config.api_token()
    if token is None:
        return
    if authorization != f"Bearer {token}":
        raise HTTPException(status_code=401, detail="missing or invalid bearer token")


# tags_text is an internal FTS denormalization (space-joined mirror of tags,
# already exposed as a list), so it never leaves the API. markdown is dropped
# from list payloads and kept on single-doc fetches.
_INTERNAL = {"tags_text"}


def _public_doc(doc: dict, *, include_markdown: bool) -> dict:
    drop = set(_INTERNAL)
    if not include_markdown:
        drop.add("markdown")
    return {k: v for k, v in doc.items() if k not in drop}


@app.get("/healthz")
def healthz(conn=Depends(get_conn)):
    return {
        "status": "ok",
        "docs_root": str(config.docs_root()),
        "db": "ok",
        "documents": db.count_documents(conn),
    }


@app.get("/api/documents")
def list_documents(
    project: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    conn=Depends(get_conn),
):
    total = db.count_documents(conn, project=project, tag=tag)
    items = db.list_documents(conn, project=project, tag=tag, limit=limit, offset=offset)
    return {"total": total, "items": [_public_doc(d, include_markdown=False) for d in items]}


# Declared before /api/documents/{doc_id} (and doc_id is an int) so the by-path
# route never collides with the id route.
@app.get("/api/documents/by-path/{rel_path:path}")
def get_document_by_path(rel_path: str, conn=Depends(get_conn)):
    doc = db.get_document_by_path(conn, rel_path)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"no document at rel_path {rel_path!r}")
    return _public_doc(doc, include_markdown=True)


@app.get("/api/documents/{doc_id}")
def get_document(doc_id: int, conn=Depends(get_conn)):
    doc = db.get_document(conn, doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"no document with id {doc_id}")
    return _public_doc(doc, include_markdown=True)


@app.get("/api/search")
def search(
    q: str,
    project: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50),
    raw: bool = False,
    conn=Depends(get_conn),
):
    try:
        results = search_mod.search(
            conn, q, project=project, tag=tag, limit=limit, raw=raw
        )
    except search_mod.SearchQueryError as exc:
        raise HTTPException(status_code=400, detail=f"invalid FTS query: {exc}")
    return {"query": q, "mode": "bm25", "results": results}


@app.post("/api/reindex")
def reindex(_: None = Depends(require_bearer)):
    # reindex() opens its own connection and walks config.docs_root(); it never
    # runs git. Return its report dict as-is.
    return reindex_mod.reindex()

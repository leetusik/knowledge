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

import datetime
import threading
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from pydantic import BaseModel

from server import config, db
from server import documents as documents_mod
from server import gitops
from server import reindex as reindex_mod
from server import search as search_mod

app = FastAPI(title="kb-api", version="0.1.0")

# One process-wide lock serializes the whole write critical section (file → index
# → DB → git). Load-bearing invariant: the API runs a SINGLE uvicorn worker, so an
# in-process lock is sufficient; never scale to multiple workers. WAL gives reads
# concurrency regardless.
WRITE_LOCK = threading.Lock()


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


class DocumentIn(BaseModel):
    """POST /api/documents request. `markdown` is the body WITHOUT frontmatter,
    starting at the H1 — the API generates the convention-exact frontmatter."""

    title: str
    markdown: str
    project: str
    tags: list[str]
    source_repo: str
    date: Optional[str] = None
    slug: Optional[str] = None
    overwrite: bool = False
    commit: bool = True
    co_authored_by: Optional[str] = None


@app.post("/api/documents", status_code=201)
def create_document(
    body: DocumentIn,
    _: None = Depends(require_bearer),
    conn=Depends(get_conn),
):
    """Own the whole write path: convention-exact docs/ file + Recent bullet + DB
    upsert + scoped git commit, all under WRITE_LOCK. docs/ stays canonical — a
    failed commit never rolls back the file/DB (responds 201, committed:false)."""
    # 1. Validate (S1 validators). ConventionError -> 422. Defaults: date=today,
    #    slug=slugify(title).
    try:
        project = documents_mod.validate_project(body.project)
        tags = documents_mod.validate_tags(body.tags)
        date = (
            documents_mod.validate_date(body.date)
            if body.date
            else datetime.date.today().isoformat()
        )
        slug = documents_mod.validate_slug(
            body.slug if body.slug else documents_mod.slugify(body.title)
        )
    except documents_mod.ConventionError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    rel = documents_mod.rel_path(project, date, slug)

    # 2. 409 if the target exists on disk OR in the DB and not overwrite.
    if not body.overwrite:
        existing_row = db.get_document_by_path(conn, rel)
        if (config.docs_root() / rel).exists() or existing_row is not None:
            detail = {"message": f"document already exists at {rel}", "rel_path": rel}
            if existing_row is not None:
                detail["id"] = existing_row["id"]
                detail["existing_title"] = existing_row["title"]
            raise HTTPException(status_code=409, detail=detail)

    # 3. Locked critical section: file write -> index update -> DB upsert -> git.
    with WRITE_LOCK:
        stored_markdown = documents_mod.write_document_file(
            docs_root=config.docs_root(),
            rel_path=rel,
            title=body.title,
            date=date,
            tags=tags,
            project=project,
            source_repo=body.source_repo,
            body=body.markdown,
        )
        recent_updated = documents_mod.update_recent_index(
            config.docs_root(),
            date=date,
            title=body.title,
            rel_path=rel,
            project=project,
        )
        doc_id = db.upsert_document(
            conn,
            project=project,
            slug=slug,
            date=date,
            title=body.title,
            tags=tags,
            source_repo=body.source_repo,
            rel_path=rel,
            markdown=stored_markdown,
        )

        # 4. Git only when requested AND enabled. A failed commit is NOT rolled
        #    back — the file/DB stay written; report committed:false + commit_error.
        committed = False
        commit_sha = None
        commit_error = None
        if body.commit and config.git_commit_enabled():
            try:
                gitops.add(
                    [f"docs/{rel}", "docs/index.md"], root=config.kb_root()
                )
                commit_sha = gitops.commit(
                    f"docs({project}): add {slug}",
                    root=config.kb_root(),
                    co_authored_by=body.co_authored_by,
                )
                committed = True
            except gitops.GitError as exc:
                commit_error = exc.stderr or str(exc)

    # 5. Response.
    url = (
        f"{config.public_base_url().rstrip('/')}/{project}/{date}-{slug}/"
    )
    resp = {
        "id": doc_id,
        "rel_path": rel,
        "url": url,
        "title": body.title,
        "project": project,
        "slug": slug,
        "date": date,
        "tags": tags,
        "recent_updated": recent_updated,
        "committed": committed,
        "commit_sha": commit_sha,
    }
    if commit_error is not None:
        resp["commit_error"] = commit_error
    return resp

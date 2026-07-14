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
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from pydantic import BaseModel

from server import config, db
from server import documents as documents_mod
from server import embeddings as embeddings_mod
from server import gitops
from server import reindex as reindex_mod
from server import search as search_mod


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup drift self-heal: docs/ is canonical, the DB is disposable — a full
    # reindex on boot cures manual edits, fallback writes, and git resets. The
    # embedding sync inside is content-hash cached, so a clean boot is ~free.
    if config.startup_reindex_enabled():
        report = reindex_mod.reindex()
        emb = report.get("embeddings", {})
        print(
            f"[kb-api] startup reindex: indexed={report['indexed']} "
            f"removed={report['removed']} skipped={len(report['skipped'])} "
            f"embedded={emb.get('embedded', 0)}",
            flush=True,
        )
    yield


app = FastAPI(title="kb-api", version="0.1.0", lifespan=lifespan)

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


@app.get("/api/tags")
def list_tags(project: Optional[str] = None, conn=Depends(get_conn)):
    return {"tags": db.list_tags(conn, project=project)}


@app.get("/api/projects")
def list_projects(conn=Depends(get_conn)):
    return {"projects": db.list_projects(conn)}


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
    offset: int = Query(0, ge=0),
    raw: bool = False,
    conn=Depends(get_conn),
):
    try:
        out = search_mod.search(
            conn, q, project=project, tag=tag, limit=limit, offset=offset, raw=raw
        )
    except search_mod.SearchQueryError as exc:
        raise HTTPException(status_code=400, detail=f"invalid FTS query: {exc}")
    return {
        "query": q,
        # "hybrid" when the Gemini vector signal fused in, else "bm25" (no key / raw /
        # embed failure -> graceful BM25 + recency degradation).
        "mode": out.get("mode", "bm25"),
        "total": out["total"],
        "limit": limit,
        "offset": offset,
        "results": out["results"],
    }


class ReindexIn(BaseModel):
    """Optional POST /api/reindex body for single-path reindex."""
    rel_path: Optional[str] = None


@app.post("/api/reindex")
def reindex(
    body: Optional[ReindexIn] = None,
    _: None = Depends(require_bearer),
):
    # No body or rel_path null -> full reindex (unchanged, backward compatible).
    # With rel_path -> single-path reindex. ValueError -> 422.
    if body is None or body.rel_path is None:
        return reindex_mod.reindex()
    try:
        return reindex_mod.reindex_path(body.rel_path)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


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
    related: list[str] = []
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
        related = documents_mod.validate_related(body.related)
    except documents_mod.ConventionError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    rel = documents_mod.rel_path(project, date, slug)
    # Self-reference dropped silently (a doc can't be related to itself).
    related = [r for r in related if r != rel]
    # Sanitize source_repo: local paths → basename, URLs pass through unchanged.
    source_repo = documents_mod.sanitize_source_repo(body.source_repo)

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
            source_repo=source_repo,
            body=body.markdown,
            related=related,
        )
        # Auto-create the project landing on a project's first document, so mkdocs
        # builds site/<project>/index.html and the deploy gate stays green. Never
        # overwrites an existing (hand-written or auto) landing.
        landing_created = documents_mod.ensure_project_landing(
            config.docs_root(), project
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
            source_repo=source_repo,
            rel_path=rel,
            markdown=stored_markdown,
            related=related,
        )

        # 4. Git only when requested AND enabled. A failed commit is NOT rolled
        #    back — the file/DB stay written; report committed:false + commit_error.
        committed = False
        commit_sha = None
        commit_error = None
        pushed = False
        push_error = None
        if body.commit and config.git_commit_enabled():
            try:
                staged = [f"docs/{rel}", "docs/index.md"]
                if landing_created:
                    # Only staged when this write created it — keeps the scoped
                    # commit to exactly the paths this write touched.
                    staged.append(f"docs/{project}/index.md")
                gitops.add(staged, root=config.kb_root())
                commit_sha = gitops.commit(
                    f"docs({project}): add {slug}",
                    root=config.kb_root(),
                    co_authored_by=body.co_authored_by,
                )
                committed = True
            except gitops.GitError as exc:
                commit_error = exc.stderr or str(exc)

            # 4b. Best-effort publish: push the commit to origin/main when
            #     KB_GIT_PUSH is enabled (hosted box only; off by default so local
            #     never pushes). Mirrors the commit's best-effort semantics — a
            #     failed push never changes the 201; the doc publishes on the next
            #     successful push. A rebase may rewrite the commit, so the PUBLISHED
            #     head becomes the authoritative commit_sha on success. Stays inside
            #     WRITE_LOCK so no concurrent write mutates the tree mid-rebase.
            if committed and config.git_push_enabled():
                try:
                    commit_sha = gitops.push(root=config.kb_root())
                    pushed = True
                except gitops.GitError as exc:
                    push_error = exc.stderr or str(exc)

    # 4b. Best-effort embed of the new doc, OUTSIDE the WRITE_LOCK critical section.
    #     Semantic search is a disposable cache: any failure (no key, API error) is
    #     swallowed — the 201 never depends on it, and the next reindex catches up.
    if config.embeddings_enabled():
        try:
            model = config.embedding_model()
            vec = embeddings_mod.embed_texts(
                [embeddings_mod.document_input(body.title, stored_markdown)],
                kind="document",
            )[0]
            db.upsert_embedding(
                conn,
                doc_id=doc_id,
                model=model,
                content_hash=embeddings_mod.content_hash(model, body.title, stored_markdown),
                dims=len(vec),
                vector=embeddings_mod.pack_vector(vec),
            )
        except Exception:  # noqa: BLE001 — best-effort; never affects the 201
            pass

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
        "related": related,
        "recent_updated": recent_updated,
        "landing_created": landing_created,
        "committed": committed,
        "commit_sha": commit_sha,
        "pushed": pushed,
    }
    if commit_error is not None:
        resp["commit_error"] = commit_error
    if push_error is not None:
        resp["push_error"] = push_error
    return resp


def _delete_document(
    conn,
    doc: dict,
    *,
    commit: bool,
    co_authored_by: Optional[str],
) -> dict:
    """Own the whole delete path: the POST write path in reverse (file -> Recent
    bullet -> DB -> scoped git commit), all under WRITE_LOCK. docs/ row deletion
    is missing_ok — a DB row without a file is drift, still cleaned up. A failed
    commit never rolls back the removal (responds with committed:false)."""
    rel = doc["rel_path"]
    with WRITE_LOCK:
        (config.docs_root() / rel).unlink(missing_ok=True)
        recent_removed = documents_mod.remove_from_recent_index(config.docs_root(), rel)
        # FTS row cleaned by the AFTER DELETE trigger; any embedding cascades
        # via ON DELETE CASCADE (document_embeddings.doc_id -> documents.id).
        db.delete_document_by_path(conn, rel)

        committed = False
        commit_sha = None
        commit_error = None
        pushed = False
        push_error = None
        if commit and config.git_commit_enabled():
            try:
                gitops.add(
                    [f"docs/{rel}", "docs/index.md"], root=config.kb_root()
                )
                commit_sha = gitops.commit(
                    f"docs({doc['project']}): remove {doc['slug']}",
                    root=config.kb_root(),
                    co_authored_by=co_authored_by,
                )
                committed = True
            except gitops.GitError as exc:
                commit_error = exc.stderr or str(exc)

            # Best-effort publish of the delete commit — same semantics as the POST
            # path (see create_document 4b): KB_GIT_PUSH-gated, off by default, a
            # failed push never changes the 200, published head becomes commit_sha.
            if committed and config.git_push_enabled():
                try:
                    commit_sha = gitops.push(root=config.kb_root())
                    pushed = True
                except gitops.GitError as exc:
                    push_error = exc.stderr or str(exc)

    resp = {
        "deleted": True,
        "id": doc["id"],
        "rel_path": rel,
        "title": doc["title"],
        "project": doc["project"],
        "slug": doc["slug"],
        "recent_removed": recent_removed,
        "committed": committed,
        "commit_sha": commit_sha,
        "pushed": pushed,
    }
    if commit_error is not None:
        resp["commit_error"] = commit_error
    if push_error is not None:
        resp["push_error"] = push_error
    return resp


# Declared before /api/documents/{doc_id} (same collision rule as the GETs).
@app.delete("/api/documents/by-path/{rel_path:path}")
def delete_document_by_path(
    rel_path: str,
    commit: bool = True,
    co_authored_by: Optional[str] = None,
    _: None = Depends(require_bearer),
    conn=Depends(get_conn),
):
    doc = db.get_document_by_path(conn, rel_path)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"no document at rel_path {rel_path!r}")
    return _delete_document(conn, doc, commit=commit, co_authored_by=co_authored_by)


@app.delete("/api/documents/{doc_id}")
def delete_document(
    doc_id: int,
    commit: bool = True,
    co_authored_by: Optional[str] = None,
    _: None = Depends(require_bearer),
    conn=Depends(get_conn),
):
    doc = db.get_document(conn, doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"no document with id {doc_id}")
    return _delete_document(conn, doc, commit=commit, co_authored_by=co_authored_by)

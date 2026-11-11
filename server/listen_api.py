"""Listen's HTTP surfaces (P41-sr.B1): the reader API and the runner API.

**The reader API** (``/app/listen/…``, a session only: ``require_user``). A
**Listen** is addressed by ``{org, project, doc}`` (a document) or ``{org, project,
book, from_chapter}`` (a book from a chapter to its end, in the books' reading
order), with an optional ``lang``. Every route resolves the document, or each
chapter's variant, through :class:`server.reader_state.Gate` (``_resolve_readable_doc``'s
rule applied to a document stem) behind one constant 404.

* ``POST /app/listen/start`` — attach to the audio there is, or make it: per
  document, the current version's unit when it is made, else the newest earlier
  version's made unit (``old``), else the current version's unit, created and
  queued. A voice-failed unit is tried again. Missing parts are queued in reading
  order from the start chapter, ahead of every older Listen's. Clears ``kept``.
* ``GET /app/listen/state`` — the Listen state, reads only: per document, the unit
  that plays (its state, made parts, length so far, the part being made, an update in
  progress behind an earlier version, a failure and its kind); for the whole Listen
  the same summed, plus ``waiting`` (work queued, no runner call lately), the runner's
  last call and a failure's message (members of the owning tenant only), and the
  caller's position, speed, follow along and kept place.
* ``PUT /app/listen/position`` — the caller's position, speed, follow and kept.
* ``POST /app/listen/update`` — make the current version's unit for each document
  of the Listen; only parts whose key is new get jobs.

Only native documents are listenable (``documents.format == 'native'``, whose
``source`` parses with ``server/native/parse.py``); any other document is an entry
with ``state: "unavailable"``.

**The runner API** (``/api/listen/…``, an org-level ``vk_`` key through
``resolve_api_write``; a project-bound key, the master bearer and a session are
403). Every call stamps ``listen_runners.last_seen``. Claim, heartbeat, upload,
finish and fail are ``server/listen_jobs.py``'s state transitions; the upload
stores bytes through ``server/listen.py``, and only bytes in the pinned packaging
(``server/listen_mp4.py``, P41-sr.B2: a fragmented MP4, AAC-LC mono) are stored.

The state's ``play`` names the Listen's playlist and timeline, which
``server/listen_play.py`` serves (P41-sr.B2).

With no ``DATABASE_URL`` every route here answers 404 before any auth.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator
from starlette.concurrency import run_in_threadpool

from server import config
from server import listen as store
from server import listen_jobs as lj
from server import listen_mp4 as mp4
from server import reader_state as rs
from server.accounts.auth import AuthContext, require_user
from server.api_auth import ApiAuthContext, resolve_api_write
from server.documents_api import _content_root, get_conn

router = APIRouter(prefix="/app/listen")
runner_router = APIRouter(prefix="/api/listen")

# The ONE 404 every Listen miss raises: an unknown org, a private or deleted
# document, a missing book or chapter, another tenant's job, legacy mode.
_NOT_FOUND = "not found"

NAME_RE = re.compile(r"^[^/\s][^/]{0,199}$")  # one path segment (reader_api's rule)
LANG_RE = re.compile(r"^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$")
SECONDS_MAX = 4 * 3600.0  # one part, or one position inside a document
DEFAULT_SPEED = 1.0
DEFAULT_FOLLOW = True


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail=_NOT_FOUND)


def _unprocessable(message: str) -> HTTPException:
    return HTTPException(status_code=422, detail=message)


# -- auth --------------------------------------------------------------------------


async def listen_user(request: Request) -> AuthContext:
    """``require_user``, after the legacy-mode 404."""

    if config.database_url() is None:
        raise _not_found()
    return await require_user(request)


async def listen_runner(request: Request) -> ApiAuthContext:
    """An org-level ``vk_`` key (``resolve_api_write``); stamps ``last_seen``."""

    if config.database_url() is None:
        raise _not_found()
    ctx = await resolve_api_write(request)
    if ctx.tenant_id is None or ctx.credential_id is None or ctx.project_id is not None:
        raise HTTPException(status_code=403, detail="the runner API takes an org-level vk_ key")
    await lj.touch_runner(ctx.tenant_id, ctx.credential_id)
    return ctx


# -- bodies ------------------------------------------------------------------------


class _Body(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ListenKey(_Body):
    """A Listen: ``doc``, or ``book`` from ``from_chapter`` (default: its first)."""

    org: str = Field(min_length=1, max_length=200)
    project: str = Field(min_length=1, max_length=200)
    doc: Optional[str] = Field(default=None, min_length=1, max_length=200)
    book: Optional[str] = Field(default=None, min_length=1, max_length=200)
    from_chapter: Optional[str] = Field(default=None, min_length=1, max_length=200)
    lang: Optional[str] = Field(default=None, min_length=2, max_length=20)

    @field_validator("project", "doc", "book", "from_chapter")
    @classmethod
    def _segment(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not NAME_RE.fullmatch(value):
            raise ValueError("must be one path segment")
        return value

    @field_validator("lang")
    @classmethod
    def _lang(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not LANG_RE.fullmatch(value):
            raise ValueError("must be a language tag such as en or ko")
        return value

    @model_validator(mode="after")
    def _one_target(self) -> "ListenKey":
        if (self.doc is None) == (self.book is None):
            raise ValueError("give exactly one of doc or book")
        if self.doc is not None and self.from_chapter is not None:
            raise ValueError("from_chapter goes with book")
        return self


class PositionIn(ListenKey):
    """Where the listener is. ``speed``/``follow``/``kept`` left out keep their value."""

    chapter: Optional[str] = Field(default=None, min_length=1, max_length=200)
    seconds: float = Field(ge=0.0, le=SECONDS_MAX)
    speed: Optional[float] = Field(default=None, ge=0.5, le=3.0)
    follow: Optional[bool] = None
    kept: Optional[bool] = None


class FinishIn(_Body):
    seconds: Optional[float] = Field(default=None, gt=0.0, le=SECONDS_MAX)
    segment_seconds: Optional[list[float]] = Field(default=None, max_length=20000)

    @field_validator("segment_seconds")
    @classmethod
    def _non_negative(cls, value: Optional[list[float]]) -> Optional[list[float]]:
        if value is not None and any(v < 0 or v > SECONDS_MAX for v in value):
            raise ValueError("each segment's seconds must be within 0..14400")
        return value


class FailIn(_Body):
    error: str = Field(min_length=1, max_length=20000)


# -- resolving a Listen ------------------------------------------------------------


@dataclass
class _Entry:
    """One document of a Listen, in reading order."""

    chapter: Optional[str]
    title: Optional[str]
    ref: Optional[rs.DocRef]
    reason: Optional[str]  # None when listenable; "legacy" or "missing"

    @property
    def listenable(self) -> bool:
        return self.ref is not None and self.reason is None


@dataclass
class _Listen:
    kind: str  # "doc" | "book"
    tenant_id: UUID
    org: str
    project: str
    item: str  # the document stem, or the book slug
    from_chapter: str  # "" for a document
    lang: str
    entries: list[_Entry]
    member: bool  # the caller belongs to the owning tenant

    def key(self) -> dict[str, Any]:
        return {
            "kind": self.kind,
            "org": self.org,
            "project": self.project,
            "doc": self.item if self.kind == "doc" else None,
            "book": self.item if self.kind == "book" else None,
            "from_chapter": self.from_chapter or None,
            "lang": self.lang,
        }


def _variant(chapter: dict, lang: Optional[str]) -> Optional[dict]:
    by_lang = {v["lang"]: v for v in chapter["variants"]}
    if lang is not None:
        return by_lang.get(lang)
    return by_lang.get("en") or (chapter["variants"][0] if chapter["variants"] else None)


async def _resolve(gate: rs.Gate, key: ListenKey, ctx: AuthContext) -> _Listen:
    tenant = await gate.resolve_org(key.org)
    if tenant is None:
        raise _not_found()
    member = tenant.id == ctx.tenant.id
    if key.doc is not None:
        ref = await gate.doc(tenant.id, key.project, key.doc)
        if ref is None:
            raise _not_found()
        if key.lang is not None and key.lang != ref.lang:
            raise _unprocessable(f"this document is in {ref.lang}")
        entry = _Entry(None, ref.title, ref, None if ref.format == "native" else "legacy")
        return _Listen("doc", tenant.id, ref.org, key.project, key.doc, "", ref.lang, [entry], member)

    book = await gate.book(tenant.id, key.project, key.book)
    chapters = (book or {}).get("chapters") or []
    start = key.from_chapter or (chapters[0]["key"] if chapters else None)
    first = next((i for i, c in enumerate(chapters) if c["key"] == start), None)
    if first is None:
        raise _not_found()
    lang = key.lang
    if lang is None:
        picked = _variant(chapters[first], None)
        lang = picked["lang"] if picked else "en"
    entries: list[_Entry] = []
    for chapter in chapters[first:]:
        variant = _variant(chapter, lang)
        ref = None
        if variant is not None:
            ref = await gate.doc(tenant.id, key.project, rs.doc_of(key.project, variant["rel_path"]))
        if ref is None:
            entries.append(_Entry(chapter["key"], chapter.get("title"), None, "missing"))
            continue
        reason = None if ref.format == "native" else "legacy"
        entries.append(_Entry(chapter["key"], chapter.get("title") or ref.title, ref, reason))
    return _Listen("book", tenant.id, rs.org_label(tenant), key.project, key.book, start, lang,
                   entries, member)


def _current_source(conn, ref: rs.DocRef) -> Optional[str]:
    row = conn.execute(
        "SELECT format, source FROM documents WHERE id = ? AND tenant_id = ?",
        (ref.doc_id, str(ref.tenant_id)),
    ).fetchone()
    if row is None or row["format"] != "native" or not row["source"]:
        return None
    return row["source"]


def _pick(units: list[Any], current_version: int) -> tuple[Optional[Any], Optional[Any]]:
    """``(playing, update)``: the unit the Listen plays, and the current version's
    unit when an earlier version's made unit plays meanwhile."""

    cur = next((u for u in units if u.version == current_version), None)
    if cur is not None and cur.state == "made":
        return cur, None
    older = [u for u in units if u.version < current_version and u.state == "made"]
    if older:
        return max(older, key=lambda u: u.version), cur
    return cur, None


async def _units_by_doc(listen: _Listen) -> dict[str, list[Any]]:
    docs = [e.ref.doc for e in listen.entries if e.listenable]
    rows = await lj.units_for_docs(
        listen.tenant_id, listen.project, docs,
        voice=config.listen_voice(), profile=config.listen_profile(),
    )
    out: dict[str, list[Any]] = {}
    langs = {e.ref.doc: e.ref.lang for e in listen.entries if e.listenable}
    for row in rows:
        if langs.get(row.doc) == row.lang:
            out.setdefault(row.doc, []).append(row)
    return out


# -- the state ---------------------------------------------------------------------


def _iso(value) -> Optional[str]:
    return value.isoformat() if value is not None else None


def _round(value: Optional[float]) -> Optional[float]:
    return None if value is None else round(float(value), 3)


def _unit_view(unit, parts: list[Any], *, member: bool, rtf: float) -> dict[str, Any]:
    parts = sorted(parts, key=lambda p: p.idx)
    made = unit.state == "made"
    prefix = 0.0
    for p in parts:
        if p.made_at is None:
            break
        prefix += float(p.seconds or 0.0)
    first_unmade = next((p.idx for p in parts if p.made_at is None), None)
    part = (
        {"n": first_unmade + 1, "of": unit.part_count}
        if not made and first_unmade is not None else None
    )
    left = sum(float(p.est_seconds) for p in parts if p.made_at is None) * rtf
    failure = None
    if unit.state == "failed":
        at = (
            {"n": unit.failure_part + 1, "of": unit.part_count}
            if unit.failure_part is not None else part
        )
        failure = {"kind": unit.failure_kind or "voice", "part": at}
        if member:
            failure["message"] = unit.failure
    return {
        "unit": str(unit.id),
        "version": unit.version,
        "state": unit.state,
        "parts": unit.part_count,
        "parts_made": unit.parts_made,
        "len": _round(unit.made_seconds) if made else (_round(prefix) if prefix > 0 else None),
        "so_far": not made,
        "est_seconds": _round(unit.total_seconds),
        "part": part,
        "left_seconds": round(left) if unit.state == "making" else None,
        "failure": failure,
    }


def _position_out(row) -> Optional[dict[str, Any]]:
    if row is None:
        return None
    return {
        "from_chapter": row.from_chapter or None,
        "chapter": row.chapter,
        "seconds": _round(row.seconds),
        "lang": row.lang,
        "speed": row.speed,
        "follow": row.follow,
        "kept": row.kept,
        "updated_at": _iso(row.updated_at),
    }


async def _state(listen: _Listen, ctx: AuthContext) -> dict[str, Any]:
    now = lj.utc_now()
    rtf = config.listen_rtf()
    by_doc = await _units_by_doc(listen)
    picks: dict[str, tuple[Optional[Any], Optional[Any]]] = {}
    for e in listen.entries:
        if e.listenable:
            picks[e.ref.doc] = _pick(by_doc.get(e.ref.doc, []), e.ref.version)
    unit_ids = [u.id for pair in picks.values() for u in pair if u is not None]
    parts_by_unit: dict[Any, list[Any]] = {}
    for p in await lj.parts_for_units(unit_ids):
        parts_by_unit.setdefault(p.unit_id, []).append(p)
    last_seen = await lj.runner_last_seen(listen.tenant_id)
    away = last_seen is None or (now - last_seen) > timedelta(seconds=2 * config.listen_poll_s())

    entries: list[dict[str, Any]] = []
    for e in listen.entries:
        out: dict[str, Any] = {
            "chapter": e.chapter,
            "title": e.title,
            "doc": e.ref.doc if e.ref else None,
            "lang": e.ref.lang if e.ref else listen.lang,
            "current_version": e.ref.version if e.ref else None,
        }
        if not e.listenable:
            out.update(state="unavailable", reason=e.reason, old=False, updating=False,
                       unit=None, update=None)
            entries.append(out)
            continue
        playing, upd = picks[e.ref.doc]
        if playing is None:
            out.update(state="none", old=False, updating=False, unit=None, update=None)
            entries.append(out)
            continue
        view = _unit_view(playing, parts_by_unit.get(playing.id, []), member=listen.member, rtf=rtf)
        out.update(view)
        out["old"] = playing.version < e.ref.version
        out["updating"] = upd is not None and upd.state == "making"
        out["update"] = (
            _unit_view(upd, parts_by_unit.get(upd.id, []), member=listen.member, rtf=rtf)
            if upd is not None else None
        )
        entries.append(out)

    listenable = [x for x in entries if x["state"] != "unavailable"]
    pending = next((x for x in listenable if x["state"] != "made"), None)
    if not listenable:
        state = "unavailable"
    elif pending is None:
        state = "made"
    else:
        state = pending["state"]

    length = 0.0
    for x in listenable:
        if x["state"] == "made":
            length += x["len"] or 0.0
            continue
        length += x.get("len") or 0.0
        break
    made_chapters = [x["chapter"] for x in listenable if x["state"] == "made" and x["chapter"]]
    through = None
    for x in listenable:
        if x["state"] != "made":
            break
        through = x["chapter"]
    making_units = [
        u for pair in picks.values() for u in pair if u is not None and u.state == "making"
    ]
    # P41-sr.B2: the units that play, in reading order, name the playlist.
    playing_units = [
        (picks[e.ref.doc][0].id if picks[e.ref.doc][0] is not None else None)
        for e in listen.entries if e.listenable
    ]
    failure = next(
        ({**x["failure"], "chapter": x["chapter"]} for x in listenable if x.get("failure")), None
    )

    position = await lj.get_position(
        ctx.user.id, listen.tenant_id, listen.kind, listen.project, listen.item,
        listen.from_chapter,
    )
    preference = position or await lj.latest_position(ctx.user.id)
    resume = None
    if listen.kind == "book":
        resume = await lj.latest_position(
            ctx.user.id, tenant_id=listen.tenant_id, kind="book", project=listen.project,
            item=listen.item,
        )

    return {
        "listen": listen.key(),
        "state": state,
        "old": any(x.get("old") for x in listenable),
        "updating": any(x.get("updating") for x in listenable),
        "so_far": state != "made",
        "len": _round(length) if length > 0 else None,
        "made": {
            "parts": sum(x.get("parts_made") or 0 for x in listenable),
            "of": sum(x.get("parts") or 0 for x in listenable),
            "chapters": made_chapters,
            "through": through,
        },
        "part": (
            {**pending["part"], "chapter": pending["chapter"]}
            if pending is not None and pending.get("part") else None
        ),
        "left_seconds": (
            sum(x.get("left_seconds") or 0 for x in listenable)
            if any(x.get("left_seconds") is not None for x in listenable) else None
        ),
        "waiting": bool(making_units) and away,
        "runner_last_seen": _iso(last_seen) if listen.member else None,
        "failure": failure,
        "entries": entries,
        "position": _position_out(position),
        "resume": _position_out(resume),
        "speed": preference.speed if preference is not None else DEFAULT_SPEED,
        "follow": preference.follow if preference is not None else DEFAULT_FOLLOW,
        "kept": bool(position.kept) if position is not None else False,
        "play": store.play_links(playing_units),
    }


# -- making --------------------------------------------------------------------------


async def _make(key: ListenKey, ctx: AuthContext, conn, *, update: bool) -> dict[str, Any]:
    gate = rs.Gate(conn=conn, ctx_tenant_id=ctx.tenant.id)
    listen = await _resolve(gate, key, ctx)
    by_doc = await _units_by_doc(listen)
    root = await _content_root({"tenant_id": str(listen.tenant_id)})

    # Per document: make the current version's unit, or attach to an earlier made one.
    work: list[tuple[_Entry, bool, Optional[Any]]] = []  # (entry, make current, update unit)
    for e in listen.entries:
        if not e.listenable:
            continue
        playing, upd = _pick(by_doc.get(e.ref.doc, []), e.ref.version)
        attach_old = (not update) and playing is not None and playing.version < e.ref.version
        work.append((e, not attach_old, upd))

    sources = {e.ref.doc: _current_source(conn, e.ref) for e, make, _ in work if make}

    def _build() -> dict[str, Optional[store.Manifest]]:
        out = {}
        for e, make, _ in work:
            if make:
                src = sources.get(e.ref.doc)
                out[e.ref.doc] = (
                    store.manifest_for_source(src, title=e.ref.title, lang=e.ref.lang)
                    if src else None
                )
        return out

    manifests = await run_in_threadpool(_build)
    now = lj.utc_now()
    async with lj.new_session() as session, session.begin():
        first: list[Any] = []  # the Listen's own parts, in reading order
        later: list[Any] = []  # an update in progress behind an earlier version
        for e, make, upd in work:
            if make:
                unit = await lj.ensure_unit(
                    session, tenant_id=listen.tenant_id, project=listen.project, doc=e.ref.doc,
                    version=e.ref.version, lang=e.ref.lang, manifest=manifests.get(e.ref.doc),
                    root=root, now=now,
                )
                if unit.state == "failed" and unit.failure_kind != "unreadable":
                    await lj.retry_unit(session, unit.id, now)
                if not (unit.state == "failed" and unit.failure_kind == "unreadable"):
                    first.extend(await lj.unmade_parts(session, unit.id))
            elif upd is not None and upd.state == "making":
                later.extend(await lj.unmade_parts(session, upd.id))
        await lj.enqueue(session, listen.tenant_id, first + later, now)
        if not update:
            await lj.clear_kept(
                session, ctx.user.id, listen.tenant_id, listen.kind, listen.project,
                listen.item, listen.from_chapter, now,
            )
    return await _state(listen, ctx)


# -- reader routes -------------------------------------------------------------------


@router.post("/start")
async def start_listen(
    body: ListenKey, ctx: AuthContext = Depends(listen_user), conn=Depends(get_conn)
) -> dict[str, Any]:
    return await _make(body, ctx, conn, update=False)


@router.post("/update")
async def update_listen(
    body: ListenKey, ctx: AuthContext = Depends(listen_user), conn=Depends(get_conn)
) -> dict[str, Any]:
    return await _make(body, ctx, conn, update=True)


@router.get("/state")
async def read_state(
    org: str,
    project: str,
    doc: Optional[str] = None,
    book: Optional[str] = None,
    from_chapter: Optional[str] = None,
    lang: Optional[str] = None,
    ctx: AuthContext = Depends(listen_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    try:
        key = ListenKey(org=org, project=project, doc=doc, book=book,
                        from_chapter=from_chapter, lang=lang)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors(include_url=False, include_context=False)) from None
    gate = rs.Gate(conn=conn, ctx_tenant_id=ctx.tenant.id)
    listen = await _resolve(gate, key, ctx)
    return await _state(listen, ctx)


@router.put("/position")
async def put_position(
    body: PositionIn, ctx: AuthContext = Depends(listen_user), conn=Depends(get_conn)
) -> dict[str, Any]:
    gate = rs.Gate(conn=conn, ctx_tenant_id=ctx.tenant.id)
    listen = await _resolve(gate, body, ctx)
    chapter = body.chapter
    if listen.kind == "doc":
        if chapter is not None:
            raise _unprocessable("a document Listen has no chapter")
    else:
        chapter = chapter or listen.from_chapter
        if chapter not in {e.chapter for e in listen.entries}:
            raise _unprocessable("chapter is not part of this Listen")
    existing = await lj.get_position(
        ctx.user.id, listen.tenant_id, listen.kind, listen.project, listen.item,
        listen.from_chapter,
    )
    preference = existing or await lj.latest_position(ctx.user.id)
    values = {
        "lang": listen.lang,
        "chapter": chapter,
        "seconds": body.seconds,
        "speed": body.speed if body.speed is not None
        else (preference.speed if preference is not None else DEFAULT_SPEED),
        "follow": body.follow if body.follow is not None
        else (preference.follow if preference is not None else DEFAULT_FOLLOW),
        "kept": body.kept if body.kept is not None
        else (existing.kept if existing is not None else False),
    }
    row = await lj.upsert_position(
        ctx.user.id, listen.tenant_id, listen.kind, listen.project, listen.item,
        listen.from_chapter, values,
    )
    return {"listen": listen.key(), "position": _position_out(row)}


# -- runner routes ---------------------------------------------------------------------


async def _runner_root(ctx: ApiAuthContext):
    root = await _content_root({"tenant_id": str(ctx.tenant_id)})
    if root is None:  # pragma: no cover - a resolved tenant id is always a UUID
        raise _not_found()
    return root


@runner_router.post("/jobs/claim", response_model=None)
async def claim_job(ctx: ApiAuthContext = Depends(listen_runner)) -> Any:
    job = await lj.claim(ctx.tenant_id, ctx.credential_id, root=await _runner_root(ctx))
    if job is None:
        return Response(status_code=204)
    return job


@runner_router.post("/jobs/{job_id}/heartbeat")
async def heartbeat_job(
    job_id: UUID, ctx: ApiAuthContext = Depends(listen_runner)
) -> dict[str, Any]:
    try:
        until = await lj.heartbeat(ctx.tenant_id, ctx.credential_id, job_id)
    except lj.JobNotFound:
        raise _not_found() from None
    except lj.JobConflict as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from None
    return {"job": str(job_id), "lease_until": until.isoformat()}


async def _read_capped(request: Request, cap: int) -> bytes:
    declared = request.headers.get("content-length")
    if declared is not None:
        try:
            if int(declared) > cap:
                raise HTTPException(status_code=413, detail=f"a part is at most {cap} bytes")
        except ValueError:
            raise HTTPException(status_code=400, detail="bad Content-Length") from None
    chunks: list[bytes] = []
    size = 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > cap:
            raise HTTPException(status_code=413, detail=f"a part is at most {cap} bytes")
        chunks.append(chunk)
    return b"".join(chunks)


@runner_router.put("/parts/{part_key}", response_model=None)
async def upload_part(
    part_key: str,
    request: Request,
    ext: Optional[str] = Query(default=None, pattern=r"^(m4a|mp4|aac)$"),
    ctx: ApiAuthContext = Depends(listen_runner),
) -> Any:
    if not store.KEY_RE.fullmatch(part_key):
        raise _not_found()
    file_ext = store.media_ext(request.headers.get("content-type"), ext)
    if file_ext is None or file_ext == "aac":  # P41-sr.B2: parts are fragmented MP4 only
        raise HTTPException(
            status_code=415, detail="Content-Type must be audio/mp4 (ext m4a or mp4)"
        )
    declared = (request.headers.get("x-content-sha256") or "").strip().lower()
    if not store.KEY_RE.fullmatch(declared):
        raise _unprocessable("X-Content-SHA256 must be the body's sha256, in hex")
    seconds: Optional[float] = None
    raw_seconds = request.headers.get("x-audio-seconds")
    if raw_seconds is not None:
        try:
            seconds = float(raw_seconds)
        except ValueError:
            seconds = -1.0
        if not 0 < seconds <= SECONDS_MAX:
            raise _unprocessable("X-Audio-Seconds must be the part's length in seconds")
    job_id = await lj.live_lease_for_key(ctx.tenant_id, ctx.credential_id, part_key)
    if job_id is None:
        raise HTTPException(status_code=409, detail="no live lease of yours on this part")
    data = await _read_capped(request, config.listen_max_part_bytes())
    if not data:
        raise _unprocessable("the body is empty")
    if hashlib.sha256(data).hexdigest() != declared:
        raise _unprocessable("the body does not match X-Content-SHA256")
    # P41-sr.B2: only the pinned packaging is stored, so a wrong encoder fails here,
    # not at playback; the bytes' own duration replaces the declared seconds.
    try:
        index = await run_in_threadpool(mp4.index_part, data)
    except mp4.PackagingError as exc:
        raise _unprocessable(f"not the pinned packaging: {exc}") from None
    seconds = index.seconds
    root = await _runner_root(ctx)
    try:
        file, created = await run_in_threadpool(store.store_part, root, part_key, file_ext, data)
    except store.StoreConflict as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from None
    await lj.record_upload(job_id, file=file, size=len(data), seconds=seconds)
    return JSONResponse(
        status_code=201 if created else 200,
        content={"part_key": part_key, "job": str(job_id), "file": file, "bytes": len(data),
                 "created": created},
    )


@runner_router.post("/jobs/{job_id}/finish")
async def finish_job(
    job_id: UUID, body: FinishIn, ctx: ApiAuthContext = Depends(listen_runner)
) -> dict[str, Any]:
    try:
        return await lj.finish(
            ctx.tenant_id, ctx.credential_id, job_id, root=await _runner_root(ctx),
            seconds=body.seconds, segment_seconds=body.segment_seconds,
        )
    except lj.JobNotFound:
        raise _not_found() from None
    except lj.JobConflict as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from None
    except ValueError as exc:
        raise _unprocessable(str(exc)) from None


@runner_router.post("/jobs/{job_id}/fail")
async def fail_job(
    job_id: UUID, body: FailIn, ctx: ApiAuthContext = Depends(listen_runner)
) -> dict[str, Any]:
    try:
        return await lj.fail(ctx.tenant_id, ctx.credential_id, job_id, error=body.error)
    except lj.JobNotFound:
        raise _not_found() from None
    except lj.JobConflict as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from None

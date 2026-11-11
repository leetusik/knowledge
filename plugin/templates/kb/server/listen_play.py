"""Listen's audio delivery (P41-sr.B2): one HLS playlist per Listen, its parts with
Range, and the time axis they share.

Session only (``Authorization: Bearer <session>``, as every ``/app/listen`` route),
GET and HEAD only, and every miss is the one constant ``404 {"detail": "not
found"}``. The Next BFF relays this family at ``/api/listen/play/…``.

* ``GET /app/listen/play/<list>.m3u8`` — **the playlist**
  (``application/vnd.apple.mpegurl``, ``no-store``). ``<list>`` names the units that
  play, in reading order (``server/listen.py`` :func:`~server.listen.play_token`);
  the state hands it out, so a client never builds it. It lists the **playable
  prefix**: each unit's leading made parts, and the next unit only once the one
  before it is made. Every part has its own ``EXT-X-MAP`` (the file's init section,
  by byte range) and an ``EXT-X-DISCONTINUITY`` before it; each fragment is an
  ``EXTINF`` with the file's byte range. It is ``EVENT`` and only grows: the header
  lines never change and lines are only appended, until ``EXT-X-ENDLIST`` once every
  unit is made. A unit with no parts (unreadable) or an all-zero id (a document with
  no unit yet) is never made, so the playlist stops there, as the state's ``len``
  does.
* ``GET /app/listen/play/<unit>/<n>.m4a`` — **part n of a unit**, the stored file
  as ``audio/mp4`` through ``FileResponse``: Range (``206`` with ``Content-Range``,
  ``416``), HEAD, ``Accept-Ranges``, ``nosniff``, and ``private`` with a year's
  ``max-age``, since a unit's part at an index never changes. The playlist names it
  relative to itself (``<unit>/<n>.m4a``), so every media request goes back through
  the same prefix.
* ``GET /app/listen/play/timeline?list=<list>`` — **the time axis**, built from the
  same integer microseconds as the playlist's ``EXTINF`` lines: each entry's start
  and length, each part's start, and each spoken segment's ``{block, start, dur}``,
  from the runner's ``segment_seconds`` (else the segments' characters) fitted to the
  part's real length.

**Visibility.** A part is served only through its unit's document: the unit's
``(tenant, project, doc)`` must pass the readability gate
(:class:`server.reader_state.Gate`, ``_resolve_readable_doc``'s rule), and a playlist
404s whole when any unit it names is gone or unreadable. A file is never served by
its part key alone: keys are shared across a tenant's documents.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse, JSONResponse, Response
from starlette.concurrency import run_in_threadpool

from server import listen as store
from server import listen_jobs as lj
from server import listen_mp4 as mp4
from server import reader_state as rs
from server.accounts.auth import AuthContext
from server.documents_api import _content_root, get_conn
from server.listen_api import _not_found, listen_user

router = APIRouter(prefix=store.PLAY_PREFIX)

PLAYLIST_TYPE = "application/vnd.apple.mpegurl"
PART_TYPE = "audio/mp4"
PART_CACHE = "private, max-age=31536000, immutable"
NO_STORE = "no-store"
NOSNIFF = {"X-Content-Type-Options": "nosniff"}
HLS_VERSION = 6  # EXT-X-MAP outside an I-frame playlist (RFC 8216 §7)

_UNIT_RE = re.compile(r"^[0-9a-f]{32}$")
_INDEX_RE = re.compile(r"^(0|[1-9][0-9]{0,4})$")


@dataclass
class _Entry:
    """One unit of a playlist, with its listed (made, indexed) parts."""

    unit: Any
    ref: rs.DocRef
    parts: list[tuple[Any, mp4.PartIndex]]
    complete: bool


async def _listing(
    token: str, ctx: AuthContext, conn, *, segments: bool
) -> tuple[list[_Entry], bool]:
    """``(entries, ended)``: the playable prefix of the units ``token`` names."""

    ids = store.play_units(token)
    if ids is None:
        raise _not_found()
    named = list(dict.fromkeys(u for u in ids if u is not None))
    units = {u.id: u for u in await lj.units_by_ids(named)}
    if len(units) != len(named):
        raise _not_found()  # a unit is gone (replaced): its URL is gone with it
    gate = rs.Gate(conn=conn, ctx_tenant_id=ctx.tenant.id)
    refs: dict[UUID, rs.DocRef] = {}
    roots: dict[UUID, Any] = {}
    for uid in named:
        unit = units[uid]
        ref = await gate.doc(unit.tenant_id, unit.project, unit.doc)
        if ref is None:
            raise _not_found()
        refs[uid] = ref
        if unit.tenant_id not in roots:
            roots[unit.tenant_id] = await _content_root({"tenant_id": str(unit.tenant_id)})
    by_unit: dict[UUID, list[Any]] = {}
    for part in await lj.play_parts(named, segments=segments):
        by_unit.setdefault(part.unit_id, []).append(part)

    def walk() -> tuple[list[_Entry], bool]:  # file reads: off the event loop
        entries: list[_Entry] = []
        for uid in ids:
            if uid is None:
                return entries, False
            unit = units[uid]
            root = roots[unit.tenant_id]
            rows = by_unit.get(uid, [])
            listed: list[tuple[Any, mp4.PartIndex]] = []
            for part in rows:
                path = store.audio_path(root, part.file) if (root and part.file) else None
                if part.made_at is None or path is None:
                    break
                try:
                    listed.append((part, mp4.index_file(path)))
                except (OSError, mp4.PackagingError):
                    break
            complete = unit.part_count > 0 and len(rows) == unit.part_count == len(listed)
            entries.append(_Entry(unit, refs[uid], listed, complete))
            if not complete:
                return entries, False
        return entries, True

    return await run_in_threadpool(walk)


def _us(value: int) -> str:
    return f"{value // 1_000_000}.{value % 1_000_000:06d}"


def _seconds(value: int) -> float:
    return round(value / 1_000_000, 6)


def render_playlist(entries: list[_Entry], ended: bool) -> str:
    """The playlist text: constant header lines, then only appended lines."""

    lines = [
        "#EXTM3U",
        f"#EXT-X-VERSION:{HLS_VERSION}",
        f"#EXT-X-TARGETDURATION:{mp4.TARGET_DURATION}",
        "#EXT-X-MEDIA-SEQUENCE:0",
        "#EXT-X-PLAYLIST-TYPE:EVENT",
        "#EXT-X-INDEPENDENT-SEGMENTS",
        "#EXT-X-START:TIME-OFFSET=0",
    ]
    first = True
    for entry in entries:
        for part, index in entry.parts:
            uri = f"{entry.unit.id.hex}/{part.idx}.m4a"
            if not first:
                lines.append("#EXT-X-DISCONTINUITY")
            first = False
            lines.append(f'#EXT-X-MAP:URI="{uri}",BYTERANGE="{index.init}@0"')
            for fragment in index.fragments:
                lines.append(f"#EXTINF:{_us(fragment.duration_us)},")
                lines.append(f"#EXT-X-BYTERANGE:{fragment.size}@{fragment.offset}")
                lines.append(uri)
    if ended:
        lines.append("#EXT-X-ENDLIST")
    return "\n".join(lines) + "\n"


def _fit(part: Any, start: int, length: int) -> tuple[list[dict[str, Any]], bool]:
    """``(segments, timed)``: a part's segments on the axis, their weights scaled to
    the part's real length so they tile it exactly. The weights are the runner's
    ``segment_seconds`` when usable (``timed``), else each segment's characters."""

    segments = list(part.segments or [])
    seconds = part.segment_seconds
    timed = (
        isinstance(seconds, list) and len(seconds) == len(segments) and len(segments) > 0
        and all(isinstance(v, (int, float)) and v >= 0 for v in seconds) and sum(seconds) > 0
    )
    if timed:
        weights = [float(v) for v in seconds]
    else:
        weights = [float(len(s.get("text") or "")) for s in segments]
    if not any(weights):
        weights = [1.0] * len(segments)
    total = sum(weights)
    out: list[dict[str, Any]] = []
    acc = 0.0
    for segment, weight in zip(segments, weights):
        a = start + round(length * acc / total)
        acc += weight
        b = start + round(length * acc / total)
        out.append({"block": segment.get("block"), "start": _seconds(a), "dur": _seconds(b - a)})
    return out, timed


def render_timeline(token: str, entries: list[_Entry], ended: bool) -> dict[str, Any]:
    """The time axis, from the same integer microseconds the playlist prints."""

    at = 0
    out: list[dict[str, Any]] = []
    for entry in entries:
        start = at
        parts: list[dict[str, Any]] = []
        segments: list[dict[str, Any]] = []
        for part, index in entry.parts:
            length = index.duration_us
            fitted, timed = _fit(part, at, length)
            parts.append({"n": part.idx, "start": _seconds(at), "len": _seconds(length),
                          "timed": timed})
            segments.extend(fitted)
            at += length
        out.append({
            "unit": str(entry.unit.id),
            "doc": entry.ref.doc,
            "chapter": entry.ref.chapter_key,
            "title": entry.ref.title,
            "lang": entry.unit.lang,
            "version": entry.unit.version,
            "start": _seconds(start),
            "len": _seconds(at - start),
            "complete": entry.complete,
            "parts": parts,
            "segments": segments,
        })
    return {"list": token, "len": _seconds(at), "complete": ended, "entries": out}


# -- routes ----------------------------------------------------------------------------


@router.api_route("/timeline", methods=["GET", "HEAD"])
async def read_timeline(
    list_: str = Query(alias="list", min_length=1, max_length=8000),
    ctx: AuthContext = Depends(listen_user),
    conn=Depends(get_conn),
) -> Response:
    entries, ended = await _listing(list_, ctx, conn, segments=True)
    return JSONResponse(
        render_timeline(list_, entries, ended),
        headers={"Cache-Control": NO_STORE, **NOSNIFF},
    )


@router.api_route("/{token}.m3u8", methods=["GET", "HEAD"])
async def read_playlist(
    token: str, ctx: AuthContext = Depends(listen_user), conn=Depends(get_conn)
) -> Response:
    entries, ended = await _listing(token, ctx, conn, segments=False)
    return Response(
        render_playlist(entries, ended),
        media_type=PLAYLIST_TYPE,
        headers={"Cache-Control": NO_STORE, **NOSNIFF},
    )


@router.api_route("/{unit}/{n}.m4a", methods=["GET", "HEAD"])
async def read_part(
    unit: str, n: str, ctx: AuthContext = Depends(listen_user), conn=Depends(get_conn)
) -> Response:
    if not _UNIT_RE.fullmatch(unit) or not _INDEX_RE.fullmatch(n):
        raise _not_found()
    row = await lj.unit_part(UUID(hex=unit), int(n))
    if row is None or row.made_at is None or not row.file:
        raise _not_found()
    gate = rs.Gate(conn=conn, ctx_tenant_id=ctx.tenant.id)
    if await gate.doc(row.tenant_id, row.project, row.doc) is None:
        raise _not_found()
    root = await _content_root({"tenant_id": str(row.tenant_id)})
    path: Optional[Any] = store.audio_path(root, row.file) if root is not None else None
    if path is None or not path.is_file():
        raise _not_found()
    return FileResponse(
        path, media_type=PART_TYPE, headers={"Cache-Control": PART_CACHE, **NOSNIFF}
    )

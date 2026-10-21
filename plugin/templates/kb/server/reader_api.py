"""The reader-state API: ``/app/reader/…`` (P30.S8; P29.S3 *Routes and writes*).

Session-only (``require_user``): an anonymous caller is the generic 401 and
nothing is stored for them (A4). Unmetered, like every ``/app`` route.

Reads:

* ``GET /app/reader/continue?limit=`` — the most recent position per readable book
  and loose document, newest first;
* ``GET /app/reader/library`` — per-book progress and loose-document state, batched,
  over everything the reader has state in;
* ``GET /app/reader/books/{org}/{project}/{book}`` — per-chapter state, resume,
  book progress, the continue pointer and the counts "clear this book" names;
* ``GET /app/reader/chapters/{org}/{project}/{book}/{key}?lang=&v=`` and
  ``GET /app/reader/docs/{org}/{project}/{doc}?v=`` — one variant's position,
  bookmarks, annotations and the latest quiz attempts of its unit, in one call.
  Annotations come resolved for the version on screen (P30.S9, ``server/anchors.py``):
  each carries ``anchor: {status, method, block_id, start, end, section_index}``,
  ``annotations`` holds the anchored and ``block`` ones in reading order and
  ``unanchored`` the orphans; ``other_languages: {annotations, bookmarks}`` holds the
  chapter's other variants' marks, each with ``section`` mapped onto this variant by
  id (nearest preceding id as the fallback), never painted; bookmarks carry
  ``place: {block_id, exact, fraction, section_index}``; ``resume`` is the unit's
  latest position mapped onto this variant;
* ``GET /app/reader/annotations?org=&project=&book=`` (or ``&doc=``) — the
  per-book list, resolved the same way against each chapter's current version:
  ``annotations`` in reading order, ``unanchored`` (orphans, never dropped), and
  ``bookmarks`` with their ``place``;
* ``GET /app/reader/profile``.

Writes: ``PUT positions``; ``POST/PATCH/DELETE bookmarks[/{id}]``;
``POST/PATCH/DELETE annotations[/{id}]`` (``PATCH {review: true|false}`` is a
highlight's "Review this"); ``POST quiz-attempts`` → ``{attempt, card}`` (the first
attempt seeds the item's review card); ``DELETE state?scope=book|all``; ``PATCH
profile``. Every annotation a read or write returns carries ``review`` (its card is
active) and ``card`` (``"active"``, ``"suspended"`` or ``""``: the CALLER's own card on
it, P30.S21, so "paused" survives a visit).

**Review (P30.S10, ``server/review.py``):**

* ``GET /app/reader/review/queue?limit=`` → ``{now, day: {start, end, time_zone},
  profile, counts: {due, new_highlights, done_today, by_book: [{org, project, book,
  book_title, due, new}]}, limit_reached: "reviews"|"new_highlights"|null,
  next_due_at, cards: [card]}``. A card is ``{card_id, source, item_type, status,
  state (new|learning|review|relearning), reset, reps, lapses, due, last_review,
  created_at, where: {org, project, book, book_title, chapter_key, chapter_title,
  chapter_index, chapter_count, doc, lang, version, block_id, href, quiz_title,
  item_index, item_count | block_title, annotation_id}, front, back, previews:
  {again: {due, interval}, good: {due, interval}}}``; every ``interval`` is in
  whole minutes. Held cards stay in ``counts`` and ``by_book``.
* ``POST /app/reader/review/cards/{id}/review`` ``{rating: again|good, review_id,
  response?, duration_ms?}`` → ``{card: {card_id, source, status, state, reps,
  lapses, due, interval, due_today, rating, reviewed_at, replayed, previews},
  counts, limit_reached, next_due_at, day, next}``. A repeated ``review_id`` is a
  no-op returning the stored outcome; a suspended card is a 409.
* ``PATCH /app/reader/review/cards/{id}`` ``{status: active|suspended}`` → ``{card,
  counts, limit_reached, next_due_at}``: suspend, and its undo.

A card whose document the caller cannot read (or a retired quiz card) is in no
list, count or preview, and every write to it is the constant 404.

**Re-anchoring (S9)** runs on these reads, lazily: the captured anchor is never
rewritten; ``anchor_status`` and ``anchored_version`` (the newest version the text
was found on) are written back for the caller's own rows when a read of a
document's current version changes them. Nothing is deleted or moved.

**Isolation.** Every query carries ``user_id = <caller>``; another user's row id is
the constant 404. **Visibility.** Every read and write re-checks the document's
readability through :class:`server.reader_state.Gate` (member of the owner
tenant, or a public project, and the document exists): a private or deleted
document is omitted from every list and count, and every write to it — a create,
an edit or a delete — is the same 404 (404, never 403). Only ``DELETE
state?scope=all`` reaches hidden rows: it clears everything the reader owns.

``org`` (path, query or body) is the org slug, or the tenant id for a tenant with
no slug — the ``/app/graph?org=`` rule.
"""

from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any, Literal
from uuid import UUID
from zoneinfo import available_timezones

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from server import anchors, config, review
from server import reader_state as rs
from server.accounts.auth import AuthContext, require_user
from server.documents_api import get_conn

router = APIRouter(prefix="/app/reader")

# The ONE 404 every reader-state miss raises: another user's row, an unknown org,
# a private or deleted document, a missing book — all indistinguishable.
_NOT_FOUND = "not found"

ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")  # P29.S2 *Ids*
NAME_RE = re.compile(r"^[^/\s][^/]{0,199}$")  # a project or doc segment
NOTE_MAX = 2000  # 05-annotations Q17, the same on the server and in the field
LABEL_MAX = 120  # 05-annotations: a bookmark's label
SNIPPET_MAX = 300  # ~140 characters, with headroom for a multi-byte "…" clip
QUOTE_MAX = 5000
SNAPSHOT_MAX = 5000
RESPONSE_MAX = 8192  # bytes of a quiz response, serialized


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail=_NOT_FOUND)


def _unprocessable(message: str) -> HTTPException:
    return HTTPException(status_code=422, detail=message)


def _gate(ctx: AuthContext, conn) -> rs.Gate:
    if config.database_url() is None:  # pragma: no cover - require_user needs the DB anyway
        raise _not_found()
    return rs.Gate(conn=conn, ctx_tenant_id=ctx.tenant.id)


async def _doc_ref(gate: rs.Gate, org: str, project: str, doc: str) -> rs.DocRef:
    tenant = await gate.resolve_org(org)
    if tenant is None:
        raise _not_found()
    ref = await gate.doc(tenant.id, project, doc)
    if ref is None:
        raise _not_found()
    return ref


async def _owned_readable(gate: rs.Gate, table, row_id: UUID, ctx: AuthContext):
    """The caller's own row whose document they may still read, else the 404."""

    row = await rs.get_owned(table, row_id, ctx.user.id)
    if row is None:
        raise _not_found()
    ref = await gate.doc(row.tenant_id, row.project, row.doc)
    if ref is None:
        raise _not_found()
    return row, ref


def _version(ref: rs.DocRef, version: int | None) -> int:
    if version is None:
        return ref.version
    if version > ref.version:
        raise _unprocessable(f"version {version} does not exist (current is {ref.version})")
    return version


# -- bodies ----------------------------------------------------------------------


class _Body(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DocKey(_Body):
    """The document a write is about: ``(org, project, doc)``."""

    org: str = Field(min_length=1, max_length=200)
    project: str = Field(min_length=1, max_length=200)
    doc: str = Field(min_length=1, max_length=200)

    @field_validator("project", "doc")
    @classmethod
    def _segment(cls, value: str) -> str:
        if not NAME_RE.fullmatch(value):
            raise ValueError("must be one path segment")
        return value


def _check_id(value: str | None, what: str) -> str | None:
    if value is not None and not ID_RE.fullmatch(value):
        raise ValueError(f"{what} must match [a-z0-9][a-z0-9-]{{0,63}}")
    return value


class PositionIn(DocKey):
    version: int | None = Field(default=None, ge=1)
    anchor_id: str | None = Field(default=None, min_length=1, max_length=200)
    fraction: float = Field(default=0.0, ge=0.0, le=1.0)
    max_fraction: float | None = Field(default=None, ge=0.0, le=1.0)
    finished: bool = False  # the end sentinel entered the viewport, or Mark as finished
    unread: bool = False  # Mark as unread: the one reset

    @model_validator(mode="after")
    def _one_mark(self) -> "PositionIn":
        if self.finished and self.unread:
            raise ValueError("finished and unread are mutually exclusive")
        return self


class BookmarkAnchor(_Body):
    block_id: str | None = None
    anchor: str | None = Field(default=None, min_length=1, max_length=200)
    fraction: float | None = Field(default=None, ge=0.0, le=1.0)

    @field_validator("block_id")
    @classmethod
    def _block(cls, value: str | None) -> str | None:
        return _check_id(value, "block_id")


class BookmarkIn(DocKey):
    id: UUID
    version: int | None = Field(default=None, ge=1)
    anchor: BookmarkAnchor
    label: str | None = Field(default=None, max_length=LABEL_MAX)
    snippet: str = Field(default="", max_length=SNIPPET_MAX)


class BookmarkPatch(_Body):
    label: str | None = Field(default=None, max_length=LABEL_MAX)


class Quote(_Body):
    exact: str = Field(min_length=1, max_length=QUOTE_MAX)
    prefix: str = Field(default="", max_length=32)
    suffix: str = Field(default="", max_length=32)
    start: int | None = Field(default=None, ge=0)
    end: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def _range(self) -> "Quote":
        if self.start is not None and self.end is not None and self.end < self.start:
            raise ValueError("end must not be before start")
        return self


class Snapshot(_Body):
    text: str = Field(default="", max_length=SNAPSHOT_MAX)
    block_title: str = Field(default="", max_length=500)
    chapter_title: str = Field(default="", max_length=500)


def _clean_note(value: str | None) -> str | None:
    """Plain text, line breaks kept; blank means no note."""

    if value is None or not value.strip():
        return None
    return value


class AnnotationIn(DocKey):
    id: UUID
    version: int | None = Field(default=None, ge=1)
    block_id: str
    quote: Quote | None = None
    note: str | None = Field(default=None, max_length=NOTE_MAX)
    snapshot: Snapshot = Field(default_factory=Snapshot)

    @field_validator("block_id")
    @classmethod
    def _block(cls, value: str) -> str:
        return _check_id(value, "block_id") or value

    @model_validator(mode="after")
    def _quote_or_note(self) -> "AnnotationIn":
        self.note = _clean_note(self.note)
        if self.quote is None and self.note is None:
            raise ValueError("an annotation needs a quote or a note")
        return self


class AnnotationPatch(_Body):
    note: str | None = Field(default=None, max_length=NOTE_MAX)
    review: bool | None = None  # "Review this" (P30.S10): a highlight's card on/off


class QuizAttemptIn(DocKey):
    id: UUID
    version: int | None = Field(default=None, ge=1)
    book: str | None = None  # informative: the server derives the unit itself
    chapter_key: str | None = None
    block_id: str
    item_id: str
    item_type: Literal["choice", "recall", "cloze"]
    response: dict[str, Any]
    correct: bool
    answered_at: datetime | None = None

    @field_validator("block_id", "item_id")
    @classmethod
    def _ids(cls, value: str) -> str:
        return _check_id(value, "id") or value

    @model_validator(mode="after")
    def _response_shape(self) -> "QuizAttemptIn":
        r = self.response
        if len(json.dumps(r)) > RESPONSE_MAX:
            raise ValueError("response is too large")
        if self.item_type == "choice":
            ok = set(r) == {"selected"} and isinstance(r["selected"], list) and all(
                isinstance(x, str) and ID_RE.fullmatch(x) for x in r["selected"]
            )
        elif self.item_type == "cloze":
            ok = set(r) == {"blanks"} and isinstance(r["blanks"], list) and all(
                isinstance(x, str) for x in r["blanks"]
            )
        else:
            ok = set(r) == {"self_grade"} and r["self_grade"] in ("got", "missed")
        if not ok:
            raise ValueError(f"response does not match a {self.item_type} item")
        return self


_ZONES: set[str] | None = None


class ProfilePatch(_Body):
    """``day_starts_at_hour`` is not editable (08-review §7): sending it is a 422."""

    time_zone: str | None = Field(default=None, max_length=64)
    max_reviews_per_day: int | None = Field(default=None, ge=1, le=999)
    new_highlights_per_day: int | None = Field(default=None, ge=0, le=999)

    @field_validator("time_zone")
    @classmethod
    def _zone(cls, value: str | None) -> str | None:
        global _ZONES
        if value is None:
            return None
        if _ZONES is None:
            _ZONES = available_timezones()
        if value not in _ZONES:
            raise ValueError("must be an IANA time zone")
        return value


class ReviewIn(_Body):
    rating: Literal["again", "good"]
    review_id: UUID  # the client's idempotency id: a repeat is a no-op
    response: dict[str, Any] | None = None
    duration_ms: int | None = Field(default=None, ge=0, le=86_400_000)

    @model_validator(mode="after")
    def _size(self) -> "ReviewIn":
        if self.response is not None and len(json.dumps(self.response)) > RESPONSE_MAX:
            raise ValueError("response is too large")
        return self


class CardPatch(_Body):
    status: Literal["active", "suspended"]


# -- serializers -------------------------------------------------------------------


def _position_out(row, ref: rs.DocRef) -> dict[str, Any]:
    out = rs.row_out(row, ref.org)
    out["updated"] = bool(
        row.state == "finished"
        and row.finished_version is not None
        and ref.version > row.finished_version
    )
    return out


def _bookmark_out(row, ref: rs.DocRef) -> dict[str, Any]:
    anchor = row.anchor or {}
    positional = not anchor.get("block_id")
    return rs.row_out(
        row,
        ref.org,
        # A position bookmark (plain md, legacy); one made on a legacy chapter that
        # is native now restores approximately (P29 *Anchors → Legacy*).
        pos=positional,
        approx=positional and ref.format == "native",
    )


def _annotation_out(row, ref: rs.DocRef) -> dict[str, Any]:
    return rs.row_out(row, ref.org, kind="hl" if row.quote is not None else "bnote")


def _attempt_out(row, ref: rs.DocRef) -> dict[str, Any]:
    return rs.row_out(row, ref.org)


def _unit_state(rows) -> dict[str, Any]:
    """A chapter's state across its variants: finishing any variant finishes it."""

    if not rows:
        return {"state": "unopened", "finished_version": None, "finished_at": None}
    finished = [r for r in rows if r.state == "finished"]
    if finished:
        first = min(finished, key=lambda r: r.finished_at or r.updated_at)
        return {
            "state": "finished",
            "finished_version": first.finished_version,
            "finished_at": rs._iso(first.finished_at),
            "finished_lang": first.lang,
        }
    return {"state": "started", "finished_version": None, "finished_at": None}


# -- anchors (P30.S9) ----------------------------------------------------------------

_LAST = 1 << 30  # sorts a place with no section after every section


def _section_ids(secs: list[dict] | None) -> list[str]:
    return [s["id"] for s in secs or []]


def _reading_key(item: dict[str, Any]) -> tuple:
    """Reading order within one document (05-annotations *Order*): by section, then
    the section's note, then Text changed, then highlights by offset."""

    a = item["anchor"]
    index = a.get("section_index")
    if a["status"] == anchors.BLOCK:
        rank = 2
    elif item["kind"] == "bnote":
        rank = 1
    else:
        rank = 4
    return (_LAST if index is None else index, rank, a.get("start") or 0, item["created_at"])


def _place_key(item: dict[str, Any]) -> tuple:
    p = item["place"]
    index = p.get("section_index")
    return (_LAST if index is None else index, p.get("fraction") or 0.0, item["created_at"])


class _Anchoring:
    """One request's re-anchoring: resolve rows, queue the write-back, flush once.

    Every read resolves each annotation from its CAPTURED anchor (``block_id`` +
    ``quote``, never rewritten) against the version on screen, so the result is
    always current; the write-back only caches ``anchor_status`` and
    ``anchored_version`` (the newest version the text was found on) for the
    caller's own rows, and only for a document's current version.
    """

    def __init__(self, conn, user_id: UUID) -> None:
        self.sections = rs.SectionCache(conn)
        self.user_id = user_id
        self.updates: list[tuple[UUID, str, int, int]] = []

    def annotation(self, row, ref: rs.DocRef, version: int) -> dict[str, Any]:
        """One annotation of document ``ref``, resolved at ``version`` of it."""

        out = _annotation_out(row, ref)
        secs = self.sections.get(ref, version)
        if secs is None:  # not native, archive missing or unparseable: report as stored
            quote = row.quote or {}
            out["anchor"] = {
                "status": row.anchor_status, "method": "stored", "block_id": row.block_id,
                "start": quote.get("start"), "end": quote.get("end"), "section_index": None,
            }
            return out
        res = anchors.resolve(row.block_id, row.quote, secs)
        order = {sid: i for i, sid in enumerate(_section_ids(secs))}
        out["anchor_status"] = res.status  # for the version on screen
        out["anchor"] = res.public(order)
        if version == ref.version:
            anchored_version = version if res.found else row.anchored_version
            if (res.status, anchored_version) != (row.anchor_status, row.anchored_version):
                self.updates.append((row.id, res.status, anchored_version, version))
            out["anchored_version"] = anchored_version
        return out

    def other_language(
        self, row, own: rs.DocRef, target: rs.DocRef, version: int
    ) -> dict[str, Any]:
        """An annotation made in another language variant (``own``), shown on ``target``.

        Highlights belong to their language (P29 *Language switch*): it is resolved
        in its own variant's current version (so its status is real), and only its
        section is mapped onto the target by id, falling back to the nearest
        preceding id; it is never painted on the translation.
        """

        out = self.annotation(row, own, own.version)
        block = out["anchor"]["block_id"] or row.block_id
        target_secs = self.sections.get(target, version)
        section, exact, index = None, False, None
        if target_secs is not None:
            source = self.sections.order(own, own.version)
            if block not in source:
                source = self.sections.order(own, row.version)
            ids = _section_ids(target_secs)
            section, exact = anchors.map_id(block, source, ids)
            index = ids.index(section) if section is not None else None
        out["other_language"] = True
        out["section"] = {"block_id": section, "exact": exact, "section_index": index}
        return out

    def bookmark(self, row, own: rs.DocRef, target: rs.DocRef, version: int) -> dict[str, Any]:
        """A bookmark made on ``own``, placed in ``target`` at ``version`` (``place``).

        A section bookmark maps by id, else to the nearest preceding id of the
        version it was made on (``exact`` false), else to no section. A position
        keeps its fraction; a legacy one (made on the HTML version) restores by its
        element id when the native chapter carries that id (P29 *Legacy*).
        """

        out = _bookmark_out(row, own)
        anchor = row.anchor or {}
        target_secs = self.sections.get(target, version)
        ids = _section_ids(target_secs)
        if anchor.get("block_id"):
            if target_secs is None:
                same = target.doc == own.doc
                block, exact = (anchor["block_id"], True) if same else (None, False)
            else:
                source = self.sections.order(own, row.version) or self.sections.order(
                    own, own.version
                )
                block, exact = anchors.map_id(anchor["block_id"], source, ids)
        else:
            legacy = anchor.get("anchor")
            block, exact = (legacy, True) if legacy and legacy in ids else (None, False)
        out["place"] = {
            "block_id": block,
            "exact": exact,
            "fraction": anchor.get("fraction"),
            "section_index": ids.index(block) if block in ids else None,
        }
        return out

    def resume(
        self, positions: list, refs: dict[str, rs.DocRef], target: rs.DocRef, version: int
    ) -> dict[str, Any] | None:
        """The unit's latest position (any variant) mapped onto ``target`` by id."""

        if not positions:
            return None
        latest = max(positions, key=lambda p: (p.updated_at, p.doc))
        own = refs.get(latest.doc)
        target_secs = self.sections.get(target, version)
        if target_secs is None:
            same = latest.doc == target.doc and latest.anchor_id
            block, exact = (latest.anchor_id, True) if same else (None, False)
        else:
            source = self.sections.order(own, latest.version) if own is not None else []
            block, exact = anchors.map_id(latest.anchor_id, source, _section_ids(target_secs))
        return {
            "doc": latest.doc, "lang": latest.lang, "version": latest.version,
            "block_id": block, "exact": exact, "fraction": latest.fraction,
        }

    async def flush(self) -> None:
        if self.updates:
            await rs.write_back_anchors(self.user_id, self.updates)
            self.updates = []


# -- reads -------------------------------------------------------------------------


async def _variant_payload(
    gate: rs.Gate, ref: rs.DocRef, ctx: AuthContext, requested: int | None
) -> dict[str, Any]:
    uid = ctx.user.id
    if requested is not None and requested > ref.version:
        raise _not_found()
    # Unit-mates: the same chapter's other variants, for the chapter state.
    mates = [ref.doc]
    if ref.book is not None:
        book = await gate.book(ref.tenant_id, ref.project, ref.book)
        if book is not None:
            mates = [d for key, _, d in rs.live_book_docs(book) if key == ref.chapter_key]
    positions = await rs.positions_for_docs(uid, ref.tenant_id, ref.project, mates)
    own = next((p for p in positions if p.doc == ref.doc), None)
    bookmarks = await rs.rows_for_docs(rs.BOOKMARKS, uid, ref.tenant_id, ref.project, [ref.doc])
    annotations = await rs.rows_for_docs(
        rs.ANNOTATIONS, uid, ref.tenant_id, ref.project, [ref.doc]
    )
    attempts = await rs.latest_attempts(uid, ref.tenant_id, ref.project, ref.unit)
    state = _unit_state(positions)
    state["updated"] = bool(
        state["state"] == "finished"
        and state["finished_version"] is not None
        and ref.version > state["finished_version"]
    )

    # P30.S9: every annotation resolved for the version on screen; orphans apart;
    # the other variants' marks mapped onto this one by id; resume mapped too.
    version = requested or ref.version
    anch = _Anchoring(gate.conn, uid)
    refs = {ref.doc: ref}
    for d in mates:
        if d not in refs:
            mate = await gate.doc(ref.tenant_id, ref.project, d)
            if mate is not None:
                refs[d] = mate
    resolved = [anch.annotation(r, ref, version) for r in annotations]
    others = [d for d in refs if d != ref.doc]
    other_annotations = await rs.rows_for_docs(
        rs.ANNOTATIONS, uid, ref.tenant_id, ref.project, others
    )
    other_bookmarks = await rs.rows_for_docs(rs.BOOKMARKS, uid, ref.tenant_id, ref.project, others)
    other = [anch.other_language(r, refs[r.doc], ref, version) for r in other_annotations]
    other.sort(key=lambda o: (
        _LAST if o["section"]["section_index"] is None else o["section"]["section_index"],
        o["lang"], o["created_at"],
    ))
    payload = {
        "doc": ref.public(),
        "requested_version": version,
        "position": _position_out(own, ref) if own is not None else None,
        "resume": anch.resume(positions, refs, ref, version),
        "chapter": state,
        "bookmarks": sorted((anch.bookmark(r, ref, ref, version) for r in bookmarks), key=_place_key),
        "annotations": sorted(
            (a for a in resolved if a["anchor"]["status"] != anchors.ORPHAN), key=_reading_key
        ),
        "unanchored": [a for a in resolved if a["anchor"]["status"] == anchors.ORPHAN],
        "other_languages": {
            "annotations": other,
            "bookmarks": sorted(
                (anch.bookmark(r, refs[r.doc], ref, version) for r in other_bookmarks),
                key=_place_key,
            ),
        },
        "quiz": [_attempt_out(r, ref) for r in attempts],
    }
    await anch.flush()
    await _mark_review(
        uid, payload["annotations"], payload["unanchored"], payload["other_languages"]["annotations"]
    )
    return payload


async def _mark_review(user_id: UUID, *lists: list[dict[str, Any]]) -> None:
    """Set each annotation's ``review``: is "Review this" on (an active card)?"""

    items = [a for items in lists for a in items]
    cards = await review.highlight_card_status(user_id, (a["id"] for a in items))
    for a in items:
        a["card"] = cards.get(a["id"], "")
        a["review"] = a["card"] == "active"


@router.get("/docs/{org}/{project}/{doc}")
async def read_doc(
    org: str,
    project: str,
    doc: str,
    v: int | None = Query(default=None, ge=1),
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    """One document's state for the caller, in one call."""

    gate = _gate(ctx, conn)
    ref = await _doc_ref(gate, org, project, doc)
    return await _variant_payload(gate, ref, ctx, v)


def _pick_variant(chapter: dict, lang: str | None) -> dict | None:
    variants = chapter["variants"]
    if not variants:
        return None
    by_lang = {v["lang"]: v for v in variants}
    if lang is not None:
        return by_lang.get(lang)
    return by_lang.get("en") or variants[0]


@router.get("/chapters/{org}/{project}/{book}/{key}")
async def read_chapter(
    org: str,
    project: str,
    book: str,
    key: str,
    lang: str | None = None,
    v: int | None = Query(default=None, ge=1),
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    """One chapter variant's state (``lang`` absent: ``en``, else the first variant)."""

    gate = _gate(ctx, conn)
    tenant = await gate.resolve_org(org)
    if tenant is None:
        raise _not_found()
    found = await gate.book(tenant.id, project, book)
    chapter = next((c for c in (found or {}).get("chapters", []) if c["key"] == key), None)
    variant = _pick_variant(chapter, lang) if chapter is not None else None
    if variant is None:
        raise _not_found()
    ref = await gate.doc(tenant.id, project, rs.doc_of(project, variant["rel_path"]))
    if ref is None:
        raise _not_found()
    return await _variant_payload(gate, ref, ctx, v)


async def _book_progress(
    gate: rs.Gate, ctx: AuthContext, tenant_id: UUID, book: dict
) -> dict[str, Any]:
    """Per-chapter state, progress and the continue pointer for one readable book."""

    live = rs.live_book_docs(book)
    positions = await rs.positions_for_docs(
        ctx.user.id, tenant_id, book["project"], [d for _, _, d in live]
    )
    by_doc = {p.doc: p for p in positions}
    chapters = []
    finished = started = updated = 0
    latest = None
    for ch in book["chapters"]:
        rows = []
        variants = []
        for var in ch["variants"]:
            doc = rs.doc_of(book["project"], var["rel_path"])
            row = by_doc.get(doc)
            variants.append(
                {
                    "lang": var["lang"],
                    "doc": doc,
                    "version": var["version"],
                    "state": row.state if row is not None else "unopened",
                }
            )
            if row is not None:
                rows.append((row, var))
        state = _unit_state([r for r, _ in rows])
        newest_version = max((var["version"] for var in ch["variants"]), default=None)
        state["updated"] = bool(
            state["state"] == "finished"
            and state["finished_version"] is not None
            and newest_version is not None
            and newest_version > state["finished_version"]
        )
        resume = max(rows, key=lambda rv: rv[0].updated_at) if rows else None
        if state["state"] == "finished":
            finished += 1
            if state["updated"]:
                updated += 1
        elif state["state"] == "started":
            started += 1
        position = None
        if resume is not None:
            row, var = resume
            position = {
                "doc": row.doc,
                "lang": row.lang,
                "version": row.version,
                "anchor_id": row.anchor_id,
                "fraction": row.fraction,
                "max_fraction": row.max_fraction,
                "updated_at": rs._iso(row.updated_at),
            }
            if latest is None or row.updated_at > latest[0].updated_at:
                latest = (row, ch["key"])
        chapters.append({"key": ch["key"], **state, "position": position, "variants": variants})
    cont = None
    if latest is not None:
        row, key = latest
        cont = {
            "chapter_key": key,
            "doc": row.doc,
            "lang": row.lang,
            "anchor_id": row.anchor_id,
            "fraction": row.fraction,
            "state": row.state,
            "updated_at": rs._iso(row.updated_at),
        }
    return {
        "progress": {"finished": finished, "started": started, "total": len(book["chapters"])},
        "continue": cont,
        "chapters": chapters,
        # Finished chapters with a newer version than the one finished (P30.S22: the
        # library card's "Updated" tag).
        "updated": updated,
        "last_read_at": cont["updated_at"] if cont else None,
    }


@router.get("/books/{org}/{project}/{book}")
async def read_book(
    org: str,
    project: str,
    book: str,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    """One book's reading state for the caller."""

    gate = _gate(ctx, conn)
    tenant = await gate.resolve_org(org)
    found = await gate.book(tenant.id, project, book) if tenant is not None else None
    if found is None:
        raise _not_found()
    progress = await _book_progress(gate, ctx, tenant.id, found)
    docs = [d for _, _, d in rs.live_book_docs(found)]
    marks = await rs.count_marks(ctx.user.id, tenant.id, project, docs)
    with_place = sum(1 for c in progress["chapters"] if c["position"] is not None)
    return {
        "book": {
            "org": rs.org_label(tenant),
            "project": project,
            "slug": found["slug"],
            "title": found["title"],
        },
        **progress,
        "counts": {"chapters_with_place": with_place, "marks": marks},
    }


@router.get("/continue")
async def read_continue(
    limit: int = Query(default=10, ge=1, le=50),
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    """The most recent position per readable book and loose document."""

    gate = _gate(ctx, conn)
    items: list[dict[str, Any]] = []
    seen: set[tuple] = set()
    for row in await rs.recent_positions(ctx.user.id, 500):
        ref = await gate.doc(row.tenant_id, row.project, row.doc)
        if ref is None:
            continue  # private or deleted: omitted
        group = (row.tenant_id, row.project, "b", ref.book) if ref.book else (
            row.tenant_id, row.project, "d", ref.doc
        )
        if group in seen:
            continue
        seen.add(group)
        items.append({"doc": ref.public(), "position": _position_out(row, ref)})
        if len(items) >= limit:
            break
    return {"items": items}


@router.get("/library")
async def read_library(
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    """Per-book progress and loose-document state over everything the reader has read."""

    gate = _gate(ctx, conn)
    books: dict[tuple[UUID, str, str], dict] = {}
    docs: list[dict[str, Any]] = []
    for row in await rs.recent_positions(ctx.user.id, 5000):
        ref = await gate.doc(row.tenant_id, row.project, row.doc)
        if ref is None:
            continue
        if ref.book is not None:
            key = (row.tenant_id, row.project, ref.book)
            if key not in books:
                found = await gate.book(row.tenant_id, row.project, ref.book)
                if found is not None:
                    books[key] = found
            continue
        docs.append({"doc": ref.public(), "position": _position_out(row, ref)})
    out_books = []
    for (tenant_id, project, slug), found in books.items():
        progress = await _book_progress(gate, ctx, tenant_id, found)
        tenant = await gate.tenant(tenant_id)
        out_books.append(
            {
                "org": rs.org_label(tenant) if tenant else str(tenant_id),
                "project": project,
                "book": slug,
                "title": found["title"],
                "progress": progress["progress"],
                "updated": progress["updated"],
                "continue": progress["continue"],
                "last_read_at": progress["last_read_at"],
            }
        )
    return {"books": out_books, "docs": docs}


@router.get("/annotations")
async def read_annotations(
    org: str,
    project: str,
    book: str | None = None,
    doc: str | None = None,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    """The per-book (or one loose document's) list, orphans included, in reading order."""

    if (book is None) == (doc is None):
        raise _unprocessable("give exactly one of book or doc")
    gate = _gate(ctx, conn)
    tenant = await gate.resolve_org(org)
    if tenant is None:
        raise _not_found()
    if book is not None:
        found = await gate.book(tenant.id, project, book)
        if found is None:
            raise _not_found()
        live = rs.live_book_docs(found)
    else:
        ref = await gate.doc(tenant.id, project, doc)
        if ref is None or ref.book is not None:
            raise _not_found()
        live = [(None, ref.lang, ref.doc)]
    order = {d: (i, key, lang) for i, (key, lang, d) in enumerate(live)}
    refs = {d: await gate.doc(tenant.id, project, d) for d in order}
    refs = {d: r for d, r in refs.items() if r is not None}
    uid = ctx.user.id

    anch = _Anchoring(conn, uid)

    def placed(rows, fn, key):
        out = []
        for r in rows:
            ref = refs.get(r.doc)
            if ref is None:
                continue
            _, chapter_key, _lang = order[r.doc]
            out.append({**fn(r, ref), "chapter_key": chapter_key})
        out.sort(key=lambda o: (order[o["doc"]][0], *key(o)))
        return out

    annotations = await rs.rows_for_docs(rs.ANNOTATIONS, uid, tenant.id, project, refs)
    bookmarks = await rs.rows_for_docs(rs.BOOKMARKS, uid, tenant.id, project, refs)
    # P30.S9: each resolved against its document's current version (written back),
    # in reading order; orphans in their own group, never dropped.
    resolved = placed(
        annotations, lambda r, ref: anch.annotation(r, ref, ref.version), _reading_key
    )
    payload = {
        "annotations": [a for a in resolved if a["anchor"]["status"] != anchors.ORPHAN],
        "unanchored": [a for a in resolved if a["anchor"]["status"] == anchors.ORPHAN],
        "bookmarks": placed(
            bookmarks, lambda r, ref: anch.bookmark(r, ref, ref, ref.version), _place_key
        ),
    }
    await anch.flush()
    await _mark_review(uid, payload["annotations"], payload["unanchored"])
    return payload


@router.get("/profile")
async def read_profile(ctx: AuthContext = Depends(require_user)) -> dict[str, Any]:
    return {"profile": await rs.get_profile(ctx.user.id)}


# -- writes ------------------------------------------------------------------------


@router.put("/positions")
async def put_position(
    body: PositionIn,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    """Write the caller's position (the cadence write, the beacon and the two marks)."""

    gate = _gate(ctx, conn)
    ref = await _doc_ref(gate, body.org, body.project, body.doc)
    row = await rs.upsert_position(
        ctx.user.id,
        ref,
        version=_version(ref, body.version),
        anchor_id=body.anchor_id,
        fraction=body.fraction,
        max_fraction=body.max_fraction,
        finished=body.finished,
        unread=body.unread,
    )
    return {"position": _position_out(row, ref)}


def _validate_bookmark(ref: rs.DocRef, anchor: BookmarkAnchor) -> dict[str, Any]:
    if ref.format == "native":
        if anchor.block_id is None or anchor.fraction is not None or anchor.anchor is not None:
            raise _unprocessable("a native bookmark is {block_id}")
        return {"block_id": anchor.block_id}
    if anchor.block_id is not None or anchor.fraction is None:
        raise _unprocessable("this document's bookmark is a position: {fraction, anchor?}")
    if ref.format == "md" and anchor.anchor is not None:
        raise _unprocessable("a plain Markdown position has no anchor")
    out: dict[str, Any] = {"fraction": anchor.fraction}
    if anchor.anchor is not None:
        out["anchor"] = anchor.anchor
    return out


@router.post("/bookmarks", status_code=201)
async def create_bookmark(
    body: BookmarkIn,
    response: Response,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    gate = _gate(ctx, conn)
    ref = await _doc_ref(gate, body.org, body.project, body.doc)
    row, created = await rs.create_row(
        rs.BOOKMARKS,
        dict(
            id=body.id, user_id=ctx.user.id, tenant_id=ref.tenant_id, project=ref.project,
            doc=ref.doc, unit=ref.unit, lang=ref.lang, version=_version(ref, body.version),
            anchor=_validate_bookmark(ref, body.anchor), label=body.label or None,
            snippet=body.snippet,
        ),
    )
    if row is None:
        raise _not_found()
    if not created:
        response.status_code = 200
    return {"bookmark": _bookmark_out(row, ref)}


@router.patch("/bookmarks/{bookmark_id}")
async def patch_bookmark(
    bookmark_id: UUID,
    body: BookmarkPatch,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    if "label" not in body.model_fields_set:
        raise _unprocessable("nothing to change: send label (null clears it)")
    gate = _gate(ctx, conn)
    _, ref = await _owned_readable(gate, rs.BOOKMARKS, bookmark_id, ctx)
    row = await rs.update_owned(
        rs.BOOKMARKS, bookmark_id, ctx.user.id, {"label": body.label or None}
    )
    if row is None:
        raise _not_found()
    return {"bookmark": _bookmark_out(row, ref)}


@router.delete("/bookmarks/{bookmark_id}", status_code=204, response_class=Response)
async def delete_bookmark(
    bookmark_id: UUID,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> Response:
    gate = _gate(ctx, conn)
    await _owned_readable(gate, rs.BOOKMARKS, bookmark_id, ctx)
    if not await rs.delete_owned(rs.BOOKMARKS, bookmark_id, ctx.user.id):
        raise _not_found()
    return Response(status_code=204)


@router.post("/annotations", status_code=201)
async def create_annotation(
    body: AnnotationIn,
    response: Response,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    gate = _gate(ctx, conn)
    ref = await _doc_ref(gate, body.org, body.project, body.doc)
    if ref.format != "native":
        raise _unprocessable("highlights and notes need a native chapter")
    version = _version(ref, body.version)
    row, created = await rs.create_row(
        rs.ANNOTATIONS,
        dict(
            id=body.id, user_id=ctx.user.id, tenant_id=ref.tenant_id, project=ref.project,
            doc=ref.doc, unit=ref.unit, lang=ref.lang, version=version,
            block_id=body.block_id,
            quote=body.quote.model_dump(exclude_none=True) if body.quote else None,
            note=body.note, snapshot=body.snapshot.model_dump(),
            anchor_status="anchored", anchored_version=version,
        ),
    )
    if row is None:
        raise _not_found()
    if not created:
        response.status_code = 200
    out = _annotation_out(row, ref)
    await _mark_review(ctx.user.id, [out])
    return {"annotation": out}


@router.patch("/annotations/{annotation_id}")
async def patch_annotation(
    annotation_id: UUID,
    body: AnnotationPatch,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    """Set or clear a note, and turn a highlight's "Review this" on or off (S10).

    ``review: true`` creates the highlight's card, or makes a suspended one active
    again with its history; ``review: false`` suspends it (history kept). Deleting
    the highlight deletes its card.
    """

    fields = body.model_fields_set
    if not fields & {"note", "review"}:
        raise _unprocessable("nothing to change: send note (null clears it) or review")
    if "review" in fields and body.review is None:
        raise _unprocessable("review is true or false")
    gate = _gate(ctx, conn)
    row, ref = await _owned_readable(gate, rs.ANNOTATIONS, annotation_id, ctx)
    if "review" in fields and row.quote is None:
        raise _unprocessable("only a highlight can be reviewed")
    updated = row
    if "note" in fields:
        note = _clean_note(body.note)
        if note is None and row.quote is None:
            raise _unprocessable("a block note needs its note; delete it instead")
        updated = await rs.update_owned(
            rs.ANNOTATIONS, annotation_id, ctx.user.id, {"note": note}
        )
        if updated is None:
            raise _not_found()
    card = None
    if "review" in fields:
        card = await review.set_highlight_review(ctx.user.id, ref, row, bool(body.review))
    out = _annotation_out(updated, ref)
    await _mark_review(ctx.user.id, [out])
    result: dict[str, Any] = {"annotation": out}
    if card is not None:
        result["card"] = review.card_brief(card, review.now())
    return result


@router.delete("/annotations/{annotation_id}", status_code=204, response_class=Response)
async def delete_annotation(
    annotation_id: UUID,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> Response:
    gate = _gate(ctx, conn)
    await _owned_readable(gate, rs.ANNOTATIONS, annotation_id, ctx)
    if not await rs.delete_owned(rs.ANNOTATIONS, annotation_id, ctx.user.id):
        raise _not_found()
    return Response(status_code=204)


@router.post("/quiz-attempts", status_code=201)
async def create_quiz_attempt(
    body: QuizAttemptIn,
    response: Response,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    """Save one graded attempt; the server numbers it and adds ``unit``.

    The FIRST attempt of ``(unit, item_id)`` seeds the item's review card (P30.S10);
    ``card`` is that card, or ``null`` when the item has none.
    """

    gate = _gate(ctx, conn)
    ref = await _doc_ref(gate, body.org, body.project, body.doc)
    if ref.format != "native":
        raise _unprocessable("quizzes are native-chapter blocks")
    row, created = await rs.record_attempt(
        dict(
            id=body.id, user_id=ctx.user.id, tenant_id=ref.tenant_id, project=ref.project,
            doc=ref.doc, unit=ref.unit, lang=ref.lang, version=_version(ref, body.version),
            block_id=body.block_id, item_id=body.item_id, item_type=body.item_type,
            response=body.response, correct=body.correct,
            answered_at=body.answered_at or rs.utc_now(),
        )
    )
    if row is None:
        raise _not_found()
    if not created:
        response.status_code = 200
    if row.attempt == 1:
        card = await review.seed_quiz_card(ctx.user.id, ref, row)  # idempotent
    else:
        card = await review.quiz_card(ctx.user.id, ref, row.unit, row.item_id)
    return {
        "attempt": row.attempt,
        "card": review.card_brief(card, review.now()) if card is not None else None,
        "result": {
            **_attempt_out(row, ref),
            "book": ref.book,
            "chapter_key": ref.chapter_key,
        },
    }


@router.delete("/state")
async def clear_state(
    scope: Literal["book", "all"],
    org: str | None = None,
    project: str | None = None,
    book: str | None = None,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    """Clear one book's state (``scope=book&org=&project=&book=``) or all of it."""

    if scope == "all":
        return {"scope": "all", "removed": await rs.clear_all(ctx.user.id)}
    if not (org and project and book):
        raise _unprocessable("scope=book needs org, project and book")
    gate = _gate(ctx, conn)
    tenant = await gate.resolve_org(org)
    found = await gate.book(tenant.id, project, book) if tenant is not None else None
    if found is None:
        raise _not_found()
    docs = [d for _, _, d in rs.live_book_docs(found)]
    removed = await rs.clear_book(ctx.user.id, tenant.id, project, book, docs)
    return {"scope": "book", "removed": removed}


@router.patch("/profile")
async def patch_profile(
    body: ProfilePatch,
    ctx: AuthContext = Depends(require_user),
) -> dict[str, Any]:
    changes = body.model_dump(exclude_unset=True)
    for key in ("max_reviews_per_day", "new_highlights_per_day"):
        if key in changes and changes[key] is None:
            raise _unprocessable(f"{key} cannot be null")
    return {"profile": await rs.patch_profile(ctx.user.id, changes)}



# -- review (P30.S10) --------------------------------------------------------------


@router.get("/review/queue")
async def read_review_queue(
    limit: int = Query(default=20, ge=1, le=review.QUEUE_LIMIT_MAX),
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    """The caller's review queue for their local day (P29 *Review data contract*)."""

    return await review.build_queue(_gate(ctx, conn), ctx.user.id, limit=limit)


async def _readable_card(gate: rs.Gate, ctx: AuthContext, card_id: UUID):
    """The caller's own card, resolvable to a document they may read now, else 404."""

    row = await review.get_card(ctx.user.id, card_id)
    if row is None:
        raise _not_found()
    resolver = review.Resolver(gate=gate, user_id=ctx.user.id, at=review.now())
    resolved = await resolver.resolve(row)
    await resolver.flush()
    if resolved is None:
        raise _not_found()
    return resolved


def _after_write(queue: dict[str, Any]) -> dict[str, Any]:
    return {
        "counts": queue["counts"],
        "limit_reached": queue["limit_reached"],
        "next_due_at": queue["next_due_at"],
        "day": queue["day"],
    }


@router.post("/review/cards/{card_id}/review")
async def post_review(
    card_id: UUID,
    body: ReviewIn,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    """Rate one card (Again or Good), idempotently by ``review_id``."""

    gate = _gate(ctx, conn)
    await _readable_card(gate, ctx, card_id)
    try:
        card = await review.review(
            ctx.user.id, card_id, rating=body.rating, review_id=body.review_id,
            response=body.response, duration_ms=body.duration_ms,
        )
    except review.ReviewConflict as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if card is None:
        raise _not_found()
    at = review.now()
    row = await review.get_card(ctx.user.id, card_id)
    queue = await review.build_queue(gate, ctx.user.id, limit=1, at=at)
    card["previews"] = review.previews(row, at) if row is not None else None
    card["due_today"] = datetime.fromisoformat(card["due"]) < datetime.fromisoformat(
        queue["day"]["end"]
    )
    return {"card": card, **_after_write(queue),
            "next": queue["cards"][0] if queue["cards"] else None}


@router.patch("/review/cards/{card_id}")
async def patch_card(
    card_id: UUID,
    body: CardPatch,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, Any]:
    """Suspend a card, or undo that (for a highlight card this is "Review this")."""

    gate = _gate(ctx, conn)
    await _readable_card(gate, ctx, card_id)
    row = await review.set_status(ctx.user.id, card_id, body.status)
    if row is None:
        raise _not_found()
    at = review.now()
    queue = await review.build_queue(gate, ctx.user.id, limit=1, at=at)
    return {"card": review.card_brief(row, at), **_after_write(queue)}

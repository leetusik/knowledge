"""Review on FSRS (P30.S10): cards, the queue, ratings, suspend and item drift.

The contracts are P29.S3's *Review items*, *Algorithm: FSRS*, *Ratings*, *Item
drift* and *Review data contract*, plus the signed ``08-review`` round's *Contract
details P30 adds*. The routes are in ``server/reader_api.py`` (``/app/reader/review/…``);
everything they share is here, and **nothing else imports** ``fsrs``.

**The scheduler.** ``fsrs`` (py-fsrs, pinned in ``pyproject.toml``), FSRS-6 with the
library's default parameters, ``desired_retention`` 0.9, ONE 10-minute learning step
and ONE 10-minute relearning step, ``maximum_interval`` 36500, fuzzing on, and no
optimiser (``review_logs`` keep what a later per-user optimisation needs). The fuzz
is seeded by ``(card id, review number)`` instead of the library's global random, so
the interval a preview shows is exactly the interval the same rating then gets.

**Cards.**

* A quiz item's card is seeded by the reader's FIRST attempt of ``(unit, item_id)``,
  in any language and on any version: that attempt is the card's first review
  (correct, or ``got`` → Good; wrong, or ``missed`` → Again). Later attempts never
  touch the card. The seeding review is logged (its ``response`` carries
  ``seeded_by``) but is not a review "done today": that counts the review surface.
* A highlight's card exists while "Review this" is on: turning it on creates the
  card (or makes a suspended one active again, history intact); turning it off
  suspends it. Deleting the highlight deletes the card (FK cascade). A highlight
  card never reviewed is "new"; quiz cards never are (an answer seeded them).
* Suspend (``PATCH cards/{id}``) is the same status flip, from the review surface; for
  a highlight card it IS "Review this" off.

**Item drift** is applied lazily, when a quiz card is resolved (the queue, a write):
an item id still in a readable variant's current version keeps its card and renders
the new content; one whose ``type`` changed **resets** the card (FSRS state back to
new, logs kept; the card says ``reset: true``, the signed "Starts over"); one gone
from **every** readable variant's current version (each one parsed) makes the card
**retired** (out of the queue, kept with its logs). A version that cannot be parsed
or is not native decides nothing: the card is simply not shown this time.

**Readability** is resolved through :class:`server.reader_state.Gate` on every read
and write, never from the stored ``unit`` alone (it can lag a manifest change): a
quiz card resolves through its unit's CURRENT binding (``d:<doc>`` → that document;
``c:<book>/<key>`` → the book's live variants of that chapter), a highlight card
through its annotation's document. A card that does not resolve to a readable
document is omitted from the queue, every count and every preview, and every write
to it is the constant 404.

**The review day** starts at ``day_starts_at_hour`` (4) in the profile's
``time_zone`` (UTC until the browser sets one). Due = due before the end of today (the day is ``[start, end)``).
Limits: ``max_reviews_per_day`` counts the distinct cards reviewed today on the review
surface (a card back from Again is free); ``new_highlights_per_day`` counts highlight
cards whose first review was today. A held card is still due today, so it stays in
``counts`` and ``by_book`` while ``cards`` leaves it out; ``limit_reached`` says which
limit emptied the queue (``"reviews"``, ``"new_highlights"`` or ``null``).

**Idempotence.** A review's ``review_id`` is its log row's id: a repeat is a no-op that
returns the stored outcome (the log's ``response`` keeps ``due`` and ``state``).
"""

from __future__ import annotations

import logging
import random
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta
from typing import Any, Iterable
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fsrs import Card, Rating, Scheduler, State
from sqlalchemy import and_, or_, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from server import anchors
from server import reader_state as rs
from server.persistence.engine import get_session_maker
from server.persistence.models import ReviewLogModel

logger = logging.getLogger(__name__)

CARDS = rs.CARDS
LOGS = ReviewLogModel.__table__
ANNOTATIONS = rs.ANNOTATIONS

STEP = timedelta(minutes=10)  # P29 *Algorithm: FSRS*: one 10-minute (re)learning step
DESIRED_RETENTION = 0.9
MAXIMUM_INTERVAL = 36500

RATINGS = {"again": Rating.Again, "good": Rating.Good}
RATING_NAMES = {int(Rating.Again): "again", int(Rating.Good): "good"}
STATE_NAMES = {int(State.Learning): "learning", int(State.Review): "review",
               int(State.Relearning): "relearning"}
STATE_NEW = 0  # ``review_logs.state_before`` of a card never reviewed (not an FSRS state)

QUEUE_LIMIT_MAX = 100
CONTEXT_CHARS = 80  # a highlight card's context, each side of the quote


def now() -> datetime:
    """The server's clock (P29: "the server's clock decides"); tests replace it."""

    return rs.utc_now()


# -- the scheduler ---------------------------------------------------------------


class _Scheduler(Scheduler):
    """py-fsrs's scheduler with its fuzz drawn from a seeded generator.

    The fuzz range is the library's own (``FUZZ_RANGES``, pinned version); only the
    random draw changes, from the module-global ``random()`` to ``self._rng``, so a
    preview and the review it previews land on the same day.
    """

    def __init__(self, seed: str) -> None:
        super().__init__(
            desired_retention=DESIRED_RETENTION,
            learning_steps=(STEP,),
            relearning_steps=(STEP,),
            maximum_interval=MAXIMUM_INTERVAL,
            enable_fuzzing=True,
        )
        self._rng = random.Random(seed)

    def _get_fuzzed_interval(self, *, interval: timedelta) -> timedelta:  # noqa: D401
        from fsrs.scheduler import FUZZ_RANGES

        interval_days = interval.days
        if interval_days < 2.5:
            return interval
        delta = 1.0
        for r in FUZZ_RANGES:
            delta += r["factor"] * max(min(float(interval_days), r["end"]) - r["start"], 0.0)
        min_ivl = max(2, round(interval_days - delta))
        max_ivl = min(round(interval_days + delta), self.maximum_interval)
        min_ivl = min(min_ivl, max_ivl)
        fuzzed = self._rng.random() * (max_ivl - min_ivl + 1) + min_ivl
        return timedelta(days=min(round(fuzzed), self.maximum_interval))


def _utc(value: datetime | None) -> datetime | None:
    return value.astimezone(UTC) if value is not None else None


def _fsrs_card(row: Any) -> Card:
    return Card(
        card_id=0,
        state=State(row.fsrs_state),
        step=row.step,
        stability=row.stability,
        difficulty=row.difficulty,
        due=_utc(row.due),
        last_review=_utc(row.last_review),
    )


def _fresh_card(at: datetime) -> Card:
    return Card(card_id=0, state=State.Learning, step=0, due=at)


def _seed(card_id: UUID, reps: int) -> str:
    return f"{card_id}:{reps}"


def _minutes(delta: timedelta) -> int:
    return max(0, round(delta.total_seconds() / 60))


def schedule(card_id: UUID, reps: int, card: Card, rating: Rating, at: datetime) -> Card:
    """The card after one rating at ``at`` (the same answer for a preview and a review)."""

    reviewed, _ = _Scheduler(_seed(card_id, reps)).review_card(card, rating, at)
    return reviewed


def previews(row: Any, at: datetime) -> dict[str, dict[str, Any]]:
    """``{again: {due, interval}, good: {due, interval}}``; ``interval`` in whole minutes."""

    card = _fsrs_card(row)
    out = {}
    for name, rating in RATINGS.items():
        nxt = schedule(row.id, row.reps, card, rating, at)
        out[name] = {"due": nxt.due.isoformat(), "interval": _minutes(nxt.due - at)}
    return out


def _card_values(card: Card) -> dict[str, Any]:
    return {
        "fsrs_state": int(card.state),
        "step": card.step,
        "stability": card.stability,
        "difficulty": card.difficulty,
        "due": card.due,
        "last_review": card.last_review,
    }


def state_name(row: Any) -> str:
    if row.source == "highlight" and row.reps == 0:
        return "new"
    return STATE_NAMES.get(row.fsrs_state, "learning")


# -- the review day ----------------------------------------------------------------


@dataclass(frozen=True)
class Day:
    start: datetime
    end: datetime
    time_zone: str

    def public(self) -> dict[str, str]:
        return {"start": self.start.isoformat(), "end": self.end.isoformat(),
                "time_zone": self.time_zone}


def review_day(at: datetime, time_zone: str | None, starts_at_hour: int) -> Day:
    """The reader's review day around ``at``: ``[start, end)`` in local wall time.

    A review after midnight but before ``starts_at_hour`` counts for the day before
    (08-review §7's day line).
    """

    name = time_zone or "UTC"
    try:
        tz = ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        name, tz = "UTC", ZoneInfo("UTC")
    local = at.astimezone(tz)
    day: date = local.date()
    if local.hour < starts_at_hour:
        day -= timedelta(days=1)
    start = datetime.combine(day, time(starts_at_hour), tzinfo=tz)
    end = datetime.combine(day + timedelta(days=1), time(starts_at_hour), tzinfo=tz)
    return Day(start=start, end=end, time_zone=name)


# -- resolving a card: readability, drift and what it renders ------------------------


@dataclass
class Resolved:
    """A card the caller may read, with what its payload needs."""

    row: Any
    ref: rs.DocRef
    book: dict | None
    # quiz
    quiz: dict | None = None
    item: dict | None = None
    item_index: int | None = None
    # highlight
    annotation: Any = None
    anchor: dict | None = None
    context: dict | None = None


@dataclass
class Resolver:
    """Per-request card resolution through the gate, with every lookup cached.

    ``resolve`` answers ``None`` for a card the caller may not read now (or a quiz
    card whose item is retired or cannot be rendered this time). Drift writes are
    queued and applied by :meth:`flush` (``resolve`` also patches the in-memory row,
    so the request sees the reset card).
    """

    gate: rs.Gate
    user_id: UUID
    at: datetime
    _trees: dict[tuple[str, str, int], dict | None] = field(default_factory=dict)
    _units: dict[tuple[UUID, str, str], list[rs.DocRef] | None] = field(default_factory=dict)
    _books: dict[tuple[UUID, str, str], dict | None] = field(default_factory=dict)
    _last_lang: dict[tuple[UUID, str, str], str | None] = field(default_factory=dict)
    _annotations: dict[UUID, Any] = field(default_factory=dict)
    _sections: rs.SectionCache | None = None
    retire: list[UUID] = field(default_factory=list)
    reset: dict[UUID, tuple[str, dict[str, Any]]] = field(default_factory=dict)

    @property
    def sections(self) -> rs.SectionCache:
        if self._sections is None:
            self._sections = rs.SectionCache(self.gate.conn)
        return self._sections

    def tree(self, ref: rs.DocRef) -> dict | None:
        """The parsed native tree of ``ref``'s current version, or ``None``."""

        from server.native import NativeFormatError, parse_chapter

        key = (str(ref.tenant_id), ref.rel_path, ref.version)
        if key not in self._trees:
            tree = None
            if ref.format == "native":
                row = self.gate.conn.execute(
                    "SELECT format, source FROM documents WHERE id = ? AND tenant_id = ?",
                    (ref.doc_id, str(ref.tenant_id)),
                ).fetchone()
                if row is not None and row["format"] == "native" and row["source"]:
                    try:
                        tree = parse_chapter(row["source"]).tree
                    except NativeFormatError:
                        logger.warning("review: stored source no longer parses rel_path=%s",
                                       ref.rel_path)
            self._trees[key] = tree
        return self._trees[key]

    async def book(self, tenant_id: UUID, project: str, slug: str) -> dict | None:
        key = (tenant_id, project, slug)
        if key not in self._books:
            self._books[key] = await self.gate.book(tenant_id, project, slug)
        return self._books[key]

    async def unit_refs(self, tenant_id: UUID, project: str, unit: str) -> list[rs.DocRef] | None:
        """The readable documents the unit binds NOW (``None``: none)."""

        key = (tenant_id, project, unit)
        if key in self._units:
            return self._units[key]
        refs: list[rs.DocRef] = []
        if unit.startswith("d:"):
            ref = await self.gate.doc(tenant_id, project, unit[2:])
            if ref is not None:
                refs.append(ref)
        elif unit.startswith("c:"):
            slug, _, chapter_key = unit[2:].partition("/")
            found = await self.book(tenant_id, project, slug)
            chapter = next(
                (c for c in (found or {}).get("chapters", []) if c["key"] == chapter_key), None
            )
            for variant in (chapter or {}).get("variants", []):
                ref = await self.gate.doc(tenant_id, project, rs.doc_of(project, variant["rel_path"]))
                if ref is not None and ref.unit == unit:
                    refs.append(ref)
        self._units[key] = refs or None
        return self._units[key]

    async def last_lang(self, tenant_id: UUID, project: str, refs: list[rs.DocRef]) -> str | None:
        """The reader's last-used language for a unit (its newest position), if any."""

        key = (tenant_id, project, refs[0].unit)
        if key not in self._last_lang:
            rows = await rs.positions_for_docs(self.user_id, tenant_id, project,
                                               [r.doc for r in refs])
            latest = max(rows, key=lambda p: p.updated_at, default=None)
            self._last_lang[key] = latest.lang if latest is not None else None
        return self._last_lang[key]

    async def resolve(self, row: Any) -> Resolved | None:
        if row.status == "retired":
            return None
        if row.source == "highlight":
            return await self._highlight(row)
        return await self._quiz(row)

    async def _quiz(self, row: Any) -> Resolved | None:
        refs = await self.unit_refs(row.tenant_id, row.project, row.unit)
        if refs is None:
            return None
        last = await self.last_lang(row.tenant_id, row.project, refs)
        rank = {lang: i for i, lang in enumerate(x for x in (last, row.lang, "en") if x)}
        ordered = sorted(refs, key=lambda r: (rank.get(r.lang, len(rank)), r.lang))
        undecided = False
        for ref in ordered:
            tree = self.tree(ref)
            if tree is None:
                undecided = True
                continue
            found = _find_item(tree, row.item_id)
            if found is None:
                continue
            quiz, item, index = found
            if item["type"] != row.item_type:
                self._reset(row, item["type"])
            book = await self.book(ref.tenant_id, ref.project, ref.book) if ref.book else None
            return Resolved(row=row, ref=ref, book=book, quiz=quiz, item=item, item_index=index)
        if not undecided:
            # Gone from every readable variant's current version: retired (P29 *Item drift*).
            self.retire.append(row.id)
        return None

    def _reset(self, row: Any, item_type: str) -> None:
        values = {
            **_card_values(_fresh_card(self.at)), "item_type": item_type, "reps": 0,
            "lapses": 0, "updated_at": self.at,
        }
        self.reset[row.id] = (row.item_type, values)
        _patch_row(row, values)

    async def load_annotations(self, ids: Iterable[UUID]) -> None:
        missing = [i for i in set(ids) if i is not None and i not in self._annotations]
        if not missing:
            return
        stmt = select(ANNOTATIONS).where(
            ANNOTATIONS.c.id.in_(missing), ANNOTATIONS.c.user_id == self.user_id
        )
        async with get_session_maker()() as session:
            for a in (await session.execute(stmt)).all():
                self._annotations[a.id] = a

    async def _highlight(self, row: Any) -> Resolved | None:
        await self.load_annotations([row.annotation_id])
        ann = self._annotations.get(row.annotation_id)
        if ann is None or ann.quote is None:
            return None
        ref = await self.gate.doc(ann.tenant_id, ann.project, ann.doc)
        if ref is None:
            return None
        book = await self.book(ref.tenant_id, ref.project, ref.book) if ref.book else None
        quote = ann.quote or {}
        anchor = {"status": ann.anchor_status, "method": "stored", "block_id": ann.block_id,
                  "start": quote.get("start"), "end": quote.get("end"), "section_index": None}
        context = {"before": quote.get("prefix", ""), "after": quote.get("suffix", "")}
        secs = self.sections.get(ref, ref.version)
        if secs is not None:
            res = anchors.resolve(ann.block_id, ann.quote, secs)
            order = {s["id"]: i for i, s in enumerate(secs)}
            anchor = res.public(order)
            text = next((s["text"] for s in secs if s["id"] == anchor.get("block_id")), None)
            if text is not None and anchor.get("start") is not None and anchor.get("end") is not None:
                start, end = anchor["start"], anchor["end"]
                context = {"before": text[max(0, start - CONTEXT_CHARS):start],
                           "after": text[end:end + CONTEXT_CHARS]}
        return Resolved(row=row, ref=ref, book=book, annotation=ann, anchor=anchor,
                        context=context)

    async def flush(self) -> None:
        """Apply the drift found while resolving (user-scoped; idempotent)."""

        if not self.retire and not self.reset:
            return
        async with get_session_maker()() as session:
            if self.retire:
                await session.execute(
                    update(CARDS)
                    .where(CARDS.c.id.in_(self.retire), CARDS.c.user_id == self.user_id,
                           CARDS.c.status != "retired")
                    .values(status="retired", updated_at=self.at)
                )
            for card_id, (old_type, values) in self.reset.items():
                await session.execute(
                    update(CARDS)
                    .where(CARDS.c.id == card_id, CARDS.c.user_id == self.user_id,
                           CARDS.c.item_type == old_type)
                    .values(**values)
                )
            await session.commit()
        if self.retire or self.reset:
            logger.info("review drift user=%s retired=%d reset=%d", self.user_id,
                        len(self.retire), len(self.reset))
        self.retire, self.reset = [], {}


class _Row:
    """A mutable stand-in for a card row (drift patches it in memory)."""

    def __init__(self, row: Any) -> None:
        self.__dict__.update(dict(row._mapping))


def _patch_row(row: Any, values: dict[str, Any]) -> None:
    for key, value in values.items():
        setattr(row, key, value)


def _find_item(tree: dict, item_id: str | None) -> tuple[dict, dict, int] | None:
    for block in tree.get("blocks", []):
        if block.get("type") != "quiz":
            continue
        for index, item in enumerate(block.get("items") or []):
            if item and item.get("id") == item_id:
                return block, item, index
    return None


# -- payloads ------------------------------------------------------------------------


def _href(tenant_slug: str | None, ref: rs.DocRef, slug: str | None, block_id: str | None) -> str:
    frag = f"#{block_id}" if block_id else ""
    if tenant_slug:
        if ref.book is not None:
            return (f"/@{tenant_slug}/{ref.project}/books/{ref.book}/{ref.chapter_key}"
                    f"?lang={ref.lang}{frag}")
        if slug:
            return f"/@{tenant_slug}/{ref.project}/{slug}{frag}"
    return f"/documents/{ref.doc_id}{frag}"


def _cloze_front(text: list[dict]) -> tuple[list[dict], list[list[str]]]:
    out, accepted = [], []
    for node in text or []:
        if node.get("type") == "blank":
            out.append({"type": "blank", "index": len(accepted)})
            accepted.append(list(node.get("accept") or []))
        else:
            out.append(node)
    return out, accepted


def _quiz_sides(item: dict) -> tuple[dict, dict]:
    kind = item["type"]
    if kind == "choice":
        answer = list(item.get("answer") or [])
        return (
            {"prompt": item.get("prompt"), "options": item.get("options") or [],
             "multi": len(answer) > 1},
            {"answer": answer, "explain": item.get("explain")},
        )
    if kind == "cloze":
        text, accepted = _cloze_front(item.get("text") or [])
        return ({"text": text, "blanks": len(accepted)},
                {"accepted": accepted, "explain": item.get("explain")})
    return ({"prompt": item.get("prompt")},
            {"answer": item.get("answer"), "explain": item.get("explain")})


async def card_payload(res: Resolved, resolver: Resolver, at: datetime) -> dict[str, Any]:
    """One card as the review surface draws it (P29 *A card* + 08-review's additions)."""

    row, ref = res.row, res.ref
    tenant = await resolver.gate.tenant(ref.tenant_id)
    tenant_slug = tenant.slug if tenant is not None else None
    doc_slug = None
    if ref.book is None and tenant_slug:
        found = resolver.gate.conn.execute(
            "SELECT slug FROM documents WHERE id = ?", (ref.doc_id,)
        ).fetchone()
        doc_slug = found["slug"] if found is not None else None
    chapters = (res.book or {}).get("chapters", [])
    chapter_index = next(
        (i + 1 for i, c in enumerate(chapters) if c["key"] == ref.chapter_key), None
    )
    where: dict[str, Any] = {
        "org": ref.org, "project": ref.project, "book": ref.book,
        "book_title": (res.book or {}).get("title"),
        "chapter_key": ref.chapter_key, "chapter_title": ref.title,
        "chapter_index": chapter_index, "chapter_count": len(chapters) if res.book else None,
        "doc": ref.doc, "lang": ref.lang, "version": ref.version,
    }
    if row.source == "quiz":
        quiz, item = res.quiz or {}, res.item or {}
        block_id = quiz.get("id")
        where.update({
            "block_id": block_id, "quiz_title": quiz.get("title"),
            "item_index": (res.item_index or 0) + 1, "item_count": len(quiz.get("items") or []),
        })
        front, back = _quiz_sides(item)
        item_type = item.get("type", row.item_type)
    else:
        ann = res.annotation
        snapshot = ann.snapshot or {}
        block_id = (res.anchor or {}).get("block_id") or ann.block_id
        where.update({"block_id": block_id, "block_title": snapshot.get("block_title") or None,
                      "annotation_id": str(ann.id)})
        front = {
            "quote": (ann.quote or {}).get("exact"),
            "block_title": snapshot.get("block_title") or None,
            "note": ann.note,
            "context": res.context,
            "anchor": res.anchor,
            "lang": ann.lang,
        }
        back = None
        item_type = "highlight"
    where["href"] = _href(tenant_slug, ref, doc_slug, block_id)
    return {
        "card_id": str(row.id),
        "source": row.source,
        "item_type": item_type,
        "status": row.status,
        "state": state_name(row),
        "reset": row.source == "quiz" and row.reps == 0,
        "reps": row.reps,
        "lapses": row.lapses,
        "due": _utc(row.due).isoformat(),
        "last_review": _utc(row.last_review).isoformat() if row.last_review else None,
        "created_at": _utc(row.created_at).isoformat(),
        "where": where,
        "front": front,
        "back": back,
        "previews": previews(row, at),
    }


def card_brief(row: Any, at: datetime) -> dict[str, Any]:
    """The short card a write returns: ``{card_id, status, state, due, interval}``."""

    due = _utc(row.due)
    return {
        "card_id": str(row.id),
        "source": row.source,
        "status": row.status,
        "state": state_name(row),
        "reps": row.reps,
        "lapses": row.lapses,
        "due": due.isoformat(),
        "interval": _minutes(due - at),
    }


# -- the queue -----------------------------------------------------------------------


def _is_new(row: Any) -> bool:
    return row.source == "highlight" and row.reps == 0


def _not_seeded():
    return or_(LOGS.c.response.is_(None), ~LOGS.c.response.has_key("seeded_by"))


async def build_queue(gate: rs.Gate, user_id: UUID, *, limit: int, at: datetime | None = None
                      ) -> dict[str, Any]:
    """``GET /app/reader/review/queue``'s payload (P29 *Review data contract*)."""

    at = at or now()
    profile = await rs.get_profile(user_id)
    day = review_day(at, profile["time_zone"], profile["day_starts_at_hour"])
    resolver = Resolver(gate=gate, user_id=user_id, at=at)

    async with get_session_maker()() as session:
        logs_today = (
            await session.execute(
                select(LOGS.c.card_id, LOGS.c.state_before)
                .where(LOGS.c.user_id == user_id, LOGS.c.reviewed_at >= day.start,
                       _not_seeded())
            )
        ).all()
        today_ids = {r.card_id for r in logs_today}
        cond = CARDS.c.status == "active"
        if today_ids:
            cond = or_(cond, CARDS.c.id.in_(today_ids))
        rows = [_Row(r) for r in (
            await session.execute(select(CARDS).where(CARDS.c.user_id == user_id, cond))
        ).all()]

    await resolver.load_annotations(r.annotation_id for r in rows if r.source == "highlight")
    resolved: dict[UUID, Resolved] = {}
    for row in rows:
        res = await resolver.resolve(row)
        if res is not None:
            resolved[row.id] = res
    await resolver.flush()

    reviewed_today = {cid for cid in today_ids if cid in resolved}
    new_done = {
        r.card_id for r in logs_today
        if r.card_id in resolved and r.state_before == STATE_NEW
        and resolved[r.card_id].row.source == "highlight"
    }
    active = [res for res in resolved.values() if res.row.status == "active"]
    due_today = [res for res in active if _utc(res.row.due) < day.end]
    reviews = [res for res in due_today if not _is_new(res.row)]
    new = [res for res in due_today if _is_new(res.row)]
    reviews.sort(key=lambda res: (
        0 if res.row.fsrs_state == int(State.Relearning) and _utc(res.row.due) <= at else 1,
        _utc(res.row.due), str(res.row.id),
    ))
    new.sort(key=lambda res: (_utc(res.row.due), _utc(res.row.created_at), str(res.row.id)))

    max_reviews = profile["max_reviews_per_day"]
    max_new = profile["new_highlights_per_day"]
    done_today = len(reviewed_today)
    budget = max(0, max_reviews - done_today)
    new_budget = max(0, max_new - len(new_done))
    served: list[Resolved] = []
    if done_today < max_reviews:
        for res in reviews:
            if res.row.id in reviewed_today:
                served.append(res)  # back from Again today: already counted
            elif budget > 0:
                served.append(res)
                budget -= 1
        for res in new:
            if budget <= 0 or new_budget <= 0:
                break
            served.append(res)
            budget -= 1
            new_budget -= 1

    limit_reached = None
    if not served and (reviews or new):
        limit_reached = "reviews" if done_today >= max_reviews or reviews else "new_highlights"

    groups: dict[tuple, dict[str, Any]] = {}
    for res in reviews + new:
        ref = res.ref
        key = (ref.tenant_id, ref.project, ref.book)
        if key not in groups:
            groups[key] = {
                "org": ref.org, "project": ref.project, "book": ref.book,
                "book_title": (res.book or {}).get("title") if ref.book else None,
                "due": 0, "new": 0,
            }
        groups[key]["new" if _is_new(res.row) else "due"] += 1
    later = [_utc(res.row.due) for res in active if _utc(res.row.due) >= day.end]

    cards = [await card_payload(res, resolver, at) for res in served[:limit]]
    return {
        "now": at.isoformat(),
        "day": day.public(),
        "profile": {k: profile[k] for k in ("time_zone", "day_starts_at_hour",
                                             "max_reviews_per_day", "new_highlights_per_day")},
        "counts": {
            "due": len(reviews),
            "new_highlights": len(new),
            "done_today": done_today,
            "by_book": list(groups.values()),
        },
        "limit_reached": limit_reached,
        "next_due_at": min(later).isoformat() if later else None,
        "cards": cards,
    }


# -- writes --------------------------------------------------------------------------


async def get_card(user_id: UUID, card_id: UUID) -> Any | None:
    """The caller's own card (another user's id ⇒ ``None``)."""

    async with get_session_maker()() as session:
        row = (await session.execute(
            select(CARDS).where(CARDS.c.id == card_id, CARDS.c.user_id == user_id)
        )).one_or_none()
    return _Row(row) if row is not None else None


async def seed_quiz_card(user_id: UUID, ref: rs.DocRef, attempt: Any) -> Any:
    """Seed a quiz item's card from the reader's FIRST attempt (idempotent).

    The attempt is the card's first review: correct (``got``) → Good, wrong
    (``missed``) → Again. A card that already exists for ``(unit, item_id)`` is
    returned untouched.
    """

    at = now()
    response = attempt.response or {}
    if attempt.item_type == "recall" and "self_grade" in response:
        good = response["self_grade"] == "got"
    else:
        good = bool(attempt.correct)
    rating = Rating.Good if good else Rating.Again
    card_id = uuid4()
    card = schedule(card_id, 0, _fresh_card(at), rating, at)
    values = dict(
        id=card_id, user_id=user_id, tenant_id=ref.tenant_id, project=ref.project,
        unit=attempt.unit, source="quiz", item_id=attempt.item_id, annotation_id=None,
        item_type=attempt.item_type, lang=attempt.lang, status="active", reps=1,
        lapses=0, created_at=at, updated_at=at, **_card_values(card),
    )
    stmt = (
        pg_insert(CARDS).values(**values)
        .on_conflict_do_nothing(
            index_elements=[CARDS.c.user_id, CARDS.c.tenant_id, CARDS.c.project,
                            CARDS.c.unit, CARDS.c.item_id],
            index_where=CARDS.c.source == "quiz",
        )
        .returning(*CARDS.c)
    )
    async with get_session_maker()() as session:
        row = (await session.execute(stmt)).one_or_none()
        if row is not None:
            await session.execute(pg_insert(LOGS).values(
                id=uuid4(), card_id=card_id, user_id=user_id, rating=int(rating),
                response={"answer": response, "seeded_by": str(attempt.id),
                          "due": card.due.isoformat(), "state": STATE_NAMES[int(card.state)]},
                reviewed_at=at, state_before=STATE_NEW,
                scheduled_days=(card.due - at).days, elapsed_days=0, duration_ms=None,
            ))
        await session.commit()
    return _Row(row) if row is not None else await quiz_card(user_id, ref, attempt.unit,
                                                               attempt.item_id)


async def quiz_card(user_id: UUID, ref: rs.DocRef, unit: str, item_id: str) -> Any | None:
    async with get_session_maker()() as session:
        row = (await session.execute(select(CARDS).where(
            CARDS.c.user_id == user_id, CARDS.c.tenant_id == ref.tenant_id,
            CARDS.c.project == ref.project, CARDS.c.unit == unit,
            CARDS.c.item_id == item_id, CARDS.c.source == "quiz",
        ))).one_or_none()
    return _Row(row) if row is not None else None


async def set_highlight_review(user_id: UUID, ref: rs.DocRef, annotation: Any, on: bool
                               ) -> Any | None:
    """"Review this": on creates the card or makes it active again; off suspends it.

    Suspending keeps the card's FSRS state and logs, so turning it back on resumes
    where it was (08-review §5; annotations 7).
    """

    at = now()
    async with get_session_maker()() as session:
        if on:
            card = _fresh_card(at)
            ins = pg_insert(CARDS).values(
                id=uuid4(), user_id=user_id, tenant_id=ref.tenant_id, project=ref.project,
                unit=ref.unit, source="highlight", item_id=None, annotation_id=annotation.id,
                item_type="highlight", lang=annotation.lang, status="active", reps=0,
                lapses=0, created_at=at, updated_at=at, **_card_values(card),
            )
            stmt = ins.on_conflict_do_update(
                index_elements=[CARDS.c.annotation_id],
                set_={"status": "active", "unit": ins.excluded.unit, "updated_at": at},
                where=and_(CARDS.c.user_id == user_id, CARDS.c.status != "retired"),
            ).returning(*CARDS.c)
        else:
            stmt = (
                update(CARDS)
                .where(CARDS.c.annotation_id == annotation.id, CARDS.c.user_id == user_id,
                       CARDS.c.status == "active")
                .values(status="suspended", updated_at=at)
                .returning(*CARDS.c)
            )
        row = (await session.execute(stmt)).one_or_none()
        await session.commit()
    if row is None:
        async with get_session_maker()() as session:
            row = (await session.execute(select(CARDS).where(
                CARDS.c.annotation_id == annotation.id, CARDS.c.user_id == user_id
            ))).one_or_none()
    return _Row(row) if row is not None else None


async def active_highlights(user_id: UUID, annotation_ids: Iterable[Any]) -> set[str]:
    """The caller's annotation ids whose "Review this" is on (an active card)."""

    ids = [UUID(str(i)) for i in set(annotation_ids) if i]
    if not ids:
        return set()
    async with get_session_maker()() as session:
        rows = (await session.execute(select(CARDS.c.annotation_id).where(
            CARDS.c.user_id == user_id, CARDS.c.annotation_id.in_(ids),
            CARDS.c.status == "active",
        ))).all()
    return {str(r.annotation_id) for r in rows}


async def highlight_card_status(user_id: UUID, annotation_ids: Iterable[Any]) -> dict[str, str]:
    """The caller's highlight cards by annotation id: ``"active"`` or ``"suspended"``.

    Only the caller's own cards are read (``user_id``), so another reader's card on
    the same highlight id is never seen. An annotation with no card is absent.
    """

    ids = [UUID(str(i)) for i in set(annotation_ids) if i]
    if not ids:
        return {}
    async with get_session_maker()() as session:
        rows = (await session.execute(select(CARDS.c.annotation_id, CARDS.c.status).where(
            CARDS.c.user_id == user_id, CARDS.c.annotation_id.in_(ids),
            CARDS.c.status.in_(("active", "suspended")),
        ))).all()
    return {str(r.annotation_id): r.status for r in rows}


async def set_status(user_id: UUID, card_id: UUID, status: str) -> Any | None:
    at = now()
    async with get_session_maker()() as session:
        row = (await session.execute(
            update(CARDS)
            .where(CARDS.c.id == card_id, CARDS.c.user_id == user_id,
                   CARDS.c.status.in_(("active", "suspended")))
            .values(status=status, updated_at=at)
            .returning(*CARDS.c)
        )).one_or_none()
        await session.commit()
    return _Row(row) if row is not None else None


class ReviewConflict(Exception):
    """The card cannot take a rating now (suspended), or the id names another card."""


def _replay(log: Any, card_row: Any) -> dict[str, Any]:
    stored = log.response or {}
    due = datetime.fromisoformat(stored["due"]) if stored.get("due") else _utc(card_row.due)
    reviewed_at = _utc(log.reviewed_at)
    return {
        "card_id": str(card_row.id),
        "source": card_row.source,
        "status": card_row.status,
        "state": stored.get("state") or state_name(card_row),
        "rating": RATING_NAMES.get(log.rating),
        "due": due.isoformat(),
        "interval": _minutes(due - reviewed_at),
        "reviewed_at": reviewed_at.isoformat(),
        "replayed": True,
    }


async def review(
    user_id: UUID,
    card_id: UUID,
    *,
    rating: str,
    review_id: UUID,
    response: dict | None,
    duration_ms: int | None,
) -> dict[str, Any] | None:
    """Rate a card once, idempotently by ``review_id``; ``None`` ⇒ the 404.

    The card row is locked for the transaction, so two ratings never interleave. A
    ``review_id`` already logged for this card returns that review's stored outcome
    and writes nothing; one logged for another card (or user) is the 404/409.
    """

    at = now()
    async with get_session_maker()() as session:
        card_row = (await session.execute(
            select(CARDS).where(CARDS.c.id == card_id, CARDS.c.user_id == user_id)
            .with_for_update()
        )).one_or_none()
        if card_row is None:
            return None
        log = (await session.execute(select(LOGS).where(LOGS.c.id == review_id))).one_or_none()
        if log is not None:
            await session.rollback()
            if log.user_id != user_id:
                return None
            if log.card_id != card_id:
                raise ReviewConflict("review_id was used for another card")
            return _replay(log, card_row)
        if card_row.status != "active":
            await session.rollback()
            raise ReviewConflict(f"the card is {card_row.status}")
        before = _fsrs_card(card_row)
        nxt = schedule(card_row.id, card_row.reps, before, RATINGS[rating], at)
        state_before = STATE_NEW if card_row.reps == 0 else card_row.fsrs_state
        lapse = int(RATINGS[rating] == Rating.Again and card_row.fsrs_state == int(State.Review))
        inserted = (await session.execute(
            pg_insert(LOGS).values(
                id=review_id, card_id=card_id, user_id=user_id, rating=int(RATINGS[rating]),
                response={"answer": response, "due": nxt.due.isoformat(),
                          "state": STATE_NAMES[int(nxt.state)]},
                reviewed_at=at, state_before=state_before,
                scheduled_days=(nxt.due - at).days,
                elapsed_days=(at - before.last_review).days if before.last_review else 0,
                duration_ms=duration_ms,
            ).on_conflict_do_nothing(index_elements=[LOGS.c.id]).returning(LOGS.c.id)
        )).one_or_none()
        if inserted is None:  # a racing request took this id first: replay it
            await session.rollback()
            async with get_session_maker()() as again:
                log = (await again.execute(select(LOGS).where(LOGS.c.id == review_id))).one()
            if log.user_id != user_id:
                return None
            if log.card_id != card_id:
                raise ReviewConflict("review_id was used for another card")
            return _replay(log, (await get_card(user_id, card_id)) or card_row)
        updated = (await session.execute(
            update(CARDS).where(CARDS.c.id == card_id)
            .values(**_card_values(nxt), reps=card_row.reps + 1,
                    lapses=card_row.lapses + lapse, updated_at=at)
            .returning(*CARDS.c)
        )).one()
        await session.commit()
    out = card_brief(updated, at)
    out.update({"rating": rating, "reviewed_at": at.isoformat(), "replayed": False})
    return out


def queue_limit(value: int | None) -> int:
    if value is None:
        return 20
    return max(1, min(int(value), QUEUE_LIMIT_MAX))


__all__ = [
    "Day", "ReviewConflict", "Resolver", "active_highlights", "highlight_card_status", "build_queue", "card_brief",
    "card_payload", "get_card", "now", "previews", "queue_limit", "review", "review_day",
    "seed_quiz_card", "set_highlight_review", "set_status",
]

"""Reader state: the store, the readability gate, the purge and the unit re-write (P30.S8).

Each signed-in reader's private state — resume position and progress, bookmarks,
highlights and notes, quiz attempts and the review profile — lives in Postgres
(``alembic/versions/0006_reader_state.py``), keyed by ``user_id`` and the content
owner ``(tenant_id, project)`` plus the document stem ``doc`` and the
cross-language ``unit`` (P29.S3 *Keys*). The routes are ``server/reader_api.py``;
this module holds everything they share, plus the two hooks the content plane
calls:

* **The gate** (:class:`Gate`). Every read and write re-checks that the caller may
  read ``(tenant, project, doc)`` exactly as ``_resolve_readable_doc`` does: the
  document must exist in the content index, and the caller must be a member of the
  owner tenant or the project must be public (``_is_publicly_readable``). A miss is
  ``None`` and the route answers the one constant 404. The gate also derives what
  P29 says the server derives on every write — ``unit`` (from the book index),
  ``lang`` and the current ``version`` — so a stored ``unit`` is never trusted for
  grouping: reads use the gate's fresh one.
* **The purge** (:func:`purge_document`). Both document-delete handlers remove every
  reader's rows for the deleted document (A4: readers' notes go too). Called from
  the sync delete path through :func:`run_from_worker`, BEFORE the content delete,
  and failing closed: if the purge cannot run, nothing is deleted (a 503), so no
  deleted document ever leaves reader state behind.
* **The unit re-write** (:func:`rewrite_units`). A manifest change that binds or
  unbinds a document re-writes ``unit`` on that document's rows (S2's ``PUT``, the
  publish-time placement and S5's ``html -> native`` re-point). Best-effort: a
  failure is logged, never fails the content write, and reads stay correct because
  they derive the unit afresh.

Privacy (P29 *Privacy*): nothing here is exposed to a book's owner or org, nothing
is aggregated, metered, indexed or embedded. Every query below carries
``user_id = <caller>`` except the purge and the unit re-write, which are
content-plane hooks keyed by the document, never by a reader.
"""

from __future__ import annotations

import logging
import sqlite3
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Awaitable, Callable, Iterable
from uuid import UUID

import anyio.from_thread
from sqlalchemy import case, delete, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError

from server import config, db
from server.accounts.service import get_accounts_service
from server.accounts.types import TenantRecord
from server.persistence.engine import get_session_maker
from server.persistence.models import (
    QuizAttemptModel,
    ReaderAnnotationModel,
    ReaderBookmarkModel,
    ReaderPositionModel,
    ReaderProfileModel,
    ReviewCardModel,
)

logger = logging.getLogger(__name__)

POSITIONS = ReaderPositionModel.__table__
BOOKMARKS = ReaderBookmarkModel.__table__
ANNOTATIONS = ReaderAnnotationModel.__table__
ATTEMPTS = QuizAttemptModel.__table__
CARDS = ReviewCardModel.__table__
PROFILES = ReaderProfileModel.__table__

# The per-document tables: what a document delete purges and a unit re-write touches.
DOC_TABLES = (POSITIONS, BOOKMARKS, ANNOTATIONS, ATTEMPTS)

# P29 *Resume and progress*: the end of the chapter has been reached.
FINISHED_AT = 0.95

PROFILE_DEFAULTS = {
    "time_zone": None,
    "day_starts_at_hour": 4,
    "max_reviews_per_day": 200,
    "new_highlights_per_day": 20,
}


def utc_now() -> datetime:
    return datetime.now(UTC)


# -- keys ---------------------------------------------------------------------


def chapter_unit(book: str, key: str) -> str:
    """The unit of a chapter: shared by every language variant (P29 *Keys*)."""

    return f"c:{book}/{key}"


def doc_unit(doc: str) -> str:
    """The unit of a loose document."""

    return f"d:{doc}"


def book_unit_prefix(book: str) -> str:
    return f"c:{book}/"


def doc_of(project: str, rel_path: str) -> str:
    """The document stem ``doc`` (``<date>-<slug>``) of a rel_path in ``project``.

    The rel_path without its extension and its ``<project>/`` prefix: durable
    across a reindex, the ``html -> native`` migration and a later book binding.
    """

    stem = db.rel_path_stem(rel_path)
    prefix = f"{project}/"
    return stem[len(prefix):] if stem.startswith(prefix) else stem.rsplit("/", 1)[-1]


def unit_for(conn: sqlite3.Connection, tenant_id: str, project: str, rel_path: str) -> str:
    """Derive ``unit`` from the book index: ``c:<book>/<key>`` when bound, else ``d:<doc>``."""

    binding = db.find_chapter_binding(conn, rel_path, tenant_id)
    if binding is not None:
        return chapter_unit(binding["book"], binding["chapter_key"])
    return doc_unit(doc_of(project, rel_path))


def book_rel_paths(conn: sqlite3.Connection, tenant_id: str, project: str, book: str) -> set[str]:
    """Every rel_path a book's index currently binds (live or not)."""

    rows = conn.execute(
        "SELECT rel_path FROM chapter_variants WHERE tenant_id = ? AND project = ? AND book = ?",
        (tenant_id, project, book),
    ).fetchall()
    return {r["rel_path"] for r in rows}


# -- the readability gate -----------------------------------------------------


@dataclass(slots=True)
class DocRef:
    """A document the caller may read, with what the server derives for its rows."""

    tenant_id: UUID
    org: str  # the tenant's org slug, or its id when it has none
    project: str
    doc: str
    rel_path: str
    doc_id: int
    title: str
    format: str
    version: int  # the document's current version
    lang: str
    unit: str
    book: str | None
    chapter_key: str | None

    def public(self) -> dict[str, Any]:
        return {
            "org": self.org,
            "project": self.project,
            "doc": self.doc,
            "unit": self.unit,
            "lang": self.lang,
            "format": self.format,
            "version": self.version,
            "doc_id": self.doc_id,
            "title": self.title,
            "book": self.book,
            "chapter_key": self.chapter_key,
        }


def org_label(tenant: TenantRecord) -> str:
    return tenant.slug or str(tenant.id)


@dataclass
class Gate:
    """The per-request readability re-check, with its lookups cached.

    ``ctx_tenant_id`` is the caller's tenant (``AuthContext.tenant.id``): a member
    reads every project of it; anyone else reads a project only when it is public.
    The rule is ``_resolve_readable_doc``'s, applied to a stem instead of a row id.
    """

    conn: sqlite3.Connection
    ctx_tenant_id: UUID
    _tenants: dict[UUID, TenantRecord | None] = field(default_factory=dict)
    _public: dict[tuple[UUID, str], bool] = field(default_factory=dict)
    _docs: dict[tuple[UUID, str, str], DocRef | None] = field(default_factory=dict)

    async def tenant(self, tenant_id: UUID) -> TenantRecord | None:
        if tenant_id not in self._tenants:
            self._tenants[tenant_id] = await get_accounts_service().get_tenant(tenant_id)
        return self._tenants[tenant_id]

    async def resolve_org(self, org: str) -> TenantRecord | None:
        """An ``org`` path or body value: the org slug, or the tenant id (graph's rule)."""

        if config.database_url() is None or not org:
            return None
        try:
            tenant_id = UUID(org)
        except ValueError:
            tenant = await get_accounts_service().get_tenant_by_slug(org)
            if tenant is not None:
                self._tenants[tenant.id] = tenant
            return tenant
        return await self.tenant(tenant_id)

    async def project_readable(self, tenant_id: UUID, project: str) -> bool:
        if tenant_id == self.ctx_tenant_id:
            return True
        key = (tenant_id, project)
        if key not in self._public:
            registry = await get_accounts_service().get_project_by_name(tenant_id, project)
            self._public[key] = registry is not None and registry.visibility == "public"
        return self._public[key]

    async def doc(self, tenant_id: UUID, project: str, doc: str) -> DocRef | None:
        """The readable document ``(tenant, project, doc)``, or ``None`` (⇒ 404 / omitted)."""

        key = (tenant_id, project, doc)
        if key in self._docs:
            return self._docs[key]
        ref = await self._resolve(tenant_id, project, doc)
        self._docs[key] = ref
        return ref

    async def _resolve(self, tenant_id: UUID, project: str, doc: str) -> DocRef | None:
        if not project or not doc or "/" in doc or "/" in project:
            return None
        tid = str(tenant_id)
        matches = db.find_documents_by_stem(self.conn, f"{project}/{doc}", tenant_id=tid)
        if len(matches) != 1 or matches[0]["project"] != project:
            return None  # none, or an ambiguous two (S5 forbids it): a miss either way
        if not await self.project_readable(tenant_id, project):
            return None
        tenant = await self.tenant(tenant_id)
        if tenant is None:
            return None
        row = matches[0]
        binding = db.find_chapter_binding(self.conn, row["rel_path"], tid)
        if binding is not None:
            unit = chapter_unit(binding["book"], binding["chapter_key"])
        else:
            unit = doc_unit(doc)
        lang = row.get("lang") or (binding["lang"] if binding else None) or "en"
        return DocRef(
            tenant_id=tenant_id,
            org=org_label(tenant),
            project=project,
            doc=doc,
            rel_path=row["rel_path"],
            doc_id=int(row["id"]),
            title=row["title"],
            format=row.get("format") or "md",
            version=int(row.get("version") or 1),
            lang=lang,
            unit=unit,
            book=binding["book"] if binding else None,
            chapter_key=binding["chapter_key"] if binding else None,
        )

    async def book(self, tenant_id: UUID, project: str, book: str) -> dict | None:
        """A readable book (``db.get_book``'s shape), or ``None``."""

        found = db.get_book(self.conn, project=project, slug=book, tenant_id=str(tenant_id))
        if found is None or not await self.project_readable(tenant_id, project):
            return None
        return found


def live_book_docs(book: dict) -> list[tuple[str, str, str]]:
    """``(chapter_key, lang, doc)`` for every live variant of a ``get_book`` payload."""

    out = []
    for ch in book["chapters"]:
        for v in ch["variants"]:
            out.append((ch["key"], v["lang"], doc_of(book["project"], v["rel_path"])))
    return out


# -- serialization -------------------------------------------------------------


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


_HIDDEN = {"user_id", "tenant_id"}


def row_out(row: Any, org: str, **extra: Any) -> dict[str, Any]:
    """A stored row as JSON: ids as strings, timestamps ISO, no ``user_id``/``tenant_id``."""

    out: dict[str, Any] = {"org": org}
    for key, value in row._mapping.items():
        if key in _HIDDEN:
            continue
        if isinstance(value, datetime):
            value = value.isoformat()
        elif isinstance(value, UUID):
            value = str(value)
        out[key] = value
    out.update(extra)
    return out


# -- positions -----------------------------------------------------------------


async def upsert_position(
    user_id: UUID,
    ref: DocRef,
    *,
    version: int,
    anchor_id: str | None,
    fraction: float,
    max_fraction: float | None,
    finished: bool,
    unread: bool,
) -> Any:
    """Write one position under P29's conflict rules, atomically, and return the row.

    * The position (``version``, ``anchor_id``, ``fraction``) is last-write-wins.
    * ``max_fraction`` only grows; ``finished`` only sets (``max_fraction >= 0.95``,
      the end sentinel or Mark as finished), recording the version it happened on.
    * ``unread`` is Mark as unread, the one write that resets: state ``started``,
      ``max_fraction`` 0, the finish cleared and the position back to the top. The
      row stays.
    """

    now = utc_now()
    if unread:
        values = dict(
            anchor_id=None, fraction=0.0, max_fraction=0.0, state="started",
            finished_version=None, finished_at=None,
        )
    else:
        grown = max(fraction, max_fraction or 0.0)
        finished_now = finished or grown >= FINISHED_AT
        values = dict(
            anchor_id=anchor_id, fraction=fraction, max_fraction=grown,
            state="finished" if finished_now else "started",
            finished_version=version if finished_now else None,
            finished_at=now if finished_now else None,
        )
    ins = pg_insert(POSITIONS).values(
        user_id=user_id, tenant_id=ref.tenant_id, project=ref.project, doc=ref.doc,
        unit=ref.unit, lang=ref.lang, version=version, format=ref.format,
        started_at=now, updated_at=now, **values,
    )
    exc = ins.excluded
    if unread:
        set_ = {
            "unit": exc.unit, "lang": exc.lang, "version": exc.version, "format": exc.format,
            "anchor_id": None, "fraction": 0.0, "max_fraction": 0.0, "state": "started",
            "finished_version": None, "finished_at": None, "updated_at": exc.updated_at,
        }
    else:
        was_finished = POSITIONS.c.state == "finished"
        set_ = {
            "unit": exc.unit, "lang": exc.lang, "version": exc.version, "format": exc.format,
            "anchor_id": exc.anchor_id, "fraction": exc.fraction,
            "max_fraction": func.greatest(POSITIONS.c.max_fraction, exc.max_fraction),
            "state": case(
                (or_(was_finished, exc.state == "finished"), "finished"), else_="started"
            ),
            "finished_version": case(
                (was_finished, POSITIONS.c.finished_version), else_=exc.finished_version
            ),
            "finished_at": case((was_finished, POSITIONS.c.finished_at), else_=exc.finished_at),
            "updated_at": exc.updated_at,
        }
    stmt = ins.on_conflict_do_update(
        index_elements=[POSITIONS.c.user_id, POSITIONS.c.tenant_id, POSITIONS.c.project,
                        POSITIONS.c.doc],
        set_=set_,
    ).returning(*POSITIONS.c)
    async with get_session_maker()() as session:
        row = (await session.execute(stmt)).one()
        await session.commit()
    return row


async def positions_for_docs(
    user_id: UUID, tenant_id: UUID, project: str, docs: Iterable[str]
) -> list[Any]:
    docs = list(set(docs))
    if not docs:
        return []
    stmt = select(POSITIONS).where(
        POSITIONS.c.user_id == user_id,
        POSITIONS.c.tenant_id == tenant_id,
        POSITIONS.c.project == project,
        POSITIONS.c.doc.in_(docs),
    )
    async with get_session_maker()() as session:
        return list((await session.execute(stmt)).all())


async def recent_positions(user_id: UUID, limit: int) -> list[Any]:
    stmt = (
        select(POSITIONS)
        .where(POSITIONS.c.user_id == user_id)
        .order_by(POSITIONS.c.updated_at.desc())
        .limit(limit)
    )
    async with get_session_maker()() as session:
        return list((await session.execute(stmt)).all())


# -- per-row entities (bookmarks, annotations) --------------------------------


async def create_row(table, values: dict[str, Any]) -> tuple[Any | None, bool]:
    """Insert a client-id row idempotently: ``(row, created)``.

    A retry with an id the caller already owns returns that row (``created`` False).
    An id that belongs to another user, or a retry naming another document, is
    ``(None, False)`` — the route's constant 404.
    """

    stmt = (
        pg_insert(table).values(**values)
        .on_conflict_do_nothing(index_elements=[table.c.id])
        .returning(*table.c)
    )
    async with get_session_maker()() as session:
        row = (await session.execute(stmt)).one_or_none()
        await session.commit()
        if row is not None:
            return row, True
        existing = (
            await session.execute(
                select(table).where(table.c.id == values["id"], table.c.user_id == values["user_id"])
            )
        ).one_or_none()
    if existing is None:
        return None, False
    same_doc = all(
        getattr(existing, k) == values[k] for k in ("tenant_id", "project", "doc")
    )
    return (existing, False) if same_doc else (None, False)


async def get_owned(table, row_id: UUID, user_id: UUID) -> Any | None:
    """One row by id, ONLY when the caller owns it (another user's id ⇒ ``None``)."""

    async with get_session_maker()() as session:
        return (
            await session.execute(
                select(table).where(table.c.id == row_id, table.c.user_id == user_id)
            )
        ).one_or_none()


async def update_owned(table, row_id: UUID, user_id: UUID, values: dict[str, Any]) -> Any | None:
    stmt = (
        update(table)
        .where(table.c.id == row_id, table.c.user_id == user_id)
        .values(**values, updated_at=utc_now())
        .returning(*table.c)
    )
    async with get_session_maker()() as session:
        row = (await session.execute(stmt)).one_or_none()
        await session.commit()
    return row


async def delete_owned(table, row_id: UUID, user_id: UUID) -> bool:
    stmt = delete(table).where(table.c.id == row_id, table.c.user_id == user_id)
    async with get_session_maker()() as session:
        result = await session.execute(stmt)
        await session.commit()
    return result.rowcount > 0


async def rows_for_docs(
    table, user_id: UUID, tenant_id: UUID, project: str, docs: Iterable[str]
) -> list[Any]:
    docs = list(set(docs))
    if not docs:
        return []
    stmt = (
        select(table)
        .where(
            table.c.user_id == user_id,
            table.c.tenant_id == tenant_id,
            table.c.project == project,
            table.c.doc.in_(docs),
        )
        .order_by(table.c.created_at, table.c.id)
    )
    async with get_session_maker()() as session:
        return list((await session.execute(stmt)).all())


async def count_marks(user_id: UUID, tenant_id: UUID, project: str, docs: Iterable[str]) -> int:
    """Bookmarks + annotations on ``docs`` (the book page's "33 bookmarks, highlights and notes")."""

    docs = list(set(docs))
    if not docs:
        return 0
    total = 0
    async with get_session_maker()() as session:
        for table in (BOOKMARKS, ANNOTATIONS):
            total += (
                await session.execute(
                    select(func.count()).select_from(table).where(
                        table.c.user_id == user_id,
                        table.c.tenant_id == tenant_id,
                        table.c.project == project,
                        table.c.doc.in_(docs),
                    )
                )
            ).scalar_one()
    return total


# -- quiz attempts ---------------------------------------------------------------


async def record_attempt(values: dict[str, Any]) -> tuple[Any | None, bool]:
    """Append one attempt, numbered by the server: ``(row, created)``.

    ``attempt`` is ``max + 1`` per ``(user, tenant, project, unit, item_id)``, in any
    language and on any version; the unique constraint turns a racing duplicate
    number into a retry. A retried id the caller owns returns its row (idempotent);
    another user's id is ``(None, False)``.
    """

    for _ in range(5):
        async with get_session_maker()() as session:
            existing = (
                await session.execute(select(ATTEMPTS).where(ATTEMPTS.c.id == values["id"]))
            ).one_or_none()
            if existing is not None:
                if existing.user_id != values["user_id"] or (
                    existing.tenant_id, existing.project, existing.doc
                ) != (values["tenant_id"], values["project"], values["doc"]):
                    return None, False
                return existing, False
            latest = (
                await session.execute(
                    select(func.coalesce(func.max(ATTEMPTS.c.attempt), 0)).where(
                        ATTEMPTS.c.user_id == values["user_id"],
                        ATTEMPTS.c.tenant_id == values["tenant_id"],
                        ATTEMPTS.c.project == values["project"],
                        ATTEMPTS.c.unit == values["unit"],
                        ATTEMPTS.c.item_id == values["item_id"],
                    )
                )
            ).scalar_one()
            try:
                row = (
                    await session.execute(
                        pg_insert(ATTEMPTS)
                        .values(**values, attempt=latest + 1, created_at=utc_now())
                        .returning(*ATTEMPTS.c)
                    )
                ).one()
                await session.commit()
                return row, True
            except IntegrityError:
                await session.rollback()  # a racing attempt took the number (or the id)
    raise RuntimeError("could not number the quiz attempt")


async def latest_attempts(user_id: UUID, tenant_id: UUID, project: str, unit: str) -> list[Any]:
    """The latest attempt per ``(block_id, item_id)`` of a unit, in any language/version."""

    stmt = (
        select(ATTEMPTS)
        .where(
            ATTEMPTS.c.user_id == user_id,
            ATTEMPTS.c.tenant_id == tenant_id,
            ATTEMPTS.c.project == project,
            ATTEMPTS.c.unit == unit,
        )
        .distinct(ATTEMPTS.c.block_id, ATTEMPTS.c.item_id)
        .order_by(ATTEMPTS.c.block_id, ATTEMPTS.c.item_id, ATTEMPTS.c.attempt.desc())
    )
    async with get_session_maker()() as session:
        return list((await session.execute(stmt)).all())


# -- profile -------------------------------------------------------------------


async def get_profile(user_id: UUID) -> dict[str, Any]:
    async with get_session_maker()() as session:
        row = (
            await session.execute(select(PROFILES).where(PROFILES.c.user_id == user_id))
        ).one_or_none()
    if row is None:
        return {**PROFILE_DEFAULTS, "updated_at": None}
    return {
        "time_zone": row.time_zone,
        "day_starts_at_hour": row.day_starts_at_hour,
        "max_reviews_per_day": row.max_reviews_per_day,
        "new_highlights_per_day": row.new_highlights_per_day,
        "updated_at": _iso(row.updated_at),
    }


async def patch_profile(user_id: UUID, changes: dict[str, Any]) -> dict[str, Any]:
    now = utc_now()
    ins = pg_insert(PROFILES).values(user_id=user_id, updated_at=now, **changes)
    stmt = ins.on_conflict_do_update(
        index_elements=[PROFILES.c.user_id],
        set_={**{k: getattr(ins.excluded, k) for k in changes}, "updated_at": now},
    )
    async with get_session_maker()() as session:
        await session.execute(stmt)
        await session.commit()
    return await get_profile(user_id)


# -- clearing (the reader's own) -------------------------------------------------


async def clear_all(user_id: UUID) -> dict[str, int]:
    """Clear ALL of a reader's state — hidden rows included; the profile stays.

    "Clear all reading data" keeps the review settings (06-library §8); review logs
    go with their cards (FK cascade).
    """

    removed: dict[str, int] = {}
    async with get_session_maker()() as session:
        for table in (*DOC_TABLES, CARDS):
            result = await session.execute(delete(table).where(table.c.user_id == user_id))
            removed[table.name] = result.rowcount
        await session.commit()
    return removed


async def clear_book(
    user_id: UUID, tenant_id: UUID, project: str, book: str, docs: Iterable[str]
) -> dict[str, int]:
    """Clear one book's state for one reader (07-book-page §7).

    Removes the rows of every document the book binds now, and every row whose
    stored unit is one of the book's chapters, plus the review cards from its
    chapters. Every other book, and the profile, stay.
    """

    docs = list(set(docs))
    prefix = book_unit_prefix(book)
    removed: dict[str, int] = {}
    async with get_session_maker()() as session:
        for table in DOC_TABLES:
            in_book = table.c.unit.startswith(prefix, autoescape=True)
            if docs:
                in_book = or_(in_book, table.c.doc.in_(docs))
            result = await session.execute(
                delete(table).where(
                    table.c.user_id == user_id,
                    table.c.tenant_id == tenant_id,
                    table.c.project == project,
                    in_book,
                )
            )
            removed[table.name] = result.rowcount
        result = await session.execute(
            delete(CARDS).where(
                CARDS.c.user_id == user_id,
                CARDS.c.tenant_id == tenant_id,
                CARDS.c.project == project,
                CARDS.c.unit.startswith(prefix, autoescape=True),
            )
        )
        removed[CARDS.name] = result.rowcount
        await session.commit()
    return removed


# -- anchors (P30.S9) --------------------------------------------------------------------


@dataclass
class SectionCache:
    """Per-request: each ``(document, version)``'s section projection, parsed once.

    ``get`` returns ``[{"id", "text"}]`` for a native version, and ``None`` when
    the version is not native (a legacy or md body has no sections to anchor in),
    its archived row is missing, or its stored source no longer parses. ``None``
    means "do not resolve": the caller reports the stored anchor and writes
    nothing, so a missing archive or a stricter future parser can never turn a
    chapter's annotations into orphans.
    """

    conn: sqlite3.Connection
    _cache: dict[tuple[str, str, int], list[dict] | None] = field(default_factory=dict)

    def get(self, ref: DocRef, version: int) -> list[dict] | None:
        key = (str(ref.tenant_id), ref.rel_path, int(version))
        if key not in self._cache:
            self._cache[key] = self._load(ref, int(version))
        return self._cache[key]

    def order(self, ref: DocRef, version: int) -> list[str]:
        return [s["id"] for s in self.get(ref, version) or []]

    def _load(self, ref: DocRef, version: int) -> list[dict] | None:
        from server.native import NativeFormatError, parse_chapter, sections

        tid = str(ref.tenant_id)
        if version == ref.version:
            row = self.conn.execute(
                "SELECT format, source FROM documents WHERE id = ? AND tenant_id = ?",
                (ref.doc_id, tid),
            ).fetchone()
        else:
            row = db.get_document_version(self.conn, ref.rel_path, version, tenant_id=tid)
        if row is None or row["format"] != "native" or not row["source"]:
            return None
        try:
            return sections(parse_chapter(row["source"]).tree)
        except NativeFormatError:
            logger.warning(
                "anchors: stored source no longer parses tenant=%s rel_path=%s v=%s",
                tid, ref.rel_path, version,
            )
            return None


async def write_back_anchors(user_id: UUID, updates: Iterable[tuple[UUID, str, int, int]]) -> int:
    """Write re-anchoring results back: ``(id, anchor_status, anchored_version, target)``.

    Only the caller's own rows (``user_id``), only the two status columns (the
    captured ``block_id``/``quote``, the note and ``updated_at`` are never touched),
    only when something changes, and never over a result computed against a newer
    version (``anchored_version <= target``). A row deleted meanwhile simply
    matches nothing: this never inserts, deletes or resurrects. Idempotent.
    """

    changed = 0
    updates = list(updates)
    if not updates:
        return 0
    async with get_session_maker()() as session:
        for row_id, status, anchored_version, target in updates:
            result = await session.execute(
                update(ANNOTATIONS)
                .where(
                    ANNOTATIONS.c.id == row_id,
                    ANNOTATIONS.c.user_id == user_id,
                    ANNOTATIONS.c.anchored_version <= target,
                    or_(
                        ANNOTATIONS.c.anchor_status != status,
                        ANNOTATIONS.c.anchored_version != anchored_version,
                    ),
                )
                .values(anchor_status=status, anchored_version=anchored_version)
            )
            changed += result.rowcount
        await session.commit()
    return changed


# -- content-plane hooks -----------------------------------------------------------


async def purge_document(tenant_id: UUID, project: str, doc: str) -> dict[str, int]:
    """Purge EVERY reader's state for one document, in one transaction (A4).

    The four per-document tables (annotation cards cascade with their
    annotations), plus the quiz cards of a loose document's unit, which only that
    document feeds. A chapter's quiz cards are shared by its other language
    variants and stay (S10 owns their drift).
    """

    removed: dict[str, int] = {}
    async with get_session_maker()() as session:
        for table in DOC_TABLES:
            result = await session.execute(
                delete(table).where(
                    table.c.tenant_id == tenant_id,
                    table.c.project == project,
                    table.c.doc == doc,
                )
            )
            removed[table.name] = result.rowcount
        result = await session.execute(
            delete(CARDS).where(
                CARDS.c.tenant_id == tenant_id,
                CARDS.c.project == project,
                CARDS.c.unit == doc_unit(doc),
                CARDS.c.source == "quiz",
            )
        )
        removed[CARDS.name] = result.rowcount
        await session.commit()
    logger.info(
        "reader state purged for deleted document tenant=%s project=%s doc=%s removed=%s",
        tenant_id, project, doc, removed,
    )
    return removed


async def rewrite_units(tenant_id: UUID, project: str, units: dict[str, str]) -> int:
    """Re-write ``unit`` on every reader's rows of each ``doc -> unit`` given.

    Called after a manifest binds or unbinds documents. Rows already on the right
    unit are untouched. Review cards are keyed by unit alone and are S10's.
    """

    if not units:
        return 0
    changed = 0
    async with get_session_maker()() as session:
        for doc, unit in units.items():
            for table in DOC_TABLES:
                result = await session.execute(
                    update(table)
                    .where(
                        table.c.tenant_id == tenant_id,
                        table.c.project == project,
                        table.c.doc == doc,
                        table.c.unit != unit,
                    )
                    .values(unit=unit)
                )
                changed += result.rowcount
        await session.commit()
    if changed:
        logger.info(
            "reader state unit re-written tenant=%s project=%s rows=%d", tenant_id, project, changed
        )
    return changed


def reader_state_enabled(tenant_id: UUID | str | None) -> bool:
    """Reader state exists only in tenant mode (accounts plane configured)."""

    return config.database_url() is not None and bool(tenant_id)


def run_from_worker(fn: Callable[..., Awaitable[Any]], *args: Any) -> Any:
    """Run an async reader-state call from a sync handler's worker thread.

    The content-plane write paths are sync FastAPI handlers, run by anyio in a
    worker thread; ``anyio.from_thread.run`` executes the coroutine on the app's
    event loop, where the async engine lives. Raises when called outside such a
    thread (a script, the reindex CLI); callers decide whether that is fatal.
    """

    return anyio.from_thread.run(fn, *args)


def sync_units_after_manifest(
    conn: sqlite3.Connection,
    tenant_id: str,
    project: str,
    rel_paths: Iterable[str],
) -> None:
    """The unit re-write hook for the sync write paths: best-effort, logged.

    ``rel_paths`` are the documents bound before or after the manifest change;
    each one's unit is derived afresh from the (already rebuilt) index.
    """

    if not reader_state_enabled(tenant_id):
        return
    try:
        units = {
            doc_of(project, rel): unit_for(conn, tenant_id, project, rel)
            for rel in set(rel_paths)
        }
        if units:
            run_from_worker(rewrite_units, UUID(tenant_id), project, units)
    except Exception:  # noqa: BLE001 - never fail a content write on reader state
        logger.warning(
            "reader state unit re-write failed tenant=%s project=%s", tenant_id, project,
            exc_info=True,
        )


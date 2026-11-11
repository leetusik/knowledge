"""Listen (P41-sr.B1): units, parts, the job queue and listening positions in Postgres.

The tables are ``alembic/versions/0007_listen.py`` (models in
``server/persistence/models.py``). The routes are ``server/listen_api.py``; this
module holds every query, so each state transition lives in one place:

* **Units and parts** (:func:`ensure_unit`). A unit row is created with its parts
  in one transaction; a part whose key is already made in the tenant (and whose
  file is on disk) is made at once, so an unchanged part never gets a job. A unit
  whose stored part keys no longer match the document's manifest (a changed read
  rule, a deleted and re-created document) is replaced.
* **The queue.** :func:`enqueue` adds one job per unmade part key, in reading
  order, as ``priority = base + ordinal`` where ``base`` falls with the clock, so the
  newest Listen's parts come first. At most one job per key is live (``queued`` or
  ``leased``) per tenant (partial unique index ``uq_listen_jobs_live_key``); a later
  Listen covering a live job only lowers its priority. :func:`claim` picks the
  lowest priority, then the oldest, among queued jobs and leased jobs whose lease
  has expired, in one transaction with ``FOR UPDATE SKIP LOCKED``: two runners never
  get the same job, and an expired lease (the Mac slept) is claimable again with no
  reaper. Every claim counts as an attempt; an expired job that has used up its
  attempts is failed by the next claim instead of handed out.
* **Finish and fail.** :func:`finish` records the made part on every part row with
  that key (so every unit sharing it moves), recounts those units and sets a unit
  ``made`` when all its parts are. A part's ``seconds`` is measured from its stored
  bytes (``server/listen_mp4.py``, P41-sr.B2), the same figure the playlist adds up;
  the runner's own seconds stand in only for a file that does not index.
  :func:`fail` re-queues the job until its attempts reach
  ``config.listen_max_attempts``; then the job and every unit waiting on its key are
  ``failed`` with the runner's message.
* **Positions** (:func:`upsert_position`): one row per user and Listen, last write
  wins; ``speed`` and ``follow`` ride on each row and the user's newest row is the
  preference a new Listen starts with.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Iterable, Optional, Sequence
from uuid import UUID

from sqlalchemy import and_, delete, func, or_, select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from server import config
from server import listen as store
from server import listen_mp4 as mp4
from server.persistence.engine import get_session_maker
from server.persistence.models import (
    ListenJobModel,
    ListenPartModel,
    ListenPositionModel,
    ListenRunnerModel,
    ListenUnitModel,
)

UNITS = ListenUnitModel.__table__
PARTS = ListenPartModel.__table__
JOBS = ListenJobModel.__table__
RUNNERS = ListenRunnerModel.__table__
POSITIONS = ListenPositionModel.__table__

LIVE = ("queued", "leased")
_LIVE_WHERE = text("state IN ('queued', 'leased')")
ERROR_MAX = 2000
_CLAIM_SCAN = 50  # already-made jobs a single claim may retire before giving up


class JobNotFound(Exception):
    """No such job for this tenant (the route's 404)."""


class JobConflict(Exception):
    """The job is not this caller's live lease, or not in a state for this call (409)."""


def utc_now() -> datetime:
    return datetime.now(UTC)


def _session():
    return get_session_maker()()


def new_session():
    """A fresh session, for a caller running several steps here in one transaction."""

    return _session()


# --- runners ------------------------------------------------------------------------


async def touch_runner(tenant_id: UUID, credential_id: UUID, now: Optional[datetime] = None) -> None:
    """Record that a runner credential called (every runner route does)."""

    now = now or utc_now()
    ins = pg_insert(RUNNERS).values(
        tenant_id=tenant_id, credential_id=credential_id, last_seen=now
    )
    stmt = ins.on_conflict_do_update(
        index_elements=[RUNNERS.c.tenant_id, RUNNERS.c.credential_id],
        set_={"last_seen": func.greatest(RUNNERS.c.last_seen, ins.excluded.last_seen)},
    )
    async with _session() as session:
        await session.execute(stmt)
        await session.commit()


async def runner_last_seen(tenant_id: UUID) -> Optional[datetime]:
    stmt = select(func.max(RUNNERS.c.last_seen)).where(RUNNERS.c.tenant_id == tenant_id)
    async with _session() as session:
        return (await session.execute(stmt)).scalar_one_or_none()


# --- units and parts ------------------------------------------------------------------


def _identity(tenant_id: UUID, project: str, doc: str, version: int, lang: str,
              voice: str, profile: str):
    return and_(
        UNITS.c.tenant_id == tenant_id,
        UNITS.c.project == project,
        UNITS.c.doc == doc,
        UNITS.c.version == version,
        UNITS.c.lang == lang,
        UNITS.c.voice == voice,
        UNITS.c.profile == profile,
    )


async def _made_by_key(session, tenant_id: UUID, keys: Sequence[str], root) -> dict[str, Any]:
    """``{key: made part row}`` for keys already made in the tenant, file on disk."""

    if not keys:
        return {}
    stmt = (
        select(PARTS)
        .where(
            PARTS.c.tenant_id == tenant_id,
            PARTS.c.part_key.in_(list(set(keys))),
            PARTS.c.made_at.is_not(None),
        )
        .order_by(PARTS.c.made_at)
    )
    out: dict[str, Any] = {}
    for row in (await session.execute(stmt)).all():
        if row.part_key in out or root is None or not row.file:
            continue
        path = store.audio_path(root, row.file)
        if path is not None and path.is_file():
            out[row.part_key] = row
    return out


async def _stored_keys(session, unit_id: UUID) -> list[str]:
    stmt = select(PARTS.c.part_key).where(PARTS.c.unit_id == unit_id).order_by(PARTS.c.idx)
    return [r.part_key for r in (await session.execute(stmt)).all()]


async def ensure_unit(
    session,
    *,
    tenant_id: UUID,
    project: str,
    doc: str,
    version: int,
    lang: str,
    manifest: Optional[store.Manifest],
    root,
    now: datetime,
) -> Any:
    """The unit for one document version, created (with its parts) when absent.

    ``manifest`` is ``None`` when the version cannot be read aloud: the unit is then
    stored ``failed`` with ``failure_kind = 'unreadable'`` and no parts, unless a unit
    with parts already exists (what was made stays playable). An existing unit whose
    part keys differ from ``manifest`` is replaced. Runs inside the caller's
    transaction.
    """

    voice, profile = config.listen_voice(), config.listen_profile()
    if manifest is not None:
        voice, profile = manifest.voice, manifest.profile
    ident = _identity(tenant_id, project, doc, version, lang, voice, profile)
    existing = (await session.execute(select(UNITS).where(ident))).first()
    if existing is not None:
        if manifest is None:
            return existing
        if existing.part_count == len(manifest.parts) and (
            await _stored_keys(session, existing.id)
        ) == manifest.keys:
            return existing

    reuse = await _made_by_key(session, tenant_id, manifest.keys if manifest else [], root)
    if existing is not None:
        await session.execute(delete(UNITS).where(UNITS.c.id == existing.id))

    parts = manifest.parts if manifest is not None else []
    made = [p for p in parts if p.key in reuse]
    made_seconds = sum(float(reuse[p.key].seconds or 0.0) for p in made)
    total = sum(float(reuse[p.key].seconds or 0.0) if p.key in reuse else p.est_seconds for p in parts)
    if manifest is None:
        state, failure_kind, failure = "failed", "unreadable", "nothing to read aloud"
    elif len(made) == len(parts):
        state, failure_kind, failure = "made", None, None
    else:
        state, failure_kind, failure = "making", None, None
    unit_id = uuid.uuid4()
    ins = (
        pg_insert(UNITS)
        .values(
            id=unit_id, tenant_id=tenant_id, project=project, doc=doc, version=version,
            lang=lang, voice=voice, profile=profile, state=state, part_count=len(parts),
            parts_made=len(made), made_seconds=made_seconds, total_seconds=total,
            chars=sum(p.chars for p in parts), failure=failure, failure_kind=failure_kind,
            created_at=now, updated_at=now,
        )
        .on_conflict_do_nothing(constraint="uq_listen_units_identity")
        .returning(*UNITS.c)
    )
    row = (await session.execute(ins)).first()
    if row is None:  # a concurrent start created it first
        return (await session.execute(select(UNITS).where(ident))).one()
    if parts:
        values = []
        for p in parts:
            r = reuse.get(p.key)
            values.append(dict(
                unit_id=unit_id, idx=p.index, tenant_id=tenant_id, part_key=p.key,
                seg_first=p.first, seg_last=p.last, seg_hashes=p.hashes, segments=p.segments,
                chars=p.chars, est_seconds=p.est_seconds,
                file=r.file if r is not None else None,
                bytes=r.bytes if r is not None else None,
                seconds=r.seconds if r is not None else None,
                segment_seconds=r.segment_seconds if r is not None else None,
                made_at=now if r is not None else None,
            ))
        await session.execute(pg_insert(PARTS).values(values))
    return row


async def retry_unit(session, unit_id: UUID, now: datetime) -> None:
    """Try again: a voice-failed unit goes back to ``making`` (its unmade parts get
    new jobs from the caller's :func:`enqueue`)."""

    await session.execute(
        update(UNITS)
        .where(UNITS.c.id == unit_id, UNITS.c.state == "failed",
               or_(UNITS.c.failure_kind.is_(None), UNITS.c.failure_kind != "unreadable"))
        .values(state="making", failure=None, failure_kind=None, failure_part=None,
                updated_at=now)
    )


async def unmade_parts(session, unit_id: UUID) -> list[Any]:
    stmt = (
        select(PARTS.c.unit_id, PARTS.c.idx, PARTS.c.part_key)
        .where(PARTS.c.unit_id == unit_id, PARTS.c.made_at.is_(None))
        .order_by(PARTS.c.idx)
    )
    return list((await session.execute(stmt)).all())


async def enqueue(session, tenant_id: UUID, parts_in_order: Iterable[Any], now: datetime) -> int:
    """One job per unmade part key, in the given reading order; returns how many
    rows were inserted or re-prioritised. Runs inside the caller's transaction."""

    base = -int(now.timestamp() * 1000) * 100_000
    count = 0
    seen: set[str] = set()
    for ordinal, part in enumerate(parts_in_order):
        if part.part_key in seen:
            continue
        seen.add(part.part_key)
        ins = pg_insert(JOBS).values(
            id=uuid.uuid4(), tenant_id=tenant_id, unit_id=part.unit_id, part_idx=part.idx,
            part_key=part.part_key, priority=base + ordinal, state="queued", attempts=0,
            created_at=now, updated_at=now,
        )
        stmt = ins.on_conflict_do_update(
            index_elements=[JOBS.c.tenant_id, JOBS.c.part_key],
            index_where=_LIVE_WHERE,
            set_={
                "priority": func.least(JOBS.c.priority, ins.excluded.priority),
                "updated_at": ins.excluded.updated_at,
            },
        )
        await session.execute(stmt)
        count += 1
    return count


async def units_for_docs(
    tenant_id: UUID, project: str, docs: Iterable[str], *, voice: str, profile: str
) -> list[Any]:
    docs = list(set(docs))
    if not docs:
        return []
    stmt = select(UNITS).where(
        UNITS.c.tenant_id == tenant_id,
        UNITS.c.project == project,
        UNITS.c.doc.in_(docs),
        UNITS.c.voice == voice,
        UNITS.c.profile == profile,
    )
    async with _session() as session:
        return list((await session.execute(stmt)).all())


async def units_by_ids(unit_ids: Iterable[UUID]) -> list[Any]:
    """The unit rows for these ids (P41-sr.B2's playlist; a missing id is absent)."""

    ids = list(set(unit_ids))
    if not ids:
        return []
    async with _session() as session:
        return list((await session.execute(select(UNITS).where(UNITS.c.id.in_(ids)))).all())


async def play_parts(unit_ids: Iterable[UUID], *, segments: bool = False) -> list[Any]:
    """Every part of these units with what delivery needs (P41-sr.B2): the stored
    file and when it was made, and, for the timeline, the segments and their seconds."""

    ids = list(set(unit_ids))
    if not ids:
        return []
    cols = [PARTS.c.unit_id, PARTS.c.idx, PARTS.c.file, PARTS.c.made_at]
    if segments:
        cols += [PARTS.c.segments, PARTS.c.segment_seconds]
    stmt = select(*cols).where(PARTS.c.unit_id.in_(ids)).order_by(PARTS.c.unit_id, PARTS.c.idx)
    async with _session() as session:
        return list((await session.execute(stmt)).all())


async def unit_part(unit_id: UUID, idx: int) -> Optional[Any]:
    """One part with its unit's document identity (P41-sr.B2's part route), or ``None``."""

    stmt = (
        select(UNITS.c.tenant_id, UNITS.c.project, UNITS.c.doc, PARTS.c.file, PARTS.c.made_at)
        .select_from(PARTS.join(UNITS, PARTS.c.unit_id == UNITS.c.id))
        .where(PARTS.c.unit_id == unit_id, PARTS.c.idx == idx)
    )
    async with _session() as session:
        return (await session.execute(stmt)).first()


async def parts_for_units(unit_ids: Iterable[UUID]) -> list[Any]:
    ids = list(set(unit_ids))
    if not ids:
        return []
    stmt = (
        select(
            PARTS.c.unit_id, PARTS.c.idx, PARTS.c.part_key, PARTS.c.chars,
            PARTS.c.est_seconds, PARTS.c.seconds, PARTS.c.made_at,
        )
        .where(PARTS.c.unit_id.in_(ids))
        .order_by(PARTS.c.unit_id, PARTS.c.idx)
    )
    async with _session() as session:
        return list((await session.execute(stmt)).all())


# --- made, failed ------------------------------------------------------------------


async def _recount(session, unit_ids: Iterable[UUID], now: datetime) -> None:
    """Re-derive each unit's counts from its parts; ``made`` when every part is."""

    for unit_id in set(unit_ids):
        agg = (
            await session.execute(
                select(
                    func.count(),
                    func.count(PARTS.c.made_at),
                    func.coalesce(
                        func.sum(PARTS.c.seconds).filter(PARTS.c.made_at.is_not(None)), 0.0
                    ),
                    func.coalesce(
                        func.sum(
                            func.coalesce(PARTS.c.seconds, PARTS.c.est_seconds)
                        ),
                        0.0,
                    ),
                ).where(PARTS.c.unit_id == unit_id)
            )
        ).one()
        total_parts, made, made_seconds, total = int(agg[0]), int(agg[1]), float(agg[2]), float(agg[3])
        values: dict[str, Any] = dict(
            parts_made=made, made_seconds=made_seconds, total_seconds=total, updated_at=now
        )
        if total_parts > 0 and made == total_parts:
            values.update(state="made", failure=None, failure_kind=None, failure_part=None,
                          total_seconds=made_seconds)
        await session.execute(update(UNITS).where(UNITS.c.id == unit_id).values(**values))


async def _mark_key_made(
    session, tenant_id: UUID, key: str, *, file: str, size: int, seconds: float,
    segment_seconds: Optional[list[float]], now: datetime,
) -> list[UUID]:
    rows = await session.execute(
        update(PARTS)
        .where(PARTS.c.tenant_id == tenant_id, PARTS.c.part_key == key, PARTS.c.made_at.is_(None))
        .values(file=file, bytes=size, seconds=seconds, segment_seconds=segment_seconds, made_at=now)
        .returning(PARTS.c.unit_id)
    )
    unit_ids = [r.unit_id for r in rows.all()]
    await _recount(session, unit_ids, now)
    return unit_ids


async def _fail_units(session, tenant_id: UUID, key: str, message: str, now: datetime) -> None:
    """Fail every unit still waiting on ``key``, noting where (``failure_part``)."""

    waiting = and_(
        PARTS.c.tenant_id == tenant_id, PARTS.c.part_key == key, PARTS.c.made_at.is_(None)
    )
    at = (
        select(func.min(PARTS.c.idx))
        .where(waiting, PARTS.c.unit_id == UNITS.c.id)
        .scalar_subquery()
    )
    await session.execute(
        update(UNITS)
        .where(UNITS.c.id.in_(select(PARTS.c.unit_id).where(waiting)), UNITS.c.state != "made")
        .values(state="failed", failure=message, failure_kind="voice", failure_part=at,
                updated_at=now)
    )


# --- the runner's calls ----------------------------------------------------------------


async def claim(tenant_id: UUID, credential_id: UUID, *, root, now: Optional[datetime] = None
                ) -> Optional[dict[str, Any]]:
    """Lease the next job for the tenant's runner, or ``None`` (the route's 204)."""

    now = now or utc_now()
    lease = timedelta(seconds=config.listen_lease_s())
    max_attempts = config.listen_max_attempts()
    async with _session() as session, session.begin():
        # An expired lease whose attempts are used up fails instead of going out again.
        spent = (
            select(JOBS.c.id)
            .where(
                JOBS.c.tenant_id == tenant_id,
                JOBS.c.state == "leased",
                JOBS.c.lease_until < now,
                JOBS.c.attempts >= max_attempts,
            )
            .with_for_update(skip_locked=True)
        )
        for row in (
            await session.execute(
                update(JOBS)
                .where(JOBS.c.id.in_(spent))
                .values(
                    state="failed", lease_until=None,
                    last_error=func.coalesce(JOBS.c.last_error, "the runner stopped renewing its lease"),
                    updated_at=now,
                )
                .returning(JOBS.c.part_key, JOBS.c.last_error)
            )
        ).all():
            await _fail_units(session, tenant_id, row.part_key, row.last_error, now)

        for _ in range(_CLAIM_SCAN):
            job = (
                await session.execute(
                    select(JOBS)
                    .where(
                        JOBS.c.tenant_id == tenant_id,
                        or_(
                            JOBS.c.state == "queued",
                            and_(
                                JOBS.c.state == "leased",
                                JOBS.c.lease_until < now,
                                JOBS.c.attempts < max_attempts,
                            ),
                        ),
                    )
                    .order_by(JOBS.c.priority, JOBS.c.created_at)
                    .limit(1)
                    .with_for_update(skip_locked=True)
                )
            ).first()
            if job is None:
                return None
            made = (await _made_by_key(session, tenant_id, [job.part_key], root)).get(job.part_key)
            if made is not None:
                # Made meanwhile under another job: retire this one, move its units.
                await session.execute(
                    update(JOBS).where(JOBS.c.id == job.id)
                    .values(state="done", lease_until=None, updated_at=now)
                )
                await _mark_key_made(
                    session, tenant_id, job.part_key, file=made.file, size=made.bytes,
                    seconds=made.seconds, segment_seconds=made.segment_seconds, now=now,
                )
                continue
            leased = (
                await session.execute(
                    update(JOBS)
                    .where(JOBS.c.id == job.id)
                    .values(
                        state="leased", lease_until=now + lease, leased_by=credential_id,
                        attempts=JOBS.c.attempts + 1, file=None, bytes=None, seconds=None,
                        updated_at=now,
                    )
                    .returning(JOBS.c.lease_until, JOBS.c.attempts)
                )
            ).one()
            part = (
                await session.execute(
                    select(PARTS).where(PARTS.c.unit_id == job.unit_id, PARTS.c.idx == job.part_idx)
                )
            ).one()
            unit = (await session.execute(select(UNITS).where(UNITS.c.id == job.unit_id))).one()
            return {
                "job": str(job.id),
                "part_key": job.part_key,
                "lang": unit.lang,
                "voice": unit.voice,
                "profile": unit.profile,
                "segments": [{"text": s["text"]} for s in part.segments],
                "est_seconds": part.est_seconds,
                "attempt": leased.attempts,
                "max_attempts": max_attempts,
                "lease_seconds": int(lease.total_seconds()),
                "lease_until": leased.lease_until.isoformat(),
            }
        return None


async def _held_job(session, tenant_id: UUID, job_id: UUID):
    job = (
        await session.execute(
            select(JOBS).where(JOBS.c.id == job_id, JOBS.c.tenant_id == tenant_id).with_for_update()
        )
    ).first()
    if job is None:
        raise JobNotFound()
    return job


async def heartbeat(tenant_id: UUID, credential_id: UUID, job_id: UUID,
                    now: Optional[datetime] = None) -> datetime:
    """Extend a live lease held by this credential; else :class:`JobConflict`."""

    now = now or utc_now()
    lease = timedelta(seconds=config.listen_lease_s())
    async with _session() as session, session.begin():
        job = await _held_job(session, tenant_id, job_id)
        if not (
            job.state == "leased"
            and job.leased_by == credential_id
            and job.lease_until is not None
            and job.lease_until > now
        ):
            raise JobConflict("not your live lease")
        until = now + lease
        await session.execute(
            update(JOBS).where(JOBS.c.id == job.id).values(lease_until=until, updated_at=now)
        )
        return until


async def live_lease_for_key(tenant_id: UUID, credential_id: UUID, key: str,
                             now: Optional[datetime] = None) -> Optional[UUID]:
    """The id of this credential's live lease on a job for ``key``, or ``None``."""

    now = now or utc_now()
    stmt = select(JOBS.c.id).where(
        JOBS.c.tenant_id == tenant_id,
        JOBS.c.part_key == key,
        JOBS.c.state == "leased",
        JOBS.c.leased_by == credential_id,
        JOBS.c.lease_until > now,
    )
    async with _session() as session:
        return (await session.execute(stmt)).scalar_one_or_none()


async def record_upload(job_id: UUID, *, file: str, size: int, seconds: Optional[float],
                        now: Optional[datetime] = None) -> None:
    now = now or utc_now()
    async with _session() as session, session.begin():
        await session.execute(
            update(JOBS).where(JOBS.c.id == job_id)
            .values(file=file, bytes=size, seconds=seconds, updated_at=now)
        )


async def finish(
    tenant_id: UUID, credential_id: UUID, job_id: UUID, *, root,
    seconds: Optional[float], segment_seconds: Optional[list[float]],
    now: Optional[datetime] = None,
) -> dict[str, Any]:
    """Record the made part and close the job (idempotent once ``done``)."""

    now = now or utc_now()
    async with _session() as session, session.begin():
        job = await _held_job(session, tenant_id, job_id)
        if job.state == "done":
            return await _finish_out(session, job)
        if job.state != "leased" or job.leased_by != credential_id:
            raise JobConflict("not your lease")
        file = job.file or (store.find_part_file(root, job.part_key) if root is not None else None)
        path = store.audio_path(root, file) if (root is not None and file) else None
        if path is None or not path.is_file():
            raise JobConflict("upload the part before finishing it")
        size = job.bytes if job.bytes is not None else path.stat().st_size
        # P41-sr.B2: the stored bytes measure the part (the playlist's EXTINF sum), so
        # the runner's own figure only stands in for a file that does not index.
        try:
            measured: Optional[float] = mp4.index_file(path).seconds
        except (OSError, mp4.PackagingError):
            measured = None
        if measured is not None:
            seconds = measured
        else:
            seconds = seconds if seconds is not None else job.seconds
        if seconds is None:
            raise ValueError("seconds is required (in the finish body or the upload header)")
        part = (
            await session.execute(
                select(PARTS.c.segments).where(PARTS.c.unit_id == job.unit_id, PARTS.c.idx == job.part_idx)
            )
        ).one()
        if segment_seconds is not None and len(segment_seconds) != len(part.segments):
            raise ValueError(
                f"segment_seconds has {len(segment_seconds)} values; the part has "
                f"{len(part.segments)} segments"
            )
        await session.execute(
            update(JOBS).where(JOBS.c.id == job.id)
            .values(state="done", lease_until=None, file=file, bytes=size, seconds=seconds,
                    updated_at=now)
        )
        await _mark_key_made(
            session, tenant_id, job.part_key, file=file, size=size, seconds=seconds,
            segment_seconds=segment_seconds, now=now,
        )
        job = (await session.execute(select(JOBS).where(JOBS.c.id == job.id))).one()
        return await _finish_out(session, job)


async def _finish_out(session, job) -> dict[str, Any]:
    units = (
        await session.execute(
            select(UNITS.c.id, UNITS.c.state, UNITS.c.parts_made, UNITS.c.part_count)
            .where(UNITS.c.id.in_(
                select(PARTS.c.unit_id).where(
                    PARTS.c.tenant_id == job.tenant_id, PARTS.c.part_key == job.part_key
                )
            ))
        )
    ).all()
    return {
        "job": str(job.id),
        "state": job.state,
        "part_key": job.part_key,
        "file": job.file,
        "bytes": job.bytes,
        "seconds": job.seconds,
        "units": [
            {"unit": str(u.id), "state": u.state, "parts_made": u.parts_made, "parts": u.part_count}
            for u in units
        ],
    }


async def fail(tenant_id: UUID, credential_id: UUID, job_id: UUID, *, error: str,
               now: Optional[datetime] = None) -> dict[str, Any]:
    """Re-queue the job, or fail it (and its units) once its attempts are used up."""

    now = now or utc_now()
    max_attempts = config.listen_max_attempts()
    message = (error or "").strip()[:ERROR_MAX] or "the runner reported a failure"
    async with _session() as session, session.begin():
        job = await _held_job(session, tenant_id, job_id)
        if job.state != "leased" or job.leased_by != credential_id:
            raise JobConflict("not your lease")
        if job.attempts >= max_attempts:
            state = "failed"
            await session.execute(
                update(JOBS).where(JOBS.c.id == job.id)
                .values(state="failed", lease_until=None, last_error=message, updated_at=now)
            )
            await _fail_units(session, tenant_id, job.part_key, message, now)
        else:
            state = "queued"
            await session.execute(
                update(JOBS).where(JOBS.c.id == job.id)
                .values(state="queued", lease_until=None, leased_by=None, last_error=message,
                        file=None, bytes=None, seconds=None, updated_at=now)
            )
        return {"job": str(job.id), "state": state, "attempts": job.attempts,
                "max_attempts": max_attempts}


# --- positions ------------------------------------------------------------------------


def _position_key(user_id: UUID, tenant_id: UUID, kind: str, project: str, item: str,
                  from_chapter: str):
    return and_(
        POSITIONS.c.user_id == user_id,
        POSITIONS.c.tenant_id == tenant_id,
        POSITIONS.c.kind == kind,
        POSITIONS.c.project == project,
        POSITIONS.c.item == item,
        POSITIONS.c.from_chapter == from_chapter,
    )


async def get_position(user_id: UUID, tenant_id: UUID, kind: str, project: str, item: str,
                       from_chapter: str) -> Optional[Any]:
    stmt = select(POSITIONS).where(
        _position_key(user_id, tenant_id, kind, project, item, from_chapter)
    )
    async with _session() as session:
        return (await session.execute(stmt)).first()


async def latest_position(user_id: UUID, *, tenant_id: Optional[UUID] = None,
                          kind: Optional[str] = None, project: Optional[str] = None,
                          item: Optional[str] = None) -> Optional[Any]:
    """The user's newest row (the speed/follow preference), optionally for one item."""

    stmt = select(POSITIONS).where(POSITIONS.c.user_id == user_id)
    if tenant_id is not None:
        stmt = stmt.where(
            POSITIONS.c.tenant_id == tenant_id, POSITIONS.c.kind == kind,
            POSITIONS.c.project == project, POSITIONS.c.item == item,
        )
    stmt = stmt.order_by(POSITIONS.c.updated_at.desc()).limit(1)
    async with _session() as session:
        return (await session.execute(stmt)).first()


async def upsert_position(user_id: UUID, tenant_id: UUID, kind: str, project: str, item: str,
                          from_chapter: str, values: dict[str, Any],
                          now: Optional[datetime] = None) -> Any:
    """Write one Listen's position, last write wins; ``values`` holds every column."""

    now = now or utc_now()
    ins = pg_insert(POSITIONS).values(
        user_id=user_id, tenant_id=tenant_id, kind=kind, project=project, item=item,
        from_chapter=from_chapter, updated_at=now, **values,
    )
    stmt = ins.on_conflict_do_update(
        index_elements=[POSITIONS.c.user_id, POSITIONS.c.tenant_id, POSITIONS.c.kind,
                        POSITIONS.c.project, POSITIONS.c.item, POSITIONS.c.from_chapter],
        set_={**{k: getattr(ins.excluded, k) for k in values}, "updated_at": ins.excluded.updated_at},
    ).returning(*POSITIONS.c)
    async with _session() as session:
        row = (await session.execute(stmt)).one()
        await session.commit()
    return row


async def clear_kept(session, user_id: UUID, tenant_id: UUID, kind: str, project: str,
                     item: str, from_chapter: str, now: datetime) -> None:
    await session.execute(
        update(POSITIONS)
        .where(_position_key(user_id, tenant_id, kind, project, item, from_chapter),
               POSITIONS.c.kept.is_(True))
        .values(kept=False, updated_at=now)
    )

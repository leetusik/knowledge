"""Idempotent operator/tenant/project seed for the Postgres accounts plane (P10.S6).

Run once per deployment as ``python -m server.seed`` (or, on the box, ``docker
compose exec api python -m server.seed``) AFTER ``alembic upgrade head`` and with
``DATABASE_URL`` + ``KB_OPERATOR_EMAIL`` + ``KB_OPERATOR_PASSWORD`` set. It creates:

1. the **operator user** (email = ``KB_OPERATOR_EMAIL``, argon2id password hash of
   ``KB_OPERATOR_PASSWORD``);
2. the operator's **tenant #1**. On a fresh database this is the same signup
   primitive ``/auth/signup`` uses (``provision_signup`` — a ``"default"`` org +
   ``"default"`` project, atomically), so the seed and signup never drift. On an
   existing database the operator's tenant is kept verbatim — its name is **not**
   rewritten (prod tenant #1 keeps whatever it was first seeded as);
3. a ``projects`` row for each **live ``docs/`` project**, derived from the tree by
   reindex's filename rule (never hardcoded), so the seeded project names line up
   exactly with what the content plane stamps on ``documents.project``. A
   ``"default"`` project already provisioned in step 2 is tolerated (skipped).

Why this matters (the ordering coupling): ``server.api_auth.get_tenant_one_id()``
resolves tenant #1 from ``KB_OPERATOR_EMAIL`` and **caches on first success only**.
The ``KB_API_TOKEN`` master bearer and the ``docs/`` re-stamp (boot reindex /
``POST /api/reindex``) both depend on that resolution, so the operator user + tenant
MUST exist before either is exercised. Running the seed first, then restarting the
api (its boot reindex) or hitting ``POST /api/reindex`` with the master bearer,
re-stamps every ``docs/`` row's ``documents.tenant_id`` with tenant #1's UUID — a
path-derived re-stamp, no file move.

**No ``vk_`` credential is seeded** (operator decision): the master bearer already
authenticates tenant #1, so a seeded per-project key would be redundant.

Idempotent: a second run finds the user, tenant, and every project already present
and writes nothing. Postgres-only — it never touches ``kb.sqlite3`` (the content
plane's disposable DB, rebuilt from files on boot).
"""

from __future__ import annotations

import asyncio
from pathlib import Path

from server import config
from server.accounts.security import hash_password
from server.accounts.service import DuplicateEmailError, get_accounts_service
from server.accounts.types import CreateProject, CreateUser
from server.persistence.engine import dispose_engine
from server.reindex import RESERVED_DIRS, _FILENAME_RE


def _discover_projects(docs_root: Path) -> list[str]:
    """Return the sorted distinct project names in the live ``docs/`` tree.

    Mirrors reindex's project derivation exactly (``server.reindex``): a project
    is ``Path(rel).parts[0]`` for every file whose name matches ``_FILENAME_RE``
    (``<YYYY-MM-DD>-<slug>.{md,html}``). Top-level files (``len(parts) == 1`` — e.g.
    ``index.md``) and reserved chrome dirs (``current``/``versions``) are skipped,
    so the seeded ``projects`` names line up with ``documents.project`` from a
    reindex. Today's set: ``bootstrap_agentic_workspace.sh``, ``changple5``,
    ``hi2vi``, ``hi2vi_web``. Note ``bootstrap_agentic_workspace.sh`` keeps its
    literal ``.sh`` — the project string is ``parts[0]`` verbatim (do NOT clean
    it), so it matches what the content plane derives.
    """
    if not docs_root.is_dir():
        return []
    projects: set[str] = set()
    # Both doc formats — _FILENAME_RE (widened in P16) matches `.md` and `.html`
    # alike, so an HTML-only project is discovered too. Order is irrelevant (a set).
    for path in [*docs_root.rglob("*.md"), *docs_root.rglob("*.html")]:
        if not path.is_file():
            continue
        if not _FILENAME_RE.match(path.name):
            continue
        rel = path.relative_to(docs_root)
        if len(rel.parts) == 1:
            continue  # a dated file directly at the docs/ root is never a project
        if rel.parts[0] in RESERVED_DIRS:
            continue
        projects.add(rel.parts[0])
    return sorted(projects)


async def main() -> None:
    # Fail fast with an actionable message, not a traceback, on missing config.
    database_url = config.database_url()
    if not database_url:
        raise SystemExit(
            "set DATABASE_URL (the accounts plane is unavailable — the seed writes "
            "Postgres only, e.g. postgresql+psycopg://kb:pass@host:5432/kb)"
        )
    email = config.operator_email()
    if not email:
        raise SystemExit("set KB_OPERATOR_EMAIL (the operator's signup email for tenant #1)")
    password = config.operator_password()
    if not password:
        raise SystemExit("set KB_OPERATOR_PASSWORD (the operator's password for the seeded user)")

    # Normalize the email the same way /auth/signup does (strip + lowercase) so the
    # seeded user matches what KB_OPERATOR_EMAIL resolves and what a login submits.
    email = email.strip().lower()

    service = get_accounts_service()
    try:
        # 1. Operator user (race-safe: a concurrent create -> DuplicateEmailError,
        #    which we treat as "already exists").
        user = await service.get_user_by_email(email)
        if user is None:
            try:
                user = await service.create_user(
                    CreateUser(email=email, password_hash=hash_password(password))
                )
                created_user = True
            except DuplicateEmailError:
                user = await service.get_user_by_email(email)
                created_user = False
        else:
            created_user = False
        if user is None:  # pragma: no cover - only on a torn-down DB mid-run
            raise SystemExit("failed to create or read the operator user")

        # 2. Tenant #1 = the operator's first tenant. On a FRESH database this is
        #    the same signup primitive /auth/signup uses (provision_signup): a
        #    "default" org + "default" project, atomically, so the seed and signup
        #    never drift. On an EXISTING database the operator already has a tenant,
        #    so we keep it verbatim (its name is NOT rewritten — prod tenant #1 keeps
        #    whatever it was seeded as; a "default" project is added lazily via
        #    get-or-create, or below in step 3 if it is a live docs/ project).
        tenants = await service.list_tenants_for_user(user.id)
        if not tenants:
            tenant, _member, _project = await service.provision_signup(user.id)
            created_tenant = True
        else:
            tenant = tenants[0]
            created_tenant = False

        # 3. A projects row per live docs/ project (derived from the tree, not
        #    hardcoded — matches documents.project after a reindex). The set-membership
        #    check below already tolerates a "default" project provisioned in step 2.
        existing = {p.name for p in await service.list_projects_for_tenant(tenant.id)}
        discovered = _discover_projects(config.docs_root())
        created_projects: list[str] = []
        existed_projects: list[str] = []
        for name in discovered:
            if name in existing:
                existed_projects.append(name)
                continue
            await service.create_project(CreateProject(tenant_id=tenant.id, name=name))
            created_projects.append(name)

        # Concise summary (idempotent re-run -> all "exists", empty created lists).
        print(f"user: {'created' if created_user else 'exists'} {email}")
        print(
            f"tenant #1: {'created' if created_tenant else 'exists'} "
            f"{tenant.id} \"{tenant.name}\""
        )
        print(f"projects: created={created_projects} existed={existed_projects}")
        print(f"discovered ({len(discovered)}): {discovered}")
    finally:
        # The CLI is not the app lifespan, so dispose the engine ourselves.
        await dispose_engine()


if __name__ == "__main__":
    asyncio.run(main())

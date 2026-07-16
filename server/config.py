"""Runtime configuration, read from the environment at call time.

Every setting is resolved on each call (never cached at import) so tests can
override KB_ROOT / KB_DB_PATH per-test via env vars without a module reload, and
so the container can inject config through compose `environment:`.
"""
from __future__ import annotations

import os
from pathlib import Path


def _env(name: str, default: str | None = None) -> str | None:
    """Return a non-empty env value, else the default (empty string == unset)."""
    val = os.environ.get(name)
    if val is None or val == "":
        return default
    return val


def kb_root() -> Path:
    """Repo root that holds docs/ and data/. Defaults to the current working dir."""
    return Path(_env("KB_ROOT", os.getcwd())).resolve()


def docs_root() -> Path:
    """Canonical content root: KB_ROOT/docs."""
    return kb_root() / "docs"


def db_path() -> Path:
    """SQLite path. KB_DB_PATH overrides; else KB_ROOT/data/kb.sqlite3 (disposable)."""
    override = _env("KB_DB_PATH")
    if override:
        return Path(override)
    return kb_root() / "data" / "kb.sqlite3"


def public_base_url() -> str:
    """Viewer origin used to build response `url`s (the mkdocs site, not the API)."""
    return (_env("KB_PUBLIC_BASE_URL", "http://localhost:8765") or "").rstrip("/")


def api_token() -> str | None:
    """Bearer token for the two mutating endpoints. Unset (None) == localhost-open."""
    return _env("KB_API_TOKEN")


def database_url() -> str | None:
    """Async SQLAlchemy URL for the Postgres accounts plane. Unset -> accounts dormant.

    Read per-call like every other setting. When None the accounts plane never
    creates an engine (see server/persistence/engine.py) and the content plane
    boots normally without Postgres. Expected form:
    ``postgresql+psycopg://user:pass@host:5432/db``.
    """
    return _env("DATABASE_URL")


def git_commit_enabled() -> bool:
    """Whether the write path makes a git commit. KB_GIT_COMMIT defaults to true."""
    val = _env("KB_GIT_COMMIT", "true")
    return str(val).strip().lower() not in {"0", "false", "no", "off"}


def git_push_enabled() -> bool:
    """Whether the write path pushes to origin/main after its scoped commit.

    KB_GIT_PUSH defaults to **false** — local/plugin deployments never push
    (preserves the "agent never pushes locally" convention); only the hosted box
    opts in. Note the inverted default vs git_commit_enabled: truthy-parse, so
    enabled only for an explicit {1, true, yes, on}.
    """
    val = _env("KB_GIT_PUSH", "false")
    return str(val).strip().lower() in {"1", "true", "yes", "on"}


def require_read_auth_enabled() -> bool:
    """Whether the read/search surface requires the bearer (hosted box only).

    KB_REQUIRE_READ_AUTH defaults to **false** — local/plugin reads/search stay
    open even when KB_API_TOKEN is set (a set token guards only writes locally,
    preserving the open-by-default dev + plugin UX). Only the hosted box opts in;
    then reads/search require the same bearer as writes (when a token is set).
    Note the inverted default vs the falsy-parsed flags: truthy-parse, so enabled
    only for an explicit {1, true, yes, on}.
    """
    val = _env("KB_REQUIRE_READ_AUTH", "false")
    return str(val).strip().lower() in {"1", "true", "yes", "on"}


def gemini_api_key() -> str | None:
    """Gemini credential: GOOGLE_API_KEY preferred, GEMINI_API_KEY fallback.

    None == no key == semantic search disabled (graceful BM25-only degradation).
    Mirrors changple5's AliasChoices("GOOGLE_API_KEY", "GEMINI_API_KEY").
    """
    return _env("GOOGLE_API_KEY") or _env("GEMINI_API_KEY")


def embedding_model() -> str:
    """Gemini embedding model. GEMINI_EMBEDDING_MODEL, default gemini-embedding-2-preview."""
    return _env("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2-preview")


def embeddings_enabled() -> bool:
    """True when a Gemini key is configured (semantic search participates)."""
    return gemini_api_key() is not None


def startup_reindex_enabled() -> bool:
    """Whether to run a full reindex on app startup for drift self-heal.

    KB_STARTUP_REINDEX defaults to true; falsy parsing like git_commit_enabled.
    """
    val = _env("KB_STARTUP_REINDEX", "true")
    return str(val).strip().lower() not in {"0", "false", "no", "off"}

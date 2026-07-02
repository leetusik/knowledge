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


def git_commit_enabled() -> bool:
    """Whether the write path makes a git commit. KB_GIT_COMMIT defaults to true."""
    val = _env("KB_GIT_COMMIT", "true")
    return str(val).strip().lower() not in {"0", "false", "no", "off"}

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
    """Viewer origin used to build response `url`s (not the API origin).

    Mode-aware at the save site: in tenant mode this is the web app origin (the
    save `url` becomes ``{origin}/documents/{id}``); in legacy/single-tenant mode
    it is the mkdocs site origin (the save `url` keeps the ``{project}/{date}-{slug}/``
    mkdocs shape). Already right-stripped of trailing ``/``.
    """
    return (_env("KB_PUBLIC_BASE_URL", "http://localhost:8765") or "").rstrip("/")


def api_token() -> str | None:
    """Bearer token for the two mutating endpoints. Unset (None) == localhost-open."""
    return _env("KB_API_TOKEN")


def operator_email() -> str | None:
    """Operator's signup email — pins the KB_API_TOKEN master bearer to tenant #1.

    Tenant mode only (``DATABASE_URL`` set): the resolver maps an exact
    ``KB_API_TOKEN`` bearer to the tenant owned by the user with this email
    (their first tenant = tenant #1), so the legacy hi2vi content agent keeps
    working with zero changes. Unset -> the master bearer is unresolvable in
    tenant mode.
    """
    return _env("KB_OPERATOR_EMAIL")


def operator_password() -> str | None:
    """Operator's password for the seed (`python -m server.seed`); pairs with KB_OPERATOR_EMAIL.

    Read only by the one-shot seed CLI to create the operator user with an
    argon2id-hashed password. Never read at request time; unset -> the seed fails
    fast with an actionable error (it will not create a passwordless operator).
    """
    return _env("KB_OPERATOR_PASSWORD")


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


def git_timeout_s() -> float:
    """Wall-clock cap on EVERY git subprocess (``KB_GIT_TIMEOUT_S``, default 60s).

    Load-bearing since P24: the push (fetch → rebase → push) runs on the
    after-response publish worker while holding ``WRITE_LOCK``, so an unbounded
    ``git`` — a hanging SSH connection to GitHub, say — would block every
    subsequent write in the process. A timeout surfaces as ``GitError`` (the
    subprocess is killed), which the worker logs; the local commit and the
    on-disk document are untouched and publish on the next successful push.
    Unparseable or non-positive values fall back to 60s so the cap is never off.
    """
    raw = _env("KB_GIT_TIMEOUT_S", "60")
    try:
        value = float(str(raw))
    except (TypeError, ValueError):
        return 60.0
    return value if value > 0 else 60.0


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


def auth_rate_limit() -> int:
    """Max unauthenticated ``/auth/{signup,login}`` requests per client IP per window.

    ``KB_AUTH_RATE_LIMIT`` (default **20**). Read per-call like every setting so a
    test or the E2E CLI smoke can force a low value via the env without a reload;
    ``<= 0`` disables the throttle entirely. Applies P13.S5's server-side backstop:
    the ``/auth/*`` grant surface goes public at the edge in P13, and there is no
    ``limit_req_zone`` at the edge (the ``conf.d/`` tree bans it) — so the throttle
    lives here, in-process (one uvicorn worker → one coherent counter). The counter
    is keyed per (IP, route), so signup and login are limited independently.

    Lenient by design: a legit agent re-running ``knowledge init`` a handful of
    times never trips it, while a single IP is capped on the now-public password
    grant + open signup. 20 also clears the accounts test suite's per-``testclient``
    signup count with room to spare.
    """

    raw = _env("KB_AUTH_RATE_LIMIT", "20")
    try:
        return int(str(raw))
    except (TypeError, ValueError):
        return 20


def auth_rate_window_s() -> int:
    """Fixed-window length in seconds for :func:`auth_rate_limit`.

    ``KB_AUTH_RATE_WINDOW_S`` (default **900** = 15 minutes). Read per-call; a
    non-positive or unparseable value falls back to the 900s default so the window
    is never zero-length (which would make the limiter count-per-request).
    """

    raw = _env("KB_AUTH_RATE_WINDOW_S", "900")
    try:
        value = int(str(raw))
    except (TypeError, ValueError):
        return 900
    return value if value > 0 else 900


def _env_int(name: str, default: int) -> int:
    """An integer from the env, else ``default`` (unparseable too); may be <= 0."""
    raw = _env(name)
    if raw is None:
        return default
    try:
        return int(str(raw))
    except (TypeError, ValueError):
        return default


# --- Feedback (P56-p9): capture limits, the capture limiter, the owner alert ----


def feedback_rate_limit() -> int:
    """Max ``POST /api/feedback`` requests per bucket per window
    (``KB_FEEDBACK_RATE_LIMIT``, 600): the client address for a request through the
    edge, the caller's org for one from inside the network (the Feedback MCP hop).
    ``<= 0`` turns the limiter off. Uploads have a limit of their own
    (:func:`feedback_upload_rate_limit`), counted apart."""
    return _env_int("KB_FEEDBACK_RATE_LIMIT", 600)


def feedback_upload_rate_limit() -> int:
    """Max ``POST /api/feedback/attachments`` requests per bucket per window
    (``KB_FEEDBACK_UPLOAD_RATE_LIMIT``, 60), in the same kind of bucket as captures
    (the client address through the edge, the org in-network) but counted apart
    from them. An event carries at most ten files, so an attachment-heavy client
    still fits. ``<= 0`` turns this limiter off."""
    return _env_int("KB_FEEDBACK_UPLOAD_RATE_LIMIT", 60)


def feedback_rate_window_s() -> int:
    """The Feedback limiters' fixed window in seconds (``KB_FEEDBACK_RATE_WINDOW_S``,
    60); a non-positive or unparseable value falls back to 60."""
    value = _env_int("KB_FEEDBACK_RATE_WINDOW_S", 60)
    return value if value > 0 else 60


def feedback_max_body_bytes() -> int:
    """The largest ``POST /api/feedback`` body (``KB_FEEDBACK_MAX_BODY_BYTES``, 262144 =
    256 KiB), refused with a 413 before it is parsed. Vocky had no cap of its own
    (only the edge's ``client_max_body_size``). A non-positive or unparseable value
    falls back to the default, never to "no cap"."""
    value = _env_int("KB_FEEDBACK_MAX_BODY_BYTES", 262144)
    return value if value > 0 else 262144


def feedback_attachments_max_bytes() -> int:
    """The largest attachment upload (``KB_FEEDBACK_ATTACHMENTS_MAX_BYTES``, 5 MiB)."""
    value = _env_int("KB_FEEDBACK_ATTACHMENTS_MAX_BYTES", 5 * 1024 * 1024)
    return value if value > 0 else 5 * 1024 * 1024


def feedback_attachments_max_count() -> int:
    """At most this many attachment ids per capture (``KB_FEEDBACK_ATTACHMENTS_MAX_COUNT``, 10)."""
    value = _env_int("KB_FEEDBACK_ATTACHMENTS_MAX_COUNT", 10)
    return value if value > 0 else 10


def feedback_attachments_unlinked_ttl_s() -> int:
    """How long an uploaded attachment may wait for a capture to link it
    (``KB_FEEDBACK_ATTACHMENTS_UNLINKED_TTL_S``, 86400 = one day). Each upload first
    reclaims unlinked attachments older than this, row and file, within a small
    budget. A non-positive or unparseable value falls back to the default, never to
    "reclaim at once"."""
    value = _env_int("KB_FEEDBACK_ATTACHMENTS_UNLINKED_TTL_S", 86400)
    return value if value > 0 else 86400


def feedback_attachments_unlinked_max_bytes() -> int:
    """The ceiling on the total size of unlinked attachments, all orgs together
    (``KB_FEEDBACK_ATTACHMENTS_UNLINKED_MAX_BYTES``, 1073741824 = 1 GiB). An upload
    that would take the total above it is refused with a 503 after the sweep has
    run: the hard bound on the disk unlinked uploads can take. A non-positive or
    unparseable value falls back to the default, never to "no ceiling"."""
    value = _env_int("KB_FEEDBACK_ATTACHMENTS_UNLINKED_MAX_BYTES", 1073741824)
    return value if value > 0 else 1073741824


_FEEDBACK_DEFAULT_MIME_TYPES = "image/jpeg,image/png,image/gif,image/webp"


def feedback_attachments_allowed_mime_types() -> frozenset[str]:
    """The image types an upload may be, by its magic bytes
    (``KB_FEEDBACK_ATTACHMENTS_ALLOWED_MIME_TYPES``, comma-separated; default the four
    of jpeg, png, gif and webp). The sniffer knows only those four, so a type outside
    them can never be accepted whatever this says."""
    raw = _env("KB_FEEDBACK_ATTACHMENTS_ALLOWED_MIME_TYPES", _FEEDBACK_DEFAULT_MIME_TYPES)
    values = frozenset(v.strip().lower() for v in str(raw).split(",") if v.strip())
    return values or frozenset(_FEEDBACK_DEFAULT_MIME_TYPES.split(","))


def smtp_host() -> str | None:
    """The owner alert's SMTP host (``KB_SMTP_HOST``). Unset -> alerts off."""
    return _env("KB_SMTP_HOST")


def smtp_port() -> int:
    """The SMTP port (``KB_SMTP_PORT``, 587). 465 means implicit TLS, else STARTTLS."""
    value = _env_int("KB_SMTP_PORT", 587)
    return value if value > 0 else 587


def smtp_user() -> str | None:
    """The SMTP login (``KB_SMTP_USER``); unset -> no AUTH."""
    return _env("KB_SMTP_USER")


def smtp_password() -> str | None:
    """The SMTP password (``KB_SMTP_PASSWORD``)."""
    return _env("KB_SMTP_PASSWORD")


def smtp_from() -> str | None:
    """The alert's From address (``KB_SMTP_FROM``), else the SMTP user."""
    return _env("KB_SMTP_FROM") or smtp_user()


def smtp_configured() -> bool:
    """True when the owner alert can be sent: a host and a From address are set."""
    return bool((smtp_host() or "").strip()) and bool((smtp_from() or "").strip())


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


# --- Listen (P41-sr.B1): the voice reader's units, parts and job queue ---------


def _env_number(name: str, default: float, *, integer: bool = False) -> float:
    """A positive number from the env, else ``default`` (unparseable or <= 0 too)."""
    raw = _env(name)
    if raw is None:
        return default
    try:
        value = int(raw) if integer else float(raw)
    except (TypeError, ValueError):
        return default
    return value if value > 0 else default


def listen_voice() -> str:
    """The voice every Listen unit is made in (``KB_LISTEN_VOICE``).

    Part of each unit's identity and of every segment hash, so changing it makes
    new keys (and new audio) without touching what was made before.
    """
    return _env("KB_LISTEN_VOICE", "ming3-us_emma") or "ming3-us_emma"


def listen_profile() -> str:
    """The engine and encoder profile (``KB_LISTEN_PROFILE``), part of every key.

    Names what the runner renders and encodes with; a new engine version or a new
    encoding makes new keys, so old audio is never mistaken for new.
    """
    default = "ming3-0.5b/aac-lc-48k-mono"
    return _env("KB_LISTEN_PROFILE", default) or default


def listen_part_cap_s() -> float:
    """A part's estimated speech cap in seconds (``KB_LISTEN_PART_CAP_S``, 600)."""
    return _env_number("KB_LISTEN_PART_CAP_S", 600.0)


def listen_chars_per_second(lang: str) -> float:
    """Measured speech rate used to estimate a part's length (P41-sr.R1).

    ``KB_LISTEN_CPS_KO`` (7.5) for Korean; ``KB_LISTEN_CPS_EN`` (13.4) for English
    and every other language.
    """
    if (lang or "").lower().startswith("ko"):
        return _env_number("KB_LISTEN_CPS_KO", 7.5)
    return _env_number("KB_LISTEN_CPS_EN", 13.4)


def listen_lease_s() -> int:
    """How long a claimed job is the runner's before it is claimable again
    (``KB_LISTEN_LEASE_S``, 600). A heartbeat extends it by the same amount."""
    return int(_env_number("KB_LISTEN_LEASE_S", 600, integer=True))


def listen_max_attempts() -> int:
    """Claims a job gets before a failure fails it for good (``KB_LISTEN_MAX_ATTEMPTS``, 3)."""
    return int(_env_number("KB_LISTEN_MAX_ATTEMPTS", 3, integer=True))


def listen_max_part_bytes() -> int:
    """The largest part upload accepted (``KB_LISTEN_MAX_PART_BYTES``, 16 MiB). A
    10-minute part is about 4 MB (AAC 48 kbps), and speech ran up to 19 % past its
    length estimate on production, so 4 MiB was too tight (P41-sr.X1). 16 MiB stays
    under the edge's ``client_max_body_size 20m``, and the upload is read capped."""
    return int(_env_number("KB_LISTEN_MAX_PART_BYTES", 16 * 1024 * 1024, integer=True))


def listen_poll_s() -> float:
    """The runner's poll interval (``KB_LISTEN_POLL_S``, 30). A Listen with work
    queued and no runner call within twice this reads as waiting."""
    return _env_number("KB_LISTEN_POLL_S", 30.0)


def listen_rtf() -> float:
    """The runner's real-time factor, render time over audio time (``KB_LISTEN_RTF``,
    0.45: Ming-3.0 on the Mac GPU measured 0.42, R5). Turns the audio still to make
    into the "about N min left" estimate."""
    return _env_number("KB_LISTEN_RTF", 0.45)

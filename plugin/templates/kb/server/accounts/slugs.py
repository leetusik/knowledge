"""Org-slug rules: the one place the public-namespace charset + reserved list live.

An **org slug** (``tenants.slug``) is a tenant's durable public identity — the
``{org}`` in a pretty share URL. It lives in the accounts plane (Postgres) rather
than the disposable content plane precisely because a public link must outlive a
full content reindex.

Validation is **app-layer**, not a DB ``CHECK`` — the same convention
``projects.visibility`` and ``usage_events.event_type`` already follow: the
constraint is expressed once, here, so the API error message, the service
write-guard, and any future caller cannot drift from each other.

The reserved list is a **provisioning** guard, not a routing one: pretty URLs are
namespaced under an ``@``-prefixed segment, so an org slug can never actually
shadow a top-level route. It exists so a tenant cannot claim a name that reads
like part of the product (``admin``, ``support``, ``login``, ...) or that would
be confusing if the namespace prefix ever changed.
"""

from __future__ import annotations

import re

ORG_SLUG_MIN_LENGTH = 2
ORG_SLUG_MAX_LENGTH = 40

# Same shape as the content plane's doc/tag slugs (``server.documents``): lowercase
# alphanumerics in hyphen-joined groups — no leading/trailing/double hyphen.
ORG_SLUG_PATTERN = r"^[a-z0-9]+(-[a-z0-9]+)*$"
_ORG_SLUG_RE = re.compile(ORG_SLUG_PATTERN)

# Names a tenant may not claim. Kept in ONE place and cited from the API's 422 so
# the message and the check can never disagree. Some entries (``_next``) cannot
# match the charset anyway; they stay listed so the intent survives a charset
# change.
RESERVED_ORG_SLUGS: frozenset[str] = frozenset(
    {
        "api",
        "app",
        "auth",
        "admin",
        "login",
        "logout",
        "signup",
        "dashboard",
        "documents",
        "document",
        "graph",
        "projects",
        "project",
        "search",
        "settings",
        "account",
        "healthz",
        "mcp",
        "static",
        "assets",
        "public",
        "www",
        "robots",
        "sitemap",
        "manifest",
        "favicon",
        "_next",
        "new",
        "edit",
        "null",
        "undefined",
        "me",
        "docs",
        "help",
        "support",
        "status",
        "about",
        "blog",
    }
)

# Human-readable form of the charset rule, embedded in every rejection message.
ORG_SLUG_CONSTRAINT = (
    f"{ORG_SLUG_MIN_LENGTH}-{ORG_SLUG_MAX_LENGTH} characters of lowercase letters, "
    f"digits and single inner hyphens ({ORG_SLUG_PATTERN}), and not a reserved word"
)


class InvalidOrgSlugError(ValueError):
    """Raised when a proposed org slug violates the charset/length/reserved rules.

    A ``ValueError`` subclass so a pydantic ``field_validator`` can let it bubble
    into FastAPI's standard 422 without a bespoke handler.
    """


def normalize_org_slug(value: str) -> str:
    """Return the stored form of ``value``, or raise :class:`InvalidOrgSlugError`.

    Mixed case and surrounding whitespace are **accepted on input and normalized**
    (trimmed + lowercased) — the stored and URL forms are always lowercase, so
    ``Hi2Vi`` and ``hi2vi`` are the same slug and cannot both be claimed.
    """

    if not isinstance(value, str):
        raise InvalidOrgSlugError(f"invalid org slug: must be {ORG_SLUG_CONSTRAINT}")

    candidate = value.strip().lower()

    if not (ORG_SLUG_MIN_LENGTH <= len(candidate) <= ORG_SLUG_MAX_LENGTH):
        raise InvalidOrgSlugError(
            f"invalid org slug {candidate!r}: must be {ORG_SLUG_CONSTRAINT}"
        )
    if not _ORG_SLUG_RE.match(candidate):
        raise InvalidOrgSlugError(
            f"invalid org slug {candidate!r}: must be {ORG_SLUG_CONSTRAINT}"
        )
    if candidate in RESERVED_ORG_SLUGS:
        raise InvalidOrgSlugError(
            f"org slug {candidate!r} is reserved: must be {ORG_SLUG_CONSTRAINT}"
        )

    return candidate


def is_valid_org_slug(value: str) -> bool:
    """True when ``value`` normalizes to a claimable org slug (no exception)."""

    try:
        normalize_org_slug(value)
    except InvalidOrgSlugError:
        return False
    return True

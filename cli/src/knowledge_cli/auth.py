"""Auth & onboarding — `signup`, `login`, `logout`, `whoami`, and the one-shot `init`.

`init` is the headline: it runs the whole `scripts/onboarding_smoke.py` sequence
for a real person — signup-or-login -> project -> mint a `vk_` key -> **write the
config seam** — and that last step is the payoff. The moment `api.token=vk_...`
lands in `$XDG_CONFIG_HOME/knowledge-kb/config.json`, `/knowledge:explain` starts
writing to the hosted service with zero code change.

Three rules shape every line here:

1. **A password never reaches `argv`.** There is no `--password` flag, ever: argv
   is world-readable via `ps` and lands in shell history. `--password-stdin` >
   `$KNOWLEDGE_PASSWORD` > `getpass()` on a TTY — and a hard error otherwise,
   never a prompt no one is there to answer.
2. **The `vk_` key is show-once.** `POST /app/projects/{id}/credentials`
   (`app_api.py:148-170`) returns the plaintext exactly once, ever; the server
   keeps only a sha256. It goes straight into the config file and is never
   printed, logged, or carried in an error. `config.redact_token()` is the only
   way it is ever displayed.
3. **`init` is idempotent.** `POST /app/projects` has **no uniqueness check**
   (`app_api.py:123-134`), so a blind create silently litters a tenant with
   duplicate projects on every re-run; and re-minting on every run piles up live
   credentials. Both are checked before acting, not after.

**Who writes the seam.** Only `init` writes `api.token` / `api.project` /
`site.base_url` — configuring this machine is its whole job. `signup`/`login`
persist just the session (plus `api.base_url`, so every later command knows which
service that session belongs to). Logging in must never silently repoint someone's
document API somewhere new.
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys
from typing import Any

from . import config
from .client import ApiError, KnowledgeClient
from .errors import CliError

# The hosted service. A brand-new user with no config must reach it, not
# localhost — so this differs from `config.DEFAULT_API_BASE_URL` on purpose. The
# two answer different questions: `config.resolve()` reports what an *existing*
# config says (and must mirror the plugin skill exactly, localhost default and
# all); this is the *onboarding target* for a fresh one. It lives here, beside
# `resolve_base_url()`, because `main` imports this module and so cannot be
# imported back.
DEFAULT_BASE_URL = "https://knowledge.hi2vi.com"

# The pragmatic agent path: a coding agent sets an env var more naturally than it
# pipes stdin. Deliberately *weaker* than --password-stdin (env is visible in
# /proc/<pid>/environ), so it loses to it.
ENV_PASSWORD = "KNOWLEDGE_PASSWORD"

# server/auth_api.py:54 — `password: str = Field(min_length=8)`, shared by signup
# and login. Checked here too so a short password is a sentence, not a raw 422.
MIN_PASSWORD_LEN = 8

# The project a fresh onboarding lands in: `init --project`'s default and `save`'s
# outside-a-repo fallback. It is the signup-provisioned `"default"` project (P18) —
# so a brand-new user's `init` reuses the project already made for them rather than
# minting a second one. Must satisfy server/documents.py:32
# `^[A-Za-z0-9][A-Za-z0-9._-]*$`, because writes carry this name through
# `validate_project()`.
DEFAULT_PROJECT = "default"

CREDENTIAL_NAME = "knowledge-cli"


# --- password -----------------------------------------------------------------


def read_password(args: argparse.Namespace) -> str:
    """The password, from the safest available source. Never from `argv`.

    Precedence: `--password-stdin` (the `docker login` convention) > the
    `$KNOWLEDGE_PASSWORD` env var > an interactive `getpass()` prompt. If none
    apply — no flag, no env var, and stdin is not a TTY — this raises rather than
    blocking on a prompt: an unattended agent must never see this command hang.
    """

    if getattr(args, "password_stdin", False):
        password = sys.stdin.readline().rstrip("\n").rstrip("\r")
        source = "--password-stdin"
    elif os.environ.get(ENV_PASSWORD):
        password = os.environ[ENV_PASSWORD]
        source = f"${ENV_PASSWORD}"
    elif sys.stdin.isatty():
        password = getpass.getpass("Password: ")
        source = "the prompt"
    else:
        raise CliError(
            "no password available: pipe one in with --password-stdin "
            '(printf %s "$PW" | knowledge login --email you@example.com '
            f"--password-stdin), set ${ENV_PASSWORD}, or run this in a terminal. "
            "There is deliberately no --password flag: argv is world-readable via "
            "`ps` and lands in your shell history."
        )

    if not password:
        raise CliError(f"no password was supplied on {source}")
    if len(password) < MIN_PASSWORD_LEN:
        raise CliError(
            f"password must be at least {MIN_PASSWORD_LEN} characters "
            "(the server requires it)"
        )
    return password


# --- talking to /auth and /app ------------------------------------------------


# The two planes that cannot legitimately 404, and what to call them when they do.
# `/api/*` is deliberately absent: `read` 404s for real, on a document that does
# not exist, so this branch would lie about it.
_PLANES = {
    "auth": ("auth API", "Signup and login"),
    "app": ("control-plane API", "This command"),
}


def plane_call(base_url: str, fn, *args: Any, plane: str = "auth", **kwargs: Any) -> Any:
    """Call an `/auth/*` or `/app/*` wrapper, turning "not routed" into English.

    Neither plane **can answer 404 when it is routed**: `/auth/signup`,
    `/auth/login`, `/auth/logout`, `/auth/me` and `/app/usage` take no path
    parameters, so there is no missing thing for them to 404 about. A 404 means the
    request reached some *other* server. That is the exact symptom of an edge that
    proxies only `/api/*` and lets everything else fall into a static site (the
    live host does this today, until P13.S5), and it arrives as a bare `404` with
    an HTML body that `client._detail()` correctly refuses to echo. Without this
    branch the user would see an unexplained, empty `HTTP 404`.
    """

    try:
        return fn(*args, **kwargs)
    except ApiError as exc:
        if exc.status == 404:
            label, subject = _PLANES[plane]
            raise CliError(
                f"{base_url} is not serving the {label} (HTTP 404). {subject} cannot "
                "404 when routed, so something else answered — most likely a static "
                "site at that origin, or the wrong --base-url. A local stack listens "
                "on http://localhost:8766."
            ) from None
        raise


def _tenants(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Both `/auth` shapes as one list.

    The asymmetry is real and load-bearing: `signup` answers `tenant` (singular),
    `login` and `me` answer `tenants` (a list). Normalized to a list here, once,
    so no caller has to remember which it is holding.
    """

    if "tenants" in payload:
        return [t for t in (payload.get("tenants") or []) if t]
    tenant = payload.get("tenant")
    return [tenant] if tenant else []


def _active_tenant(payload: dict[str, Any]) -> dict[str, Any]:
    """The tenant a session acts as: `tenants[0]`, matching `require_user`.

    `server/accounts/auth.py:65-97` picks the first membership for every `/app/*`
    call, so the CLI must agree — a solo-owner MVP with one tenant per user.
    """

    tenants = _tenants(payload)
    return tenants[0] if tenants else {}


def _signup_or_login(
    client: KnowledgeClient, base_url: str, email: str, password: str
) -> tuple[dict[str, Any], str]:
    """Try signup; on 409 (the email exists) log in instead. Returns (payload, verb).

    This is the operator's own path as much as a stranger's: they already have a
    tenant, so their email 409s and they log straight in, reusing the tenant and
    projects they have.
    """

    try:
        return plane_call(base_url, client.auth_signup, email, password), "signed up"
    except ApiError as exc:
        if exc.status != 409:
            raise
    return plane_call(base_url, client.auth_login, email, password), "logged in"


def _login(client: KnowledgeClient, base_url: str, email: str, password: str) -> Any:
    """`POST /auth/login`, with the generic 401 preserved verbatim.

    The server answers an identical 401 for an unknown email and a wrong password
    (`auth_api.py:44-45,144-145`) so callers cannot enumerate accounts. Passing its
    own wording through — and never adding a hint about *which* was wrong — is what
    keeps that property true at the CLI.
    """

    try:
        return plane_call(base_url, client.auth_login, email, password)
    except ApiError as exc:
        if exc.status == 401:
            raise CliError(f"login failed: {exc.detail or 'invalid email or password'}") from None
        raise


# --- what the CLI stored ------------------------------------------------------


def _stored() -> dict[str, Any]:
    """The config file's literal contents, or `{}` if it is missing/unreadable.

    Deliberately `load_raw`, never `resolve()`: this asks "what did the CLI write
    here", not "what knowledge base would the skill use". `resolve()` would answer
    with env overrides and the legacy-checkout convention, neither of which can
    hold a session token.
    """

    try:
        return config.load_raw()
    except config.ConfigError:
        return {}


def _section(cfg: dict[str, Any], key: str) -> dict[str, Any]:
    value = cfg.get(key)
    return value if isinstance(value, dict) else {}


def stored_session_token() -> str:
    """The 30-day `/app/*` session token this CLI last wrote, or `""`."""

    return _section(_stored(), "auth").get("session_token") or ""


def stored_api_token() -> str:
    """The non-expiring `vk_` key in `api.token`, or `""`. **Literal, not resolved.**

    This is the key `/knowledge:explain` reads, and the one `/api/*` commands ride.
    Literal on purpose, same as `stored_session_token`: callers that need the seam's
    *effective* token (`$KB_API_TOKEN` first) must apply that precedence themselves
    and say so, because the env var is not an innocent override — see
    `knowledge.api_token()`.
    """

    return _section(_stored(), "api").get("token") or ""


def stored_project() -> str:
    """The project `init` configured for this machine, or `""` when unknown.

    An **additive** key (`api.project`), invisible to the plugin skill's resolver,
    which reads exactly four keys and ignores the rest — the same trick `auth.*`
    plays. Every config written before P13.S3 lacks it, so `""` means "unknown",
    never "none".
    """

    return _section(_stored(), "api").get("project") or ""


def resolve_base_url(explicit: str | None) -> str:
    """Which service to talk to. Resolved once, in `main()`, for every command.

    `--base-url` > `$KB_API_BASE_URL` > the config file's `api.base_url` > the
    hosted service. There is exactly one base in the config, so a session token
    and an `api.token` can never drift onto different servers.

    The config is read **literally** (`load_raw`), never through `resolve()`: the
    resolver's legacy-checkout branch would answer `http://localhost:8766` for
    anyone who happens to have `~/projects/personal/knowledge/mkdocs.yml`, and
    silently onboarding them to their own laptop instead of the hosted service is
    precisely the trap this avoids.
    """

    if explicit:
        return explicit.rstrip("/")
    env = os.environ.get(config.ENV_API_BASE_URL)
    if env:
        return env.rstrip("/")
    configured = _section(_stored(), "api").get("base_url")
    if configured:
        return str(configured).rstrip("/")
    return DEFAULT_BASE_URL


def _legacy_checkout_active() -> bool:
    """Is the pre-config-file convention what `/knowledge:explain` uses today?"""

    root = os.path.join(os.path.expanduser("~"), *config.LEGACY_ROOT_PARTS)
    return os.path.isfile(os.path.join(root, "mkdocs.yml"))


def note(message: str) -> None:
    """A warning, on stderr — stdout stays parseable for an agent."""

    print(f"note: {message}", file=sys.stderr)


def _warn_before_first_write() -> None:
    """Say so when creating the config file takes a legacy checkout out of play.

    A config file is **authoritative** once it exists: the resolver never falls
    through to `~/projects/personal/knowledge` for keys the file omits
    (`explain/SKILL.md:55-63`). That is the safety property that stops a remote KB
    degrading into a stray local write — but for someone already using the legacy
    convention it silently changes where `/knowledge:explain` writes. Silent is
    the only unacceptable part, so: warn.
    """

    if not os.path.isfile(config.config_path()) and _legacy_checkout_active():
        note(
            f"creating {config.config_path()} — /knowledge:explain will read it "
            "instead of falling back to your ~/projects/personal/knowledge checkout"
        )


def _save_session(base_url: str, token: str, email: str) -> None:
    """Persist the session under the additive `auth.*` key, plus the service it is for.

    `auth.*` is invisible to the skill's resolver, which reads exactly four keys
    and ignores everything else (S1's differential test pins that indifference) —
    so this stays backward-compatible with a `/knowledge:setup`-written config.
    `api.base_url` is written too because a session is only meaningful against the
    server that issued it, and that is where the CLI already looks for the base.
    """

    _warn_before_first_write()
    api = _section(_stored(), "api")
    if api.get("token") and str(api.get("base_url") or "").rstrip("/") not in ("", base_url):
        note(
            f"api.base_url changes from {api['base_url']} to {base_url}; the api.token "
            "already in your config was minted by the old one — run `knowledge init` "
            "to mint a key for the new one"
        )
    config.save(
        {
            "api": {"base_url": base_url},
            "auth": {"session_token": token, "email": email},
        }
    )


# --- commands -----------------------------------------------------------------


def cmd_signup(args: argparse.Namespace) -> int:
    """Create an account and an org, and remember the session.

    Does **not** configure this machine: no project, no key, no `api.token`. Run
    `knowledge init` for that (it will sign you up too, if you have not already).
    """

    email = args.email.strip().lower()
    password = read_password(args)
    with KnowledgeClient(args.base_url) as client:
        try:
            payload = plane_call(args.base_url, client.auth_signup, email, password)
        except ApiError as exc:
            if exc.status == 409:
                raise CliError(
                    f"an account already exists for {email} — run "
                    f"`knowledge login --email {email}`"
                ) from None
            raise
    _save_session(args.base_url, payload["token"], email)
    tenant = _active_tenant(payload)
    print(f"signed up as {email}")
    print(f"org: {tenant.get('name', '?')}")
    print(f"next: knowledge init --email {email}   # project + org key + config")
    return 0


def cmd_login(args: argparse.Namespace) -> int:
    """Sign in and remember the session (30 days, server-side)."""

    email = args.email.strip().lower()
    password = read_password(args)
    with KnowledgeClient(args.base_url) as client:
        payload = _login(client, args.base_url, email, password)
    _save_session(args.base_url, payload["token"], email)
    tenant = _active_tenant(payload)
    print(f"logged in as {email}")
    print(f"org: {tenant.get('name', '?')}")
    return 0


def cmd_logout(args: argparse.Namespace) -> int:
    """Revoke the session server-side, then forget it locally.

    **Leaves `api.token` alone.** The `vk_` key is a separate, non-expiring
    credential that `/knowledge:explain` depends on; logging out of the control
    plane must not silently break the user's knowledge writes. Revoking a key is a
    separate, explicit act.
    """

    token = stored_session_token()
    if not token:
        print("not logged in")
        return 0
    with KnowledgeClient(args.base_url) as client:
        plane_call(args.base_url, client.auth_logout, token=token)
    # `config.save()` deep-merges and has no removal path, so absence is written as
    # JSON null — the same convention /knowledge:setup already uses for api.token
    # (setup/SKILL.md:203). The resolver reads null as "no value".
    config.save({"auth": {"session_token": None}})
    print("logged out (your api.token is untouched — saved knowledge keeps working)")
    return 0


def cmd_whoami(args: argparse.Namespace) -> int:
    """Show who the stored session belongs to, straight from the server."""

    token = stored_session_token()
    if not token:
        raise CliError("not logged in — run `knowledge login --email you@example.com`")
    with KnowledgeClient(args.base_url) as client:
        try:
            payload = plane_call(args.base_url, client.auth_me, token=token)
        except ApiError as exc:
            if exc.status == 401:
                raise CliError(
                    "your session has expired or been revoked — run "
                    "`knowledge login --email you@example.com`"
                ) from None
            raise
    user = payload.get("user") or {}
    tenant = _active_tenant(payload)
    print(f"user: {user.get('email', '?')}")
    print(f"org: {tenant.get('name', '?')}")
    print(f"api: {args.base_url}")
    return 0


def _ensure_project(
    client: KnowledgeClient, token: str, name: str
) -> tuple[dict[str, Any], bool]:
    """The project called `name`, created only if it does not already exist.

    `POST /app/projects` is get-or-create server-side since P18.S2 (a duplicate name
    returns the existing row, 201, against the new `UNIQUE(tenant_id, name)`), so a
    blind create can no longer litter the org with duplicates. Listing first and
    reusing a name match is kept as a belt-and-braces guard and to skip a redundant
    write on every idempotent `init` re-run.
    """

    existing = client.projects_list(token=token).get("projects") or []
    for project in existing:
        if project.get("name") == name:
            return project, False
    return client.projects_create(name, token=token)["project"], True


def cmd_init(args: argparse.Namespace) -> int:
    """Onboard this machine: sign up or log in, make a project, mint a key, configure.

    The one command a new user needs, and safe to re-run: an existing account logs
    in, an existing project is reused, and an existing key is kept. What it writes
    is a **remote-only** config — no `kb_root` — which is the safety property that
    keeps `/knowledge:explain` from ever degrading a failed remote write into a
    stray local file.
    """

    base_url = args.base_url
    email = args.email.strip().lower()
    project_name = args.project.strip()
    password = read_password(args)

    with KnowledgeClient(base_url) as client:
        payload, verb = _signup_or_login(client, base_url, email, password)
        session = payload["token"]
        tenant = _active_tenant(payload)
        print(f"{verb} as {email} (org: {tenant.get('name', '?')})")

        project, created = _ensure_project(client, session, project_name)
        print(f"project: {project_name} ({'created' if created else 'already existed'})")

        # Keep a key we already have: each mint is a live credential, and piling
        # them up on every re-run is a security smell, not just noise. The minted
        # key is now **org-level** (P18) — one `vk_` authorizes every project in the
        # org — so it is not bound to a project server-side. `api.project` still
        # records which project this machine's key was minted for, and the reuse
        # gate keeps its shape: only reuse a key minted by *this* service and
        # recorded against *this* project, re-minting when the config asks for a
        # different one. One from another base is likewise useless here — the server
        # keeps only a hash, so a key can never be checked, only trusted.
        api = _section(_stored(), "api")
        same_service = str(api.get("base_url") or "").rstrip("/") in ("", base_url)
        # ABSENT is "unknown", never "mismatched". Every config written before this
        # key existed lacks it, so a naive `!=` would mint a redundant live
        # credential for every existing user on their first upgraded `init`.
        configured_project = stored_project()
        same_project = not configured_project or configured_project == project_name
        if api.get("token") and same_service and same_project and not args.new_key:
            key = str(api["token"])
            print(
                f"key: reusing the one in your config ({config.redact_token(key)}) "
                "— pass --new-key to mint a fresh one"
            )
            if not configured_project and project_name != DEFAULT_PROJECT:
                # The one case the "absent = unknown" rule cannot get right: an
                # older config's key is bound to whichever project minted it, and
                # here that is probably not the one being asked for. Backfilling
                # api.project below records the claim either way, so say so once.
                note(
                    f"your config predates api.project, so the key it carries may be "
                    f"bound to a project other than {project_name!r} — writes still "
                    "land under that name, but usage is metered against the key's own "
                    "project; pass --new-key to mint one bound to this project"
                )
        else:
            # Show-once: this plaintext exists nowhere else, ever. It goes into the
            # config below and is never printed, logged, or raised. Minted at **org
            # level** (`POST /app/credentials`, `project_id NULL`): one key serves
            # every repo the user saves from, which is what makes "one key, all
            # repos" literal rather than just enforced.
            key = client.credential_create_org(name=CREDENTIAL_NAME, token=session)["key"]
            print(f"key: minted {config.redact_token(key)}")

    _warn_before_first_write()
    path = config.save(
        {
            # No kb_root, deliberately: a hosted user is remote-only, and an absent
            # kb_root is what makes local_fallback false forever. `project` is
            # additive (the skill's resolver ignores it) and is what `knowledge save`
            # falls back to outside a git repo — and what pins this key to a project.
            "api": {"base_url": base_url, "token": key, "project": project_name},
            # One origin serves both planes on the hosted service, so the site base
            # is the same URL. Omitting it would default to http://localhost:8765 —
            # a link to nothing.
            "site": {"base_url": base_url},
            "auth": {"session_token": session, "email": email},
        }
    )
    print(f"config: {path} (0600)")

    # Verify through the resolver the plugin skill actually uses, rather than
    # trusting the write: this is the seam's whole point, so prove it resolves.
    resolved = config.resolve()
    if resolved.status != "configured" or not resolved.api_token:
        raise CliError(
            f"wrote {path} but it does not resolve as configured "
            f"(status={resolved.status}) — run `knowledge config` to see why"
        )
    print(f"KB_STATUS={resolved.status}")
    print(f"KB_API_BASE_URL={resolved.api_base_url}")
    print(f"KB_LOCAL_FALLBACK={'yes' if resolved.local_fallback else 'no'}")
    if resolved.local_fallback:
        # Only reachable when a kb_root was already in the file: save() deep-merges
        # and cannot remove a key, and destroying someone's local checkout setting
        # is not init's call to make.
        note(
            f"your config still has kb_root={resolved.kb_root}, so /knowledge:explain "
            "may write locally if the API is unreachable; remove it to go remote-only"
        )
    print("done — /knowledge:explain now writes to this knowledge base")
    return 0


# --- wiring -------------------------------------------------------------------


def _add_credentials_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--email", required=True, help="your account email")
    parser.add_argument(
        "--password-stdin",
        action="store_true",
        help=(
            "read the password from stdin (one line). Otherwise "
            f"${ENV_PASSWORD}, else an interactive prompt. There is deliberately no "
            "--password flag: argv is world-readable via `ps` and is kept in your "
            "shell history."
        ),
    )


def register(sub: argparse._SubParsersAction) -> None:
    """Add the auth & onboarding subcommands to the top-level parser."""

    p = sub.add_parser(
        "init",
        help="Onboard this machine: sign up or log in, make a project, mint a key, configure",
        description=cmd_init.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    _add_credentials_args(p)
    p.add_argument(
        "--project",
        default=DEFAULT_PROJECT,
        help=f"project to use, reused if it exists (default: {DEFAULT_PROJECT})",
    )
    p.add_argument(
        "--new-key",
        action="store_true",
        help="mint a fresh API key even if the config already has one",
    )
    p.set_defaults(func=cmd_init)

    p = sub.add_parser(
        "signup",
        help="Create an account (does not configure this machine — see `init`)",
        description=cmd_signup.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    _add_credentials_args(p)
    p.set_defaults(func=cmd_signup)

    p = sub.add_parser(
        "login",
        help="Sign in and remember the session",
        description=cmd_login.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    _add_credentials_args(p)
    p.set_defaults(func=cmd_login)

    p = sub.add_parser(
        "logout",
        help="Revoke the session (your API key keeps working)",
        description=cmd_logout.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.set_defaults(func=cmd_logout)

    p = sub.add_parser(
        "whoami",
        help="Show who the stored session belongs to",
        description=cmd_whoami.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.set_defaults(func=cmd_whoami)

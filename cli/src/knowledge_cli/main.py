"""`knowledge` — the CLI entry point.

House style, matching every other CLI in this repo (`scripts/workflow.py`,
`scripts/onboarding_smoke.py`): stdlib **argparse with subparsers and
`set_defaults(func=...)`**. There is no typer/click/rich anywhere in the tree and
this does not introduce one; the only runtime dependency is `httpx`.

This module is the skeleton the rest of the phase hangs commands off, plus one
real command (`config`). It also owns the **error boundary**: subcommands raise
`ApiError`/`ConfigError` and `main()` is the single place they become an exit
code and a one-line message on stderr.
"""

from __future__ import annotations

import argparse
import os
import sys

import httpx

from . import __version__, config
from .client import ApiError

# The hosted service. A brand-new user with no config must reach the SaaS, not
# localhost — so this differs from `config.DEFAULT_API_BASE_URL` on purpose. The
# two answer different questions: `resolve()` reports what an *existing* config
# says (and must match the plugin skill exactly, localhost default and all);
# this is the *onboarding target* for a fresh one.
DEFAULT_BASE_URL = "https://knowledge.hi2vi.com"


def default_base_url() -> str:
    """The onboarding target: `KB_API_BASE_URL` if set, else the hosted service."""

    return os.environ.get(config.ENV_API_BASE_URL) or DEFAULT_BASE_URL


def cmd_config(args: argparse.Namespace) -> int:
    """Print the resolved config the plugin skill would see, token redacted.

    Deliberately prints the **same `KB_*` keys** the skill's own resolver heredoc
    prints (`explain/SKILL.md:72-77`), so this is the debug command for the seam:
    what the CLI reports here is what `/knowledge:explain` will act on.

    Exit 0 only when a usable knowledge base is configured; 1 for `unconfigured`
    or `error`, so an agent can branch on the status without parsing stdout.
    """

    resolved = config.resolve()
    print(f"KB_CONFIG_PATH={resolved.path}")
    print(f"KB_STATUS={resolved.status}")
    if resolved.status == "error":
        print(f"KB_ERROR={resolved.error}")
        return 1
    if resolved.status == "unconfigured":
        print(
            "# No knowledge base configured: no config file at the path above, no "
            "KB_ROOT/KB_API_BASE_URL/KB_API_TOKEN env var, and no legacy checkout."
        )
        return 1
    print(f"KB_ROOT={resolved.kb_root}")
    print(f"KB_API_BASE_URL={resolved.api_base_url}")
    # The token is a live credential: only ever its shape, never its value.
    print(f"KB_API_TOKEN={config.redact_token(resolved.api_token)}")
    print(f"KB_SITE_BASE_URL={resolved.site_base_url}")
    print(f"KB_LOCAL_FALLBACK={'yes' if resolved.local_fallback else 'no'}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="knowledge",
        description=(
            "Your personal knowledge base, from the terminal — sign up, configure "
            "credentials, save and search, without visiting the website."
        ),
    )
    parser.add_argument(
        "--version", action="version", version=f"knowledge-cli {__version__}"
    )
    parser.add_argument(
        "--base-url",
        default=default_base_url(),
        help=(
            "API base URL to talk to (default: $KB_API_BASE_URL or "
            f"{DEFAULT_BASE_URL}). Use http://localhost:8766 against a local stack."
        ),
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser(
        "config",
        help="Print the resolved knowledge-kb config (token redacted)",
        description=cmd_config.__doc__,
    )
    p.set_defaults(func=cmd_config)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args) or 0)
    except ApiError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    except httpx.HTTPError as exc:
        print(f"error: cannot reach {args.base_url}: {exc}", file=sys.stderr)
        return 1
    except config.ConfigError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("aborted", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())

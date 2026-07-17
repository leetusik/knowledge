# knowledge-cli

A standalone command-line client for a personal knowledge base on the hosted
service at <https://knowledge.hi2vi.com> — sign up, configure credentials, and
save and search knowledge from a terminal, without ever visiting the website. It
is a separate install from the `/knowledge:explain` Claude Code plugin, but writes
the same config the plugin reads, so the two share one hosted knowledge base.

## Install

    uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli

This puts a `knowledge` executable on PATH. Requires Python 3.12+ and
[`uv`](https://docs.astral.sh/uv/). There is no PyPI, npm, or brew package — the
git URL is the distribution channel. Upgrade with `--reinstall` (`--force` reuses
the cached wheel and does not rebuild).

## A one-command tour

    # Onboard: sign up (or log in) → project → API key → config, in one shot.
    printf %s "$PASSWORD" | knowledge init --email you@example.com --password-stdin

    # Save a note (2-5 tags, lowercase-kebab; body starts at its # H1).
    knowledge save note.md --tag python --tag testing

    # Find and read it back.
    knowledge search "the thing I saved"
    knowledge list
    knowledge read 42

    # See what's configured, and your usage.
    knowledge config
    knowledge usage

`init` is idempotent — re-run it any time; it logs in, reuses your project, and
keeps your key. Passwords never go through `argv`: use `--password-stdin`,
`$KNOWLEDGE_PASSWORD`, or an interactive prompt. Your `vk_` API key is show-once
and the CLI stores it for you — it is never printed. Everything except `usage`
keeps working after the 30-day session expires; only `usage` needs `knowledge
login`.

## Driving this from a coding agent

Run `knowledge guide` — it prints the full machine-readable contract (auth, the
save rules, the two-token model, the `--json`/exit-code protocol, and the one
`$KB_API_TOKEN` hazard) as a single markdown document, offline, bundled in the
wheel. Every command also takes `--json` to print the server's payload verbatim;
errors go to stderr with a non-zero exit, never as JSON, so an agent branches on
the exit code.

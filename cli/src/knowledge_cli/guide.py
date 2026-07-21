"""`knowledge guide` — the machine-readable contract, bundled in the wheel.

The second half of P13's intent: agent-readable guide docs so a coding agent can
drive the whole lifecycle without ever visiting the website. This is the doc,
compiled into the package as a plain module string.

**Bundled, not served (D-P13-6).** The guide ships *inside the wheel* — versioned
with the code, present offline, no `server/` route and so no parity debt. It is a
module string, not a `.md` data file, on purpose: a data file needs hatch
`force-include`/artifacts config and can silently miss the wheel, while a string is
guaranteed to be there and needs zero packaging config. The live install run is
what proves it actually ships (`knowledge guide` from the installed binary), rather
than asserting it.

The content is written **for an agent, not a human skimmer**: imperative, real
commands, and explicit about every constraint an agent cannot guess (the 2-5 tag
rule, the show-once `vk_`, the two-token split, the `--json`/exit-code protocol,
the `$KB_API_TOKEN` hazard). It is deliberately about what to *do*, not an errata
list — so it does **not** invent errors the CLI cannot produce (there is no
"malformed search query" error: `search.py:264-265` is unreachable without the
`raw` flag the CLI does not expose).

Anyone editing `save`/`init`/the config seam must update this string too;
`tests/test_guide.py` is the anti-rot guard that fails when a load-bearing
constraint silently drops out.
"""

from __future__ import annotations

import argparse

# The one git install form (D-P13-1) — the real distribution channel. It is true
# the moment the operator pushes (`cli/` is unpushed today); bundling is proven now
# with the local `uv tool install ./cli --reinstall`. Kept as a named constant so
# the test can assert the exact string ships without hard-coding it twice.
INSTALL_COMMAND = (
    "uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli"
)

GUIDE = f"""\
# knowledge — the agent-readable contract

`knowledge` is a standalone CLI for a personal knowledge base on the hosted service
at https://knowledge.hi2vi.com. It signs up, configures credentials, and saves and
searches knowledge from a terminal — the website is never required. This is the full
machine-readable contract: if you are a coding agent driving this on a user's behalf,
everything you need to run the whole lifecycle unattended is below.

Every command prints human-readable text by default and the server's JSON payload
verbatim with `--json`. Errors go to **stderr** as `error: …` with a non-zero exit —
never as JSON. Branch on the **exit code**; parse stdout only after a zero exit.

## 1. Install

    {INSTALL_COMMAND}

This puts a `knowledge` executable on PATH. Requires Python 3.12+ and `uv`. The only
runtime dependency is `httpx`; there is no PyPI, npm, or brew package — the git URL is
the distribution channel. Re-run the same command with `--reinstall` to upgrade
(`--force` reuses the cached wheel and does not rebuild).

## 2. Onboard — one command

    printf %s "$PASSWORD" | knowledge init --email you@example.com --password-stdin

`init` runs the whole sequence for a real account: sign up (or log in, if the email
already exists) → create a project → mint an API key → write the local config →
verify it resolves. It is **idempotent** — re-running logs in, reuses the existing
project, and keeps the existing key. Safe to run twice.

**Passwords never go through `argv`.** There is deliberately no `--password` flag:
argv is world-readable via `ps` and lands in shell history. The password is read, in
order, from `--password-stdin` (one line on stdin), then the `$KNOWLEDGE_PASSWORD`
env var, then an interactive prompt on a TTY. An unattended agent must pipe it in or
set the env var; with neither and no TTY, `init` errors rather than hang. Minimum 8
characters (the server's rule).

`--project NAME` overrides the project name (it defaults to `default`, the org's
signup-provisioned default project); `--new-key` forces a fresh key even when the
config already holds one.

Signup and login share one **generic** failure: the server answers an identical error
for an unknown email and a wrong password, so a caller cannot tell which was wrong.
That is deliberate account-enumeration safety, and the CLI preserves it — do not
expect the message to say which field was bad.

## 3. The two-token model — what keeps working after 30 days

`init` writes **two** credentials into the config, with two lifetimes:

- A non-expiring **`vk_` API key** (`api.token`) drives the five data commands:
  `save`, `search`, `list`, `read`, `projects`. These keep working forever. It is an
  **org-level** key — one key authorizes writes to every project in your org, so the
  same key serves every repo you save from.
- A 30-day **session token** (`auth.session_token`) drives `usage`, and only `usage`.

So after `knowledge logout` — or after the session simply expires — `save`, `search`,
`list`, `read`, and `projects` still work; only `usage` needs a fresh `knowledge
login`. `logout` revokes the session but deliberately leaves the `vk_` key alive, so a
user's saved-knowledge writes never break under them.

**The `vk_` key is shown once, ever.** The server returns the plaintext exactly one
time when it is minted and keeps only a hash afterward. The CLI writes it straight
into the config file for you and **never prints, logs, or echoes it** — not on
success, not in an error message. You never copy-paste it. If the config is lost, mint
a new one (`knowledge init --new-key`); the old plaintext is unrecoverable by design.

This `vk_` in `api.token` is also the exact key the `/knowledge:explain` Claude Code
plugin reads. Writing it here is what lets that plugin write to the same hosted
knowledge base with no extra setup.

## 4. Save a document

    knowledge save NOTE.md --tag python --tag testing
    knowledge save - --tag python,testing   # body from stdin

- **The body starts at the `# H1`, with no YAML frontmatter.** The API writes its own
  convention-exact frontmatter; a body that carries its own would end up with two
  headers. The CLI strips a leading `---…---` block and warns — hand-written
  frontmatter is the only thing that trips it, and a `read` → `save` round-trip never
  does.
- **2-5 tags, lowercase-kebab** (`a-z`, `0-9`, single dashes). This is a hard server
  rule the CLI checks before sending, so `--tag Auth`, `--tag "web api"`, and fewer
  than 2 or more than 5 tags are each rejected with a sentence rather than a raw 422.
  Tags are repeatable and comma-splittable (`--tag a,b` == `--tag a --tag b`).
- **The project defaults to the git repo's directory name**, verbatim — exactly what
  `/knowledge:explain` uses, so the CLI and the plugin file one repo's notes under the
  same project. Override with `--project`. Outside a git repo it falls back to the
  project `init` configured, then to `default`. Any name is fine — the server
  get-or-creates the project on first save, so you never pre-create one. If the repo's
  directory name is not a usable project name (a space in it, say), the CLI stops and
  suggests a `--project` value instead of guessing.
- **The title** defaults to the body's first `# H1`; override with `--title`.
- A document already at the same path is a **409**; pass `--overwrite` to replace it,
  or `--slug`/`--date` to save alongside it.

`save` prints the new document's `id`, `rel_path`, and a `knowledge read <id>` hint —
the paths that always work. `--json` carries the full 201 payload.

## 5. Read back — search, list, read, projects, usage

    knowledge search "vector index"      # full-text + semantic; any query is safe to type
    knowledge list --project myrepo      # newest first; --limit / --offset to page
    knowledge read 42                    # a document's markdown, by id …
    knowledge read myrepo/2026-07-17-a-note.md   # … or by rel_path
    knowledge projects                   # projects you have saved under, with counts
    knowledge usage                      # your usage totals (needs a session — see login)

Two response-shape facts that bite an agent parsing `--json`:

- `list` returns `{{total, items}}`; `search` returns `{{total, results}}`. Different
  key, same idea — one shared parser gets one of them wrong.
- `projects` is a `GROUP BY` over your documents, not a project registry. A project you
  just created with `init` does **not** appear here until its first `save`.

`read` output is the stored body verbatim (H1-first, no frontmatter), so
`knowledge read 42 > note.md && knowledge save note.md` round-trips cleanly.

## 6. The agent contract — how to drive this from code

- `--json` on every command above prints the server's payload **verbatim** — every
  field, nothing dropped or reformatted. Use it whenever a machine reads the output.
- Errors are **never** JSON. They go to stderr as `error: …` and the process exits
  non-zero (`1` for a handled failure). So stdout under `--json` is always "valid JSON
  or nothing".
- Therefore: **branch on the exit code.** On zero, parse stdout. On non-zero, read
  stderr as prose; do not try to parse it as JSON.
- Warnings (e.g. "creating your config", "an env var is overriding your key") go to
  stderr as `note: …` and do **not** change the exit code, so stdout stays clean.

## 7. Config

The CLI stores everything in `~/.config/knowledge-kb/config.json` (or
`$XDG_CONFIG_HOME/knowledge-kb/config.json`), written `chmod 600`. A hosted account is
**remote-only**: there is no `kb_root` and no local-file fallback, so a failed remote
write can never silently degrade into a stray local file.

    knowledge config      # print the resolved state (status, base URL, token shape)

`knowledge config` prints exactly the keys the `/knowledge:explain` resolver would
see, with the token reduced to its shape (`vk_…last4`) — never its value. Exit 0 means
a usable knowledge base is configured; exit 1 means unconfigured or broken.

Point the CLI at another service with `--base-url URL`, the `$KB_API_BASE_URL` env
var, or the config's `api.base_url` (in that precedence). A local stack listens on
`http://localhost:8766`.

## 8. One hazard — `$KB_API_TOKEN`

`$KB_API_TOKEN`, if set, overrides the config's `api.token` for `/api/*` commands —
that precedence is the plugin seam's, not the CLI's invention. But it is **not** an
innocent override: if its value is the server's master bearer, an exact match
short-circuits to **tenant #1**, whose writes are public — they update the canonical
git-published `docs/` tree, commit, and push to the live website. Someone who exported
`$KB_API_TOKEN` for the plugin and forgot has a shell where every `knowledge save`
publishes. If you did not mean to write to the public corpus, **unset `$KB_API_TOKEN`**
and let the CLI use your own key. The CLI warns on stderr whenever the env var is
displacing a configured key.
"""


def cmd_guide(args: argparse.Namespace) -> int:
    """Print the bundled agent contract to stdout, exit 0. No server, no auth."""

    print(GUIDE)
    return 0


def register(sub: argparse._SubParsersAction) -> None:
    """Add the `guide` subcommand to the top-level parser."""

    p = sub.add_parser(
        "guide",
        help="Print the full agent-readable contract (auth, save rules, --json protocol)",
        description=cmd_guide.__doc__,
    )
    p.set_defaults(func=cmd_guide)

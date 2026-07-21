# P13.S2 — Auth & onboarding commands

Orchestrator's plan for **`P13.S2`** (`implementation`, `risk: high`, order 2, depends P13.S1), executed by **`slice-executor-high`**.

## Context

This is P13's headline slice and its riskiest: the commands that turn a stranger into a working user. `knowledge init` runs the whole `onboarding_smoke.py` sequence for a real person — signup-or-login → project → mint `vk_` → **write the config seam** — and that config write is the phase's payoff: the moment `api.token=vk_…` lands in `~/.config/knowledge-kb/config.json`, **`/knowledge:explain` starts writing to the hosted SaaS with zero code change**, proving "SaaS-open" was real.

It is `high` risk because it handles a password and a **show-once** credential. A `vk_` key is returned exactly once, ever (`app_api.py:148-170`); if the CLI mishandles it, it is gone.

S1 shipped the foundation and left precise notes (`works/phases/active/P13/slices/P13.S1/result.md`) — read them. What matters here:

- **`config.save()` deep-merges**, so `save({"api": {"token": vk}})` will not drop a neighbouring `base_url`. Mode `0600` is set on the temp file *before* `os.replace` — **do not add a `chmod` after**.
- **`config.save()` cannot delete a key.** Deep-merge has no removal path, so `logout` writes `session_token: null` — the same convention `/knowledge:setup` already uses for `api.token` (`setup/SKILL.md:203`). Null means absent; do not add a delete API for this.
- **`client.py` takes a per-call `token=`**, so hold the session token and the `vk_` at once and pass whichever the plane wants. A `vk_` on `/app/*` gets **401** — the planes are not interchangeable.
- **The signup/login asymmetry is real and load-bearing**: signup → `{token, user, tenant}` (**singular**), login → `{token, user, tenants[]}` (**plural**). Normalize to `tenants[0]` (solo-owner MVP, matching `require_user`).
- Every `/auth` + `/app` wrapper is **still unexercised against a real server**. This slice is where they meet one — see Verification.

## The commands

**`init`** — the one-shot. `signup-or-login → resolve project → ensure credential → write config → verify`. Then `signup`, `login`, `logout`, `whoami` as the individual pieces (`init` composes them; it does not duplicate their logic).

### Password handling — the constraint that shapes the UX

**A password must never reach `argv`.** There is no `--password` flag, ever: argv lands in shell history and is world-readable via `ps`. Three ways in, in precedence order:

1. **`--password-stdin`** — read one line from stdin. The `docker login` / `gh` convention, and the safest non-interactive path.
2. **`KNOWLEDGE_PASSWORD`** env var — the pragmatic agent path (a coding agent sets env more naturally than it pipes stdin). Env is *weaker* than stdin (visible in `/proc/<pid>/environ`), so it is second, and the guide docs (S4) must say so.
3. **`getpass.getpass()`** — interactive default when stdin is a TTY and neither of the above is given.

If none apply and stdin is not a TTY, **fail with a clear message** rather than hanging on a prompt no one can answer — an agent must never see this command block.

Validate `len(password) >= 8` **client-side** before calling (`auth_api.py:54` `Field(min_length=8)`), so a weak password is a friendly message rather than a raw 422.

### `init` — the two footguns to design around

**1. Duplicate projects.** `POST /app/projects` has **no uniqueness check** (`app_api.py:123-134`) — two calls with the same name yield two distinct project UUIDs. So `init` must **`GET /app/projects` and reuse a name match** before ever creating. Blindly creating would silently litter a tenant with duplicates on the second run.

**2. Duplicate credentials.** Re-running `init` must not mint a new `vk_` every time. If the config already carries a working `api.token`, **keep it** and say so; mint only when the config has none (or `--new-key` is passed). Minting is cheap but each key is a live credential — piling them up is a security smell, not just noise.

Together these make `init` **idempotent**: run it twice, get "already configured" rather than a second tenant's worth of clutter.

**Signup-or-login:** try `signup`; on **409** (email exists, `auth_api.py:118-121`) fall back to `login` with the same credentials, and say which happened. This is also the operator's path — they already have tenant #1 from P10.S6, so their email 409s and logs in, reusing their existing tenant and projects.

### What `init` writes

```json
{
  "api":  {"base_url": "<resolved base>", "token": "vk_…"},
  "site": {"base_url": "<resolved base>"},
  "auth": {"session_token": "…", "email": "…"}
}
```

- **No `kb_root`** — a SaaS user is **remote-only**. This is not an omission, it is the safety property: `local_fallback` stays false, so `/knowledge:explain` can never silently degrade a failed remote write into a stray local file (`explain/SKILL.md:216-220`).
- **`auth.*` is additive** — the skill's resolver reads four keys and ignores the rest, so this stays backward-compatible (S1's differential test covers the resolver's indifference).
- **No stored expiry.** The session is 30-day TTL server-side (`auth_api.py:42`) but **the login response carries no expiry field**, so the CLI must not invent one. Handle a 401 from `/app/*` as "session expired — run `knowledge login`". Never duplicate a server fact the server does not tell you.
- **`site.base_url` — answering phase Open Question (b), honestly.** Write the same SaaS base. For **tenant #1 (the operator, today's only real user) this is exactly right** — their docs *are* on `knowledge.hi2vi.com`. For a future non-#1 tenant it points at a site that does not host their documents; the honest target is the P12 web app's document view, **undeployed until P14**. Writing the SaaS base is correct now and merely imperfect later; omitting it is worse (it would default to `http://localhost:8765`, a link to nothing). **Record this in `phase.md` as (b)'s resolution + the P14 follow-up** — do not let it pass silently.

### The pre-S5 error path — the message every user hits today

Until S5, `/auth/*` at the default SaaS base returns **404 with `content-type: text/html`** (the mkdocs catch-all — S1 confirmed this live). So *every* real `knowledge init` against the default base fails **today**. That message must be honest and specific: something like "`<base>` did not answer the auth API (got a 404 from a static site) — it may not expose the control plane yet", **not** a bare `404` or an empty detail. S1's `_detail()` already degrades the HTML body to `''`, so the raw page never sprays — but an empty 404 is still a mystifying error. Distinguish it: a 404 whose response is `text/html` on an `/auth/*` call is the "control plane not routed" signal.

Also map: connection refused → "cannot reach `<base>`"; generic **401** → the server's own wording, **never** distinguishing bad-email from bad-password (enumeration-safety is deliberate, `auth_api.py:145-149`).

### `logout` does not revoke the `vk_`

`POST /auth/logout` (204, idempotent) + null the `auth.session_token`. **Leave `api.token` alone** — the `vk_` is a separate, non-expiring credential that `/knowledge:explain` depends on. Logging out of the control plane must not silently break the user's knowledge writes. (A future `--revoke-key` is a separate, explicit act; not this slice.)

## Deliverables

```
cli/src/knowledge_cli/auth.py     NEW — signup/login/logout/whoami/init + password resolution
cli/src/knowledge_cli/main.py     EDIT — register the five subcommands; keep the `config` hint honest
cli/tests/test_auth.py            NEW — terse; httpx.MockTransport, no live server
```

`main.py`'s `cmd_config` currently prints an `unconfigured` message that deliberately avoids naming an unshipped command — now that `init` exists, add that hint (S1 flagged this explicitly).

**Tests stay terse** (AGENTS.md hard rule): `httpx.MockTransport` (no new dep, no live server) covering the behavior that would actually hurt — signup-409 → login fallback; **project reuse by name, no duplicate create**; existing `api.token` not re-minted; config written with a `vk_` and **no `kb_root`**; logout nulls the session but **preserves `api.token`**; password never in argv. Do not build a fixture rig.

## Guardrails

- **No root file changes.** Nothing under `server/`, `tests/`, `web/`, `deploy/`, `plugin/`. CLI tests in `cli/tests/` only (D-P13-5).
- **The `vk_` is written to the config and never printed or logged** — not at INFO, not in a traceback, not in `--help` examples. `config.redact_token()` exists for any display.
- **No knowledge commands** (`save`/`search`/`list`/`read`) — that is S3.
- **Never touch the operator's real `~/.config/knowledge-kb/config.json`.** They have none today (S1 confirmed); S2's `init` would be the first thing ever to create it. Every test and manual run uses a temp `XDG_CONFIG_HOME`.
- No `doc-new-version`; append a Doc impact line to `phase.md`. No commits.

## Verification — this is the slice where the client finally meets a real server

S1 could not verify `/auth` or `/app` against anything: no local stack, and the deployed host does not route them. **That gap closes here.** The dev `compose.yml` has Postgres, and Docker is running.

1. **Bring up a real tenant-mode API:**
   `docker compose up -d postgres api` → `docker compose exec api alembic upgrade head`.
   `DATABASE_URL` is already set in `compose.yml`, so the API comes up in **tenant mode** (`vk_`/session resolution live). Host ports 8765/8766 are free (the running containers belong to other projects).
2. **Drive the installed CLI end to end against it** (`uv tool install ./cli`; `--base-url http://localhost:8766`; a temp `XDG_CONFIG_HOME`; a unique throwaway email per the `onboarding_smoke.py` convention):
   - `init` → config exists, mode is **0600**, `api.token` starts `vk_`, **no `kb_root`**, `auth.session_token` present.
   - `init` **again** → idempotent: no second project, no second key.
   - `whoami` → the right email + tenant. `logout` → 204, session nulled, **`api.token` survives**. `login` → works again.
   - Wrong password → **generic** 401 wording, no email/password distinction.
   - `--password-stdin` and `KNOWLEDGE_PASSWORD` both work non-interactively; confirm no password appears in `ps`/argv.
3. **Prove the payoff end to end.** With the CLI-written config on `XDG_CONFIG_HOME`, run S1's `config.resolve()` **and** the *verbatim* `explain/SKILL.md` heredoc against it: both must report `KB_STATUS=configured`, the `vk_` as `KB_API_TOKEN`, and `KB_LOCAL_FALLBACK=no`. That is the concrete proof that a CLI-written config lights up `/knowledge:explain` — the phase's whole thesis — and it costs one command. *(Do not run `/knowledge:explain` itself; just prove the seam resolves.)*
4. **Regressions:** `cd cli && uv run pytest -q`; `uv run pytest -q` at root (65 passed / 12 skipped — note some of the 12 may now **run**, since Postgres is up; that is fine and expected, but report it); `python3 scripts/plugin_parity.py` still **exit 1 / 34 issues**; `git status` shows only `cli/` + `works/`.
5. **Leave the machine as you found it:** `docker compose stop api postgres` (or `down` **without `-v`** — never drop `pgdata`), and report in `result.md` exactly what was left running, built, or stored.

## Slice bookkeeping

- Write `works/phases/active/P13/slices/P13.S2/result.md` (free-form, terse: what shipped, the live-verification output, deviations, what S3 must know — especially the real shapes of the `/auth` + `/app` responses now that they have been seen).
- Append cross-slice notes to `phase.md`: **Open Question (b) resolved** (`site.base_url` = the SaaS base, with the non-#1-tenant caveat + P14 follow-up), whether the client wrappers survived contact with a real server, and the Doc impact line (`security.md` — password handling, show-once `vk_`, two-token model; `experience.md` — the onboarding journey; `product.md` — the CLI as a third surface).
- Return a structured verdict; never commit, never transition status.

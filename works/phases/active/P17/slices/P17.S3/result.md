# Result — P17.S3: Public-host onboarding surface for plugin users

## What landed

`/knowledge:setup` now opens with a **mode question** and gains a full **Connect mode**
that wires `/knowledge:explain` to the hosted KB at `https://knowledge.hi2vi.com` — the
zero-infra default for plugin users. The existing self-host flow is preserved verbatim
under a new **Scaffold mode** umbrella. No new skill; no web/, server/, or cli/ change —
the ratified shape from `plan.md`.

### `plugin/skills/setup/SKILL.md`

- **Frontmatter.** `description` rewritten to name both paths (connect to the hosted KB
  vs scaffold a self-hosted one). `allowed-tools` gains `Bash(curl -sS --max-time 5:*)`
  for the connect-mode verification read (mirrors the explain skill's pre-approved curl).
  `name`, `argument-hint`, `disable-model-invocation` unchanged. **No version string
  touched** — stays `0.3.0` throughout.
- **Intro + `## Choose your mode`.** New two-mode framing; the skill asks connect vs
  scaffold first. A non-empty `$ARGUMENTS` (target-dir) implies scaffold and skips the
  question — preserves the existing arg behavior. Connect is suggested as the default.
- **`## Connect mode`** (`### C1`–`### C5` + a CLI-alternative subsection):
  - **One key, all repos** mental model stated: the user mints one `vk_`, and
    `/explain` sends the repo dirname as each doc's `project`, so the same key serves
    every repo (key's bound project = usage attribution only).
  - **C1** browser signup/login using the real web labels — **Create your account** /
    **Sign in**, the *"At least 8 characters"* hint, "A workspace is created for you
    automatically." No email/password ever crosses to the agent.
  - **C2** create/open a project — **Dashboard → Projects → New project → Project name →
    Create → Open** (real `dashboard.ts` labels).
  - **C3** mint a key — **API keys → New key → Key name → Create key**, then the
    show-once **Copy your new key now** panel with its verbatim warning and **Copy**
    (real `project.ts` labels; `vk_` shown exactly once).
  - **C4** secret-safe config write: the exact connect-mode JSON (`api.base_url`/`token`,
    `site.base_url`, **no `kb_root`**). The pasted key is written to a temp file via the
    Write tool, then a `python3 -c` reads it from disk and composes the config — the key
    never becomes a shell argument. Pre-existing-config guard: SHOW current contents and
    ASK before replacing (never silently clobber a local self-host config). Env-var
    escape hatch (`KB_API_BASE_URL`/`KB_API_TOKEN`) documented. `chmod 600` + temp-file
    delete close it out.
  - **C5** verification: one authenticated `curl … -H "Authorization: Bearer <vk_>"
    "…/api/documents?limit=1"` → 200 = connected (report `/explain` saves to your tenant
    from any repo; docs render at **Documents** `/documents`); 401 = wrong/revoked key →
    re-check or re-mint, do not fall back.
  - **CLI alternative** mentioned (not implemented):
    `uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli` then
    `knowledge init` — writes the same config file. Presented without the "once main is
    pushed" caveat, per plan (the S5 push precedes any plugin release).
- **`## Scaffold mode`** umbrella heading + the original scaffold intro and mutation
  warning (reworded to "this mode"; the secret rule now says scaffold writes no secret
  and `api.token` stays `null`, contrasted with connect mode's sanctioned `vk_` write).
  **Stages `## 1.`–`## 7.` are byte-unchanged**, so every internal "stage N"
  cross-reference stays valid and scaffold behavior is untouched.

### `plugin/README.md`

- `/knowledge:setup` bullet rewritten to the two-path story: **Connect** (zero-infra
  default: sign up, mint one key, paste; one key serves every repo) and **Scaffold**
  (full-control self-host). Kept tight.
- **Requirements** now leads with "Connect mode needs none of the below — just a browser";
  the Python/Docker/GitHub list is scoped to scaffold mode.

### `plugin/.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json`

- `description` gains the "connect to the hosted KB or scaffold the whole KB from scratch"
  clause, **byte-identical in both** files. **No version bump** — stays `0.3.0`.

## Decisions taken

- **`allowed-tools` +curl.** Added `Bash(curl -sS --max-time 5:*)` so connect-mode
  verification runs like the explain skill's pre-approved curl. Incidental side effect:
  the scaffold stage-6 localhost `healthz`/viewer probes (already `curl -sS --max-time 5
  …`) also become pre-approved instead of prompting. This is a read-only convenience, not
  a change to *what* scaffold mode does — see Deviations.
- **Secret handling.** Config *write* uses the temp-file + `python3 -c` pattern (key read
  from disk, never a shell arg), per plan. The *verification* curl carries the bearer in
  `-H` exactly as the plan specifies and as the explain skill already does — consistent,
  and the only header that ever holds the key besides the config file.
- **Structure.** Kept scaffold stages `## 1.`–`## 7.` at their existing heading level and
  numbering (not demoted/renumbered) so all "stage N" references and behavior survive
  intact; connect mode uses a separate `### C1`–`### C5` scheme under its own `## H2`.

## Validation (all green)

1. **Temp-config resolver check** (`scratchpad/resolver_check.py`, scratch
   `XDG_CONFIG_HOME`, never the operator's real config): composed the exact connect-mode
   JSON via the C4 temp-file+python3 pattern, ran the explain SKILL §2 resolver verbatim →
   `KB_STATUS=configured`, `KB_ROOT=` (empty), `KB_API_BASE_URL=https://knowledge.hi2vi.com`,
   `KB_API_TOKEN=vk_testkey_…` (echoed), `KB_SITE_BASE_URL=https://knowledge.hi2vi.com`,
   `KB_LOCAL_FALLBACK=no`. All assertions passed. Proves the shape connect mode writes is
   exactly what `/explain` consumes, and that a missing `kb_root` → remote-only →
   `KB_LOCAL_FALLBACK=no` (the correct hosted failure mode).
2. **Documented curl cross-checked against `docs/current/api.md`** (no live call):
   `GET /api/documents` takes `limit` (1–200) and returns `{total, items}` (api.md L69–73);
   in tenant mode every `/api/*` bearer resolves to a tenant and an unresolvable/absent
   bearer → generic **401** (api.md L44), so `?limit=1` with a valid `vk_` → 200 and a
   wrong/revoked key → 401, exactly as C5 documents.
3. `claude plugin validate .` → **✔ Validation passed**; `claude plugin validate ./plugin`
   → **✔ Validation passed**. JSON sanity on both manifests: OK; description clause
   **BYTE-SAME** across both; `plugin.json` version **0.3.0** (no bump).
   `python3 scripts/workflow.py validate` → **Workflow validation passed**.
4. `python3 scripts/skills_parity.py` → **PASS — explain skill copies are in body parity**
   (S2's guard stays green; no explain copy touched). `plugin_parity.py` intentionally NOT
   run as a gate (red until S4, known).

## Deviations from plan.md

- **allowed-tools curl pre-approval touches scaffold too.** `allowed-tools` is
  skill-global, so pre-approving `Bash(curl -sS --max-time 5:*)` for the connect
  verification also covers scaffold stage-6's existing localhost `curl -sS --max-time 5`
  probes — they no longer prompt. This is the minimum needed to make connect mode's
  verification first-class; it does not change *what* scaffold mode does (same commands,
  same effects), only that a read-only probe stops prompting. Judged within the plan's
  "restructure only as needed" latitude for scaffold. No other scaffold behavior changed;
  stages 1–7 are byte-unchanged.
- Otherwise none — connect-mode flow, config shape, verification, README two-path story,
  and the byte-same manifest clause (no version bump) all landed as specified.

## Out of scope (untouched, per plan)

web/, server/, cli/, `plugin/templates/` (S4), any live call to the public host, and the
operator's real `~/.config/knowledge-kb/config.json` (validation used a scratch
`XDG_CONFIG_HOME` only).

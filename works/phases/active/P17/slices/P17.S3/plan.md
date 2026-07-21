# Plan — P17.S3: Public-host onboarding surface for plugin users

Operator-approved at the plan gate (2026-07-21). Read `../../phase.md` (Findings & Notes
+ Constraints) and `../../intent.md` first. The file you are extending is
`plugin/skills/setup/SKILL.md` (read it in full before editing — its scaffold flow must
survive intact).

## The ratified shape (implement this; don't re-open the decision)

**`/knowledge:setup` gains a mode question**: *connect to the hosted KB at
`https://knowledge.hi2vi.com`* (new mode, the zero-infra default for plugin users) vs
*scaffold a self-hosted KB* (the existing flow, preserved as-is under the new question).
No new skill; no web/, server/, or cli/ changes — the web app already has the whole
self-serve loop, and one `vk_` serves all repos.

Facts your skill text must be accurate about (verified this session):

- Signup page exists: `https://knowledge.hi2vi.com/signup` (`web/src/app/(auth)/signup`).
  Login: `/login`. Dashboard → create project; project page → mint credential — the
  plaintext `vk_` is shown **exactly once** at mint
  (`web/src/app/(app)/projects/[projectId]/mint-credential-form.tsx`). Read
  `web/src/content/*.ts` (e.g. `project.ts`, `dashboard.ts`) and use the REAL UI labels
  in the skill's instructions so users can follow along.
- One key, all repos: the `/api/documents` write path takes the payload's `project`
  (repo dirname) — `server/main.py:402`; the credential's project is metering
  attribution only. So the user mints ONE `vk_` and `/explain` posts from every repo,
  each under its own project name. Say this in the skill (it is the mental model).
- The explain skill's §2 resolver reads `$XDG_CONFIG_HOME/knowledge-kb/config.json`
  (default `~/.config/knowledge-kb/config.json`) with keys `kb_root`, `api.base_url`,
  `api.token`, `site.base_url`; `kb_root` absent = remote-only (legit) →
  `KB_LOCAL_FALLBACK=no` (the correct hosted failure mode: unreachable API → STOP, no
  file scribbling).
- Terminal-only alternative (mention, don't implement): the standalone CLI —
  `uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli` then
  `knowledge init` (full signup→project→key→config in-terminal; the git+ form becomes
  real once main is pushed at S5 — present it without that caveat in the skill, the push
  precedes any plugin release).

## Connect-mode flow (the new section)

1. Interview: which mode? (connect = default suggestion for plugin users; scaffold =
   the existing self-host path.)
2. Browser steps (numbered, using real UI labels): sign up or log in at the public
   host → create/open a project → mint a credential → copy the `vk_` key (shown once).
   **No email/password ever passes through the agent** — the browser does auth; the
   skill only receives the pasted key. Treat the pasted key as a secret: it goes into
   the config file, never into a commit or a shell-visible arg (write the JSON via the
   same tmp-file + `python3 -c` pattern the skills already use).
3. Config write: `~/.config/knowledge-kb/config.json` with
   `{"api": {"base_url": "https://knowledge.hi2vi.com", "token": "<vk_>"},
   "site": {"base_url": "https://knowledge.hi2vi.com"}}` — **no `kb_root`**. If a config
   file already exists, SHOW its current contents and ask before replacing — never
   silently clobber (a local self-host config may be there). Mention env-var overrides
   (`KB_API_BASE_URL`/`KB_API_TOKEN`) as the per-shell escape hatch.
4. Verification step in the skill: one authenticated
   `curl -sS --max-time 5 -H "Authorization: Bearer <vk_>"
   "https://knowledge.hi2vi.com/api/documents?limit=1"` → 200 = connected (401 → the
   key is wrong/revoked; explain what to do). Then report: `/explain` now saves to your
   tenant from any repo; documents render in the web app (`/documents`).
5. Scaffold mode: keep the existing interview/render/config flow — restructure only as
   needed to sit under the mode question; do not change its behavior.

## Other files

- `plugin/README.md`: the two-path story — hosted connect (zero infra, sign up + mint a
  key + `/knowledge:setup`) as the quick default; self-host scaffold as the full-control
  path. Keep it tight.
- `plugin/.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json`: description
  gains an "or connect to the hosted KB" clause (byte-same text in both). **No version
  bump** — 0.3.0 is unreleased; one release carries the phase.

Out of scope: web/, server/, cli/, `plugin/templates/` (S4), any live call to the
public host (prod lacks the accounts plane until S5), and the operator's REAL
`~/.config/knowledge-kb/config.json` — never read or write it.

## Validation (terse)

1. Temp-config resolver check: in a scratch dir, set `XDG_CONFIG_HOME=<scratch>`, write
   the exact connect-mode JSON there, run the explain skill's §2 resolver → expect
   `KB_STATUS=configured`, `KB_API_BASE_URL=https://knowledge.hi2vi.com`, token echoed,
   `KB_LOCAL_FALLBACK=no`. (Proves the config shape the new mode writes is exactly what
   the explain skill consumes.)
2. Cross-check the documented curl against `docs/current/api.md` (list route + bearer
   semantics) — no live call.
3. `claude plugin validate .` + `claude plugin validate ./plugin` (if CLI available);
   JSON sanity on the two manifests; `python3 scripts/workflow.py validate`.
4. `python3 scripts/skills_parity.py` still green (S2's guard — you touch no explain
   copy, it must stay green). `plugin_parity.py` NOT a gate (red until S4, known).

## Wrap-up

`result.md`: the connect-mode section as landed, decisions taken, validation outcomes.
`phase.md` appends: cross-slice notes for **S5** — exactly what the hosted E2E must
exercise for onboarding (fresh signup on the public host → project → mint → connect-mode
config → `/explain` posts with the user's `vk_` → renders in their tenant) — and Doc
impact lines (product/operations: plugin users onboard to the hosted KB via web signup +
key mint + setup connect mode; one key serves all repos). Never commit; never
transition status.

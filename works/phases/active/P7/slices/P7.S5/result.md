# Result — P7.S5: Setup skill

## What landed

`plugin/skills/setup/SKILL.md` — the one-time `/knowledge:setup` scaffolder. It is the
only source file this slice created (verified: `git status` shows just
`plugin/skills/setup/`). No third-party dependency and **no helper script** was added —
every action is spelled as an exact `python3 -c` probe, `render.py` CLI call, `git`,
`docker`, `mkdir`/`chmod`, or a Write-tool file write, in the style the explain skill
uses. `plugin.json` stays at `0.1.0`.

### Frontmatter / permission posture

- `name: setup`, `argument-hint: [target-dir]`, `disable-model-invocation: true` (setup
  only runs when the user asks), and `allowed-tools: Read, Glob, Bash(python3 -c:*)`.
- Only the read-only probes (`python3 -c`, `Read`, `Glob`) are pre-approved. Every
  mutation — running `render.py`, `mkdir`, the marker/config Write, `chmod`, `git`,
  `docker` — takes a normal permission prompt so the user sees each thing done to their
  machine on a first run. No broad `Bash(git:*)` / `Bash(docker:*)` pre-approval.

### The seven stages authored

1. Preflight — resolve `${CLAUDE_PLUGIN_ROOT}` (renderer at `setup/render.py`, templates
   resolve relative to it), detect `python3` (hard stop if absent), `git` (degraded: skip
   init), `docker` (decides stage 6).
2. Interview — accept `$ARGUMENTS` as target dir; ask site title / owner-repo (optional) /
   copyright / TZ / ports (advanced only); never collect the Gemini key; derive
   `KB_SITE_URL` (GitHub vs local-only), `KB_DATE`, host-TZ default; confirm summary before
   any disk write.
3. Target-dir safety — EMPTY → render; MARKED (`.kb-scaffold.json`) → reconfigure /
   re-render / abort; UNMARKED non-empty → refuse (covers the operator's own KB by
   construction).
4. Render + marker + git — `render.py` with all 7 `--set` tokens; write `.kb-scaffold.json`;
   `git init`/`add`/initial commit `chore: scaffold knowledge base (knowledge plugin v0.1.0)`;
   never push.
5. Config — nested `{kb_root, api:{base_url, token:null}, site:{base_url}}` at
   `$XDG_CONFIG_HOME/knowledge-kb/config.json` (default `~/.config/...`), `chmod 600`,
   prompt-before-overwrite (last-setup-wins, one config).
6. Bring-up — Docker: `docker compose up -d`, probe `/healthz` + viewer root, port-bind
   error → re-pick ports; no Docker: print the `uv sync` + `uvicorn` alternative and state
   `/knowledge:explain` still works via its file fallback.
7. Go-live — GitHub mode: create repo, add remote, user pushes, enable Pages (Actions),
   `pages.yml` gate; local-only: serve locally, add Pages later via reconfigure. Close with
   "try `/knowledge:explain <topic>`".

## Validation — all commands run, all passed

Test params for the rehearsal: site "Field Notes 2", owner/repo skipped (local-only,
`KB_SITE_URL=http://localhost:9765/`), TZ `Europe/Berlin`, ports 9765/9766, `KB_DATE`
`2026-07-14`, temp target + temp `XDG_CONFIG_HOME` + temp `HOME`.

1. `claude plugin validate ./plugin` → exit 0; `claude plugin validate --strict ./plugin`
   → exit 0.
2. **Scripted end-to-end rehearsal** (drove the SKILL.md's own commands):
   - (a) `render.py` from the skill → 35 files written; `mkdocs.yml`/`compose.yml` tokens
     substituted (site_name/site_url/copyright, ports 9765/9766, TZ Europe/Berlin); seed
     doc filename carries `2026-07-14`. `.kb-scaffold.json` written; marker JSON valid,
     `plugin_version` `0.1.0`, params-only, no secret-ish field.
   - (b) `git init` + `add -A` + initial commit → success; `git status` clean.
   - (c) config write → file exists, `stat` mode **600**, `api.token` is JSON `null`. The
     contract check: the explain skill's step-2 resolver snippet, **extracted verbatim**
     from `plugin/skills/explain/SKILL.md` (46 lines) and run under the rehearsal
     `XDG_CONFIG_HOME` in an isolated env, resolved `KB_STATUS=configured`,
     `KB_ROOT=<target>`, `KB_API_BASE_URL=http://localhost:9766`, `KB_API_TOKEN=` (empty),
     `KB_SITE_BASE_URL=http://localhost:9765`, `KB_LOCAL_FALLBACK=yes`. Setup's config and
     explain's resolver agree exactly.
   - (d) re-run semantics: classify returns MARKED for the rendered target; `render.py
     --force` with unchanged params leaves `git status` clean; a non-empty dir without the
     marker classifies UNMARKED (refusal path); `render.py` itself refuses a non-empty dir
     without `--force` (exit 2).
   - (e) scaffold gate: `docker run --rm -v <target>:/docs squidfunk/mkdocs-material:9.7.6
     build` → built; `python3 <target>/scripts/site_smoke.py --root <target>` → **PASS**.
   - (f) `docker compose up -d --build` in the temp target (ports 9765/9766) → both
     containers up; `/healthz` → `{"status":"ok","docs_root":"/repo/docs","db":"ok",
     "documents":1}` (seed doc indexed); viewer root → `200`. Torn down with `docker
     compose down -v`, rehearsal-built image removed, temp dirs deleted — no artifacts
     linger.
3. `python3 scripts/workflow.py validate` → passed.
4. Sanity: `python3 scripts/plugin_parity.py` → still PASS (adding a skill file does not
   touch `shipped_dirs`/manifest classes, so parity is unaffected).

All temp artifacts (containers, network, rehearsal-built `kb-target-api` image, temp
directories under scratchpad) were cleaned up. The pre-existing
`plugin/setup/__pycache__/render.cpython-313.pyc` is git-ignored and untouched.

## Doc impact (appended to phase.md)

- `operations — /knowledge:setup flow: interview → render → marker → git init → config
  (600) → compose up/healthz or no-Docker path → Pages go-live checklist; re-run =
  reconfigure/re-render/abort via .kb-scaffold.json marker. [S5]`
- `security — setup never collects/writes secrets (Gemini via host env only; config chmod
  600; token null by default); refuses unmarked non-empty targets. [S5]`

## Deviations from plan.md

None of substance. Notes:
- Chose to author the flow with **no** optional stdlib helper (the plan permitted one) —
  exact `python3 -c` / CLI commands kept the body honest and small, matching the explain
  skill's convention.
- Config file and `.kb-scaffold.json` marker are written via the Write tool (which prompts,
  as a visible mutation should) rather than a `python3 -c` json.dump — this both keeps those
  mutations prompt-visible and avoids passing values (copyright can contain spaces/Unicode)
  through shell arguments, mirroring the explain skill's temp-file discipline.
- Stage 6 uses `docker compose -f <target>/compose.yml up -d`; the skill notes to run it in
  the target so `build: .` and the `.:/docs` mount resolve to the scaffold.

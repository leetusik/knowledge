# Plan — P7.S5: Setup skill

Orchestrator plan (auto run). Executor: slice-executor-high — the most complex control flow of the phase; you own the detailed design within this spec. Read FIRST: `phase.md` (Decomposition P7.S5; Findings — S3's landed block for the renderer/manifest/placeholder/seed facts and S4's landed block for the EXACT nested config schema; Constraints) and, as needed, `plugin/setup/render.py` itself + `plugin/skills/explain/SKILL.md` (the contract you must hand off to). No commits, no status transitions.

## Goal

`plugin/skills/setup/SKILL.md` — the one-time scaffolder invoked as `/knowledge:setup` after install. It interviews the user, renders their KB from the plugin's templates, initializes git, writes the config file the explain skill reads, brings the stack up (or prints the no-Docker alternative), and hands them the GitHub Pages go-live steps. It must be safe to re-run.

Optionally, if it keeps the skill body honest and small, you MAY add one stdlib helper under `plugin/setup/` (beside render.py) — but prefer spelling exact `python3 -c`/CLI commands in the SKILL.md the way the explain skill does. Never a third-party dependency.

## Frontmatter

```yaml
---
name: setup
description: <scaffold your own knowledge base (MkDocs site + document API + knowledge graph + Pages workflow) and wire /knowledge:explain to it; run once after installing the plugin, or re-run to reconfigure>
argument-hint: [target-dir]
disable-model-invocation: true
---
```

`disable-model-invocation: true` is deliberate — setup must only run when the user asks. Choose allowed-tools narrowly (`Read`, `Glob`, `Bash(python3 -c:*)` at most); the flow's mutating commands (mkdir/git/docker/chmod) should take normal permission prompts — the user SHOULD see each one on a first run. Do not pre-approve broad `Bash(git:*)`/`Bash(docker:*)`.

## The flow (design the SKILL.md around these stages)

1. **Preflight** — resolve `${CLAUDE_PLUGIN_ROOT}` (the skill's own payload root; render.py = `${CLAUDE_PLUGIN_ROOT}/setup/render.py`, templates beside it — but note render.py already resolves templates relative to itself). Detect: `python3` (required — hard stop without it), `git` (recommended; degraded path: skip init with a warning), `docker` (optional; decides stage 6).
2. **Interview** (accept `$ARGUMENTS` as the target dir when given; ask for the rest, offering defaults):
   - target dir — default `~/knowledge`; expand `~`.
   - site title — default "Knowledge Base".
   - GitHub `owner/repo` — OPTIONAL. Given → `KB_SITE_URL=https://<owner>.github.io/<repo>/`; skipped → local-only mode, `KB_SITE_URL=http://localhost:<viewer_port>/`.
   - copyright holder — default the site title (feeds `KB_COPYRIGHT`; keep the template's expected value shape — check how S3's mkdocs.yml template embeds the token).
   - timezone — default from the host (e.g. `python3 -c` reading `/etc/localtime` target or `TZ`); fall back to `UTC`.
   - viewer/API ports — defaults 8765/8766, only ask if the user wants non-defaults ("advanced").
   - Gemini API key — do NOT collect the key itself. Just explain: set `GOOGLE_API_KEY` (or `GEMINI_API_KEY`) in the shell/compose env later; search degrades to keyword-only without it. NEVER write a key anywhere.
   - `KB_DATE` = today (the seed doc's date).
   - Then show a confirm summary before touching disk.
3. **Target-dir safety** — empty/missing dir → proceed. Non-empty WITH `.kb-scaffold.json` marker → re-run mode: offer (a) reconfigure only (skip to stage 5), (b) re-render (invoke render.py `--force`, then show `git status`/diff and tell the user to review — only meaningful if the dir is a git repo), (c) abort. Non-empty WITHOUT the marker → refuse plainly (never render into a dir we don't own). The operator's own KB (`~/projects/personal/knowledge`) has no marker → refusal covers it by construction.
4. **Render + marker + git** — run render.py with `--dest` + the `--set` pairs (exact placeholder keys per S3's findings). Write `.kb-scaffold.json` into the target: `{"plugin": "knowledge", "plugin_version": "0.1.0", "rendered_at": <ISO date>, "params": {<the non-secret params>}}`. Then (git present) `git init` + `git add -A` + an initial commit — message `chore: scaffold knowledge base (knowledge plugin v0.1.0)` with the plugin as author context; never push.
5. **Config file** — write the EXACT nested schema from S4's findings (`kb_root`, `api.base_url` = `http://localhost:<api_port>`, `api.token` = null, `site.base_url` = `http://localhost:<viewer_port>`) to `$XDG_CONFIG_HOME/knowledge-kb/config.json` (default `~/.config/knowledge-kb/config.json`), creating the dir, `chmod 600` the file. If a config already exists: show it and ask before overwriting (reconfigure path rewrites it; a second KB is out of scope — one config, last-setup-wins, say so plainly).
6. **Bring-up** — Docker present: `docker compose up -d` in the target (NOTE for the skill text: first build takes minutes; the operator's own stack may already hold 8765/8766 — pick different ports back in stage 2 if the probe fails with a bind error), then probe `curl -sS --max-time 5 http://localhost:<api_port>/healthz` and the viewer root; report both. No Docker: print the uv/pip alternative (`uv sync` + `uv run uvicorn server.main:app --port <api_port>`, or serve the site alone with the mkdocs-material image later) AND state clearly that even with nothing running, `/knowledge:explain` still works through its file fallback.
7. **Go-live handoff (printed checklist)** — GitHub mode: create the repo, `git remote add origin … && git push -u origin main`, enable Pages (Settings → Pages → Source: GitHub Actions), first deploy runs `pages.yml` (build + site_smoke gate), site at the `KB_SITE_URL`. Local-only mode: say the site serves at the viewer URL and Pages can be added later by re-running setup (reconfigure) with an owner/repo. Close with: "try `/knowledge:explain <topic>`".

## Cross-skill contract checks (the crux of this slice's validation)

The scaffold this skill produces and the config it writes MUST be exactly what the other pieces consume: render.py's params (S3), the explain skill's resolver schema (S4), and the scaffold's own deploy gate (S1/S3).

## Validation (run all; record outcomes; clean up temp artifacts)

1. `claude plugin validate ./plugin` and `--strict` → exit 0.
2. **Scripted end-to-end rehearsal** of the skill's own commands (drive exactly what the SKILL.md spells, with test params — site "Field Notes 2", owner/repo skipped [local-only], TZ `Europe/Berlin`, ports 9765/9766, temp target + temp `XDG_CONFIG_HOME` + temp `HOME` where sensible):
   a. render.py invocation from the skill → scaffold renders; `.kb-scaffold.json` written; marker content sane.
   b. git init + initial commit succeed in the temp target.
   c. config write → file exists, mode 600, and — the contract check — S4's resolver snippet (extract it verbatim from `plugin/skills/explain/SKILL.md`) run against this `XDG_CONFIG_HOME` resolves kb_root/base_url/site URL to the rehearsal values with `KB_LOCAL_FALLBACK=yes`.
   d. re-run semantics: marker present → the three options stand (mechanically: render.py `--force` re-render leaves a clean `git status` when params are unchanged); non-empty unmarked dir → refusal path exercised (assert the skill's stated check would refuse: presence test is `python3 -c` level).
   e. scaffold still passes its gate: `docker run --rm -v <target>:/docs squidfunk/mkdocs-material:9.7.6 build` + `python3 <target>/scripts/site_smoke.py --root <target>` → PASS.
   f. OPTIONAL but attempt it: `docker compose up -d` in the temp target (ports 9765/9766 avoid the operator's stack), probe `/healthz` → `{"status":"ok"}`, then `docker compose down -v` and remove the temp dirs. If you skip or it fails for an environmental reason, say exactly why — the compose build itself was proven in S1.
3. `python3 scripts/workflow.py validate`.

## Wrap-up

- Append to `phase.md` Findings: a "P7.S5 landed" block — the interview params & defaults, marker schema, re-run semantics, and anything S6's E2E must drive (exact commands to simulate a user run).
- Append Doc impact lines: `operations — /knowledge:setup flow: interview → render → marker → git init → config (600) → compose up/healthz or no-Docker path → Pages go-live checklist; re-run = reconfigure/re-render/abort via .kb-scaffold.json marker. [S5]` and `security — setup never collects/writes secrets (Gemini via host env only; config chmod 600; token null by default); refuses unmarked non-empty targets. [S5]`.
- Keep `plugin.json` at 0.1.0.
- Write `result.md` from scratch; return the structured verdict.

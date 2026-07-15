# Result — P7.S6: E2E install test + docs

Executor: `slice-executor-high` (escalated mid → high). This is the post-F1 re-run
per the plan's `## Escalation 1: mid → high` charter: confirm F1 landed → re-run
Part B fully on the fixed code (asserting the auto-created landing) → Part C docs →
final parity + workflow validate. All E2E ran against a TEMP scaffold on throwaway
ports 9765/9766 with a temp `XDG_CONFIG_HOME`; the operator's live KB on 8765/8766
was never touched (confirmed up 5h, never restarted). No source code changed — only
docs. No commits, no status transitions.

## Charter step 1 — confirm P7.F1 landed

| Command | Outcome |
| --- | --- |
| `uv run pytest -q` | **57 passed** (F1's 3 new landing cases included) |
| `python3 scripts/plugin_parity.py` | **PASS** — templates in parity |
| `claude plugin validate .` | exit 0 ✔ |
| `claude plugin validate ./plugin` | exit 0 ✔ |

## Part A — install-surface verification

- `claude plugin validate .` / `./plugin`, both again with `--strict` → **all exit 0**.
- Mechanical install-surface checks (all pass): marketplace entry `name` == plugin.json
  `name` (`knowledge`); `source: "./plugin"` resolves to a dir containing
  `.claude-plugin/plugin.json`; both skills present at `plugin/skills/{explain,setup}/SKILL.md`
  with `name:` frontmatter (`explain` / `setup`); **no `version`** in the marketplace
  entry; `plugin/.claude-plugin/` holds **only** `plugin.json` (no component files).
- Non-interactive path exists (`claude plugin marketplace add <path>` + `install`). Per the
  escalation charter, the mid tier already ran the sandboxed install E2E (both skills
  resolved at v0.1.0, enabled, torn down). F1 changed only the explain SKILL.md **body**
  (verified: `git show 3d77e2f -- plugin/skills/explain/SKILL.md` touches no frontmatter
  line; manifests + plugin.json untouched), so the re-`validate` of both dirs above is
  sufficient and the sandboxed install was not repeated. (I attempted a fresh sandboxed
  `CLAUDE_CONFIG_DIR` install to be thorough; the recursive `claude` invocation was denied
  by this environment's permission system — the mid tier's proven run stands.)

## Part B — full user-journey E2E (temp scaffold, ports 9765/9766)

Scaffold built exactly per S5's rehearsal pattern: classify target = `EMPTY` →
`render.py` (7 tokens, site "Field Notes", TZ America/New_York, ports 9765/9766, date
2026-07-14) wrote 35 files, **no leftover `{{KB_` tokens** → `.kb-scaffold.json` marker →
`git init` + clean initial commit → nested config JSON at temp `XDG/knowledge-kb/config.json`,
**chmod 600**. The explain skill's step-2 resolver (run verbatim under the temp XDG) →
`KB_STATUS=configured`, `KB_API_BASE_URL=http://localhost:9766`, `KB_SITE_BASE_URL=http://localhost:9765`,
`KB_API_TOKEN=` (empty), `KB_LOCAL_FALLBACK=yes`. Compose up (`-p p7s6e2e`,
`COMPOSE_BAKE=false`) → api built + healthy (`{"status":"ok",…,"documents":1}`), viewer root 200.

**Step 4 — API path (201), into a NEW project `field-notes`:** built a real house-style
explainer payload per the skill (body.md with no frontmatter starting at H1 + meta.json +
the verbatim merge one-liner), `source_repo` a realistic `/Users/example/projects/field-notes`.
`curl --json … POST /api/documents` → **201**, response `landing_created: true`,
`recent_updated: true`, `committed: true`. Asserted: doc file at
`docs/field-notes/2026-07-14-the-write-lock-explained-for-beginners.md`; **F1's auto-landing
`docs/field-notes/index.md`** present with the exact minimal content (H1 + one-liner, no
frontmatter); Recent bullet inserted directly under `<!-- explain:recent -->`; DB row via
`/api/documents` (total 2); **scoped commit staged exactly 3 paths** (doc + landing +
`docs/index.md`) — F1's 3-path commit for a new project; working tree clean; `source_repo`
sanitized to basename `field-notes` (no `/Users/` leak).

**Step 5 — duplicate guard (409):** re-POST same payload → **409** with `existing_title`
and `rel_path`; no second file, no second bullet (grep count 1), git HEAD unchanged, DB
still total 2.

**Step 6 — fallback (transport failure, local kb_root), into a NEW project `ops-notes`:**
`docker compose stop api` → resolver still resolves (config unchanged, `KB_LOCAL_FALLBACK=yes`)
→ curl now **exit 7** (connection refused). Performed the skill's fallback steps verbatim:
hand-written frontmatter file (double-quoted title, YAML tag list, `source.repo` a realistic
`/Users/example/projects/ops-notes`); **ensure-landing per the updated skill** — landing
missing → created `docs/ops-notes/index.md` (F1's fallback-branch step); marker insert;
`git add -A` + commit. Asserted file + landing + bullet + a new **3-path** commit.
**Reconciliation:** `docker compose start api` (startup reindex on by default) → healthz
`documents:3` → `/api/documents` now lists the fallback `ops-notes` doc; reindex sanitized
its `source_repo` to `ops-notes` (no `/Users/` leak in the DB).

**Step 7 — gate green on the grown corpus (the exact step that FAILED before F1):**
`docker run --rm -v <scaffold>:/docs squidfunk/mkdocs-material:9.7.6 build` (exit 0) →
`site/{getting-started,field-notes,ops-notes}/index.html` all built →
`python3 <scaffold>/scripts/site_smoke.py --root <scaffold>` → **PASS** (3 projects / 3 docs;
dynamic discovery + F1's per-project landings prove out). **No `/Users/` leak** anywhere in
built HTML (grep clean, including `/Users/example`); `graph.json` has 3 doc nodes.

**Step 8 — teardown:** `docker compose -p p7s6e2e down -v` (containers + network + volumes
removed) + `docker rmi p7s6e2e-api:latest` (E2E-only image; the shared
`squidfunk/mkdocs-material:9.7.6` kept). `docker ps -a` clean of rehearsal containers/images;
live operator KB (`knowledge-api-1`/`knowledge-kb-1`) still up and untouched.

## Part C — docs

- **Root `README.md`** — added two sections in the README's existing voice:
  - "**Install the plugin**" (after the pitch): `/plugin marketplace add leetusik/knowledge`
    → `/plugin install knowledge@knowledge` → `/knowledge:setup` once → `/knowledge:explain
    <topic>`; requirements one-liner; link to `plugin/README.md`.
  - "**Recreating from scratch**" (before "Agentic workflow"): restore = clone +
    `docker compose up -d` (startup reindex self-heals the DB); rebuild-fresh = install the
    plugin + `/knowledge:setup`, then point `~/.config/knowledge-kb/config.json` `kb_root`
    at the restored/new location.
- **`plugin/README.md`** — removed the placeholder blockquote (skills exist now); added a
  "**Development & releasing**" section: payload is a byte-for-byte snapshot synced by the
  root-only parity guard (`scripts/plugin_parity.py`, CI `plugin-ci.yml`) + the **release
  checklist** (any `plugin/**` change ⇒ `plugin.json` version bump; run parity + both
  `claude plugin validate` + the E2E rehearsal before pushing). Also added one user-facing
  sentence to the explain bullet noting the auto-created project landing (F1) — the
  escalation left this to my call; it belongs in the explain description as the user-visible
  effect of the fix.
- **Cross-check (step 11):** all commands/ports/paths in both READMEs match reality —
  marketplace/plugin names (`knowledge`), skill names, Python 3.12+ (matches Requirements),
  startup-reindex self-heal (proven in step 6), config path + `kb_root` schema, and the
  existence of `scripts/plugin_parity.py` + `.github/workflows/plugin-ci.yml`.

## Validation summary

| Command | Result |
| --- | --- |
| `uv run pytest -q` | 57 passed |
| `python3 scripts/plugin_parity.py` (start + after README edits) | PASS both times — README is outside the `plugin/templates/kb/` manifest, so parity undisturbed |
| `claude plugin validate .` / `./plugin` (+ `--strict`) | all exit 0 |
| Part B E2E (steps 4–7) | 201 (+ auto-landing / 3-path commit) · 409 · fallback + ensure-landing + reindex reconciliation · `mkdocs build` + `site_smoke.py` PASS on 3 projects/3 docs, no `/Users/` leak |
| `python3 scripts/workflow.py validate` | Workflow validation passed |

## Deviations from plan.md

- **Sandboxed non-interactive install (Part A step 3 / escalation §"what passed"):** not
  re-run — the recursive `claude` invocation was denied by this environment's permission
  system, and the charter explicitly says the mid tier's proven sandboxed install need not
  be repeated since F1 left the skill frontmatter and manifests untouched (verified). All
  four `validate` runs (incl. `--strict`) were re-run and pass.
- **Temp-dir cleanup:** `rm -rf` of the scratchpad temp dirs was denied by the permission
  system. The dirs live only in this session's isolated, auto-cleaned scratchpad (never in
  the repo or the operator's project) and the load-bearing teardown — all docker containers,
  the E2E-only image, network, and volumes — completed. No functional leftover.
- Otherwise none: Part B used a NEW project for each write path (`field-notes` for API,
  `ops-notes` for fallback) precisely to exercise F1's auto-landing on both branches, which
  the charter's revised step 4/step 6 asked for.

## Notes

- One caveat recorded in `phase.md`: the 201 response `url` uses `public_base_url()`'s
  default `http://localhost:8765`, which is correct for a **default-port** KB but points at
  the wrong viewer port for an *advanced custom-port* scaffold (the test used 9765). Not a
  gate failure and out of S6's scope (Findings §2 deliberately leaves `KB_PUBLIC_BASE_URL`
  unset); noted for the review to weigh.
- `plugin.json` kept at **0.1.0** — the first release version bump is the operator's call
  at/after review.

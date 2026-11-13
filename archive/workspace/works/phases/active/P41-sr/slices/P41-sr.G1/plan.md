# P41-sr.G1 — Alt text that reads aloud well, and the plugin release

## Goal

1. **Teach the explain writer to write for the ear.** A figure, diagram or svg's alt text, label, title and caption,
   and a formula's `alt` and `reading`, are now read aloud by Listen. The rules must make them sound right spoken.
2. **Teach the critic to check it.**
3. **Release the plugin** as the next minor version, carrying the Listen server template that B1 and B2 mirrored.

Read first:
- The breakdown block: `phase-section P41-sr "P41-sr.G1 — Alt text that reads aloud well, and the plugin release" --topic
  breakdown`.
- **S1's read and skip table:** `topics/decisions.md` § Decisions 4, and `server/spoken.py`. It sets exactly what is
  read, in what order: a figure's alt, label or title, then its caption; a formula's alt, reading and "sym: means";
  inline math as linear text; an inline image's alt. It also sets what is skipped: code, hr, quiz, sources, glossary.
  Your rules must match it. Never promise the writer something S1 does not do.
- **P39-hk.S11's release:** `works/phases/*/P39-hk/slices/P39-hk.S11/plan.md` and `result.md` (find the path with
  `ls works/phases/*/P39-hk/slices/`). Follow its pattern and its checklist.

## The writing rules (in `plugin/skills/explain/SKILL.md`, Part A, at the figure, figure-row, diagram, svg and formula passages)

Add short, concrete rules, in the skill's own voice and format. Do not restructure the skill.

- **Alt text is a sentence a listener can follow without the picture:**
  - it says what the figure shows and the point it makes;
  - it never says "image of" or "diagram showing";
  - it never relies on colour or position alone;
  - it gives no list of every box.
- **Read aloud with what follows it:** a figure's label or title and its caption follow the alt, so they should not
  repeat it word for word.
- **A formula's `reading`** is the way a person would say it ("x squared plus one"), not LaTeX words. Each "sym: means"
  line reads as a short clause.
- **Symbols and abbreviations** in alt text and readings are written as they are spoken, where a speech engine would
  stumble: units, arrows, slashes, ≥.
- **Long tables are read row by row.** Where a table is long, consider whether a figure or a short summary paragraph
  serves the listener better. This is advice only: S1 reads table rows, and the player may skip them later.
- **Korean documents follow the same rules,** in natural Korean.

Keep the additions small: a few lines each, plus at most one short good/bad example pair.

## The critic's check (Part B)

- Add one check to Part B: alt text, captions and formula readings read well aloud by the rules above. A finding names
  the block and what a listener would hear wrong.
- `plugin/agents/explain-critic.md`'s body is generated from Part B: regenerate it with
  `python3 scripts/skills_parity.py --write-agents`. Never hand-edit it.

## The release (P39-hk.S11's pattern)

- **The version:** `plugin/.claude-plugin/plugin.json` goes from `0.11.0` to **`0.12.0`**. The same version goes in
  `.claude-plugin/marketplace.json` and in setup's `plugin_version` (`plugin/skills/setup/SKILL.md`).
- **The release notes** in `plugin/README.md`, in place, in its existing format:
  - the explain skill writes alt text and formula readings for the ear, and the critic checks it;
  - the server template carries Listen's server half: the spoken script, the job queue and its API, and the audio
    delivery.
  - Say plainly that Listen needs Postgres (`DATABASE_URL`) and a voice runner, which the plugin does not ship, so in
    a plugin install the routes exist but make no audio.
  - Keep S11's deploy checklist lines that still apply.
- **The skill's two copies:** `.agents/skills/explain/SKILL.md` and `web/public/SKILL.md`, synced the way S11 synced
  them, by `skills_parity.py` or as its result says.
- **The landing's skill-length line,** `web/src/content/marketing/content.ts`, which reads "2,722 lines" today:
  update it to the new count, counted as S11 counted.
- **The root `README.md`:** only if it names the plugin version.

## Validation

- `python3 scripts/skills_parity.py`: exit 0, after `--write-agents`;
- `uv run python scripts/plugin_parity.py`: exit 0;
- `git diff --stat` covers only your set;
- **deferred: whole-tree**, run by REVIEW:
  - the full pytest;
  - the web lint, test and build. W1 is changing `web/` beside you and holds `web/node_modules`.

  List them in `validation`.

## Return

- `result.md`, with the verdict block first.
- The `notebook` field holds:
  - **Doc impact:** `product.md`: the explain writer's alt and reading rules for listening, and the plugin 0.12.0;
  - **Now:** one line.

## Wave

- **set:** `plugin/skills/explain/**`, `plugin/agents/explain-critic.md`, `.agents/skills/explain/SKILL.md`,
  `web/public/SKILL.md`, `plugin/.claude-plugin/plugin.json`, `plugin/README.md`, `.claude-plugin/marketplace.json`,
  `plugin/skills/setup/SKILL.md`, `web/src/content/marketing/content.ts`, and `README.md` only if it names the version.
  **Never `plugin/templates/**`.**
- **Runtime resources held:** none.
- **Running beside it:**
  - **P41-sr.B3**, set: `tools/listen-runner/**` and `.gitignore`. Runtime: the container `p41-b3-pg` on :55453 and
    the API on :8793.
  - **P41-sr.W1**, set: `web/src/app/layout.tsx`, `web/src/app/reader.css`, `web/src/app/(public)/[org]/[project]/[slug]/page.tsx`,
    `web/src/components/listen/**`, `web/src/components/reader/**`, `web/src/lib/listen/**`, `web/src/lib/reader/**`,
    `web/src/lib/knowledge/listen.ts`, `web/src/content/listen.ts`, `web/src/content/index.ts`, `web/src/lib/csp.ts`,
    `web/src/proxy.ts`, `web/package.json`, `web/pnpm-lock.yaml`, `web/tests/listen-player*.test.ts`.
    - Runtime: the agent's Chrome; :8766, :3030 and :3041; the container `p41-w1-pg` on :55451; `web/node_modules`.
- **Waiting commits:** none.
- **Join-rebuilt artifact:** none.
- **Checks scoped to the set:** the two parity scripts. Everything else is deferred: whole-tree.

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh

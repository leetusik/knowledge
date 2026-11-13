# P39-hk.F5 result: the explain front door names v94, the bootstrap release that carries S5's package

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** The explain front door now tests workspace **94 or later** plus `**phases**`. Both refusals and every "v92" in the plugin's copy name v94: 25 mentions on 24 lines in 9 files. The package's record says it landed as bootstrap `d6856a8` on v93, released as v94 (`1f02da5`, 2026-11-06), and `apply.py` pins v93's 20 skills. Read-only proof: `finds.py` finds 18 of 18 exactly once at v93; `apply.py` passes there; the tree it produces equals `d6856a8` except for one line the bootstrap session edited itself. A v94 install passes the front door with `cites.py` missing=0, and a v93 install is refused with the v94 text.
- **files_changed:**
  - `plugin/skills/explain/SKILL.md`: L3, L25, L282, L286, L290
  - `.agents/skills/explain/SKILL.md`: L3, L23, L280, L284, L288
  - `web/public/SKILL.md`: L3, L25, L282, L286, L290 (still a byte copy of the canonical file)
  - `plugin/README.md`: L15, L50, L54 (two mentions on L54)
  - `plugin/skills/setup/SKILL.md`: L170, L461
  - `plugin/.claude-plugin/plugin.json`: L4
  - `.claude-plugin/marketplace.json`: L11
  - `README.md`: L37
  - `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md`: L72
  - `works/phases/active/P39-hk/package/README.md`: L3 (new landed line), L67, L79
  - `works/phases/active/P39-hk/package/PATCHES.md`: L3 (new landed line), L421–L422
  - `works/phases/active/P39-hk/handoff-explain.md`: L3 (new landed line), L56, L60, L62, L67, L71, L80, L98, L101
  - `works/phases/active/P39-hk/package/checks/apply.py`: L5 (docstring: the commit it runs at), L94 (skill count 19 → 20)
  - `works/phases/active/P39-hk/phase.md`, through `phase-section` only: Decisions entry 25 replaced, one Doc impact line, one note, Now
  - `works/phases/active/P39-hk/slices/P39-hk.F5/result.md` (this file)
- **validation:**
  - `python3 scripts/skills_parity.py`: PASS (web copy byte-identical)
  - `python3 scripts/plugin_parity.py`: PASS
  - `wc -l plugin/skills/explain/SKILL.md` = 2492 = `content.ts` "2,492" (L251, L261). Unchanged, so `content.ts` was not touched.
  - `uv run pytest tests/test_explain_resolver.py -q`: 2 passed
  - `uv run pytest -q`: 183 passed, 60 skipped
  - `pnpm --dir web typecheck`: exit 0. `pnpm --dir web lint`: exit 0. `pnpm --dir web exec vitest run`: 41 files, 589 tests passed.
  - Product-tree grep for `v92|92 or( |$)|92 or later` (excluding `works/`, `docs/versions/`, `node_modules`, `.next`, `.git`, `.claude`, `pnpm-lock`): two hits, both `scripts/workflow.py` L14680 and L14694. They are a deferred-job id example ("92, D92 or 92-x4"), not the explain release.
  - v86 grep (`grep -rn "v86" plugin README.md .claude-plugin web/public/SKILL.md`): empty. "86 or later" in `plugin README.md .claude-plugin web/public web/src tests server scripts`: empty.
  - `git status --porcelain .claude/`: empty
  - `python3 scripts/workflow.py validate`: passed. Only the pre-existing warnings remain; the pointer warning my first Decisions edit caused is fixed.
  - The bootstrap repo is untouched: `git status --porcelain` empty, HEAD `1f02da5`.
- **landed-as-handed-off proof:** every item passed (§ The proof below).
  - `finds.py` at `f72fb9f`: 18 of 18, each exactly once.
  - `apply.py` with the count at 20, on a scratch copy of v93: pass.
  - Applied against `d6856a8`: identical but for one line in `explain-decomposition.md` L13, "v86–v91" → "v86–v93". The bootstrap session made that edit itself, and it does not touch the handshake.
  - The release fragment's bullets equal `CHANGELOG.md` `## v94` byte for byte, and its line 1 is the v94 release subject.
  - At v94: `WORKSPACE_VERSION = 94`, and the explain route lists `- **phases**:` (create-phase L142).
  - `cites.py` (the plugin's canonical SKILL) over v94's shipped files: 119/15, missing=0. Over a v94 install's `.claude/**/*.md` and `docs/current/operations.md`: 218/28, missing=0 (S5's measure). A v93 install: missing=85.
  - Optional front-door walk: ran. A v94 at-root install is ready; a v93 one is refused with the v94 text.
- **deviations:**
  1. **Decisions: I replaced entry 25 instead of appending a new one.** It was S5's "version handshake (v92 expected)". The notebook rule is to replace a superseded line, never stack a second version of it. The new line carries the plan's three facts and keeps S5's pointer to `topics/decisions.md` § Decisions 25 for the v92 detail.
  2. **The site count is 25 mentions on 24 lines, not 21.** The review counted 4 per SKILL copy. Each copy has 5: the frontmatter `description:` line (L3) also says "Needs a workflow workspace v92 or later". The rest matches the review: 3 lines in `plugin/README.md` (4 mentions, two on L54), 2 in setup, 1 each in `plugin.json`, `marketplace.json`, `README.md` and the template.
  3. **Small additions in my Set beyond the plan's wording, each to keep the record consistent with `apply.py`'s new 20:**
     - The landed lines in README and handoff add that v92 added the `pr` skill. PATCHES' landed line adds the same, plus the finds and diff result.
     - `apply.py`'s docstring now names v93 (`f72fb9f`) as the commit it runs at; it said "the pinned commit", which meant `bb525b9`.
     - The handed-off "the count stays 19" sentences are left as written (README L38, PATCHES L29, handoff L85). Their claim, no skill added or removed, still holds.
- **doc_impact_added:** `- **(P39-hk.F5)** qa.md, operations.md, product.md, decisions.md: supersedes S5's and S11's v92: the explain front door needs workspace v94 or later plus `**phases**`, and both refusals name v94; bootstrap v94 (`1f02da5`) is the release that carries S5's package (v92 and v93 went to other work)`

## The fix

### 1. The product sites

Every product mention of the release the explain needs went from v92 to v94. The edit is a literal `v92` → `v94`, plus `**92 or` → `**94 or` at the end of step 2's line. No line was rewrapped, so no line count moved.

Before editing, I grepped each of the nine files for "92". Every hit was the explain release, so no "92" with another meaning was in these files.

The front door's step 2 (canonical L282–L292) keeps both conditions: `workspace_version` **94 or later**, **and** `## The explain route` lists `**phases**`. The "No workspace" refusal (L286) and the "Too old" refusal (L290) both name v94.

`web/public/SKILL.md` was byte-identical to the canonical file before and after. `web/pnpm-lock.yaml` was not touched.

Word-level diff over the nine files: 12 `(v92` → `(v94`, 9 `v92` → `v94`, 1 `v92's` → `v94's`, 3 `**92` → `**94`. That is 25 mentions.

### 2. The package's record

- **`package/README.md`:**
  - L3, new: "**Landed:** the bootstrap's `d6856a8` on v93 (`f72fb9f`), released as **v94** (`1f02da5`, 2026-11-06)…"
  - L67, the order to apply it: "One release (the next after v91 that carries it: **v94**)".
  - L79: `--release` "stamps v94".
- **`package/PATCHES.md`:**
  - L3, new: the landed line, with the finds and diff result.
  - §10.6 (L421–L422): the stamp is v94, its `## v94` section, and the commit `build(release): workspace v94 — …`.
  - No find block, replacement block or §9 fragment changed. These are the texts the bootstrap applied. `apply.py` and `finds.py` read them, and both were re-run after the edit (pass).
- **`handoff-explain.md`:**
  - L3, new: the landed line.
  - §4: L56 now says it landed as v94, after v92 and v93. L60 reads "**94 or later**", and L62 says the refusals name v94.
  - §4's order (L67, L71), §5 (L80 `## v94`) and §7 (L98, L101) name v94.
  - The bootstrap-first window (L71) now reads "a v94 workspace with plugin 0.9.x". That is still true: v94's route refuses an older plugin's proposal.

### 3. `package/checks/apply.py`

The count is pinned at `assert len(skills) == 20`: v93 (`f72fb9f`) has 20 skills, because v92 (`646d2da`) added `pr` (`6c1129b`, an ancestor of `646d2da`).

## The proof (read-only on the bootstrap repo)

**How it was read.** Only `git -C <bootstrap> log`, `show`, `archive`, `merge-base --is-ancestor`, `status` and `rev-parse` were run. Each tree was archived into the scratchpad as a tar, then extracted (`/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/f5/`: `v93/`, `d6856a8/`, `v94/`). `finds.py` reads with `git show`.

- **History:**
  - `main` and `origin/main` are both at `1f02da5`, "build(release): workspace v94 — An explain is written from the code and the phases' records…".
  - Its parent is `d6856a8` (2026-11-06 16:42), which sits on `f72fb9f` (v93).
  - v92 is `646d2da` (2026-11-05, the PR rule). v93 is `f72fb9f`.
- **`finds.py <bootstrap> f72fb9f`:** `finds checked=18 not-exactly-once=0 at f72fb9f`. Each count is 1. Most line hints moved since `bb525b9`, which is why the finds match by quoted text, not by line:
  - create-phase's heading: L121 → L125 (L33 stayed put);
  - `installer/main.py`: L3112–L3113 → L3239–L3240;
  - `README.en.md`: L541 → L548;
  - the smoke suite's finds: L229–L273 → L234–L278.
- **`apply.py`** on a scratch copy of v93's `payload/`, `installer/`, `README.en.md` and `tests/retrofit_smoke.sh` (`…/f5/applied2`, run after the PATCHES edit):
  - `smoke explain block: lines 211-302 passed`
  - `other pins on these files: passed; skill count 20`
  - `create-phase core bytes: 40523` (39,388 at `bb525b9`; v92 and v93 grew create-phase)
  - A first run, before the PATCHES edit (`…/f5/applied`), gave the same output.
- **Applied tree vs `d6856a8`:**
  - Ten of the eleven touched files are byte-identical: `explain-chapter.md`, `explain-review.md`, create-phase `SKILL.md`, `slice-executor.md`, `worktree.md`, parallel-phase `SKILL.md`, `installer/payloads/doc_bodies/operations.md`, `README.en.md`, `installer/main.py` and `tests/retrofit_smoke.sh`.
  - `diff -rq` over the whole `payload/` and `installer/` trees finds nothing else (only the `__pycache__` the import made).
  - **The one difference:** `payload/claude/skills/do-whole-phase/reference/explain-decomposition.md` L13. The package's "**one from v86–v91** has `run:` and `mode:` lines…" landed as "**one from v86–v93**…". The bootstrap session edited this itself, because the release came after v93. It is about reading an older `## Explain` section and does not touch the handshake.
  - **The handshake at `d6856a8` is intact:**
    - the sixteen-line set with `phases:` (decomposition L11);
    - `- **phases**:` in create-phase's explain route;
    - the plugin floor 0.10.0 (create-phase ×3, decomposition ×1, `installer/main.py` "(plugin 0.10.0+)"), with no `0.6.0` left in those files.
  - **Files the package names but `apply.py` does not produce:**
    - The §9 fragment, `changelog.d/explain-from-the-phases.md`. It is not in `d6856a8`'s tree: `--release` folded it into `CHANGELOG.md`. Its seven bullets equal `## v94 — 2026-11-06`'s byte for byte, and its line 1 is the tail of `1f02da5`'s subject.
    - The rebuilt `bootstrap_agentic_workspace.sh`. The v94 install below shows it carries the landed payload.
- **At v94 (`1f02da5`):**
  - `installer/main.py` L61 reads `WORKSPACE_VERSION = 94`, and a v94 install writes `works/.workspace-version.json` `workspace_version: 94`.
  - create-phase `## The explain route` (L127, up to `## The research route` at L225) lists `- **phases**:` at L142.
  - **`cites.py` with `plugin/skills/explain/SKILL.md`:**
    - over v94's 62 `payload/claude/**/*.md` files, `installer/payloads/doc_bodies/operations.md` and `README.en.md`: `citations checked=119 bold parts checked=15 missing=0`;
    - over a v94 install's 66 `.claude/**/*.md` files and `docs/current/operations.md`: `citations checked=218 bold parts checked=28 missing=0`. That is exactly S5's measure, and it includes the `do-next-slice/reference/` copies the build makes;
    - over a v93 install, for contrast: `citations checked=200 bold parts checked=12 missing=85`.
  - **The v94 install** (`…/f5/inst-v94`) follows `PATCHES.md` §11:
    - `explain-chapter.md` and `explain-review.md` equal the package's;
    - `explain-decomposition.md` equals `d6856a8`'s payload (the one line above);
    - all three are byte-identical in `do-next-slice/reference/`;
    - `slice-executor.md` says "dispatch no agent";
    - there is no `explain-critic.md`;
    - 20 skills.

### The optional front-door walk: ran, passed

- **The installs:** `sh <tree>/bootstrap_agentic_workspace.sh <scratch>/inst-v9N --at-root --name T --summary t`, run from an empty scratch cwd, for v94 and v93.
  - The installer is self-contained. Its only URL is written into the version file, so it used no network.
  - At-root runs no `git init` and no commit, and the installer writes only into its target.
  - Both installs printed "Workflow validation passed."
- **The walk:** steps 1–2 of the edited canonical SKILL, L275–L292, walked by hand. A scratch script (`…/f5/tools/frontdoor.py`) reads the threshold and the "Too old" text from the SKILL itself.
  - `inst-v94`: step 1 at the root. Step 2: `workspace_version=94` (>= 94), explain route present, lists `**phases**` → **ready**.
  - `inst-v93`: step 1 at the root. Step 2: `workspace_version=93` (< 94), and the explain route lacks `**phases**` (a grep for `- **phases**` counts 0) → **refused**: "This workspace (v93) cannot run explain phases from the knowledge plugin: they need v94 or later, whose create-phase explain route writes a `phases` line. Run `/update-workspace`, then ask again."
- **What it does not cover** (for REVIEW round 3, which decides on deferred job 5):
  - It covers checklist line 31 (the refusals) and the readiness gate before lines 28, 29, 33 and 34.
  - It is not a `claude -p` run of plugin 0.10.0, so line 28 (headless), line 29 (a repeat), line 33 (a book) and line 34 (a v2) were not run.
  - It does not cover a nested install either: that layout's installer makes a first `git commit` in a new host, which an executor may not make.
  - The plan says passing the walk retires job 5. On this coverage, narrowing it to lines 28, 29, 33 and 34 is the other reading. That call is the review's.

## Notebook (written through `phase-section`)

- **Decisions entry 25:** replaced (deviation 1). S5's handshake line now records the re-pin: the package landed as `d6856a8`, v94; the front door tests 94 or later plus `**phases**`; `apply.py` pins 20. S5's v92 detail stays behind the pointer.
- **Doc impact:** one line appended (above).
- **Notes for later slices:** one entry for REVIEW round 3, about the walk and deferred job 5.
- **Now:** rewritten. F5 landed, "Next: REVIEW round 3".
- `phase.md` is 39,928 B, under the 40,960 B budget, so nothing needed moving.

## Left running / scratch

- No servers were started, and `:3030`, `:8766`, `:8977` and `:3978` were not touched.
- Scratch trees and installs are under `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/f5/`: `v93/`, `d6856a8/`, `v94/`, `applied/`, `applied2/`, `inst-v93/`, `inst-v94/`, `tools/` and the tars.

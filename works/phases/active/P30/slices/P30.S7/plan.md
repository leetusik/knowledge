# P30.S7 — `/explain` and the CLI: native chapters, books, assets, the portable copy

## Goal

1. Rewrite the explain skill to publish **native** chapters with book and chapter metadata, including the
   general-learning mode with no repo behind it. The skill ships in three parity-gated copies:
   - `plugin/skills/explain/SKILL.md` (canonical);
   - `.agents/skills/explain/SKILL.md` (portable), **restored (A3)**;
   - `web/public/SKILL.md`.
2. Teach the `knowledge` CLI to publish a native chapter with images and placement.
3. Publish the phase's **dev fixture book** to the **local** API with the new CLI, for the web slices.

## Read first (just in time)

- `works/phases/active/P30/topics/slice-breakdown.md` → **S7**.
- P29's contracts, via `phase-section P29 Decisions`. Read only *S2 /explain*, *S1 Phase or slice →
  chapter*, and the general-mode notes. P29's `## Notes for later slices` lists what the bootstrap's
  skill must change; the same list holds for this repo's copies.
- `server/native/README.md`: the format the skill must teach, its grammar and limits.
- `works/phases/active/P30/phase.md` → `## Notes for later slices`, plus `topics/notes-server.md` (S2's
  book API, S4's assets, S5's publish contract) and `topics/notes-later.md`. Especially:
  - a native publish sends the body without a header, and the server writes it;
  - `format: "native"`, `summary`, `book`, `chapter`, `lang`, `translated_from`, `subject`, `assets`;
  - re-explain reads `source` from `GET /api/documents/by-path/{rel}`, because MCP truncates at 20,000
    characters;
  - one 422 list.
- Code: `cli/src/*/` (`main.py`, `client.py`, `knowledge.py`), `cli/tests/`, `cli/README.md`,
  `scripts/skills_parity.py`, and the current `plugin/skills/explain/SKILL.md`.
- The old portable copy, for its frontmatter shape: `git show 70e8eae^:.agents/skills/explain/SKILL.md`.
  Its frontmatter is `name` + `description` only, with no `argument-hint` or `allowed-tools`. The body
  must be byte-identical to the canonical body.

## Approach (pinned)

1. **Skill rewrite (canonical):**
   - Write native, not HTML: the native grammar, the typed blocks (`figure`, `figures`, `diagram`, `svg`,
     `quiz`, `sources`), callouts, ids and references, and the limits, as P29 and the README give them.
     The skill teaches; it never contradicts the README.
   - The fixed five-section shape becomes the recommended outline.
   - Book and chapter placement: how a phase or a slice becomes a chapter (P29 *Phase or slice → chapter*),
     and sending `book`, `chapter`, `lang` and `translated_from`.
   - Re-explain carries ids forward: read `source` via by-path and keep every id.
   - Translation keeps ids, so quiz ids must match.
   - General-learning mode, with no repo:
     - `#sources` becomes a `sources` block;
     - it publishes a **loose document carrying `subject`** in the subject's project by default, and a
       chapter only when a book is named;
     - images are attached by name with the CLI's `--asset`, so stop banning images.
   - Keep the skill's existing safety and setup conventions. Update `allowed-tools` only as far as the new
     CLI flags require.
2. **Copies:**
   - `web/public/SKILL.md` is a full-file byte copy of the canonical file.
   - `.agents/skills/explain/SKILL.md` is recreated with the portable frontmatter (`name` +
     `description`, the description equal to the canonical one) and a byte-identical body.
   - `python3 scripts/skills_parity.py` must PASS.
   - `.agents/` may be gitignored or excluded by the workspace. If git refuses to track it, find out why
     (`git check-ignore -v`), and add a narrow un-ignore for `.agents/skills/explain/` only. Never touch
     the workspace's `.claude/` files or the bootstrap repo.
3. **CLI** (`knowledge save` or the existing publish command):
   - `--format native`, or detection from a `format: native` header (the header is read first and
     stripped, since the server writes it);
   - `--book`, `--chapter`, `--position` (if S2's API supports ordering on publish; otherwise drop the flag
     and note why), `--lang` and `--translated-from LANG@V`;
   - repeatable `--asset NAME=PATH`, encoding the files base64 with the media type sniffed from magic
     bytes;
   - `--new-version`;
   - a 422 prints every violation with its line, readably;
   - warnings from the 201 are printed.

   Keep the CLI's existing behaviour for html and md publishes unchanged. Add focused CLI tests for
   argument parsing and request building, using the CLI's existing test style.
4. **Dev fixture book** (local only):
   - Start the server locally the way earlier slices did (`:8766`; see `topics/notes-server.md` or the
     README).
   - Publish one fixture book to the **local** API through the new CLI. It covers:
     - every block type and every callout type;
     - a figure row with two images, a diagram of each kind, an svg block;
     - every quiz type;
     - `sources`;
     - KO and EN variants of one chapter, with a second version of one chapter;
     - one legacy html chapter;
     - a loose native document with `subject`.
   - Fixture text is invented, under P29's *Canvas content rule*: no real names, companies or keys.
   - Check the fixture sources in at `tests/fixtures/book/`, with a small `scripts/publish_fixture_book.sh`
     (or Python) that re-publishes them to a given local API. Later slices re-run it against fresh local
     state.
   - **Never publish to `knowledge.hi2vi.com`.**

## Out of scope

- The bootstrap repo, and this workspace's `.claude/skills/explain/` (the bootstrap ships it).
- The handoff note (S28).
- Every web surface.

## Validation

- `python3 scripts/skills_parity.py` **passes**.
- The CLI's tests (`cd cli && uv run pytest -q`).
- `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`.
- The fixture script publishes successfully to the local API. Paste the summary.
- `python3 scripts/plugin_parity.py`, if it exists and covers the plugin.
- `python3 scripts/workflow.py validate`.

## Notebook

- `phase.md`:
  - Doc impact, one short line each: `experience.md` (the `/explain` native flow), `api.md` (CLI flags, if
    documented there), `operations.md` (the fixture script);
  - notes for S12+ (how to load the fixture book locally), placed in `topics/notes-later.md` with one link
    line;
  - remove the "parity FAILS until S7" note;
  - `## Now`.
- `result.md`: verdict block first.

**Unattended run:** settle open choices by P29's recommendation. Record them on `## Operator Questions` as
`decided: …`, and return `done`. Escalate only if the plan cannot pin an approach.

## Dispatch

slice=P30.S7
phase=P30
kind=implementation
risk=low
attempt=1
route=mid
reason=kind implementation rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high

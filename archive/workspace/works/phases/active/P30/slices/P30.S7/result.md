- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Rewrote the explain skill for native chapters, books and general mode in all three copies (the portable `.agents` copy restored, `skills_parity.py` passes); `knowledge save` gained the native, placement, `--asset` and 422/warning handling; the dev fixture book is checked in and a script publishes it to a LOCAL API (proved on a throwaway server).
- files_changed: plugin/skills/explain/SKILL.md, web/public/SKILL.md, .agents/skills/explain/SKILL.md (new), cli/src/knowledge_cli/native.py (new), cli/src/knowledge_cli/knowledge.py, cli/src/knowledge_cli/client.py, cli/src/knowledge_cli/guide.py, cli/README.md, cli/tests/test_native.py (new), scripts/publish_fixture_book.py (new), tests/fixtures/book/ (new: all-blocks.md, all-blocks.v1.md, write-lock.en.md, write-lock.ko.md, legacy-explainer.html, loose-note.md), works/phases/active/P30/phase.md and topics/notes-later.md
- validation:
  - `python3 scripts/skills_parity.py`: PASS
  - `cd cli && uv run pytest -q`: 55 passed (11 new, 44 existing)
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`: 197 passed
  - `python3 scripts/publish_fixture_book.py --base-url http://127.0.0.1:8767` on a fresh throwaway server: all 6 publishes succeeded, no warnings (summary below)
  - `python3 scripts/plugin_parity.py`: FAILS with 89 issues, none touching the skill or the CLI; all are server files and tests that earlier P30 slices changed/added and the plugin template does not ship (pre-existing, outside this slice's plan)
  - `python3 scripts/workflow.py validate`: passed
- deviations: the fixture book was published to a throwaway local API on `:8767`, not to `:8766` (OQ23); the skill's hand-written file fallback is dropped (OQ22); the CLI got more flags than the plan listed (OQ25). All decided on `## Operator Questions`.
- doc_impact: experience.md (the `/explain` native flow), api.md (CLI flags), operations.md (the fixture script), all appended to `phase.md`.

## What was done

### Skill (three copies)

`plugin/skills/explain/SKILL.md` is the canonical file, rewritten:
- **Native only.** The author writes `<tmp>/body.md`, with no header and no `# H1`; the server writes the header from request fields. The grammar section follows `server/native/README.md` and P29.S2: callouts (six types, collapsed form), the typed blocks `figure`, `figures`, `diagram` (all seven kinds with their fields and tones), `svg` (allowlist, colour classes), `quiz` (choice, recall, cloze), `sources`, code fences, heading and block ids, references, the limits, and a "before you publish" checklist.
- **The five-section page is the recommended outline** (Background, Intuition, Code or Worked examples, Best practices and next steps, Quiz, then Sources).
- **Three modes**: change, topic and general. General mode has no repo, requires web research and a `sources` block, and publishes a loose document carrying `subject` in the subject's project, or a chapter only when a book is named.
- **Placement** (P29 *Phase or slice → chapter*): a phase is a chapter of the repo's `phases` book (`p<N>`, position N, `source phase`); a slice is a chapter of book `p<N>` (key `s1`, position = the slice's order, sources `phase` and `slice`); a named book is a chapter of it; everything else is a loose document.
- **Re-explain** reads the prior through `GET /api/books/<project>/<book>` (chapters) or the document list (loose), then `by-path` for `source` (not MCP: 20,000-character cap), keeps every surviving id, and sends no `new_version` for a chapter (the server resolves the variant). **Translation** keeps every id, sends `translated_from`, and the quiz ids must match (422 `translation-quiz-ids`).
- **Images** are welcome and attached by name (`--asset NAME=PATH`); a version inherits none, so every publish re-attaches them.
- **Publish** by the CLI when it runs, else the curl form (with a one-line `python3 -c` that base64s images). The 422 list is fixed once and then reported; warnings are not failures; the existing 409, 401, 201 (`pushed:false` is normal) and the §5.1 lost-reply verification (adapted to chapters) are kept.
- `allowed-tools` gained `Bash(knowledge --base-url:*)` and `Bash(knowledge --version:*)` only. `argument-hint` gained `[book=<slug>] [lang=<xx>]`.

`web/public/SKILL.md` is a byte copy. `.agents/skills/explain/SKILL.md` is recreated with `name` + `description` frontmatter (the description equal to the canonical one) and a byte-identical body. `git check-ignore -v` finds nothing ignoring `.agents/`, so no un-ignore was needed; the file shows as untracked and the orchestrator's commit adds it.

### CLI

`cli/src/knowledge_cli/native.py` (new) holds the header reader (no YAML dependency: the shapes the server writes), the flag parsers, magic-byte sniffing, the request builder and the 422/warning formatters. `knowledge save`:
- `--format md|native|html`, with detection from a `format: native` header (read first, stripped, its title, tags, summary, lang, translated_from and subject used as defaults; a flag wins). `--format html` sends a legacy page verbatim.
- `--book`, `--chapter` (must go together), `--position`, `--book-kind/-title/-subject`, `--chapter-title`, `--chapter-source KEY=VALUE`, `--lang`, `--translated-from LANG@V`, `--subject`, `--summary`, `--co-authored-by`, `--new-version`, `--rel-path`, repeatable `--asset NAME=PATH`.
- A 422 list prints every violation with its line (`line 9:3: [quiz-answer] message (in block q1)`, `document:` for line 0); the 201's `warnings` print to stderr. A lost reply on a native, placed or imaged publish is reported as unconfirmed (never re-sent), since the CLI cannot derive its rel_path or read its body back.
- `knowledge read ID --source` prints a native chapter's whole stored file (the re-explain read).
- The plain md path is unchanged (a test pins that its request carries no new field). `--position` is kept: S2's API takes `chapter.position`. `knowledge guide` and the README document the flags.

Tests (`cli/tests/test_native.py`, 11): header stripped and a flag beats it; placement, assets, translation and `--new-version` on the wire; a plain md save adds no field; bad flags never reach the server; a non-image asset refused by its bytes; the 422 rendered as lines; warnings printed; the sniffer and the header parser. A manual run against a real server showed the 422 output:

```
error: the server rejected this publish (6 problems):
  line 1: [heading-level] h1 is not allowed: ...
  line 3: [raw-html] raw HTML is not allowed ('<b>')
  ...
  line 7: [quiz-answer] items[0].answer[0]: names no option of this item ('z')
```

### Fixture book

Sources are in `tests/fixtures/book/` (invented text); `scripts/publish_fixture_book.py` publishes them with the CLI. It refuses non-local hosts, uses a throwaway token and an empty CLI config home, draws four small PNGs itself (nothing binary checked in), and stops when the book exists unless `--force`. Result on a fresh throwaway server (scratch `KB_ROOT` with `git init`, legacy mode, `:8767`, stopped afterwards):

```
publishing the fixture book to http://127.0.0.1:8767
  all-blocks v1                id 1  v1  fixtures/2026-10-21-every-block-once.md
  all-blocks v2                id 1  v2  fixtures/2026-10-21-every-block-once.md
  write-lock en                id 2  v1  fixtures/2026-10-21-write-lock.md
  write-lock ko                id 3  v1  fixtures/2026-10-21-write-lock-ko.md
  legacy html                  id 4  v1  fixtures/2026-10-21-legacy-explainer.html
  loose note                   id 5  v1  fixture-finance/2026-10-21-compound-growth.md
```

`GET /api/books/fixtures/fixture-guide` listed `all-blocks` (en, native, v2), `write-lock` (en v1, ko v1), `legacy` (en, html, v1); document 1 carried the three assets; `read --source` of the Korean variant returned its header with `translated_from`. A run against `https://knowledge.hi2vi.com` is refused before any request.

## Findings and notes

- **`:8766` is the operator's standing dev server** (started 2026-09-21, pre-P30 code, `KB_ROOT` = this repo, 70 documents). Publishing there would have committed fixtures into the repo's `docs/` as tenant #1 and failed on the native format. Nothing was sent to it (OQ23).
- `plugin_parity.py` already failed before this slice (89 drift/completeness entries for server files and tests that P30.S2 to S6 changed). Not caused or fixable here; the review or the pre-gate step may want to decide whether the plugin template should follow. No entry names the skill or CLI.
- The marketing copy (`web/src/content/marketing/`) may still call the skill an HTML explainer; out of scope (web surface), noted in `## Now`.
- The `kb-api` push wrinkle and the `origin/main` library note were not needed here (no push, no library read).
- Dead end: none of substance; `rm -rf` on a scratch dir and a compound `python3 - <<EOF` command were denied by the sandbox once, so the fresh server used a new scratch root instead of resetting the old one.

# P31.REVIEW result

## Verdict

- status: done
- tier: high
- model: opus
- effort: high
- summary: Reviewed P31 against its intent. All validation passes, and `knowledge check` behaves as claimed when run live on a fresh scratch stack: exit 0/1/2, the 409, nothing written, and `save` still publishes. The package matches the bootstrap at `f207775` almost line for line. One real defect blocks a pass: the explain review's privacy proof uses an anonymous `GET /api/documents/by-path/…`, which in production answers 401 whatever the visibility, so it proves nothing. That probe needs replacing with the visibility-gated `/app/orgs/…` route. Two small items ride along: one wrong line number in PATCHES, and a missing backend.md Doc impact note.
- review_verdict: changes_requested (3 findings, 1 fix slice `P31.F1`, risk high)
- validation:
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`: PASS, 231 passed
  - `cd cli && uv run pytest -q`: PASS, 56 passed
  - `python3 scripts/plugin_parity.py`: PASS
  - `python3 scripts/skills_parity.py`: PASS
  - `python3 scripts/workflow.py validate`: PASS (pre-existing warnings only: legacy kinds P22/P26, consolidation owed P28/P30, stale docs, oversized sections)
  - live scratch stack `:8795` and `:8796` (legacy mode, own KB_ROOT, CLI 0.2.0 in a scratch venv): PASS (detail below). Only my own PIDs were stopped (95862/95864, 96786/96788) and both ports are free
  - bootstrap: `git status --short` empty, HEAD `f207775`: PASS
  - `pnpm --dir web build`: not run (the plan says optional; the only web change is `web/public/SKILL.md`, which `skills_parity` shows is byte-identical)
- deviations: The qa `## Regression Checklist` version was not written, and no walkthrough was returned. Both are pass-only actions, and the verdict is `changes_requested`. The qa line text and a draft walkthrough are kept below for the re-review.
- doc_versions: none — deferred to a docs phase (no gate section written: verdict is not pass)
- walkthrough: none (changes_requested); a draft for the re-review is below
- explain: not written — run /explain for this phase

## Findings (numbered)

1. **The privacy proof cannot discriminate (must fix).** It is in `package/claude/skills/do-whole-phase/reference/explain-review.md` step 5, *After the first chapter, prove it is private*. That step fetches the chapter's `url` and `GET <KB_API_BASE_URL>/api/documents/by-path/<rel_path>` with no credential, and says "Both must miss (404)".
   - In tenant mode, which is production, `/api/documents/by-path/*` depends on `resolve_api_read` (`server/api_auth.py` L217–243). That function raises 401 for any request without a bearer. The answer is **401 whether the project is private or public**, so the probe proves nothing, and the "404" it predicts is wrong.
   - The `url` probe is valid only when the org has claimed a slug. Then `url` is `/@{org}/{project}/{slug}`, which is visibility-gated (404-never-403). For a slug-less tenant, `url` is `/documents/{id}` (`server/main.py` L1656–1664), a console route. An anonymous fetch of that route is a sign-in redirect, which is neither a 404 nor a read.
   - The same claim appears in the `## Decisions` line *The explain route and its references (S4)* ("proving privacy … with an anonymous 404") and in OQ10.
   - **Fix:** make the API probe the anonymous, visibility-gated book route, `GET <KB_API_BASE_URL>/app/orgs/<org slug or tenant id>/<project>/books/<book>` (`server/books_api.py` L114–130). It must answer 404, and a 200 means public: stop and return `needs_operator`. Optionally also probe `/app/orgs/<org>/<project>/<slug>` (`server/documents_api.py` L415). Keep the web `url` fetch as a second probe only when it is the pretty `/@…` form. Say that a 401 from `/api/*` is no evidence.
   - Correct the Decisions line in place. OQ10 is append-only, so append a resolved pointer or a new OQ line naming the correction. Check that README, PATCHES 12 (the CHANGELOG draft) and `handoff-explain.md` §3 still read true. They say "an anonymous 404", which stays true with the new probe.
2. **One wrong line number in `PATCHES.md` §3 (should fix).** It says `do-next-slice/SKILL.md` **L36** is the review line. At `f207775`, L36 is the decomposition line, and the review line (`- the phase review (\`kind: review\`) → \`reference/review.md\` …`) is **L37**. The quoted text is unique and PATCHES tells the reader to find edits by text, so this is low risk, but it is the only line number of 40+ spot-checked that is wrong.
3. **The `## Doc impact` list misses `backend.md` (should fix).** `backend.md` documents `server/main.py`'s internals: `## Module Layout`, the metered-handler list at L49, and `create_document`'s dependencies at L72/L132. S1 added `_CheckedWrite` and `_check_document`, the validation shared by `create_document` and `check_document`, and an **unmetered**, lock-free `check_document` handler. The S1 note names only architecture.md, api.md and operations.md. Append one `backend.md` line. S2's note (operations.md: skill §4.9, plugin 0.5.0) is complete.

**Proposed fix slice: `P31.F1` "Fix the explain review's privacy probe and two package nits"**, `--kind fix --risk high`. The trigger is a **core invariant**: the operator's "private by default" rests on this proof (auth/visibility). S4, which wrote the defect, ran `tier: high`, so the rating rests on the trigger rather than on mid-tier repair. Its scope:
- finding 1: `explain-review.md` step 5, the Decisions line, and a note for OQ10;
- finding 2: PATCHES §3 L36 → L37;
- finding 3: one Doc impact line;
- **optional,** if cheap: the cold-read nit below on `## Explain` `mode`.

Validate with `workflow.py validate`, then re-grep the bootstrap at `f207775` for any line number touched. No product code changes.

## Cold-read notes (not findings; for F1 to take or leave)

- **`mode` names two different fields.** In `## Explain` (`explain-route.md`) it is `codebase | general`. In each outline entry (`explain-decomposition.md`) it is "per §1: change, topic or general", which is the skill's vocabulary, and `explain-chapter.md` uses the latter. A cold reader can map one onto the other, but one clarifying clause in the route ("the book's mode; each chapter's §1 mode is set in the outline") would remove the guess.
- **`handoff-explain.md` wording.** The intro says it "supersedes the version pins in P30's handoff and nothing else", then lists three supersessions: the pointer line, the plugin minimum and the CHANGELOG. "supersedes three things in P30's handoff" would be exact. P30's handoff §5.4 still says `0.4.0`, but the P31 note's "plugin minimum" covers it.
- **`explain-review.md` step 8:** the book URL is written `<site>/<org>/<project>/books/<book>`. The reader's route is `/@{org}/…`, and the text says to take it from the publish responses, so it is harmless.

## Review against intent

| Operator's word | Delivered | Where |
|---|---|---|
| An explain **phase**, not one prompt per document; research, diagrams, quizzes | yes | `explain-route.md`, `explain-decomposition.md` (outline: diagrams and figures, quiz targets, research line) |
| The operator **signs the outline** before chapters | yes | the outline gate: first chapter `pending`, `accept` / feedback re-runs DECOMP |
| A critic on **every chapter, inside its slice**, then one revision | yes | `explain-chapter.md`, three spans; span 3 always runs; no second round; the critic always runs on a different model from the drafter |
| **Private** by default | yes, but the proof needs finding 1 | `explain-review.md` step 5: org key, private project, never tenant #1 |
| The review reads the whole book, renders it in the reader, publishes all | yes, in the order publish-then-read (an operator-approved Decision, because there is no scratch reader) | `explain-review.md` steps 2–6 |
| The one-shot `/knowledge:explain` stays; the rules stay in the plugin skill | yes | every reference cites §1–§5.1 and restates nothing I could find (spot-read all five files) |
| **Prepared here, relayed by the operator** | yes | bootstrap `status --short` empty, HEAD `f207775` |
| `knowledge check`: CLI and endpoint, validates without publishing | yes | S1; live-verified below |

The code: `_check_document` is a verbatim lift of `create_document`'s pre-lock body. `check_document` depends only on `resolve_api_write` and `get_conn`: no `ensure_registry_project`, no `resolve_org_slug`, no `WRITE_LOCK`, no `request.state.usage`. `_place_variant` deep-copies the manifest's chapters before it mutates them, so the check's call has no side effect. The Decision "a check never writes" holds in the code and live.

## Live run (gate stage 2: a fresh scratch stack)

Setup:
- Scratch git KB `p31-review/kb` (seed `fee1a94`), SQLite outside KB_ROOT.
- `uvicorn` on `127.0.0.1:8795`, legacy mode (`DATABASE_URL` unset), `KB_API_TOKEN=scratch-token`, `KB_STARTUP_REINDEX=0`, `KB_GIT_PUSH=false`.
- CLI from `./cli` in a scratch venv (`knowledge-cli 0.2.0`), with an isolated `HOME`.
- Never `:8766`/`:3030`, never production. The instrument is the CLI plus curl. No browser was needed: the phase changed no rendered surface.

| Check | Result |
|---|---|
| `check callouts.md` (valid native chapter, placed in book `guide`/`ch1`) | exit 0, `OK — would publish scratch/2026-10-21-callouts.md (v1)`; `--json` returns the 200 with `book_created/chapter_created: true` |
| `check err-raw-html.md`, `err-quiz.md`, `err-refs.md`, `err-svg-external.md` | exit 1 each, `error: the server would reject this publish (N problems):` plus one `line N: [code] …` per violation (15/4/10/3) |
| curl `POST /api/documents/check` on err-quiz (bearer) / no bearer | 422 with the `{line,col,code,message,block}` list / 401 |
| local tag refusal `--tag Bad_Tag` | exit 1 |
| wrong token / unreachable `:8799` | exit 2 `your API key was rejected …` / exit 2 `cannot reach …` |
| **Nothing written:** snapshot (HEAD, porcelain, file-list hash, `documents` count) before and after the checks above | identical (`fee1a94`, 0, `9f4275eea855`, 0) |
| **Publish path unchanged:** real `save` of the same chapter, then a loose note | exit 0, ids 1 and 2, commits `fab08f5`, `31cf491` |
| **Duplicate:** `check note.md` after its save | exit 1, `a publish would be refused: document already exists at …` plus the new_version hint; curl gives **409** with the publish's own body |
| re-check the published chapter / bind it to `ch9` with `--new-version` | exit 0 `(v2)` / exit 1, `… is already chapter 'ch1' (en) of book 'guide' …` |
| snapshot after the post-publish checks | identical (`31cf491`, `15a73689c96a`, 2 docs) |

**The skill's §4.9 against the real CLI.** Exit 0 means publish, and exit 1 (422/409) means fix the listed lines. Exit 2 covers a server with no route (404/405, verified at S5), a CLI before 0.2.0 (argparse `invalid choice`), and a transport or auth failure (seen here). All of these match what §4.9 says.

## Regression Checklist (gate stage 4; boundary = `phase-scope P31`, 16 files)

The checklist has 27 lines, 2 inside the boundary and 25 outside.
- **Inside:**
  - "The `<!-- explain:recent -->` marker and bullet format is byte-intact", fed by `server/main.py`'s refactored `create_document`. Re-run live on `:8796` with a copy of the repo's real `docs/index.md`: `check` left it unchanged (`7399029aa06b`), `save` inserted exactly one bullet, and `DELETE` restored it byte-for-byte (`7399029aa06b`). **PASS.** Also covered by pytest (`test_documents.py`, `test_api_write.py` and others).
  - "`python3 scripts/workflow.py validate` passes": **PASS.**
- **Outside (25):**
  - the mkdocs build and `site_smoke` lines: no changed file feeds the retired mkdocs viewer;
  - every graph, console, reader, quiz, print, library, visibility, resume, annotations and review line: these are served by `web/` and by `server/{documents_api,books_api}.py`, none of which the phase changed. `server/main.py`'s diff touches only the write path and the new route.
  - **Proof:** `git diff aedea7a..ad9d6ed --stat` lists the 16 files, and none is under `web/src` or `server/*_api.py`.

**The line to append on the pass** (held for the re-review; a qa `doc-new-version`, `--source P31.REVIEW`):
`- [ ] CLI/API publish dry run: \`knowledge check\` on a valid chapter exits 0 and writes nothing (no file, row or commit); on an invalid one it exits 1 with the \`line N: [code]\` list (P31)`

`## Operator Runtime` is unchanged by P31, so it gets no version.

## Gate stage 3 (the CLI as a first-time user; for the operator, not judged against a design)

- `knowledge check` with no FILE exits **2** (argparse usage). A missing file (`cannot read /nonexistent.md`) exits **1**, a "refused" code, though there is no line list to fix. Harmless for an agent that reads stderr, but slightly off the help text's "1 = it would be refused".
- `--help` is clear and lists the three exit codes up front.

## Operator Questions routing (stage 5)

- **OQ1** (deploy `/api/documents/check` to knowledge.hi2vi.com): goes into the walkthrough, as decision 1.
- **OQ10** (the agent profile signed into the reader as an org member; the privacy probe): goes into the walkthrough, as decision 2. Its probe text is corrected by F1.
- **OQ2–OQ9 and OQ11–OQ14**: unattended choices recorded in the notebook, listed "decided as drawn".
- None unrouted.

## Draft walkthrough (for the re-review, once F1 lands)

1. Push and deploy, so that `POST /api/documents/check` exists on knowledge.hi2vi.com (OQ1). The deploy is your word.
2. Update the CLI: `uv tool install --reinstall` from `cli/`, or the curl installer, then `knowledge --version` should show `knowledge-cli 0.2.0`.
3. Run `knowledge check <a real chapter file> --format native --title … --tag … --tag … --project <private project>`. Expect exit 0 and `OK — would publish … (vN)`, with nothing new in the reader.
4. Break one line of that file (for example, add `<b>x</b>`) and check it again. Expect exit 1 and a `line N: [raw-html] …` list.
5. Read `works/phases/active/P31/package/README.md`, then `works/phases/active/P31/handoff-explain.md`, then relay the handoff to the bootstrap agent.

Decisions:
- (OQ1) Deploy now?
- (OQ10) Will you sign the agent's Aside profile (`u1`) into the reader as an org member before the first explain review? Without that, the review stops `needs_operator`.

Decided as drawn: OQ2–OQ9, OQ11–OQ14 (see `phase.md`).

## Deferred-job candidates (observations outside the boundary or inherited; the orchestrator files them if wanted)

- **"CLI line numbers are body-relative for a file with a `---` header."** Reason: `knowledge save` and `check` strip a native header before sending, so `line 9` means file line 13 in `err-quiz.md`. This is pre-existing in `save`. The explain flow is unaffected, because drafts are body-only (skill §4). Trigger: an agent or a person fixing a headered native file by the printed line numbers.
- **"A missing FILE exits 1 under `knowledge check`."** Reason: stage 3 above. Trigger: an agent loops on "fix the listed lines" with no list.

## Notebook

`phase.md`:
- `## Now` is rewritten: changes_requested, F1 next.
- One `## Notes for later slices` entry is added, `(from P31.REVIEW, for P31.F1)`, pointing here.
- The S6→REVIEW note is kept, for the re-review.

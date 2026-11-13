# P90.DECOMP — result (attempt 2)

## Verdict
- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Led the whole-book research run `20261023-1245-sqlite-wal` per the explain skill's §9.2 (preflight passed; 10 researchers, 1 gap round, 22 verifier batches; stopped `complete`, with 63 sources and 286 claims); wrote `book/outline.md` (2 chapters, `how-wal-works` and `running-wal`) and `book/research/summary.md`; cut P90.S1 and P90.S2 as bare high-risk chapter slices (the `new-slice` commands are logged in engine-log.md, since the scratch workspace has no engine).
- **files_changed:** `works/phases/active/P90/book/outline.md` · `works/phases/active/P90/book/research/` — `pages/.gitignore`, `brief.md`, `plan.md`, `run.md`, `library.md`, `ledger.md`, `outline.md`, `summary.md`, `gaps/final.md` (mine); `findings/r1-*.md` ×8 and `findings/r2-*.md` ×2 (the researchers), `gaps/r1.md`, `gaps/r2.md` (the gap reviewers), `verify/r1-b1…b10.md`, `verify/r2-b1…b2.md`, `verify/final-b1…b10.md` (the verifiers), and fetched pages under `pages/` (git-ignored) · `works/phases/active/P90/phase.md` (Decisions, Breakdown, Notes for later slices, Now) · `works/phases/active/P90/engine-log.md` · `works/phases/active/P90/slices/P90.DECOMP/result.md`. Outside the repository: `<KB_EXPLAIN_STATE>/tools/pagetext.py` and `tools/probe/` (the skill's preflight).
- **validation:**
  - `book/research/pages/.gitignore` is exactly `*` and `!.gitignore` — pass (read back).
  - `git status --short --ignored -uall …/book/research/pages` — pass: `?? pages/.gitignore` is the only addable entry; every fetched page shows `!!`.
  - every claim id `book/outline.md` names exists in `ledger.md` (247 ids), and every `S-` id it names is a `library.md` line (55 ids) — pass (one `python3 -c` check; no id missing).
  - every status mark in the outline matches the ledger (274 marks) — pass; no quiz target uses a contested, unsupported or candidate claim.
  - `run.md` says where the run stopped and why — pass (`state: done`; stopped at D4 r2 with `complete`).
  - `python3 scripts/workflow.py validate` — not run (no engine here); logged in engine-log.md.
- **deviations:**
  1. No slice folders created: the two `new-slice` commands are logged, not run (CLAUDE.md), so `P90.S1`/`P90.S2` exist only as logged commands until an engine runs them.
  2. `phase.md` gained a short `## Breakdown` section beside the three the plan names (the agent file puts a decomposition's breakdown in the notebook).
  3. `pages/.gitignore` was written first, as the plan says, before the preflight's probe (the skill's §3.2 otherwise writes nothing before the probe passes).
  4. One of my validation commands (`cd` then `git status`) was denied by the session; I reran it without `cd` and it passed. No research call of mine was denied.
  5. The search count in run.md is exact up to D5 (32) and approximate for the D5 verifiers' counter-evidence queries (about 50), which are listed per record in the verify files rather than counted.
- **doc_impact:** none (an explain phase changes no durable truth).

## For the outline gate (the orchestrator's report)
- **Chapters:** (1) `how-wal-works` — "How SQLite's write-ahead log works": how one writer and many readers share a WAL database (frames, snapshots, the wal-index and the one-host rule, checkpoints and starvation). (2) `running-wal` — "Running SQLite in WAL mode in production": turn WAL on, choose `synchronous`, diagnose SQLITE_BUSY, keep the -wal bounded, back up safely, the WAL-reset bug.
- **Research in one line:** 10 researchers (8 + 2), 1 gap round, 22 verifier batches on another model; stopped `complete` because the second gap review found no load-bearing gap; 12 of 45 dispatches used.
- **Decisions that change what the book teaches** (candidates for the ≤5 the gate shows):
  1. **D-01 is taught, not settled.** Whether new readers wait during a RESTART/TRUNCATE checkpoint: the API reference, the pragma page and the 3.54.1 header and code say no; one wal.html sentence says they might. The direct conclusion stays below the bar (every source is the SQLite project), so Q38 is thin and the chapter gives both sides with that weight.
  2. **Evaluative advice stays attributed.** "NORMAL is the best balance for most WAL applications", "the WAL-reset bug is unlikely in common use" and the checkpoint and backup advice are the SQLite project's own; no independent rung-2 source was found, so the book reports them as SQLite's advice and does not recommend in its own voice.
  3. **A macOS durability row.** On macOS, FULL without `fullfsync` is a plain fsync() that Apple says may not reach permanent storage. That is a chain over five sourced claims, and SQLite's old article calls `fullfsync` "not recommended" (D-07). The brief's host includes macOS, so the row stays, marked as the book's chain.
  4. **Chapter 2 goes beyond must-cover.** It carries backups (the intent names them), the WAL-reset bug (versions 3.7.0–3.51.2; fixed in 3.51.3; the 3.44.6/3.50.7 backports are documented but not tagged, D-14), and the Python and Go driver settings. Its expected top-up is moderate.
  5. **wal.html's large-transaction warnings are struck through** on the current page (found at D5). The book treats them as superseded since 3.11.0, not as a live limit.
- **Decided as drawn:** subject label "Databases"; no `sources` chapter (each chapter carries its own sources block); no translations; the chapter titles, tags and the defined-terms split (phase.md, Notes); containers only if a chapter mentions them; the leave-out list honoured (WAL2 and BEGIN CONCURRENT only to scope "one writer").
- **Weak spots:** Q38 thin; Q31 thin (no independent multi-writer measurement); six contested load-bearing questions (Q9, Q10, Q20, Q24, Q32, Q40); one-owner evidence; code checked by content without excerpt hashes; the 11 verifiers' counter-claims are unverified. **Expected top-ups:** chapter 1 small (the checkpoint step order in `walCheckpoint`); chapter 2 moderate (per-connection settings, the drivers' BEGIN IMMEDIATE, what holds a read transaction open, version check, `Connection.backup()`, `journal_size_limit` pinned).

## Log
- **§2** resolver ran (this attempt's allow rules covered it): `KB_STATUS=configured`, `KB_NOW=20261023-1245`, run id `20261023-1245-sqlite-wal`.
- **§3.1** no unfinished run under `KB_EXPLAIN_STATE` (the folder did not exist); prior: none (`GET /api/books/s9-wal/sqlite-wal` → "no book").
- **D0b** path: plugin. The converter was copied to the tools folder; `pdftotext` present. Probe A ran in the foreground (the lead is a subagent); probe B's six calls all returned `ok`. Then `brief.md` and `run.md` were written.
- **D1** 37 questions (20 load-bearing), 8 angles, tier 3 (wave 1: 8, per round ≤ 6, ceiling 45); 3 scouting calls.
- **D2–D3 r1** 8 web researchers in one foreground message: 5 complete, 3 partial (all over their call caps; none failed). The merge took 69 source entries to 46 sources and 273 claim entries to 242 claims, and recorded D-01…D-06. D3v r1: 10 batches, 123 load-bearing claims (112 supported, 11 partial); D3s set 6 contested.
- **D4 r1** 3 load-bearing gaps (G-r1-01 RESTART vs readers; G-r1-02 the busy handler on a WAL read-to-write upgrade; G-r1-03 what the durability levels assume of fsync), which became Q38–Q40. **Round 2:** 2 researchers read SQLite's source at version-3.54.1 and Apple's man pages (+12 sources, +33 claims). D3v r2: 2 batches. **D4 r2:** no load-bearing gap → stop: complete.
- **D5** 29 main claims marked and 92 mapped candidates sent in 10 batches with counter-evidence. All complete. 11 counter-sources were recorded; the decisive one showed wal.html strikes through its old large-transaction warnings (D-05 → resolved-by-scope). New disagreements D-09…D-14. 38 claims were set aside as `## Not used` (research outline.md) and never verified.
- **Agents' models** (from their first lines): researchers and gap reviewers claude-opus-5-5; verifiers claude-sonnet-5-5. No search limit was hit.
- **Notebook:** phase.md `## Decisions` (one line for the book), `## Breakdown`, `## Notes for later slices` (defined terms for both chapters, plus ledger cautions), `## Now` (the outline awaits the signature). No operator question was added: the gate itself is the question.

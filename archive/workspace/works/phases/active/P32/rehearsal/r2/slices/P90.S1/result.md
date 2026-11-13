# P90.S1 — result (span 1 of 3)

- **status:** done
- **span:** 1 (executor: top-up, outline, draft, check)
- **critic_ready:** yes
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Chapter 1 `how-wal-works` is drafted at `works/phases/active/P90/book/how-wal-works.md`, and `knowledge check` exits 0. The top-up ran 1 gap check and 3 researchers (4 of 5 dispatches) plus 3 verifier batches; the chapter's gate passed (must-cover 3/3, load-bearing questions 13/15). The checkpoint sequence diagram follows the order `walCheckpoint` runs in SQLite 3.54.1, which differs from the outline's sketch.
- **files_changed:**
  - `works/phases/active/P90/book/how-wal-works.md` (new: the draft)
  - `works/phases/active/P90/book/research/run-ch1.md` (new)
  - `works/phases/active/P90/book/research/gaps/ch1-r0.md` (new, written by the gap reviewer)
  - `works/phases/active/P90/book/research/gaps/final-ch1.md` (new)
  - `works/phases/active/P90/book/research/findings/ch1-r1-found-ckpt.md`, `ch1-r1-shm-files.md`, `ch1-r1-shm-hosts.md` (new, written by the researchers)
  - `works/phases/active/P90/book/research/verify/ch1-b1.md`, `ch1-b2.md`, `ch1-b3.md` (new, written by the verifiers)
  - `works/phases/active/P90/book/research/library-ch1.md`, `ledger-ch1.md` (new: the overlays)
  - `works/phases/active/P90/book/research/outline-ch1.md` (new: the chapter's map)
  - `works/phases/active/P90/book/research/trace-how-wal-works.md` (new: the trace)
  - `works/phases/active/P90/slices/P90.S1/result.md` (this file)
  - fetched pages under `works/phases/active/P90/book/research/pages/` (git-ignored)
  - outside the repo: the converter `pagetext.py` and the probe files under `<KB_EXPLAIN_STATE>/tools/`
- **validation:**
  - `book/how-wal-works.md` exists — pass
  - `knowledge --base-url http://127.0.0.1:8841 check works/phases/active/P90/book/how-wal-works.md …` with the publish's flags (see `## Publish`) — pass, exit 0: "OK — would publish s9-wal/2026-10-23-how-sqlite-s-write-ahead-log-works.md (v1)". It printed 5 warnings, all `ref-unresolved` for the forward links to `chapter:sqlite-wal/running-wal`, which are expected because the sibling chapter is not published yet.
  - `git status --short --untracked-files=all works/phases/active/P90/book` — pass: under `book/research/` only files named for this chapter (`ch1-…`, `…-ch1.md`, `trace-how-wal-works.md`); `library.md`, `ledger.md` and the whole-book files are unchanged.
  - every claim id the trace cites exists in `ledger.md` or `ledger-ch1.md` — pass: 119 ids. `C-r1-found-shm-01` exists as the merged id on `C-r1-found-rw-10`'s line. None is a candidate; the 3 contested ids and the 1 unsupported id are used only attributed or hedged, through D-01.
  - no `workflow.py` command was needed in span 1, and none was logged
- **deviations:**
  1. **`seq-checkpoint` follows the code, not the outline's sketch.** `book/outline.md` sketched "…records its progress, syncs the database". In `walCheckpoint` (src/wal.c at 3.54.1, L2296–L2470, read in the saved raw file) the order is: limit from the read marks; sync the -wal; copy; then, only if every frame was copied, truncate and sync the database file; then store `nBackfill`. The docs' order (sync the -wal, copy, sync the database) agrees. The diagram, the prose and the caption say so.
  2. **G-r1-06 (containers) was researched and is stated.** The gap reviewer upgraded it to load-bearing. The outline had it "dropped unless the chapter mentions containers"; the chapter now mentions them in `#limits`. Q-ch1-02 stays thin and is stated in `gaps/final-ch1.md`'s words. The AI-generated Docker experiment is not used: it is exceptional, a single run never reproduced.
  3. **Chapter-scoped ids.** The top-up questions are Q-ch1-01…03, the disagreements D-ch1-01…04 and the counter-evidence ids vch1-1/-2, so that they cannot collide with chapter 2's. The book's `plan.md` is frozen with the indexes and was not edited; the questions are recorded in `run-ch1.md`.
  4. **Frozen claims mapped into chapter 1 beyond its outline entry, statuses unchanged** (listed in `ledger-ch1.md`): C-r1-criticism-10 (P), C-r1-practice-ops-40, -42, -51, -55, C-r1-found-shm-07, -22, C-r1-practice-config-18, C-r1-found-ckpt-25, -31. They come from gaps G-r0-01 and G-r0-03, from T3's "another checkpointer", from the NOOP term chapter 1 defines, and from the -shm warning.
  5. **No second gap check.** It would have used the 5th and last dispatch and left no room for the follow-up it could call. This is recorded in `run-ch1.md`, not a stop.
  6. **A third verifier batch at D6** (`ch1-b3`, 1 claim). The who-waits table's PASSIVE row needed C-ch1-r1-found-ckpt-05, which was still a candidate; it is now supported.
  7. **T2's checklist wording.** "Not on read-only media" now gives the 3.22.0 conditions and the docs' advice (G-r0-01). The network-filesystem item names NFS only, because no source names SMB. The "-wal and -shm creatable" item rests on C-r1-practice-ops-51 and C-r1-found-shm-07.
  8. **Ids.** The quiz heading is `{#quiz-section}` because the quiz block is `#quiz`. Tables carry no ids, so the T1 and T4 deliverables are found under `#who-waits` and `#three-files`.
  9. **`phase.md` not edited in span 1.** explain-chapter.md assigns the `## Notes for later slices` entry to span 3.
  10. **Two notes on the research run.** The researcher ch1-r1-shm-files went 8 calls over its hard cap (48 of 40), with its output complete and checked. The code claims carry no excerpt hashes because there is no local clone of sqlite/sqlite; every range was checked by content against the raw files at tag version-3.54.1, as the book's round 2 did.
- **doc_impact:** none (an explain phase changes no durable truth)

## Publish

```
knowledge check works/phases/active/P90/book/how-wal-works.md --format native --title "How SQLite's write-ahead log works" --tag sqlite --tag write-ahead-log --tag concurrency --tag checkpoints --tag database-internals --summary "How a WAL-mode SQLite database serves one writer and many readers: commits appended to the -wal file, snapshots fixed by an end mark, the wal-index in shared memory, and checkpoints, with what stops them." --lang en --project s9-wal --source-repo /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s9/ws --co-authored-by "Claude Opus 5.5" --book sqlite-wal --book-kind subject --book-title "SQLite's write-ahead log" --book-subject "Databases" --chapter how-wal-works --position 1 --chapter-title "How SQLite's write-ahead log works"
```

Run it from the repo root, with the global `--base-url <KB_API_BASE_URL>` added before the subcommand (skill §2). The review adds `--json` and swaps `check` for `save`.

## Log

**For span 2.** The critic's dispatch takes `writer_model: opus`, and the model that really ran is claude-opus-5-5, so the critic runs on `sonnet`. The critique goes to `works/phases/active/P90/book/critique/how-wal-works.md`.

### D0b, the preflight (a new session)
- §2 resolver: KB_STATUS=configured, KB_API_BASE_URL=http://127.0.0.1:8841, KB_NOW=20261023-1415.
- The converter was copied to `<KB_EXPLAIN_STATE>/tools/pagetext.py`; `pdftotext` is present. The path is plugin.
- Probe A ran in the foreground on haiku: ok. Probe B ran on haiku: search, fetch, curl, converter, write and read all ok.
- Two of my own Bash calls in non-brief forms were denied: a `cd … &&` compound, and a grep using `$`. I redid both in B6's forms, and nothing was lost.

### The gap check and the top-up (§9.3 items 2–3)
- The gap reviewer (`gaps/ch1-r0.md`, claude-opus-5-5) found 3 load-bearing gaps:
  - G-r0-01: the T2 checklist's "writable directory" and "read-only media" items. Mapping only.
  - G-r0-02: may the reader delete the -shm.
  - G-r1-06: containers, upgraded to load-bearing.
- It also recorded G-r0-03…07 as not load-bearing, and kept G-r1-01 and G-r1-07 open.
- The top-up wave was 3 web researchers in the foreground, in one message:
  - ch1-r1-found-ckpt: walCheckpoint's step order at 3.54.1, the outline's expected top-up (1). Complete: 17 claims.
  - ch1-r1-shm-files: the -shm deletion question. Complete: 12 claims. No documentation page covers deleting a live -shm. A wal.c comment does: the SHARED lock exists to stop other clients unlinking the WAL or wal-index file, else "the system would be badly broken".
  - ch1-r1-shm-hosts: containers. Partial: Q-ch1-02 is thin. No SQLite or Docker source states whether containers sharing a volume, or Docker Desktop's VM file sharing, count as one host.
- The ceiling ended at 4 of 5 dispatches.
- The merge went into the overlays only: 13 new sources, 6 duplicate entries kept under book ids, and 44 claims. Counts after D5s: 17 supported, 3 partial, 24 candidate (not used). The researchers' conflicts became D-ch1-01…04, all open.
- Verification ran in 3 batches: ch1-b1 (11 claims, SQLite source at 3.54.1), ch1-b2 (8 claims, walformat, wal.c and the Docker docs) and ch1-b3 (1 claim).
  - It found 3 partials, whose narrower wordings are on their overlay lines: C-ch1-r1-found-ckpt-12 (the conditions on storing nBackfill), C-ch1-r1-found-ckpt-15 (TRUNCATE resets the -wal itself) and C-ch1-r1-shm-hosts-05.
  - Counter-evidence on 5 main claims: none found.

### The chapter's gate (§9.3 item 4)
- Must-cover MC1, MC2 and MC3: all answered or contested.
- Load-bearing questions: 13 of 15 answered or contested. Q38 and Q-ch1-02 are thin, and both are stated.
- Result: pass.

### D6–D7
- The map is `outline-ch1.md`. It opens with `## Reader's task` (T1–T4 with their deliverables), then the path with word budgets and `## Not used`.
- The draft followed §4's three passes, with the trace kept per section.
  - Deliverables: T1 is the who-waits table, its RESTART/TRUNCATE × new-reader cell marked disputed and linked to the D-01 discussion. T2 is the checklist "Before you turn WAL on". T3 is `seq-checkpoint` plus "What stops a checkpoint" and "Why the -wal does not shrink". T4 is the three-files table with the -shm warning.
  - Disagreements: D-01 is taught with its weight (three of the project's sources on one side, one page on the other), and neither side is put in the chapter's voice. D-05 is mentioned only to say the old warnings no longer apply.
  - Declared gaps: Q38, G-r1-01, G-r1-07 and Q-ch1-02 are stated, and G-r0-06 points to chapter 2.
- The reader pass fixed five things: a ledger id ("D-01") shown to the reader, "wal-index" and "EXCLUSIVE locking mode" used before their sections, a checksum sentence wider than its passage, and a heading id that collided with the quiz block's.

### §4.8 and §4.9
- The §4.8 rules check is in `run-ch1.md`.
- `seq-checkpoint`'s order was read against the code itself, in the saved raw files at 3.54.1: wal.c L2296–L2470 (`walCheckpoint`), L3950–L3991 (`walRestartLog`), and vdbeapi.c L945–L947 (`sqlite3Step` → `doWalCallbacks`).
- The quiz keys were read against their passages.
- `knowledge check` passed on the first run (exit 0).

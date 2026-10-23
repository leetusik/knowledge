# The outline gate (P90, rehearsal 2)

**Signed** by P32.S9, acting as the operator (plan: "sign it as the operator would and write that down"): the literal word **"accept"**, 2026-10-23 about 14:12 KST, on the report below as the gate run returned it. The scratch notebook records it as `## Decisions`' "Outline signed, attempt 2" line (`phase-P90.md`).

## The gate report, verbatim

P90 has stopped at the outline gate. The research is done, the two-chapter outline is written, and nothing more runs until you answer. The executor returned `done`. I logged the gate's engine commands (`finish-slice`, `accept-gate --require`, `set-slice-status P90.S1 pending`, `validate`) in [works/phases/active/P90/engine-log.md](works/phases/active/P90/engine-log.md) rather than running them, since this workspace has no engine. I updated the Slices table in `phase.md` by hand (DECOMP done, S1 `pending`, S2 `todo`) and made one commit, `87419ef`. Nothing under `pages/` went into it except its `.gitignore`.

**To read:** [works/phases/active/P90/book/outline.md](works/phases/active/P90/book/outline.md) and [works/phases/active/P90/book/research/summary.md](works/phases/active/P90/book/research/summary.md)

**Chapters**
1. `how-wal-works`, "How SQLite's write-ahead log works": how one writer and many readers share a WAL database (frames, snapshots, the shared-memory index and why everything must run on one machine, checkpoints and what stalls them).
2. `running-wal`, "Running SQLite in WAL mode in production": turning WAL on, choosing `synchronous`, diagnosing SQLITE_BUSY, keeping the -wal file small, safe backups, and the WAL-reset bug.

**Research:** 10 researchers and 1 gap round. It stopped `complete` because the second gap review found no gap that matters; 12 of the 45 allowed dispatches were used.

**Decisions to check**
1. **Whether new readers wait during a RESTART/TRUNCATE checkpoint is left open.** SQLite's API reference, pragma page and code say they don't; one sentence on the WAL overview page says they might. Every source is SQLite's own, so chapter 1 gives both sides with that weight and doesn't decide.
2. **SQLite's advice is credited to SQLite, not given as the book's own.** This covers "NORMAL is the best balance", "the reset bug is unlikely in common use" and the checkpoint and backup advice, because no independent source backs them.
3. **A macOS row in the durability table.** On macOS, FULL without `fullfsync` is a plain fsync(), which Apple says may not reach permanent storage. The book reaches this by combining five sourced claims; no source says it directly, and SQLite's old article calls `fullfsync` "not recommended".
4. **Chapter 2 goes beyond the must-cover list.** It adds backups, the WAL-reset bug (versions 3.7.0–3.51.2) and the Python and Go driver settings.
5. **The WAL page's warnings about large transactions are treated as obsolete.** They are struck through on the current page and no longer apply since 3.11.0.

**Decided as drawn:**
- Subject label "Databases"; no separate `sources` chapter; no translations.
- Titles, tags, and which chapter defines each term are as in the outline.
- Containers come up only if a chapter mentions them.
- The leave-out list is respected.

**Weak spots:**
- Q38 (the RESTART question above) and Q31 (no independent measurement of several concurrent writers) have thin evidence.
- Six key questions are disputed and taught with their sources named.
- Nearly all the evidence comes from one owner, the SQLite project.
- The verifiers' 11 counter-claims are themselves unverified.

**Research still needed per chapter:**
- **Chapter 1, small:** read the checkpoint function's step order in the code.
- **Chapter 2, moderate:** which settings each connection must set itself, how the Python and Go drivers start a write transaction, what keeps a read transaction open, the version check, Python's `Connection.backup()`, and `journal_size_limit`.

Reply **"accept"** to sign the outline. That freezes the research and starts P90.S1. Any other feedback re-runs DECOMP from where its research stopped.

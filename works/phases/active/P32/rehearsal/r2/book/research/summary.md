# Research summary: sqlite-wal
- run: 20261023-1245-sqlite-wal · tier 3 · researchers 10 (wave 1: 8; gap round 1: 2) · gap rounds 1 · stop: complete (the second gap review found no load-bearing gap) · dispatches 12 of the 45 ceiling (10 researchers, 2 gap reviewers) · verifier batches 22 (r1 10, r2 2, final 10)
- mode: parallel · agents: plugin (knowledge:web-researcher, knowledge:gap-reviewer, knowledge:verifier) · wave: 8 · researchers and gap reviewers: claude-opus-5-5 · verifier: claude-sonnet-5-5 (another model) · critic: none here (each chapter's critic runs in its slice) · quote-match: exact (every web passage found by the converter; the SQLite and Apple code and man-page sources are raw files read at pinned commits and checked by content, with no excerpt hashes — no local clone; S-v6-01 checked by substance) · caps: agent (four researchers ran past their 40-call cap; nothing was cut) · searches: 32 counted before D5, plus the D5 verifiers' counter-evidence queries (about 50, listed per record in verify/final-b*.md) · limit hit: no
- totals: 63 sources · 286 claims (206 supported, 18 partial, 12 contested, 1 unsupported, 49 candidate: 38 not used and 11 verifiers' counter-claims) · 40 questions · 14 disagreements (8 open, 6 resolved-by-scope)
- evidence gate (reported, not a stop): must-cover 5 of 5 answered or contested · load-bearing questions 26 of 27 answered or contested (Q38 thin) → it would pass

## Key sources
**Chapter 1, `how-wal-works`** (rung 1 first)
- S-r1-found-rw-01 sqlite.org/wal.html — the mechanism, checkpoints, the one-host rule, the WAL-reset bug (page updated 2026-08-25)
- S-r1-found-rw-02 fileformat2.html — the -wal file's header, frames, checksums, the reader algorithm
- S-r1-found-rw-04 walformat.html — the -wal/-shm files' life cycle, the wal-index header, locks, recovery
- S-r1-found-rw-03 isolation.html — snapshot isolation, why a stale reader cannot write
- S-r1-found-ckpt-02 c3ref/wal_checkpoint_v2.html and S-r1-found-ckpt-03 pragma.html — the checkpoint modes and what they return
- S-r2-found-ckpt-01 src/wal.c at version-3.54.1 and S-r2-found-ckpt-06 src/sqlite.h.in — what RESTART/TRUNCATE hold and what a new reader does
- S-r1-found-shm-05 useovernet.html, S-r1-found-shm-11 src/os_unix.c — network filesystems, why the wal-index sits beside the database

**Chapter 2, `running-wal`** (rung 1 first)
- S-r1-found-ckpt-03 pragma.html — `journal_mode`, `synchronous`, `wal_autocheckpoint`, `wal_checkpoint`, `journal_size_limit`, `fullfsync`
- S-r1-practice-config-05 compile.html, S-r1-practice-config-03 rescode.html, S-r1-found-rw-05 lang_transaction.html, S-r1-practice-config-07 c3ref/busy_handler.html, S-r2-practice-config-06 c3ref/busy_timeout.html
- S-r2-practice-config-01 src/btree.c, S-r2-practice-config-07 src/pager.c, S-r2-practice-config-08 src/os_unix.c (all at version-3.54.1) — the busy handler on a read-to-write upgrade; what a sync is on macOS and Linux
- S-r1-found-shm-06 howtocorrupt.html, S-r2-practice-config-05 atomiccommit.html — syncs, lying disks, moving or deleting the -wal
- S-r1-practice-ops-05 backup.html, S-r1-practice-ops-06 lang_vacuum.html, S-v7-01 rsync.html — online backups
- S-r2-practice-config-12 and S-r2-practice-config-11 Apple's fsync(2) and fcntl(2) — F_FULLFSYNC
- S-r1-practice-config-06 Python sqlite3, S-r1-practice-config-09 mattn/go-sqlite3, S-r1-practice-config-10 modernc.org/sqlite — the reader's drivers
- rung 1 for their own systems, attributed: S-r1-cases-05 / S-r1-cases-12 Rails, S-r1-cases-09 Django, S-r1-cases-01…03 Litestream, S-r1-cases-06 / S-r1-cases-13 Syncthing, S-r1-criticism-07 Tailscale, S-r1-criticism-11 Antithesis, S-r1-evidence-08 PVLDB 2022
- rung 3, attributed only: S-r1-criticism-03 (Andrew Ayer on the durability docs)

## Open disagreements
- **D-01** — do new readers wait while a RESTART or TRUNCATE checkpoint runs? Side A: one wal.html §6 sentence ("readers might block"). Side B: the API reference, the pragma page, the 3.54.1 header, and the 3.54.1 code read as a whole (new readers go ahead apart from brief retries). Would settle it: a statement from the SQLite developers, or a test that starts a reader during the RESTART wait. The writer-lock cost of RESTART/TRUNCATE is not disputed (C-r2-found-ckpt-01).
- **D-03** — the default `synchronous` in WAL mode: the compile docs say it equals the general default (FULL) unless a build changes it; a Hacker News comment by the account "SQLite" says the WAL default is not durable across power loss. Would settle it: `PRAGMA synchronous` read on a stock build after switching to WAL. The book tells the reader to set it and read it back.
- **D-04** — how likely the WAL-reset bug is: the SQLite docs say an unusual pattern, unlikely in common use; Antithesis hit it in 15 minutes with a "completely generic" workload on its test platform. Would settle it: an independent reproduction under organic timing (Phil Eaton's reproducer was unreadable, HTTP 403).
- **D-07** — `fullfsync`: SQLite's old rollback-mode article says it is "not recommended" (slow); Apple's fsync(2) says databases needing strict write ordering should use F_FULLFSYNC. Would settle it: a current SQLite statement on fullfsync in WAL mode on APFS.
- **D-09** — BEGIN IMMEDIATE's guarantee "through the next COMMIT" against lang_transaction §2.3's unscoped "COMMIT can return SQLITE_BUSY while another connection has an open read connection" (likely rollback mode only; no page says so).
- **D-11** — `journal_size_limit`: pragma.html says the WAL is truncated to the limit at each commit or reset; wal.c (master) truncates only at the first commit after a WAL restart, to the larger of the limit and that transaction. Would settle it: the same code pinned at a release tag.
- **D-14** — the WAL-reset fix's backports: wal.html says they are available for 3.44.6 and 3.50.7; the repository shows no such tagged releases, only check-ins on the 3.44 and 3.50 branches.
- **D-06** — minor (whether 3.51.3 contained only the WAL-reset fix); its claim is not used.
- Resolved by scope (the sources state both scopes): D-02 (the NORMAL-vs-FULL speedups are each author's own setup), D-05 (wal.html strikes through its pre-3.11.0 large-transaction warnings), D-08 (FULL for maximum robustness against NORMAL as the WAL balance), D-10 (NORMAL is corruption-safe; the WAL-reset bug is a version-scoped defect), D-12 (RESTART/TRUNCATE complete only while the busy handler waits), D-13 (sqlite3_rsync works locally too; before 3.50.0 it required WAL on both sides).

## Weak spots
- **Q38 thin** (load-bearing): the direct statement that new readers go ahead during RESTART/TRUNCATE (C-r2-found-ckpt-03) stays below the bar as exceptional — every source on both sides is the SQLite project. The code facts it rests on are supported, and chapter 1 teaches it as D-01 with due weight.
- **Contested load-bearing questions:** Q9, Q10, Q24 (D-01; Q24 also D-11), Q20 (D-09), Q32 (D-04, D-14), Q40 (D-07). Each is taught as attributed views; none needs settling for the reader's tasks.
- **One owner:** nearly every load-bearing claim rests on the SQLite project's own docs and code. Descriptive claims meet the bar on rung 1; the evaluative ones — "NORMAL is the best balance for most WAL applications", "the WAL-reset bug is unlikely in common use", the checkpoint and backup advice — are usable only attributed. No independent rung-2 source was found for any of them.
- **The macOS durability row** is the book's chain over five claims (C-r2-practice-config-14, C-r2-practice-config-15, C-r2-practice-config-16, C-r2-practice-config-17, C-r2-practice-config-18), stated in no single source, and it touches D-07.
- **Q31 thin** (not load-bearing): no independent, dated measurement of several concurrent writers; the throughput figures are blog benchmarks, each attributed to its setup.
- **Unverified pieces:** the 11 verifiers' counter-claims (C-v…) were recorded with verbatim passages but not verified in turn; C-v6-01 (the `journal_size_limit` code path) is from unpinned master and checked by substance.
- **Code citations** have pinned commits but no excerpt hashes (no local clone of sqlite/sqlite or xnu), so a checker confirms them by content.
- **Research hygiene:** four researchers (r1-evidence, r1-criticism, r1-cases, r2-practice-config) ran well past their 40-call cap; several verifiers wrote one command outside their brief's forms, each denied and redone. Nothing was lost; the overruns are recorded in run.md.
- No must-cover item is below the gate, and no load-bearing gap was open at the stop.

## Expected top-ups
- **Chapter 1, `how-wal-works`:** small. (1) Read `walCheckpoint` in src/wal.c at version-3.54.1 for the step order the checkpoint timeline draws (the docs give it; the code was read only for RESTART/TRUNCATE). (2) G-r1-06 — does a shared container volume or a VM file share count as one host — only if the chapter mentions containers.
- **Chapter 2, `running-wal`:** moderate. (1) G-r2-02 — which settings persist in the file (journal_mode=WAL) and which each connection must set (`synchronous`, `busy_timeout`, `wal_autocheckpoint`, `journal_size_limit`), for the startup checklist. (2) G-r1-04 — how to get BEGIN IMMEDIATE from Python `sqlite3` and the two Go drivers, and their connection pools. (3) G-r1-05 — what holds a read transaction open in Python and Go code (unexhausted cursors, unclosed `rows`, idle `autocommit=False` connections). (4) G-r1-10 and G-r1-12 — checking the linked SQLite version; Python's `Connection.backup()`. (5) D-11 — the `journal_size_limit` path pinned at version-3.54.1, so the chapter can state it rather than attribute both sides.

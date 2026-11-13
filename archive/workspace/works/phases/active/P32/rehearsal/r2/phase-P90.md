# Phase P90: A small book on SQLite's write-ahead log

## Objective

Turn SQLite's write-ahead log into a book of two chapters for a backend developer who runs SQLite behind a small web service; research first, the outline signed before chapters, every chapter critic-checked, published private.

## Slices

<!-- slices:begin -->
| Slice | Kind | Risk | Status | Outcome | Result |
|---|---|---|---|---|---|
| P90.DECOMP | decomposition | high | done | Research run 20261023-1245-sqlite-wal complete (10 researchers, 1 gap round, 63 sources, 286 claims); 2-chapter outline and summary written; P90.S1 and P90.S2 cut | [result](slices/P90.DECOMP/result.md) |
| P90.S1 | implementation | high | in_progress | | |
| P90.S2 | implementation | high | todo | | |
<!-- slices:end -->

## Decisions

_Durable cross-slice decisions, one line each._

- **The book (P90.DECOMP):** book `sqlite-wal` "SQLite's write-ahead log" (kind `subject`, label "Databases"), private project `s9-wal`, `lang: en`, 2 chapters (`how-wal-works`, `running-wal`; no `sources` chapter), outline [`book/outline.md`](book/outline.md); research run `20261023-1245-sqlite-wal` in `book/research/` — 10 researchers, 1 gap round, stop: complete, 63 sources, 286 claims (206 supported, 18 partial, 12 contested, 1 unsupported, 49 candidate), 14 disagreements (8 open); summary [`book/research/summary.md`](book/research/summary.md).
- **Outline signed, attempt 2 (operator, at the outline gate):** "accept". `book/outline.md` is signed as DECOMP attempt 2 wrote it; the book's research is frozen (`book/research/library.md`, `ledger.md` and the files they index are never edited again; each chapter writes only the files named for it), and the chapters run in order, P90.S1 first.

## Breakdown

- **P90.S1 `how-wal-works`** (order 10) — chapter 1: the mechanism (snapshots, the single writer, the -wal file, the wal-index and the one-host rule, checkpoints and starvation); carries MC1–MC3 · spends money: no
- **P90.S2 `running-wal`** (order 20) — chapter 2: turning WAL on, `synchronous`, SQLITE_BUSY, checkpoint control and -wal growth, backups and files, the WAL-reset bug; carries MC4–MC5 · spends money: no
- Both `--kind implementation --risk high`, for one trigger: **open design** — each executor leads a research run (its chapter's top-up) and writes alone from the evidence (§9.3). Undeclared (`--depends-on` omitted): an explain phase runs every chapter alone, never in a wave. Bare folders; each chapter's `plan.md` is drawn from its outline entry when it comes up.

## Doc impact

_An explain phase changes no durable truth: none._

## Operator Questions

## Notes for later slices

- **(from P90.DECOMP, for P90.S1 and P90.S2) Defined terms — each defined once, in the chapter named; the other chapter uses it without re-defining it** (book/outline.md, "Order and prerequisites"):
  - `how-wal-works` defines: write-ahead log (WAL) and the -wal file · frame · commit frame · the rollback journal (one contrast only) · read transaction and write transaction (and the deferred BEGIN) · snapshot and its end mark (mxFrame) · the single writer (the WAL write lock) · wal-index · the -shm file · read mark · recovery · checkpoint · auto-checkpoint and its threshold · WAL reset · checkpoint starvation · the checkpoint modes PASSIVE, FULL, RESTART, TRUNCATE (and NOOP) · EXCLUSIVE locking mode
  - `running-wal` defines: persistent journal mode · `synchronous` levels OFF, NORMAL, FULL, EXTRA · durability as against consistency · a sync, fsync() and F_FULLFSYNC (`fullfsync`, `checkpoint_fullfsync`) · busy handler and `busy_timeout` · SQLITE_BUSY, SQLITE_BUSY_SNAPSHOT, SQLITE_BUSY_RECOVERY · BEGIN IMMEDIATE · `wal_autocheckpoint` and `PRAGMA wal_checkpoint` · `journal_size_limit` · hot -wal file · online backup (backup API, `.backup`), `VACUUM INTO`, `sqlite3_rsync` · the WAL-reset bug
- **(from P90.DECOMP, for P90.S1 and P90.S2) Ledger cautions:** use a partial claim only in the narrower wording on its ledger line; teach a contested one through its D- entry; never write "WAL cannot corrupt" unqualified (D-10), "readers block during RESTART" in the book's voice (D-01), or wal.html's struck-through large-transaction warnings as current (D-05).

## Now

- **Landed: P90.DECOMP (attempt 2), and the outline is signed** ("accept"). The book's research is frozen: chapters write only their own `ch<k>-…` / `…-ch<k>.md` / `trace-<key>.md` files in `book/research/`.
- **Now: P90.S1 `how-wal-works`** (chapter 1) runs its three spans: executor (top-up, draft, check), critic, executor (answers the critique). P90.S2 waits.
- **Open:** Q38 is thin (D-01: do new readers wait during RESTART/TRUNCATE — taught as a disagreement, weighted to the API reference and the code); six load-bearing questions are contested and taught attributed; chapter 2's expected top-up is moderate (per-connection settings, the Python and Go drivers, what holds a read transaction open). Weak spots and top-ups: summary.md.

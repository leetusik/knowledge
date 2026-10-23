# Final gaps: 20261023-1245-sqlite-wal · stop: complete · gap rounds: 1
- Q38 · While a RESTART or TRUNCATE checkpoint runs or waits for readers, do new read transactions wait or go ahead? · state: thin · best source: S-r2-found-ckpt-01 (wal.c at 3.54.1) · disposition: stated ("SQLite's API reference, its pragma page and its 3.54.1 header say a RESTART checkpoint does not impede readers, and the 3.54.1 code, read as a whole, shows a new reader taking the database-file path or a read mark without waiting — apart from brief internal retries; the WAL overview page alone says readers might block. The book teaches this as D-01, with that weight, and does not state either side in its own voice.")

## Not load-bearing, still open (recorded, not researched; candidates for the chapters' top-ups)
- G-r1-01 (downgraded at D4 r2) · D-01 above; blocking-lock builds (SQLITE_ENABLE_SETLK_TIMEOUT) untraced · chapter 1 top-up if its checkpoint section needs more than D-01
- G-r1-04 · how the reader's Python and Go drivers start transactions and how to get BEGIN IMMEDIATE from each; the link from a driver default to the deferred-upgrade SQLITE_BUSY (Q21 answered as a chain over C-r1-practice-config-30, -31, -32, -33 and C-r2-practice-config-01) · chapter 2 top-up
- G-r1-05 · what in a Python or Go app holds a read transaction open (an unreset statement, an unexhausted cursor, Go `rows` never closed, an idle `autocommit=False` connection) and how to find it · chapter 2 top-up
- G-r1-06 · containers on one host: does a shared bind mount or Docker Desktop's VM file sharing count as "the same host" for the -shm mapping · chapter 1 or 2 top-up, if the chapter mentions containers
- G-r1-07 · what actually goes wrong across hosts on a network filesystem (no source walks it step by step; C-r1-found-shm-13's scope is one host) · chapter 1 states only the documented rule
- G-r1-08 · which `synchronous` level a connection really gets after switching to WAL on common builds (D-03) · chapter 2 tells the reader to set it explicitly and read it back
- G-r1-09 · closed in effect by D5 (D-05 resolved-by-scope: the old large-transaction warnings are struck through)
- G-r1-10 · whether default PASSIVE auto-checkpoints can trigger the WAL-reset bug; how the reader checks the SQLite version their driver links · chapter 2 top-up (sqlite_version())
- G-r1-11 · funnelling writes through one connection (Go `SetMaxOpenConns(1)` for a writer pool) — needs two independent rung-2 sources to be stated as best practice
- G-r1-12 · the driver call for an online backup (Python `Connection.backup()`, a Go driver's backup) · chapter 2 top-up
- G-r1-13 · one dated, independent measurement of NORMAL against FULL on Linux, and of several concurrent writers (Q31 thin)
- G-r2-01 · closed by the outline mapping (C-r2-found-ckpt-01 in chapter 2's growth and SQLITE_BUSY sections)
- G-r2-02 · which settings are per connection (`synchronous`, `wal_autocheckpoint`, `journal_size_limit`, `busy_timeout`) as against persistent in the file (journal_mode=WAL) — matters for a pool · chapter 2 top-up
- G-r2-03 · pager.c's comment and code on which sync flags apply to commits and which to checkpoints read opposite ways; wal.h's macros would settle it · chapter 2 only if it states the flag layout (it need not)

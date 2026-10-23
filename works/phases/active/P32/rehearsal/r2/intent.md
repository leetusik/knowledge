# Intent — P90

Phase: **P90 — A small book on SQLite's write-ahead log**

Objective: turn SQLite's write-ahead log into a book of two chapters for a backend developer who runs SQLite
behind a small web service; the research runs first, the operator signs the outline before chapters are written,
every chapter is critic-checked, and the book is published private.

## Original Input (verbatim)

> write me a small book on SQLite's WAL: how it actually works, and then how to run it without getting bitten.
> two chapters is plenty.

(Rehearsal stand-in, P32.S9: the request and the fields below were written by hand, as `create-phase`'s explain
route would ask and confirm them.)

## Confirmed Intent (refined + clarified)

A two-chapter book, researched before it is outlined: first how SQLite's write-ahead log works (readers, the one
writer, the wal-index, checkpoints), then how to run it in production (turning it on, `synchronous`, checkpoint
control, the -wal file's growth, the filesystems it needs, backups). Written for the reader below, in English,
published private into the project below.

## Explain

- subject: SQLite's write-ahead log (WAL): how it works, then running it in production
- mode: general
- book: sqlite-wal — "SQLite's write-ahead log"
- lang: en (translations: none)
- reader: a backend developer who runs SQLite as the database of a small web service (one server, a Python or Go app with a few worker processes), who knows SQL and transactions but not SQLite's internals, and who will decide whether to turn WAL on, configure it (`synchronous`, checkpoints), and diagnose `SQLITE_BUSY` errors and a -wal file that keeps growing
- depth: 2 chapters
- must-cover: how readers and the single writer interact in WAL mode (each reader's snapshot, one writer at a time); what a checkpoint does, when it runs on its own, and what stops it from finishing; why WAL needs shared memory (the -shm wal-index) and so does not work on a network filesystem; how to turn WAL on and which `synchronous` setting to pair with it, with the durability each gives; why the -wal file can grow without bound and how to stop it
- leave-out: the rollback journal's internals beyond one contrast; the WAL2 and BEGIN CONCURRENT branches; other databases' write-ahead logs; SQLite's C API beyond the PRAGMAs and the checkpoint call
- trusted sources: the SQLite documentation at sqlite.org (wal.html, pragma.html, fileformat2.html, lockingv3.html)
- project: s9-wal (private)
- visibility: private

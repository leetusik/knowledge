# Final gaps: 20261023-1245-sqlite-wal · chapter 1 (how-wal-works) · stop: top-up round 1 done; no follow-up (4 of 5 dispatches used: a second gap check would take the fifth and leave no room for the follow-up it could call) · top-up rounds: 1
- Q38 · While a RESTART or TRUNCATE checkpoint runs or waits for readers, do new read transactions wait or go ahead? · state: thin · best source: S-r2-found-ckpt-01 · disposition: stated (as gaps/final.md: "SQLite's API reference, its pragma page and its 3.54.1 header say a RESTART checkpoint does not impede readers, and the 3.54.1 code, read as a whole, shows a new reader taking the database-file path or a read mark without waiting — apart from brief internal retries; the WAL overview page alone says readers might block. The book teaches this as D-01, with that weight, and does not state either side in its own voice.")
- Q-ch1-02 (from G-r1-06) · Do processes in separate containers on one host, sharing the database through a bind mount or a volume, share the -shm mapping and the locks WAL needs, and does a VM file-sharing layer (Docker Desktop) count as one host? · state: thin · best source: S-ch1-r1-shm-hosts-07 (Docker's bind-mounts page) · disposition: stated ("SQLite's documentation states the rule as every process on one host computer and does not mention containers. Docker's documentation shows that a named volume is a directory on the Docker host that several containers can mount, that a volume driver can put its files on another machine (NFS included), and that Docker Desktop runs containers inside a Linux VM rather than on the native host. No source we opened says whether containers sharing a volume, or a process on the Mac or Windows side of Docker Desktop's file sharing, count as one host for WAL.")

## Load-bearing gaps from gaps/ch1-r0.md, closed
- G-r0-01 · closed by mapping, no research: T2's "writable directory" and "read-only media" items rest on C-r1-practice-ops-51, C-r1-found-shm-07 (attributed), C-r1-criticism-10 (its narrower wording) and C-r1-practice-ops-55 (attributed); "not on read-only media" is reworded to the 3.22.0 conditions and the docs' advice
- G-r0-02 · closed: Q-ch1-01 answered (C-ch1-r1-shm-files-01, -02, -06, -07); the T4 table and quiz q5 carry the warning (attributed to SQLite's source)
- G-r1-06 · open as Q-ch1-02 above (thin, stated)

## Not load-bearing, recorded
- G-r1-01 · stated through D-01 (unchanged from gaps/final.md)
- G-r1-07 · stated (unchanged: "the docs say WAL does not work across hosts because they cannot share memory; they do not walk through what fails")
- G-r0-03 · mapped: C-r1-practice-config-18 adds "the last connection closing" to table-who-blocks
- G-r0-04 · closed by Q-ch1-03 (the checkpoint's step order from walCheckpoint at 3.54.1)
- G-r0-05 · not researched: C-r1-found-shm-13 stays cited at master, checked by content (its status in the book's ledger)
- G-r0-06 · not researched: the chapter names "a statement not finished or reset" as what keeps a read open (C-r1-found-rw-09) and leaves the driver-level answer to chapter 2 (G-r1-05)
- G-r0-07 · partly closed by C-ch1-r1-shm-files-01 and -02 (a -shm left on a quiescent database is truncated and the wal-index rebuilt by the first connection); SQLITE_FCNTL_PERSIST_WAL left to chapter 2

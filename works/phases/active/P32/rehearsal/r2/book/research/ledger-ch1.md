# Ledger overlay: 20261023-1245-sqlite-wal · chapter 1 (`how-wal-works`)
The book's `ledger.md` is frozen at the outline signature; this overlay holds what chapter 1's top-up added (B9's line format) and the frozen claims chapter 1 maps beyond its outline entry. A claim's entry is in `findings/<its stem>.md`. Statuses are set by the lead from verify files only (`verify/ch1-b1.md`, `verify/ch1-b2.md`); `candidate` = not verified (every candidate here is not used). Sources on sqlite.org and SQLite's own code count as one owner, as in the book's ledger. Section keys (ch1): bg, intuition, wal-file, wal-index, checkpoints, limits — as the book ledger's, plus `files` for the T4 table and the -shm warning.

Counts after D5s (ch1): 44 new claims (ch1-r1-found-ckpt 17, ch1-r1-shm-files 12, ch1-r1-shm-hosts 15) · supported 17 · partial 3 · candidate 24 (not used) — C-ch1-r1-found-ckpt-05 mapped and verified at D6 (verify/ch1-b3.md) · load-bearing 15 · main 5 (counter-evidence: none-found for all five, verify/ch1-b1.md and verify/ch1-b2.md; ids vch1-1 and vch1-2 unused) · disagreements D-ch1-01 … D-ch1-04 (open).

## New claims (the ch1 top-up)
- C-ch1-r1-found-ckpt-01 · Q-ch1-03 · not load-bearing · status candidate · not used (the hook's registration; C-ch1-r1-found-ckpt-03/-04 carry the diagram's trigger)
- C-ch1-r1-found-ckpt-02 · Q-ch1-03 · not load-bearing · status candidate · not used (the hook's frame count; C-r1-found-ckpt-12 states the threshold)
- C-ch1-r1-found-ckpt-03 · Q-ch1-03 · not load-bearing · status supported · verified verify/ch1-b1.md#V-C-ch1-r1-found-ckpt-03-1 · bar met (rung 1, descriptive; the verifier notes main.c L2500-L2503 and L3721 also carry its last sentence) · used-in: ch1 checkpoints (seq-checkpoint: the committing connection's own sqlite3_step runs the hook)
- C-ch1-r1-found-ckpt-04 · Q-ch1-03 · not load-bearing · status supported · verified verify/ch1-b1.md#V-C-ch1-r1-found-ckpt-04-1 · bar met · used-in: ch1 checkpoints (seq-checkpoint: the hook runs a PASSIVE checkpoint at nFrame >= threshold)
- C-ch1-r1-found-ckpt-05 · Q-ch1-03 · not load-bearing · status supported · verified verify/ch1-b3.md#V-C-ch1-r1-found-ckpt-05-1 · bar met (the btree.c hop confirmed by the verifier at L11403-L11411) · used-in: ch1 who-waits (table-who-blocks: a PASSIVE checkpoint takes the checkpoint lock, not the writer lock, and never waits)
- C-ch1-r1-found-ckpt-06 · Q-ch1-03 · not load-bearing · status supported · verified verify/ch1-b1.md#V-C-ch1-r1-found-ckpt-06-1 · bar met · used-in: ch1 checkpoints (seq-checkpoint: mxSafeFrame from the read marks)
- C-ch1-r1-found-ckpt-07 · Q-ch1-03 · not load-bearing · status supported · verified verify/ch1-b1.md#V-C-ch1-r1-found-ckpt-07-1 · bar met · used-in: ch1 checkpoints (seq-checkpoint: ascending page order)
- C-ch1-r1-found-ckpt-08 · Q-ch1-03 · not load-bearing · status candidate · not used (READ_LOCK(0) and the salt check: depth the reader's task does not need)
- C-ch1-r1-found-ckpt-09 · Q-ch1-03 · not load-bearing · status supported · verified verify/ch1-b1.md#V-C-ch1-r1-found-ckpt-09-1 · bar met · used-in: ch1 checkpoints (seq-checkpoint: the -wal sync before the copy)
- C-ch1-r1-found-ckpt-10 · Q-ch1-03 · not load-bearing · status supported · verified verify/ch1-b1.md#V-C-ch1-r1-found-ckpt-10-1 · bar met · used-in: ch1 checkpoints (seq-checkpoint: the copy loop)
- C-ch1-r1-found-ckpt-11 · Q-ch1-03 · not load-bearing · main · status supported · verified verify/ch1-b1.md#V-C-ch1-r1-found-ckpt-11-1 · counter: none-found (verify/ch1-b1.md) · bar met · used-in: ch1 checkpoints (seq-checkpoint: truncate and sync the database file only after a complete copy)
- C-ch1-r1-found-ckpt-12 · Q-ch1-03 · not load-bearing · main · status partial ("In SQLite 3.54.1 (src/wal.c, walCheckpoint), when the iterator was built, read-slot 0 was locked and the WAL header salt is unchanged since the checkpoint read it, the checkpoint stores nBackfill = mxSafeFrame in the shared wal-index only after the copy loop and the conditional truncate and sync, and only if no error occurred, in both full and partial checkpoints. It then releases read-slot 0, and an SQLITE_BUSY result is turned into SQLITE_OK. walCheckpoint is the only routine that increases nBackfill.") · verified verify/ch1-b1.md#V-C-ch1-r1-found-ckpt-12-1 · counter: none-found (verify/ch1-b1.md) · bar met for the narrower claim · used-in: ch1 checkpoints (seq-checkpoint: nBackfill recorded last)
- C-ch1-r1-found-ckpt-13 · Q-ch1-03 · not load-bearing · status supported · verified verify/ch1-b1.md#V-C-ch1-r1-found-ckpt-13-1 · bar met · used-in: ch1 checkpoints (a PASSIVE checkpoint never resets or truncates the -wal)
- C-ch1-r1-found-ckpt-14 · Q-ch1-03 · not load-bearing · status candidate · not used (the `synchronous=OFF` caveat belongs to chapter 2)
- C-ch1-r1-found-ckpt-15 · Q-ch1-03 · not load-bearing · main · status partial ("In SQLite 3.54.1 (src/wal.c), after a PASSIVE, FULL or RESTART checkpoint the WAL reset is done by the next writer, not by the checkpoint (a TRUNCATE checkpoint instead calls walRestartHdr and truncates the -wal file itself, L2451-L2466). walFrames calls walRestartLog just before writing a transaction's frames. walRestartLog resets only if all of these hold: the writer's read transaction holds read-slot 0 (readLock==0, where the code asserts that nBackfill equals mxFrame); nBackfill is above 0; and an exclusive lock on read slots 1 to 4 is obtained at once (walLockExclusive, no busy handler). If that lock is busy, no reset happens and the frames are appended after mxFrame.") · verified verify/ch1-b1.md#V-C-ch1-r1-found-ckpt-15-1 · counter: none-found (verify/ch1-b1.md) · bar met for the narrower claim · used-in: ch1 checkpoints (seq-checkpoint: the next writer resets, only if no reader uses the WAL)
- C-ch1-r1-found-ckpt-16 · Q-ch1-03 · not load-bearing · status supported · verified verify/ch1-b1.md#V-C-ch1-r1-found-ckpt-16-1 · bar met · used-in: ch1 checkpoints (seq-checkpoint: the reset changes the salts and starts again at frame 0)
- C-ch1-r1-found-ckpt-17 · Q-ch1-03 · not load-bearing · status candidate · not used (an interpretation across ranges; C-r1-found-ckpt-14 states the docs' version)
- C-ch1-r1-shm-files-01 · Q-ch1-01, Q15 · load-bearing · status supported · verified verify/ch1-b2.md#V-C-ch1-r1-shm-files-01-1 · bar met · used-in: ch1 files (T4: a -shm left on a quiescent database is truncated by the first connection; verifies part 1 of C-r1-found-shm-34)
- C-ch1-r1-shm-files-02 · Q-ch1-01, Q15 · load-bearing · status supported · verified verify/ch1-b2.md#V-C-ch1-r1-shm-files-02-1 · bar met · used-in: ch1 files (T4: recovery runs at the first connection and initialises the wal-index, even with no -wal)
- C-ch1-r1-shm-files-03 · Q-ch1-01 · load-bearing · status candidate · not used (the mechanism of the first-connection test; the chapter states the rule, not the lock byte)
- C-ch1-r1-shm-files-04 · Q-ch1-01 · not load-bearing · status candidate · not used
- C-ch1-r1-shm-files-05 · Q-ch1-01 · load-bearing · status candidate · not used (D-ch1-01 open; the chapter does not need where the lock bytes sit)
- C-ch1-r1-shm-files-06 · Q-ch1-01 · load-bearing · main · status supported · verified verify/ch1-b2.md#V-C-ch1-r1-shm-files-06-1 · counter: none-found (verify/ch1-b2.md) · bar met for the attributed form (SQLite's source comment about its own design; the scope note that `rm` takes no SQLite lock is the researcher's reading and is not written as sourced) · used-in: ch1 files (the warning: never delete a -shm while the database is open, attributed to SQLite's source)
- C-ch1-r1-shm-files-07 · Q-ch1-01 · not load-bearing · status supported · verified verify/ch1-b2.md#V-C-ch1-r1-shm-files-07-1 · bar met (the verifier also traced the code path to the unlink) · used-in: ch1 files (SQLite deletes the -wal and -shm only under an EXCLUSIVE lock, as the last connection)
- C-ch1-r1-shm-files-08 · Q-ch1-01 · not load-bearing · status candidate · not used
- C-ch1-r1-shm-files-09 · Q-ch1-01 · not load-bearing · status candidate · not used (rung 3)
- C-ch1-r1-shm-files-10 · Q-ch1-01 · not load-bearing · status candidate · not used (rung 3)
- C-ch1-r1-shm-files-11 · Q-ch1-01 · not load-bearing · status candidate · not used (D-ch1-02 open)
- C-ch1-r1-shm-files-12 · Q-ch1-01 · not load-bearing · status candidate · not used (fit partial; Windows-only option)
- C-ch1-r1-shm-hosts-01 · Q-ch1-02 · load-bearing · status candidate · not used (a link in a chain no source states; the chapter does not draw the conclusion)
- C-ch1-r1-shm-hosts-02 · Q-ch1-02 · load-bearing · status candidate · not used (as -01)
- C-ch1-r1-shm-hosts-03 · Q-ch1-02 · not load-bearing · status candidate · not used
- C-ch1-r1-shm-hosts-04 · Q-ch1-02 · load-bearing · status supported · verified verify/ch1-b2.md#V-C-ch1-r1-shm-hosts-04-1 · bar met (locator of P2 corrected by the verifier: § "A volume's lifecycle") · used-in: ch1 limits (T2 checklist: a named volume is a directory on the Docker host, mountable into several containers)
- C-ch1-r1-shm-hosts-05 · Q-ch1-02 · load-bearing · status partial ("Docker's documentation says a bind mount mounts a file or directory on the host machine into a container, and that, for a volume, Docker creates and maintains a new directory in its storage directory on the host and containers access that location directly using standard filesystem operations.") · verified verify/ch1-b2.md#V-C-ch1-r1-shm-hosts-05-1 · bar met for the narrower claim · used-in: ch1 limits (T2 checklist: a bind mount mounts the host's own file)
- C-ch1-r1-shm-hosts-06 · Q-ch1-02 · load-bearing · status supported · verified verify/ch1-b2.md#V-C-ch1-r1-shm-hosts-06-1 · bar met · used-in: ch1 limits (T2 checklist: a named volume's driver may put its files on another machine, NFS included)
- C-ch1-r1-shm-hosts-07 · Q-ch1-02 · load-bearing · main · status supported · verified verify/ch1-b2.md#V-C-ch1-r1-shm-hosts-07-1 · counter: none-found (verify/ch1-b2.md) · bar met (Docker's wording says "Docker Desktop" only; the OS list in the claim's scope line is not in the passage; locator corrected by the verifier: § "Considerations and constraints") · used-in: ch1 limits (T2 checklist: Docker Desktop runs containers in a Linux VM, not on the native host)
- C-ch1-r1-shm-hosts-08 · Q-ch1-02 · not load-bearing · status candidate · not used
- C-ch1-r1-shm-hosts-09 · Q-ch1-02 · load-bearing · status candidate · not used (Docker's reason is performance only; using it would invite a correctness reading)
- C-ch1-r1-shm-hosts-10 · Q-ch1-02 · not load-bearing · status candidate · not used
- C-ch1-r1-shm-hosts-11 · Q-ch1-02 · load-bearing · status candidate · not used (exceptional: an AI-generated, single, unreproduced run)
- C-ch1-r1-shm-hosts-12 · Q-ch1-02 · load-bearing · status candidate · not used (as -11)
- C-ch1-r1-shm-hosts-13 · Q-ch1-02 · not load-bearing · status candidate · not used (rung 3 for the general truth)
- C-ch1-r1-shm-hosts-14 · Q-ch1-02 · not load-bearing · status candidate · not used (rung 3)
- C-ch1-r1-shm-hosts-15 · Q-ch1-02 · not load-bearing · status candidate · not used (rung 3, speculation)

## Frozen claims chapter 1 maps beyond its outline entry (status as in ledger.md, unchanged)
- C-r1-criticism-10 · status partial (its narrower wording on the ledger line) · used-in: ch1 limits (T2 checklist, read-only media; gap G-r0-01)
- C-r1-practice-ops-51 · status supported · used-in: ch1 limits (T2 checklist: the -wal and -shm must exist or be creatable; gap G-r0-01)
- C-r1-practice-ops-55 · status supported (attributed form) · used-in: ch1 limits (T2 checklist: the docs call converting to DELETE before read-only media good practice; gap G-r0-01)
- C-r1-found-shm-07 · status supported (attributed) · also used-in: ch1 limits (T2 checklist: the -shm sits in the database's directory; gap G-r0-01)
- C-r1-practice-config-18 · status supported · used-in: ch1 who-waits (table-who-blocks: the last connection closing; gap G-r0-03)
- C-r1-found-ckpt-25 · status supported · used-in: ch1 checkpoints, ch1 who-waits (another checkpointer: busy at once; T3's list)
- C-r1-found-ckpt-31 · status supported · used-in: ch1 checkpoints (NOOP, one of the modes chapter 1 defines)
- C-r1-practice-ops-40 · status supported · used-in: ch1 files, ch1 best-practices (the only safe way to remove a WAL file)
- C-r1-practice-ops-42 · status supported · used-in: ch1 files, ch1 quiz q5 (a hot -wal moved or deleted after a crash)
- C-r1-found-shm-22 · status supported · also used-in: ch1 files (the SHARED lock every WAL connection holds, behind the -shm warning)

## Disagreements (chapter 1's top-up; recorded, never settled)

### D-ch1-01
- claims: C-ch1-r1-shm-files-05 (side A); none ledgered for side B
- side A: S-ch1-r1-shm-files-06/P1 (wal.c at 3.54.1) "locks are on the shm file", with S-ch1-r1-shm-files-03/P6 (os_unix.c: the fcntl lock on the -shm descriptor) (rung 1)
- side B: S-ch1-r1-shm-files-02/P3 (howtocorrupt.html §2) "SQLite uses file locks on the database file, and on the write-ahead log or WAL file" (rung 1)
- nature: definitional (howtocorrupt may call the -shm the "WAL file" loosely)
- prominence: the code takes side A; one docs sentence side B
- would settle it: a docs sentence naming the -shm as where WAL's locks sit
- status: open

### D-ch1-02
- claims: C-ch1-r1-shm-files-11 (side A); C-r1-found-shm-34 part 2 (side B; candidate, not used)
- side A: S-ch1-r1-shm-files-03/P3 (os_unix.c at 3.54.1): a newly opened -shm with no other instance open "must be truncated to zero length or have its header cleared" (rung 1)
- side B: S-r1-found-shm-04/P2 (fileformat2.html): "The VFS is required to either truncate or zero the header of the wal-index when the last connection to it closes." (rung 1)
- nature: scope/conditions (a VFS duty at first open against one at last close; both may hold)
- prominence: one owner; neither page addresses the other
- would settle it: the windows VFS and the unix VFS's close path for the same duty
- status: open

### D-ch1-03
- claims: C-ch1-r1-shm-hosts-12 (side A); C-ch1-r1-shm-hosts-15 (side B)
- side A: S-ch1-r1-shm-hosts-01/P3 (an AI-generated report, 2026-04-07): a monitor container saw the -shm mapping change while other containers wrote (rung 1 for the report's own run only)
- side B: S-ch1-r1-shm-hosts-02/P2 (SQLite forum, 2021): "I'd be surprised if you could mmap between two Docker containers even on the same host" (rung 3, an opinion)
- nature: factual
- prominence: neither side has a rung-1 or rung-2 source for the general truth
- would settle it: SQLite's or Docker's documentation on WAL across containers, or an independent, reproduced test
- status: open

### D-ch1-04
- claims: C-ch1-r1-shm-hosts-14 (side A); C-ch1-r1-shm-hosts-11, C-ch1-r1-shm-hosts-12 (side B)
- side A: S-ch1-r1-shm-hosts-02/P1 (SQLite forum, 2021): "a non-Linux host always results in a corrupt DB" (rung 3)
- side B: S-ch1-r1-shm-hosts-01/P2–P4 (the AI-generated report): Docker Desktop for macOS, a named volume, zero errors (rung 1 for its own run only)
- nature: scope/conditions (the 2026 run used a named volume inside the VM; the 2021 setup is unstated)
- prominence: neither side meets the bar
- would settle it: a test of a bind-mounted host folder on Docker Desktop with processes on both sides
- status: open

## Question states (chapter 1's top-up questions; the lead's, after D5s)
- Q-ch1-01 · load-bearing · answered (C-ch1-r1-shm-files-01, -02, -06 supported; -07 supported, not load-bearing)
- Q-ch1-02 · load-bearing · thin (the mapped Docker facts are supported, -05 partial; no opened source states whether containers sharing a volume on one host, or Docker Desktop's VM file sharing, count as one host for WAL)
- Q-ch1-03 · not load-bearing · answered (C-ch1-r1-found-ckpt-12 and -15 partial, their narrower claims still answer it)

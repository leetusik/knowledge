# Verification: 20261023-1245-sqlite-wal · final-b3
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 14 · supported 13 · partial 1 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0
## Records

### V-C-r1-found-shm-11-1
- claim: C-r1-found-shm-11
- source S-r1-found-shm-01 · opened: https://www.sqlite.org/wal.html (curl, saved pages/final-b3/S-r1-found-shm-01.txt) · quote-match: exact · passage at § "1. Overview" (P1) and § "2.2. Concurrency" (P2): found verbatim
- looked first: searched the page for "network" and "same host". Two hits only: the Overview sentence and the Concurrency paragraph. Both say WAL does not work over a network filesystem because the wal-index is shared memory. Page footer: "last updated on 2026-08-25 19:42:39Z". §8 separately describes WAL with EXCLUSIVE locking mode and no shared memory (single process only), which does not conflict with the rule.
- implied: all processes using a WAL-mode database must be on the same host; WAL does not work over a network filesystem; reason = WAL needs all processes to share a small amount of memory and processes on separate hosts cannot share memory. Every item is stated.
- verdict: supported · reason: P1 states all three parts nearly word for word; P2 repeats the reason.
- bar: met (load-bearing descriptive, rung 1 vendor docs about its own system; attribution to SQLite's documentation is kept in the claim) · independence: n/a (one rung-1 source suffices; walformat/fileformat2 give a second SQLite statement, same owner) · currency: page updated 2026-08-25, current; no later change found
- counter: none-found ("SQLite WAL mode network filesystem limitations works anyway", "SQLite WAL network filesystem support changed new version wal-index without shared memory"). The only nuance: the single-process EXCLUSIVE-mode exception in wal.html §8 (a process that is the only one accessing the database), and a SQLite developer remark on a Mozilla bug thread (search summary only, not opened) saying the same. This is consistent with the claim as written ("all processes ... must be on the same host").

### V-C-r1-found-shm-13-1
- claim: C-r1-found-shm-13
- source S-r1-found-shm-11 · opened: https://raw.githubusercontent.com/sqlite/sqlite/master/src/os_unix.c (curl, saved pages/final-b3/S-r1-found-shm-11.txt) · quote-match: exact · passage at lines 4917-4933: found verbatim (with the elisions marked)
- source S-r1-found-shm-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage P3 at § "7. Implementation Of Shared-Memory For The WAL-Index": found verbatim
- looked first: read the full comment block (lines 4917-4940). It describes the unix shm-open routine and says that using a file in a different directory than the database (e.g. /dev/shm) "might cause two different processes on the same database to end up using different files for shared memory - meaning that their memory would not really be shared - resulting in database corruption", and that the SQLITE_SHM_DIRECTORY option is "unsupported". wal.html §7 says the same for chroot with early implementations.
- implied: (1) a comment in os_unix.c; (2) two processes on the same database; (3) ending up with different shm files; (4) memory not really shared; (5) database corruption results. Items 1-5 are stated. The comment's scenario is differing permissions or chroot with a non-default shm location; the claim does not mention a scenario and does not extend to network filesystems, so it stays within the source. The comment's wording is "might cause ... resulting in", slightly softer than "results".
- verdict: supported · reason: the comment states the chain different files -> memory not really shared -> corruption directly. Note for the writer: do not use it as evidence about NFS behaviour; commit is not pinned (file fetched from master, head 20822819adf2 inferred by the researcher).
- bar: met (load-bearing, descriptive, rung 1 code and docs) · independence: n/a · currency: master as of 2026-10-23 contains the comment; the comment is old (the 2010 change recorded by sqlite.org check-in per search summary) and unchanged
- counter: none-found ("SQLite wal-index shared memory corruption different files two processes"; currency query "SQLite WAL network filesystem support changed new version wal-index without shared memory"). A search summary mentions a 2010 check-in with the same chroot rationale (consistent, not opened).

### V-C-r1-found-shm-04-1
- claim: C-r1-found-shm-04
- source S-r1-found-shm-02 · opened: https://www.sqlite.org/walformat.html (curl) · quote-match: exact · passage P8 at § "2. The WAL-Index File Format": found verbatim
- implied: hash tables of 32768 bytes; 136-byte header carved out of the first (leaving 32632); total size always a multiple of 32768; most cases exactly 32768; grows beyond one table only when the WAL exceeds 4079 frames. All stated.
- verdict: supported · reason: direct match, item by item.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: page updated 2025-05-10 per researcher; no later version seen
- counter: not run

### V-C-r1-found-shm-10-1
- claim: C-r1-found-shm-10
- source S-r1-found-shm-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage P5 at § "7. Implementation ...": found verbatim
- implied: ordinary disk file "might actually do unnecessary disk I/O"; "the developers do not think this is a major concern since the wal-index rarely exceeds 32 KiB in size and is never synced"; backing file deleted when the last connection disconnects (page adds that this "often prevents any real disk I/O"). The claim's attribution to the documentation and its three reasons all match; it drops "often", which only strengthens the sentence slightly.
- verdict: supported · reason: attributed view of the SQLite developers, stated directly.
- bar: met (attributed form, rung 1) · independence: n/a · currency: current (2026-08-25)
- counter: not run

### V-C-r1-found-shm-15-1
- claim: C-r1-found-shm-15
- source S-r1-found-shm-05 · opened: https://www.sqlite.org/useovernet.html (curl) · quote-match: exact · passages P2, P3, P4 at § "Recommendations": found verbatim
- implied: for multiple clients on multiple machines needing simultaneous reads and writes, "you have these choices": (1) client/server engine, with a variation (2) WAL-mode database with all reads/writes from processes on the machine holding the file, plus a proxy relaying remote requests; (3) rollback mode, "multiple simultaneous readers or one writer, but not simultaneous readers and writers". Item 1 appears in the page at the list line "1. Use a client/server database engine" (not in the cited passages but on the page). Updated 2022-06-22.
- verdict: supported · reason: the three options match. The page presents option 2 as a variation of option 1; the claim's "three choices" follows the page's own numbering.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: page dated 2022-06-22; no newer version seen
- counter: not run

### V-C-r1-found-shm-16-1
- claim: C-r1-found-shm-16
- source S-r1-found-shm-05 · opened: https://www.sqlite.org/useovernet.html (curl) · quote-match: exact · passage P5 at § "Performance and Reliability Issues": found verbatim
- implied: network unreliability issues "can be mitigated, completely or to an acceptable degree, by using SQLite in rollback mode"; the library "is not tested in across-a-network scenarios, nor is that reasonably possible"; remote use is "at the user's risk". The claim omits "completely or to an acceptable degree" but does not contradict it.
- verdict: supported · reason: direct. The claim is attributed to the documentation.
- bar: met (rung 1, attributed) · independence: n/a · currency: page dated 2022-06-22
- counter: not run

### V-C-r1-found-shm-17-1
- claim: C-r1-found-shm-17
- source S-r1-found-shm-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passages P6 (§ "3."), P7 and P9 (§ "8."): found verbatim
- implied: if the VFS lacks the shm primitives, journal_mode=WAL leaves the mode unchanged and returns the prior mode, e.g. "delete" (P6); with NORMAL locking at first WAL access, an attempt to open a database already in WAL mode, or to convert to WAL, fails when the VFS lacks shared-memory methods (P9 and the following sentence of the page); exception: EXCLUSIVE set before the first attempted access (P7). All stated; the claim's scope note (NORMAL locking mode) matches the page.
- verdict: supported · reason: each part is stated; the conditions match.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: current
- counter: not run

### V-C-r1-found-shm-21-1
- claim: C-r1-found-shm-21
- source S-r1-found-shm-02 · opened: https://www.sqlite.org/walformat.html (curl) · quote-match: exact · passages P22, P23, P24 at § "2.3.1. How the various locks are used": found verbatim
- implied: connections take a shared lock on one of five read-lock bytes "while they are within a transaction"; holding a shared lock on WAL_READ_LOCK(N) is a promise to use the WAL, not the database file, for pages modified by the first read-mark[N] entries; a checkpoint seeing a lock on WAL_READ_LOCK(N) "must not move WAL content into the main database for more than the first read-mark[N] frames". All match.
- verdict: supported · reason: direct. "For the duration of its transaction" is a close paraphrase of "while they are within a transaction".
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: page updated 2025-05-10
- counter: not run

### V-C-r1-found-shm-22-1
- claim: C-r1-found-shm-22
- source S-r1-found-shm-02 · opened: https://www.sqlite.org/walformat.html (curl) · quote-match: exact · passage P18 at § "2.3.1.": found verbatim
- implied: "All connections hold SQLITE_LOCK_SHARED continuously while attached to a WAL-mode database", including connections not in a transaction; "This is different from rollback mode, where the SQLITE_LOCK_SHARED is released at the end of each transaction." All stated.
- verdict: supported · reason: direct. The comparison is the specification's own, not an evaluation.
- bar: met (the comparison is a behavioural contrast stated by the spec itself; rung 1) · independence: n/a · currency: page updated 2025-05-10
- counter: not run

### V-C-r1-found-shm-25-1
- claim: C-r1-found-shm-25
- source S-r1-found-shm-02 · opened: https://www.sqlite.org/walformat.html (curl) · quote-match: exact · passage P25 at § "2.3.2.": found verbatim
- implied: the preceding sentence in the same block says "The SQLITE_LOCK_EXCLUSIVE lock must be held by a connection that wants to transition into or out of WAL mode"; with two or more connections each holds SHARED, so EXCLUSIVE cannot be obtained "and the transition out of WAL mode will not be allowed". All stated.
- verdict: supported · reason: the requirement sentence is in the same block as the cited passage.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: page updated 2025-05-10
- counter: not run

### V-C-r1-found-shm-26-1
- claim: C-r1-found-shm-26
- source S-r1-found-shm-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage P7 at § "8. Use of WAL Without Shared-Memory": found verbatim
- source S-r1-found-shm-07 · opened: https://www.sqlite.org/pragma.html (curl) · quote-match: exact · passage P2 at § "PRAGMA locking_mode": found verbatim
- implied: from 3.7.4 (2010-12-07), WAL databases can be created, read and written with shared memory unavailable if locking_mode=EXCLUSIVE before the first attempted access; "a process can interact with a WAL database without using shared memory if that process is guaranteed to be the only process accessing the database". All stated.
- verdict: supported · reason: direct. The pragma page supports only the general "without shared memory" half; the version and condition come from wal.html.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: current
- counter: not run

### V-C-r1-found-shm-27-1
- claim: C-r1-found-shm-27
- source S-r1-found-shm-02 · opened: https://www.sqlite.org/walformat.html (curl) · quote-match: exact · passages P3 (§ "1.3."), P4 (§ "1.4."): found verbatim
- source S-r1-found-shm-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage P8 at § "8.": found verbatim
- looked first: walformat says the shm file is "omitted if exclusive locking mode is set" and heap memory is used instead. wal.html §8 adds the condition: this holds only if EXCLUSIVE is set "prior to the first WAL-mode database access"; "If NORMAL locking mode is in effect for the first WAL-mode database access, then the shared-memory wal-index is created", and "As long as exactly one connection is using a shared-memory wal-index, the locking mode can be changed freely between NORMAL and EXCLUSIVE".
- implied: shm file absent and wal-index in heap memory, in EXCLUSIVE mode. True when EXCLUSIVE is set before the first WAL-mode access; not true if EXCLUSIVE is entered after a shared wal-index already exists. The claim sentence has no such condition (it appears only in the scope field).
- verdict: partial · reason: as a stand-alone sentence ("In EXCLUSIVE locking mode ...") it is broader than wal.html allows. · narrower claim: "When EXCLUSIVE locking mode is set before the first WAL-mode access to a database, SQLite creates no -shm file and keeps the wal-index in heap memory instead of a memory-mapped file."
- bar: met for the narrower claim (rung 1) · independence: n/a · currency: current
- counter: not run

### V-C-r1-found-shm-28-1
- claim: C-r1-found-shm-28
- source S-r1-found-shm-07 · opened: https://www.sqlite.org/pragma.html (curl) · quote-match: exact · passage P1 at § "PRAGMA locking_mode": found verbatim
- source S-r1-found-shm-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passages P8 (§ "8."), P10 (§ "9."): found verbatim
- implied: EXCLUSIVE mode: "the database connection never releases file-locks"; with another connection holding the database open in exclusive locking mode "all queries against the database will return SQLITE_BUSY"; without shared memory the connection stays in EXCLUSIVE as long as the journal mode is WAL, "PRAGMA locking_mode=NORMAL" is a no-op, and the only way out is to leave WAL mode. All stated. P10 is about exclusive mode generally, which includes the no-shared-memory case. "Costs" is the researcher's framing of these three stated consequences.
- verdict: supported · reason: each of the three consequences is stated; the scope (EXCLUSIVE set before first WAL access) is carried by the claim's scope field and P8.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: current
- counter: not run

### V-C-r1-found-shm-38-1
- claim: C-r1-found-shm-38
- source S-r1-found-shm-02 · opened: https://www.sqlite.org/walformat.html (curl) · quote-match: exact · passages P31 (§ "3. Recovery"), P6 (§ "1.5. Variations"): found verbatim
- implied: if the memory-mapped wal-index file is read-only to the first thread to connect, that thread builds a private heap-memory wal-index and runs recovery to populate it, rather than writing the shared area; a read/write client invoking sqlite3_file_control(SQLITE_FCNTL_PERSIST_WAL) before shutdown still runs a checkpoint but the shm and wal files are not deleted, so later read-only clients can read the database. All stated.
- verdict: supported · reason: direct, both halves.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: page updated 2025-05-10
- counter: not run

## Counter-evidence
- none recorded as sources. For C-r1-found-shm-11 and C-r1-found-shm-13 the searches ("SQLite WAL mode network filesystem limitations works anyway", "SQLite wal-index shared memory corruption different files two processes", "SQLite WAL network filesystem support changed new version wal-index without shared memory") found no source disputing the claims and no later change; the only nuance (WAL with EXCLUSIVE locking and a single process, wal.html §8) is already in the dossier and consistent.

## Leads
- https://bugzilla.mozilla.org/show_bug.cgi?id=1650201 — search summary says a SQLite developer there states that WAL on a network filesystem needs exclusive locking (heap-memory wal-index); not opened, so rung-3 pointer only.

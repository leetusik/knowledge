# Findings: 20261023-1245-sqlite-wal · round 2 · angle practice-config
- researcher: claude-opus-5-5 · status: partial (hard cap of 40 tool calls exceeded: about 64 used; both questions answered from rung-1 sources, but changes.html was not searched and the excerpt hashes were not computed) · tool calls: 64

## Questions
- Q39: answered — claims: C-r2-practice-config-01, -02, -03, -04, -05, -06, -07 — note: the SQLite 3.54.1 source states it directly. btreeBeginTrans calls the busy handler only while the connection held no transaction at the call (pBt->inTransaction==TRANS_NONE). pager.c says the WAL write-lock attempt never calls the busy handler itself. wal.c returns SQLITE_BUSY_SNAPSHOT whenever another connection has written since this connection's read transaction began, so a retry inside that same read transaction meets the same condition. "Retrying does not help" is the writer's step from C-05 plus the isolation page (S-r1-found-rw-03/P3); no page states it in those words.
- Q40: answered — claims: C-r2-practice-config-08 … -20 — note: the docs and the code say what each level syncs and when, and say SQLite trusts the OS and the drive (it cannot detect a sync that lies). On macOS, SQLite 3.54.1 issues F_FULLFSYNC only when PRAGMA fullfsync is on (or, for checkpoint syncs only, checkpoint_fullfsync); both are off by default. Otherwise it calls plain fsync(), which Apple's own fsync(2) says may leave data in the drive's cache, lost or reordered on power loss. No single source says "synchronous=FULL on macOS is not durable without fullfsync": that conclusion combines C-14, C-15, C-16 and C-17. changes.html was not searched (budget). A grep of os_unix.c at 3.54.1 for F_BARRIERFSYNC found no match.

## Sources

### S-r2-practice-config-01
- url: https://raw.githubusercontent.com/sqlite/sqlite/57520227c95396ce39ba6ecaac8d475b78dd3964/src/btree.c · canonical: github.com/sqlite/sqlite/blob/57520227c95396ce39ba6ecaac8d475b78dd3964/src/btree.c
- repo: github.com/sqlite/sqlite (official GitHub mirror of the Fossil repository) · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1; commit message "Version 3.54.1", FossilOrigin-Name 555e07ef33f6…) · date: 2026-10-16
- title: src/btree.c · authors: SQLite developers · publisher: SQLite project
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project (Hipp, Wyrick & Company) · upstream: none
- lateral: the GitHub mirror is the project's own read-only mirror. The tag and sha come from the GitHub tags API (pages/r2-found-ckpt-tags.json) and the commit API (pages/r2-practice-config-commit.json). Excerpt hashes were not computed because there is no local clone and pipelines are not allowed. Check by content.
- passages:
  - P1 · src/btree.c:L3614-L3618@5752022 (comment above btreeBeginTrans): "If an initial attempt to acquire the lock fails because of lock contention ** and the database was previously unlocked, then invoke the busy handler ** if there is one. But if there was previously a read-lock, do not ** invoke the busy handler - just return SQLITE_BUSY. SQLITE_BUSY is ** returned when there is already a read-lock in order to avoid a deadlock."
  - P2 · src/btree.c:L3620-L3626@5752022: "Suppose there are two processes A and B. A has a read lock and B has ** a reserved lock. B tries to promote to exclusive but is blocked because ** of A's read lock. A tries to promote to reserved but is blocked by B. ** One or the other of the two processes must give way or there can be ** no progress. By returning SQLITE_BUSY and not invoking the busy callback ** when A already has a read lock, we encourage A to give up and let B ** proceed."
  - P3 · src/btree.c:L3770-L3771@5752022: "}while( (rc&0xFF)==SQLITE_BUSY && pBt->inTransaction==TRANS_NONE && btreeInvokeBusyHandler(pBt) );"
  - P4 · src/btree.c:L3750-L3754@5752022: "}else if( rc==SQLITE_BUSY_SNAPSHOT && pBt->inTransaction==TRANS_NONE ){ /* if there was no transaction opened when this function was ** called and SQLITE_BUSY_SNAPSHOT is returned, change the error ** code to SQLITE_BUSY. */ rc = SQLITE_BUSY;"
  - P5 · src/btree.c:L3743-L3747@5752022: "if( rc==SQLITE_OK && wrflag ){ … rc = sqlite3PagerBegin(pPager, wrflag>1, sqlite3TempInMemory(p->db));"
  - P6 · src/btree.c:L2534-L2538@5752022: "static int btreeInvokeBusyHandler(void *pArg){ … return sqlite3InvokeBusyHandler(&pBt->db->busyHandler);"
  - P7 · src/btree.c:L3835-L3841@5752022: "int sqlite3BtreeBeginTrans(Btree *p, int wrflag, int *pSchemaVersion){ BtShared *pBt; if( p->sharable || p->inTrans==TRANS_NONE || (p->inTrans==TRANS_READ && wrflag!=0) ){ return btreeBeginTrans(p,wrflag,pSchemaVersion);"
  - P8 · src/btree.c:L3763-L3767@5752022: "#if defined(SQLITE_ENABLE_SETLK_TIMEOUT) if( rc==SQLITE_BUSY_TIMEOUT ){ /* If a blocking lock timed out, break out of the loop here so that ** the busy-handler is not invoked. */"

### S-r2-practice-config-02
- url: https://raw.githubusercontent.com/sqlite/sqlite/57520227c95396ce39ba6ecaac8d475b78dd3964/src/wal.c · canonical: github.com/sqlite/sqlite/blob/57520227c95396ce39ba6ecaac8d475b78dd3964/src/wal.c
- repo: github.com/sqlite/sqlite · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1) · date: 2026-10-16
- title: src/wal.c · authors: SQLite developers · publisher: SQLite project
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-r2-practice-config-01. No excerpt hash; check by content.
- passages:
  - P1 · src/wal.c:L3778-L3783@5752022 (comment above sqlite3WalBeginWriteTransaction): "If another thread or process has written into the database since ** the read transaction was started, then it is not possible for this ** thread to write as doing so would cause a fork. So this routine ** returns SQLITE_BUSY in that case and no write transaction is started. ** ** There can only be a single writer active at a time."
  - P2 · src/wal.c:L3807-L3813@5752022: "/* Only one writer allowed at a time. Get the write lock. Return ** SQLITE_BUSY if unable. */ rc = walLockExclusive(pWal, WAL_WRITE_LOCK, 1); if( rc ){ return rc; }"
  - P3 · src/wal.c:L3816-L3822@5752022: "/* If another connection has written to the database file since the ** time the read transaction on this connection was started, then ** the write is disallowed. */ SEH_TRY { if( memcmp(&pWal->hdr, (void *)walIndexHdr(pWal), sizeof(WalIndexHdr))!=0 ){ rc = SQLITE_BUSY_SNAPSHOT;"
  - P4 · src/wal.c:L1139-L1143@5752022: "static int walLockExclusive(Wal *pWal, int lockIdx, int n){ int rc; if( pWal->exclusiveMode ) return SQLITE_OK; rc = sqlite3OsShmLock(pWal->pDbFd, lockIdx, n, SQLITE_SHM_LOCK | SQLITE_SHM_EXCLUSIVE);"
  - P5 · src/wal.c:L3827-L3829@5752022: "if( rc!=SQLITE_OK ){ walUnlockExclusive(pWal, WAL_WRITE_LOCK, 1); pWal->writeLock = 0;"

### S-r2-practice-config-07
- url: https://raw.githubusercontent.com/sqlite/sqlite/57520227c95396ce39ba6ecaac8d475b78dd3964/src/pager.c · canonical: github.com/sqlite/sqlite/blob/57520227c95396ce39ba6ecaac8d475b78dd3964/src/pager.c
- repo: github.com/sqlite/sqlite · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1) · date: 2026-10-16
- title: src/pager.c · authors: SQLite developers · publisher: SQLite project
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-r2-practice-config-01. No excerpt hash; check by content.
- passages:
  - P1 · src/pager.c:L6006-L6011@5752022 (sqlite3PagerBegin, WAL branch): "/* Grab the write lock on the log file. If successful, upgrade to ** PAGER_RESERVED state. Otherwise, return an error code to the caller. ** The busy-handler is not invoked if another connection already ** holds the write-lock. If possible, the upper layer will call it. */ rc = sqlite3WalBeginWriteTransaction(pPager->pWal);"
  - P2 · src/pager.c:L3645-L3653@5752022 (comment above sqlite3PagerSetFlags): "For WAL mode, OFF continues ** to mean that no syncs ever occur. NORMAL means that the WAL is synced ** prior to the start of checkpoint and that the database file is synced ** at the conclusion of the checkpoint if the entire content of the WAL ** was written back into the database. But no sync operations occur for ** an ordinary commit in NORMAL mode with WAL. FULL means that the WAL ** file is synced following each commit operation, in addition to the ** syncs associated with NORMAL. There is no difference between FULL ** and EXTRA for WAL mode."
  - P3 · src/pager.c:L3655-L3661@5752022: "Do not confuse synchronous=FULL with SQLITE_SYNC_FULL. The ** SQLITE_SYNC_FULL macro means to use the MacOSX-style full-fsync ** using fcntl(F_FULLFSYNC). SQLITE_SYNC_NORMAL means to do an ** ordinary fsync() call. There is no difference between SQLITE_SYNC_FULL ** and SQLITE_SYNC_NORMAL on platforms other than MacOSX. But the ** synchronous=FULL versus synchronous=NORMAL setting determines when ** the xSync primitive is called and is relevant to all platforms."
  - P4 · src/pager.c:L3693-L3699@5752022: "if( pPager->noSync ){ pPager->syncFlags = 0; }else if( pgFlags & PAGER_FULLFSYNC ){ pPager->syncFlags = SQLITE_SYNC_FULL; }else{ pPager->syncFlags = SQLITE_SYNC_NORMAL; }"
  - P5 · src/pager.c:L3704-L3705@5752022: "if( (pgFlags & PAGER_CKPT_FULLFSYNC) && !pPager->noSync ){ pPager->walSyncFlags |= (SQLITE_SYNC_FULL<<2);"

### S-r2-practice-config-08
- url: https://raw.githubusercontent.com/sqlite/sqlite/57520227c95396ce39ba6ecaac8d475b78dd3964/src/os_unix.c · canonical: github.com/sqlite/sqlite/blob/57520227c95396ce39ba6ecaac8d475b78dd3964/src/os_unix.c
- repo: github.com/sqlite/sqlite · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1) · date: 2026-10-16
- title: src/os_unix.c · authors: SQLite developers · publisher: SQLite project
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-r2-practice-config-01. No excerpt hash; check by content.
- passages:
  - P1 · src/os_unix.c:L3743-L3745@5752022: "Define HAVE_FULLFSYNC to 0 or 1 depending on whether or not ** the F_FULLFSYNC macro is defined. F_FULLFSYNC is currently ** only available on Mac OS X. But that could change."
  - P2 · src/os_unix.c:L3815-L3829@5752022 (full_fsync): "#elif HAVE_FULLFSYNC if( fullSync ){ rc = osFcntl(fd, F_FULLFSYNC, 0); }else{ rc = 1; } … if( rc ) rc = fsync(fd);"
  - P3 · src/os_unix.c:L3821-L3825@5752022: "If the FULLFSYNC failed, fall back to attempting an fsync(). ** It shouldn't be possible for fullfsync to fail on the local ** file system (on OSX), so failure indicates that FULLFSYNC ** isn't supported for this file system."
  - P4 · src/os_unix.c:L3836-L3837@5752022: "#else rc = fdatasync(fd);"
  - P5 · src/os_unix.c:L3755-L3757@5752022: "The fsync() system call does not work as advertised on many ** unix systems. The following procedure is an attempt to make ** it work better."

### S-r2-practice-config-03
- url: https://sqlite.org/pragma.html · canonical: sqlite.org/pragma.html
- title: Pragma statements supported by SQLite · authors: n/a · publisher: SQLite (sqlite.org)
- date: current as of access · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official documentation of the SQLite library (same page as S-r1-practice-config-02, fetched again for new passages).
- passages:
  - P1 · § "PRAGMA fullfsync": "This flag determines whether or not the F_FULLFSYNC syncing method is used on systems that support it. The default value of the fullfsync flag is off. Only Mac OS X supports F_FULLFSYNC."
  - P2 · § "PRAGMA checkpoint_fullfsync": "Query or change the fullfsync flag for checkpoint operations. If this flag is set, then the F_FULLFSYNC syncing method is used during checkpoint operations on systems that support F_FULLFSYNC. The default value of the checkpoint_fullfsync flag is off. Only Mac OS-X supports F_FULLFSYNC."
  - P3 · § "PRAGMA checkpoint_fullfsync": "If the fullfsync flag is set, then the F_FULLFSYNC syncing method is used for all sync operations and the checkpoint_fullfsync setting is irrelevant."
  - P4 · § "PRAGMA synchronous": "When synchronous is FULL (2), the SQLite database engine will use the xSync method of the VFS to ensure that all content is safely written to the disk surface prior to continuing. This ensures that an operating system crash or power failure will not corrupt the database."
  - P5 · § "PRAGMA synchronous": "FULL might also be durable using a rollback journal, depending on the underlying filesystem. FULL is not necessarily durable across a power loss in rollback mode, so if durability is desired, it is best to set the synchronous mode to EXTRA."
  - P6 · § "PRAGMA synchronous": "The extra WAL sync following each transaction helps ensure that transactions are durable across a power loss. Transactions are consistent with or without the extra syncs provided by synchronous=FULL. If durability is not a concern, then synchronous=NORMAL is normally all one needs in WAL mode."
  - P7 · § "PRAGMA synchronous": "When synchronous is NORMAL (1), the SQLite database engine will still sync at the most critical moments, but less often than in FULL mode."

### S-r2-practice-config-04
- url: https://sqlite.org/howtocorrupt.html · canonical: sqlite.org/howtocorrupt.html
- title: How To Corrupt An SQLite Database File · authors: n/a · publisher: SQLite (sqlite.org)
- date: current as of access · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official documentation; same page as S-r1-criticism-10 (criticism angle), fetched again for the sync section.
- passages:
  - P1 · § "3. Failure to sync": "In order to guarantee that database files are always consistent, SQLite will occasionally ask the operating system to flush all pending writes to persistent storage then wait for that flush to complete. This is accomplished using the fsync() system call under unix and FlushFileBuffers() under Windows."
  - P2 · § "3. Failure to sync": "Actually, if one is only concerned with atomic and consistent writes and is willing to forego durable writes, the sync operation does not need to wait until the content is completely stored on persistent media. Instead, the sync operation can be thought of as an I/O barrier."
  - P3 · § "3. Failure to sync": "If sync is operating as an I/O barrier and not as a true sync, then a power failure or system crash might cause one or more previously committed transactions to roll back (in violation of the "durable" property of "ACID") but the database will at least continue to be consistent, and that is what most people care about."
  - P4 · § "3.1. Disk drives that do not honor sync requests": "Unfortunately, most consumer-grade mass storage devices lie about syncing. Disk drives will report that content is safely on persistent media as soon as it reaches the track buffer and before actually being written to oxide."
  - P5 · § "3.1. Disk drives that do not honor sync requests": "But if a power loss or hard reset does occur, and if that results in content that was written after a sync reaching oxide while content written before the sync is still in a track buffer, then database corruption can occur."
  - P6 · § "3.1. Disk drives that do not honor sync requests": "Note that SQLite must believe whatever the operating system and hardware tell it about the status of sync requests. There is no way for SQLite to detect that either is lying and that writes might be occurring out-of-order."
  - P7 · § "3.1. Disk drives that do not honor sync requests": "In WAL mode, the only time that a failed sync operation can cause database corruption is during a checkpoint operation. A sync failure during a COMMIT might result in loss of durability but not in a corrupt database file. Hence, one line of defense against database corruption due to failed sync operations is to use SQLite in WAL mode and to checkpoint as infrequently as possible."
  - P8 · § "3.2. Disabling sync using PRAGMAs": "For maximum reliability and for robustness against database corruption, SQLite should always be run with its default synchronous setting of FULL."

### S-r2-practice-config-05
- url: https://sqlite.org/atomiccommit.html · canonical: sqlite.org/atomiccommit.html
- title: Atomic Commit In SQLite · authors: n/a · publisher: SQLite (sqlite.org)
- date: current as of access; the text refers to "version 3.5.0" as current in places (old article) · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official documentation. The page says it covers rollback mode only (P1), so its sync assumptions are scoped to that mode.
- passages:
  - P1 · § "1. Introduction": "The information in this article applies only when SQLite is operating in "rollback mode", or in other words when SQLite is not using a write-ahead log."
  - P2 · § "2. Hardware Assumptions": "SQLite assumes that the operating system will buffer writes and that a write request will return before data has actually been stored in the mass storage device. SQLite further assumes that write operations will be reordered by the operating system. For this reason, SQLite does a "flush" or "fsync" operation at key points. SQLite assumes that the flush or fsync will not return until all pending write operations for the file that is being flushed have completed."
  - P3 · § "2. Hardware Assumptions": "However, there is nothing that SQLite can do to test for or remedy the situation. SQLite assumes that the operating system that it is running on works as advertised."
  - P4 · § "9.2. Incomplete Disk Flushes": "Even on systems where FlushFileBuffers() and fsync() are said to be working, often the IDE disk control lies and says that data has reached oxide while it is still held only in the volatile control cache."
  - P5 · § "9.2. Incomplete Disk Flushes": "On the Mac, you can set this pragma: … Setting fullfsync on a Mac will guarantee that data really does get pushed out to the disk platter on a flush. But the implementation of fullfsync involves resetting the disk controller. And so not only is it profoundly slow, it also slows down other unrelated disk I/O. So its use is not recommended."

### S-r2-practice-config-06
- url: https://sqlite.org/c3ref/busy_timeout.html · canonical: sqlite.org/c3ref/busy_timeout.html
- title: Set A Busy Timeout · authors: n/a · publisher: SQLite (sqlite.org)
- date: current as of access · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official C-interface documentation.
- passages:
  - P1 · § "Set A Busy Timeout": "This routine sets a busy handler that sleeps for a specified amount of time when a table is locked. The handler will sleep multiple times until at least "ms" milliseconds of sleeping have accumulated. After at least "ms" milliseconds of sleeping, the handler returns 0 which causes sqlite3_step() to return SQLITE_BUSY."

### S-r2-practice-config-11
- url: https://raw.githubusercontent.com/apple-oss-distributions/xnu/e3723e1f17661b24996789d8afc084c0c3303b26/bsd/man/man2/fcntl.2 · canonical: github.com/apple-oss-distributions/xnu/blob/e3723e1f17661b24996789d8afc084c0c3303b26/bsd/man/man2/fcntl.2
- repo: github.com/apple-oss-distributions/xnu · commit: e3723e1f17661b24996789d8afc084c0c3303b26 (xnu-11417.101.15; the latest commit touching this file, per the GitHub commits API) · date: 2025-05-01
- title: fcntl(2) manual page source · authors: Apple / BSD · publisher: Apple Inc. (open-source distribution of the macOS kernel)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Apple Inc. · upstream: none
- lateral: apple-oss-distributions is Apple's own GitHub organisation for its open-source releases. This troff file is the source of the macOS fcntl(2) man page. The older rendered copy on developer.apple.com's documentation archive lists F_FULLFSYNC only for HFS, FAT and UDF, with no APFS and no F_BARRIERFSYNC, so it is superseded.
- passages:
  - P1 · § "F_FULLFSYNC" (L230-L245): "then asks the drive to flush all buffered data to the permanent storage device"
  - P2 · § "F_FULLFSYNC" (L230-L245): "As this drains the entire queue of the device and acts as a barrier, data that had been fsync'd on the same device before is guaranteed to be persisted when this call returns. This is currently implemented on HFS, MS-DOS (FAT), Universal Disk Format (UDF) and APFS file systems. The operation may take quite a while to complete. Certain FireWire drives have also been known to ignore the request to flush their buffered data."
  - P3 · § "F_BARRIERFSYNC" (L207-L229): "then issues a barrier command to the drive"
  - P4 · § "F_BARRIERFSYNC" (L207-L229): "although no assumption should be made on what has been persisted or not when this call returns."
  - P5 · § "F_BARRIERFSYNC" (L207-L229): "This is typically useful to guarantee valid state on disk when ordering is a concern but durability is not."
  - P6 · § "F_BARRIERFSYNC" (L207-L229): "This is currently implemented on HFS and APFS. It requires hardware support, which Apple SSDs are guaranteed to provide."

### S-r2-practice-config-12
- url: https://raw.githubusercontent.com/apple-oss-distributions/xnu/e3723e1f17661b24996789d8afc084c0c3303b26/bsd/man/man2/fsync.2 · canonical: github.com/apple-oss-distributions/xnu/blob/e3723e1f17661b24996789d8afc084c0c3303b26/bsd/man/man2/fsync.2
- repo: github.com/apple-oss-distributions/xnu · commit: e3723e1f17661b24996789d8afc084c0c3303b26 (xnu-11417.101.15) · date: 2025-05-01 (commit); the page's .Dd line still reads "June 4, 1993"
- title: fsync(2) manual page source · authors: Apple / BSD · publisher: Apple Inc.
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Apple Inc. · upstream: none
- lateral: as S-r2-practice-config-11. The same wording appears in the rendered archive copy at developer.apple.com (ManPages_iPhoneOS/man2/fsync.2.html).
- passages:
  - P1 · § "DESCRIPTION" (L58-L62): "will flush all data from the host to the drive (i.e. the "permanent storage device"), the drive itself may not physically write the data to the platters for quite some time and it may be written in an out-of-order sequence."
  - P2 · § "DESCRIPTION" (L64-L68): "Specifically, if the drive loses power or the OS crashes, the application may find that only some or none of their data was written. The disk drive may also re-order the data so that later writes may be present, while earlier writes are not."
  - P3 · § "DESCRIPTION" (L70-L72): "This is not a theoretical edge case. This scenario is easily reproduced with real world workloads and drive power failures."
  - P4 · § "DESCRIPTION" (L76-L82): "Mac OS X provides the F_FULLFSYNC fcntl. The F_FULLFSYNC fcntl asks the drive to flush all buffered data to permanent storage. Applications, such as databases, that require a strict ordering of writes should use F_FULLFSYNC to ensure that their data is written in the order they expect."

## Claims

### C-r2-practice-config-01
- claim: In SQLite 3.54.1, btreeBeginTrans retries a lock attempt through the busy handler only while the result is an SQLITE_BUSY code and the shared btree had no transaction open when the call began (pBt->inTransaction==TRANS_NONE). A connection that already holds a read transaction and asks for a write transaction therefore gets SQLITE_BUSY back without its busy handler (and so without busy_timeout) ever running.
- kind: behaviour
- questions: Q39 · load-bearing: yes (why busy_timeout does not save a deferred read-to-write upgrade)
- support: S-r2-practice-config-01/P3 · src/btree.c:L3770-L3771@5752022 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-01/P7 · src/btree.c:L3835-L3841@5752022 · rung 1 · fit direct (an upgrade from TRANS_READ with wrflag!=0 goes through btreeBeginTrans) · upstream self
- support: S-r2-practice-config-01/P6 · src/btree.c:L2534-L2538@5752022 · rung 1 · fit direct (btreeInvokeBusyHandler calls the connection's busy handler) · upstream self
- support: S-r2-practice-config-01/P1 · src/btree.c:L3614-L3618@5752022 · rung 1 · fit direct (the comment states the rule: no busy handler "if there was previously a read-lock") · upstream self
  excerpt-sha256: not computed (no local clone; check by content)
- scope: SQLite 3.54.1 (tag version-3.54.1, commit 5752022). Applies in every journal mode. pBt->inTransaction is per BtShared, so this reading covers ordinary connections without shared cache. The SQLITE_ENABLE_SETLK_TIMEOUT build path (P8) also leaves the loop on SQLITE_BUSY_TIMEOUT. That busy_timeout is built on the busy handler is S-r1-practice-config-07/P5.
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-config-02
- claim: A comment in SQLite's btree.c (3.54.1) gives the reason for returning SQLITE_BUSY at once to a connection that already holds a read lock: two connections could otherwise wait on each other forever (A holds a read lock and wants to write; B holds the reserved lock and waits for A's read lock to go), so SQLite makes A give up so that B can proceed.
- kind: behaviour
- questions: Q39 · load-bearing: yes (the "why")
- support: S-r2-practice-config-01/P2 · src/btree.c:L3620-L3626@5752022 · rung 1 · fit direct (rationale stated in rollback-journal lock names: read, reserved, exclusive) · upstream self
- support: S-r2-practice-config-01/P1 · src/btree.c:L3614-L3618@5752022 · rung 1 · fit direct ("in order to avoid a deadlock") · upstream self
- scope: SQLite 3.54.1. The comment's example uses rollback-journal lock names, the same wording as c3ref/busy_handler.html (S-r1-practice-config-07/P2). The code path in C-01 is the same in WAL mode. This rationale should be presented as SQLite's own.
- confidence: high · flags: vendor-about-itself (the developers' stated rationale)
- conflicts: none

### C-r2-practice-config-03
- claim: In WAL mode, SQLite 3.54.1 starts a write transaction from the pager (sqlite3PagerBegin) by calling sqlite3WalBeginWriteTransaction, and the pager's comment says that the busy handler is not invoked there if another connection already holds the WAL write lock: the error goes back to the caller, and "if possible, the upper layer will call it" (the btree retry loop in C-01).
- kind: behaviour
- questions: Q39 · load-bearing: yes (the WAL path itself does not wait)
- support: S-r2-practice-config-07/P1 · src/pager.c:L6006-L6011@5752022 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-01/P5 · src/btree.c:L3743-L3747@5752022 · rung 1 · fit direct (btreeBeginTrans calls sqlite3PagerBegin for a write) · upstream self
  excerpt-sha256: not computed (no local clone; check by content)
- scope: SQLite 3.54.1, WAL mode, locking_mode NORMAL
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-config-04
- claim: SQLite 3.54.1's sqlite3WalBeginWriteTransaction first tries once to take the WAL_WRITE_LOCK through the VFS shared-memory lock call and returns SQLITE_BUSY if that fails. After taking it, if the wal-index header has changed since this connection's read transaction began (another connection has written), it releases the write lock and returns SQLITE_BUSY_SNAPSHOT.
- kind: behaviour
- questions: Q39 · load-bearing: yes (the two ways the WAL upgrade fails)
- support: S-r2-practice-config-02/P2 · src/wal.c:L3807-L3813@5752022 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-02/P4 · src/wal.c:L1139-L1143@5752022 · rung 1 · fit direct (walLockExclusive is a single sqlite3OsShmLock call, with no loop or busy-handler call) · upstream self
- support: S-r2-practice-config-02/P3 · src/wal.c:L3816-L3822@5752022 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-02/P5 · src/wal.c:L3827-L3829@5752022 · rung 1 · fit direct · upstream self
  excerpt-sha256: not computed (no local clone; check by content)
- scope: SQLite 3.54.1, WAL mode. Whether the VFS's xShmLock itself blocks was not read here; in builds with SQLITE_ENABLE_SETLK_TIMEOUT a write lock may already be held early (lines L3788-L3796 of the same function, not quoted).
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-config-05
- claim: SQLite's wal.c (3.54.1) states that if another thread or process has written to the database since a connection's read transaction started, that connection cannot write, because doing so "would cause a fork". The test compares the connection's snapshot header against the current wal-index header, so the write stays disallowed for as long as that read transaction stays open.
- kind: behaviour
- questions: Q39 · load-bearing: yes (why retrying the statement inside the same transaction does not help)
- support: S-r2-practice-config-02/P1 · src/wal.c:L3778-L3783@5752022 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-02/P3 · src/wal.c:L3816-L3822@5752022 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-03/P3 (known; isolation.html) · rung 1 · fit partial (the reader "must end its read transaction and start a new one" to see Y's changes) · upstream self
  excerpt-sha256: not computed (no local clone; check by content)
- scope: SQLite 3.54.1, WAL mode. The "stays disallowed for as long as that read transaction stays open" clause follows from the condition being measured against the start of the read transaction. No source says "retrying does not help" in those words. When the other connection only holds the write lock and has not yet committed (C-04's first case), a later retry inside the same transaction can succeed only if that writer rolls back; that case is unclaimed.
- confidence: high (code) / medium (the "for as long as" reading) · flags: none
- conflicts: none

### C-r2-practice-config-06
- claim: In SQLite 3.54.1, when a connection had no transaction open and the WAL write attempt returns SQLITE_BUSY_SNAPSHOT (another connection committed between the start of the new read snapshot and the write-lock attempt), btreeBeginTrans turns it into plain SQLITE_BUSY, and the retry loop then calls the busy handler. SQLITE_BUSY_SNAPSHOT therefore reaches the application only when an already-open read transaction tries to write.
- kind: behaviour
- questions: Q39 · load-bearing: no (explains why BEGIN IMMEDIATE waits under busy_timeout while a deferred upgrade does not)
- support: S-r2-practice-config-01/P4 · src/btree.c:L3750-L3754@5752022 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-01/P3 · src/btree.c:L3770-L3771@5752022 · rung 1 · fit direct · upstream self
  excerpt-sha256: not computed (no local clone; check by content)
- scope: SQLite 3.54.1. The parenthesised race is the writer's paraphrase of when a fresh read snapshot can be stale by write time. The "therefore … only" clause applies to this code path.
- confidence: medium · flags: none
- conflicts: none

### C-r2-practice-config-07
- claim: sqlite3_busy_timeout (and PRAGMA busy_timeout) installs a busy handler that sleeps repeatedly while a table is locked until at least the given number of milliseconds of sleep have accumulated, then returns 0, which makes sqlite3_step() return SQLITE_BUSY.
- kind: behaviour
- questions: Q39 · load-bearing: no (what busy_timeout does when it does run)
- support: S-r2-practice-config-06/P1 · rung 1 · fit direct · upstream self
- scope: current SQLite C-interface docs
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-config-08
- claim: SQLite's how-to-corrupt page defines a "sync" as SQLite asking the operating system to flush all pending writes to persistent storage and waiting for the flush to finish, done with fsync() on Unix and FlushFileBuffers() on Windows.
- kind: definition
- questions: Q40 · load-bearing: yes (what every synchronous level relies on)
- support: S-r2-practice-config-04/P1 · rung 1 · fit direct · upstream self
- scope: current SQLite docs
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-config-09
- claim: SQLite's documentation says that for atomicity and consistency alone a sync need only act as an I/O barrier (all writes before it complete before any write after it). If a sync works only as a barrier and not as a true flush, a power failure or system crash can roll back previously committed transactions, violating durability, while the database stays consistent.
- kind: behaviour
- questions: Q40 · load-bearing: yes (consistency needs ordering; durability needs a true flush)
- support: S-r2-practice-config-04/P2 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-04/P3 · rung 1 · fit direct · upstream self
- scope: current SQLite docs, how-to-corrupt § 3
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-config-10
- claim: SQLite's how-to-corrupt page states that most consumer-grade storage devices lie about syncing, reporting content as persisted once it reaches the drive's buffer, and that if a power loss lets content written after a sync reach the media while content written before it does not, the database can be corrupted.
- kind: fact
- questions: Q40 · load-bearing: yes (what the docs say about disks that do not honour sync) — usable in attributed form
- support: S-r2-practice-config-04/P4 · rung 1 (for the attributed statement) · fit direct · upstream self
- support: S-r2-practice-config-04/P5 · rung 1 (attributed) · fit direct · upstream self
- scope: SQLite project's statement about third-party hardware. "Most consumer-grade" is the project's own generalisation, with no data cited. Apple's fsync(2) (C-17) independently describes the same drive behaviour for macOS.
- confidence: high (that the docs say it) · flags: superlative ("most consumer-grade mass storage devices"); claim about third parties
- conflicts: none

### C-r2-practice-config-11
- claim: SQLite's documentation states that SQLite must believe what the operating system and hardware report about sync requests and has no way to detect that either is lying or that writes are reordered. The how-to-corrupt page adds that in WAL mode a failed sync can corrupt the database only during a checkpoint, while a failed sync at COMMIT can lose durability but not corrupt the file. It suggests WAL mode and infrequent checkpoints as one defence.
- kind: behaviour
- questions: Q40 · load-bearing: yes
- support: S-r2-practice-config-04/P6 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-04/P7 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-05/P3 · rung 1 · fit direct (atomiccommit: "nothing that SQLite can do to test for or remedy the situation"; rollback-mode article) · upstream self
- scope: current SQLite docs. Extends C-r1-criticism-23, which holds the WAL checkpoint-only clause.
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r2-practice-config-12
- claim: SQLite's atomic-commit article, which says it covers rollback mode only, lists as hardware assumptions that the OS buffers and reorders writes, and that a flush or fsync does not return until all pending writes to that file have completed. It says SQLite assumes the OS works as advertised and cannot test for or remedy a broken flush.
- kind: behaviour
- questions: Q40 · load-bearing: no (background to the assumption; WAL scope is indirect)
- support: S-r2-practice-config-05/P2 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-05/P3 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-05/P1 · rung 1 · fit direct (scope: rollback mode only) · upstream self
- scope: rollback mode, per the article's own statement; an old article (it calls 3.5.0 current in places)
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-config-13
- claim: SQLite's pragma documentation says synchronous=FULL uses the VFS xSync method so that all content is safely written to the disk surface before continuing, which ensures an OS crash or power failure will not corrupt the database. It says the extra WAL sync after each commit in WAL mode "helps ensure" durability across power loss, whereas in rollback mode FULL is not necessarily durable and EXTRA is advised when durability is wanted.
- kind: behaviour
- questions: Q40 · load-bearing: yes (what FULL promises, in the docs' own hedged words)
- support: S-r2-practice-config-03/P4 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-03/P6 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-03/P5 · rung 1 · fit direct · upstream self
- scope: current docs. The guarantee rests on xSync actually reaching the disk surface (see C-10, C-11, C-16, C-17). Overlaps C-r1-practice-config-07/-08 and adds the hedge "helps ensure" and the rollback-mode contrast.
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r2-practice-config-14
- claim: PRAGMA fullfsync controls whether SQLite uses the F_FULLFSYNC sync method, and PRAGMA checkpoint_fullfsync makes SQLite use it during checkpoint operations only. Both are off by default, only macOS supports F_FULLFSYNC, and when fullfsync is on it applies to all sync operations, making checkpoint_fullfsync irrelevant.
- kind: behaviour
- questions: Q40 · load-bearing: yes
- support: S-r2-practice-config-03/P1 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-03/P2 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-03/P3 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-07/P4 · src/pager.c:L3693-L3699@5752022 · rung 1 · fit direct (sync flags become SQLITE_SYNC_FULL only under PAGER_FULLFSYNC) · upstream self
- support: S-r2-practice-config-07/P5 · src/pager.c:L3704-L3705@5752022 · rung 1 · fit partial (checkpoint_fullfsync ORs SQLITE_SYNC_FULL into one field of walSyncFlags; see flags on the bit layout) · upstream self
- scope: current docs; SQLite 3.54.1 code. The link between PRAGMA fullfsync and the PAGER_FULLFSYNC flag was not read in pragma.c.
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-config-15
- claim: A comment in SQLite's pager.c (3.54.1) warns not to confuse synchronous=FULL with SQLITE_SYNC_FULL: SQLITE_SYNC_FULL means the macOS-style full fsync with fcntl(F_FULLFSYNC), SQLITE_SYNC_NORMAL means an ordinary fsync(), the two do not differ on platforms other than macOS, and the synchronous level decides when xSync is called on every platform.
- kind: behaviour
- questions: Q40 · load-bearing: yes (synchronous=FULL picks when to sync; fullfsync picks how hard)
- support: S-r2-practice-config-07/P3 · src/pager.c:L3655-L3661@5752022 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-07/P2 · src/pager.c:L3645-L3653@5752022 · rung 1 · fit direct (in WAL mode: NORMAL syncs around checkpoints, FULL adds a WAL sync after each commit, EXTRA = FULL) · upstream self
  excerpt-sha256: not computed (no local clone; check by content)
- scope: SQLite 3.54.1
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-config-16
- claim: In SQLite 3.54.1's Unix VFS, on a system that defines F_FULLFSYNC (macOS, per the code's comment), each sync calls fcntl(F_FULLFSYNC) only when a full sync is requested and otherwise calls plain fsync(); it also falls back to fsync() if F_FULLFSYNC fails. On other Unix systems, such as Linux, it calls fdatasync().
- kind: behaviour
- questions: Q40 · load-bearing: yes (what "a sync" is on macOS vs Linux)
- support: S-r2-practice-config-08/P2 · src/os_unix.c:L3815-L3829@5752022 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-08/P1 · src/os_unix.c:L3743-L3745@5752022 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-08/P3 · src/os_unix.c:L3821-L3825@5752022 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-08/P4 · src/os_unix.c:L3836-L3837@5752022 · rung 1 · fit direct · upstream self
  excerpt-sha256: not computed (no local clone; check by content)
- scope: SQLite 3.54.1 os_unix.c, builds without SQLITE_NO_SYNC. An "#elif defined(__APPLE__)" branch (L3831-L3835, not quoted) uses fsync() for Apple builds without F_FULLFSYNC. A grep of this file found no use of F_BARRIERFSYNC.
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-config-17
- claim: Apple's fsync(2) manual page (xnu-11417.101.15) states that fsync() moves data from the host to the drive, but the drive may not write it to permanent storage for some time and may write it out of order, so after a drive power loss or OS crash only some or none of the data may be present, with later writes present and earlier ones missing. The page says this is "not a theoretical edge case" and that databases needing strict write ordering should use F_FULLFSYNC.
- kind: behaviour
- questions: Q40 · load-bearing: yes (what plain fsync() guarantees on macOS)
- support: S-r2-practice-config-12/P1 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-12/P2 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-12/P3 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-12/P4 · rung 1 · fit direct · upstream self
- scope: macOS (Apple's xnu man page source at commit e3723e1, 2025-05-01). The wording speaks of "platters" and dates from the HFS era; it still ships unchanged.
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-config-18
- claim: Apple's fcntl(2) manual page (xnu-11417.101.15) says F_FULLFSYNC does what fsync() does and then asks the drive to flush all buffered data to permanent storage. Because it drains the device's queue and acts as a barrier, data fsync'd earlier on the same device is guaranteed to be persisted when the call returns. It is implemented on HFS, FAT, UDF and APFS, may take a long time, and some FireWire drives are known to ignore the flush request.
- kind: behaviour
- questions: Q40 · load-bearing: yes
- support: S-r2-practice-config-11/P1 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-11/P2 · rung 1 · fit direct · upstream self
- scope: macOS, xnu man page at commit e3723e1 (2025-05-01)
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-config-19
- claim: Apple's fcntl(2) manual page (xnu-11417.101.15) describes F_BARRIERFSYNC as fsync() followed by a barrier command to the drive, guaranteeing ordering but with "no assumption" about what has been persisted when the call returns. It calls this useful when ordering matters but durability does not, and says it is implemented on HFS and APFS and requires hardware support that Apple SSDs provide.
- kind: behaviour
- questions: Q40 · load-bearing: no (an ordering-only option; SQLite 3.54.1's os_unix.c does not use it)
- support: S-r2-practice-config-11/P3 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-11/P4 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-11/P5 · rung 1 · fit direct · upstream self
- support: S-r2-practice-config-11/P6 · rung 1 · fit direct · upstream self
- scope: macOS, xnu man page at commit e3723e1. "Apple SSDs are guaranteed to provide" is Apple about its own hardware.
- confidence: high · flags: vendor-about-itself (Apple on Apple SSDs)
- conflicts: none

### C-r2-practice-config-20
- claim: SQLite's atomic-commit article says that setting PRAGMA fullfsync on a Mac guarantees that data really reaches the disk on a flush, but that fullfsync is profoundly slow, slows unrelated disk I/O, and "its use is not recommended". It also says disk controllers often claim data has reached the media while it is still in a volatile cache.
- kind: evaluation
- questions: Q40 · load-bearing: yes (the docs' own advice on fullfsync) — attributed form only
- support: S-r2-practice-config-05/P5 · rung 1 (attributed) · fit direct · upstream self
- support: S-r2-practice-config-05/P4 · rung 1 (attributed) · fit direct · upstream self
- scope: an old article scoped to rollback mode (S-r2-practice-config-05/P1). Its explanation ("resetting the disk controller", "disk platter") is dated, and no measurement is given.
- confidence: medium (current relevance) · flags: vendor-about-itself; possibly outdated
- conflicts: S-r2-practice-config-12/P4 "Applications, such as databases, that require a strict ordering of writes should use F_FULLFSYNC" (Apple recommends it for databases; SQLite's article advises against it)

### C-r2-practice-config-21
- claim: SQLite's how-to-corrupt page says that for maximum reliability and robustness against corruption, SQLite should always run with its default synchronous setting of FULL.
- kind: evaluation
- questions: Q40 · load-bearing: no — attributed form only
- support: S-r2-practice-config-04/P8 · rung 1 (attributed) · fit direct · upstream self
- scope: current docs, § 3.2. No journal mode is named.
- confidence: high (that the page says it) · flags: vendor-about-itself
- conflicts: S-r1-practice-config-02/P7 (pragma.html: "The synchronous=NORMAL setting provides the best balance between performance and safety for most applications running in WAL mode") and S-r1-practice-config-05/P1 (compile.html recommends changing FULL to NORMAL when switching to WAL)

## Conflicts
- C-r2-practice-config-20: S-r2-practice-config-05/P5 (SQLite atomiccommit.html) says of fullfsync "So its use is not recommended"; S-r2-practice-config-12/P4 (Apple fsync(2)) says "Applications, such as databases, that require a strict ordering of writes should use F_FULLFSYNC". Both quoted above; not settled. Note the SQLite page is an old, rollback-mode article.
- C-r2-practice-config-21: S-r2-practice-config-04/P8 (howtocorrupt.html) "SQLite should always be run with its default synchronous setting of FULL"; S-r1-practice-config-02/P7 (pragma.html) calls NORMAL "the best balance … for most applications running in WAL mode". Both within the SQLite docs; scope differs (reliability against corruption vs balance); not settled. The NORMAL debate belongs to the criticism angle.

## Speculation and flags
- C-r2-practice-config-10: superlative and third-party claim ("most consumer-grade mass storage devices lie about syncing"); attributed use only.
- C-r2-practice-config-20: dated explanation ("resetting the disk controller", "disk platter"); attributed use only.
- Synthesis for the writer (no single source states it): on macOS with fullfsync off (the default), synchronous=FULL's per-commit WAL sync is a plain fsync() (C-14, C-15, C-16), which Apple says may not reach permanent storage before a drive power loss (C-17). Durability across power loss on macOS therefore relies on PRAGMA fullfsync=ON (C-18). checkpoint_fullfsync alone covers only checkpoint syncs (C-14). This must be presented as a chain over these claims, not as a quoted SQLite statement.
- pager.c bit-layout observation (unclaimed, unverified): the comment at src/pager.c L607-L617 says checkpoint sync flags sit in the low two bits of walSyncFlags and commit flags in bits 0x04/0x08. sqlite3PagerSetFlags (L3700-L3705) puts syncFlags<<2 there always and adds the low bits only for synchronous=FULL, which reads the other way round. The WAL_SYNC_FLAGS/CKPT_SYNC_FLAGS macros (wal.h) were not read, so it is open which reading is right; C-14 rests on the docs for checkpoint-only scope.
- C-r2-practice-config-05: the "retry does not help" conclusion is a step from the code condition, not a quoted rule.

## Unused leads
- https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/fsync.2.html — rendered archive copy of the same fsync(2) text (fetched as pages/S-r2-practice-config-09.*; not cited, xnu source used instead).
- https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/fcntl.2.html — older fcntl(2) copy listing F_FULLFSYNC on HFS, FAT, UDF only (no APFS, no F_BARRIERFSYNC); superseded (pages/S-r2-practice-config-10.*).
- https://raw.githubusercontent.com/sqlite/sqlite/57520227c95396ce39ba6ecaac8d475b78dd3964/src/wal.h — WAL_SYNC_FLAGS / CKPT_SYNC_FLAGS macros; would settle the pager.c bit-layout question.
- https://sqlite.org/changes.html — not searched for fullfsync or F_BARRIERFSYNC entries (budget).
- https://www.postgresql.org/message-id/a06010200be3da9564694%40%5B17.202.21.231%5D — 2005 pgsql-hackers thread with an Apple engineer on fsync vs F_FULLFSYNC (cases or criticism angle).

## Queries
- "Apple fsync man page F_FULLFSYNC drive cache" → useful (led to Apple's man pages; xnu source used)
- "fcntl F_BARRIERFSYNC F_FULLFSYNC APFS man page" → useful (confirmed current text includes APFS and F_BARRIERFSYNC; led to xnu source)
- GitHub API: commits of apple-oss-distributions/xnu touching bsd/man/man2/fcntl.2 → useful (e3723e1, xnu-11417.101.15)
- GitHub API: commit 57520227c953 of sqlite/sqlite → useful (Version 3.54.1, 2026-10-16)
- (direct fetches, no search: sqlite.org pragma, howtocorrupt, atomiccommit, c3ref/busy_timeout; btree.c, wal.c, pager.c, os_unix.c at tag version-3.54.1)

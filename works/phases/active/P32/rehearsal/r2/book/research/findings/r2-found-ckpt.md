# Findings: 20261023-1245-sqlite-wal · round 2 · angle found-ckpt
- researcher: claude-opus-5-5 · status: complete · tool calls: 44 (over the hard cap of 40; 6 of them went to reading the known-already entries and one to an oversized forum page)

## Questions
- Q38: answered (from code; the docs conflict D-01 is recorded, not settled) — claims: C-r2-found-ckpt-01, C-r2-found-ckpt-02, C-r2-found-ckpt-03, C-r2-found-ckpt-04, C-r2-found-ckpt-05, C-r2-found-ckpt-06, C-r2-found-ckpt-07, C-r2-found-ckpt-08, C-r2-found-ckpt-09, C-r2-found-ckpt-10, C-r2-found-ckpt-11, C-r2-found-ckpt-12 — note: in wal.c at version-3.54.1 a new reader never waits on a RESTART/TRUNCATE checkpoint beyond brief internal retries: while the checkpoint waits for old readers the WAL is fully backfilled, so a new reader takes WAL_READ_LOCK(0) and reads the database file; during the copy phase a new reader uses a read mark and reads the WAL. This matches the c3ref and pragma wording, not wal.html §6. C-r2-found-ckpt-03 and -12 are the researcher's reading of several code ranges; no test exercises a new reader during the wait. Excerpt hashes not computed (the sqlite repository is not cloned locally, so `git show` cannot run); every range is checked by content against the saved file.

## Sources

### S-r2-found-ckpt-01
- url: https://raw.githubusercontent.com/sqlite/sqlite/57520227c95396ce39ba6ecaac8d475b78dd3964/src/wal.c · canonical: github.com/sqlite/sqlite/blob/57520227c95396ce39ba6ecaac8d475b78dd3964/src/wal.c
- repo: github.com/sqlite/sqlite (the project's GitHub mirror of its Fossil tree) · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1, per the GitHub tags API, saved as pages/r2-found-ckpt-tags.json)
- title: src/wal.c · authors: SQLite developers · publisher: SQLite project
- date: release 3.54.1 (changelog entry 2026-10-16, S-r1-found-ckpt-07) · version: 3.54.1
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the GitHub repo sqlite/sqlite is the SQLite project's own mirror of its Fossil repository (as recorded for S-r1-found-shm-11); version-3.54.1 is the newest release tag listed.
- excerpt-sha256: not computed (no local clone of sqlite/sqlite; `git show 57520227:src/wal.c` cannot run in this session); checked by content against pages/S-r2-found-ckpt-01.txt, which is the raw file at the commit, so text-file line numbers equal source line numbers.
- passages:
  - P1 · src/wal.c:L2435-L2449@5752022 (walCheckpoint, RESTART/TRUNCATE branch): "If this is an SQLITE_CHECKPOINT_RESTART or TRUNCATE operation, and the ** entire wal file has been copied into the database file, then block ** until all readers have finished using the wal file. This ensures that ** the next process to write to the database restarts the wal file. … rc = walBusyLock(pWal, xBusy, pBusyArg, WAL_READ_LOCK(1), WAL_NREADER-1);"
  - P2 · src/wal.c:L2184-L2199@5752022 (walBusyLock): "Attempt to obtain the exclusive WAL lock defined by parameters lockIdx and ** n. If the attempt fails and parameter xBusy is not NULL, then it is a ** busy-handler function. Invoke it and retry the lock until either the ** lock is successfully obtained or the busy-handler returns 0. … }while( xBusy && rc==SQLITE_BUSY && xBusy(pBusyArg) );"
  - P3 · src/wal.c:L2440-L2448@5752022 (walCheckpoint): "if( rc==SQLITE_OK && eMode!=SQLITE_CHECKPOINT_PASSIVE ){ assert( pWal->writeLock ); … assert( pInfo->nBackfill==pWal->hdr.mxFrame );"
  - P4 · src/wal.c:L2451-L2468@5752022 (walCheckpoint, TRUNCATE): "if( eMode==SQLITE_CHECKPOINT_TRUNCATE ){ … walRestartHdr(pWal, salt1); rc = sqlite3OsTruncate(pWal->pWalFd, 0); } walUnlockExclusive(pWal, WAL_READ_LOCK(1), WAL_NREADER-1);"
  - P5 · src/wal.c:L363-L382@5752022 (comment on struct WalCkptInfo): "Readers holding ** WAL_READ_LOCK(0) always ignore the entire WAL and read all content ** directly from the database. … The exception to the ** previous sentence is when nBackfill equals mxFrame (meaning that everything ** in the WAL has been backfilled into the database) then new readers ** will choose aReadMark[0] which has value 0 and hence such reader will ** get all their all content directly from the database file and ignore ** the WAL."
  - P6 · src/wal.c:L3216-L3245@5752022 (walTryBeginRead): "if( !useWal && AtomicLoad(&pInfo->nBackfill)==pWal->hdr.mxFrame … /* The WAL has been completely backfilled (or it is empty). ** and can be safely ignored. */ rc = walLockShared(pWal, WAL_READ_LOCK(0)); … pWal->readLock = 0; return SQLITE_OK;"
  - P7 · src/wal.c:L4434-L4446@5752022 (sqlite3WalCheckpoint): "The SQLITE_CHECKPOINT_FULL, RESTART ** and TRUNCATE modes also obtain the exclusive "writer" lock on the ** database file. … rc = walBusyLock(pWal, xBusy2, pBusyArg, WAL_WRITE_LOCK, 1); if( rc==SQLITE_OK ){ pWal->writeLock = 1;"
  - P8 · src/wal.c:L2341-L2425@5752022 (walCheckpoint, copy phase): "&& (rc = walBusyLock(pWal,xBusy,pBusyArg,WAL_READ_LOCK(0),1))==SQLITE_OK … /* Release the reader lock held while backfilling */ walUnlockExclusive(pWal, WAL_READ_LOCK(0), 1);"
  - P9 · src/wal.c:L3246-L3252@5752022 (walTryBeginRead): "}else if( rc!=SQLITE_BUSY ){ return rc; } } … /* If we get this far, it means that the reader will want to use ** the WAL to get at content from recent commits."
  - P10 · src/wal.c:L3275-L3291@5752022 (walTryBeginRead, read-mark choice): "for(i=1; i<WAL_NREADER; i++){ rc = walLockExclusive(pWal, WAL_READ_LOCK(i), 1); … if( mxI==0 ){ assert( rc==SQLITE_BUSY || (pWal->readOnly & WAL_SHM_RDONLY)!=0 ); return rc==SQLITE_BUSY ? WAL_RETRY : SQLITE_READONLY_CANTINIT;"
  - P11 · src/wal.c:L3116-L3129@5752022 (walTryBeginRead, retry policy): "Circumstances that cause a RETRY should only last for the briefest ** instances of time. No I/O or other system calls are done while the ** locks are held, so the locks should not be held for very long. … After 5 RETRYs, we begin calling sqlite3OsSleep(). … The total delay time before giving up is less than 10 seconds."
  - P12 · src/wal.c:L2317-L2328@5752022 (walCheckpoint, waits before copying): "for(i=1; i<WAL_NREADER; i++){ u32 y = AtomicLoad(pInfo->aReadMark+i); SEH_INJECT_FAULT; if( mxSafeFrame>y ){ assert( y<=pWal->hdr.mxFrame ); rc = walBusyLock(pWal, xBusy, pBusyArg, WAL_READ_LOCK(i), 1); … }else if( rc==SQLITE_BUSY ){ mxSafeFrame = y; xBusy = 0;"
  - P13 · src/wal.c:L4415-L4417@5752022 (sqlite3WalCheckpoint): "/* Enable blocking locks, if possible. */ sqlite3WalDb(pWal, db); if( xBusy2 ) (void)walEnableBlocking(pWal);"
  - P14 · src/wal.c:L3052-L3055@5752022 (comment before walTryBeginRead): "Attempt to start a read transaction. This might fail due to a race or ** other transient condition. When that happens, it returns WAL_RETRY to ** indicate to the caller that it is safe to retry immediately."
  - P15 · src/wal.c:L2217-L2224@5752022 (comment before walRestartHdr): "c) any existing readers are reading exclusively from the database ** file - there are no readers that may attempt to read a frame from ** the log file."

### S-r2-found-ckpt-03
- url: https://raw.githubusercontent.com/sqlite/sqlite/57520227c95396ce39ba6ecaac8d475b78dd3964/test/wal5.test · canonical: github.com/sqlite/sqlite/blob/57520227c95396ce39ba6ecaac8d475b78dd3964/test/wal5.test
- repo: github.com/sqlite/sqlite · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1)
- title: test/wal5.test · authors: SQLite developers · publisher: SQLite project
- date: release 3.54.1 · version: 3.54.1
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: SQLite's own Tcl test suite; the file header says it tests "blocking-checkpoint" operation.
- excerpt-sha256: not computed (no local clone); checked by content against pages/S-r2-found-ckpt-03.txt
- passages:
  - P1 · test/wal5.test:L252-L264@5752022: "Check that checkpoints block on the correct locks. And respond correctly # if they cannot obtain those locks. There are three locks that a checkpoint # may block on (in the following order):"
  - P2 · test/wal5.test:L256-L264@5752022: "1. The writer lock: FULL and RESTART checkpoints block until any writer # process releases its lock. # # 2. Readers using part of the log file. FULL and RESTART checkpoints block # until readers using part (but not all) of the log file have finished. # # 3. Readers using any of the log file. After copying data into the # database file, RESTART checkpoints block until readers using any part # of the log file have finished."

### S-r2-found-ckpt-04
- url: https://web.archive.org/web/20150103035306id_/http://www.sqlite.org/wal.html · canonical: sqlite.org/wal.html
- title: Write-Ahead Logging · authors: n/a · publisher: SQLite (sqlite.org)
- date: snapshot 2015-01-03 · version: docs as of early 2015
- accessed: 2026-10-23 · read-via: wayback http://web.archive.org/web/20150103035306/http://www.sqlite.org/wal.html · quote-match: exact · archive: http://web.archive.org/web/20150103035306/http://www.sqlite.org/wal.html
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: an Internet Archive capture of the SQLite developers' own page; used only to date the §6 wording.
- passages:
  - P1 · § "Application-Initiated Checkpoints": "FULL and RESTART checkpoints try harder to run the checkpoint to completion and can only be initiated by a call to sqlite3_wal_checkpoint_v2()."

### S-r2-found-ckpt-05
- url: https://web.archive.org/web/20161009044054id_/http://www.sqlite.org:80/wal.html · canonical: sqlite.org/wal.html
- title: Write-Ahead Logging · authors: n/a · publisher: SQLite (sqlite.org)
- date: snapshot 2016-10-09 · version: docs as of late 2016
- accessed: 2026-10-23 · read-via: wayback http://web.archive.org/web/20161009044054/http://www.sqlite.org:80/wal.html · quote-match: exact · archive: http://web.archive.org/web/20161009044054/http://www.sqlite.org:80/wal.html
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: an Internet Archive capture of the SQLite developers' own page.
- passages:
  - P1 · § "5. Avoiding Excessively Large WAL Files": "The disadvantage of using SQLITE_CHECKPOINT_RESTART and SQLITE_CHECKPOINT_TRUNCATE is that readers might block while the checkpoint is running."

### S-r2-found-ckpt-06
- url: https://raw.githubusercontent.com/sqlite/sqlite/57520227c95396ce39ba6ecaac8d475b78dd3964/src/sqlite.h.in · canonical: github.com/sqlite/sqlite/blob/57520227c95396ce39ba6ecaac8d475b78dd3964/src/sqlite.h.in
- repo: github.com/sqlite/sqlite · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1)
- title: src/sqlite.h.in · authors: SQLite developers · publisher: SQLite project
- date: release 3.54.1 · version: 3.54.1
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the public header template; its comments carry the C API reference text (S-r1-found-ckpt-02 records the c3ref pages as generated from the header's comments).
- excerpt-sha256: not computed (no local clone); checked by content against pages/S-r2-found-ckpt-06.txt
- passages:
  - P1 · src/sqlite.h.in:L10178-L10184@5752022: "This mode works the same way as SQLITE_CHECKPOINT_FULL with the addition ** that after checkpointing the log file it blocks (calls the ** [busy-handler callback]) ** until all readers are reading from the database file only. ^This ensures ** that the next writer will restart the log file from the beginning. ** ^Like SQLITE_CHECKPOINT_FULL, this mode blocks new ** database writer attempts while it is pending, but does not impede readers."
  - P2 · src/sqlite.h.in:L10174-L10175@5752022: "This mode blocks new database writers while it is pending, ** but new database readers are allowed to continue unimpeded."

## Claims

### C-r2-found-ckpt-01
- claim: In SQLite 3.54.1 (src/wal.c), once a RESTART or TRUNCATE checkpoint has copied the entire WAL into the database file, it waits for readers by repeatedly trying to take one exclusive lock covering read-mark slots 1 to 4 (WAL_READ_LOCK(1) through WAL_READ_LOCK(4)), calling the busy handler after each failed attempt, and it holds the WAL writer lock the whole time.
- kind: behaviour
- questions: Q38 · load-bearing: yes (what the checkpoint holds while it waits)
- support: S-r2-found-ckpt-01 · src/wal.c:L2435-L2449@5752022 (P1) · rung 1 · fit direct · upstream self
- support: S-r2-found-ckpt-01 · src/wal.c:L2184-L2199@5752022 (P2) · rung 1 · fit direct · upstream self
- support: S-r2-found-ckpt-01 · src/wal.c:L2440-L2448@5752022 (P3) · rung 1 · fit direct · upstream self
- support: S-r2-found-ckpt-01 · src/wal.c:L4434-L4446@5752022 (P7) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1 source; default build (blocking-lock builds: see C-r2-found-ckpt-08)
- confidence: high · flags: none
- conflicts: none

### C-r2-found-ckpt-02
- claim: In SQLite 3.54.1 (src/wal.c), when the WAL has been completely copied into the database (nBackfill equals mxFrame), a new read transaction takes a shared lock on WAL_READ_LOCK(0) and reads every page from the database file, ignoring the WAL, so it needs none of read-mark locks 1 to 4.
- kind: behaviour
- questions: Q38 · load-bearing: yes (the path a new reader takes during the wait)
- support: S-r2-found-ckpt-01 · src/wal.c:L363-L382@5752022 (P5) · rung 1 · fit direct · upstream self
- support: S-r2-found-ckpt-01 · src/wal.c:L3216-L3245@5752022 (P6) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; ordinary read transactions (not the snapshot API, which the #ifdef at L3217 excludes)
- confidence: high · flags: none
- conflicts: none

### C-r2-found-ckpt-03
- claim: Read together, the ranges cited here show that in SQLite 3.54.1 a new read transaction that starts while a RESTART or TRUNCATE checkpoint is waiting for older readers does not wait for the checkpoint. The checkpoint reaches that wait only when nBackfill equals mxFrame, and it holds the writer lock, so no frames can be appended. A new reader therefore takes WAL_READ_LOCK(0) and reads the database file, while between attempts the checkpointer holds no read-mark lock.
- kind: behaviour
- questions: Q38 · load-bearing: yes (the direct answer)
- support: S-r2-found-ckpt-01 · src/wal.c:L2440-L2448@5752022 (P3: writer lock held; nBackfill==mxFrame asserted) · rung 1 · fit direct · upstream self
- support: S-r2-found-ckpt-01 · src/wal.c:L2184-L2199@5752022 (P2: try, busy handler, retry; no lock kept between tries) · rung 1 · fit direct · upstream self
- support: S-r2-found-ckpt-01 · src/wal.c:L3216-L3245@5752022 (P6: reader path on READ_LOCK(0)) · rung 1 · fit direct · upstream self
- support: S-r2-found-ckpt-01 · src/wal.c:L2217-L2224@5752022 (P15: a reset requires only that existing readers read from the database file) · rung 1 · fit partial · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1, default build. In order: the wait at L2449 is reached after L2440-L2448. A brief WAL_RETRY loop (C-r2-found-ckpt-07) is still possible if the reader races with a header change. Researcher's trace of several ranges; no SQLite test exercises a new reader during this wait (wal5.test covers only what the checkpointer waits on).
- confidence: medium · flags: none (a derived reading of code, worth a second reading by the verifier)
- conflicts: S-r1-found-ckpt-01/P16 "The disadvantage of using SQLITE_CHECKPOINT_RESTART and SQLITE_CHECKPOINT_TRUNCATE is that readers might block while the checkpoint is running."

### C-r2-found-ckpt-04
- claim: In SQLite 3.54.1, any checkpoint holds WAL_READ_LOCK(0) exclusively while it copies frames into the database file. A new read transaction that cannot then get WAL_READ_LOCK(0) does not wait: it goes on to take a read mark (slot 1 to 4) and reads recent pages from the WAL. It gets WAL_RETRY only if every read-mark slot is busy.
- kind: behaviour
- questions: Q38 · load-bearing: yes (the "while it runs" half of the question)
- support: S-r2-found-ckpt-01 · src/wal.c:L2341-L2425@5752022 (P8) · rung 1 · fit direct · upstream self
- support: S-r2-found-ckpt-01 · src/wal.c:L3246-L3252@5752022 (P9) · rung 1 · fit direct · upstream self
- support: S-r2-found-ckpt-01 · src/wal.c:L3275-L3291@5752022 (P10) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; the copy phase of PASSIVE, FULL, RESTART and TRUNCATE alike
- confidence: high · flags: none
- conflicts: S-r1-found-ckpt-01/P16 (as for C-r2-found-ckpt-03)

### C-r2-found-ckpt-05
- claim: In SQLite 3.54.1, before copying, a FULL, RESTART or TRUNCATE checkpoint waits through the busy handler for the exclusive lock on each read-mark slot whose mark lies below the end of the WAL. If that wait fails, the checkpoint copies only up to that reader's mark and stops calling the busy handler.
- kind: behaviour
- questions: Q38 · load-bearing: no (the checkpointer's own wait; extends C-r1-found-ckpt-29)
- support: S-r2-found-ckpt-01 · src/wal.c:L2317-L2328@5752022 (P12) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; PASSIVE passes no busy handler (L2308)
- confidence: high · flags: none
- conflicts: none

### C-r2-found-ckpt-06
- claim: In SQLite 3.54.1, a TRUNCATE checkpoint holds the exclusive lock on read-mark slots 1 to 4 while it rewrites the wal-index header for an empty WAL and truncates the -wal file to zero bytes, then releases that lock. A RESTART checkpoint takes and releases the same lock without changing anything.
- kind: behaviour
- questions: Q38 · load-bearing: yes (the short window TRUNCATE adds)
- support: S-r2-found-ckpt-01 · src/wal.c:L2451-L2468@5752022 (P4) · rung 1 · fit direct · upstream self
- support: S-r2-found-ckpt-01 · src/wal.c:L2435-L2449@5752022 (P1) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; the RESTART reset itself is done later by the next writer (walRestartLog, L3961-L3983)
- confidence: high · flags: none
- conflicts: none

### C-r2-found-ckpt-07
- claim: In SQLite 3.54.1, starting a read transaction can fail on a transient race and return WAL_RETRY, after which it is retried at once. After 5 retries the reader starts sleeping between attempts, and wal.c says the total delay before it gives up (with SQLITE_PROTOCOL) is less than 10 seconds.
- kind: behaviour
- questions: Q38 · load-bearing: no (bounds the only kind of reader wait the code shows)
- support: S-r2-found-ckpt-01 · src/wal.c:L3052-L3055@5752022 (P14) · rung 1 · fit direct · upstream self
- support: S-r2-found-ckpt-01 · src/wal.c:L3116-L3129@5752022 (P11) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; the "less than 10 seconds" figure is the code comment's own
- confidence: high · flags: none
- conflicts: none

### C-r2-found-ckpt-08
- claim: In SQLite 3.54.1, sqlite3WalCheckpoint enables blocking locks "if possible" when it is given a busy handler; blocking locks exist only in builds compiled with SQLITE_ENABLE_SETLK_TIMEOUT.
- kind: behaviour
- questions: Q38 · load-bearing: no (a build-option caveat; its effect on new readers was not traced)
- support: S-r2-found-ckpt-01 · src/wal.c:L4415-L4417@5752022 (P13) · rung 1 · fit partial (the SETLK_TIMEOUT dependence is from the #ifdef blocks around walEnableBlocking, L2101-L2180, not quoted) · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1 builds with SQLITE_ENABLE_SETLK_TIMEOUT
- confidence: medium · flags: none
- conflicts: none

### C-r2-found-ckpt-09
- claim: The SQLite 3.54.1 header source (src/sqlite.h.in) says that a RESTART checkpoint, after checkpointing, blocks until all readers read from the database file only, and that it "blocks new database writer attempts while it is pending, but does not impede readers". The header says FULL lets "new database readers ... continue unimpeded".
- kind: fact
- questions: Q38 · load-bearing: yes (pins the c3ref wording to the release source)
- support: S-r2-found-ckpt-06 · src/sqlite.h.in:L10178-L10184@5752022 (P1) · rung 1 · fit direct · upstream self
- support: S-r2-found-ckpt-06 · src/sqlite.h.in:L10174-L10175@5752022 (P2) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1 source
- confidence: high · flags: none
- conflicts: S-r1-found-ckpt-01/P16 "readers might block while the checkpoint is running"

### C-r2-found-ckpt-10
- claim: SQLite's test file wal5.test (at 3.54.1) says a checkpoint may block on three locks, in order: the writer lock (FULL and RESTART), readers using part of the log (FULL and RESTART), and, after the data are copied, readers using any part of the log (RESTART).
- kind: behaviour
- questions: Q38 · load-bearing: no (what the checkpointer waits on, not what new readers do)
- support: S-r2-found-ckpt-03 · test/wal5.test:L252-L264@5752022 (P1, P2) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1 test suite; TRUNCATE is tested alongside RESTART in the same table (L283-L286)
- confidence: high · flags: none
- conflicts: none

### C-r2-found-ckpt-11
- claim: The wal.html sentence saying that readers might block while a RESTART or TRUNCATE checkpoint runs was already on the page in the Internet Archive's 2016-10-09 capture (then in §5, "Avoiding Excessively Large WAL Files"). The page's 2015-01-03 capture lists only PASSIVE, FULL and RESTART and has no such section.
- kind: date
- questions: Q38 · load-bearing: no (the age of the wording)
- support: S-r2-found-ckpt-05/P1 · rung 1 · fit direct · upstream self
- support: S-r2-found-ckpt-04/P1 · rung 1 · fit partial (shows the 2015 checkpoint text; the absence of the section is checkable by searching pages/S-r2-found-ckpt-04.txt, which has no "readers might block" or "starvation") · upstream self
- scope: Wayback captures only; the exact check-in that added the sentence was not found (the docsrc blame page returned a robot check)
- confidence: high · flags: none
- conflicts: none

### C-r2-found-ckpt-12
- claim: The 3.54.1 wal.c behaviour in C-r2-found-ckpt-03 and C-r2-found-ckpt-04, where new readers go ahead during a RESTART or TRUNCATE checkpoint apart from brief internal retries, agrees with the c3ref/wal_checkpoint_v2 wording ("does not impede readers") and the pragma.html wording ("allows readers to proceed"). The code shows no path by which new readers block, as wal.html §6 says they might.
- kind: interpretation
- questions: Q38 · load-bearing: yes (which page's wording matches the code)
- support: S-r2-found-ckpt-01 · src/wal.c:L2440-L2448, L3216-L3245, L2341-L2425, L3246-L3291@5752022 (P3, P6, P8, P9, P10) · rung 1 · fit partial (the code supports the behaviour; matching it to the pages is the researcher's reading) · upstream self
- support: S-r2-found-ckpt-06 · src/sqlite.h.in:L10178-L10184@5752022 (P1) · rung 1 · fit direct (the wording compared) · upstream self
- scope: default builds of SQLite 3.54.1; blocking-lock builds (C-r2-found-ckpt-08) not traced; "readers" here means new read transactions, since existing readers are never blocked, the checkpoint waits for them
- confidence: medium · flags: none (an interpretation; the attributed form, "the code at 3.54.1 shows …", is the safe one for the chapter)
- conflicts: S-r1-found-ckpt-01/P16 "The disadvantage of using SQLITE_CHECKPOINT_RESTART and SQLITE_CHECKPOINT_TRUNCATE is that readers might block while the checkpoint is running."

## Conflicts
- C-r2-found-ckpt-03, C-r2-found-ckpt-04, C-r2-found-ckpt-12 (ledger D-01): S-r1-found-ckpt-01/P16 (wal.html §6, unchanged since at least 2016-10-09 per S-r2-found-ckpt-05/P1) says "readers might block while the checkpoint is running"; S-r2-found-ckpt-06/P1 (sqlite.h.in at 3.54.1, the c3ref text) says RESTART "does not impede readers", and S-r1-found-ckpt-03/P9 says RESTART "allows readers to proceed"; the wal.c ranges in C-r2-found-ckpt-03/-04 show new readers taking READ_LOCK(0) or a read mark without waiting. Not settled. What would settle it: a statement from the SQLite developers on the §6 sentence, or a test or experiment that starts a new reader while a RESTART/TRUNCATE checkpoint is in its busy-handler wait.

## Speculation and flags
- C-r2-found-ckpt-03, C-r2-found-ckpt-12: derived by the researcher from several code ranges, not stated in one place by SQLite; confidence medium.
- C-r2-found-ckpt-08: blocking-lock builds (SQLITE_ENABLE_SETLK_TIMEOUT) were not traced for their effect on new readers; this is the one open path.
- No excerpt hashes: the sqlite repository is not available locally for `git show`; all ranges are cited at the full commit sha and checked by content.

## Unused leads
- https://sqlite.org/forum/forumpost/32bac245c03f999c — Dan Kennedy: RESTART returns SQLITE_BUSY at once when another checkpointer runs (already covered by C-r1-found-ckpt-25).
- https://sqlite.org/docsrc/blame?filename=pages/wal.in&checkin=trunk — would date the §6 sentence's check-in; returned a robot-check page to curl.
- https://sqlite.org/forum/forumpost/1bee6a8e8da775c9 — forum thread on an un-reset statement holding back checkpoints (practice-ops).

## Queries
- "sqlite forum RESTART checkpoint readers block" → nothing new for new readers (only checkpoint-lock BUSY and test comments)

# Findings: 20261023-1245-sqlite-wal · round 1 (chapter 1's top-up) · angle found-ckpt
- researcher: claude-opus-5-5 · status: complete · tool calls: 33

## Questions
- Q-ch1-03: answered — claims: C-ch1-r1-found-ckpt-01, -02, -03, -04, -05, -06, -07, -08, -09, -10, -11, -12, -13, -14, -15, -16, -17 — note: step order from the code at version-3.54.1. Automatic trigger: sqlite3_step → doWalCallbacks → sqlite3WalDefaultHook → sqlite3_wal_checkpoint (PASSIVE) → sqlite3Checkpoint → (btree, not fetched) → sqlite3PagerCheckpoint (no busy handler) → sqlite3WalCheckpoint (checkpoint lock only; header read) → walCheckpoint: (a) mxSafeFrame from the read marks → iterator (ascending page order) → READ_LOCK(0) + salt check → (b) WAL sync → (c) copy loop → (f) db truncate then (d) db sync, both only when mxSafeFrame equals the live mxFrame → (e) nBackfill stored → READ_LOCK(0) released; the RESTART/TRUNCATE block is skipped. (g) The reset happens in the next writer's walFrames → walRestartLog, before its frames are written. Extends C-r1-found-ckpt-02/-04/-05/-12/-13/-14 and C-r1-found-rw-24; no conflict with them. The link sqlite3BtreeCheckpoint → sqlite3PagerCheckpoint (src/btree.c) was not fetched. Excerpt hashes were not computed: there is no local clone of sqlite/sqlite, so `git show` cannot run. Every range is checked by content against the raw file saved in pages/, where the text file's line numbers equal the source line numbers.

## Sources

### S-ch1-r1-found-ckpt-01
- url: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/wal.c · canonical: github.com/sqlite/sqlite/blob/version-3.54.1/src/wal.c
- repo: github.com/sqlite/sqlite (the project's GitHub mirror of its Fossil tree) · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1, per the tags-API result recorded for S-r2-found-ckpt-01; fetched here by tag name)
- title: src/wal.c · authors: SQLite developers · publisher: SQLite project
- date: release 3.54.1 · version: 3.54.1
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: same file as S-r2-found-ckpt-01 (refetched into its own page file, as instructed); sqlite/sqlite is the project's own mirror (recorded for S-r1-found-shm-11).
- excerpt-sha256: not computed (no local clone); checked by content against pages/S-ch1-r1-found-ckpt-01.txt (raw file, so line numbers equal source line numbers)
- passages:
  - P1 · src/wal.c:L2263-L2270@5752022 (comment before walCheckpoint): "Fsync is called on the WAL before writing content out of the WAL and ** into the database. This ensures that if the new content is persistent ** in the WAL and can be recovered following a power-loss or hard reset. … Fsync is also called on the database file if (and only if) the entire ** WAL content is copied into the database file."
  - P2 · src/wal.c:L2272-L2273@5752022 (comment before walCheckpoint): "This routine uses and updates the nBackfill field of the wal-index header. ** This is the only routine that will increase the value of nBackfill."
  - P3 · src/wal.c:L2304-L2328@5752022 (walCheckpoint, mxSafeFrame): "if( pInfo->nBackfill<pWal->hdr.mxFrame ){ … mxSafeFrame = pWal->hdr.mxFrame; mxPage = pWal->hdr.nPage; for(i=1; i<WAL_NREADER; i++){ u32 y = AtomicLoad(pInfo->aReadMark+i); SEH_INJECT_FAULT; if( mxSafeFrame>y ){ … rc = walBusyLock(pWal, xBusy, pBusyArg, WAL_READ_LOCK(i), 1); if( rc==SQLITE_OK ){ u32 iMark = (i==1 ? mxSafeFrame : READMARK_NOT_USED); … }else if( rc==SQLITE_BUSY ){ mxSafeFrame = y; xBusy = 0;"
  - P4 · src/wal.c:L2310-L2313@5752022 (walCheckpoint): "Compute in mxSafeFrame the index of the last frame of the WAL that is ** safe to write into the database. Frames beyond mxSafeFrame might ** overwrite database pages that are in use by active readers and thus ** cannot be backfilled from the WAL."
  - P5 · src/wal.c:L2335-L2337@5752022 (walCheckpoint): "/* Allocate the iterator */ if( pInfo->nBackfill<mxSafeFrame ){ rc = walIteratorInit(pWal, pInfo->nBackfill, &pIter);"
  - P6 · src/wal.c:L1988-L1989@5752022 (comment before walIteratorInit): "Construct a WalInterator object that can be used to loop over all ** pages in the WAL following frame nBackfill in ascending order."
  - P7 · src/wal.c:L1787-L1790@5752022 (comment before walIteratorNext): "Find the smallest page number out of all pages held in the WAL that ** has not been returned by any prior invocation of this method on the ** same WalIterator object. Write into *piFrame the frame index where ** that page was last written into the WAL."
  - P8 · src/wal.c:L2341-L2356@5752022 (walCheckpoint): "if( pIter && (rc = walBusyLock(pWal,xBusy,pBusyArg,WAL_READ_LOCK(0),1))==SQLITE_OK ){ … int bChg = memcmp(pLive->aSalt, pWal->hdr.aSalt, sizeof(pWal->hdr.aSalt)); if( 0==bChg ){ pInfo->nBackfillAttempted = mxSafeFrame;"
  - P9 · src/wal.c:L2358-L2359@5752022 (walCheckpoint): "/* Sync the WAL to disk */ rc = sqlite3OsSync(pWal->pWalFd, CKPT_SYNC_FLAGS(sync_flags));"
  - P10 · src/wal.c:L2384-L2403@5752022 (walCheckpoint, copy loop): "/* Iterate through the contents of the WAL, copying data to the ** db file */ while( rc==SQLITE_OK && 0==walIteratorNext(pIter, &iDbpage, &iFrame) ){ … if( iFrame<=nBackfill || iFrame>mxSafeFrame || iDbpage>mxPage ){ continue; } iOffset = walFrameOffset(iFrame, szPage) + WAL_FRAME_HDRSIZE; … rc = sqlite3OsRead(pWal->pWalFd, zBuf, szPage, iOffset); … iOffset = (iDbpage-1)*(i64)szPage; … rc = sqlite3OsWrite(pWal->pDbFd, zBuf, szPage, iOffset);"
  - P11 · src/wal.c:L2408-L2419@5752022 (walCheckpoint, after the loop): "/* If work was actually accomplished... */ if( rc==SQLITE_OK ){ if( mxSafeFrame==walIndexHdr(pWal)->mxFrame ){ i64 szDb = pWal->hdr.nPage*(i64)szPage; testcase( IS_BIG_INT(szDb) ); rc = sqlite3OsTruncate(pWal->pDbFd, szDb); if( rc==SQLITE_OK ){ rc = sqlite3OsSync(pWal->pDbFd, CKPT_SYNC_FLAGS(sync_flags)); } } if( rc==SQLITE_OK ){ AtomicStore(&pInfo->nBackfill, mxSafeFrame);"
  - P12 · src/wal.c:L2424-L2431@5752022 (walCheckpoint): "/* Release the reader lock held while backfilling */ walUnlockExclusive(pWal, WAL_READ_LOCK(0), 1); } if( rc==SQLITE_BUSY ){ /* Reset the return code so as not to report a checkpoint failure ** just because there are active readers. */ rc = SQLITE_OK;"
  - P13 · src/wal.c:L2440@5752022 (walCheckpoint): "if( rc==SQLITE_OK && eMode!=SQLITE_CHECKPOINT_PASSIVE ){"
  - P14 · src/wal.c:L4427-L4444@5752022 (sqlite3WalCheckpoint): "if( eMode!=SQLITE_CHECKPOINT_NOOP ){ rc = walLockExclusive(pWal, WAL_CKPT_LOCK, 1); … if( rc==SQLITE_OK ){ pWal->ckptLock = 1; … if( eMode!=SQLITE_CHECKPOINT_PASSIVE ){ rc = walBusyLock(pWal, xBusy2, pBusyArg, WAL_WRITE_LOCK, 1);"
  - P15 · src/wal.c:L4462-L4481@5752022 (sqlite3WalCheckpoint): "For a passive checkpoint, do not re-enable blocking locks after ** reading the wal-index header. A passive checkpoint should not block ** or invoke the busy handler. The only lock such a checkpoint may ** attempt to obtain is a lock on a read-slot, and it should give up ** immediately and do a partial checkpoint if it cannot obtain it. */ walDisableBlocking(pWal); rc = walIndexReadHdr(pWal, &isChanged); … rc = walCheckpoint(pWal, db, eMode2, xBusy2, pBusyArg, sync_flags,zBuf);"
  - P16 · src/wal.c:L3950-L3955@5752022 (comment before walRestartLog): "This function is called just before writing a set of frames to the log ** file (see sqlite3WalFrames()). It checks to see if, instead of appending ** to the current log file, it is possible to overwrite the start of the ** existing log file with the new frames (i.e. "reset" the log). If so, ** it sets pWal->hdr.mxFrame to 0."
  - P17 · src/wal.c:L3965-L3986@5752022 (walRestartLog): "if( pWal->readLock==0 ){ volatile WalCkptInfo *pInfo = walCkptInfo(pWal); assert( pInfo->nBackfill==pWal->hdr.mxFrame ); if( pInfo->nBackfill>0 ){ u32 salt1; sqlite3_randomness(4, &salt1); rc = walLockExclusive(pWal, WAL_READ_LOCK(1), WAL_NREADER-1); if( rc==SQLITE_OK ){ /* If all readers are using WAL_READ_LOCK(0) (in other words if no ** readers are currently using the WAL), then the transactions ** frames will overwrite the start of the existing log. … walRestartHdr(pWal, salt1); walUnlockExclusive(pWal, WAL_READ_LOCK(1), WAL_NREADER-1); }else if( rc!=SQLITE_BUSY ){ return rc; }"
  - P18 · src/wal.c:L2238-L2246@5752022 (walRestartHdr): "pWal->nCkpt++; pWal->hdr.mxFrame = 0; sqlite3Put4byte((u8*)&aSalt[0], 1 + sqlite3Get4byte((u8*)&aSalt[0])); memcpy(&pWal->hdr.aSalt[1], &salt1, 4); walIndexWriteHdr(pWal); AtomicStore(&pInfo->nBackfill, 0); pInfo->nBackfillAttempted = 0; pInfo->aReadMark[1] = 0; for(i=2; i<WAL_NREADER; i++) pInfo->aReadMark[i] = READMARK_NOT_USED;"
  - P19 · src/wal.c:L4162-L4174@5752022 (walFrames): "/* See if it is possible to write these frames into the start of the ** log file, instead of appending to it at pWal->hdr.mxFrame. */ if( SQLITE_OK!=(rc = walRestartLog(pWal)) ){ return rc; } … iFrame = pWal->hdr.mxFrame; if( iFrame==0 ){"
  - P20 · src/wal.c:L4338-L4346@5752022 (walFrames): "pWal->hdr.mxFrame = iFrame; if( isCommit ){ pWal->hdr.iChange++; pWal->hdr.nPage = nTruncate; } /* If this is a commit, update the wal-index header too. */ if( isCommit ){ walIndexWriteHdr(pWal); pWal->iCallback = iFrame;"
  - P21 · src/wal.c:L4520-L4522@5752022 (comment before sqlite3WalCallback): "Return the value to pass to a sqlite3_wal_hook callback, the ** number of frames in the WAL at the point of the last commit since ** sqlite3WalCallback() was called."

### S-ch1-r1-found-ckpt-02
- url: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/main.c · canonical: github.com/sqlite/sqlite/blob/version-3.54.1/src/main.c
- repo: github.com/sqlite/sqlite · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1)
- title: src/main.c · authors: SQLite developers · publisher: SQLite project
- date: release 3.54.1 · version: 3.54.1
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-ch1-r1-found-ckpt-01.
- excerpt-sha256: not computed (no local clone); checked by content against pages/S-ch1-r1-found-ckpt-02.txt
- passages:
  - P1 · src/main.c:L2500-L2513@5752022 (sqlite3WalDefaultHook): "The sqlite3_wal_hook() callback registered by sqlite3_wal_autocheckpoint(). ** Invoke sqlite3_wal_checkpoint if the number of frames in the log file ** is greater than sqlite3.pWalArg cast to an integer (the value configured by ** wal_autocheckpoint()). … if( nFrame>=SQLITE_PTR_TO_INT(pClientData) ){ sqlite3BeginBenignMalloc(); sqlite3_wal_checkpoint(db, zDb);"
  - P2 · src/main.c:L2539-L2540@5752022 (sqlite3_wal_autocheckpoint): "if( nFrame>0 ){ sqlite3_wal_hook(db, sqlite3WalDefaultHook, SQLITE_INT_TO_PTR(nFrame));"
  - P3 · src/main.c:L3721@5752022 (openDatabase): "sqlite3_wal_autocheckpoint(db, SQLITE_DEFAULT_WAL_AUTOCHECKPOINT);"
  - P4 · src/main.c:L2652-L2655@5752022 (sqlite3_wal_checkpoint): "int sqlite3_wal_checkpoint(sqlite3 *db, const char *zDb){ /* EVIDENCE-OF: R-41613-20553 The sqlite3_wal_checkpoint(D,X) is equivalent to ** sqlite3_wal_checkpoint_v2(D,X,SQLITE_CHECKPOINT_PASSIVE,0,0). */ return sqlite3_wal_checkpoint_v2(db,zDb,SQLITE_CHECKPOINT_PASSIVE,0,0);"
  - P5 · src/main.c:L2629-L2692@5752022 (sqlite3_wal_checkpoint_v2, sqlite3Checkpoint): "db->busyHandler.nBusy = 0; rc = sqlite3Checkpoint(db, iDb, eMode, pnLog, pnCkpt); … rc = sqlite3BtreeCheckpoint(db->aDb[i].pBt, eMode, pnLog, pnCkpt);"

### S-ch1-r1-found-ckpt-03
- url: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/vdbeapi.c · canonical: github.com/sqlite/sqlite/blob/version-3.54.1/src/vdbeapi.c
- repo: github.com/sqlite/sqlite · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1)
- title: src/vdbeapi.c · authors: SQLite developers · publisher: SQLite project
- date: release 3.54.1 · version: 3.54.1
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-ch1-r1-found-ckpt-01. Fetched because the WAL hook is invoked here, not in main.c.
- excerpt-sha256: not computed (no local clone); checked by content against pages/S-ch1-r1-found-ckpt-03.txt
- passages:
  - P1 · src/vdbeapi.c:L803-L818@5752022 (doWalCallbacks): "This function is called after a transaction has been committed. It ** invokes callbacks registered with sqlite3_wal_hook() as required. */ static int doWalCallbacks(sqlite3 *db){ … nEntry = sqlite3PagerWalCallback(sqlite3BtreePager(pBt)); sqlite3BtreeLeave(pBt); if( nEntry>0 && db->xWalCallback && rc==SQLITE_OK ){ rc = db->xWalCallback(db->pWalArg, db, db->aDb[i].zDbSName, nEntry);"
  - P2 · src/vdbeapi.c:L945-L947@5752022 (sqlite3Step, defined at L838): "if( rc==SQLITE_DONE && db->autoCommit ){ assert( p->rc==SQLITE_OK ); p->rc = doWalCallbacks(db);"

### S-ch1-r1-found-ckpt-04
- url: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/pager.c · canonical: github.com/sqlite/sqlite/blob/version-3.54.1/src/pager.c
- repo: github.com/sqlite/sqlite · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1)
- title: src/pager.c · authors: SQLite developers · publisher: SQLite project
- date: release 3.54.1 · version: 3.54.1
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-ch1-r1-found-ckpt-01.
- excerpt-sha256: not computed (no local clone); checked by content against pages/S-ch1-r1-found-ckpt-04.txt
- passages:
  - P1 · src/pager.c:L7606-L7608@5752022 (sqlite3PagerCheckpoint): "if( pPager->pWal ){ rc = sqlite3WalCheckpoint(pPager->pWal, db, eMode, (eMode<=SQLITE_CHECKPOINT_PASSIVE ? 0 : pPager->xBusyHandler),"
  - P2 · src/pager.c:L7617-L7618@5752022 (sqlite3PagerWalCallback): "int sqlite3PagerWalCallback(Pager *pPager){ return sqlite3WalCallback(pPager->pWal);"
  - P3 · src/pager.c:L3671-L3700@5752022 (sqlite3PagerSetFlags): "if( pPager->tempFile || level==PAGER_SYNCHRONOUS_OFF ){ pPager->noSync = 1; … if( pPager->noSync ){ pPager->syncFlags = 0; … pPager->walSyncFlags = (pPager->syncFlags<<2);"
  - P4 · src/pager.c:L614-L615@5752022 (comment on Pager fields): "for checkpoint operations, use (walSyncFlags&0x03) and to get the correct ** sync flags for transaction commit, use ((walSyncFlags>>2)&0x03)."

### S-ch1-r1-found-ckpt-05
- url: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/wal.h · canonical: github.com/sqlite/sqlite/blob/version-3.54.1/src/wal.h
- repo: github.com/sqlite/sqlite · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1)
- title: src/wal.h · authors: SQLite developers · publisher: SQLite project
- date: release 3.54.1 · version: 3.54.1
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-ch1-r1-found-ckpt-01.
- excerpt-sha256: not computed (no local clone); checked by content against pages/S-ch1-r1-found-ckpt-05.txt
- passages:
  - P1 · src/wal.h:L22-L26@5752022: "Macros for extracting appropriate sync flags for either transaction ** commits (WAL_SYNC_FLAGS(X)) or for checkpoint ops (CKPT_SYNC_FLAGS(X)): */ #define WAL_SYNC_FLAGS(X) ((X)&0x03) #define CKPT_SYNC_FLAGS(X) (((X)>>2)&0x03)"

### S-ch1-r1-found-ckpt-06
- url: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/os.c · canonical: github.com/sqlite/sqlite/blob/version-3.54.1/src/os.c
- repo: github.com/sqlite/sqlite · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1)
- title: src/os.c · authors: SQLite developers · publisher: SQLite project
- date: release 3.54.1 · version: 3.54.1
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-ch1-r1-found-ckpt-01.
- excerpt-sha256: not computed (no local clone); checked by content against pages/S-ch1-r1-found-ckpt-06.txt
- passages:
  - P1 · src/os.c:L99-L101@5752022 (sqlite3OsSync): "int sqlite3OsSync(sqlite3_file *id, int flags){ DO_OS_MALLOC_TEST(id); return flags ? id->pMethods->xSync(id, flags) : SQLITE_OK;"

## Claims

Listed in the order the code runs: the automatic trigger (01–05), the checkpoint (06–13), the sync caveat (14), then the next writer's reset (15–16), and one interpretation (17).

### C-ch1-r1-found-ckpt-01
- claim: In SQLite 3.54.1 (src/main.c), opening a database connection calls sqlite3_wal_autocheckpoint(db, SQLITE_DEFAULT_WAL_AUTOCHECKPOINT), which, for a positive threshold, registers sqlite3WalDefaultHook as that connection's WAL hook with the threshold as its argument.
- kind: behaviour
- questions: Q-ch1-03 · load-bearing: no (the question is marked not load-bearing)
- support: S-ch1-r1-found-ckpt-02 · src/main.c:L3721@5752022 (P3) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-02 · src/main.c:L2539-L2540@5752022 (P2) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1 source, built without SQLITE_OMIT_WAL
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-02
- claim: In SQLite 3.54.1 (src/wal.c, walFrames), when a write of frames is a commit, the code sets the WAL's mxFrame to the index of the last frame written, writes the wal-index header, and stores that same frame index in pWal->iCallback; sqlite3WalCallback (reached through sqlite3PagerWalCallback) returns that value once and resets it to 0.
- kind: behaviour
- questions: Q-ch1-03 · load-bearing: no
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L4338-L4346@5752022 (P20) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L4520-L4522@5752022 (P21) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-04 · src/pager.c:L7617-L7618@5752022 (P2) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-03
- claim: In SQLite 3.54.1 (src/vdbeapi.c), when a statement run by sqlite3Step finishes with SQLITE_DONE and the connection is in autocommit mode, sqlite3Step calls doWalCallbacks, which, for each attached database whose WAL reports a commit (a frame count above 0), calls the connection's registered WAL hook with that frame count. The WAL hook, and therefore the automatic checkpoint, therefore runs inside the committing connection's own sqlite3_step call.
- kind: behaviour
- questions: Q-ch1-03 · load-bearing: no
- support: S-ch1-r1-found-ckpt-03 · src/vdbeapi.c:L945-L947@5752022 (P2) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-03 · src/vdbeapi.c:L803-L818@5752022 (P1) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; extends C-r1-found-ckpt-13 (the docs' "same thread") with the call site
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-04
- claim: In SQLite 3.54.1 (src/main.c), sqlite3WalDefaultHook calls sqlite3_wal_checkpoint(db, zDb) when the frame count it receives is greater than or equal to the configured threshold (nFrame>=threshold), and sqlite3_wal_checkpoint is implemented as sqlite3_wal_checkpoint_v2 with mode SQLITE_CHECKPOINT_PASSIVE.
- kind: behaviour
- questions: Q-ch1-03 · load-bearing: no
- support: S-ch1-r1-found-ckpt-02 · src/main.c:L2500-L2513@5752022 (P1) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-02 · src/main.c:L2652-L2655@5752022 (P4) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; the function's comment says "greater than" but the code tests ">=" (see flags)
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-05
- claim: In SQLite 3.54.1, a PASSIVE checkpoint passes through sqlite3Checkpoint and (via sqlite3BtreeCheckpoint, not fetched) sqlite3PagerCheckpoint, which passes no busy handler for PASSIVE mode. sqlite3WalCheckpoint then takes the exclusive checkpoint lock (WAL_CKPT_LOCK), takes the writer lock only for modes other than PASSIVE, reads the wal-index header with blocking locks disabled, and calls walCheckpoint.
- kind: behaviour
- questions: Q-ch1-03 · load-bearing: no
- support: S-ch1-r1-found-ckpt-02 · src/main.c:L2629-L2692@5752022 (P5) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-04 · src/pager.c:L7606-L7608@5752022 (P1) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L4427-L4444@5752022 (P14) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L4462-L4481@5752022 (P15) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; the btree.c hop between sqlite3Checkpoint and sqlite3PagerCheckpoint is inferred from the function names, not quoted
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-06
- claim: In SQLite 3.54.1 (src/wal.c, walCheckpoint), the copy work runs only if nBackfill is less than the WAL's mxFrame. The function first sets mxSafeFrame to mxFrame, then for each read mark 1 to 4 whose value is below mxSafeFrame it tries to lock that read slot exclusively. If the lock is obtained, it rewrites the mark (slot 1 to mxSafeFrame, others to READMARK_NOT_USED); if the lock is busy, it lowers mxSafeFrame to that reader's mark and stops calling the busy handler.
- kind: behaviour
- questions: Q-ch1-03 (a) · load-bearing: no
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2304-L2328@5752022 (P3) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2310-L2313@5752022 (P4) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; for PASSIVE, xBusy is 0 from the start (C-ch1-r1-found-ckpt-05), so a busy slot lowers mxSafeFrame at once; extends C-r1-found-ckpt-04
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-07
- claim: In SQLite 3.54.1 (src/wal.c), after computing mxSafeFrame, walCheckpoint builds the iterator with walIteratorInit only if nBackfill is less than mxSafeFrame. The iterator loops over the WAL's pages after frame nBackfill in ascending page-number order, and each step (walIteratorNext) returns the smallest page number not yet returned, together with the frame where that page was last written.
- kind: behaviour
- questions: Q-ch1-03 (c) · load-bearing: no
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2335-L2337@5752022 (P5) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L1988-L1989@5752022 (P6) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L1787-L1790@5752022 (P7) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-08
- claim: In SQLite 3.54.1 (src/wal.c, walCheckpoint), once the iterator exists, the checkpointer takes read-slot 0 (WAL_READ_LOCK(0)) exclusively. It then checks that the live wal-index salts still match the header it read (that the WAL has not been reset since) and records nBackfillAttempted = mxSafeFrame. It does all this before any sync or copy.
- kind: behaviour
- questions: Q-ch1-03 · load-bearing: no
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2341-L2356@5752022 (P8) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-09
- claim: In SQLite 3.54.1 (src/wal.c, walCheckpoint), the checkpoint syncs the -wal file (sqlite3OsSync on pWalFd with the checkpoint sync flags) before the loop that copies frames into the database file, as the function's header comment also states.
- kind: behaviour
- questions: Q-ch1-03 (b) · load-bearing: no
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2358-L2359@5752022 (P9) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2263-L2270@5752022 (P1) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; whether the sync reaches the disk depends on the synchronous setting (C-ch1-r1-found-ckpt-14); between the sync and the loop the code only hints the database file's final size to the VFS (L2361-L2380)
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-10
- claim: In SQLite 3.54.1 (src/wal.c, walCheckpoint), the copy loop takes pages from the iterator in ascending page order. It skips any frame at or below nBackfill, above mxSafeFrame, or holding a page beyond the database's page count (mxPage). For every other page it reads the page image from its WAL frame and writes it into the database file at offset (page number − 1) × page size.
- kind: behaviour
- questions: Q-ch1-03 (c) · load-bearing: no
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2384-L2403@5752022 (P10) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; the loop also stops early if the connection is interrupted (L2390-L2393)
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-11
- claim: In SQLite 3.54.1 (src/wal.c, walCheckpoint), after the copy loop and only if mxSafeFrame equals the live wal-index mxFrame (every frame was copied), the checkpoint first truncates the database file to the header's page count × page size and then syncs the database file. In a partial checkpoint (mxSafeFrame below mxFrame), the code neither truncates nor syncs the database file.
- kind: behaviour
- questions: Q-ch1-03 (d), (f) · load-bearing: no
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2408-L2419@5752022 (P11) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2263-L2270@5752022 (P1: "Fsync is also called on the database file if (and only if) the entire WAL content is copied") · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; this truncation is of the database file (to its committed size), not of the -wal file; refines C-r1-found-ckpt-02, whose docs order (sync WAL, copy, sync db) does not say that the db sync is conditional
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-12
- claim: In SQLite 3.54.1 (src/wal.c, walCheckpoint), the checkpoint records its progress only after the copy loop and the conditional truncate and sync: if no error occurred, it stores nBackfill = mxSafeFrame in the shared wal-index, in both full and partial checkpoints. It then releases read-slot 0 and turns an SQLITE_BUSY result into SQLITE_OK. walCheckpoint is the only routine that increases nBackfill.
- kind: behaviour
- questions: Q-ch1-03 (e) · load-bearing: no
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2408-L2419@5752022 (P11) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2424-L2431@5752022 (P12) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2272-L2273@5752022 (P2) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-13
- claim: In SQLite 3.54.1 (src/wal.c, walCheckpoint), the block that waits for readers and, for TRUNCATE, resets and truncates the -wal file runs only when the mode is not PASSIVE, so a PASSIVE checkpoint ends after recording nBackfill and never resets or truncates the -wal file itself.
- kind: behaviour
- questions: Q-ch1-03 (f), (g) · load-bearing: no
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2440@5752022 (P13) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; the non-PASSIVE block itself is covered by C-r2-found-ckpt-01 (not re-researched; D-01 is out of scope)
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-14
- claim: In SQLite 3.54.1, both checkpoint syncs (of the -wal file and of the database file) pass CKPT_SYNC_FLAGS(sync_flags), the upper two bits of the pager's walSyncFlags. With PRAGMA synchronous=OFF (or a temp file), the pager sets syncFlags to 0, so walSyncFlags (syncFlags<<2) yields checkpoint sync flags of 0, and sqlite3OsSync with flags 0 returns SQLITE_OK without calling the VFS xSync.
- kind: behaviour
- questions: Q-ch1-03 (b), (d) · load-bearing: no (a scope condition on steps b and d)
- support: S-ch1-r1-found-ckpt-04 · src/pager.c:L3671-L3700@5752022 (P3) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-05 · src/wal.h:L22-L26@5752022 (P1) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-06 · src/os.c:L99-L101@5752022 (P1) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2358-L2359@5752022 (P9) and L2408-L2419 (P11) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; the pager.c comment at L614-L615 describes the bit layout the other way round (see flags); the code is cited, not the comment
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-15
- claim: In SQLite 3.54.1 (src/wal.c), the WAL reset is done by the next writer, not by the checkpoint. walFrames calls walRestartLog just before writing a transaction's frames. walRestartLog resets only if all of these hold: the writer's read transaction holds read-slot 0 (readLock==0, where the code asserts that nBackfill equals mxFrame, so the whole WAL has been copied); nBackfill is above 0; and an exclusive lock on read slots 1 to 4 is obtained at once (walLockExclusive, no busy handler). If that lock is busy, no reset happens and the frames are appended after mxFrame.
- kind: behaviour
- questions: Q-ch1-03 (g) · load-bearing: no
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L4162-L4174@5752022 (P19) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L3965-L3986@5752022 (P17) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L3950-L3955@5752022 (P16) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; what readLock==0 means for a reader (read-slot 0 = read the database file only, WAL fully backfilled) is C-r2-found-ckpt-02; consistent with C-r1-found-ckpt-05
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-16
- claim: In SQLite 3.54.1 (src/wal.c), the reset done by walRestartHdr increments the checkpoint sequence number (nCkpt), sets mxFrame to 0, adds 1 to salt-1, sets salt-2 to a fresh random value, writes the wal-index header, sets nBackfill to 0, and resets the read marks. walFrames then sees frame 0 and writes a new WAL header at the start of the -wal file before the first frame.
- kind: behaviour
- questions: Q-ch1-03 (g) · load-bearing: no
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2238-L2246@5752022 (P18) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L4162-L4174@5752022 (P19) · rung 1 · fit direct · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1; the random salt comes from sqlite3_randomness in walRestartLog (P17); extends C-r1-found-rw-24 with the code
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-found-ckpt-17
- claim: Read together, the cited ranges show that in SQLite 3.54.1 the frame count passed to the auto-checkpoint hook is the WAL's mxFrame after the commit, which counts every frame since the last WAL reset, including frames already copied. So after a partial checkpoint, or a complete one not yet followed by a reset, the next commit on a WAL still at or above the threshold triggers another PASSIVE checkpoint.
- kind: interpretation
- questions: Q-ch1-03 · load-bearing: no (explains C-r1-found-ckpt-14 from the code)
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L4338-L4346@5752022 (P20) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-02 · src/main.c:L2500-L2513@5752022 (P1) · rung 1 · fit direct · upstream self
- support: S-ch1-r1-found-ckpt-01 · src/wal.c:L2238-L2246@5752022 (P18: only a reset sets mxFrame to 0) · rung 1 · fit partial · upstream self
- excerpt-sha256: not computed; checked by content
- scope: SQLite 3.54.1, default WAL hook; this is the researcher's reading of several ranges, and is consistent with the docs' statement in C-r1-found-ckpt-14
- confidence: medium · flags: none
- conflicts: none

## Conflicts
- none between sources. Two code comments disagree with the code next to them (see flags); the claims cite the code.

## Speculation and flags
- C-ch1-r1-found-ckpt-04: the comment on sqlite3WalDefaultHook says "is greater than sqlite3.pWalArg" while its code tests `nFrame>=SQLITE_PTR_TO_INT(pClientData)`; the code (>=) matches the docs' "1000 pages or more" (C-r1-found-ckpt-12).
- C-ch1-r1-found-ckpt-14: the pager.c comment (S-ch1-r1-found-ckpt-04/P4) says "for checkpoint operations, use (walSyncFlags&0x03) … for transaction commit, use ((walSyncFlags>>2)&0x03)", the opposite of wal.h's CKPT_SYNC_FLAGS(X) = ((X)>>2)&0x03 and pager.c L3700 `walSyncFlags = (syncFlags<<2)`; a stale or reversed comment.
- C-ch1-r1-found-ckpt-11/-12 (surprising to a reader): in a partial checkpoint the code advances nBackfill without syncing the database file; only a complete backfill syncs it (the header comment says why: the second fsync "makes it safe to delete the WAL").
- C-ch1-r1-found-ckpt-17: an interpretation across ranges, not a single passage.

## Unused leads
- src/wal.c:L4311@5752022 (walFrames calls walLimitSize after a reset, the journal_size_limit path) — belongs to practice-ops / C-r1-found-ckpt-08.
- src/btree.c at version-3.54.1 (sqlite3BtreeCheckpoint) — the one hop of the automatic path not fetched; also where SQLITE_LOCKED is returned when a transaction is open (main.c L2663-L2664 comment).

## Queries
- direct fetch: raw src/wal.c at version-3.54.1 → useful
- direct fetch: raw src/main.c at version-3.54.1 → useful
- direct fetch: raw src/vdbeapi.c at version-3.54.1 → useful (the hook's call site)
- direct fetch: raw src/pager.c at version-3.54.1 → useful
- direct fetch: raw src/wal.h at version-3.54.1 → useful
- direct fetch: raw src/os.c at version-3.54.1 → useful

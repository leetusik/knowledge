# Verification: 20261023-1245-sqlite-wal · ch1-b1
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 11 · supported 9 · partial 2 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0

Pages (saved by me, raw files so line numbers equal source line numbers), in pages/ch1-b1/: wal.txt (src/wal.c), main.txt (src/main.c), vdbeapi.txt (src/vdbeapi.c), sqlite3h.txt (src/sqlite.h.in), all fetched from raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/. Tag check: the GitHub API ref refs/tags/version-3.54.1 resolves to commit 57520227c95396ce39ba6ecaac8d475b78dd3964, as the findings record. Every cited passage was run through `pagetext.py --find` against these files and found at the recorded line (hash not computed by the researcher; checked by content and line numbers). Currency: sqlite.org/changes.html lists 3.54.1 (2026-10-16) as the latest release.

## Records
### V-C-ch1-r1-found-ckpt-03-1
- claim: C-ch1-r1-found-ckpt-03
- source S-ch1-r1-found-ckpt-03 · opened: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/vdbeapi.c (curl) · quote-match: exact · passage at P1 (L803-L818) and P2 (L945-L947): found verbatim
- implied: sqlite3Step (defined L838, called from sqlite3_step's loop at L991) runs the statement; if rc==SQLITE_DONE and db->autoCommit, it calls doWalCallbacks(db) (L945-L947). doWalCallbacks loops over db->aDb, takes nEntry from sqlite3PagerWalCallback, and calls db->xWalCallback(pWalArg, db, name, nEntry) if nEntry>0, xWalCallback is set and rc is OK. So the hook runs inside that connection's step call. The "therefore the automatic checkpoint" link depends on the default hook being sqlite3WalDefaultHook; main.c L2500-L2503 says it is "the sqlite3_wal_hook() callback registered by sqlite3_wal_autocheckpoint()", and L3721 registers it in openDatabase. That main.c passage is not in this claim's support lines (it is in C-04's).
- verdict: supported · reason: every stated part is in the code; the autocheckpoint link is a direct inference from main.c (suggest adding S-ch1-r1-found-ckpt-02/P1 and P3 to the support lines).
- bar: met (one rung-1 source, descriptive, not load-bearing) · independence: n/a · currency: tag 3.54.1 is the latest release
- counter: not run

### V-C-ch1-r1-found-ckpt-04-1
- claim: C-ch1-r1-found-ckpt-04
- source S-ch1-r1-found-ckpt-02 · opened: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/main.c (curl) · quote-match: exact · passage at P1 (L2500-L2513) and P4 (L2652-L2655): found verbatim
- implied: sqlite3WalDefaultHook tests `nFrame>=SQLITE_PTR_TO_INT(pClientData)` and then calls sqlite3_wal_checkpoint(db, zDb) (L2511-L2513). sqlite3_wal_checkpoint returns sqlite3_wal_checkpoint_v2(db,zDb,SQLITE_CHECKPOINT_PASSIVE,0,0) (L2655). The function comment says "greater than" while the code uses >=, as the claim's scope says.
- verdict: supported · reason: all parts match the code.
- bar: met · independence: n/a · currency: latest release
- counter: not run

### V-C-ch1-r1-found-ckpt-06-1
- claim: C-ch1-r1-found-ckpt-06
- source S-ch1-r1-found-ckpt-01 · opened: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/wal.c (curl) · quote-match: exact · passage at P3 (L2304-L2328) and P4 (L2310-L2313): found verbatim
- implied: L2304 `if( pInfo->nBackfill<pWal->hdr.mxFrame )` gates the work. L2315 mxSafeFrame = hdr.mxFrame. L2317 loops i=1..WAL_NREADER-1; WAL_NREADER is SQLITE_SHM_NLOCK-3 (wal.c L299) and SQLITE_SHM_NLOCK is 8 (sqlite.h.in L1611), so i=1..4. Condition `mxSafeFrame>y` means mark below mxSafeFrame. It takes the exclusive lock via walBusyLock(...,1). OK: iMark = (i==1 ? mxSafeFrame : READMARK_NOT_USED) stored. BUSY: mxSafeFrame = y; xBusy = 0. Other errors jump to walcheckpoint_out (not mentioned in the claim, not contradicting).
- verdict: supported · reason: each item is in L2304-L2331.
- bar: met · independence: n/a · currency: latest release
- counter: not run

### V-C-ch1-r1-found-ckpt-07-1
- claim: C-ch1-r1-found-ckpt-07
- source S-ch1-r1-found-ckpt-01 · opened: same wal.c · quote-match: exact · passage at P5 (L2335-L2337), P6 (L1988-L1989), P7 (L1787-L1790): found verbatim
- implied: iterator built only `if( pInfo->nBackfill<mxSafeFrame )` (L2336-L2337). walIteratorInit comment: loop over all pages in the WAL following frame nBackfill in ascending order (L1988-L1989; the comment adds that frames nBackfill or earlier may be included, an optimization only). walIteratorNext comment: smallest page number not yet returned, and *piFrame is the frame where that page was last written (L1787-L1790).
- verdict: supported · reason: all parts stated in the code and its comments.
- bar: met · independence: n/a · currency: latest release
- counter: not run

### V-C-ch1-r1-found-ckpt-09-1
- claim: C-ch1-r1-found-ckpt-09
- source S-ch1-r1-found-ckpt-01 · opened: same wal.c · quote-match: exact · passage at P9 (L2358-L2359) and P1 (L2263-L2270): found verbatim
- implied: L2359 `sqlite3OsSync(pWal->pWalFd, CKPT_SYNC_FLAGS(sync_flags))` comes before the size hint block (L2361-L2382) and the copy loop (L2386). Header comment L2263-L2265: fsync is called on the WAL before writing content from the WAL into the database.
- verdict: supported · reason: order and header comment confirmed.
- bar: met · independence: n/a · currency: latest release
- counter: not run

### V-C-ch1-r1-found-ckpt-10-1
- claim: C-ch1-r1-found-ckpt-10
- source S-ch1-r1-found-ckpt-01 · opened: same wal.c · quote-match: exact · passage at P10 (L2384-L2403): found verbatim
- implied: loop uses walIteratorNext (ascending, see C-07). Skip test L2394: iFrame<=nBackfill || iFrame>mxSafeFrame || iDbpage>mxPage; mxPage = hdr.nPage (L2316). Read from WAL at walFrameOffset(iFrame, szPage)+WAL_FRAME_HDRSIZE (L2397-L2399). Write to the db at (iDbpage-1)*szPage (L2401-L2403). Interrupt check at L2390-L2393 matches the scope note.
- verdict: supported · reason: all items present.
- bar: met · independence: n/a · currency: latest release
- counter: not run

### V-C-ch1-r1-found-ckpt-11-1
- claim: C-ch1-r1-found-ckpt-11
- source S-ch1-r1-found-ckpt-01 · opened: same wal.c · quote-match: exact · passage at P11 (L2408-L2419) and P1 (L2267-L2270): found verbatim
- looked first: searched wal.c for sqlite3OsTruncate and OsSync in walCheckpoint. The database file is truncated and synced only at L2410-L2416, and the header comment (L2267-L2270) says "Fsync is also called on the database file if (and only if) the entire WAL content is copied". The only other truncation is of the -wal file, in the TRUNCATE branch (L2466). The WAL docs (sqlite.org/wal.html §2.3, read by WebFetch, not saved) say the database file must be synced before the WAL is reset, which agrees.
- implied: after the loop, if rc==OK and mxSafeFrame == walIndexHdr(pWal)->mxFrame (the live header, L2410), szDb = hdr.nPage*szPage, then sqlite3OsTruncate(pDbFd, szDb), then sqlite3OsSync(pDbFd). Otherwise neither is called. The condition is also gated by the loop having succeeded (rc==OK), and the claim states "only if", so it is a true necessary condition.
- verdict: supported · reason: every part matches L2408-L2419 and the header comment.
- bar: met · independence: n/a · currency: 3.54.1 is the latest release
- counter: none-found ("SQLite WAL checkpoint TRUNCATE resets wal file who resets WAL after checkpoint", "SQLite partial checkpoint database file fsync not performed nBackfill limitations", "SQLite wal.c walCheckpoint changed in recent release checkpoint fix 2026"). Currency: changes.html shows only the 3.51.3/3.53.0 "WAL-reset database corruption bug" fix, which predates 3.54.1 (the bChg salt check at L2347-L2355 is consistent with it). Lateral: wal.html §2.3 agrees that the db file is synced before the WAL is reset.

### V-C-ch1-r1-found-ckpt-12-1
- claim: C-ch1-r1-found-ckpt-12
- source S-ch1-r1-found-ckpt-01 · opened: same wal.c · quote-match: exact · passage at P11 (L2408-L2419), P12 (L2424-L2431), P2 (L2272-L2273): found verbatim
- looked first: grepped wal.c for every nBackfill assignment. Increases: only L2419 (AtomicStore nBackfill = mxSafeFrame). Other writes set it to 0 (L1611 recovery, L2243 walRestartHdr). The comment at L2272-L2273 says walCheckpoint "is the only routine that will increase the value of nBackfill", and the comment at L340-L347 agrees.
- implied: the store at L2419 happens after the loop and the conditional truncate/sync, and only when rc==OK. Then L2425 unlocks read-slot 0, and L2428-L2431 turns SQLITE_BUSY into SQLITE_OK. Full and partial are both covered (the store is outside the mxSafeFrame test). Not stated in the claim: the whole block runs only when an iterator exists (nBackfill<mxSafeFrame), read-slot 0 was locked (L2342), and the salt is unchanged (bChg==0, L2354-L2355). When the WAL was wrapped (bChg!=0) or the lock was busy, no error occurs yet nBackfill is not stored. The claim's "if no error occurred, it stores nBackfill = mxSafeFrame" therefore reads as unconditional when it is not. The slot-0 release (L2425) also happens when bChg!=0.
- verdict: partial · reason: ordering, the value stored, the release, the BUSY reset and the "only routine" statement are supported. The store is conditional on more than "no error" (iterator built, slot-0 lock obtained, wal not wrapped), so the claim as worded overstates it. · narrower claim: "In SQLite 3.54.1 (src/wal.c, walCheckpoint), when the iterator was built, read-slot 0 was locked and the WAL header salt is unchanged since the checkpoint read it, the checkpoint stores nBackfill = mxSafeFrame in the shared wal-index only after the copy loop and the conditional truncate and sync, and only if no error occurred, in both full and partial checkpoints. It then releases read-slot 0, and an SQLITE_BUSY result is turned into SQLITE_OK. walCheckpoint is the only routine that increases nBackfill."
- bar: met for the narrower claim (rung 1, descriptive) · independence: n/a · currency: latest release
- counter: none-found ("SQLite WAL checkpoint TRUNCATE resets wal file who resets WAL after checkpoint", "SQLite partial checkpoint database file fsync not performed nBackfill limitations", "SQLite wal.c walCheckpoint changed in recent release checkpoint fix 2026"). The currency query found only the 3.51.3/3.53.0 WAL-reset bug fix (changes.html), already in 3.54.1.

### V-C-ch1-r1-found-ckpt-13-1
- claim: C-ch1-r1-found-ckpt-13
- source S-ch1-r1-found-ckpt-01 · opened: same wal.c · quote-match: exact · passage at P13 (L2440): found verbatim
- implied: L2440 `if( rc==SQLITE_OK && eMode!=SQLITE_CHECKPOINT_PASSIVE ){` opens the block (wait for readers; for RESTART and TRUNCATE lock slots 1-4; for TRUNCATE walRestartHdr and sqlite3OsTruncate(pWalFd, 0), L2451-L2466). After it only the cleanup at L2473-L2476 remains. The caller sqlite3WalCheckpoint (L4427-L4517) does no WAL truncation after walCheckpoint. A request for FULL, RESTART or TRUNCATE that cannot get the write lock is downgraded to PASSIVE (L4447-L4451), which fits the claim.
- verdict: supported · reason: the PASSIVE path ends after the nBackfill store and the BUSY reset, with no reset or truncation of the -wal file.
- bar: met · independence: n/a · currency: latest release
- counter: not run

### V-C-ch1-r1-found-ckpt-15-1
- claim: C-ch1-r1-found-ckpt-15
- source S-ch1-r1-found-ckpt-01 · opened: same wal.c · quote-match: exact · passage at P19 (L4162-L4174), P17 (L3965-L3986), P16 (L3950-L3955): found verbatim
- looked first: searched wal.c for every walRestartHdr call and every reset site. Calls: walRestartLog (L3982) and walCheckpoint's TRUNCATE branch (L2465). The checkpoint itself also does sqlite3OsTruncate(pWalFd, 0) at L2466. The docs (wal.html §2.2; sqlite3_wal_checkpoint_v2 page, read by WebFetch, not saved) say the next writer rewinds the WAL, and that RESTART only ensures the next writer restarts the log. TRUNCATE is described as the same plus truncation to zero bytes.
- implied: supported parts: walFrames calls walRestartLog before writing frames (L4165). walRestartLog acts only if readLock==0 (L3965), asserts nBackfill==mxFrame (L3967), requires nBackfill>0 (L3968), and takes walLockExclusive on slots 1 to 4 (L3971; walLockExclusive at L1139 has no busy handler). It calls walRestartHdr on success. On SQLITE_BUSY it carries on (L3984-L3986 returns only on other errors), nothing is reset, and walFrames uses iFrame = mxFrame (L4173), so frames are appended. Not supported as worded: "the WAL reset is done by the next writer, not by the checkpoint" is stated with no mode limit. In TRUNCATE mode the checkpoint itself calls walRestartHdr (L2465) and truncates the -wal file (L2466), taking the same exclusive lock on slots 1 to 4 via walBusyLock (L2449).
- verdict: partial · reason: the next-writer mechanism and its three conditions are supported. The general "not by the checkpoint" is false for SQLITE_CHECKPOINT_TRUNCATE in the same file, and the claim carries no mode limit. · narrower claim: "In SQLite 3.54.1 (src/wal.c), after a PASSIVE, FULL or RESTART checkpoint the WAL reset is done by the next writer, not by the checkpoint (a TRUNCATE checkpoint instead calls walRestartHdr and truncates the -wal file itself, L2451-L2466). walFrames calls walRestartLog just before writing a transaction's frames. walRestartLog resets only if all of these hold: the writer's read transaction holds read-slot 0 (readLock==0, where the code asserts that nBackfill equals mxFrame); nBackfill is above 0; and an exclusive lock on read slots 1 to 4 is obtained at once (walLockExclusive, no busy handler). If that lock is busy, no reset happens and the frames are appended after mxFrame."
- bar: met for the narrower claim (rung 1, descriptive) · independence: n/a · currency: latest release
- counter: none-found externally ("SQLite WAL checkpoint TRUNCATE resets wal file who resets WAL after checkpoint", "SQLite partial checkpoint database file fsync not performed nBackfill limitations", "SQLite wal.c walCheckpoint changed in recent release checkpoint fix 2026"). The first query surfaced the TRUNCATE behaviour (a search-answer summary of the SQLite docs, rung 3, not recorded as a source). The conflicting lines are in the claim's own source (L2451-L2466), recorded above as the limit. The currency query found only the already-included WAL-reset bug fix.

### V-C-ch1-r1-found-ckpt-16-1
- claim: C-ch1-r1-found-ckpt-16
- source S-ch1-r1-found-ckpt-01 · opened: same wal.c · quote-match: exact · passage at P18 (L2238-L2246) and P19 (L4162-L4174): found verbatim
- implied: walRestartHdr (L2234-L2248): nCkpt++, mxFrame=0, aSalt[0] = 1 + old, aSalt[1] = salt1 (the random value passed in), walIndexWriteHdr, nBackfill=0, nBackfillAttempted=0, aReadMark[1]=0, aReadMark[2..4]=READMARK_NOT_USED. salt1 comes from sqlite3_randomness(4,&salt1) at L3970 (and L2447). walFrames then reads iFrame = hdr.mxFrame (L4173), and when iFrame==0 builds the WAL header and writes it at offset 0 with sqlite3OsWrite (L4174-L4194) before the frames. The claim says "salt-1" and "salt-2" for aSalt[0] and aSalt[1], which is a naming choice consistent with the format.
- verdict: supported · reason: every listed step is in the code.
- bar: met · independence: n/a · currency: latest release
- counter: not run

## Counter-evidence
None recorded as sources. Queries run for the three `main` claims (C-11, C-12, C-15): "SQLite WAL checkpoint TRUNCATE resets wal file who resets WAL after checkpoint"; "SQLite partial checkpoint database file fsync not performed nBackfill limitations"; "SQLite wal.c walCheckpoint changed in recent release checkpoint fix 2026". Neither claim was contradicted by an outside source. The limit on C-15 is in its own source (wal.c L2451-L2466).

## Leads
- https://www.sqlite.org/wal.html — rung 1 docs; §2.2 and §2.3 state the next-writer reset and the sync of the database file before the WAL reset. Agrees with C-11 and the general form of C-15. Read by WebFetch only (not saved).
- https://www.sqlite.org/c3ref/wal_checkpoint_v2.html — rung 1 docs; says RESTART only ensures the next writer restarts the log, and TRUNCATE adds truncation. Read by WebFetch only (not saved).

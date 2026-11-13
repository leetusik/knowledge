# Verification: 20261023-1245-sqlite-wal · ch1-b3
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 1 · supported 1 · partial 0 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0
## Records
### V-C-ch1-r1-found-ckpt-05-1
- claim: C-ch1-r1-found-ckpt-05
- source S-ch1-r1-found-ckpt-02 · opened: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/main.c (curl, saved pages/ch1-b3/S-ch1-r1-found-ckpt-02.html/.txt) · quote-match: exact · passage at src/main.c:L2629-L2692 (P5): found verbatim (--find: found; lines 2629-2630 and 2692 read in the raw file)
- source S-ch1-r1-found-ckpt-04 · opened: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/pager.c (curl, saved pages/ch1-b3/S-ch1-r1-found-ckpt-04.html/.txt) · quote-match: exact · passage at src/pager.c:L7606-L7608 (P1): found verbatim (--find: found; line numbers match)
- source S-ch1-r1-found-ckpt-01 · opened: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/wal.c (curl, saved pages/ch1-b3/S-ch1-r1-found-ckpt-01.html/.txt) · quote-match: exact · passages at src/wal.c:L4427-L4444 (P14) and L4462-L4481 (P15): found verbatim (--find: found; line numbers match)
- extra check (not cited by the researcher): src/btree.c at the same tag, saved pages/ch1-b3/btree-c.html. L11403 defines sqlite3BtreeCheckpoint, and L11411 calls sqlite3PagerCheckpoint(pBt->pPager, p->db, eMode, pnLog, pnCkpt). This confirms the hop the claim marks as inferred.
- looked first (load-bearing: no, so this is brief): the tag's checkpoint path reads sqlite3_wal_checkpoint -> sqlite3_wal_checkpoint_v2 -> sqlite3Checkpoint -> sqlite3BtreeCheckpoint -> sqlite3PagerCheckpoint -> sqlite3WalCheckpoint -> walCheckpoint.
- implied:
  - main.c: sqlite3_wal_checkpoint_v2 calls sqlite3Checkpoint (L2630). sqlite3Checkpoint calls sqlite3BtreeCheckpoint (L2692). sqlite3_wal_checkpoint is defined as the PASSIVE call (L2652-L2655).
  - pager.c: sqlite3PagerCheckpoint (defined L7586) passes `eMode<=SQLITE_CHECKPOINT_PASSIVE ? 0 : pPager->xBusyHandler` as the busy handler to sqlite3WalCheckpoint (L7606-L7608). For PASSIVE this is 0.
  - wal.c: if eMode is not NOOP, walLockExclusive(WAL_CKPT_LOCK) is taken (L4427-L4428). The writer lock WAL_WRITE_LOCK is taken only inside `if( eMode!=SQLITE_CHECKPOINT_PASSIVE )` (L4443-L4444). For PASSIVE, walDisableBlocking is called and then walIndexReadHdr, and blocking is not re-enabled because eMode2 is not above PASSIVE (L4467-L4469). walCheckpoint is then called (L4481).
  - One condition the claim leaves out: the walCheckpoint call is made only if reading the header returned OK, the page size matches when mxFrame is non-zero, and eMode2 is not NOOP (L4476-L4482). For PASSIVE this holds in the normal case.
- verdict: supported · reason: Every named function, argument and lock appears at the cited lines in the 3.54.1 tag. The sqlite3PagerCheckpoint hop, which the claim marks as inferred, is confirmed by btree.c. Only the minor error-path precondition on the walCheckpoint call is left out.
- bar: met (not load-bearing; rung-1 code, fit direct) · independence: n/a (single project source, upstream self) · currency: tag version-3.54.1 as specified. The claim names that version, and no later version was checked.
- counter: not run (not marked main)
## Counter-evidence
none (counter-evidence ids: none)
## Leads
- none

# Verification: 20261023-1245-sqlite-wal · final-b5
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 9 · supported 9 · partial 0 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0

Pages saved in pages/final-b5/: S-r2-practice-config-01.txt (btree.c), -07.txt (pager.c), pragma-c.txt (pragma.c), -03.html/.txt (pragma.html), -04.html/.txt (howtocorrupt.html), -12.txt (fsync.2), S-r1-practice-config-06.html/.txt (Python sqlite3), -09.txt (go-sqlite3 sqlite3.go at dbbe931), -10.html/.txt (modernc pkg.go.dev), S-v5-01 (SQLite forum thread), S-v5-03 (lang_transaction.html), xnu-commit.json, mattn-head.json. All `--find`/`--check` runs on the researchers' passages returned `found`. Code excerpt hashes were not computed (no local clone, no pipelines); the cited line ranges were checked by content at the cited line numbers.

## Records

### V-C-r2-practice-config-01-1
- claim: C-r2-practice-config-01
- source S-r2-practice-config-01 · opened: https://raw.githubusercontent.com/sqlite/sqlite/57520227c95396ce39ba6ecaac8d475b78dd3964/src/btree.c (curl) · quote-match: exact · passages P1 (L3614-3618), P3 (L3770-3771), P6 (L2534-2538), P7 (L3835-3841) at the cited lines: found verbatim
- source S-r2-practice-config-07 (pager.c) · P1 at L6006-6011 (comment "The busy-handler is not invoked if another connection already holds the write-lock") found verbatim; used only as side evidence
- looked first: btree.c has four references to the busy handler: btreeInvokeBusyHandler (L2534-2538, forwards to the connection's db->busyHandler), the pager hookup at L2723 (sqlite3PagerSetBusyHandler, used for other lock acquisitions), and the single call in the btreeBeginTrans loop condition (L3770-3771). The comment above btreeBeginTrans (L3614-3626) states the rule and the deadlock reason.
- implied: (1) loop retries only while `(rc&0xFF)==SQLITE_BUSY` and `pBt->inTransaction==TRANS_NONE` and the handler returns nonzero, matches L3770-3771. (2) sqlite3BtreeBeginTrans enters btreeBeginTrans for `p->inTrans==TRANS_READ && wrflag!=0` (L3837-3841). (3) A connection with an open read transaction has inTransaction != TRANS_NONE (non-shared-cache), so the condition is false and BUSY is returned without a handler call; the comment (L3616-3618) says exactly this. (4) busy_timeout rests on the busy handler (S-r1-practice-config-07/P5, previously verified, not re-opened).
- verdict: supported · reason: every element (retry condition, TRANS_NONE test, upgrade path, handler call) is in the code at the cited lines. The claim is scoped to the begin-write path; the pager-level handler at L2723 serves other lock acquisitions and is outside the claim.
- bar: met (load-bearing descriptive, rung 1 code at a tagged commit, with the code comment as a second statement) · independence: n/a (single repository, descriptive claim) · currency: tag version-3.54.1 (2026-10-16) is the current release as read; no 3.54 note found changing busy handling
- counter: none-found ("SQLite busy_timeout not honored deferred transaction upgrade read to write SQLITE_BUSY immediately", "SQLite busy handler invoked write lock while holding read transaction WAL mode exceptions", "SQLite btreeBeginTrans busy handler change deadlock check-in forum", currency: "SQLite 3.54 release notes busy handler changed BEGIN CONCURRENT or write lock upgrade behavior"). Fetched lang_transaction.html (S-v5-03): "Subsequent write statements will upgrade the transaction to a write transaction if possible, or return SQLITE_BUSY", which agrees. Lateral read on the supporting source: the code is the project's own mirror (tag and sha confirmed by the researcher's API record); no lateral needed beyond that.

### V-C-r2-practice-config-14-1
- claim: C-r2-practice-config-14
- source S-r2-practice-config-03 · opened: https://sqlite.org/pragma.html (curl) · quote-match: exact · P1 (§ PRAGMA fullfsync), P2 and P3 (§ PRAGMA checkpoint_fullfsync): found verbatim
- source S-r2-practice-config-07 · opened: pager.c at 5752022 (curl) · P4 (L3693-3699), P5 (L3704-3705): found verbatim
- looked first: the pragma page has two entries on the subject (lines 190-191 and 274-275 of the text); pragma.c asserts `SQLITE_FullFSync==PAGER_FULLFSYNC` and `SQLITE_CkptFullFSync==PAGER_CKPT_FULLFSYNC` (pragma.c L245-246), which closes the gap the researcher left open about the pragma-to-flag link. os_unix.c's comment (S-r2-practice-config-08, not reopened) says F_FULLFSYNC is only on Mac OS X.
- implied: fullfsync = F_FULLFSYNC used for syncs (P1; code: syncFlags=SQLITE_SYNC_FULL, walSyncFlags=(syncFlags<<2), so every sync field is full); checkpoint_fullfsync = F_FULLFSYNC during checkpoints (P2; code ORs SQLITE_SYNC_FULL<<2 into walSyncFlags only); both default off (P1, P2); only Mac OS X supports it (P1, P2); fullfsync on makes checkpoint_fullfsync irrelevant (P3). Docs word the "only macOS" point as "Only Mac OS X supports F_FULLFSYNC".
- verdict: supported · reason: each clause is stated in the docs; the code agrees. "During checkpoint operations only" is the docs' scope for the checkpoint pragma ("for checkpoint operations"), a small inference.
- bar: met (load-bearing descriptive, rung 1 docs plus code) · independence: n/a · currency: current pragma page and 3.54.1 code agree; no change found
- counter: none-found ("SQLite PRAGMA fullfsync checkpoint_fullfsync macOS default off criticism not effective APFS", "F_FULLFSYNC supported platforms besides macOS iOS Linux Windows SQLite fullfsync", currency: "SQLite release notes fullfsync default changed macOS F_FULLFSYNC 2026"). Side findings, none conflicting with the claim: the 2022 SQLite forum thread (S-v5-01, rung 3) has Dan Kennedy saying the flag is used "if PRAGMA fullfsync or PRAGMA checkpoint_fullfsync is set" and an anonymous poster that it is "zero by default"; a search snippet says a vendor build (Apple's, 2012) may enable it by default, which concerns a platform build, not upstream SQLite, and that page was unreachable (connection failed), so it is not recorded. The claim should keep "SQLite's documented defaults", not "every SQLite build".

### V-C-r2-practice-config-17-1
- claim: C-r2-practice-config-17
- source S-r2-practice-config-12 · opened: https://raw.githubusercontent.com/apple-oss-distributions/xnu/e3723e1f17661b24996789d8afc084c0c3303b26/bsd/man/man2/fsync.2 (curl) · quote-match: exact · P1 (L58-62), P2 (L64-68), P3 (L70-72), P4 (L76-82): found verbatim (the file wraps lines; the converter matched them)
- looked first: the DESCRIPTION section (lines 50-85) says fsync moves modified data to "a permanent storage device", then the Note paragraph qualifies it, then F_FULLFSYNC is offered for "applications that require tighter guarantees".
- implied: fsync flushes from host to drive; the drive may not write for quite some time and may reorder; after drive power loss or OS crash only some or none of the data may be present; later writes may be present while earlier ones are not; "This is not a theoretical edge case"; "Applications, such as databases, that require a strict ordering of writes should use F_FULLFSYNC". All match. The commit e3723e1 has message "xnu-11417.101.15" (GitHub API, 2025-05-01).
- verdict: supported · reason: the claim paraphrases the page closely and the quoted phrases are verbatim. One looseness: the page says the drive "may not physically write the data to the platters", the claim says "permanent storage"; the page itself calls the drive the "permanent storage device" in the same paragraph, so this is acceptable.
- bar: met (load-bearing descriptive about Apple's own page, rung 1) · independence: n/a · currency: the GitHub commits API lists the last commit touching fsync.2 as xnu-3789.1.32 (2016), so the text has been unchanged since, and the cited snapshot is current
- counter: none-found ("macOS fsync F_FULLFSYNC SSD Apple silicon durability fsync sufficient or not, F_BARRIERFSYNC", "macOS fsync() man page out of date "not a theoretical edge case" APFS", currency: "macOS 26 fsync man page updated F_FULLFSYNC durability change Apple documentation"). No source says the page is wrong or superseded. The only caveats are about relevance, not truth: the page's wording ("platters") dates from the HFS era, and a 2022 forum discussion argues F_BARRIERFSYNC may be enough for ordering; neither contradicts what the page says.

### V-C-r1-practice-config-29-1
- claim: C-r1-practice-config-29
- source S-r1-practice-config-06 · opened: https://docs.python.org/3/library/sqlite3.html (curl) · quote-match: exact · P1 passage at § Module functions: found verbatim
- implied: signature line shows `timeout=5.0`; the parameter text reads "How many seconds the connection should wait before raising an OperationalError when a table is locked ... Default five seconds." Page title: Python 3.15.1 documentation.
- verdict: supported · reason: number, unit, exception and version all stated.
- bar: met (not load-bearing, rung 1) · independence: n/a · currency: page is the 3.15.1 docs as read
- counter: not run

### V-C-r1-practice-config-30-1
- claim: C-r1-practice-config-30
- source S-r1-practice-config-06 · same page · P2, P3, P4: found verbatim (P3 at the isolation_level entry, line 599; P4 at § Transaction control via the isolation_level attribute)
- implied: autocommit "currently defaults to LEGACY_TRANSACTION_CONTROL"; isolation_level default is "", "an alias for DEFERRED"; with isolation_level not None, implicit transactions open before execute()/executemany() run INSERT, UPDATE, DELETE or REPLACE, and "for other statements, no implicit transaction handling is performed". "Added in 3.12" for autocommit appears in the page (Changed in version 3.12: Added the autocommit parameter).
- verdict: supported · reason: all items present. The signature shows isolation_level='DEFERRED' while the attribute text says "", which the page itself states are aliases.
- bar: met (not load-bearing, rung 1) · independence: n/a · currency: 3.15.1 docs
- counter: not run

### V-C-r1-practice-config-31-1
- claim: C-r1-practice-config-31
- source S-r1-practice-config-06 · same page · P5 (§ Transaction control via the autocommit attribute) and P2: found verbatim
- implied: autocommit=False is "the recommended value" (attribute entry) and "suggested" in the explanation; a transaction is always open and connect(), commit() and rollback() open a new one; "sqlite3 uses BEGIN DEFERRED statements"; "The default will change to False in a future Python release".
- verdict: supported · reason: all stated; the future change is the docs' own statement, undated.
- bar: met (not load-bearing, rung 1; prediction attributed to the docs) · independence: n/a · currency: 3.15.1 docs
- counter: not run

### V-C-r1-practice-config-32-1
- claim: C-r1-practice-config-32
- source S-r1-practice-config-09 · opened: https://raw.githubusercontent.com/mattn/go-sqlite3/dbbe931904f2ee06546448fbe7cf7780f61bc110/sqlite3.go (curl) · quote-match: exact · P1 (L1376, L1380), P2 (L1446-1453), P3 (L1814), P4 (L1307): found
- implied: `txlock := "BEGIN"` (L1376) and stored on the connection (L1778, used at L1251 to start a transaction); `_txlock=immediate` sets "BEGIN IMMEDIATE" (L1449); `busyTimeout := 5000` (L1380); `_busy_timeout`/`_timeout` override it (L1488-1499); `PRAGMA busy_timeout = %d` executed unconditionally in Open (L1814). GitHub API: head of master is dbbe931904f2 dated 2026-09-28T00:37:57Z, still the head when checked.
- verdict: supported · reason: all clauses are in the code at that commit; unit (ms) follows from PRAGMA busy_timeout.
- bar: met (not load-bearing, rung 1 code) · independence: n/a · currency: commit is still master's head on 2026-10-23
- counter: not run

### V-C-r1-practice-config-33-1
- claim: C-r1-practice-config-33
- source S-r1-practice-config-10 · opened: https://pkg.go.dev/modernc.org/sqlite (curl) · quote-match: exact · P1 and P2 at § func (*Driver) Open: found verbatim
- looked first: searched the page text for "busy": hits at lines 534 (an error-string table entry), 986-987 (the shorthand DSN key text), 1205 (a file name busy.go). None gives a default timeout. (The researcher recorded three hits; there are four, same conclusion.)
- implied: Version v1.61.0 (page line 62); `_txlock` "deferred" (the default), "immediate" or "exclusive"; `_busy_timeout, _timeout -> PRAGMA busy_timeout (an integer)`; no default stated.
- verdict: supported · reason: positive statements are verbatim; the absence claim holds on this page, but the code was not read, so the driver may still have a default that the docs do not mention.
- bar: met (not load-bearing, rung 1) · independence: n/a · currency: v1.61.0 as read
- counter: not run

### V-C-r2-practice-config-21-1
- claim: C-r2-practice-config-21
- source S-r2-practice-config-04 · opened: https://sqlite.org/howtocorrupt.html (curl) · quote-match: exact · P8 at § 3.2. Disabling sync using PRAGMAs: found verbatim
- implied: "For maximum reliability and for robustness against database corruption, SQLite should always be run with its default synchronous setting of FULL." The preceding sentences discuss synchronous=OFF and no journal mode is named.
- verdict: supported · reason: the attributed form ("the page says") matches the quote exactly; the chapter must keep the attribution and the recorded conflict with pragma.html's NORMAL-in-WAL advice.
- bar: met (not load-bearing, rung 1 attributed, vendor-about-itself) · independence: n/a · currency: current docs
- counter: not run

## Counter-evidence
none-found for C-r2-practice-config-01, -14 and -17 (queries listed in each record). No `S-v5-*` counter-source or `C-v5-*` claim recorded.

## Leads
- https://sqlite.org/forum/info/b94afa45dda82aae8cbf49f9d511a00b332870fc926cba18954acd889bbfb7cd (saved as S-v5-01, rung 3 forum) — a SQLite developer confirms the code uses F_FULLFSYNC under the two pragmas; Simon Slavin reports that without it his (pre-2022, non-WAL) power-loss tests lost the most recent transaction but found no corruption; a pointer for a later "what fullfsync buys you" section, not support.
- https://www.sqlite.org/lang_transaction.html (saved as S-v5-03, rung 1) — states that a write statement in a read transaction "will fail with SQLITE_BUSY" if another connection has modified or is modifying the database; usable as a second rung-1 statement for the upgrade behaviour of C-r2-practice-config-01.
- https://lists.buildbot.net/pipermail/commits/2012-March/010207.html — a snippet claimed Apple's OS X Lion SQLite enabled checkpoint_fullfsync by default; the host was unreachable (connection failed), so unchecked; relevant only to vendor builds.

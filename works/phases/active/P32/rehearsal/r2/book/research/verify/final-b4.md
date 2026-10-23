# Verification: 20261023-1245-sqlite-wal · final-b4
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 12 · supported 11 · partial 1 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0

All pages were opened fresh by the verifier (curl, then pagetext.py) and saved in `pages/final-b4/` under the source ids; `--find` returned "found" for every cited passage. Code for C-r2-practice-config-06 was read from the raw GitHub file at commit 57520227c953 (no local clone; check by content, no excerpt hash).

## Records

### V-C-r1-practice-config-03-1
- claim: C-r1-practice-config-03
- source S-r1-practice-config-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at P3 § "3.3. Persistence of WAL mode": found verbatim
- source S-r1-practice-config-02 · opened: https://sqlite.org/pragma.html (curl) · quote-match: exact · passage at P2 § "PRAGMA journal_mode" (pagetext heading "List Of PRAGMAs"): found verbatim
- looked first: wal.html §3.3 says WAL "is persistent", the database "will come back in WAL mode" after close and reopen, and contrasts journal_mode=TRUNCATE, which "will come back up in the default rollback mode of DELETE". It adds that WAL set on one connection is set on all connections to the same file. pragma.html says WAL "stays in effect across multiple database connections and after closing and reopening".
- implied: persistent across close/reopen: stated. Stays in effect across connections: stated (pragma.html P2). TRUNCATE reverts to DELETE on reopen: stated (wal.html §3.3 sentence after P3). "Unlike the other journal modes": stated. "Stored with the database": not stated in these words; a direct inference from persistence (wal.html §10 also says the file-format version bytes change in WAL mode).
- verdict: supported · reason: every element is stated in the two pages; "stored with the database" is the plain reading of persistence across reopen.
- bar: met (descriptive, load-bearing; rung 1 official docs, two pages, same owner so one source for independence) · independence: n/a (one rung-1 source suffices for a descriptive claim) · currency: wal.html last updated 2026-08-25; no later change found.
- counter: none-found ("SQLite journal_mode WAL not persistent read-only database limitations", "SQLite 2026 release notes synchronous WAL default changed"). The first search returned only read-only-media and shm-file permission issues, which concern opening a WAL database rather than whether the mode persists; no source contradicts persistence.

### V-C-r1-practice-config-09-1
- claim: C-r1-practice-config-09
- source S-r1-practice-config-02 · opened: https://sqlite.org/pragma.html (curl) · quote-match: exact · passage at P6 § "PRAGMA synchronous": found verbatim
- source S-r1-practice-config-05 · opened: https://sqlite.org/compile.html (curl) · quote-match: exact · passage at P1 § "Recommended Compile-time Options": found verbatim
- source S-r1-practice-config-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at P9 § "2.3. Performance Considerations": found verbatim
- looked first: pragma.html on NORMAL: "WAL mode is safe from corruption with synchronous=NORMAL ... WAL mode is always consistent with synchronous=NORMAL, but WAL mode does lose durability. A transaction committed in WAL mode with synchronous=NORMAL might roll back following a power loss or system crash." The matrix marks WAL+NORMAL "Maybe not durable". compile.html: "recent changes to the database might be rolled back by a power loss, but the database will not be corrupted". wal.html: "transactions are no longer durable and might rollback following a power failure or hard reset".
- implied: consistent and safe from corruption: stated. Loses durability: stated. Committed transaction might roll back after power loss or OS crash: stated. "The last commits are lost, the file is not corrupted": compile.html "recent changes ... rolled back ... not corrupted".
- verdict: supported · reason: all parts stated by three pages of one owner. The statement is the SQLite project's own claim about itself (attribute it as such if the chapter wants to hedge).
- bar: met for a descriptive claim at rung 1 (project documentation of its own behaviour) · independence: all three pages are the SQLite project, so one source; no independent rung-2 source checked. · currency: pragma page undated; wal.html updated 2026-08-25. wal.html §11 records a separate WAL-reset corruption bug in 3.7.0 through 3.51.2 (fixed in 3.51.3), unrelated to the synchronous setting (see S-v4-02, C-v4-02).
- counter: S-v4-02 (C-v4-02); also none-found ("SQLite WAL synchronous=NORMAL power loss corruption evidence"). That search turned up only an old SQLite ticket (WAL corruption in 3.7.9, said to be fixed; the ticket page itself would not load without login, so unverified) and a blog, both rung 3 (Leads).

### V-C-r1-practice-config-13-1
- claim: C-r1-practice-config-13
- source S-r1-practice-config-02 · opened: https://sqlite.org/pragma.html (curl) · quote-match: exact · passage at P7 § "PRAGMA synchronous": found verbatim
- source S-r1-practice-config-05 · opened: https://sqlite.org/compile.html (curl) · quote-match: exact · passage at P1 § "Recommended Compile-time Options": found verbatim
- looked first: pragma.html: "The synchronous=NORMAL setting provides the best balance between performance and safety for most applications running in WAL mode. You lose durability across power lose with synchronous NORMAL in WAL mode, but that is not important for most applications." compile.html: "transaction commit is much faster in WAL mode using synchronous=NORMAL than with the default synchronous=FULL. For these reasons, it is recommended that the synchronous setting be changed from FULL to NORMAL when switching to WAL mode."
- implied: docs recommend NORMAL for most WAL applications: stated. "Best balance": stated. Durability loss across power loss unimportant for most applications: stated. Compile-options page recommends FULL to NORMAL on switching to WAL because commits are much faster and integrity is guaranteed: stated ("complete database integrity is guaranteed").
- verdict: supported · reason: the claim is written in attributed form ("The SQLite documentation recommends ...") and each element is stated. The evaluation itself ("best balance") is the vendor's view; the chapter must keep the attribution.
- bar: met for the attributed form only (rung 1 supports "the vendor says X"). Below the bar for the same evaluation in the chapter's own voice (needs two independent rung-2 sources; none opened). · independence: both pages are the SQLite project, so one source. · currency: current docs, no change found.
- counter: none-found ("SQLite synchronous NORMAL WAL recommendation criticism durability lost commits", "SQLite 2026 release notes synchronous WAL default changed"). Critics (agwa.name blog, a msgvault issue) argue the durability docs are unclear or prefer FULL; both rung 3 and none dispute that the docs say this (Leads).

### V-C-r1-practice-config-24-1
- claim: C-r1-practice-config-24
- source S-r1-practice-config-04 · opened: https://sqlite.org/lang_transaction.html (curl) · quote-match: exact · passage at P4 § "2.2. DEFERRED, IMMEDIATE, and EXCLUSIVE transactions": found verbatim
- source S-r1-practice-config-03 · opened: https://sqlite.org/rescode.html (curl) · quote-match: exact · passage at P2 § "(5) SQLITE_BUSY": found verbatim
- looked first: lang_transaction.html on IMMEDIATE: "IMMEDIATE causes the database connection to start a new write immediately, without waiting for a write statement. The BEGIN IMMEDIATE might fail with SQLITE_BUSY if another write transaction is already active on another database connection." rescode.html: BUSY "can occur at any point in a transaction"; BEGIN IMMEDIATE "might itself return SQLITE_BUSY, but if it succeeds, then SQLite guarantees that no subsequent operations on the same database through the next COMMIT will return SQLITE_BUSY." The same lang_transaction page §2.3 also says a COMMIT "might also result in an SQLITE_BUSY return code if another thread or process has an open read connection" (no journal mode given).
- implied: starts a write transaction at once: stated. Can itself fail with SQLITE_BUSY when another connection's write transaction is active: stated. Once it succeeds, no later operation through the next COMMIT returns BUSY: stated by rescode. Docs advise it to avoid BUSY mid-transaction: stated ("the application can use BEGIN IMMEDIATE instead of just BEGIN").
- verdict: supported · reason: all parts are stated, with the guarantee attributed to the docs. Caveat for scope: the "through the next COMMIT" guarantee sits beside lang_transaction §2.3, which says COMMIT can still get SQLITE_BUSY while a reader is active. That is plausible only outside WAL mode, but neither page says so. The chapter should say "the docs guarantee" and not extend it to commit in rollback modes without a source.
- bar: met (descriptive, rung 1 official docs, two pages, one owner) · independence: one source (SQLite project) · currency: lang_transaction.html last updated 2026-02-18; rescode current as of access.
- counter: S-v4-01 (C-v4-01); also none-found ("SQLite BEGIN IMMEDIATE still returns SQLITE_BUSY after begin WAL mode"). That search returned a SQLite forum thread (sqlite.org/forum/forumpost/04ed1d235b) whose users' tests agree: a second BEGIN IMMEDIATE gets "database is locked (5)" in WAL mode, and a deferred upgrade fails at once without honouring busy_timeout. Rung 3, so a lead only.

### V-C-r1-practice-config-12-1
- claim: C-r1-practice-config-12
- source S-r1-practice-config-02 · opened: https://sqlite.org/pragma.html (curl) · quote-match: exact · passage at P9 § "PRAGMA synchronous": found verbatim
- implied: "EXTRA is no different from FULL in WAL mode." is stated. The EXTRA paragraph says its extra step is that "the directory containing a rollback journal is synced after that journal is unlinked to commit a transaction in DELETE mode", which matches the parenthesis.
- verdict: supported · reason: both the equivalence and the DELETE-mode-only reason are stated on the page.
- bar: met (not load-bearing; one rung-1 source) · independence: n/a · currency: current docs.
- counter: not run

### V-C-r1-practice-config-14-1
- claim: C-r1-practice-config-14
- source S-r1-practice-config-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at P8 § "2.3. Performance Considerations": found verbatim
- source S-r1-practice-config-01 · passage at P9 § "2.3. Performance Considerations": found verbatim
- implied: wal.html: "with PRAGMA synchronous set to NORMAL, the checkpoint is the only operation to issue an I/O barrier or sync operation (fsync() on unix or FlushFileBuffers() on windows). If an application therefore runs checkpoint in a separate thread or process, the main thread or process that is doing database queries and updates will never block on a sync operation." Then "The downside ... transactions are no longer durable and might rollback following a power failure or hard reset." Every item is stated, including both syscalls.
- verdict: supported · reason: the claim restates the paragraph; "query thread" is the page's "main thread or process doing queries and updates".
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: wal.html updated 2026-08-25.
- counter: not run

### V-C-r1-practice-config-15-1
- claim: C-r1-practice-config-15
- source S-r1-practice-config-05 · opened: https://sqlite.org/compile.html (curl) · quote-match: exact · passage at P2 § "Options To Set Default Parameter Values" (pagetext heading "4. Options To Set Default Parameter Values"): found verbatim
- source S-r1-practice-config-02 · opened: https://sqlite.org/pragma.html (curl) · quote-match: exact · passage at P5: found verbatim
- implied: "If not overridden at compile-time, the default setting is 2 (FULL)." for SQLITE_DEFAULT_SYNCHRONOUS: stated. pragma.html: "FULL is the default synchronous mode for a rollback journal" (partial support only).
- verdict: supported · reason: the compile-options page states the default and its override directly. Note that compile.html's recommended option SQLITE_DEFAULT_WAL_SYNCHRONOUS=1 (and the C-16 mechanism) means WAL databases may start at NORMAL in builds that set it; the claim does not cover that case.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: current docs.
- counter: not run

### V-C-r1-practice-config-16-1
- claim: C-r1-practice-config-16
- source S-r1-practice-config-05 · opened: https://sqlite.org/compile.html (curl) · quote-match: exact · passage at P3 and P4 § "Options To Set Default Parameter Values": found verbatim (both)
- implied: P3: WAL-specific default; if not overridden it equals SQLITE_DEFAULT_SYNCHRONOUS. P4: if the two differ, and the application has not set PRAGMA synchronous for the file, the setting changes to the WAL value "when the database connection switches into WAL mode for the first time"; if not overridden "no automatic synchronous setting changes will ever occur" (line following P4). All items are stated. The claim says "the connection first switches", matching "for the first time".
- verdict: supported · reason: direct match.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: current docs.
- counter: not run

### V-C-r1-practice-config-25-1
- claim: C-r1-practice-config-25
- source S-r1-practice-config-04 · opened: https://sqlite.org/lang_transaction.html (curl) · quote-match: exact · passage at P5 § "2.2. DEFERRED, IMMEDIATE, and EXCLUSIVE transactions": found verbatim
- implied: "EXCLUSIVE and IMMEDIATE are the same in WAL mode, but in other journaling modes, EXCLUSIVE prevents other database connections from reading the database while the transaction is underway."
- verdict: supported · reason: direct match.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: last updated 2026-02-18.
- counter: not run

### V-C-r1-practice-config-28-1
- claim: C-r1-practice-config-28
- source S-r1-practice-config-03 · opened: https://sqlite.org/rescode.html (curl) · quote-match: exact · passage at P2 and P6 § "(5) SQLITE_BUSY": found verbatim (both)
- implied: P2: BUSY "can occur at any point in a transaction: when the transaction is first started, during any write or update operations, or when the transaction commits." P6: BUSY "indicates a conflict with a separate database connection, probably in a separate process, whereas SQLITE_LOCKED indicates a conflict within the same database connection (or sometimes a database connection with a shared cache)."
- verdict: supported · reason: all parts stated. "Usually" paraphrases "probably". The claim leaves out the page's shared-cache qualifier on SQLITE_LOCKED; the claim stays true without it, but a chapter sentence about shared cache needs that qualifier.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: current docs.
- counter: not run

### V-C-r2-practice-config-06-1
- claim: C-r2-practice-config-06
- source S-r2-practice-config-01 · opened: https://raw.githubusercontent.com/sqlite/sqlite/57520227c95396ce39ba6ecaac8d475b78dd3964/src/btree.c (curl, plain text) · quote-match: exact · passage at P4 (L3750-L3754) and P3 (L3770-L3771): found verbatim, line numbers match
- looked first: I read btreeBeginTrans end to end (L3628-L3834). The write path calls sqlite3PagerBegin; if it returns SQLITE_BUSY_SNAPSHOT and `pBt->inTransaction==TRANS_NONE`, the code sets rc to SQLITE_BUSY. The do-while condition is `(rc&0xFF)==SQLITE_BUSY && pBt->inTransaction==TRANS_NONE && btreeInvokeBusyHandler(pBt)`, so the busy handler is invoked and the loop retries. I also searched the same commit: SQLITE_BUSY_SNAPSHOT is set in one place in wal.c (L3822), inside the WAL-header-changed check in sqlite3WalBeginWriteTransaction, and btree.c has no other reference to it.
- implied: no-transaction case turns BUSY_SNAPSHOT into BUSY and then calls the busy handler: stated by the code. With a read transaction already open, `inTransaction` is not TRANS_NONE, so no conversion and no handler call, and BUSY_SNAPSHOT is returned: follows from the same condition. The parenthetical race (another connection committed between the snapshot and the write-lock attempt) comes from the wal.c comment, not from the cited btree.c lines. Not supported in the cited lines: the test is on `pBt->inTransaction`, the shared b-tree's state, not on the connection's own state. With shared cache enabled, another connection's open transaction on the same shared b-tree changes the outcome. "Reaches the application only when" is a universal claim; I found no other source of the code, but the claim cites no search of the whole tree, and callers outside btree.c were not read.
- verdict: partial · reason: the first sentence is supported for the ordinary case (no shared cache). The "therefore ... only" sentence is an inference from one function and ignores that the test is on the shared b-tree state. · narrower claim: "In SQLite 3.54.1 (without shared cache), when no transaction is open on the database and sqlite3PagerBegin returns SQLITE_BUSY_SNAPSHOT, btreeBeginTrans changes it to SQLITE_BUSY, and its retry loop then invokes the busy handler; when a read transaction is already open, the code does not convert it and does not invoke the busy handler, so the BUSY_SNAPSHOT code is returned."
- bar: met for the narrower claim (rung 1 source code at a commit, behaviour) · independence: n/a · currency: tag version-3.54.1, commit dated 2026-10-16; later versions not checked. No excerpt hash was computed (no local clone); checked by content.
- counter: not run

### V-C-r2-practice-config-07-1
- claim: C-r2-practice-config-07
- source S-r2-practice-config-06 · opened: https://sqlite.org/c3ref/busy_timeout.html (curl) · quote-match: exact · passage at P1 § "Set A Busy Timeout": found verbatim
- implied: "This routine sets a busy handler that sleeps for a specified amount of time when a table is locked. The handler will sleep multiple times until at least "ms" milliseconds of sleeping have accumulated. After at least "ms" milliseconds of sleeping, the handler returns 0 which causes sqlite3_step() to return SQLITE_BUSY." Matches. The "(and PRAGMA busy_timeout)" parenthetical is not on this page ("See also: PRAGMA busy_timeout"); pragma.html (S-r1-practice-config-02, which I opened) says the pragma "is an alternative to the sqlite3_busy_timeout() C-language interface" and busy_handler.html is cited elsewhere as implementing both. That is a direct inference.
- verdict: supported · reason: the stated behaviour matches; the pragma equivalence rests on pragma.html, not on the cited page.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: current docs.
- counter: not run

## Counter-evidence

### S-v4-01
- url: https://sqlite.org/lang_transaction.html · canonical: sqlite.org/lang_transaction.html
- title: Transaction · authors: n/a · publisher: SQLite (sqlite.org)
- date: last updated 2026-02-18 11:56:50Z · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official documentation of the SQLite library; the same page as S-r1-practice-config-04.
- passages:
  - P1 · § "2.3. Implicit versus explicit transactions": "An attempt to execute COMMIT might also result in an SQLITE_BUSY return code if another thread or process has an open read connection. When COMMIT fails in this way, the transaction remains active and the COMMIT can be retried later after the reader has had a chance to clear."

### C-v4-01
- claim: The SQLite transaction documentation says a COMMIT can return SQLITE_BUSY when another thread or process has an open read connection, without naming the journal mode.
- kind: behaviour
- questions: Q20 · load-bearing: no (a scope caveat for C-r1-practice-config-24)
- support: S-v4-01/P1 · rung 1 · fit partial · upstream self
- scope: current docs; the page gives no journal mode. Read against the rescode guarantee quoted in C-r1-practice-config-24 ("no subsequent operations ... through the next COMMIT will return SQLITE_BUSY"), it is a scope tension, probably rollback modes only; the pages do not say.
- confidence: medium · flags: none
- conflicts: S-r1-practice-config-03/P2 "SQLite guarantees that no subsequent operations on the same database through the next COMMIT will return SQLITE_BUSY"

### S-v4-02
- url: https://sqlite.org/wal.html · canonical: sqlite.org/wal.html
- title: Write-Ahead Logging · authors: n/a · publisher: SQLite (sqlite.org)
- date: last updated 2026-08-25 19:42:39Z · version: current docs (covers through 3.51.3)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official documentation; the same page as S-r1-practice-config-01. §11 was not among the researcher's passages.
- passages:
  - P1 · § "11. The WAL-Reset Bug": "The bug is likely present in all version of SQLite from 3.7.0 (2010-07-21) through 3.51.2 (2026-01-09). It is fixed in version 3.51.3 (2026-03-13) and later."
  - P2 · § "11. The WAL-Reset Bug": "The bug only affects databases in WAL mode when there are two or more database connections open on the same file, in separate threads or processes, and when those two connections attempt to write or checkpoint at the same instant."

### C-v4-02
- claim: According to the SQLite WAL documentation (page updated 2026-08-25), a "WAL-reset bug" could in rare cases corrupt a WAL-mode database in SQLite versions from 3.7.0 through 3.51.2 and is fixed in 3.51.3, when two or more connections on the same file write or checkpoint at the same instant.
- kind: behaviour
- questions: Q17 · load-bearing: no (a currency caveat to "WAL mode is safe from corruption with synchronous=NORMAL")
- support: S-v4-02/P1 · rung 1 · fit direct · upstream self
- support: S-v4-02/P2 · rung 1 · fit direct · upstream self
- scope: unrelated to the synchronous setting; it limits any unqualified "WAL cannot corrupt" statement for versions up to 3.51.2. The same page calls it rare and says it is "unlikely to occur in common use".
- confidence: high · flags: none
- conflicts: S-r1-practice-config-02/P6 "WAL mode is safe from corruption with synchronous=NORMAL" (different scope: the pragma statement is about power loss and the sync setting)

## Leads
- https://sqlite.org/forum/forumpost/04ed1d235b — SQLite forum thread (rung 3) in which users reproduce that, in WAL mode, a deferred transaction's upgrade gets SQLITE_BUSY at once without honouring busy_timeout, and that a second BEGIN IMMEDIATE gets "database is locked (5)"; useful as a pointer for a worked example.
- https://www.agwa.name/blog/post/sqlite_durability — blog (rung 3) arguing the SQLite durability documentation is unclear; critique of how the docs read, not of the stated behaviour.
- https://upd.dev/wesm/msgvault/issues/289 — project issue (rung 3) proposing FULL over NORMAL for durability; shows a practitioner disagreement with the docs' recommendation.
- https://www.sqlite.org/src/tktview/ff5be73dee — SQLite ticket cited by search (WAL corruption found in 3.7.9, said to be fixed); the page needs a login, so unverified.

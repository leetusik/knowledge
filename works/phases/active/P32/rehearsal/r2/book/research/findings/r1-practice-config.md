# Findings: 20261023-1245-sqlite-wal · round 1 · angle practice-config
- researcher: claude-opus-5-5 · status: complete · tool calls: 38

## Questions
- Q16: answered — claims: C-r1-practice-config-01, -02, -03, -04, -05, -06 — note: all from sqlite.org wal.html and pragma.html (rung 1).
- Q17: answered — claims: C-r1-practice-config-07, -08, -09, -10, -11, -12, -13, -14 — note: per-setting sync points and the WAL durability matrix are on pragma.html; the "NORMAL is enough" recommendation is SQLite's own, attributed only.
- Q18: answered — claims: C-r1-practice-config-15, -16 — note: default FULL; SQLITE_DEFAULT_WAL_SYNCHRONOUS lets a build switch the WAL default.
- Q19: answered — claims: C-r1-practice-config-17, -18, -19, -20, -21, -22, -27 — note: wal.html section 9 lists three obscure cases; rescode.html defines BUSY_RECOVERY and BUSY_SNAPSHOT.
- Q20: answered (mechanism partly thin) — claims: C-r1-practice-config-22, -23, -24, -25, -26, -27, -28 — note: the docs say the upgrade fails with SQLITE_BUSY and that SQLite skips the busy handler when waiting could deadlock, but the busy_handler page explains this with rollback-journal lock names (read/reserved/exclusive); no sqlite.org passage was found that states, for WAL specifically, that the busy handler is not invoked on SQLITE_BUSY_SNAPSHOT. Not searched further (budget).
- Q21: answered for documented defaults; thin for "which defaults cause SQLITE_BUSY" — claims: C-r1-practice-config-29, -30, -31, -32, -33 — note: no source opened says which driver default causes SQLITE_BUSY; that link is inference from C-23 plus these defaults, and is left unclaimed. modernc.org/sqlite's default busy timeout is not stated in its docs.

## Sources

### S-r1-practice-config-01
- url: https://sqlite.org/wal.html · canonical: sqlite.org/wal.html
- title: Write-Ahead Logging · authors: n/a · publisher: SQLite (sqlite.org)
- date: last updated 2026-08-25 19:42:39Z · version: current docs (covers through 3.51.3)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project (Hipp, Wyrick & Company) · upstream: none
- lateral: official documentation of the SQLite library, written by its developers.
- passages:
  - P1 · § "3. Activating And Configuring WAL Mode": "An SQLite database connection defaults to journal_mode=DELETE. To convert to WAL mode, use the following pragma:"
  - P2 · § "3. Activating And Configuring WAL Mode": "On success, the pragma will return the string … If the conversion to WAL could not be completed (for example, if the VFS does not support the necessary shared-memory primitives) then the journaling mode will be unchanged and the string returned from the primitive will be the prior journaling mode"
  - P3 · § "3.3. Persistence of WAL mode": "Unlike the other journaling modes, PRAGMA journal_mode=WAL is persistent. If a process sets WAL mode, then closes and reopens the database, the database will come back in WAL mode."
  - P4 · § "3.3. Persistence of WAL mode": "The WAL journal mode will be set on all connections to the same database file if it is set on any one connection."
  - P5 · § "8. Use of WAL Without Shared-Memory": "If the VFS does not support shared-memory methods, then the attempt to open a database that is already in WAL mode, or the attempt to convert a database into WAL mode, will fail."
  - P6 · § "10. Backwards Compatibility": "Deliberately changing out of WAL mode changes the database file format version numbers back to 1 so that older versions of SQLite can once again access the database file."
  - P7 · § "2.3. Performance Considerations": "Writers sync the WAL on every transaction commit if PRAGMA synchronous is set to FULL but omit this sync if PRAGMA synchronous is set to NORMAL."
  - P8 · § "2.3. Performance Considerations": "Note that with PRAGMA synchronous set to NORMAL, the checkpoint is the only operation to issue an I/O barrier or sync operation (fsync() on unix or FlushFileBuffers() on windows)."
  - P9 · § "2.3. Performance Considerations": "The downside to this configuration is that transactions are no longer durable and might rollback following a power failure or hard reset."
  - P10 · § "9. Sometimes Queries Return SQLITE_BUSY In WAL Mode": "But there are some obscure cases where a query against a WAL-mode database can return SQLITE_BUSY, so applications should be prepared for that happenstance."
  - P11 · § "9. Sometimes Queries Return SQLITE_BUSY In WAL Mode": "If another database connection has the database mode open in exclusive locking mode then all queries against the database will return SQLITE_BUSY."
  - P12 · § "9. Sometimes Queries Return SQLITE_BUSY In WAL Mode": "When the last connection to a particular database is closing, that connection will acquire an exclusive lock for a short time while it cleans up the WAL and shared-memory files. If a separate attempt is made to open and query the database while the first connection is still in the middle of its cleanup process, the second connection might get an SQLITE_BUSY error."
  - P13 · § "9. Sometimes Queries Return SQLITE_BUSY In WAL Mode": "If the last connection to a database crashed, then the first new connection to open the database will start a recovery process. An exclusive lock is held during recovery. So if a third database connection tries to jump in and query while the second connection is running recovery, the third connection will get an SQLITE_BUSY error."
  - P14 · § "2.2. Concurrency": "However, since there is only one WAL file, there can only be one writer at a time."

### S-r1-practice-config-02
- url: https://sqlite.org/pragma.html · canonical: sqlite.org/pragma.html
- title: Pragma statements supported by SQLite · authors: n/a · publisher: SQLite (sqlite.org)
- date: current as of access (last-updated line not recorded) · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official documentation of the SQLite library.
- passages:
  - P1 · § "PRAGMA journal_mode": "If the journal mode could not be changed, the original journal mode is returned."
  - P2 · § "PRAGMA journal_mode": "The WAL journaling mode is persistent; after being set it stays in effect across multiple database connections and after closing and reopening the database."
  - P3 · § "PRAGMA journal_mode": "Note also that the journal_mode cannot be changed while a transaction is active."
  - P4 · § "PRAGMA journal_mode": "Note that the journal_mode for an in-memory database is either MEMORY or OFF and can not be changed to a different value."
  - P5 · § "PRAGMA synchronous": "FULL is the default synchronous mode for a rollback journal. FULL is atomic, consistent, isolated, and durable (ACID) in WAL mode and is atomic, consistent, and isolated with a rollback journal."
  - P6 · § "PRAGMA synchronous": "WAL mode is safe from corruption with synchronous=NORMAL, and probably DELETE mode is safe too on modern filesystems. WAL mode is always consistent with synchronous=NORMAL, but WAL mode does lose durability. A transaction committed in WAL mode with synchronous=NORMAL might roll back following a power loss or system crash. Transactions are durable across application crashes regardless of the synchronous setting or journal mode."
  - P7 · § "PRAGMA synchronous": "The synchronous=NORMAL setting provides the best balance between performance and safety for most applications running in WAL mode. You lose durability across power lose with synchronous NORMAL in WAL mode, but that is not important for most applications."
  - P8 · § "PRAGMA synchronous": "With synchronous OFF (0), SQLite continues without syncing as soon as it has handed data off to the operating system. If the application running SQLite crashes, the data will be safe, but the database might become corrupted if the operating system crashes or the computer loses power before that data has been written to non-volatile storage."
  - P9 · § "PRAGMA synchronous": "EXTRA is no different from FULL in WAL mode."
  - P10 · § "PRAGMA synchronous": "In WAL mode when synchronous is NORMAL (1), the WAL file is synchronized before each checkpoint and the database file is synchronized after each completed checkpoint and the WAL file header is synchronized when a WAL file begins to be reused after a checkpoint, but no sync operations occur during most transactions. With synchronous=FULL in WAL mode, an additional sync operation of the WAL file happens after each transaction commit."
  - P11 · § "PRAGMA synchronous" (matrix): "Here is the matrix: … Rollback Mode … WAL Mode … NORMAL … Maybe not consistent … Maybe not durable … OFF … Not consistent … Not consistent"
  - P12 · § "PRAGMA busy_timeout": "Each database connection can only have a single busy handler. This PRAGMA sets the busy handler for the process, possibly overwriting any previously set busy handler."
  - P13 · § "PRAGMA synchronous": "When synchronous is FULL (2), the SQLite database engine will use the xSync method of the VFS to ensure that all content is safely written to the disk surface prior to continuing."

### S-r1-practice-config-03
- url: https://sqlite.org/rescode.html · canonical: sqlite.org/rescode.html
- title: Result and Error Codes · authors: n/a · publisher: SQLite (sqlite.org)
- date: current as of access · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official documentation of the SQLite library.
- passages:
  - P1 · § "(5) SQLITE_BUSY": "For example, if process A is in the middle of a large write transaction and at the same time process B attempts to start a new write transaction, process B will get back an SQLITE_BUSY result because SQLite only supports one writer at a time."
  - P2 · § "(5) SQLITE_BUSY": "An SQLITE_BUSY error can occur at any point in a transaction: when the transaction is first started, during any write or update operations, or when the transaction commits. To avoid encountering SQLITE_BUSY errors in the middle of a transaction, the application can use BEGIN IMMEDIATE instead of just BEGIN to start a transaction. The BEGIN IMMEDIATE command might itself return SQLITE_BUSY, but if it succeeds, then SQLite guarantees that no subsequent operations on the same database through the next COMMIT will return SQLITE_BUSY."
  - P3 · § "(261) SQLITE_BUSY_RECOVERY": "The SQLITE_BUSY_RECOVERY error code is an extended error code for SQLITE_BUSY that indicates that an operation could not continue because another process is busy recovering a WAL mode database file following a crash. The SQLITE_BUSY_RECOVERY error code only occurs on WAL mode databases."
  - P4 · § "(517) SQLITE_BUSY_SNAPSHOT": "The SQLITE_BUSY_SNAPSHOT error code is an extended error code for SQLITE_BUSY that occurs on WAL mode databases when a database connection tries to promote a read transaction into a write transaction but finds that another database connection has already written to the database and thus invalidated prior reads."
  - P5 · § "(517) SQLITE_BUSY_SNAPSHOT": "Process A starts a read transaction on the database and does one or more SELECT statements. Process A keeps the transaction open. … Process B updates the database, changing values previous read by process A. … Process A now tries to write to the database. But process A's view of the database content is now obsolete because process B has modified the database file after process A read from it. Hence process A gets an SQLITE_BUSY_SNAPSHOT error."
  - P6 · § "(5) SQLITE_BUSY": "The SQLITE_BUSY result code differs from SQLITE_LOCKED in that SQLITE_BUSY indicates a conflict with a separate database connection, probably in a separate process, whereas SQLITE_LOCKED indicates a conflict within the same database connection (or sometimes a database connection with a shared cache)."

### S-r1-practice-config-04
- url: https://sqlite.org/lang_transaction.html · canonical: sqlite.org/lang_transaction.html
- title: Transaction · authors: n/a · publisher: SQLite (sqlite.org)
- date: last updated 2026-02-18 11:56:50Z · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official documentation of the SQLite library.
- passages:
  - P1 · § "2.1. Read transactions versus write transactions": "If a write statement occurs while a read transaction is active, then the read transaction is upgraded to a write transaction if possible. If some other database connection has already modified the database or is already in the process of modifying the database, then upgrading to a write transaction is not possible and the write statement will fail with SQLITE_BUSY."
  - P2 · § "2.2. DEFERRED, IMMEDIATE, and EXCLUSIVE transactions": "Transactions can be DEFERRED, IMMEDIATE, or EXCLUSIVE. The default transaction behavior is DEFERRED."
  - P3 · § "2.2. DEFERRED, IMMEDIATE, and EXCLUSIVE transactions": "If the first statement after BEGIN DEFERRED is a SELECT, then a read transaction is started. Subsequent write statements will upgrade the transaction to a write transaction if possible, or return SQLITE_BUSY. If the first statement after BEGIN DEFERRED is a write statement, then a write transaction is started."
  - P4 · § "2.2. DEFERRED, IMMEDIATE, and EXCLUSIVE transactions": "IMMEDIATE causes the database connection to start a new write immediately, without waiting for a write statement. The BEGIN IMMEDIATE might fail with SQLITE_BUSY if another write transaction is already active on another database connection."
  - P5 · § "2.2. DEFERRED, IMMEDIATE, and EXCLUSIVE transactions": "EXCLUSIVE and IMMEDIATE are the same in WAL mode, but in other journaling modes, EXCLUSIVE prevents other database connections from reading the database while the transaction is underway."
  - P6 · § "2.1. Read transactions versus write transactions": "While its read transaction is active, X will continue to see an historic snapshot of the database prior to the changes implemented by Y."

### S-r1-practice-config-05
- url: https://sqlite.org/compile.html · canonical: sqlite.org/compile.html
- title: Compile-time Options · authors: n/a · publisher: SQLite (sqlite.org)
- date: current as of access · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official documentation of the SQLite library.
- passages:
  - P1 · § "Recommended Compile-time Options" (entry SQLITE_DEFAULT_WAL_SYNCHRONOUS=1): "However, in WAL mode, complete database integrity is guaranteed with PRAGMA synchronous=NORMAL. With PRAGMA synchronous=NORMAL in WAL mode, recent changes to the database might be rolled back by a power loss, but the database will not be corrupted. Furthermore, transaction commit is much faster in WAL mode using synchronous=NORMAL than with the default synchronous=FULL. For these reasons, it is recommended that the synchronous setting be changed from FULL to NORMAL when switching to WAL mode."
  - P2 · § "Options To Set Default Parameter Values" (SQLITE_DEFAULT_SYNCHRONOUS): "This macro determines the default value of the PRAGMA synchronous setting. If not overridden at compile-time, the default setting is 2 (FULL)."
  - P3 · § "Options To Set Default Parameter Values" (SQLITE_DEFAULT_WAL_SYNCHRONOUS): "This macro determines the default value of the PRAGMA synchronous setting for database files that open in WAL mode. If not overridden at compile-time, this value is the same as SQLITE_DEFAULT_SYNCHRONOUS."
  - P4 · § "Options To Set Default Parameter Values" (SQLITE_DEFAULT_WAL_SYNCHRONOUS): "If SQLITE_DEFAULT_WAL_SYNCHRONOUS differs from SQLITE_DEFAULT_SYNCHRONOUS, and if the application has not modified the synchronous setting for the database file using the PRAGMA synchronous statement, then the synchronous setting is changed to the value defined by SQLITE_DEFAULT_WAL_SYNCHRONOUS when the database connection switches into WAL mode for the first time."

### S-r1-practice-config-06
- url: https://docs.python.org/3/library/sqlite3.html · canonical: docs.python.org/3/library/sqlite3.html
- title: sqlite3 — DB-API 2.0 interface for SQLite databases · authors: n/a · publisher: Python Software Foundation
- date: current as of access · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: the CPython standard library's official reference.
- passages:
  - P1 · § "Module functions" (sqlite3.connect parameters): "timeout (float) – How many seconds the connection should wait before raising an OperationalError when a table is locked. If another connection opens a transaction to modify a table, that table will be locked until the transaction is committed. Default five seconds."
  - P2 · § "Module functions" (sqlite3.connect parameters): "autocommit currently defaults to LEGACY_TRANSACTION_CONTROL. The default will change to False in a future Python release."
  - P3 · § "Connection objects" (isolation_level): "If not overridden by the isolation_level parameter of connect(), the default is … which is an alias for … DEFERRED"
  - P4 · § "Transaction control via the isolation_level attribute": "If the connection attribute isolation_level is not None, new transactions are implicitly opened before execute() and executemany() executes INSERT, UPDATE, DELETE, or REPLACE statements; for other statements, no implicit transaction handling is performed."
  - P5 · § "Transaction control via the autocommit attribute": "sqlite3 ensures that a transaction is always open, so connect(), Connection.commit(), and Connection.rollback() will implicitly open a new transaction (immediately after closing the pending one, for the latter two). sqlite3 uses BEGIN DEFERRED statements when opening transactions."

### S-r1-practice-config-07
- url: https://sqlite.org/c3ref/busy_handler.html · canonical: sqlite.org/c3ref/busy_handler.html
- title: Register A Callback To Handle SQLITE_BUSY Errors · authors: n/a · publisher: SQLite (sqlite.org)
- date: current as of access · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official C-interface documentation of the SQLite library.
- passages:
  - P1 · § "Register A Callback To Handle SQLITE_BUSY Errors": "The presence of a busy handler does not guarantee that it will be invoked when there is lock contention. If SQLite determines that invoking the busy handler could result in a deadlock, it will go ahead and return SQLITE_BUSY to the application instead of invoking the busy handler."
  - P2 · § "Register A Callback To Handle SQLITE_BUSY Errors": "Consider a scenario where one process is holding a read lock that it is trying to promote to a reserved lock and a second process is holding a reserved lock that it is trying to promote to an exclusive lock. The first process cannot proceed because it is blocked by the second and the second process cannot proceed because it is blocked by the first. If both processes invoke the busy handlers, neither will make any progress. Therefore, SQLite returns SQLITE_BUSY for the first process, hoping that this will induce the first process to release its read lock and allow the second process to proceed."
  - P3 · § "Register A Callback To Handle SQLITE_BUSY Errors": "If the busy callback is NULL, then SQLITE_BUSY is returned immediately upon encountering the lock."
  - P4 · § "Register A Callback To Handle SQLITE_BUSY Errors": "The default busy callback is NULL."
  - P5 · § "Register A Callback To Handle SQLITE_BUSY Errors": "The sqlite3_busy_handler() interface is used to implement sqlite3_busy_timeout() and PRAGMA busy_timeout."

### S-r1-practice-config-09
- url: https://raw.githubusercontent.com/mattn/go-sqlite3/master/sqlite3.go · canonical: github.com/mattn/go-sqlite3/blob/dbbe931904f2ee06546448fbe7cf7780f61bc110/sqlite3.go
- title: sqlite3.go · authors: Yasuhiro Matsumoto (mattn) and contributors · publisher: github.com/mattn/go-sqlite3
- repo: github.com/mattn/go-sqlite3 · commit: dbbe931904f2ee06546448fbe7cf7780f61bc110 (master head at access, per the GitHub API) · date: 2026-09-28
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: Yasuhiro Matsumoto (mattn), open-source maintainer · upstream: none
- lateral: the most widely used cgo SQLite driver for Go's database/sql; the source itself, read raw from master (not from a local clone, so no excerpt hash).
- passages:
  - P1 · sqlite3.go L1376, L1380 (function SQLiteDriver.Open): "txlock := … BEGIN … busyTimeout := 5000"
  - P2 · sqlite3.go L1446-L1453: "if val := params.Get( … _txlock … case … immediate … txlock = … BEGIN IMMEDIATE … case … deferred … txlock = … BEGIN"
  - P3 · sqlite3.go L1814: "exec(fmt.Sprintf( … PRAGMA busy_timeout = %d; … busyTimeout)); err != nil"
  - P4 · sqlite3.go L1307-L1309 (doc comment): "_txlock=XXX // Specify locking behavior for transactions. XXX can be"

### S-r1-practice-config-10
- url: https://pkg.go.dev/modernc.org/sqlite · canonical: pkg.go.dev/modernc.org/sqlite
- title: sqlite package - modernc.org/sqlite · authors: Jan Mercl and contributors · publisher: pkg.go.dev (generated from the package's doc comments)
- date: current as of access · version: v1.61.0
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: modernc.org (cznic / Jan Mercl) · upstream: the package's own Go doc comments
- lateral: the pure-Go (cgo-free) SQLite translation for Go; pkg.go.dev renders the maintainer's doc comments.
- passages:
  - P1 · § "func (*Driver) Open" (DSN parameters): "_txlock: The locking behavior to use when beginning a transaction. May be … deferred … (the default)"
  - P2 · § "func (*Driver) Open" (DSN parameters): "_busy_timeout, _timeout -> PRAGMA busy_timeout (an integer)"

## Claims

### C-r1-practice-config-01
- claim: An SQLite database connection defaults to journal_mode=DELETE, and WAL mode is turned on with the statement PRAGMA journal_mode=WAL.
- kind: behaviour
- questions: Q16 · load-bearing: yes (the how-to of turning WAL on)
- support: S-r1-practice-config-01/P1 · rung 1 · fit direct · upstream self
- scope: current SQLite docs; WAL available since 3.7.0 (2010-07-21)
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-02
- claim: PRAGMA journal_mode=WAL returns the string "wal" on success; if the conversion to WAL cannot be completed (for example when the VFS lacks the needed shared-memory primitives), the journal mode is left unchanged and the pragma returns the prior mode (for example "delete"), so an application should check the returned value.
- kind: behaviour
- questions: Q16 · load-bearing: yes (how a failed switch shows itself)
- support: S-r1-practice-config-01/P2 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-02/P1 · rung 1 · fit direct · upstream self
- scope: current SQLite docs. The "should check" clause is a direct consequence of the documented return value, not a quoted recommendation.
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-03
- claim: Unlike the other journal modes, WAL mode is persistent: it is stored with the database, stays in effect across connections, and survives closing and reopening the database, whereas a mode such as TRUNCATE reverts to DELETE on reopen.
- kind: behaviour
- questions: Q16 · load-bearing: yes (whether the setting must be repeated)
- support: S-r1-practice-config-01/P3 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-02/P2 · rung 1 · fit direct · upstream self
- scope: current SQLite docs; the TRUNCATE contrast is in the same wal.html section 3.3
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-04
- claim: Setting WAL journal mode on any one connection sets it for all connections to the same database file.
- kind: behaviour
- questions: Q16 · load-bearing: yes
- support: S-r1-practice-config-01/P4 · rung 1 · fit direct · upstream self
- scope: current SQLite docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-05
- claim: The journal mode cannot be changed while a transaction is active, and an in-memory database can only use journal mode MEMORY or OFF, so it cannot be switched to WAL.
- kind: behaviour
- questions: Q16 · load-bearing: yes (documented cases where the switch fails)
- support: S-r1-practice-config-02/P3 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-02/P4 · rung 1 · fit direct · upstream self
- scope: current SQLite docs. "So it cannot be switched to WAL" follows from P4's "can not be changed to a different value".
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-06
- claim: If the VFS does not support shared-memory methods (and the connection did not set locking_mode=EXCLUSIVE before its first WAL access), both converting a database to WAL and opening a database already in WAL mode fail; switching back with PRAGMA journal_mode=DELETE resets the file-format version numbers to 1 so that pre-3.7.0 SQLite can read the file again.
- kind: behaviour
- questions: Q16 · load-bearing: no (edge cases; shared memory itself belongs to found-shm)
- support: S-r1-practice-config-01/P5 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-01/P6 · rung 1 · fit direct · upstream self
- scope: current SQLite docs, section 8 (NORMAL locking mode at first WAL access) and section 10
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-07
- claim: In WAL mode with synchronous=NORMAL, SQLite syncs the WAL file before each checkpoint, syncs the database file after each completed checkpoint, and syncs the WAL header when the WAL begins to be reused, but issues no sync during most transactions; with synchronous=FULL it adds a sync of the WAL file after each transaction commit.
- kind: behaviour
- questions: Q17 · load-bearing: yes (what each setting syncs and when)
- support: S-r1-practice-config-02/P10 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-01/P7 · rung 1 · fit direct · upstream self
- scope: WAL mode, current SQLite docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-08
- claim: According to the SQLite docs, synchronous=FULL is atomic, consistent, isolated and durable (ACID) in WAL mode, because the extra WAL sync after each commit makes the transaction durable across a power loss.
- kind: behaviour
- questions: Q17 · load-bearing: yes
- support: S-r1-practice-config-02/P5 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-02/P10 · rung 1 · fit partial (the "helps ensure" reason; P10 continues "The extra WAL sync following each transaction helps ensure that transactions are durable across a power loss.") · upstream self
- scope: WAL mode; contrasted on the same page with rollback mode, where FULL is ACI and "Maybe not durable"
- confidence: high · flags: vendor-about-itself (a durability guarantee stated by the project; depends on the storage honouring fsync, which the page does not discuss here)
- conflicts: none

### C-r1-practice-config-09
- claim: In WAL mode with synchronous=NORMAL the database stays consistent and is safe from corruption, but it loses durability: a committed transaction might roll back after a power loss or operating-system crash (the last commits are lost, the file is not corrupted).
- kind: behaviour
- questions: Q17 · load-bearing: yes (the core durability trade-off)
- support: S-r1-practice-config-02/P6 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-05/P1 · rung 1 · fit direct · upstream self (same owner as S-02: one source for independence)
- support: S-r1-practice-config-01/P9 · rung 1 · fit direct · upstream self (same owner)
- scope: WAL mode, current SQLite docs; "power loss or system crash" per pragma.html, "power failure or hard reset" per wal.html
- confidence: high · flags: vendor-about-itself (critiques of this claim belong to the criticism angle)
- conflicts: none found in these sources

### C-r1-practice-config-10
- claim: The SQLite docs state that committed transactions survive an application crash regardless of the synchronous setting or journal mode; synchronous only matters for operating-system crashes and power loss.
- kind: behaviour
- questions: Q17 · load-bearing: yes (app crash vs power loss distinction)
- support: S-r1-practice-config-02/P6 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-02/P8 · rung 1 · fit partial (for OFF: "If the application running SQLite crashes, the data will be safe") · upstream self
- scope: current SQLite docs. The second clause ("only matters for…") is the contrapositive reading of P6 and P8, not quoted.
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-11
- claim: With synchronous=OFF SQLite does not sync at all after handing data to the operating system; application crashes are still safe, but an operating-system crash or power loss can corrupt the database, and the SQLite matrix marks OFF as "Not consistent" in both rollback and WAL mode.
- kind: behaviour
- questions: Q17 · load-bearing: yes
- support: S-r1-practice-config-02/P8 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-02/P11 · rung 1 · fit direct · upstream self
- scope: current SQLite docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-12
- claim: synchronous=EXTRA behaves no differently from FULL in WAL mode (its extra directory sync applies only to a rollback journal in DELETE mode).
- kind: behaviour
- questions: Q17 · load-bearing: no (EXTRA is rarely used with WAL)
- support: S-r1-practice-config-02/P9 · rung 1 · fit direct · upstream self
- scope: current SQLite docs. The parenthesis paraphrases the EXTRA paragraph on the same page ("the directory containing a rollback journal is synced after that journal is unlinked to commit a transaction in DELETE mode").
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-13
- claim: The SQLite documentation recommends synchronous=NORMAL for most applications in WAL mode, calling it the best balance between performance and safety and saying that losing durability across power loss is not important for most applications; its compile-time options page recommends changing the setting from FULL to NORMAL when switching to WAL because commits are much faster and integrity is still guaranteed.
- kind: evaluation
- questions: Q17 · load-bearing: yes (the recommendation the reader will act on) — usable only in attributed form
- support: S-r1-practice-config-02/P7 · rung 1 (for the attributed statement) · fit direct · upstream self
- support: S-r1-practice-config-05/P1 · rung 1 (attributed) · fit direct · upstream self (same owner)
- scope: SQLite project's own advice; no independent rung-2 source opened
- confidence: high (that the docs say it) · flags: vendor-about-itself; superlative ("best balance")
- conflicts: none opened here; critiques belong to the criticism angle

### C-r1-practice-config-14
- claim: With synchronous=NORMAL in WAL mode the checkpoint is the only operation that issues a sync (fsync on Unix, FlushFileBuffers on Windows), so an application that runs checkpoints in a separate thread or process never blocks its query thread on a sync, at the cost that transactions are no longer durable across a power failure.
- kind: behaviour
- questions: Q17 · load-bearing: no
- support: S-r1-practice-config-01/P8 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-01/P9 · rung 1 · fit direct · upstream self
- scope: WAL mode, synchronous=NORMAL, current SQLite docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-15
- claim: Unless a build overrides it with the SQLITE_DEFAULT_SYNCHRONOUS compile-time option, the default synchronous setting is 2 (FULL).
- kind: fact
- questions: Q18 · load-bearing: no
- support: S-r1-practice-config-05/P2 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-02/P5 · rung 1 · fit partial ("FULL is the default synchronous mode for a rollback journal") · upstream self
- scope: upstream SQLite builds; distributions and language bindings may compile with other options
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-16
- claim: The SQLITE_DEFAULT_WAL_SYNCHRONOUS compile-time option sets a separate default synchronous value for databases in WAL mode: if it differs from SQLITE_DEFAULT_SYNCHRONOUS and the application has not set PRAGMA synchronous, the setting changes to it when the connection first switches into WAL mode; if not overridden it equals SQLITE_DEFAULT_SYNCHRONOUS, so no automatic change happens.
- kind: behaviour
- questions: Q18 · load-bearing: no
- support: S-r1-practice-config-05/P3 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-05/P4 · rung 1 · fit direct · upstream self
- scope: compile-time option, current SQLite docs; which builds set it was not researched
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-17
- claim: In WAL mode, if another connection has the database open in exclusive locking mode, every query against the database returns SQLITE_BUSY.
- kind: behaviour
- questions: Q19 · load-bearing: yes
- support: S-r1-practice-config-01/P11 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-01/P10 · rung 1 · fit direct (frames the list as "obscure cases" despite readers and writers not blocking each other) · upstream self
- scope: WAL mode, current SQLite docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-18
- claim: In WAL mode, while the last connection to a database is closing it briefly holds an exclusive lock to clean up the -wal and -shm files, and a connection that tries to open and query the database during that cleanup might get SQLITE_BUSY.
- kind: behaviour
- questions: Q19 · load-bearing: yes
- support: S-r1-practice-config-01/P12 · rung 1 · fit direct · upstream self
- scope: WAL mode, current SQLite docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-19
- claim: In WAL mode, if the last connection to a database crashed, the first new connection runs recovery under an exclusive lock, and a further connection that queries during that recovery gets SQLITE_BUSY; the extended code SQLITE_BUSY_RECOVERY, which occurs only on WAL databases, reports that another process is recovering the database after a crash.
- kind: behaviour
- questions: Q19 · load-bearing: yes
- support: S-r1-practice-config-01/P13 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-03/P3 · rung 1 · fit direct · upstream self
- scope: WAL mode, current SQLite docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-20
- claim: SQLite supports only one writer at a time (in WAL mode because there is a single WAL file), so a connection that tries to start a write transaction while another connection's write transaction is in progress gets SQLITE_BUSY.
- kind: behaviour
- questions: Q19, Q20 · load-bearing: yes (the most common BUSY in WAL; the single writer itself belongs to found-rw)
- support: S-r1-practice-config-03/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-01/P14 · rung 1 · fit direct · upstream self
- scope: current SQLite docs; rescode.html's example is not restricted to a journal mode
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-21
- claim: SQLITE_BUSY_SNAPSHOT (extended code 517) occurs only on WAL-mode databases, when a connection tries to promote a read transaction into a write transaction but another connection has already written to the database since the reader's snapshot, invalidating its prior reads.
- kind: definition
- questions: Q19, Q20 · load-bearing: yes
- support: S-r1-practice-config-03/P4 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-03/P5 · rung 1 · fit direct (the A-reads, B-writes, A-tries-to-write scenario) · upstream self
- scope: current SQLite docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-22
- claim: When a write statement runs inside an active read transaction, SQLite tries to upgrade it to a write transaction; if another connection has already modified the database, or is in the process of modifying it, the upgrade is not possible and the write statement fails with SQLITE_BUSY.
- kind: behaviour
- questions: Q19, Q20 · load-bearing: yes (the read-to-write upgrade failure)
- support: S-r1-practice-config-04/P1 · rung 1 · fit direct · upstream self
- scope: current SQLite docs, any journal mode; in WAL mode the "already modified" case is the one reported as SQLITE_BUSY_SNAPSHOT (C-21)
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-23
- claim: SQLite's default transaction type is DEFERRED: after BEGIN (DEFERRED), a first SELECT starts a read transaction, and a later write statement upgrades it to a write transaction if possible or returns SQLITE_BUSY; if the first statement is a write, a write transaction starts at once.
- kind: behaviour
- questions: Q20 · load-bearing: yes
- support: S-r1-practice-config-04/P2 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-04/P3 · rung 1 · fit direct · upstream self
- scope: current SQLite docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-24
- claim: BEGIN IMMEDIATE starts a write transaction at once, without waiting for a write statement; it can itself fail with SQLITE_BUSY when another connection's write transaction is active, but once it succeeds SQLite guarantees that no later operation on that database up to the next COMMIT returns SQLITE_BUSY, which is why the docs advise it for avoiding SQLITE_BUSY in the middle of a transaction.
- kind: behaviour
- questions: Q20 · load-bearing: yes
- support: S-r1-practice-config-04/P4 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-03/P2 · rung 1 · fit direct · upstream self
- scope: current SQLite docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-25
- claim: In WAL mode BEGIN EXCLUSIVE and BEGIN IMMEDIATE behave the same; only in other journal modes does EXCLUSIVE also keep readers out.
- kind: behaviour
- questions: Q20 · load-bearing: no
- support: S-r1-practice-config-04/P5 · rung 1 · fit direct · upstream self
- scope: current SQLite docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-26
- claim: A busy handler (which PRAGMA busy_timeout installs) is not guaranteed to be invoked on lock contention: when SQLite determines that waiting could deadlock, as when a connection holding a read lock tries to promote it while another connection is waiting to finish its write, SQLite returns SQLITE_BUSY at once to the reader so that it releases its read lock.
- kind: behaviour
- questions: Q20 · load-bearing: yes (why busy_timeout does not save a deferred upgrade)
- support: S-r1-practice-config-07/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-07/P2 · rung 1 · fit partial (the example is stated in rollback-journal lock names: read lock to reserved lock vs reserved to exclusive; the page does not mention WAL or SQLITE_BUSY_SNAPSHOT) · upstream self
- support: S-r1-practice-config-07/P5 · rung 1 · fit direct (busy_timeout is implemented on the busy handler) · upstream self
- scope: current SQLite C-interface docs. Applying the deadlock-avoidance rule to a WAL read-to-write upgrade is not stated on any page opened; the WAL statements are C-21 and C-22.
- confidence: medium (for the WAL application) · flags: none
- conflicts: none

### C-r1-practice-config-27
- claim: SQLite's default busy callback is NULL, so unless a busy timeout or handler is set, SQLITE_BUSY is returned immediately on lock contention; each connection has a single busy handler, and PRAGMA busy_timeout (or sqlite3_busy_timeout) replaces any handler set earlier.
- kind: behaviour
- questions: Q19, Q20, Q21 · load-bearing: yes (why drivers set a timeout at all)
- support: S-r1-practice-config-07/P3 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-07/P4 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-02/P12 · rung 1 · fit direct · upstream self
- scope: SQLite C library defaults; language drivers may set a timeout on open (C-29, C-32)
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-28
- claim: SQLITE_BUSY can arise at any point of a transaction (at its start, at any write, or at commit), and it signals a conflict with a different database connection, usually in another process, as opposed to SQLITE_LOCKED, which signals a conflict within the same connection.
- kind: definition
- questions: Q19, Q20 · load-bearing: no
- support: S-r1-practice-config-03/P2 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-03/P6 · rung 1 · fit direct · upstream self
- scope: current SQLite docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-29
- claim: In Python's sqlite3 module (documentation for Python 3.15.1), sqlite3.connect() waits by default 5 seconds (timeout=5.0) for a lock before raising OperationalError.
- kind: number
- questions: Q21 · load-bearing: no
- support: S-r1-practice-config-06/P1 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 docs; the docs do not say on this line that the timeout is passed to sqlite3_busy_timeout
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-30
- claim: Python's sqlite3 module (3.15.1 docs) defaults to autocommit=LEGACY_TRANSACTION_CONTROL with isolation_level "" (an alias for DEFERRED), in which mode it implicitly opens a transaction only before INSERT, UPDATE, DELETE or REPLACE statements run through execute() or executemany(), and does no implicit transaction handling for other statements.
- kind: behaviour
- questions: Q21 · load-bearing: no
- support: S-r1-practice-config-06/P2 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-06/P3 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-06/P4 · rung 1 · fit direct · upstream self
- scope: Python 3.12 and later (autocommit added in 3.12); docs for 3.15.1
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-31
- claim: In Python's sqlite3 module with autocommit=False, which the docs recommend and say will become the default in a future release, a transaction is always open (connect(), commit() and rollback() each open a new one) and the module opens transactions with BEGIN DEFERRED.
- kind: behaviour
- questions: Q21 · load-bearing: no
- support: S-r1-practice-config-06/P5 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-06/P2 · rung 1 · fit direct (the future default) · upstream self
- scope: Python 3.12+; docs for 3.15.1; the 3.15.1 docs (P2) say the change will come "in a future Python release"
- confidence: high · flags: prediction (future default change)
- conflicts: none

### C-r1-practice-config-32
- claim: The Go driver github.com/mattn/go-sqlite3 (master at commit dbbe931, 2026-09-28) begins transactions with plain BEGIN (deferred) by default, switches to BEGIN IMMEDIATE when the DSN has _txlock=immediate, and sets PRAGMA busy_timeout to 5000 milliseconds on every connection it opens unless the DSN overrides _busy_timeout.
- kind: behaviour
- questions: Q21 · load-bearing: no
- support: S-r1-practice-config-09/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-09/P2 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-09/P3 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-09/P4 · rung 1 · fit direct · upstream self
- scope: mattn/go-sqlite3 master at dbbe931904f2 (2026-09-28); read from the raw file, not a local clone, so no excerpt hash; the unit (milliseconds) follows from PRAGMA busy_timeout's own unit
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-config-33
- claim: The pure-Go driver modernc.org/sqlite (v1.61.0 docs) begins transactions as deferred by default, accepts _txlock=immediate or exclusive in the DSN, and maps the DSN keys _busy_timeout and _timeout to PRAGMA busy_timeout; its documentation does not state a default busy timeout.
- kind: behaviour
- questions: Q21 · load-bearing: no
- support: S-r1-practice-config-10/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-config-10/P2 · rung 1 · fit direct · upstream self
- scope: modernc.org/sqlite v1.61.0 package docs; the absence of a stated default was checked by searching the page for "busy" (three hits, none a default); the code was not read
- confidence: medium (for the absence) · flags: none
- conflicts: none

## Conflicts
- none found between the sources opened. One nuance, not a conflict: S-r1-practice-config-02/P5 says FULL is "the default synchronous mode for a rollback journal", while S-r1-practice-config-05/P2 says the compile-time default is 2 (FULL) without restricting it to rollback mode; S-r1-practice-config-05/P3-P4 reconcile them (the WAL default equals it unless a build sets SQLITE_DEFAULT_WAL_SYNCHRONOUS).

## Speculation and flags
- C-r1-practice-config-13: vendor-about-itself and superlative ("the best balance between performance and safety for most applications"); usable only as the SQLite project's own recommendation.
- C-r1-practice-config-08, -09: durability statements by the project about its own product; they presume storage that honours fsync, which these passages do not discuss.
- C-r1-practice-config-26: the busy_handler page explains deadlock avoidance in rollback-journal lock terms; the WAL-specific link (busy handler skipped for SQLITE_BUSY_SNAPSHOT) is not stated on any page opened. The writer should present it as the documented rule plus the documented WAL upgrade failure, not as a quoted WAL rule.
- C-r1-practice-config-31: prediction ("The default will change to False in a future Python release").
- S-r1-practice-config-04 § 2.3 says "An attempt to execute COMMIT might also result in an SQLITE_BUSY return code if another thread or process has an open read connection", without naming a journal mode; left unclaimed as ambiguous for WAL.
- Inference left unclaimed (Q21): that Python's autocommit=False (always-open BEGIN DEFERRED, so a SELECT then a write is an upgrade) and Go drivers' default deferred BEGIN expose WAL apps to the immediate SQLITE_BUSY of C-22/C-23 regardless of their busy timeouts. No source opened states it; the cases angle may hold one.

## Unused leads
- https://sqlite.org/isolation.html — isolation in SQLite; may state the WAL snapshot/upgrade rule directly (Q20).
- https://sqlite.org/c3ref/busy_timeout.html — sqlite3_busy_timeout semantics (sleep and retry until the total time elapses).
- https://raw.githubusercontent.com/mattn/go-sqlite3/master/README.md — DSN table (_busy_timeout, _txlock, _journal_mode, _synchronous); fetched, not cited because the source code covers it.
- https://github.com/ncruces/go-sqlite3 — a third common Go driver (wasm-based); defaults not checked.
- wal.html § 11 "The WAL-Reset Bug" (fixed in 3.51.3, 2026-03-13) — belongs to the criticism angle.

## Queries
- (no WebSearch run: all sources were known sqlite.org, docs.python.org, GitHub and pkg.go.dev pages fetched directly)
- GitHub API: latest commit of mattn/go-sqlite3 master → useful (dbbe931904f2ee06546448fbe7cf7780f61bc110, 2026-09-28)

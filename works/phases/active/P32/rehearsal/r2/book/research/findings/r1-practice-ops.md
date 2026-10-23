# Findings: 20261023-1245-sqlite-wal · round 1 · angle practice-ops
- researcher: claude-opus-5-5 · status: complete · tool calls: 39

## Questions
- Q22: answered — claims: C-r1-practice-ops-01, -02, -03, -04, -05, -06, -07, -08, -09, -10, -11 — note: all rung 1 (sqlite.org); the dedicated-connection pattern appears in the docs as "a separate thread or process", not as a named pattern.
- Q23: answered — claims: C-r1-practice-ops-12, -13, -14, -15, -16, -17, -18, -19, -20 — note: three documented causes plus the reason the file never shrinks; the link from "a statement left un-reset holds a read transaction" comes from lang_transaction.html.
- Q24: answered — claims: C-r1-practice-ops-21, -22, -23, -24, -25, -26 — note: the docs disagree on whether RESTART/TRUNCATE block readers (see Conflicts).
- Q25: answered — claims: C-r1-practice-ops-27, -28, -29, -30, -31, -32, -33, -34, -35, -36, -37, -38 — note: found no sqlite.org passage saying `.backup` is built on the backup API; only the CLI help line was found.
- Q26: answered — claims: C-r1-practice-ops-39, -40, -41, -42, -43, -44, -45, -46 — note: found no documentation of what happens if -shm is deleted while connections are still open; the docs say only that -shm is not needed for crash recovery.
- Q27: answered — claims: C-r1-practice-ops-47, -48, -49, -50, -07, -17 — note: the documented signals are the checkpoint return values and the WAL's size against the ~4MB default; no dedicated "health" metric found.
- Q28: answered — claims: C-r1-practice-ops-51, -52, -53, -54, -55 — note: rung 1 only.

## Sources

### S-r1-practice-ops-01
- url: https://sqlite.org/wal.html · canonical: sqlite.org/wal.html
- title: Write-Ahead Logging · authors: n/a · publisher: SQLite
- date: n/a; updated 2026-08-25 ("This page was last updated on 2026-08-25 19:42:39Z") · version: current docs (mentions 3.51.3 fix)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project (Hipp, Wyrick & Company) · upstream: none
- lateral: sqlite.org is the SQLite project's own site; rung 1 for SQLite's behaviour, attributed form only for its evaluations.
- passages:
  - P1 · § "2.1. Checkpointing": "By default, SQLite does a checkpoint automatically when the WAL file reaches a threshold size of 1000 pages. (The SQLITE_DEFAULT_WAL_AUTOCHECKPOINT compile-time option can be used to specify a different default.) Applications using WAL do not have to do anything in order for these checkpoints to occur. But if they want to, applications can adjust the automatic checkpoint threshold. Or they can turn off the automatic checkpoints and run checkpoints during idle moments or in a separate thread or process."
  - P2 · § "2.3. Performance Considerations": "By default, the checkpoint will be run automatically by the same thread that does the COMMIT that pushes the WAL over its size limit. This has the effect of causing most COMMIT operations to be very fast but an occasional COMMIT (those that trigger a checkpoint) to be much slower. If that effect is undesirable, then the application can disable automatic checkpointing and run the periodic checkpoints in a separate thread, or separate process."
  - P3 · § "2.3. Performance Considerations": "Note that with PRAGMA synchronous set to NORMAL, the checkpoint is the only operation to issue an I/O barrier or sync operation (fsync() on unix or FlushFileBuffers() on windows). If an application therefore runs checkpoint in a separate thread or process, the main thread or process that is doing database queries and updates will never block on a sync operation."
  - P4 · § "2.3. Performance Considerations": "The default strategy is to run a checkpoint once the WAL reaches 1000 pages and this strategy seems to work well in test applications on workstations, but other strategies might work better on different platforms or for different workloads."
  - P5 · § "2.3. Performance Considerations": "On the other hand, read performance deteriorates as the WAL file grows in size since each reader must check the WAL file for the content and the time needed to check the WAL file is proportional to the size of the WAL file. The wal-index helps find content in the WAL file much faster, but performance still falls off with increasing WAL file size. Hence, to maintain good read performance it is important to keep the WAL file size down by running checkpoints at regular intervals."
  - P6 · § "3.1. Automatic Checkpoint": "By default, SQLite will automatically checkpoint whenever a COMMIT occurs that causes the WAL file to be 1000 pages or more in size, or when the last database connection on a database file closes."
  - P7 · § "3.1. Automatic Checkpoint": "A program can also use sqlite3_wal_hook() to register a callback to be invoked whenever any transaction commits to the WAL. This callback can then invoke sqlite3_wal_checkpoint() or sqlite3_wal_checkpoint_v2() based on whatever criteria it thinks is appropriate. (The automatic checkpoint mechanism is implemented as a simple wrapper around sqlite3_wal_hook().)"
  - P8 · § "3.2. Application-Initiated Checkpoints": "An application can initiate a checkpoint using any writable database connection on the database simply by invoking sqlite3_wal_checkpoint() or sqlite3_wal_checkpoint_v2()."
  - P9 · § "3.2. Application-Initiated Checkpoints": "There are three subtypes of checkpoints that vary in their aggressiveness: PASSIVE, FULL, and RESTART. The default checkpoint style is PASSIVE, which does as much work as it can without interfering with other database connections, and which might not run to completion if there are concurrent readers or writers. All checkpoints initiated by sqlite3_wal_checkpoint() and by the automatic checkpoint mechanism are PASSIVE. FULL and RESTART checkpoints try harder to run the checkpoint to completion and can only be initiated by a call to sqlite3_wal_checkpoint_v2()."
  - P10 · § "4. The WAL File": "The WAL file exists for as long as any database connection has the database open. Usually, the WAL file is deleted automatically when the last connection to the database closes. However, if the last process to have the database open exits without cleanly shutting down the database connection, or if the SQLITE_FCNTL_PERSIST_WAL file control is used, then the WAL file might be retained on disk after all connections to the database have been closed."
  - P11 · § "4. The WAL File": "The WAL file is part of the persistent state of the database and should be kept with the database if the database is copied or moved. If a database file is separated from its WAL file, then transactions that were previously committed to the database might be lost, or the database file might become corrupted. The only safe way to remove a WAL file is to open the database file using one of the sqlite3_open() interfaces then immediately close the database using sqlite3_close()."
  - P12 · § "4. The WAL File": "The name of this file on disk is usually the name of the database file with an extra … suffix, though different naming rules may apply if SQLite is compiled with SQLITE_ENABLE_8_3_NAMES."
  - P13 · § "5. Read-Only Databases": "Older versions of SQLite could not read a WAL-mode database that was read-only. In other words, write access was required in order to read a WAL-mode database. This constraint was relaxed beginning with SQLite version 3.22.0 (2018-01-22)."
  - P14 · § "5. Read-Only Databases": "On newer versions of SQLite, a WAL-mode database on read-only media, or a WAL-mode database that lacks write permission, can still be read as long as one or more of the following conditions are met: … The -shm and -wal files already exist and are readable. … There is write permission on the directory containing the database so that the -shm and -wal files can be created. … The database connection is opened using the immutable query parameter."
  - P15 · § "5. Read-Only Databases": "Even though it is possible to open a read-only WAL-mode database, it is good practice to convert the database to PRAGMA journal_mode=DELETE prior to burning an SQLite database image onto read-only media."
  - P16 · § "6. Avoiding Excessively Large WAL Files": "In normal cases, new content is appended to the WAL file until the WAL file accumulates about 1000 pages (and is thus about 4MB in size) at which point a checkpoint is automatically run and the WAL file is recycled. The checkpoint does not normally truncate the WAL file (unless the journal_size_limit pragma is set). Instead, it merely causes SQLite to start overwriting the WAL file from the beginning. This is done because it is normally faster to overwrite an existing file than to append."
  - P17 · § "6. Avoiding Excessively Large WAL Files": "But it is possible to get SQLite into a state where the WAL file will grow without bound, causing excess disk space usage and slow query speeds."
  - P18 · § "6. Avoiding Excessively Large WAL Files": "If an application disables the automatic checkpoint, then there is nothing to prevent the WAL file from growing excessively."
  - P19 · § "6. Avoiding Excessively Large WAL Files": "However, if a database has many concurrent overlapping readers and there is always at least one active reader, then no checkpoints will be able to complete and hence the WAL file will grow without bound."
  - P20 · § "6. Avoiding Excessively Large WAL Files": "This scenario can be avoided by ensuring that there are … times when no processes are reading from the database and that checkpoints are attempted during those times. In applications with many concurrent readers, one might also consider running manual checkpoints with the SQLITE_CHECKPOINT_RESTART or SQLITE_CHECKPOINT_TRUNCATE option which will ensure that the checkpoint runs to completion before returning. The disadvantage of using SQLITE_CHECKPOINT_RESTART and SQLITE_CHECKPOINT_TRUNCATE is that readers might block while the checkpoint is running."
  - P21 · § "6. Avoiding Excessively Large WAL Files": "Very large write transactions. A checkpoint can only complete when no other transactions are running, which means the WAL file cannot be reset in the middle of a write transaction. So a large change to a large database might result in a large WAL file."
  - P22 · § "6. Avoiding Excessively Large WAL Files": "As of SQLite version 3.11.0 (2016-02-15), the WAL file for a single transaction should be proportional in size to the transaction itself. Pages that are changed by the transaction should only be written into the WAL file once. However, with older versions of SQLite, the same page might be written into the WAL file multiple times if the transaction grows larger than the page cache."
  - P23 · § "7. Implementation Of Shared-Memory For The WAL-Index": "The only way we have found to guarantee that all processes accessing the same database file use the same shared memory is to create the shared memory by mmapping a file in the same directory as the database itself."
  - P24 · § "1. Overview": "It is recommended that one of the rollback journal modes be used for transactions larger than a few dozen megabytes. Beginning with version 3.11.0 (2016-02-15), WAL mode works as efficiently with large transactions as does rollback mode."

### S-r1-practice-ops-02
- url: https://sqlite.org/pragma.html · canonical: sqlite.org/pragma.html
- title: Pragma statements supported by SQLite · authors: n/a · publisher: SQLite
- date: n/a · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-r1-practice-ops-01.
- passages:
  - P1 · § "List Of PRAGMAs" (PRAGMA wal_autocheckpoint): "This pragma queries or sets the write-ahead log auto-checkpoint interval. When the write-ahead log is enabled (via the journal_mode pragma) a checkpoint will be run automatically whenever the write-ahead log equals or exceeds N pages in length. Setting the auto-checkpoint size to zero or a negative value turns auto-checkpointing off."
  - P2 · § "List Of PRAGMAs" (PRAGMA wal_autocheckpoint): "This pragma is a wrapper around the sqlite3_wal_autocheckpoint() C interface. All automatic checkpoints are PASSIVE."
  - P3 · § "List Of PRAGMAs" (PRAGMA wal_checkpoint): "Invoking this pragma without an argument is equivalent to calling the sqlite3_wal_checkpoint() C interface."
  - P4 · § "List Of PRAGMAs" (PRAGMA wal_checkpoint): "Invoking this pragma with an argument is equivalent to calling the sqlite3_wal_checkpoint_v2() C interface with a 3rd parameter corresponding to the argument:"
  - P5 · § "List Of PRAGMAs" (PRAGMA wal_checkpoint, RESTART): "This mode works the same way as FULL with the addition that after checkpointing the log file it blocks (calls the busy-handler callback) until all readers are finished with the log file. This ensures that the next client to write to the database file restarts the log file from the beginning. RESTART blocks concurrent writers while it is running, but allows readers to proceed."
  - P6 · § "List Of PRAGMAs" (PRAGMA wal_checkpoint, TRUNCATE): "This mode works the same way as RESTART with the addition that the WAL file is truncated to zero bytes upon successful completion."
  - P7 · § "List Of PRAGMAs" (PRAGMA wal_checkpoint): "The wal_checkpoint pragma returns a single row with three integer columns. The first column is usually 0 but will be 1 if a RESTART or FULL or TRUNCATE checkpoint was blocked from completing, for example because another thread or process was actively using the database. In other words, the first column is 0 if the equivalent call to sqlite3_wal_checkpoint_v2() would have returned SQLITE_OK or 1 if the equivalent call would have returned SQLITE_BUSY. The second column is the number of modified pages that have been written to the write-ahead log file. The third column is the number of pages in the write-ahead log file that have been successfully moved back into the database file at the conclusion of the checkpoint. The second and third column are -1 if there is no write-ahead log, for example if this pragma is invoked on a database connection that is not in WAL mode."
  - P8 · § "List Of PRAGMAs" (PRAGMA journal_size_limit): "The journal_size_limit pragma may be used to limit the size of rollback-journal and WAL files left in the file-system after transactions or checkpoints. Each time a transaction is committed or a WAL file resets, SQLite compares the size of the rollback journal file or WAL file left in the file-system to the size limit set by this pragma and if the journal or WAL file is larger it is truncated to the limit."
  - P9 · § "List Of PRAGMAs" (PRAGMA journal_size_limit): "The second form of the pragma listed above is used to set a new limit in bytes for the specified database. A negative number implies no limit. To always truncate rollback journals and WAL files to their minimum size, set the journal_size_limit to zero."
  - P10 · § "List Of PRAGMAs" (PRAGMA journal_size_limit): "The default journal size limit is -1 (no limit)."
  - P11 · § "List Of PRAGMAs" (PRAGMA wal_checkpoint, NOOP): "This mode does not checkpoint any frames. It is used to obtain the returned values only."

### S-r1-practice-ops-03
- url: https://sqlite.org/c3ref/wal_checkpoint_v2.html · canonical: sqlite.org/c3ref/wal_checkpoint_v2.html
- title: Checkpoint a database · authors: n/a · publisher: SQLite
- date: n/a · version: current docs (lists SQLITE_CHECKPOINT_NOOP)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-r1-practice-ops-01.
- passages:
  - P1 · § "Checkpoint a database": "This mode works the same way as SQLITE_CHECKPOINT_FULL with the addition that after checkpointing the log file it blocks (calls the busy-handler callback) until all readers are reading from the database file only. This ensures that the next writer will restart the log file from the beginning. Like SQLITE_CHECKPOINT_FULL, this mode blocks new database writer attempts while it is pending, but does not impede readers."
  - P2 · § "Checkpoint a database": "This mode works the same way as SQLITE_CHECKPOINT_RESTART with the addition that it also truncates the log file to zero bytes just prior to a successful return."
  - P3 · § "Checkpoint a database": "This mode always checkpoints zero frames. The only reason to invoke a NOOP checkpoint is to access the values returned by sqlite3_wal_checkpoint_v2() via output parameters *pnLog and *pnCkpt."
  - P4 · § "Checkpoint a database": "If pnLog is not NULL, then *pnLog is set to the total number of frames in the log file or to -1 if the checkpoint could not run because of an error or because the database is not in WAL mode. If pnCkpt is not NULL,then *pnCkpt is set to the total number of checkpointed frames in the log file (including any that were already checkpointed before the function was called) or to -1 if the checkpoint could not run due to an error or because the database is not in WAL mode. Note that upon successful completion of an SQLITE_CHECKPOINT_TRUNCATE, the log file will have been truncated to zero bytes and so both *pnLog and *pnCkpt will be set to zero."
  - P5 · § "Checkpoint a database": "All calls obtain an exclusive … lock on the database file. If any other process is running a checkpoint operation at the same time, the lock cannot be obtained and SQLITE_BUSY is returned. Even if there is a busy-handler configured, it will not be invoked in this case."
  - P6 · § "Checkpoint a database": "If the busy-handler returns 0 before the writer lock is obtained or while waiting for database readers, the checkpoint operation proceeds from that point in the same way as SQLITE_CHECKPOINT_PASSIVE - checkpointing as many frames as possible without blocking any further. SQLITE_BUSY is returned in this case."
  - P7 · § "Checkpoint a database": "The busy-handler callback is never invoked in the SQLITE_CHECKPOINT_PASSIVE mode. On the other hand, passive mode might leave the checkpoint unfinished if there are concurrent readers or writers."

### S-r1-practice-ops-04
- url: https://sqlite.org/howtocorrupt.html · canonical: sqlite.org/howtocorrupt.html
- title: How To Corrupt An SQLite Database File · authors: n/a · publisher: SQLite
- date: n/a · version: current docs (mentions 3.51.0 defenses)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-r1-practice-ops-01.
- passages:
  - P1 · § "1.2. Backup or restore while a transaction is active": "Systems that run automatic backups in the background might try to make a backup copy of an SQLite database file while it is in the middle of a transaction. The backup copy then might contain some old and some new content, and thus be corrupt."
  - P2 · § "1.2. Backup or restore while a transaction is active": "The sqlite3_rsync utility program (available beginning with SQLite 3.47.0 (2024-10-21) and later) will make a copy of a live SQLite over SSH using a bandwidth-efficient protocol. … The VACUUM INTO filename command copies out the current state of an SQLite database into a separate file. … The backup API is a C-language interface that can make a consistent copy of an SQLite database. … Any of the above approaches will work even on a live database."
  - P3 · § "1.2. Backup or restore while a transaction is active": "It is also safe to make a copy of an SQLite database file as long as there are no transactions in progress while the copy is taking place. If the previous write transaction failed, then it is important that any rollback journal (the *-journal file) or write-ahead log (the *-wal file) be copied together with the database file itself."
  - P4 · § "1.3. Deleting a hot journal": "SQLite must see the journal files in order to recover from a crash or power failure. If the hot journal files are moved, deleted, or renamed after a crash or power failure, then automatic recovery will not work and the database may go corrupt."
  - P5 · § "1.4. Mispairing database files and hot journals": "But if the journal file does exist, it must be kept together with the database to avoid corruption. The following actions are all likely to lead to corruption: … Moving a journal file from one database to another. … Copying a database file without also copying its journal. … Overwriting a database file with another without also deleting any hot journal associated with the original database."
  - P6 · § "2.5. Unlinking or renaming a database file while in use": "Since rollback journals and WAL files are based on the name of the database file, the two different database files will share the same rollback journal or WAL file. A rollback or recovery for one of the databases might use content from the other database, resulting in corruption. A similar problem occurs if a database file is renamed while it is opened and a new file is created with the old name."
  - P7 · § "2.6. Multiple links to the same file": "If two or more processes open the database using different names, then they will use different rollback journals and WAL files. That means that if one process crashes, the other process will be unable to recover the transaction in progress because it will be looking in the wrong place for the appropriate journal."

### S-r1-practice-ops-05
- url: https://sqlite.org/backup.html · canonical: sqlite.org/backup.html
- title: SQLite Backup API · authors: n/a · publisher: SQLite
- date: n/a · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-r1-practice-ops-01.
- passages:
  - P1 · § "1. Using the SQLite Online Backup API": "If a power failure or operating system failure occurs while copying the database file the backup database may be corrupted following system recovery."
  - P2 · § "1. Using the SQLite Online Backup API": "The copy operation may be done incrementally, in which case the source database does not need to be locked for the duration of the copy, only for the brief periods of time when it is actually being read from. This allows other database users to continue without excessive delays while a backup of an online database is made."
  - P3 · § "3.1. File and Database Connection Locking": "If another thread or process writes to the source database while this function is sleeping, then SQLite detects this and usually restarts the backup process when sqlite3_backup_step() is next called. There is one exception to this rule: If the source database is not an in-memory database, and the write is performed from within the same process as the backup operation and uses the same database handle (pDb), then the destination database (the one opened using connection pFile) is automatically updated along with the source."
  - P4 · § "3.1. File and Database Connection Locking": "Whether or not the backup process is restarted as a result of writes to the source database mid-backup, the user can be sure that when the backup operation is completed the backup database contains a consistent and up-to-date snapshot of the original."
  - P5 · § "3.1. File and Database Connection Locking": "If the backup process is restarted frequently enough it may never run to completion and the backupDb() function may never return."
  - P6 · § "3. Example 2: Online Backup of a Running Database": "The function presented in the previous example copies the entire source database in one call to sqlite3_backup_step(). This requires holding a read-lock on the source database file for the duration of the operation, preventing any other database user from writing to the database."

### S-r1-practice-ops-06
- url: https://sqlite.org/lang_vacuum.html · canonical: sqlite.org/lang_vacuum.html
- title: VACUUM · authors: n/a · publisher: SQLite
- date: n/a · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-r1-practice-ops-01.
- passages:
  - P1 · § "2.1. VACUUM with an INTO clause": "The VACUUM command with an INTO clause is an alternative to the backup API for generating backup copies of a live database. The advantage of using VACUUM INTO is that the resulting backup database is minimal in size and hence the amount of filesystem I/O may be reduced. Also, all deleted content is purged from the backup, leaving behind no forensic traces. On the other hand, the backup API uses fewer CPU cycles and can be executed incrementally."
  - P2 · § "2.1. VACUUM with an INTO clause": "The file named by the INTO clause must not previously exist, or else it must be an empty file, or the VACUUM INTO command will fail with an error."
  - P3 · § "2.1. VACUUM with an INTO clause": "The VACUUM INTO command is transactional in the sense that the generated output database is a consistent snapshot of the original database. However, if the VACUUM INTO command is interrupted by an unplanned shutdown or power loss, then the generated output database might be incomplete and corrupt."
  - P4 · § "2.1. VACUUM with an INTO clause": "However, if the PRAGMA synchronous setting of the original database is NORMAL or FULL, then SQLite invokes fsync() or FileFlushBuffers() to sync the output database to disk after it has been written."

### S-r1-practice-ops-07
- url: https://sqlite.org/cli.html · canonical: sqlite.org/cli.html
- title: Command Line Shell For SQLite · authors: n/a · publisher: SQLite
- date: n/a · version: current docs (prompt example shows SQLite-3.54)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-r1-practice-ops-01.
- passages:
  - P1 · § "2. Special commands (dot-commands)": ".backup ?DB? FILE Backup DB (default … main … ) to FILE"
  - P2 · § "2. Special commands (dot-commands)": ".save ?OPTIONS? FILE Write database to FILE (an alias for .backup ...)"

### S-r1-practice-ops-08
- url: https://sqlite.org/c3ref/wal_autocheckpoint.html · canonical: sqlite.org/c3ref/wal_autocheckpoint.html
- title: Configure an auto-checkpoint · authors: n/a · publisher: SQLite
- date: n/a · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-r1-practice-ops-01.
- passages:
  - P1 · § "Configure an auto-checkpoint": "The sqlite3_wal_autocheckpoint(D,N) is a wrapper around sqlite3_wal_hook() that causes any database on database connection D to automatically checkpoint after committing a transaction if there are N or more frames in the write-ahead log file. Passing zero or a negative value as the N parameter disables automatic checkpoints entirely."
  - P2 · § "Configure an auto-checkpoint": "The callback registered by this function replaces any existing callback registered using sqlite3_wal_hook(). Likewise, registering a callback using sqlite3_wal_hook() disables the automatic checkpoint mechanism configured by this function."
  - P3 · § "Configure an auto-checkpoint": "Every new database connection defaults to having the auto-checkpoint enabled with a threshold of 1000 or SQLITE_DEFAULT_WAL_AUTOCHECKPOINT pages."

### S-r1-practice-ops-09
- url: https://sqlite.org/lang_transaction.html · canonical: sqlite.org/lang_transaction.html
- title: Transaction · authors: n/a · publisher: SQLite
- date: n/a · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-r1-practice-ops-01.
- passages:
  - P1 · § "2.3. Implicit versus explicit transactions": "An implicit transaction (a transaction that is started automatically, not a transaction started by BEGIN) is committed automatically when the last active statement finishes. A statement finishes when its last cursor closes, which is guaranteed to happen when the prepared statement is reset or finalized. … The only way to ensure that a statement has … is to invoke sqlite3_reset() or sqlite3_finalize() on that statement. An open sqlite3_blob used for incremental BLOB I/O also counts as an unfinished statement."
  - P2 · § "2.2. DEFERRED, IMMEDIATE, and EXCLUSIVE transactions": "This causes the transaction that is automatically started to persist until an explicit COMMIT or ROLLBACK or until a rollback is provoked by an error or an ON CONFLICT ROLLBACK clause. If the first statement after BEGIN DEFERRED is a SELECT, then a read transaction is started."

### S-r1-practice-ops-10
- url: https://sqlite.org/walformat.html · canonical: sqlite.org/walformat.html
- title: WAL-mode File Format · authors: n/a · publisher: SQLite
- date: n/a · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-r1-practice-ops-01.
- passages:
  - P1 · § "1.3. The Wal-Index or -shm file": "The shm file does not contain any database content and is not required to recover the database following a crash. For that reason, the first client to connect to a quiescent database will normally truncate the shm file if it exists."
  - P2 · § "2.3.2. Operations that require locks and which locks those operations use": "If the application invokes sqlite3_file_control(SQLITE_FCNTL_PERSIST_WAL) on the database connection prior to closing, then the final checkpoint is still run but the WAL and WAL-index files are not deleted as they normally would be. This leaves the database in a state that allows other processes without write permission on the database, WAL, or WAL-index files to open the database read-only. If the WAL and WAL-index files are missing, then a process that lacks permission to create and initialize those files will not be able to open the database, unless the database is designated as immutable using the immutable query parameter."

## Claims

### C-r1-practice-ops-01
- claim: By default SQLite runs a checkpoint automatically whenever a COMMIT leaves the WAL file at 1000 pages or more, and when the last database connection on the database file closes.
- kind: behaviour
- questions: Q22 · load-bearing: yes (the baseline the reader takes control from)
- support: S-r1-practice-ops-01/P6 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-01/P1 · rung 1 · fit partial · upstream self
- scope: default build; the 1000-page default can be changed at compile time with SQLITE_DEFAULT_WAL_AUTOCHECKPOINT
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-02
- claim: `PRAGMA wal_autocheckpoint=N` sets the auto-checkpoint threshold to N pages, a value of zero or less turns automatic checkpoints off, and every automatic checkpoint is PASSIVE.
- kind: behaviour
- questions: Q22 · load-bearing: yes (the main knob)
- support: S-r1-practice-ops-02/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-02/P2 · rung 1 · fit direct · upstream self
- scope: WAL mode enabled
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-03
- claim: The auto-checkpoint setting belongs to a database connection: sqlite3_wal_autocheckpoint(D,N) applies to connection D, and every new connection starts with auto-checkpoint enabled at 1000 pages (or the compile-time default).
- kind: behaviour
- questions: Q22 · load-bearing: yes (an app that disables it must do so on every connection, which matters for a pool of workers)
- support: S-r1-practice-ops-08/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-08/P3 · rung 1 · fit direct · upstream self
- scope: current docs; "must do so on every connection" is an inference the page does not state
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-04
- claim: By default the automatic checkpoint runs in the thread whose COMMIT pushes the WAL over the threshold, which makes that occasional COMMIT much slower; SQLite's docs say an application that finds this undesirable can disable automatic checkpointing and run periodic checkpoints in a separate thread or process.
- kind: behaviour
- questions: Q22 · load-bearing: yes (the reason for a dedicated checkpointer)
- support: S-r1-practice-ops-01/P2 · rung 1 · fit direct · upstream self
- scope: default configuration
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-05
- claim: `PRAGMA wal_checkpoint` with no argument is equivalent to calling sqlite3_wal_checkpoint(), and `PRAGMA wal_checkpoint(<mode>)` with PASSIVE, FULL, RESTART, TRUNCATE or NOOP is equivalent to calling sqlite3_wal_checkpoint_v2() with that mode.
- kind: behaviour
- questions: Q22 · load-bearing: yes (lets a Python or Go app reach every mode through SQL)
- support: S-r1-practice-ops-02/P3 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-02/P4 · rung 1 · fit direct · upstream self
- scope: current docs; the current pragma page lists NOOP (the version that added it was not checked)
- confidence: high · flags: none
- conflicts: S-r1-practice-ops-01/P9 "FULL and RESTART checkpoints … can only be initiated by a call to sqlite3_wal_checkpoint_v2()" (not a true conflict: the pragma wraps that call; see Speculation and flags)

### C-r1-practice-ops-06
- claim: SQLite's docs say an application can start a checkpoint from any writable database connection on the database by calling sqlite3_wal_checkpoint() or sqlite3_wal_checkpoint_v2().
- kind: behaviour
- questions: Q22 · load-bearing: yes
- support: S-r1-practice-ops-01/P8 · rung 1 · fit direct · upstream self
- scope: current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-07
- claim: sqlite3_wal_hook() registers a callback that runs whenever a transaction commits to the WAL and can call a checkpoint on whatever criteria the application chooses; the automatic checkpoint is a wrapper around this hook, so registering a hook disables the automatic checkpoint.
- kind: behaviour
- questions: Q22, Q27 · load-bearing: no (C API detail; useful as context)
- support: S-r1-practice-ops-01/P7 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-08/P2 · rung 1 · fit direct · upstream self
- scope: C API
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-08
- claim: In WAL mode with `PRAGMA synchronous=NORMAL`, the checkpoint is the only operation that issues a sync, so an application that runs checkpoints in a separate thread or process keeps the thread doing its queries and updates from ever blocking on a sync.
- kind: behaviour
- questions: Q22 · load-bearing: no (a supporting reason for a separate checkpointer; `synchronous` itself belongs to practice-config)
- support: S-r1-practice-ops-01/P3 · rung 1 · fit direct · upstream self
- scope: synchronous=NORMAL; the same paragraph adds that transactions are then not durable after a power failure
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-09
- claim: SQLite's docs say the default 1000-page checkpoint strategy "seems to work well in test applications on workstations" but that other strategies might work better on other platforms or workloads.
- kind: evaluation
- questions: Q22 · load-bearing: no (attributed only)
- support: S-r1-practice-ops-01/P4 · rung 1 · fit direct · upstream self (attributed form only)
- scope: SQLite's own assessment
- confidence: medium · flags: vendor-about-itself
- conflicts: none

### C-r1-practice-ops-10
- claim: Every checkpoint call takes an exclusive "checkpoint" lock, and when another process is already running a checkpoint, the call returns SQLITE_BUSY at once without invoking the busy handler.
- kind: behaviour
- questions: Q22, Q27 · load-bearing: yes (two checkpointers, such as a dedicated checkpointer plus auto-checkpoints in workers, collide this way)
- support: S-r1-practice-ops-03/P5 · rung 1 · fit direct · upstream self
- scope: all modes; the "two checkpointers" example is an inference, not stated by the page
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-11
- claim: A FULL, RESTART or TRUNCATE checkpoint whose busy handler gives up, either before getting the writer lock or while waiting for readers, carries on like a PASSIVE checkpoint and returns SQLITE_BUSY; a PASSIVE checkpoint never invokes the busy handler and may leave the checkpoint unfinished.
- kind: behaviour
- questions: Q22, Q24 · load-bearing: yes (an app that asks for TRUNCATE must check the result)
- support: S-r1-practice-ops-03/P6 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-03/P7 · rung 1 · fit direct · upstream self
- scope: sqlite3_wal_checkpoint_v2() and the pragma form
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-12
- claim: SQLite's docs say that if an application disables the automatic checkpoint, nothing prevents the WAL file from growing excessively.
- kind: behaviour
- questions: Q23 · load-bearing: yes
- support: S-r1-practice-ops-01/P18 · rung 1 · fit direct · upstream self
- scope: auto-checkpoint disabled and no other checkpoint run
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-13
- claim: If a database has many concurrent overlapping readers, so that at least one reader is always active, no checkpoint can complete and the WAL file grows without bound.
- kind: behaviour
- questions: Q23 · load-bearing: yes
- support: S-r1-practice-ops-01/P19 · rung 1 · fit direct · upstream self
- scope: at least one reader always active
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-14
- claim: The WAL file cannot be reset in the middle of a write transaction, so one large change to a large database can produce a large WAL file.
- kind: behaviour
- questions: Q23 · load-bearing: yes
- support: S-r1-practice-ops-01/P21 · rung 1 · fit direct · upstream self
- scope: any version; size behaviour per C-r1-practice-ops-15
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-15
- claim: Since SQLite 3.11.0 (2016-02-15), the WAL written by a single transaction should be proportional to the transaction's size, with each changed page written once; older versions could write the same page several times when the transaction outgrew the page cache.
- kind: version
- questions: Q23 · load-bearing: no
- support: S-r1-practice-ops-01/P22 · rung 1 · fit direct · upstream self
- scope: versions 3.11.0 and later vs. older
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-16
- claim: A checkpoint does not normally truncate the WAL file unless `journal_size_limit` is set; instead SQLite starts overwriting the WAL from the beginning, because overwriting an existing file is normally faster than appending.
- kind: behaviour
- questions: Q23 · load-bearing: yes (why the file does not shrink)
- support: S-r1-practice-ops-01/P16 · rung 1 · fit direct · upstream self
- scope: normal operation
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-17
- claim: Under default settings the WAL accumulates about 1000 pages, about 4MB, before an automatic checkpoint recycles it.
- kind: number
- questions: Q23, Q27 · load-bearing: no (a baseline for "normal" WAL size)
- support: S-r1-practice-ops-01/P16 · rung 1 · fit direct · upstream self
- scope: the 4MB figure assumes the default 4096-byte page size (the page says only "about 4MB")
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-18
- claim: An implicit transaction is committed only when its last active statement finishes; the only way to be sure a statement has finished is to call sqlite3_reset() or sqlite3_finalize() on it, and an open sqlite3_blob also counts as an unfinished statement.
- kind: behaviour
- questions: Q23 · load-bearing: yes (explains how a forgotten, un-reset SELECT keeps a read transaction, and so a reader, alive)
- support: S-r1-practice-ops-09/P1 · rung 1 · fit partial · upstream self
- scope: fit partial: the page does not connect this to WAL growth; the link to C-r1-practice-ops-13 is an inference
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-19
- claim: After BEGIN DEFERRED, a first SELECT starts a read transaction that lasts until an explicit COMMIT or ROLLBACK or a rollback provoked by an error.
- kind: behaviour
- questions: Q23 · load-bearing: no
- support: S-r1-practice-ops-09/P2 · rung 1 · fit direct · upstream self
- scope: BEGIN DEFERRED
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-20
- claim: SQLite's docs say a WAL that grows without bound causes excess disk usage and slow queries, because read performance falls as the WAL grows: each reader must check the WAL, in time proportional to its size.
- kind: behaviour
- questions: Q23, Q27 · load-bearing: yes (why growth matters)
- support: S-r1-practice-ops-01/P17 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-01/P5 · rung 1 · fit direct · upstream self
- scope: general
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-21
- claim: With `PRAGMA journal_size_limit=N` set, each time a transaction commits or the WAL resets, SQLite truncates a WAL file left on disk that is larger than N bytes down to N bytes.
- kind: behaviour
- questions: Q24 · load-bearing: yes
- support: S-r1-practice-ops-02/P8 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-02/P9 · rung 1 · fit direct · upstream self
- scope: per database (schema-qualified pragma)
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-22
- claim: The default `journal_size_limit` is -1, meaning no limit; any negative value means no limit, and zero always truncates WAL files to their minimum size.
- kind: number
- questions: Q24 · load-bearing: yes
- support: S-r1-practice-ops-02/P10 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-02/P9 · rung 1 · fit direct · upstream self
- scope: default build (SQLITE_DEFAULT_JOURNAL_SIZE_LIMIT can change the default)
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-23
- claim: SQLite's docs say checkpoint starvation can be avoided by ensuring times when no process is reading and attempting checkpoints then, and that applications with many concurrent readers might run manual RESTART or TRUNCATE checkpoints, which run to completion before returning.
- kind: behaviour
- questions: Q24 · load-bearing: yes
- support: S-r1-practice-ops-01/P20 · rung 1 · fit direct · upstream self (a recommendation: attributed form)
- scope: many concurrent readers
- confidence: high · flags: none
- conflicts: see C-r1-practice-ops-24

### C-r1-practice-ops-24
- claim: wal.html says the disadvantage of RESTART and TRUNCATE checkpoints is that readers might block while the checkpoint runs.
- kind: behaviour
- questions: Q24 · load-bearing: yes (the cost of the remedy)
- support: S-r1-practice-ops-01/P20 · rung 1 · fit direct · upstream self
- scope: as stated by wal.html §6
- confidence: medium · flags: none
- conflicts: S-r1-practice-ops-03/P1 "this mode blocks new database writer attempts while it is pending, but does not impede readers"; S-r1-practice-ops-02/P5 "RESTART blocks concurrent writers while it is running, but allows readers to proceed."

### C-r1-practice-ops-25
- claim: A RESTART checkpoint, after checkpointing, waits through the busy handler until all readers have finished with the log, so the next writer restarts the WAL from the beginning; TRUNCATE also truncates the WAL file to zero bytes on success.
- kind: behaviour
- questions: Q24 · load-bearing: yes
- support: S-r1-practice-ops-03/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-03/P2 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-02/P6 · rung 1 · fit direct · upstream self
- scope: successful completion (C-r1-practice-ops-11 covers the busy case)
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-26
- claim: wal.html recommends a rollback journal mode for transactions larger than a few dozen megabytes, yet in the same list it says WAL mode has handled large transactions as efficiently as rollback mode since 3.11.0.
- kind: interpretation
- questions: Q23, Q24 · load-bearing: no (owned mostly by criticism; recorded because it bears on growth from large writes)
- support: S-r1-practice-ops-01/P24 · rung 1 · fit direct · upstream self
- scope: wal.html §1 as of the 2026-08-25 update
- confidence: medium · flags: none (tension inside the source; not settled)
- conflicts: none (internal to one page)

### C-r1-practice-ops-27
- claim: SQLite's docs say an automatic backup that copies the database file in the middle of a transaction may capture some old and some new content and so be corrupt.
- kind: behaviour
- questions: Q25 · load-bearing: yes
- support: S-r1-practice-ops-04/P1 · rung 1 · fit direct · upstream self
- scope: file-copy backups
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-28
- claim: SQLite's docs list three backup methods that work even on a live database: the sqlite3_rsync utility (SQLite 3.47.0 and later, over SSH), the `VACUUM INTO` command, and the backup API.
- kind: fact
- questions: Q25 · load-bearing: yes
- support: S-r1-practice-ops-04/P2 · rung 1 · fit direct · upstream self
- scope: current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-29
- claim: SQLite's docs say copying the database file is safe if no transaction is in progress during the copy, and that if the previous write transaction failed, the -wal file must be copied together with the database file.
- kind: behaviour
- questions: Q25, Q26 · load-bearing: yes
- support: S-r1-practice-ops-04/P3 · rung 1 · fit direct · upstream self
- scope: file copy with no transaction in progress
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-30
- claim: The online backup API can copy incrementally, locking the source only during the brief periods when it reads from it, so other users can go on working while an online database is backed up.
- kind: behaviour
- questions: Q25 · load-bearing: yes
- support: S-r1-practice-ops-05/P2 · rung 1 · fit direct · upstream self
- scope: incremental use of sqlite3_backup_step()
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-31
- claim: If another connection writes to the source database between incremental backup steps, SQLite usually restarts the backup at the next step (writes through the same connection handle update the destination instead), and a completed backup is a consistent, up-to-date snapshot of the source.
- kind: behaviour
- questions: Q25 · load-bearing: yes
- support: S-r1-practice-ops-05/P3 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-05/P4 · rung 1 · fit direct · upstream self
- scope: file-based source database
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-32
- claim: An incremental backup that concurrent writes restart often enough may never complete.
- kind: behaviour
- questions: Q25 · load-bearing: no
- support: S-r1-practice-ops-05/P5 · rung 1 · fit direct · upstream self
- scope: frequent writes from other connections during the backup
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-33
- claim: backup.html says a backup that copies the whole source in one sqlite3_backup_step() call holds a read-lock on the source for the whole operation, which prevents any other user from writing to the database.
- kind: behaviour
- questions: Q25 · load-bearing: no
- support: S-r1-practice-ops-05/P6 · rung 1 · fit direct · upstream self
- scope: the page does not say whether this holds in WAL mode, where readers do not block writers; see flags
- confidence: low · flags: none (scope unclear; see Speculation and flags)
- conflicts: none found (not checked against WAL-mode statements)

### C-r1-practice-ops-34
- claim: SQLite's docs say the older lock-then-copy method risks a corrupt backup if a power failure or operating system failure happens during the copy.
- kind: behaviour
- questions: Q25 · load-bearing: no
- support: S-r1-practice-ops-05/P1 · rung 1 · fit direct · upstream self
- scope: the historical method of a shared lock followed by an external file copy
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-35
- claim: The SQLite docs present `VACUUM INTO` as an alternative to the backup API for backing up a live database: its output is minimal in size and purged of deleted content, while the backup API uses fewer CPU cycles and can run incrementally.
- kind: comparison
- questions: Q25 · load-bearing: yes (attributed comparison)
- support: S-r1-practice-ops-06/P1 · rung 1 · fit direct · upstream self (attributed form)
- scope: current docs
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-practice-ops-36
- claim: The output of `VACUUM INTO` is a consistent snapshot of the original database, but an unplanned shutdown or power loss during the command can leave the output incomplete and corrupt; when the source's `synchronous` setting is NORMAL or FULL, SQLite syncs the output file after writing it.
- kind: behaviour
- questions: Q25 · load-bearing: yes
- support: S-r1-practice-ops-06/P3 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-06/P4 · rung 1 · fit direct · upstream self
- scope: current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-37
- claim: The file named in `VACUUM INTO` must either not exist yet or be empty, or the command fails.
- kind: behaviour
- questions: Q25 · load-bearing: no
- support: S-r1-practice-ops-06/P2 · rung 1 · fit direct · upstream self
- scope: current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-38
- claim: The sqlite3 command-line shell has a `.backup ?DB? FILE` dot-command that backs up a database (default "main") to FILE, and `.save` is an alias for it.
- kind: fact
- questions: Q25 · load-bearing: no
- support: S-r1-practice-ops-07/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-07/P2 · rung 1 · fit direct · upstream self
- scope: CLI help listing only; the passage does not say `.backup` uses the backup API
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-39
- claim: SQLite's docs say the WAL file is part of the database's persistent state and should be kept with the database when it is copied or moved; a database file separated from its WAL may lose previously committed transactions or become corrupted.
- kind: behaviour
- questions: Q26 · load-bearing: yes
- support: S-r1-practice-ops-01/P11 · rung 1 · fit direct · upstream self
- scope: whenever a -wal file exists
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-40
- claim: SQLite's docs say the only safe way to remove a WAL file is to open the database with an sqlite3_open() interface and then immediately close it with sqlite3_close().
- kind: behaviour
- questions: Q26 · load-bearing: yes
- support: S-r1-practice-ops-01/P11 · rung 1 · fit direct · upstream self
- scope: current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-41
- claim: The WAL file is usually deleted when the last connection closes, but it may stay on disk after all connections close if the last process exited without cleanly closing its connection or if SQLITE_FCNTL_PERSIST_WAL was used.
- kind: behaviour
- questions: Q26 · load-bearing: no (explains why a leftover -wal is normal and must not be deleted by hand)
- support: S-r1-practice-ops-01/P10 · rung 1 · fit direct · upstream self
- scope: current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-42
- claim: If a hot -wal or -journal file is moved, deleted or renamed after a crash or power failure, SQLite's automatic recovery will not work and the database may go corrupt.
- kind: behaviour
- questions: Q26 · load-bearing: yes
- support: S-r1-practice-ops-04/P4 · rung 1 · fit direct · upstream self
- scope: after a crash or power failure
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-43
- claim: SQLite's docs list as likely to cause corruption: copying a database file without its journal, moving a journal file from one database to another, and overwriting a database file with another without deleting the original's hot journal.
- kind: behaviour
- questions: Q26 · load-bearing: yes
- support: S-r1-practice-ops-04/P5 · rung 1 · fit direct · upstream self
- scope: "journal" covers -journal and -wal (per §1.3 of the same page)
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-44
- claim: Because WAL files are named after the database file, unlinking or renaming an open database and creating a new file under the old name makes the two databases share one WAL file, and recovery for one may use the other's content and corrupt it.
- kind: behaviour
- questions: Q26 · load-bearing: yes
- support: S-r1-practice-ops-04/P6 · rung 1 · fit direct · upstream self
- scope: POSIX-like systems that allow unlinking an open file
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-45
- claim: Processes that open one database file through different hard or soft links use different WAL files, so after one process crashes, another cannot recover its in-progress transaction.
- kind: behaviour
- questions: Q26 · load-bearing: no
- support: S-r1-practice-ops-04/P7 · rung 1 · fit direct · upstream self
- scope: database files with more than one link
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-46
- claim: The -shm file holds no database content and is not needed to recover the database after a crash; the first client to connect to a quiescent database normally truncates it.
- kind: behaviour
- questions: Q26 · load-bearing: yes (the contrast: losing -shm after a crash loses nothing, while losing -wal can)
- support: S-r1-practice-ops-10/P1 · rung 1 · fit direct · upstream self
- scope: crash recovery; says nothing about deleting -shm while connections are open
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-47
- claim: `PRAGMA wal_checkpoint` returns one row of three integers: a busy flag (1 if a FULL, RESTART or TRUNCATE checkpoint was blocked from completing, i.e. the equivalent call would have returned SQLITE_BUSY), the number of pages written to the WAL, and the number of WAL pages moved back into the database; the last two are -1 when the connection is not in WAL mode.
- kind: behaviour
- questions: Q27 · load-bearing: no
- support: S-r1-practice-ops-02/P7 · rung 1 · fit direct · upstream self
- scope: current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-48
- claim: A NOOP checkpoint checkpoints zero frames and exists only to read the frame counts, so `PRAGMA wal_checkpoint(NOOP)` reports the WAL's size and progress without doing any checkpoint work.
- kind: behaviour
- questions: Q27 · load-bearing: no
- support: S-r1-practice-ops-03/P3 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-02/P11 · rung 1 · fit direct · upstream self
- scope: versions that support NOOP (the version that introduced it was not checked)
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-49
- claim: sqlite3_wal_checkpoint_v2() reports through pnLog the total frames in the WAL and through pnCkpt the total frames checkpointed so far; either is -1 on error or outside WAL mode, and both are 0 after a successful TRUNCATE.
- kind: behaviour
- questions: Q27 · load-bearing: no
- support: S-r1-practice-ops-03/P4 · rung 1 · fit direct · upstream self
- scope: C API (zDb naming one database)
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-50
- claim: SQLite's docs say that keeping read performance good requires keeping the WAL small by running checkpoints at regular intervals.
- kind: evaluation
- questions: Q27, Q24 · load-bearing: no
- support: S-r1-practice-ops-01/P5 · rung 1 · fit direct · upstream self (attributed form)
- scope: SQLite's own guidance
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-practice-ops-51
- claim: Before SQLite 3.22.0 (2018-01-22), reading a WAL-mode database required write access; since 3.22.0 a read-only WAL database can be read if the -shm and -wal files already exist and are readable, or the directory is writable so they can be created, or the connection uses the `immutable` query parameter.
- kind: version
- questions: Q28 · load-bearing: no
- support: S-r1-practice-ops-01/P13 · rung 1 · fit direct · upstream self
- support: S-r1-practice-ops-01/P14 · rung 1 · fit direct · upstream self
- scope: 3.22.0 and later
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-52
- claim: The -shm wal-index is created by memory-mapping a file in the same directory as the database, which SQLite's docs give as the only way they found to make all processes share the same memory.
- kind: behaviour
- questions: Q28 · load-bearing: no
- support: S-r1-practice-ops-01/P23 · rung 1 · fit direct · upstream self
- scope: default VFS
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-53
- claim: The WAL file is normally named after the database file with an extra suffix ("-wal"); different naming rules can apply when SQLite is compiled with SQLITE_ENABLE_8_3_NAMES.
- kind: fact
- questions: Q28, Q26 · load-bearing: no
- support: S-r1-practice-ops-01/P12 · rung 1 · fit direct · upstream self
- scope: default build; the "-wal" suffix itself sits in the elided piece of P12 (quoted words on the page)
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-54
- claim: When SQLITE_FCNTL_PERSIST_WAL is set before closing, the final checkpoint still runs but the -wal and -shm files are kept, so processes without write permission can later open the database read-only; if those files are missing, a process that cannot create them cannot open the database unless it is opened as immutable.
- kind: behaviour
- questions: Q28 · load-bearing: no
- support: S-r1-practice-ops-10/P2 · rung 1 · fit direct · upstream self
- scope: the SQLITE_FCNTL_PERSIST_WAL file control (C API)
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-ops-55
- claim: SQLite's docs call it good practice to convert a WAL database to `journal_mode=DELETE` before putting its image on read-only media.
- kind: evaluation
- questions: Q28 · load-bearing: no
- support: S-r1-practice-ops-01/P15 · rung 1 · fit direct · upstream self (attributed form)
- scope: read-only media
- confidence: high · flags: vendor-about-itself
- conflicts: none

## Conflicts
- C-r1-practice-ops-24: S-r1-practice-ops-01/P20 (wal.html §6) says "readers might block while the checkpoint is running" for RESTART and TRUNCATE; S-r1-practice-ops-03/P1 (c3ref) says RESTART "does not impede readers", and S-r1-practice-ops-02/P5 (pragma.html) says RESTART "allows readers to proceed" (all quoted above). All three are sqlite.org pages; not settled. One plausible scope reading (new readers proceed while the checkpointer waits on existing readers) is not stated by any source.

## Speculation and flags
- S-r1-practice-ops-01/P9: wal.html §3.2 says there are "three subtypes" (PASSIVE, FULL, RESTART) and that FULL and RESTART "can only be initiated by a call to sqlite3_wal_checkpoint_v2()"; pragma.html and the c3ref page list five modes (adding TRUNCATE and NOOP) and offer them through `PRAGMA wal_checkpoint(<mode>)`, which wraps the v2 call. The §3.2 text appears older than the other pages; the writer should cite pragma.html or c3ref for the list of modes. Not used as a claim.
- C-r1-practice-ops-26: tension inside wal.html §1 ("recommended … rollback journal modes … larger than a few dozen megabytes" vs "Beginning with version 3.11.0 … WAL mode works as efficiently with large transactions").
- C-r1-practice-ops-33: backup.html's statement that a one-step backup blocks writers reads as if written for rollback mode; the page does not mention WAL. Low confidence for WAL databases.
- C-r1-practice-ops-09, -35, -50, -55: vendor-about-itself (SQLite's own evaluations); use only in the attributed form.
- No rung-2 source was sought; every claim above describes SQLite's behaviour or is an attributed recommendation.

## Unused leads
- https://docs.python.org/3/library/sqlite3.html — Connection.backup() exposes the online backup API to Python apps (driver territory: practice-config).
- https://sqlite.org/rsync.html — sqlite3_rsync details, if the chapter covers it beyond one line.
- https://sqlite.org/c3ref/wal_hook.html — the hook's exact contract (callback return value, per connection).
- https://sqlite.org/fileformat2.html — details of WAL reset and salts (found-rw / found-ckpt territory).
- https://sqlite.org/howtocorrupt.html §8.1 — the WAL-reset bug (owned by criticism).

## Queries
- (no web searches run; every source was fetched directly from the trusted site sqlite.org: wal.html, pragma.html, c3ref/wal_checkpoint_v2.html, c3ref/wal_autocheckpoint.html, howtocorrupt.html, backup.html, lang_vacuum.html, lang_transaction.html, cli.html, walformat.html)

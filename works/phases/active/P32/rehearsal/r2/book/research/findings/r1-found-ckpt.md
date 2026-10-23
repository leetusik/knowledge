# Findings: 20261023-1245-sqlite-wal · round 1 · angle found-ckpt
- researcher: claude-opus-5-5 · status: complete · tool calls: 33

## Questions
- Q7: answered — claims: C-r1-found-ckpt-01, C-r1-found-ckpt-02, C-r1-found-ckpt-03, C-r1-found-ckpt-04, C-r1-found-ckpt-05, C-r1-found-ckpt-06, C-r1-found-ckpt-07, C-r1-found-ckpt-08, C-r1-found-ckpt-09 — note: all from sqlite.org (rung 1). fileformat2 and wal.html both give the step order: sync the WAL, copy, sync the db, then the next writer resets.
- Q8: answered — claims: C-r1-found-ckpt-10, C-r1-found-ckpt-11, C-r1-found-ckpt-12, C-r1-found-ckpt-13, C-r1-found-ckpt-14, C-r1-found-ckpt-15, C-r1-found-ckpt-16, C-r1-found-ckpt-17, C-r1-found-ckpt-18, C-r1-found-ckpt-28 — note: the threshold is set per connection, the committing thread runs the checkpoint, and it is always PASSIVE; the last-close checkpoint has exceptions.
- Q9: contested — claims: C-r1-found-ckpt-04, C-r1-found-ckpt-19, C-r1-found-ckpt-20, C-r1-found-ckpt-21, C-r1-found-ckpt-22, C-r1-found-ckpt-23, C-r1-found-ckpt-24, C-r1-found-ckpt-25, C-r1-found-ckpt-26 — note: answered; the docs disagree with themselves on whether RESTART/TRUNCATE block readers (C-r1-found-ckpt-21 vs C-r1-found-ckpt-29).
- Q10: answered — claims: C-r1-found-ckpt-26, C-r1-found-ckpt-27, C-r1-found-ckpt-28, C-r1-found-ckpt-29, C-r1-found-ckpt-30, C-r1-found-ckpt-31, C-r1-found-ckpt-32, C-r1-found-ckpt-33, C-r1-found-ckpt-34, C-r1-found-ckpt-35 — note: wal.html §3.2 still lists only three modes, which is outdated (TRUNCATE arrived in 3.8.8, NOOP in 3.51.0).

## Sources

### S-r1-found-ckpt-01
- url: https://sqlite.org/wal.html · canonical: sqlite.org/wal.html
- title: Write-Ahead Logging · authors: n/a · publisher: SQLite (sqlite.org)
- date: n/a; updated 2026-08-25 · version: current docs (3.54.x era)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project (Hipp, Wyrick & Company) · upstream: none
- lateral: sqlite.org is the SQLite developers' own site and is the trusted source the dispatch names.
- passages:
  - P1 · § "2.1. Checkpointing": "Of course, one wants to eventually transfer all the transactions that are appended in the WAL file back into the original database. Moving the WAL file transactions back into the database is called a "checkpoint"."
  - P2 · § "2.1. Checkpointing": "By default, SQLite does a checkpoint automatically when the WAL file reaches a threshold size of 1000 pages. (The SQLITE_DEFAULT_WAL_AUTOCHECKPOINT compile-time option can be used to specify a different default.)"
  - P3 · § "2.2. Concurrency": "A checkpoint can run concurrently with readers, however the checkpoint must stop when it reaches a page in the WAL that is past the end mark of any current reader. The checkpoint has to stop at that point because otherwise it might overwrite part of the database file that the reader is actively using. The checkpoint remembers (in the wal-index) how far it got and will resume transferring content from the WAL to the database from where it left off on the next invocation."
  - P4 · § "2.2. Concurrency": "Thus a long-running read transaction can prevent a checkpointer from making progress."
  - P5 · § "2.2. Concurrency": "Whenever a write operation occurs, the writer checks how much progress the checkpointer has made, and if the entire WAL has been transferred into the database and synced and if no readers are making use of the WAL, then the writer will rewind the WAL back to the beginning and start putting new transactions at the beginning of the WAL. This mechanism prevents a WAL file from growing without bound."
  - P6 · § "2.3. Performance Considerations": "The WAL must be synced to persistent storage prior to moving content from the WAL into the database and the database file must be synced prior to resetting the WAL. Checkpoint also requires more seeking. The checkpointer makes an effort to do as many sequential page writes to the database as it can (the pages are transferred from WAL to database in ascending order) but even then there will typically be many seek operations interspersed among the page writes. These factors combine to make checkpoints slower than write transactions."
  - P7 · § "2.3. Performance Considerations": "The default strategy is to allow successive write transactions to grow the WAL until the WAL becomes about 1000 pages in size, then to run a checkpoint operation for each subsequent COMMIT until the WAL is reset to be smaller than 1000 pages. By default, the checkpoint will be run automatically by the same thread that does the COMMIT that pushes the WAL over its size limit. This has the effect of causing most COMMIT operations to be very fast but an occasional COMMIT (those that trigger a checkpoint) to be much slower."
  - P8 · § "2.3. Performance Considerations": "Note that with PRAGMA synchronous set to NORMAL, the checkpoint is the only operation to issue an I/O barrier or sync operation (fsync() on unix or FlushFileBuffers() on windows)."
  - P9 · § "3.1. Automatic Checkpoint": "By default, SQLite will automatically checkpoint whenever a COMMIT occurs that causes the WAL file to be 1000 pages or more in size, or when the last database connection on a database file closes."
  - P10 · § "3.1. Automatic Checkpoint": "(The automatic checkpoint mechanism is implemented as a simple wrapper around sqlite3_wal_hook().)"
  - P11 · § "3.2. Application-Initiated Checkpoints": "There are three subtypes of checkpoints that vary in their aggressiveness: PASSIVE, FULL, and RESTART. The default checkpoint style is PASSIVE, which does as much work as it can without interfering with other database connections, and which might not run to completion if there are concurrent readers or writers. All checkpoints initiated by sqlite3_wal_checkpoint() and by the automatic checkpoint mechanism are PASSIVE."
  - P12 · § "6. Avoiding Excessively Large WAL Files": "In normal cases, new content is appended to the WAL file until the WAL file accumulates about 1000 pages (and is thus about 4MB in size) at which point a checkpoint is automatically run and the WAL file is recycled. The checkpoint does not normally truncate the WAL file (unless the journal_size_limit pragma is set). Instead, it merely causes SQLite to start overwriting the WAL file from the beginning. This is done because it is normally faster to overwrite an existing file than to append. When the last connection to a database closes, that connection does one last checkpoint and then deletes the WAL and its associated shared-memory file, to clean up the disk."
  - P13 · § "6. Avoiding Excessively Large WAL Files": "If an application disables the automatic checkpoint, then there is nothing to prevent the WAL file from growing excessively."
  - P14 · § "6. Avoiding Excessively Large WAL Files": "Checkpoint starvation. A checkpoint is only able to run to completion, and reset the WAL file, if there are no other database connections using the WAL file. If another connection has a read transaction open, then the checkpoint cannot reset the WAL file because doing so might delete content out from under the reader. The checkpoint will do as much work as it can without upsetting the reader, but it cannot run to completion. The checkpoint will start up again where it left off after the next write transaction. This repeats until some checkpoint is able to complete."
  - P15 · § "6. Avoiding Excessively Large WAL Files": "However, if a database has many concurrent overlapping readers and there is always at least one active reader, then no checkpoints will be able to complete and hence the WAL file will grow without bound."
  - P16 · § "6. Avoiding Excessively Large WAL Files": "This scenario can be avoided by ensuring that there are "reader gaps": times when no processes are reading from the database and that checkpoints are attempted during those times. In applications with many concurrent readers, one might also consider running manual checkpoints with the SQLITE_CHECKPOINT_RESTART or SQLITE_CHECKPOINT_TRUNCATE option which will ensure that the checkpoint runs to completion before returning. The disadvantage of using SQLITE_CHECKPOINT_RESTART and SQLITE_CHECKPOINT_TRUNCATE is that readers might block while the checkpoint is running."
  - P17 · § "6. Avoiding Excessively Large WAL Files": "Very large write transactions. A checkpoint can only complete when no other transactions are running, which means the WAL file cannot be reset in the middle of a write transaction. So a large change to a large database might result in a large WAL file."

### S-r1-found-ckpt-02
- url: https://sqlite.org/c3ref/wal_checkpoint_v2.html · canonical: sqlite.org/c3ref/wal_checkpoint_v2.html
- title: Checkpoint a database (SQLite C Interface) · authors: n/a · publisher: SQLite (sqlite.org)
- date: n/a (no date printed) · version: current docs (lists SQLITE_CHECKPOINT_NOOP, so 3.51.0 or later)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the SQLite developers generate this API reference from the comments in sqlite3.h.
- passages:
  - P1 · § "Checkpoint a database": "Checkpoint as many frames as possible without waiting for any database readers or writers to finish, then sync the database file if all frames in the log were checkpointed. The busy-handler callback is never invoked in the SQLITE_CHECKPOINT_PASSIVE mode. On the other hand, passive mode might leave the checkpoint unfinished if there are concurrent readers or writers."
  - P2 · § "Checkpoint a database": "This mode blocks (it invokes the busy-handler callback) until there is no database writer and all readers are reading from the most recent database snapshot. It then checkpoints all frames in the log file and syncs the database file. This mode blocks new database writers while it is pending, but new database readers are allowed to continue unimpeded."
  - P3 · § "Checkpoint a database": "This mode works the same way as SQLITE_CHECKPOINT_FULL with the addition that after checkpointing the log file it blocks (calls the busy-handler callback) until all readers are reading from the database file only. This ensures that the next writer will restart the log file from the beginning. Like SQLITE_CHECKPOINT_FULL, this mode blocks new database writer attempts while it is pending, but does not impede readers."
  - P4 · § "Checkpoint a database": "This mode works the same way as SQLITE_CHECKPOINT_RESTART with the addition that it also truncates the log file to zero bytes just prior to a successful return."
  - P5 · § "Checkpoint a database": "This mode always checkpoints zero frames. The only reason to invoke a NOOP checkpoint is to access the values returned by sqlite3_wal_checkpoint_v2() via output parameters *pnLog and *pnCkpt."
  - P6 · § "Checkpoint a database": "If pnLog is not NULL, then *pnLog is set to the total number of frames in the log file or to -1 if the checkpoint could not run because of an error or because the database is not in WAL mode. If pnCkpt is not NULL,then *pnCkpt is set to the total number of checkpointed frames in the log file (including any that were already checkpointed before the function was called) or to -1 if the checkpoint could not run due to an error or because the database is not in WAL mode. Note that upon successful completion of an SQLITE_CHECKPOINT_TRUNCATE, the log file will have been truncated to zero bytes and so both *pnLog and *pnCkpt will be set to zero."
  - P7 · § "Checkpoint a database": "All calls obtain an exclusive "checkpoint" lock on the database file. If any other process is running a checkpoint operation at the same time, the lock cannot be obtained and SQLITE_BUSY is returned. Even if there is a busy-handler configured, it will not be invoked in this case."
  - P8 · § "Checkpoint a database": "The SQLITE_CHECKPOINT_FULL, RESTART and TRUNCATE modes also obtain the exclusive "writer" lock on the database file. If the writer lock cannot be obtained immediately, and a busy-handler is configured, it is invoked and the writer lock retried until either the busy-handler returns 0 or the lock is successfully obtained. The busy-handler is also invoked while waiting for database readers as described above. If the busy-handler returns 0 before the writer lock is obtained or while waiting for database readers, the checkpoint operation proceeds from that point in the same way as SQLITE_CHECKPOINT_PASSIVE - checkpointing as many frames as possible without blocking any further. SQLITE_BUSY is returned in this case."

### S-r1-found-ckpt-03
- url: https://sqlite.org/pragma.html · canonical: sqlite.org/pragma.html
- title: Pragma statements supported by SQLite · authors: n/a · publisher: SQLite (sqlite.org)
- date: n/a; updated 2026-10-04 · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the SQLite developers' own reference page.
- passages:
  - P1 · § "List Of PRAGMAs" (PRAGMA journal_size_limit): "The journal_size_limit pragma may be used to limit the size of rollback-journal and WAL files left in the file-system after transactions or checkpoints. Each time a transaction is committed or a WAL file resets, SQLite compares the size of the rollback journal file or WAL file left in the file-system to the size limit set by this pragma and if the journal or WAL file is larger it is truncated to the limit."
  - P2 · § "List Of PRAGMAs" (PRAGMA journal_size_limit): "The default journal size limit is -1 (no limit)."
  - P3 · § "List Of PRAGMAs" (PRAGMA wal_autocheckpoint): "This pragma queries or sets the write-ahead log auto-checkpoint interval. When the write-ahead log is enabled (via the journal_mode pragma) a checkpoint will be run automatically whenever the write-ahead log equals or exceeds N pages in length. Setting the auto-checkpoint size to zero or a negative value turns auto-checkpointing off."
  - P4 · § "List Of PRAGMAs" (PRAGMA wal_autocheckpoint): "This pragma is a wrapper around the sqlite3_wal_autocheckpoint() C interface. All automatic checkpoints are PASSIVE."
  - P5 · § "List Of PRAGMAs" (PRAGMA wal_autocheckpoint): "Autocheckpointing is enabled by default with an interval of 1000 or SQLITE_DEFAULT_WAL_AUTOCHECKPOINT."
  - P6 · § "List Of PRAGMAs" (PRAGMA wal_checkpoint): "Invoking this pragma without an argument is equivalent to calling the sqlite3_wal_checkpoint() C interface."
  - P7 · § "List Of PRAGMAs" (PRAGMA wal_checkpoint, PASSIVE): "Checkpoint as many frames as possible without waiting for any database readers or writers to finish. Sync the db file if all frames in the log are checkpointed. This mode is the same as calling the sqlite3_wal_checkpoint() C interface. The busy-handler callback is never invoked in this mode."
  - P8 · § "List Of PRAGMAs" (PRAGMA wal_checkpoint, FULL): "FULL blocks concurrent writers while it is running, but readers can proceed."
  - P9 · § "List Of PRAGMAs" (PRAGMA wal_checkpoint, RESTART): "This mode works the same way as FULL with the addition that after checkpointing the log file it blocks (calls the busy-handler callback) until all readers are finished with the log file. This ensures that the next client to write to the database file restarts the log file from the beginning. RESTART blocks concurrent writers while it is running, but allows readers to proceed."
  - P10 · § "List Of PRAGMAs" (PRAGMA wal_checkpoint, TRUNCATE): "This mode works the same way as RESTART with the addition that the WAL file is truncated to zero bytes upon successful completion."
  - P11 · § "List Of PRAGMAs" (PRAGMA wal_checkpoint): "The wal_checkpoint pragma returns a single row with three integer columns. The first column is usually 0 but will be 1 if a RESTART or FULL or TRUNCATE checkpoint was blocked from completing, for example because another thread or process was actively using the database. In other words, the first column is 0 if the equivalent call to sqlite3_wal_checkpoint_v2() would have returned SQLITE_OK or 1 if the equivalent call would have returned SQLITE_BUSY. The second column is the number of modified pages that have been written to the write-ahead log file. The third column is the number of pages in the write-ahead log file that have been successfully moved back into the database file at the conclusion of the checkpoint."

### S-r1-found-ckpt-04
- url: https://sqlite.org/c3ref/wal_autocheckpoint.html · canonical: sqlite.org/c3ref/wal_autocheckpoint.html
- title: Configure an auto-checkpoint (SQLite C Interface) · authors: n/a · publisher: SQLite (sqlite.org)
- date: n/a · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: API reference written by the SQLite developers.
- passages:
  - P1 · § "Configure an auto-checkpoint": "The sqlite3_wal_autocheckpoint(D,N) is a wrapper around sqlite3_wal_hook() that causes any database on database connection D to automatically checkpoint after committing a transaction if there are N or more frames in the write-ahead log file. Passing zero or a negative value as the N parameter disables automatic checkpoints entirely."
  - P2 · § "Configure an auto-checkpoint": "The callback registered by this function replaces any existing callback registered using sqlite3_wal_hook(). Likewise, registering a callback using sqlite3_wal_hook() disables the automatic checkpoint mechanism configured by this function."
  - P3 · § "Configure an auto-checkpoint": "Checkpoints initiated by this mechanism are PASSIVE."
  - P4 · § "Configure an auto-checkpoint": "Every new database connection defaults to having the auto-checkpoint enabled with a threshold of 1000 or SQLITE_DEFAULT_WAL_AUTOCHECKPOINT pages."

### S-r1-found-ckpt-05
- url: https://sqlite.org/fileformat2.html · canonical: sqlite.org/fileformat2.html
- title: Database File Format · authors: n/a · publisher: SQLite (sqlite.org)
- date: n/a; updated 2025-12-25 · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: spec · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the SQLite developers' own file-format specification.
- passages:
  - P1 · § "4.3. Checkpoint Algorithm": "On a checkpoint, the WAL is first flushed to persistent storage using the xSync method of the VFS. Then valid content of the WAL is transferred into the database file. Finally, the database is flushed to persistent storage using another xSync method call."
  - P2 · § "4.3. Checkpoint Algorithm": "A checkpoint need not run to completion. It might be that some readers are still using older transactions with data that is contained in the database file. In that case, transferring content for newer transactions from the WAL file into the database would delete the content out from under readers still using the older transactions. To avoid that, checkpoints only run to completion if all reader are using the last transaction in the WAL."
  - P3 · § "4.4. WAL Reset": "After a complete checkpoint, if no other connections are in transactions that use the WAL, then subsequent write transactions can overwrite the WAL file from the beginning. This is called "resetting the WAL". At the start of the first new write transaction, the WAL header salt-1 value is incremented and the salt-2 value is randomized. These changes to the salts invalidate old frames in the WAL that have already been checkpointed but not yet overwritten, and prevent them from being checkpointed again."
  - P4 · § "4.4. WAL Reset": "The WAL file can optionally be truncated on a reset, but it need not be. Performance is usually a little better if the WAL is not truncated, since filesystems generally will overwrite an existing file faster than they will grow a file."

### S-r1-found-ckpt-06
- url: https://sqlite.org/walformat.html · canonical: sqlite.org/walformat.html
- title: WAL-mode File Format · authors: n/a · publisher: SQLite (sqlite.org)
- date: n/a; updated 2025-05-10 · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: spec · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the SQLite developers' description of the -wal and -shm files and their locks.
- passages:
  - P1 · § "1.4. File Lifecycles": "If the last client using the database shuts down cleanly by calling sqlite3_close(), then a checkpoint is run automatically in order to transfer all information from the wal file over into the main database, and both the shm file and the wal file are unlinked."
  - P2 · § "1.4. File Lifecycles": "However, if the last client did not call sqlite3_close() before it shut down, or if the last client to disconnect was a read-only client, then the final cleanup operation does not occur and the shm and wal files may still exist on disk even when the database is not in use."
  - P3 · § "2.1.2. The nBackfill field": "this field holds the number of frames in the WAL file which have been copied back into the main database."
  - P4 · § "2.1.2. The nBackfill field": "The nBackfill number is never greater than mxFrame. When nBackfill equals mxFrame, that means that the WAL content has been completely written back into the database and it is ok to reset the WAL if there are no locks held on any of WAL_READ_LOCK(N) for N>0."
  - P5 · § "2.3.1. How the various locks are used": "When a checkpoint runs, if it sees a lock on WAL_READ_LOCK(N), then it must not move WAL content into the main database for more than the first read-mark[N] frames."
  - P6 · § "2.3.1. How the various locks are used": "It is ok for a WAL reset to occur if other connections are holding WAL_READ_LOCK(0) because by holding WAL_READ_LOCK(0), those other connections are promising not to use any content from the WAL."
  - P7 · § "2.3.2. Operations that require locks and which locks those operations use": "When a database connection closes (via sqlite3_close() or sqlite3_close_v2()), an attempt is made to acquire SQLITE_LOCK_EXCLUSIVE. If this attempt is successful, that means the connection that is closing is the last connection to the database. In that case, it is desirable to clean up the WAL and WAL-index files, so the closing connection runs a checkpoint (while holding SQLITE_LOCK_EXCLUSIVE) and this deletes both the WAL and WAL-index files."
  - P8 · § "2.3.2. Operations that require locks and which locks those operations use": "A WAL reset means to rewind the WAL and start adding new frames at the beginning. This occurs while appending new frames to a WAL that has mxFrame equal to nBackfill and which has no locks on WAL_READ_LOCK(1) through WAL_READ_LOCK(4). The WAL_WRITE_LOCK is held."

### S-r1-found-ckpt-07
- url: https://sqlite.org/changes.html · canonical: sqlite.org/changes.html
- title: Release History Of SQLite · authors: n/a · publisher: SQLite (sqlite.org)
- date: n/a; latest entry 2026-10-16 (3.54.1) · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: other (release notes / changelog) · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the official changelog.
- passages:
  - P1 · § "2025-11-04 (3.51.0)": "Add the PRAGMA wal_checkpoint=NOOP; command and the SQLITE_CHECKPOINT_NOOP argument for sqlite3_wal_checkpoint_v2()."
  - P2 · § "2015-01-30 (3.8.8.2)": "Enhance sqlite3_wal_checkpoint_v2(TRUNCATE) interface so that it truncates the WAL file even if there is no checkpoint work to be done."
  - P3 · § "2015-01-16 (3.8.8)": "Added the SQLITE_CHECKPOINT_TRUNCATE option to the sqlite3_wal_checkpoint_v2() interface, with corresponding enhancements to PRAGMA wal_checkpoint."
  - P4 · § "2011-04-12 (3.7.6)": "Added the sqlite3_wal_checkpoint_v2() interface and enhanced the wal_checkpoint pragma to support blocking checkpoints."

## Claims

### C-r1-found-ckpt-01
- claim: In SQLite's WAL mode, a "checkpoint" is the operation that moves the transactions appended to the WAL file back into the original database file.
- kind: definition
- questions: Q7 · load-bearing: yes (the chapter's core definition)
- support: S-r1-found-ckpt-01/P1 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode, current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-02
- claim: According to SQLite's file-format specification, a checkpoint first syncs the WAL to persistent storage, then transfers the valid WAL content into the database file, and finally syncs the database file.
- kind: behaviour
- questions: Q7 · load-bearing: yes (the step-by-step order)
- support: S-r1-found-ckpt-05/P1 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-01/P6 · rung 1 · fit direct · upstream self
- scope: SQLite WAL checkpoint algorithm; both sources have the same owner, so they count as one source for independence
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-03
- claim: SQLite's checkpointer copies pages from the WAL to the database in ascending page order but typically still incurs many seeks, and the SQLite docs say these syncs and seeks make checkpoints slower than write transactions.
- kind: behaviour
- questions: Q7 · load-bearing: no (supporting detail on cost)
- support: S-r1-found-ckpt-01/P6 · rung 1 · fit direct · upstream self
- scope: as described in the SQLite docs; "slower" is the developers' own evaluation and must stay attributed
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-found-ckpt-04
- claim: An SQLite checkpoint that reaches a WAL page past the end mark of any current reader stops there, records in the wal-index how far it got, and resumes from that point on its next invocation.
- kind: behaviour
- questions: Q7, Q9 · load-bearing: yes (explains partial checkpoints)
- support: S-r1-found-ckpt-01/P3 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-06/P3 · rung 1 · fit partial · upstream self (the wal-index field nBackfill holds the progress: "the number of frames in the WAL file which have been copied back into the main database")
- scope: SQLite WAL mode
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-05
- claim: In SQLite, a checkpoint does not itself rewind the WAL. Once the entire WAL has been checkpointed and synced and no readers are using the WAL, the next write operation rewinds the WAL and starts writing new transactions at its beginning ("resetting the WAL").
- kind: behaviour
- questions: Q7 · load-bearing: yes (who resets the WAL and when)
- support: S-r1-found-ckpt-01/P5 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-05/P3 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-06/P8 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode; the RESTART and TRUNCATE modes only ensure that the next writer restarts the log (see C-r1-found-ckpt-29 and -30)
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-06
- claim: At the start of the first write transaction after a WAL reset, SQLite increments the WAL header's salt-1 value and randomizes salt-2. This invalidates old frames that were already checkpointed but not yet overwritten, so they are not checkpointed again.
- kind: behaviour
- questions: Q7 · load-bearing: no (mechanism detail; found-rw owns the frame format)
- support: S-r1-found-ckpt-05/P3 · rung 1 · fit direct · upstream self
- scope: SQLite WAL file format
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-07
- claim: Unless the journal_size_limit pragma is set, an SQLite checkpoint does not normally truncate the -wal file. SQLite overwrites the WAL from the beginning instead, because overwriting an existing file is normally faster than growing one.
- kind: behaviour
- questions: Q7, Q10 · load-bearing: yes (why the -wal file keeps its size)
- support: S-r1-found-ckpt-01/P12 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-05/P4 · rung 1 · fit direct · upstream self
- scope: SQLite default configuration; TRUNCATE mode is the exception (C-r1-found-ckpt-30)
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-08
- claim: With PRAGMA journal_size_limit set, each time an SQLite WAL file resets, SQLite truncates the WAL file to that limit if the file is larger. The default limit is -1, meaning no limit.
- kind: behaviour
- questions: Q7 · load-bearing: no (bounding the file belongs mostly to practice-ops)
- support: S-r1-found-ckpt-03/P1 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-03/P2 · rung 1 · fit direct · upstream self
- scope: SQLite, default build
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-09
- claim: The SQLite docs state that in WAL mode with PRAGMA synchronous=NORMAL, the checkpoint is the only operation that issues an I/O barrier or sync (fsync() on Unix, FlushFileBuffers() on Windows).
- kind: behaviour
- questions: Q7 · load-bearing: no (the link to synchronous belongs to practice-config)
- support: S-r1-found-ckpt-01/P8 · rung 1 · fit direct · upstream self
- scope: WAL mode with synchronous=NORMAL
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-10
- claim: By default, SQLite's automatic checkpoint threshold is 1000 pages; the compile-time option SQLITE_DEFAULT_WAL_AUTOCHECKPOINT can set a different default.
- kind: number
- questions: Q8 · load-bearing: yes
- support: S-r1-found-ckpt-01/P2 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-03/P5 · rung 1 · fit direct · upstream self
- scope: SQLite default build; a particular distribution's build may differ
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-11
- claim: The SQLite docs describe a WAL of about 1000 pages as "about 4MB in size".
- kind: number
- questions: Q8 · load-bearing: no (size intuition; depends on the page size, with 4096 bytes implied)
- support: S-r1-found-ckpt-01/P12 · rung 1 · fit direct · upstream self
- scope: as the docs state it; holds for a 4096-byte page size, which the passage doesn't state
- confidence: medium · flags: none
- conflicts: none

### C-r1-found-ckpt-12
- claim: By default, SQLite runs an automatic checkpoint whenever a COMMIT makes the WAL file 1000 pages or more in size, and when the last database connection on a database file closes.
- kind: behaviour
- questions: Q8 · load-bearing: yes
- support: S-r1-found-ckpt-01/P9 · rung 1 · fit direct · upstream self
- scope: SQLite default configuration
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-13
- claim: By default, SQLite's automatic checkpoint runs in the same thread that performs the COMMIT pushing the WAL over its size limit. As a result, most COMMITs are very fast, while the occasional COMMIT that triggers a checkpoint is much slower.
- kind: behaviour
- questions: Q8 · load-bearing: yes (which connection runs it)
- support: S-r1-found-ckpt-01/P7 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-04/P1 · rung 1 · fit partial · upstream self ("automatically checkpoint after committing a transaction")
- scope: default automatic checkpointing
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-14
- claim: Under SQLite's default strategy, once the WAL reaches about 1000 pages, a checkpoint runs on each subsequent COMMIT until the WAL is reset to be smaller than 1000 pages.
- kind: behaviour
- questions: Q8, Q9 · load-bearing: yes (explains repeated checkpoint attempts)
- support: S-r1-found-ckpt-01/P7 · rung 1 · fit direct · upstream self
- scope: default automatic checkpointing
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-15
- claim: PRAGMA wal_autocheckpoint=N makes SQLite run a checkpoint automatically whenever the WAL equals or exceeds N pages; setting N to zero or a negative value turns automatic checkpointing off.
- kind: behaviour
- questions: Q8 · load-bearing: yes
- support: S-r1-found-ckpt-03/P3 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-04/P1 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-16
- claim: The SQLite auto-checkpoint setting belongs to a database connection. sqlite3_wal_autocheckpoint(D,N) makes the databases on connection D checkpoint after a commit when the WAL has N or more frames, and every new connection starts with auto-checkpoint enabled at 1000 pages (or SQLITE_DEFAULT_WAL_AUTOCHECKPOINT).
- kind: behaviour
- questions: Q8 · load-bearing: yes (setting it on one worker's connection does not change another's)
- support: S-r1-found-ckpt-04/P1 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-04/P4 · rung 1 · fit direct · upstream self
- scope: the SQLite C interface, which PRAGMA wal_autocheckpoint wraps (S-r1-found-ckpt-03/P4)
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-17
- claim: SQLite's automatic checkpoint is implemented as a wrapper around sqlite3_wal_hook(), and registering a callback with sqlite3_wal_hook() disables the automatic checkpoint mechanism that sqlite3_wal_autocheckpoint() configures.
- kind: behaviour
- questions: Q8 · load-bearing: no (C API detail, at the edge of "leave out")
- support: S-r1-found-ckpt-01/P10 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-04/P2 · rung 1 · fit direct · upstream self
- scope: SQLite C interface
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-18
- claim: When the last connection to an SQLite WAL database closes cleanly with sqlite3_close() and can take an exclusive lock, it runs a checkpoint and deletes the -wal and -shm files. If the last client did not call sqlite3_close() or was a read-only client, this cleanup does not happen and the files may remain.
- kind: behaviour
- questions: Q8 · load-bearing: yes (the "on last close" checkpoint and its exceptions)
- support: S-r1-found-ckpt-06/P7 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-06/P1 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-06/P2 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-01/P12 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode without SQLITE_FCNTL_PERSIST_WAL (found-shm owns the file life cycle)
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-19
- claim: An SQLite checkpoint runs to completion only if all readers are using the last transaction in the WAL, so a long-running read transaction on an older snapshot can prevent the checkpointer from making progress.
- kind: behaviour
- questions: Q9 · load-bearing: yes
- support: S-r1-found-ckpt-05/P2 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-01/P4 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-06/P5 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-20
- claim: The SQLite docs define "checkpoint starvation" as follows. A checkpoint can run to completion and reset the WAL only if no other connection is using the WAL. While another connection has a read transaction open, the checkpoint does as much as it can but cannot complete, and it restarts where it left off after the next write transaction.
- kind: definition
- questions: Q9 · load-bearing: yes
- support: S-r1-found-ckpt-01/P14 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode (attributed definition)
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-21
- claim: According to the SQLite docs, if a database has so many concurrent overlapping readers that at least one reader is always active, no checkpoint can complete and the WAL file grows without bound. The docs' remedies are "reader gaps" during which checkpoints are attempted, or manual RESTART or TRUNCATE checkpoints, which the same page says might block readers.
- kind: behaviour
- questions: Q9 · load-bearing: yes
- support: S-r1-found-ckpt-01/P15 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-01/P16 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode; the remedy is the developers' recommendation (attributed)
- confidence: high · flags: none
- conflicts: S-r1-found-ckpt-02/P3 "Like SQLITE_CHECKPOINT_FULL, this mode blocks new database writer attempts while it is pending, but does not impede readers." (on the remedy's side effect; see Conflicts)

### C-r1-found-ckpt-22
- claim: In SQLite, a WAL reset is still allowed while other connections hold WAL_READ_LOCK(0), because those connections have promised to read only from the database file, not from the WAL. Only read locks with N>0 block a reset.
- kind: behaviour
- questions: Q9 · load-bearing: no (lock detail; found-shm owns locks)
- support: S-r1-found-ckpt-06/P6 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-06/P4 · rung 1 · fit direct · upstream self
- scope: SQLite WAL-index locking
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-23
- claim: In SQLite, the WAL cannot be reset in the middle of a write transaction, so a large change to a large database can make the WAL file very large.
- kind: behaviour
- questions: Q9 · load-bearing: yes (a writer prevents the reset)
- support: S-r1-found-ckpt-01/P17 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-24
- claim: If an SQLite application disables the automatic checkpoint, nothing prevents the WAL file from growing excessively.
- kind: behaviour
- questions: Q9 · load-bearing: no (overlaps practice-ops)
- support: S-r1-found-ckpt-01/P13 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode with auto-checkpoint disabled and no manual checkpoints
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-25
- claim: Every SQLite checkpoint call takes an exclusive "checkpoint" lock. If another process is already running a checkpoint, the call returns SQLITE_BUSY without invoking any configured busy handler.
- kind: behaviour
- questions: Q9 · load-bearing: yes (a checkpoint can itself return SQLITE_BUSY)
- support: S-r1-found-ckpt-02/P7 · rung 1 · fit direct · upstream self
- scope: sqlite3_wal_checkpoint_v2() and the PRAGMA that wraps it
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-26
- claim: SQLite's FULL, RESTART and TRUNCATE checkpoints also take the exclusive writer lock, and they call the busy handler while waiting for that lock or for readers. If the busy handler gives up (returns 0), the checkpoint continues like a PASSIVE one, copying what it can without blocking further, and returns SQLITE_BUSY.
- kind: behaviour
- questions: Q9, Q10 · load-bearing: yes
- support: S-r1-found-ckpt-02/P8 · rung 1 · fit direct · upstream self
- scope: sqlite3_wal_checkpoint_v2() modes FULL, RESTART, TRUNCATE
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-27
- claim: SQLite's PASSIVE checkpoint copies as many frames as it can without waiting for any reader or writer, syncs the database file only if all frames in the log were checkpointed, and never invokes the busy handler. It may leave the checkpoint unfinished when there are concurrent readers or writers.
- kind: behaviour
- questions: Q10, Q9 · load-bearing: yes
- support: S-r1-found-ckpt-02/P1 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-03/P7 · rung 1 · fit direct · upstream self
- scope: SQLite current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-28
- claim: All SQLite automatic checkpoints are PASSIVE, as are all checkpoints started by sqlite3_wal_checkpoint() or by PRAGMA wal_checkpoint without an argument.
- kind: behaviour
- questions: Q8, Q10 · load-bearing: yes
- support: S-r1-found-ckpt-01/P11 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-03/P4 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-03/P6 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-04/P3 · rung 1 · fit direct · upstream self
- scope: SQLite current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-29
- claim: SQLite's FULL checkpoint waits (invoking the busy handler) until there is no writer and all readers are reading the most recent snapshot, then checkpoints all frames and syncs the database file. RESTART does the same and then also waits until all readers read from the database file only, which ensures the next writer restarts the log from the beginning. Both block new writers while pending, and the API reference says neither impedes readers.
- kind: behaviour
- questions: Q10 · load-bearing: yes
- support: S-r1-found-ckpt-02/P2 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-02/P3 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-03/P8 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-03/P9 · rung 1 · fit direct · upstream self
- scope: sqlite3_wal_checkpoint_v2() and PRAGMA wal_checkpoint(FULL|RESTART), current docs
- confidence: high · flags: none
- conflicts: S-r1-found-ckpt-01/P16 "The disadvantage of using SQLITE_CHECKPOINT_RESTART and SQLITE_CHECKPOINT_TRUNCATE is that readers might block while the checkpoint is running."

### C-r1-found-ckpt-30
- claim: SQLite's TRUNCATE checkpoint works like RESTART and also truncates the WAL file to zero bytes just before a successful return, after which both reported frame counts (log and checkpointed) are zero.
- kind: behaviour
- questions: Q10 · load-bearing: yes
- support: S-r1-found-ckpt-02/P4 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-02/P6 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-03/P10 · rung 1 · fit direct · upstream self
- scope: SQLite 3.8.8 and later (C-r1-found-ckpt-34)
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-31
- claim: SQLite's NOOP checkpoint mode, added in SQLite 3.51.0 (2025-11-04), checkpoints zero frames and exists only to read the reported log and checkpointed frame counts.
- kind: behaviour
- questions: Q10 · load-bearing: no (a fifth mode that only reports)
- support: S-r1-found-ckpt-02/P5 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-07/P1 · rung 1 · fit direct · upstream self
- scope: SQLite 3.51.0 and later
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-32
- claim: sqlite3_wal_checkpoint_v2() reports through pnLog the total number of frames in the WAL file and through pnCkpt the total number of checkpointed frames in it, including frames checkpointed before the call. Both are -1 if the checkpoint could not run because of an error or because the database is not in WAL mode.
- kind: behaviour
- questions: Q10 · load-bearing: yes
- support: S-r1-found-ckpt-02/P6 · rung 1 · fit direct · upstream self
- scope: SQLite C interface with a single named database (the values are undefined when zDb is NULL)
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-33
- claim: PRAGMA wal_checkpoint returns one row of three integers. The first is 0, or 1 if a FULL, RESTART or TRUNCATE checkpoint was blocked from completing (the equivalent call would have returned SQLITE_BUSY). The second is the number of modified pages written to the WAL file. The third is the number of WAL pages moved back into the database file by the end of the checkpoint.
- kind: behaviour
- questions: Q10 · load-bearing: yes
- support: S-r1-found-ckpt-03/P11 · rung 1 · fit direct · upstream self
- scope: SQLite current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-34
- claim: SQLite 3.7.6 (2011-04-12) added sqlite3_wal_checkpoint_v2() and blocking checkpoints, and 3.8.8 (2015-01-16) added the TRUNCATE mode. From 3.8.8.2 (2015-01-30), TRUNCATE truncates the WAL file even when there is no checkpoint work to do.
- kind: version
- questions: Q10 · load-bearing: no (history; useful for old system SQLite builds)
- support: S-r1-found-ckpt-07/P4 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-07/P3 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-07/P2 · rung 1 · fit direct · upstream self
- scope: release history as of 3.54.1
- confidence: high · flags: none
- conflicts: none

### C-r1-found-ckpt-35
- claim: The WAL overview page (wal.html §3.2) still says there are "three subtypes of checkpoints" (PASSIVE, FULL and RESTART), while the API reference also documents TRUNCATE and NOOP.
- kind: fact
- questions: Q10 · load-bearing: no (warns the writer about outdated wording)
- support: S-r1-found-ckpt-01/P11 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-02/P4 · rung 1 · fit direct · upstream self
- support: S-r1-found-ckpt-02/P5 · rung 1 · fit direct · upstream self
- scope: docs as accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

## Conflicts
- C-r1-found-ckpt-29 / C-r1-found-ckpt-21: S-r1-found-ckpt-01/P16 (wal.html §6) says "readers might block while the checkpoint is running" with RESTART and TRUNCATE. S-r1-found-ckpt-02/P3 (c3ref) says RESTART "does not impede readers", and S-r1-found-ckpt-03/P9 (pragma.html) says RESTART "allows readers to proceed". All three are the SQLite project's own docs. Not settled. It would be settled by the source code (wal.c) or a reproduction showing whether a new read transaction waits while a RESTART or TRUNCATE checkpoint holds its locks.
- C-r1-found-ckpt-35: the docs are inconsistent over time: wal.html lists three modes, c3ref lists five. This is not a factual dispute: TRUNCATE was added in 3.8.8 and NOOP in 3.51.0 (S-r1-found-ckpt-07).

## Speculation and flags
- C-r1-found-ckpt-03: an evaluation by the vendor of its own product ("These factors combine to make checkpoints slower than write transactions").
- S-r1-found-ckpt-01: §2.3 says the default strategy "seems to work well in test applications on workstations, but other strategies might work better", a hedged judgement by the developers; not claimed.
- C-r1-found-ckpt-11: "about 4MB" assumes the default 4096-byte page; the passage doesn't state the page size.
- S-r1-found-ckpt-01/P11 (§3.2): the text also says FULL and RESTART "can only be initiated by a call to sqlite3_wal_checkpoint_v2()", yet PRAGMA wal_checkpoint(FULL) and the other modes wrap that call (S-r1-found-ckpt-03). The two don't contradict each other, but the wording could mislead.

## Unused leads
- https://sqlite.org/c3ref/wal_hook.html — custom checkpoint policies through the commit hook (C API; practice-ops).
- https://sqlite.org/pragma.html#pragma_checkpoint_fullfsync — the sync that checkpoints use on macOS (changes.html notes that the header fsync at a WAL reset follows the checkpoint sync settings).
- https://sqlite.org/wal.html#the_wal_reset_bug — the WAL-reset bug (owned by criticism).

## Queries
- (no web searches run; every source was fetched directly from the trusted sqlite.org pages named in the dispatch)
- fetch sqlite.org/wal.html → useful
- fetch sqlite.org/c3ref/wal_checkpoint_v2.html → useful
- fetch sqlite.org/pragma.html → useful
- fetch sqlite.org/c3ref/wal_autocheckpoint.html → useful
- fetch sqlite.org/fileformat2.html → useful
- fetch sqlite.org/walformat.html → useful
- fetch sqlite.org/changes.html → useful

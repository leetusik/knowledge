# Findings: 20261023-1245-sqlite-wal · round 1 · angle found-rw
- researcher: claude-opus-5-5 · status: complete · tool calls: 27

## Questions
- Q1: answered — claims: C-r1-found-rw-01, C-r1-found-rw-02, C-r1-found-rw-03, C-r1-found-rw-04 — note: commits are appended to the -wal file as frames; the main file only changes at a checkpoint.
- Q2: answered — claims: C-r1-found-rw-05, C-r1-found-rw-06, C-r1-found-rw-07, C-r1-found-rw-08, C-r1-found-rw-09, C-r1-found-rw-10 — note: end mark = mxFrame recorded at read-transaction start, held until the transaction ends; when a transaction starts depends on autocommit vs BEGIN DEFERRED.
- Q3: answered — claims: C-r1-found-rw-11, C-r1-found-rw-12, C-r1-found-rw-13, C-r1-found-rw-14, C-r1-found-rw-15, C-r1-found-rw-16 — note: one WAL file, one exclusive write lock; readers and writer do not block each other, except during recovery (and checkpoint modes, which are found-ckpt's).
- Q4: answered — claims: C-r1-found-rw-17, C-r1-found-rw-18, C-r1-found-rw-19, C-r1-found-rw-20, C-r1-found-rw-21, C-r1-found-rw-22, C-r1-found-rw-23, C-r1-found-rw-24, C-r1-found-rw-25 — note: torn commit = frames not ending in a valid commit frame; cumulative checksum + salts decide validity; recovery stops at first bad checksum.
- Q5: answered — claims: C-r1-found-rw-26, C-r1-found-rw-27, C-r1-found-rw-28 — note: rollback journal keeps old content in the journal and writes new into the db; WAL is the inverse; WAL arrived in 3.7.0 (2010-07-21).

## Sources

### S-r1-found-rw-01
- url: https://www.sqlite.org/wal.html · canonical: www.sqlite.org/wal.html
- title: Write-Ahead Logging · authors: not printed · publisher: SQLite (sqlite.org)
- date: not printed in page text · version: current documentation as of access (mentions releases up to 3.22.0 and later)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project (Hipp, Wyrick & Company) · upstream: none
- lateral: sqlite.org is the SQLite project's own site; rung 1 for how SQLite's WAL works, rung 3 for evaluations of WAL ("significantly faster").
- passages:
  - P1 · § "1. Overview": "WAL provides more concurrency as readers do not block writers and a writer does not block readers. Reading and writing can proceed concurrently."
  - P2 · § "2. How WAL Works": "The WAL approach inverts this. The original content is preserved in the database file and the changes are appended into a separate WAL file."
  - P3 · § "2. How WAL Works": "A COMMIT occurs when a special record indicating a commit is appended to the WAL. Thus a COMMIT can happen without ever writing to the original database, which allows readers to continue operating from the original unaltered database while changes are simultaneously being committed into the WAL. Multiple transactions can be appended to the end of a single WAL file."
  - P4 · § "2.1. Checkpointing": "Moving the WAL file transactions back into the database is called a "checkpoint"."
  - P5 · § "2.2. Concurrency": "When a read operation begins on a WAL-mode database, it first remembers the location of the last valid commit record in the WAL. Call this point the "end mark". Because the WAL can be growing and adding new commit records while various readers connect to the database, each reader can potentially have its own end mark. But for any particular reader, the end mark is unchanged for the duration of the transaction, thus ensuring that a single read transaction only sees the database content as it existed at a single point in time."
  - P6 · § "2.2. Concurrency": "When a reader needs a page of content, it first checks the WAL to see if that page appears there, and if so it pulls in the last copy of the page that occurs in the WAL prior to the reader's end mark. If no copy of the page exists in the WAL prior to the reader's end mark, then the page is read from the original database file."
  - P7 · § "2.2. Concurrency": "a data structure called the "wal-index" is maintained in shared memory which helps readers locate pages in the WAL quickly and with a minimum of I/O."
  - P8 · § "2.2. Concurrency": "Writers merely append new content to the end of the WAL file. Because writers do nothing that would interfere with the actions of readers, writers and readers can run at the same time. However, since there is only one WAL file, there can only be one writer at a time."
  - P9 · § "2. How WAL Works": "The traditional rollback journal works by writing a copy of the original unchanged database content into a separate rollback journal file and then writing changes directly into the database file. In the event of a crash or ROLLBACK, the original content contained in the rollback journal is played back into the database file to revert the database file to its original state. The COMMIT occurs when the rollback journal is deleted."
  - P10 · § "1. Overview": "The default method by which SQLite implements atomic commit and rollback is a rollback journal. Beginning with version 3.7.0 (2010-07-21), a new "Write-Ahead Log" option (hereafter referred to as "WAL") is available."
  - P11 · § "2.3. Performance Considerations": "Write transactions are very fast since they only involve writing the content once (versus twice for rollback-journal transactions) and because the writes are all sequential."
  - P12 · § "2.2. Concurrency": "Whenever a write operation occurs, the writer checks how much progress the checkpointer has made, and if the entire WAL has been transferred into the database and synced and if no readers are making use of the WAL, then the writer will rewind the WAL back to the beginning and start putting new transactions at the beginning of the WAL."

### S-r1-found-rw-02
- url: https://www.sqlite.org/fileformat2.html · canonical: www.sqlite.org/fileformat2.html
- title: Database File Format · authors: not printed · publisher: SQLite (sqlite.org)
- date: not printed in page text · version: current documentation as of access (WAL file format version 3007000)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: spec · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the project's normative file-format specification; rung 1 for the WAL file layout and reader algorithm.
- passages:
  - P1 · § "4.1. WAL File Format": "A WAL file consists of a header followed by zero or more "frames". Each frame records the revised content of a single page from the database file. All changes to the database are recorded by writing frames into the WAL. Transactions commit when a frame is written that contains a commit marker. A single WAL can and usually does record multiple transactions."
  - P2 · § "4.1. WAL File Format": "The WAL header is 32 bytes in size and consists of the following eight big-endian 32-bit unsigned integer values:"
  - P3 · § "4.1. WAL File Format": "Magic number. 0x377f0682 or 0x377f0683"
  - P4 · § "4.1. WAL File Format": "File format version. Currently 3007000."
  - P5 · § "4.1. WAL File Format": "Checkpoint sequence number"
  - P6 · § "4.1. WAL File Format": "Salt-1: random integer incremented with each checkpoint"
  - P7 · § "4.1. WAL File Format": "Salt-2: a different random number for each checkpoint"
  - P8 · § "4.1. WAL File Format": "Checksum-1: First part of a checksum on the first 24 bytes of header"
  - P9 · § "4.1. WAL File Format": "Each frame consists of a 24-byte frame-header followed by a page-size bytes of page data. The frame-header is six big-endian 32-bit unsigned integer values, as follows:"
  - P10 · § "4.1. WAL File Format": "For commit records, the size of the database file in pages after the commit. For all other records, zero."
  - P11 · § "4.1. WAL File Format": "Checksum-1: Cumulative checksum up through and including this page"
  - P12 · § "4.1. WAL File Format": "A frame is considered valid if and only if the following conditions are true:"
  - P13 · § "4.1. WAL File Format": "The salt-1 and salt-2 values in the frame-header match salt values in the wal-header"
  - P14 · § "4.1. WAL File Format": "The checksum values in the final 8 bytes of the frame-header exactly match the checksum computed consecutively on the first 24 bytes of the WAL header and the first 8 bytes and the content of all frames up to and including the current frame."
  - P15 · § "4.1. WAL File Format": "Checksums and counters attached to each frame are used to determine which frames within the WAL are valid and which are leftovers from prior checkpoints."
  - P16 · § "4.4. WAL Reset": "At the start of the first new write transaction, the WAL header salt-1 value is incremented and the salt-2 value is randomized. These changes to the salts invalidate old frames in the WAL that have already been checkpointed but not yet overwritten, and prevent them from being checkpointed again."
  - P17 · § "4.5. Reader Algorithm": "To read a page from the database (call it page number P), a reader first checks the WAL to see if it contains page P. If so, then the last valid instance of page P that is followed by a commit frame or is a commit frame itself becomes the value read. If the WAL contains no copies of page P that are valid and which are a commit frame or are followed by a commit frame, then page P is read from the database file."
  - P18 · § "4.5. Reader Algorithm": "To start a read transaction, the reader records the number of value frames in the WAL as "mxFrame". (More detail) The reader uses this recorded mxFrame value for all subsequent read operations. New transactions can be appended to the WAL, but as long as the reader uses its original mxFrame value and ignores subsequently appended content, the reader will see a consistent snapshot of the database from a single point in time."
  - P19 · § "4.6. WAL-Index Format": "The wal-index is transient. After a crash, the wal-index is reconstructed from the original WAL file."
  - P20 · § "4. The Write-Ahead Log": "Beginning with version 3.7.0 (2010-07-21), SQLite supports a new transaction control mechanism called "write-ahead log" or "WAL". When a database is in WAL mode, all connections to that database must use the WAL. A particular database will use either a rollback journal or a WAL, but not both at the same time."
  - P21 · § "4.2. Checksum Algorithm": "The outputs s0 and s1 are both weighted checksums using Fibonacci weights in reverse order."

### S-r1-found-rw-03
- url: https://www.sqlite.org/isolation.html · canonical: www.sqlite.org/isolation.html
- title: Isolation In SQLite · authors: not printed · publisher: SQLite (sqlite.org)
- date: not printed in page text · version: current documentation as of access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the project's own description of its isolation guarantees; rung 1 for SQLite's behaviour.
- passages:
  - P1 · § "Isolation Between Database Connections": "SQLite implements serializable transactions by actually serializing the writes. There can only be a single writer at a time to an SQLite database. There can be multiple database connections open at the same time, and all of those database connections can write to the database file, but they have to take turns."
  - P2 · § "Isolation And Concurrency": "In WAL mode, SQLite exhibits "snapshot isolation". When a read transaction starts, that reader continues to see an unchanging "snapshot" of the database file as it existed at the moment in time when the read transaction started. Any write transactions that commit while the read transaction is active are still invisible to the read transaction, because the reader is seeing a snapshot of database file from a prior moment in time."
  - P3 · § "Isolation And Concurrency": "If X wants to see the changes that Y made, then X must end its read transaction and start a new one (by running COMMIT followed by another BEGIN.)"
  - P4 · § "Isolation And Concurrency": "The attempt by X to escalate its transaction from a read transaction to a write transaction fails with an SQLITE_BUSY_SNAPSHOT error because the snapshot of the database being viewed by X is no longer the latest version of the database. If X were allowed to write, it would fork the history of the database file, which is something SQLite does not support."
  - P5 · § "Isolation And Concurrency": "Since version 3.7.0 (2010-07-21), SQLite also supports "WAL mode". In WAL mode, changes are not written to the original database file. Instead, changes go into a separate "write-ahead log" or "WAL" file. Later, after the transaction commits, those changes will be moved from the WAL file back into the original database in an operation called "checkpoint"."
  - P6 · § "Isolation And Concurrency": "In rollback mode, changes are written directly into the database file, while simultaneously a separate rollback journal file is constructed that is able to restore the database to its original state if the transaction rolls back."

### S-r1-found-rw-04
- url: https://www.sqlite.org/walformat.html · canonical: www.sqlite.org/walformat.html
- title: WAL-mode File Format · authors: not printed · publisher: SQLite (sqlite.org)
- date: not printed in page text · version: current documentation as of access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: spec · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the project's own description of the -wal/-shm files, locks and recovery; rung 1.
- passages:
  - P1 · § "1.2. The Write-Ahead-Log or -wal File": "The write-ahead log or "wal" file is a roll-forward journal that records transactions that have been committed but not yet applied to the main database."
  - P2 · § "2.1.1. The mxFrame field": "Because WAL frames are numbered starting with 1, mxFrame is also the index of the last valid commit frame in the WAL. A commit frame is a frame that has a non-zero "size of database" value in bytes 4 through 7 of the frame header, and that indicates the end of a transaction."
  - P3 · § "2.3.1. How the various locks are used": "An EXCLUSIVE WAL_WRITE_LOCK is held by any connection that is appending content to the end of the WAL. Hence, only a single process at a time can append content to the WAL."
  - P4 · § "3. Recovery": "Recovery works by doing a single pass over the WAL, from beginning to end. The checksums are verified on each frame of the WAL as it is read. The scan stops at the end of the file or at the first invalid checksum. The mxFrame field is set to the index of the last valid commit frame in WAL."
  - P5 · § "3. Recovery": "Recovery is run by the first thread to connect to a WAL-mode database. Recovery restores the WAL-index so that it accurately describes the WAL file."
  - P6 · § "3. Recovery": "In other words, all locks associated with the WAL-index except for WAL_READ_LOCK(0) are held exclusively. This prevents any other thread from writing the database and from reading any transactions that are held in the WAL, until the recovery is complete."
  - P7 · § "1.3. The Wal-Index or -shm file": "The shm file does not contain any database content and is not required to recover the database following a crash."

### S-r1-found-rw-05
- url: https://www.sqlite.org/lang_transaction.html · canonical: www.sqlite.org/lang_transaction.html
- title: Transaction · authors: not printed · publisher: SQLite (sqlite.org)
- date: not printed in page text · version: current documentation as of access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the project's SQL reference for transactions; rung 1.
- passages:
  - P1 · § "2. Transactions": "Any command that accesses the database (basically, any SQL command, except a few PRAGMA statements) will automatically start a transaction if one is not already in effect. Automatically started transactions are committed when the last SQL statement finishes."
  - P2 · § "2.1. Read transactions versus write transactions": "SQLite supports multiple simultaneous read transactions coming from separate database connections, possibly in separate threads or processes, but only one simultaneous write transaction."
  - P3 · § "2.1. Read transactions versus write transactions": "While its read transaction is active, X will continue to see an historic snapshot of the database prior to the changes implemented by Y."
  - P4 · § "2.2. DEFERRED, IMMEDIATE, and EXCLUSIVE transactions": "DEFERRED means that the transaction does not actually start until the database is first accessed."
  - P5 · § "2.2. DEFERRED, IMMEDIATE, and EXCLUSIVE transactions": "This causes the transaction that is automatically started to persist until an explicit COMMIT or ROLLBACK or until a rollback is provoked by an error or an ON CONFLICT ROLLBACK clause. If the first statement after BEGIN DEFERRED is a SELECT, then a read transaction is started."

### S-r1-found-rw-06
- url: https://www.sqlite.org/releaselog/3_7_0.html · canonical: www.sqlite.org/releaselog/3_7_0.html
- title: SQLite Release 3.7.0 On 2010-07-21 · authors: not printed · publisher: SQLite (sqlite.org)
- date: 2010-07-21 · version: 3.7.0
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: release notes (official docs) · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the project's own release log; rung 1 for what shipped in 3.7.0.
- passages:
  - P1 · § "SQLite Release 3.7.0 On 2010-07-21": "Added support for write-ahead logging."

## Claims

### C-r1-found-rw-01
- claim: In SQLite's WAL mode, the original content stays in the main database file and each transaction's changes are appended to a separate WAL file.
- kind: behaviour
- questions: Q1 · load-bearing: yes (the core mechanism of the chapter)
- support: S-r1-found-rw-01/P2 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-03/P5 · rung 1 · fit direct · upstream self
- scope: SQLite with journal_mode=WAL, 3.7.0 and later
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-02
- claim: In SQLite's WAL mode a COMMIT happens when a record marking the commit is appended to the WAL, so a commit never writes to the original database file, and readers keep reading the unaltered database file while changes are committed into the WAL.
- kind: behaviour
- questions: Q1 · load-bearing: yes (why the main file is unchanged until a checkpoint)
- support: S-r1-found-rw-01/P3 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P1 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-03
- claim: SQLite's documentation calls the operation that moves transactions from the WAL file back into the main database file a "checkpoint", and in WAL mode committed changes reach the main file only through it.
- kind: definition
- questions: Q1 · load-bearing: yes (closes the "until a checkpoint" half of Q1; the checkpoint itself is found-ckpt's)
- support: S-r1-found-rw-01/P4 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-03/P5 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-04
- claim: In SQLite's WAL file format, each frame records the revised content of a single database page, a transaction commits when a frame containing a commit marker is written, and one WAL file usually records several transactions.
- kind: behaviour
- questions: Q1, Q4 · load-bearing: yes (unit of what a commit appends)
- support: S-r1-found-rw-02/P1 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-04/P1 · rung 1 · fit partial · upstream self (the -wal file "records transactions that have been committed but not yet applied to the main database")
- scope: SQLite WAL file format version 3007000
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-05
- claim: When a read transaction begins in SQLite's WAL mode, the reader records the location of the last valid commit record in the WAL (the "end mark"), and that end mark stays unchanged for the whole transaction, so the transaction sees the database as of a single point in time.
- kind: behaviour
- questions: Q2 · load-bearing: yes (definition of a reader's snapshot)
- support: S-r1-found-rw-01/P5 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode; per read transaction
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-06
- claim: SQLite's file-format specification calls a reader's end mark "mxFrame": the reader records it when its read transaction starts and uses it for all later reads, ignoring frames appended after it.
- kind: behaviour
- questions: Q2 · load-bearing: yes (names the end mark as it appears in the format docs)
- support: S-r1-found-rw-02/P18 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-04/P2 · rung 1 · fit partial · upstream self (mxFrame is the index of the last valid commit frame)
- scope: SQLite WAL mode
- confidence: high · flags: none (the spec's text reads "number of value frames", a typo for "valid frames"; quoted as printed)
- conflicts: none

### C-r1-found-rw-07
- claim: In SQLite's WAL mode, a reader that needs a page takes the last copy of that page in the WAL before its end mark, and reads the page from the main database file only if the WAL holds no such copy.
- kind: behaviour
- questions: Q2 · load-bearing: yes (how a reader finds the right version of each page)
- support: S-r1-found-rw-01/P6 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P17 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-08
- claim: SQLite's documentation says WAL mode gives "snapshot isolation": write transactions that commit while a read transaction is active stay invisible to that read transaction, and to see them the reader must end its transaction and start a new one.
- kind: behaviour
- questions: Q2 · load-bearing: yes (how long the snapshot is held)
- support: S-r1-found-rw-03/P2 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-03/P3 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-05/P3 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode, separate connections without shared cache/read_uncommitted
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-09
- claim: In SQLite, a statement run outside an explicit transaction starts its own transaction, which commits when the last SQL statement finishes, while BEGIN (DEFERRED, the default) starts no transaction until the database is first accessed and then keeps it until COMMIT, ROLLBACK or an error-provoked rollback; a SELECT as the first statement starts a read transaction.
- kind: behaviour
- questions: Q2 · load-bearing: yes (decides when a snapshot is taken and released)
- support: S-r1-found-rw-05/P1 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-05/P4 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-05/P5 · rung 1 · fit direct · upstream self
- scope: SQLite SQL transaction semantics, all journal modes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-10
- claim: SQLite keeps a "wal-index" in shared memory so that readers can locate pages in the WAL quickly instead of scanning the whole WAL file.
- kind: behaviour
- questions: Q2 · load-bearing: no (pointer only; the wal-index belongs to found-shm)
- support: S-r1-found-rw-01/P7 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-11
- claim: SQLite's documentation says that in WAL mode writers only append new content to the end of the WAL file, so writers and readers can run at the same time, but because there is only one WAL file there can be only one writer at a time.
- kind: behaviour
- questions: Q3 · load-bearing: yes (the "why one writer" answer)
- support: S-r1-found-rw-01/P8 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-12
- claim: SQLite's documentation lists as an advantage of WAL that readers do not block writers and a writer does not block readers.
- kind: behaviour
- questions: Q3 · load-bearing: yes (blocking relation between readers and writer)
- support: S-r1-found-rw-01/P1 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode, contrasted with rollback-journal mode
- confidence: high · flags: vendor-about-itself (stated as an "advantage" by the SQLite project; the behaviour itself is descriptive)
- conflicts: none

### C-r1-found-rw-13
- claim: In SQLite's WAL mode, any connection appending to the WAL holds the WAL_WRITE_LOCK exclusively, so only one process at a time can append content to the WAL.
- kind: behaviour
- questions: Q3 · load-bearing: yes (the mechanism enforcing a single writer; lock details are found-shm's)
- support: S-r1-found-rw-04/P3 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-14
- claim: SQLite serializes write transactions: many connections may write to the same database, but they take turns, and only one write transaction can be active at a time while several read transactions can run at once.
- kind: behaviour
- questions: Q3 · load-bearing: yes
- support: S-r1-found-rw-03/P1 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-05/P2 · rung 1 · fit direct · upstream self
- scope: SQLite, all journal modes (except shared-cache with read_uncommitted, per S-r1-found-rw-03)
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-15
- claim: In SQLite's WAL mode, a read transaction whose snapshot is no longer the latest version cannot become a write transaction and fails with SQLITE_BUSY_SNAPSHOT, because letting it write would fork the database's history, which SQLite does not support.
- kind: behaviour
- questions: Q3 · load-bearing: no (supports "why one writer, on the latest snapshot"; error handling is practice-config's)
- support: S-r1-found-rw-03/P4 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-16
- claim: While a connection runs WAL recovery to rebuild the wal-index, it holds all WAL-index locks except WAL_READ_LOCK(0) exclusively, which keeps other threads from writing and from reading transactions held in the WAL until recovery completes.
- kind: behaviour
- questions: Q3 · load-bearing: no (a scope limit on "readers and writers never block each other")
- support: S-r1-found-rw-04/P6 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode, during recovery only
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-17
- claim: A SQLite WAL file begins with a 32-byte header of eight big-endian 32-bit unsigned integers: a magic number (0x377f0682 or 0x377f0683), a file format version (currently 3007000), the database page size, a checkpoint sequence number, salt-1, salt-2, and a two-part checksum over the header's first 24 bytes.
- kind: fact
- questions: Q4 · load-bearing: yes (what the -wal header holds)
- support: S-r1-found-rw-02/P2 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P3 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P4 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P5 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P6 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P7 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P8 · rung 1 · fit direct · upstream self
- scope: SQLite WAL file format version 3007000; the "database page size" field is in the same table (offset 8), not quoted separately
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-18
- claim: Each frame in a SQLite WAL file is a 24-byte frame header followed by one page of data; the frame header holds the page number, the database size in pages after the commit (non-zero only for a commit frame), the two salts copied from the WAL header, and a two-part cumulative checksum.
- kind: fact
- questions: Q4 · load-bearing: yes (what a frame and a commit frame are)
- support: S-r1-found-rw-02/P9 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P10 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P11 · rung 1 · fit direct · upstream self
- scope: SQLite WAL file format version 3007000
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-19
- claim: In SQLite's WAL, a commit frame is a frame whose "size of database" field (bytes 4 through 7 of the frame header) is non-zero, and it marks the end of a transaction.
- kind: definition
- questions: Q4 · load-bearing: yes
- support: S-r1-found-rw-04/P2 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P10 · rung 1 · fit direct · upstream self
- scope: SQLite WAL file format
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-20
- claim: SQLite treats a WAL frame as valid only if the salt-1 and salt-2 values in its header match those in the WAL header and its checksum matches a checksum computed consecutively over the WAL header's first 24 bytes and every frame up to and including that frame.
- kind: behaviour
- questions: Q4 · load-bearing: yes (validity rule behind torn-commit detection)
- support: S-r1-found-rw-02/P12 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P13 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P14 · rung 1 · fit direct · upstream self
- scope: SQLite WAL file format
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-21
- claim: SQLite's WAL frame checksums are weighted checksums using Fibonacci weights in reverse order.
- kind: fact
- questions: Q4 · load-bearing: no (detail)
- support: S-r1-found-rw-02/P21 · rung 1 · fit direct · upstream self
- scope: SQLite WAL file format
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-22
- claim: When a SQLite reader looks up a page in the WAL, only a valid frame that is itself a commit frame or is followed by a commit frame counts; otherwise the page is read from the database file.
- kind: behaviour
- questions: Q4 · load-bearing: yes (why an unfinished commit is invisible to readers)
- support: S-r1-found-rw-02/P17 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-23
- claim: SQLite's WAL recovery, run by the first thread to connect to a WAL-mode database, makes one pass over the WAL from start to end, verifies each frame's checksum, stops at the end of the file or the first invalid checksum, and sets mxFrame to the last valid commit frame.
- kind: behaviour
- questions: Q4 · load-bearing: yes (how a torn commit is told from a complete one after a crash)
- support: S-r1-found-rw-04/P4 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-04/P5 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode; recovery runs on the first connection to the database, not only after a crash
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-24
- claim: When SQLite resets the WAL to reuse it from the beginning, it increments salt-1 and randomizes salt-2 in the WAL header at the start of the first new write transaction, which invalidates older frames that were checkpointed but not yet overwritten.
- kind: behaviour
- questions: Q4 · load-bearing: yes (why leftover frames in a reused -wal file are not read)
- support: S-r1-found-rw-02/P16 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P15 · rung 1 · fit partial · upstream self
- scope: SQLite WAL mode, WAL reset after a complete checkpoint
- confidence: high · flags: none
- conflicts: none (see flags: the header table's wording "incremented with each checkpoint" vs §4.4's timing)

### C-r1-found-rw-25
- claim: SQLite's wal-index (the -shm file) holds no database content, is not needed to recover the database after a crash, and is rebuilt from the WAL file.
- kind: behaviour
- questions: Q4 · load-bearing: no (places the crash-relevant state in the -wal file; -shm is found-shm's)
- support: S-r1-found-rw-04/P7 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P19 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-26
- claim: SQLite's rollback journal copies the original, unchanged page content into a separate journal file and writes the changes directly into the database file, and a commit occurs when the journal is deleted; SQLite's documentation describes WAL as the inverse, with originals kept in the database file and changes appended to the WAL.
- kind: comparison
- questions: Q5 · load-bearing: no (the one contrast)
- support: S-r1-found-rw-01/P9 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-01/P2 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-03/P6 · rung 1 · fit direct · upstream self
- scope: SQLite rollback-journal (DELETE) mode vs WAL mode; attributed form for "inverts"
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-27
- claim: SQLite added write-ahead logging in version 3.7.0, released 2010-07-21; the rollback journal remains SQLite's default method.
- kind: version
- questions: Q5 · load-bearing: no
- support: S-r1-found-rw-06/P1 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-01/P10 · rung 1 · fit direct · upstream self
- support: S-r1-found-rw-02/P20 · rung 1 · fit direct · upstream self
- scope: SQLite 3.7.0 and later
- confidence: high · flags: none
- conflicts: none

### C-r1-found-rw-28
- claim: SQLite's documentation says WAL write transactions write the content once, versus twice for rollback-journal transactions, and that the writes are all sequential.
- kind: comparison
- questions: Q5 · load-bearing: no
- support: S-r1-found-rw-01/P11 · rung 1 · fit direct · upstream self
- scope: SQLite WAL mode vs rollback journal; attributed form only
- confidence: medium · flags: vendor-about-itself (the same sentence says "very fast")
- conflicts: none

## Conflicts
- none between sources. One internal wording difference in S-r1-found-rw-02 is recorded under flags; not settled.

## Speculation and flags
- C-r1-found-rw-24 / S-r1-found-rw-02: the WAL header table describes salt-1 as "random integer incremented with each checkpoint" (P6) and salt-2 as "a different random number for each checkpoint" (P7), while §4.4 (P16) says the salts change "At the start of the first new write transaction" after a reset. Probably the same event described loosely, but the timing words differ; a writer should follow §4.4.
- C-r1-found-rw-06: the spec prints "the number of value frames" (typo for "valid"); quoted verbatim.
- C-r1-found-rw-12, C-r1-found-rw-28: vendor-about-itself; S-r1-found-rw-01 §1 also says "WAL is significantly faster in most scenarios" (superlative/evaluative; the evidence angle's to test).
- C-r1-found-rw-16: "a writer does not block readers" has documented exceptions (recovery; RESTART/TRUNCATE checkpoints "readers might block", wal.html §6, found-ckpt's).
- Inference not claimed: because each checksum is cumulative (C-r1-found-rw-20), a single corrupt frame makes every later frame fail too, and frames of a commit whose commit frame was lost are never used; the docs state the rules (C-r1-found-rw-20, -22, -23) but do not spell out these consequences in one sentence.

## Unused leads
- https://www.sqlite.org/wal.html §9 "Sometimes Queries Return SQLITE_BUSY In WAL Mode" — for practice-config.
- https://www.sqlite.org/isolation.html (BEGIN IMMEDIATE paragraph) — avoiding SQLITE_BUSY_SNAPSHOT; for practice-config.
- https://www.sqlite.org/walformat.html §2.3 read-marks and WAL_READ_LOCK(N) — how a reader's end mark is pinned against checkpoints; for found-shm / found-ckpt.
- https://www.sqlite.org/wal.html §2.3 — synchronous=FULL syncs the WAL on every commit, NORMAL omits it; for practice-config.

## Queries
- "SQLite: Past, Present, and Future" VLDB WAL mode → nothing new

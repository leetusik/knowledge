# Findings: 20261023-1245-sqlite-wal · round 1 · angle found-shm
- researcher: claude-opus-5-5 · status: complete · tool calls: 42

## Questions
- Q11: answered — claims: C-r1-found-shm-01, -02, -03, -04, -05, -06, -07, -08, -09, -10 — note: all rung 1 (sqlite.org wal.html, walformat.html, fileformat2.html, os_unix.c); descriptive, so the bar is one rung-1 source.
- Q12: answered (thin on the concrete failure mechanism) — claims: C-r1-found-shm-11, -12, -13, -14, -15, -16, -17 — note: rung 1 states the rule and its reason (no shared memory across hosts) and that non-shared wal-index memory corrupts the database; no rung-1/2 source found that walks through what happens step by step when two hosts open one WAL database over NFS.
- Q13: answered — claims: C-r1-found-shm-18, -19, -20, -21, -22, -23, -24, -25
- Q14: answered — claims: C-r1-found-shm-26, -27, -28
- Q15: answered — claims: C-r1-found-shm-29, -30, -31, -32, -33, -34, -35, -36, -37, -38

## Sources

### S-r1-found-shm-01
- url: https://www.sqlite.org/wal.html · canonical: www.sqlite.org/wal.html
- title: Write-Ahead Logging · authors: not printed · publisher: SQLite (sqlite.org)
- date: updated 2026-08-25 ("This page was last updated on 2026-08-25 19:42:39Z") · version: SQLite docs as of 2026-08-25
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project (Hwaci / SQLite Consortium) · upstream: none
- lateral: sqlite.org is the official site of the SQLite developers; trusted source per dispatch.
- passages:
  - P1 · § "1. Overview": "All processes using a database must be on the same host computer; WAL does not work over a network filesystem. This is because WAL requires all processes to share a small amount of memory and processes on separate host machines obviously cannot share memory with each other."
  - P2 · § "2.2. Concurrency": "Readers can exist in separate processes, so to avoid forcing every reader to scan the entire WAL looking for pages (the WAL file can grow to multiple megabytes, depending on how often checkpoints are run), a data structure called the "wal-index" is maintained in shared memory which helps readers locate pages in the WAL quickly and with a minimum of I/O. The wal-index greatly improves the performance of readers, but the use of shared memory means that all readers must exist on the same machine. This is why the write-ahead log implementation will not work on a network filesystem."
  - P3 · § "7. Implementation Of Shared-Memory For The WAL-Index": "The wal-index is implemented using an ordinary file that is mmapped for robustness. Early (pre-release) implementations of WAL mode stored the wal-index in volatile shared-memory, such as files created in /dev/shm on Linux or /tmp on other unix systems. The problem with that approach is that processes with a different root directory (changed via chroot) will see different files and hence use different shared memory areas, leading to database corruption."
  - P4 · § "7. Implementation Of Shared-Memory For The WAL-Index": "The only way we have found to guarantee that all processes accessing the same database file use the same shared memory is to create the shared memory by mmapping a file in the same directory as the database itself."
  - P5 · § "7. Implementation Of Shared-Memory For The WAL-Index": "Using an ordinary disk file to provide shared memory has the disadvantage that it might actually do unnecessary disk I/O by writing the shared memory to disk. However, the developers do not think this is a major concern since the wal-index rarely exceeds 32 KiB in size and is never synced. Furthermore, the wal-index backing file is deleted when the last database connection disconnects, which often prevents any real disk I/O from ever happening."
  - P6 · § "3. Activating And Configuring WAL Mode": "If the conversion to WAL could not be completed (for example, if the VFS does not support the necessary shared-memory primitives) then the journaling mode will be unchanged and the string returned from the primitive will be the prior journaling mode (for example "delete")."
  - P7 · § "8. Use of WAL Without Shared-Memory": "Beginning in SQLite version 3.7.4 (2010-12-07), WAL databases can be created, read, and written even if shared memory is unavailable as long as the locking_mode is set to EXCLUSIVE before the first attempted access. In other words, a process can interact with a WAL database without using shared memory if that process is guaranteed to be the only process accessing the database."
  - P8 · § "8. Use of WAL Without Shared-Memory": "If EXCLUSIVE locking mode is set prior to the first WAL-mode database access, then SQLite never attempts to call any of the shared-memory methods and hence no shared-memory wal-index is ever created. In that case, the database connection remains in EXCLUSIVE mode as long as the journal mode is WAL; attempts to change the locking mode using "PRAGMA locking_mode=NORMAL;" are no-ops. The only way to change out of EXCLUSIVE locking mode is to first change out of WAL journal mode."
  - P9 · § "8. Use of WAL Without Shared-Memory": "If the VFS does not support shared-memory methods, then the attempt to open a database that is already in WAL mode, or the attempt to convert a database into WAL mode, will fail."
  - P10 · § "9. Sometimes Queries Return SQLITE_BUSY In WAL Mode": "If another database connection has the database mode open in exclusive locking mode then all queries against the database will return SQLITE_BUSY."
  - P11 · § "9. Sometimes Queries Return SQLITE_BUSY In WAL Mode": "If the last connection to a database crashed, then the first new connection to open the database will start a recovery process. An exclusive lock is held during recovery. So if a third database connection tries to jump in and query while the second connection is running recovery, the third connection will get an SQLITE_BUSY error."
  - P12 · § "4. The WAL File": "The WAL file exists for as long as any database connection has the database open. Usually, the WAL file is deleted automatically when the last connection to the database closes. However, if the last process to have the database open exits without cleanly shutting down the database connection, or if the SQLITE_FCNTL_PERSIST_WAL file control is used, then the WAL file might be retained on disk after all connections to the database have been closed. The WAL file is part of the persistent state of the database and should be kept with the database if the database is copied or moved."
  - P13 · § "6. Avoiding Excessively Large WAL Files": "When the last connection to a database closes, that connection does one last checkpoint and then deletes the WAL and its associated shared-memory file, to clean up the disk."
  - P14 · § "9. Sometimes Queries Return SQLITE_BUSY In WAL Mode": "When the last connection to a particular database is closing, that connection will acquire an exclusive lock for a short time while it cleans up the WAL and shared-memory files."

### S-r1-found-shm-02
- url: https://www.sqlite.org/walformat.html · canonical: www.sqlite.org/walformat.html
- title: WAL-mode File Format · authors: not printed · publisher: SQLite (sqlite.org)
- date: updated 2025-05-10 ("This page was last updated on 2025-05-10 11:18:57Z") · version: describes the unix and windows VFSes
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official sqlite.org document; the page says it fills in VFS-specific details (shm format, locking) omitted from fileformat2.html.
- passages:
  - P1 · § "1.3. The Wal-Index or "-shm" file": "The wal-index file or "shm" file is not actually used as a file. Rather, individual database clients mmap the shm file and use it as shared memory for coordinating access to the database and as a cache for quickly locating frames within the wal file."
  - P2 · § "1.3. The Wal-Index or "-shm" file": "The shm file does not contain any database content and is not required to recover the database following a crash. For that reason, the first client to connect to a quiescent database will normally truncate the shm file if it exists. Since the content of the shm file does not need to be preserved across a crash, the shm file is never fsync()-ed to disk."
  - P3 · § "1.3. The Wal-Index or "-shm" file": "Because the shm is only used to coordinate access between concurrent clients, the shm file is omitted if exclusive locking mode is set, as an optimization. When exclusive locking mode is set, SQLite uses heap memory in place of the memory-mapped shm file."
  - P4 · § "1.4. File Lifecycles": "When a WAL mode database is in active use, all three of the above files usually exist. Except, the Wal-Index file is omitted if exclusive locking mode is set."
  - P5 · § "1.4. File Lifecycles": "If the last client using the database shuts down cleanly by calling sqlite3_close(), then a checkpoint is run automatically in order to transfer all information from the wal file over into the main database, and both the shm file and the wal file are unlinked. Thus, when the database is not in use by any client, it is usually the case that only the main database file exists on disk. However, if the last client did not call sqlite3_close() before it shut down, or if the last client to disconnect was a read-only client, then the final cleanup operation does not occur and the shm and wal files may still exist on disk even when the database is not in use."
  - P6 · § "1.5. Variations": "If a read/write client invokes sqlite3_file_control(SQLITE_FCNTL_PERSIST_WAL) prior to shutdown, then at shutdown a checkpoint is still run, but the shm file and wal file are not deleted. This allows subsequent read-only clients to connect to and read the database."
  - P7 · § "2. The WAL-Index File Format": "Because the shm file is not involved in recovery, the shm file does not need to be machine byte-order independent. Hence, numeric values in the shm file are written in the native byte order of the host computer"
  - P8 · § "2. The WAL-Index File Format": "The shm file consists of one or more hash tables, where each hash table is 32768 bytes in size. Except, a 136-byte header is carved out of the front of the very first hash table, so the first hash table is only 32632 bytes in size. The total size of the shm file is always a multiple of 32768. In most cases, the total size of the shm file is exactly 32768 bytes. The shm file only needs to grow beyond a single hash table if when the wal file grows very large (more than 4079 frames)."
  - P9 · § "2.1. The WAL-Index Header": "Number of valid and committed frames in the WAL file."
  - P10 · § "2.1. The WAL-Index Header": "Number of WAL frames that have already been backfilled into the database by prior checkpoints."
  - P11 · § "2.1. The WAL-Index Header": "Five "read marks". Each read mark is a 32-bit unsigned integer (4 bytes)."
  - P12 · § "2.1. The WAL-Index Header": "Unused space set aside for 8 file locks."
  - P13 · § "2.2. WAL-Index Hash Tables": "FindFrame(P,M): Given a page number P and a maximum WAL frame index M, return the largest WAL frame index for page P that does not exceed M, or return NULL if there are no frames for page P that do not exceed M."
  - P14 · § "2.2. WAL-Index Hash Tables": "Collectively, the aPgno entries record the database page number stored in all frames of the WAL file."
  - P15 · § "2.2. WAL-Index Hash Tables": "The expected size of X is less than 2. The worst case is that X will be the same as the number of entries in aPgno, in which case the algorithm runs at about the same speed as a linear scan of aPgno. But that worst case performance is exceedingly rare."
  - P16 · § "2.1.3. WAL Locks": "Eight bytes of space are set aside in the header to support file locking using the xShmLock() method in the sqlite3_io_methods object. These eight bytes are never read nor written by SQLite since some VFSes (ex: Windows) might implement locks using mandatory file locks."
  - P17 · § "2.3. Locking Matrix": "The DELETE-mode locks are stored on the lock-byte page of the main database file. Only SQLITE_LOCK_SHARED and SQLITE_LOCK_EXCLUSIVE are factors for WAL-mode databases. The other locking states are used in rollback-mode, but not in WAL-mode."
  - P18 · § "2.3.1. How the various locks are used": "All connections hold SQLITE_LOCK_SHARED continuously while attached to a WAL-mode database. This is true for both read/write connections and read-only connections. The SQLITE_LOCK_SHARED lock is held even by connections that are not within transaction. This is different from rollback mode, where the SQLITE_LOCK_SHARED is released at the end of each transaction."
  - P19 · § "2.3.1. How the various locks are used": "An EXCLUSIVE WAL_WRITE_LOCK is held by any connection that is appending content to the end of the WAL. Hence, only a single process at a time can append content to the WAL."
  - P20 · § "2.3.1. How the various locks are used": "An EXCLUSIVE WAL_CKPT_LOCK is held by any connection that is running a checkpoint. The nBackfill field of the WAL-index header may be increased while holding this exclusive lock, but it may not be decreased."
  - P21 · § "2.3.1. How the various locks are used": "An EXCLUSIVE WAL_RECOVER_LOCK is held by any connection that is running recovery to reconstruct the shared WAL-index."
  - P22 · § "2.3.1. How the various locks are used": "There are five separate read locks, numbers 0 through 4. Read locks may be either SHARED or EXCLUSIVE. Connections obtain a shared lock on one of the read locks bytes while they are within a transaction. Connections also obtain an exclusive lock on read locks, one at a time, for the brief moment while they are updating the values of the corresponding read-marks."
  - P23 · § "2.3.1. How the various locks are used": "When a connection holds a shared lock on WAL_READ_LOCK(N), that is a promise by the connection that it will use the WAL and not the database file for any database pages that are modified by the first read-mark[N] entries in the WAL."
  - P24 · § "2.3.1. How the various locks are used": "When a checkpoint runs, if it sees a lock on WAL_READ_LOCK(N), then it must not move WAL content into the main database for more than the first read-mark[N] frames. Were it to do so, it would overwrite content that the process holding the lock was expecting to be able to read out of the main database file."
  - P25 · § "2.3.2. Operations that require locks and which locks those operations use": "If the database file is already in WAL mode (hence if the desire is to change it back into rollback mode) and if there are two or more connections to the database, then each of these connections will be holding an SQLITE_LOCK_SHARED lock. That means that the SQLITE_LOCK_EXCLUSIVE cannot be obtained, and the transition out of WAL mode will not be allowed."
  - P26 · § "2.3.2. Operations that require locks and which locks those operations use": "When a database connection closes (via sqlite3_close() or sqlite3_close_v2()), an attempt is made to acquire SQLITE_LOCK_EXCLUSIVE. If this attempt is successful, that means the connection that is closing is the last connection to the database. In that case, it is desirable to clean up the WAL and WAL-index files, so the closing connection runs a checkpoint (while holding SQLITE_LOCK_EXCLUSIVE) and this deletes both the WAL and WAL-index files."
  - P27 · § "3. Recovery": "Recovery is run by the first thread to connect to a WAL-mode database. Recovery restores the WAL-index so that it accurately describes the WAL file. If there is no WAL file present when the first thread connects to the database, there is nothing to recover, but the recovery process still runs to initialize the WAL-index."
  - P28 · § "3. Recovery": "Recovery works by doing a single pass over the WAL, from beginning to end. The checksums are verified on each frame of the WAL as it is read. The scan stops at the end of the file or at the first invalid checksum. The mxFrame field is set to the index of the last valid commit frame in WAL."
  - P29 · § "3. Recovery": "Since the recovery procedure has no way of knowing how many frames of the WAL might have previously been copied back into the database, it initializes the nBackfill value to zero."
  - P30 · § "3. Recovery": "During recovery of the global shared-memory WAL-index, exclusive locks are held on WAL_WRITE_LOCK, WAL_CKPT_LOCK, WAL_RECOVER_LOCK, and WAL_READ_LOCK(1) through WAL_READ_LOCK(4). In other words, all locks associated with the WAL-index except for WAL_READ_LOCK(0) are held exclusively. This prevents any other thread from writing the database and from reading any transactions that are held in the WAL, until the recovery is complete."
  - P31 · § "3. Recovery": "If the WAL-index is implemented as a memory-mapped file and that file is read-only to the first thread to connect, then that thread creates a private heap-memory ersazt WAL-index and runs the recovery routine to populate that private WAL-index."
  - P32 · § "2.1.2. The nBackfill field": "The 32-bit unsigned integer at offset 128 in the WAL-index header is called the "nBackfill"."

### S-r1-found-shm-03
- url: https://www.sqlite.org/lockingv3.html · canonical: www.sqlite.org/lockingv3.html
- title: File Locking And Concurrency In SQLite Version 3 · authors: not printed · publisher: SQLite (sqlite.org)
- date: not recorded · version: SQLite 3 rollback-mode locking
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official sqlite.org document; states it covers rollback mode only.
- passages:
  - P1 · § "3.0 Locking": "An EXCLUSIVE lock is needed in order to write to the database file. Only one EXCLUSIVE lock is allowed on the file and no other locks of any kind are allowed to coexist with an EXCLUSIVE lock."
  - P2 · § "3.0 Locking": "A PENDING lock means that the process holding the lock wants to write to the database as soon as possible and is just waiting on all current SHARED locks to clear so that it can get an EXCLUSIVE lock. No new SHARED locks are permitted against the database if a PENDING lock is active, though existing SHARED locks are allowed to continue."
  - P3 · § "3.0 Locking": "The document only describes locking for the older rollback-mode transaction mechanism. Locking for the newer write-ahead log or WAL mode is described separately."

### S-r1-found-shm-04
- url: https://www.sqlite.org/fileformat2.html · canonical: www.sqlite.org/fileformat2.html
- title: Database File Format · authors: not printed · publisher: SQLite (sqlite.org)
- date: not recorded · version: current SQLite 3 file format
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: spec · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official sqlite.org file-format specification.
- passages:
  - P1 · § "4.6. WAL-Index Format": "Conceptually, the wal-index is shared memory, though the current VFS implementations use a memory-mapped file for operating-system portability. The memory-mapped file is in the same directory as the database and has the same name as the database with a "-shm" suffix appended. Because the wal-index is shared memory, SQLite does not support journal_mode=WAL on a network filesystem when clients are on different machines, as all clients of the database must be able to share the same memory."
  - P2 · § "4.6. WAL-Index Format": "The wal-index is transient. After a crash, the wal-index is reconstructed from the original WAL file. The VFS is required to either truncate or zero the header of the wal-index when the last connection to it closes."
  - P3 · § "4.5. Reader Algorithm": "If the WAL is large (multiple megabytes is typical) that scan can be slow, and read performance suffers. To overcome this problem, a separate data structure called the wal-index is maintained to expedite the search for frames of a particular page."

### S-r1-found-shm-05
- url: https://www.sqlite.org/useovernet.html · canonical: www.sqlite.org/useovernet.html
- title: SQLite Over a Network, Caveats and Considerations · authors: not printed · publisher: SQLite (sqlite.org)
- date: updated 2022-06-22 ("This page was last updated on 2022-06-22 21:14:29Z") · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official sqlite.org guidance page.
- passages:
  - P1 · § "Channel Reliability": "A similar hazard arises with file locking in network filesystems. SQLite relies on exclusive locks for write operations, and those have been known to operate incorrectly for some network filesystems. This has led to database corruption."
  - P2 · § "Recommendations": "Network filesystems do not support the ability to do simultaneous reads and writes while at the same time keeping the database consistent."
  - P3 · § "Recommendations": "2. Host an SQLite database in WAL mode, but do all reads and writes from processes on the same machine that stores the database file. Implement a proxy that runs on the database machine that relays read/write requests from remote machines."
  - P4 · § "Recommendations": "3. Use SQLite in rollback mode. This means you can have multiple simultaneous readers or one writer, but not simultaneous readers and writers."
  - P5 · § "Performance and Reliability Issues": "These network unreliability issues can be mitigated, completely or to an acceptable degree, by using SQLite in rollback mode. However, the SQLite library is not tested in across-a-network scenarios, nor is that reasonably possible. Hence, use of a remote database is done at the user's risk."

### S-r1-found-shm-06
- url: https://www.sqlite.org/howtocorrupt.html · canonical: www.sqlite.org/howtocorrupt.html
- title: How To Corrupt An SQLite Database File · authors: not printed · publisher: SQLite (sqlite.org)
- date: not recorded (page mentions 3.51.0, 2025-11-04) · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official sqlite.org document.
- passages:
  - P1 · § "2.1. Filesystems with broken or missing lock implementations": "But some filesystems contain bugs in their locking logic such that the locks do not always behave as advertised. This is especially true of network filesystems and NFS in particular. If SQLite is used on a filesystem where the locking primitives contain bugs, and if two or more threads or processes try to access the same database at the same time, then database corruption might result."

### S-r1-found-shm-07
- url: https://www.sqlite.org/pragma.html · canonical: www.sqlite.org/pragma.html
- title: Pragma statements supported by SQLite · authors: not printed · publisher: SQLite (sqlite.org)
- date: not recorded · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official sqlite.org document.
- passages:
  - P1 · § "PRAGMA locking_mode": "When the locking-mode is set to EXCLUSIVE, the database connection never releases file-locks. The first time the database is read in EXCLUSIVE mode, a shared lock is obtained and held. The first time the database is written, an exclusive lock is obtained and held."
  - P2 · § "PRAGMA locking_mode": "WAL databases can be accessed in EXCLUSIVE mode without the use of shared memory."

### S-r1-found-shm-11
- url: https://raw.githubusercontent.com/sqlite/sqlite/master/src/os_unix.c · canonical: github.com/sqlite/sqlite/blob/master/src/os_unix.c
- repo: github.com/sqlite/sqlite (official mirror of the Fossil repository) · commit: 20822819adf299e3a7609a26206bf2b43ac402ff (master head per the GitHub API, fetched immediately after the file; the file was fetched from `master`, so the commit is inferred, not pinned)
- title: src/os_unix.c · authors: SQLite developers · publisher: SQLite project
- date: master as of 2026-10-23 · version: master
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the GitHub repo sqlite/sqlite is the project's own mirror of its Fossil source tree.
- passages:
  - P1 · comment before the unix shm-open routine (text lines 4917–4933): "Open a shared-memory area associated with open database file pDbFd. … This particular implementation uses mmapped files. … The file used to implement shared-memory is in the same directory … differing access permissions … or a chroot() might cause two different processes on the same … database to end up using different files for shared memory - … meaning that their memory would not really be shared - resulting … in database corruption."

## Claims

### C-r1-found-shm-01
- claim: SQLite keeps a data structure called the wal-index so that a reader can find the pages it needs in the WAL quickly, instead of scanning the whole WAL file, which can grow to multiple megabytes.
- kind: definition
- questions: Q11 · load-bearing: yes (defines the wal-index)
- support: S-r1-found-shm-01/P2 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-04/P3 · rung 1 · fit direct · upstream self
- scope: current SQLite WAL mode
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-02
- claim: According to walformat.html, the question the wal-index answers is FindFrame(P,M): given a page number P and a maximum WAL frame index M (the reader's snapshot limit), return the largest WAL frame index for page P that does not exceed M, or nothing if no such frame exists.
- kind: definition
- questions: Q11 · load-bearing: yes
- support: S-r1-found-shm-02/P13 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-04/P1 · rung 1 · fit partial (same section continues with the same question; P1 itself covers the shared-memory part) · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-03
- claim: On the unix and windows VFSes, each database client memory-maps (mmap) the -shm file and uses it as shared memory, both to coordinate access to the database and as a cache for locating frames in the -wal file; the -shm file is not used as an ordinary file.
- kind: behaviour
- questions: Q11 · load-bearing: yes
- support: S-r1-found-shm-02/P1 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-04/P1 · rung 1 · fit direct · upstream self
- scope: unix and windows VFSes (the file-format spec says the wal-index is "conceptually" shared memory and the current VFS implementations use a memory-mapped file)
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-04
- claim: The -shm file consists of one or more 32768-byte hash tables, the first of which gives up its first 136 bytes to a header; in most cases the whole -shm file is exactly 32768 bytes, and it grows beyond one hash table only when the WAL holds more than 4079 frames.
- kind: number
- questions: Q11 · load-bearing: no (detail of the format)
- support: S-r1-found-shm-02/P8 · rung 1 · fit direct · upstream self
- scope: unix and windows VFSes; walformat.html as updated 2025-05-10
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-05
- claim: The 136-byte header of the -shm file records, among other fields, the number of valid committed frames in the WAL (mxFrame), the number of WAL frames already copied back into the database by checkpoints (nBackfill), five read marks, and eight bytes reserved for locks.
- kind: fact
- questions: Q11, Q13 · load-bearing: yes (what the wal-index holds)
- support: S-r1-found-shm-02/P9 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-02/P10 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-02/P11 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-02/P12 · rung 1 · fit direct · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: see "Speculation and flags" on the page's inconsistent nBackfill offset
- conflicts: none

### C-r1-found-shm-06
- claim: The hash-table part of the -shm file records, for each frame in the WAL, the database page number stored in that frame, and a hash on page numbers lets a reader find the frames for a page with, on average, fewer than two candidate entries to check.
- kind: behaviour
- questions: Q11 · load-bearing: no (mechanism detail)
- support: S-r1-found-shm-02/P14 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-02/P15 · rung 1 · fit direct ("expected size of X is less than 2") · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-07
- claim: SQLite's documentation says the wal-index is backed by an mmapped file in the same directory as the database because it is the only way the developers found to guarantee that every process opening the same database uses the same shared memory; pre-release versions that kept it in /dev/shm or /tmp let processes with different root directories (chroot) use different shared memory, leading to database corruption.
- kind: fact
- questions: Q11, Q12 · load-bearing: yes (why -shm sits beside the database)
- support: S-r1-found-shm-01/P3 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-01/P4 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-11/P1 · rung 1 · fit direct (source comment gives the same reason) · upstream self
- scope: unix VFS; current docs and master source
- confidence: high · flags: vendor-about-itself (design rationale stated by the developers; attribute it)
- conflicts: none

### C-r1-found-shm-08
- claim: The -shm file holds no database content, is not needed to recover the database after a crash, and is never fsync()-ed to disk.
- kind: fact
- questions: Q11, Q15 · load-bearing: yes
- support: S-r1-found-shm-02/P2 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-01/P5 · rung 1 · fit partial (says "is never synced") · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-09
- claim: Because the -shm file is not involved in recovery, numbers in it are stored in the host computer's native byte order, unlike the database file and the -wal file, which use a fixed cross-platform byte order.
- kind: fact
- questions: Q11 · load-bearing: no
- support: S-r1-found-shm-02/P7 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-04/P2 · rung 1 · fit partial (states the wal-index is transient) · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-10
- claim: SQLite's documentation acknowledges that backing shared memory with a disk file may cause unnecessary disk I/O, and argues it is minor because the wal-index rarely exceeds 32 KiB, is never synced, and is deleted when the last connection disconnects.
- kind: interpretation
- questions: Q11 · load-bearing: no
- support: S-r1-found-shm-01/P5 · rung 1 · fit direct · upstream self
- scope: attributed view of the SQLite developers
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-found-shm-11
- claim: SQLite's documentation states that all processes using a WAL-mode database must be on the same host computer and that WAL does not work over a network filesystem, because WAL requires all processes to share a small amount of memory and processes on separate host machines cannot share memory.
- kind: fact
- questions: Q12 · load-bearing: yes
- support: S-r1-found-shm-01/P1 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-01/P2 · rung 1 · fit direct · upstream self
- scope: current wal.html (updated 2026-08-25)
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-12
- claim: SQLite's file-format specification says that, because the wal-index is shared memory, SQLite does not support journal_mode=WAL on a network filesystem when clients are on different machines.
- kind: fact
- questions: Q12 · load-bearing: yes (scope: the restriction is about clients on different machines)
- support: S-r1-found-shm-04/P1 · rung 1 · fit direct · upstream self
- scope: "when clients are on different machines"
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-13
- claim: A comment in SQLite's unix source (os_unix.c) states that if two processes on the same database end up using different files for the wal-index shared memory, their memory is not really shared, and database corruption results.
- kind: behaviour
- questions: Q12 · load-bearing: yes (the consequence when the wal-index is not truly shared)
- support: S-r1-found-shm-11/P1 · rung 1 · fit partial (the comment's scenario is differing permissions or chroot with a shm file outside the database directory, not a network filesystem; it states the general consequence of non-shared wal-index memory) · upstream self
- support: S-r1-found-shm-01/P3 · rung 1 · fit partial (same consequence, chroot scenario) · upstream self
- scope: unix VFS; scenario of processes not sharing the same shm memory
- confidence: medium (extension to cross-host NFS is an inference the sources do not state) · flags: none
- conflicts: none

### C-r1-found-shm-14
- claim: SQLite's documentation warns that some filesystems, especially network filesystems and NFS in particular, have bugs in their locking logic, and that if SQLite is used on such a filesystem with two or more processes accessing the same database at once, database corruption might result.
- kind: fact
- questions: Q12 · load-bearing: yes (second failure mode, applies to all journal modes)
- support: S-r1-found-shm-06/P1 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-05/P1 · rung 1 · fit direct · upstream self
- scope: any SQLite journal mode on network filesystems; not WAL-specific
- confidence: high · flags: none (statement about third-party filesystems: attribute to SQLite)
- conflicts: none

### C-r1-found-shm-15
- claim: For multiple clients on different machines that need simultaneous reads and writes, SQLite's "SQLite Over a Network" page lists three choices: a client/server database, a WAL-mode database whose reads and writes all come from processes on the machine that stores the file (with a proxy relaying remote requests), or SQLite in rollback mode with multiple readers or one writer but not both at once.
- kind: fact
- questions: Q12 · load-bearing: no (what to do instead)
- support: S-r1-found-shm-05/P2 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-05/P3 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-05/P4 · rung 1 · fit direct · upstream self
- scope: useovernet.html, updated 2022-06-22
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-16
- claim: SQLite's documentation says network unreliability issues can be mitigated by using rollback mode, but that SQLite is not tested in across-a-network scenarios and remote database use is at the user's risk.
- kind: fact
- questions: Q12 · load-bearing: no
- support: S-r1-found-shm-05/P5 · rung 1 · fit direct · upstream self
- scope: useovernet.html, updated 2022-06-22
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-17
- claim: If the VFS does not support the shared-memory methods, `PRAGMA journal_mode=WAL` leaves the journal mode unchanged and returns the prior mode (for example "delete"), and opening a database that is already in WAL mode fails, unless EXCLUSIVE locking mode is set before the first access.
- kind: behaviour
- questions: Q12, Q14 · load-bearing: no
- support: S-r1-found-shm-01/P6 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-01/P9 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-01/P7 · rung 1 · fit direct (the EXCLUSIVE exception) · upstream self
- scope: NORMAL locking mode at first WAL access
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-18
- claim: On the unix and windows VFSes, WAL mode uses eight locks on bytes reserved in the -shm header and taken through the VFS's xShmLock() method: WAL_WRITE_LOCK, WAL_CKPT_LOCK, WAL_RECOVER_LOCK, and five read locks WAL_READ_LOCK(0) to WAL_READ_LOCK(4).
- kind: fact
- questions: Q13 · load-bearing: no
- support: S-r1-found-shm-02/P16 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-02/P22 · rung 1 · fit partial (the five read locks) · upstream self
- support: S-r1-found-shm-02/P21 · rung 1 · fit partial (WAL_RECOVER_LOCK) · upstream self
- scope: unix and windows VFSes (the lock table names the eight locks; its cells are one per line in the page text, so the names are supported by P16, P19–P22 together)
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-19
- claim: A connection appending to the WAL holds WAL_WRITE_LOCK exclusively, so only one process at a time can append to the WAL.
- kind: behaviour
- questions: Q13 · load-bearing: no
- support: S-r1-found-shm-02/P19 · rung 1 · fit direct · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-20
- claim: A connection running a checkpoint holds WAL_CKPT_LOCK exclusively, and nBackfill may only be increased while that lock is held.
- kind: behaviour
- questions: Q13 · load-bearing: no
- support: S-r1-found-shm-02/P20 · rung 1 · fit direct · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-21
- claim: A reader holds a shared lock on one of the five WAL_READ_LOCK(N) bytes for the duration of its transaction, which promises that it will read from the WAL any page modified within the first read-mark[N] frames; a checkpoint that sees such a lock must not copy more than the first read-mark[N] frames into the database.
- kind: behaviour
- questions: Q13 · load-bearing: no
- support: S-r1-found-shm-02/P22 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-02/P23 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-02/P24 · rung 1 · fit direct · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-22
- claim: In WAL mode every connection holds the ordinary SHARED lock on the database file continuously while attached, even outside a transaction, whereas in rollback mode the SHARED lock is released at the end of each transaction.
- kind: comparison
- questions: Q13 · load-bearing: no
- support: S-r1-found-shm-02/P18 · rung 1 · fit direct · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-23
- claim: Of the five rollback-mode lock states, only SHARED and EXCLUSIVE matter for WAL-mode databases; RESERVED and PENDING are used in rollback mode but not in WAL mode.
- kind: comparison
- questions: Q13 · load-bearing: no
- support: S-r1-found-shm-02/P17 · rung 1 · fit direct · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-24
- claim: In rollback mode, writing to the database file requires an EXCLUSIVE lock that no other lock of any kind may coexist with, and a writer waiting for it holds a PENDING lock that stops new readers from starting.
- kind: behaviour
- questions: Q13 · load-bearing: no (the one contrast)
- support: S-r1-found-shm-03/P1 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-03/P2 · rung 1 · fit direct · upstream self
- scope: rollback mode only (S-r1-found-shm-03/P3)
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-25
- claim: Switching a database out of WAL mode requires the EXCLUSIVE lock on the database file, so it is refused while two or more connections have the database open, since each holds a SHARED lock.
- kind: behaviour
- questions: Q13 · load-bearing: no
- support: S-r1-found-shm-02/P25 · rung 1 · fit direct · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-26
- claim: Since SQLite 3.7.4 (2010-12-07), a WAL database can be created, read and written without shared memory if `locking_mode` is set to EXCLUSIVE before the first access, which requires that process to be the only one accessing the database.
- kind: version
- questions: Q14 · load-bearing: no
- support: S-r1-found-shm-01/P7 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-07/P2 · rung 1 · fit direct · upstream self
- scope: SQLite >= 3.7.4
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-27
- claim: In EXCLUSIVE locking mode SQLite creates no -shm file and keeps the wal-index in heap memory instead of a memory-mapped file.
- kind: behaviour
- questions: Q14, Q15 · load-bearing: no
- support: S-r1-found-shm-02/P3 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-02/P4 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-01/P8 · rung 1 · fit partial ("no shared-memory wal-index is ever created") · upstream self
- scope: EXCLUSIVE set before the first WAL-mode access
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-28
- claim: The costs of running WAL without shared memory are that the connection never releases its file locks, that while it has the database open all queries from other connections return SQLITE_BUSY, and that the connection stays in EXCLUSIVE mode (setting NORMAL is a no-op) until the database is switched out of WAL mode.
- kind: behaviour
- questions: Q14 · load-bearing: no
- support: S-r1-found-shm-07/P1 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-01/P10 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-01/P8 · rung 1 · fit direct · upstream self
- scope: EXCLUSIVE locking mode set before the first WAL-mode access
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-29
- claim: While a WAL-mode database is in active use, three files usually exist: the database file, the -wal file and the -shm file (the -shm file is absent in EXCLUSIVE locking mode), and the -wal file exists for as long as any connection has the database open.
- kind: fact
- questions: Q15 · load-bearing: yes
- support: S-r1-found-shm-02/P4 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-01/P12 · rung 1 · fit direct · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-30
- claim: When the last connection closes cleanly through sqlite3_close(), SQLite runs a checkpoint that moves all WAL content into the database and then deletes both the -wal and -shm files, so an unused database usually has only its main file on disk.
- kind: behaviour
- questions: Q15 · load-bearing: yes
- support: S-r1-found-shm-02/P5 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-01/P13 · rung 1 · fit direct · upstream self
- scope: default build, no SQLITE_FCNTL_PERSIST_WAL
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-31
- claim: A closing connection knows it is the last one when it can acquire the EXCLUSIVE lock on the database file; it then checkpoints and deletes the -wal and -shm files while holding that lock.
- kind: behaviour
- questions: Q15, Q13 · load-bearing: no
- support: S-r1-found-shm-02/P26 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-01/P14 · rung 1 · fit partial (exclusive lock held during cleanup) · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-32
- claim: If the last client exits without calling sqlite3_close() (for example after a crash), or the last client to disconnect is read-only, the final cleanup does not happen and the -wal and -shm files can remain on disk while the database is not in use.
- kind: behaviour
- questions: Q15 · load-bearing: yes
- support: S-r1-found-shm-02/P5 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-01/P12 · rung 1 · fit direct · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-33
- claim: SQLite's documentation says the -wal file is part of the persistent state of the database and should be kept with the database file if it is copied or moved.
- kind: fact
- questions: Q15 · load-bearing: yes (what persists: the -wal, not the -shm)
- support: S-r1-found-shm-01/P12 · rung 1 · fit direct · upstream self
- scope: current wal.html
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-34
- claim: The first client to connect to a quiescent WAL-mode database normally truncates an existing -shm file, and the VFS must truncate or zero the wal-index header when the last connection to it closes.
- kind: behaviour
- questions: Q15 · load-bearing: no
- support: S-r1-found-shm-02/P2 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-04/P2 · rung 1 · fit direct · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-35
- claim: Recovery, run by the first thread to connect to a WAL-mode database, rebuilds the wal-index from the -wal file in one pass from beginning to end, verifying each frame's checksum, stopping at the end of the file or the first invalid checksum, and setting mxFrame to the last valid commit frame.
- kind: behaviour
- questions: Q15 · load-bearing: yes
- support: S-r1-found-shm-02/P27 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-02/P28 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-04/P2 · rung 1 · fit partial ("After a crash, the wal-index is reconstructed from the original WAL file") · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-36
- claim: Because recovery cannot know how many WAL frames were already copied into the database, it sets nBackfill to zero.
- kind: behaviour
- questions: Q15 · load-bearing: no
- support: S-r1-found-shm-02/P29 · rung 1 · fit direct · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-37
- claim: During recovery of the shared wal-index, the recovering connection holds every WAL lock except WAL_READ_LOCK(0) exclusively, so no other connection can write or read transactions held in the WAL until recovery ends, and a connection that tries to query then gets SQLITE_BUSY.
- kind: behaviour
- questions: Q15, Q13 · load-bearing: yes (explains a recovery-time SQLITE_BUSY)
- support: S-r1-found-shm-02/P30 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-01/P11 · rung 1 · fit direct · upstream self
- scope: recovery after the last connection crashed
- confidence: high · flags: none
- conflicts: none

### C-r1-found-shm-38
- claim: If the -shm file is read-only to the first thread that connects, that thread builds a private wal-index in heap memory by running recovery instead of writing the shared one; and if a read/write client sets SQLITE_FCNTL_PERSIST_WAL before closing, the final checkpoint still runs but the -wal and -shm files are kept so later read-only clients can open the database.
- kind: behaviour
- questions: Q15 · load-bearing: no
- support: S-r1-found-shm-02/P31 · rung 1 · fit direct · upstream self
- support: S-r1-found-shm-02/P6 · rung 1 · fit direct · upstream self
- scope: unix and windows VFSes
- confidence: high · flags: none
- conflicts: none

## Conflicts
- none between sources. One internal inconsistency in a single source (see flags): not settled.

## Speculation and flags
- S-r1-found-shm-02 (walformat.html): the page is internally inconsistent about nBackfill's offset. Its header table puts nBackfill at bytes "96..99" (and nBackfillAttempted at "128..132"), while § "2.1.2. The nBackfill field" says (P32) "The 32-bit unsigned integer at offset 128 in the WAL-index header is called the "nBackfill"." The table also lists overlapping ranges "128..132" and "132..136". Do not put byte offsets in the chapter; C-r1-found-shm-05 avoids them.
- S-r1-found-shm-02: the page has a "TBD: More information about the header" line, so the header description is partial.
- C-r1-found-shm-07, -10: the developers' own design rationale (vendor-about-itself); attribute it ("SQLite's documentation says…").
- C-r1-found-shm-13: scope warning. The rung-1 statement that non-shared wal-index memory leads to corruption concerns processes on one host using different shm files (chroot, permissions, SQLITE_SHM_DIRECTORY). That cross-host NFS use fails the same way is an inference no rung-1/2 source spells out. The only sources found that describe the cross-host mechanism ("-shm mmap does not synchronize across hosts") were a community guide and project docs at rung 3, which are not cited.
- S-r1-found-shm-11: the commit was read from the GitHub API right after the file was fetched from `master`, not pinned in the URL, so a checker should match the comment by content. No excerpt hash was computed (no local clone; out of the allowed command forms).
- S-r1-found-shm-01 dates 3.7.0 differently in two places: "3.7.0 (2010-07-21)" in § 1 and "version 3.7.0, 2010-07-22" in § 10. Not mine; noted for the lead.

## Unused leads
- https://simonwillison.net/2026/Apr/7/sqlite-wal-docker-containers/ — (saved as pages/S-r1-found-shm-08.txt) Simon Willison, 2026-04-07, rung 3: reports an experiment (Docker Desktop on macOS, named volume) in which "SQLite's WAL mode reliably supports concurrent access when two Docker containers share a volume on the same host". Relevant to "containers sharing a volume on one host" against "hosts sharing a volume". It is rung 3 and probably AI-assisted research notes, so the upstream experiment repo needs following before use. Nothing here is cited from it.
- https://docs.gotosocial.org/en/latest/advanced/sqlite-networked-storage/ — (pages/S-r1-found-shm-09.txt) a project's docs that quote wal.html and warn that SQLite over Samba/NFS/iSCSI is unsupported and risks corruption. Rung 3; it might suit the cases angle (framework defaults).
- https://sqlite.org/forum/forumpost/cc6a7f156e7eb10c — a forum reply: "WAL mode doesn't work across different machines". Rung 3, author not checked.
- https://www.sqlite.org/howtocorrupt.html § "6.2. Failures of mmap() on QNX" — recommends exclusive locking mode for WAL on QNX because of an mmap bug; one real-world case for Q14 if wanted.
- https://bugzilla.mozilla.org/show_bug.cgi?id=629296 — Mozilla bug: journal_mode=WAL on Solaris NFS failing with a disk I/O error (from a search snippet, not opened); a possible concrete "what goes wrong" case for the cases angle.

## Queries
- "SQLite WAL NFS shared memory mmap corruption" → useful (pointers only: GoToSocial docs, Mozilla bug)
- "sqlite wal-index -shm network filesystem different hosts" → useful (Willison lead; nothing new at rung 1/2)
- "sqlite.org forum WAL mode network share two machines -shm corruption" → nothing new (forum reply at rung 3; led to the os_unix.c comment)

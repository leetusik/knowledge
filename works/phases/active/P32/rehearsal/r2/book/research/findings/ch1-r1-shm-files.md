# Findings: 20261023-1245-sqlite-wal · round 1 (chapter 1 top-up) · angle shm-files
- researcher: claude-opus-5-5 · status: complete (hard cap exceeded: 43 research calls before writing, plus write and check calls) · tool calls: 46

## Questions
- Q-ch1-01: answered — claims: C-ch1-r1-shm-files-01, -02, -03, -04, -05, -06, -07, -08, -09, -10, -11 — note: no SQLite documentation page (wal.html, walformat.html, howtocorrupt.html) states what happens when a live -shm is deleted or replaced; howtocorrupt §2.5 covers only the database file. The source at version-3.54.1 does: wal.c says the SHARED lock on the database exists to stop another client unlinking the WAL or wal-index file, and that if this happened just after a client opened it "the system would be badly broken" (C-06). (b) With no connection open, walformat says the first client truncates an existing -shm and recovery runs to initialise the wal-index even with no WAL file (C-01, C-02); unix code truncates to 3 bytes (C-03, C-04). A core developer's forum answers (rung 3) say deleting the files while processes have the db open may corrupt it, and recommend opening and closing with the CLI instead (C-09). C-r1-found-shm-34 part 1 is verified against walformat (C-01); its part 2 rests on fileformat2 and is in tension with an os_unix.c comment (see Conflicts).

## Sources

### S-ch1-r1-shm-files-01
- url: https://www.sqlite.org/walformat.html · canonical: www.sqlite.org/walformat.html
- title: WAL-mode File Format · authors: not printed · publisher: SQLite (sqlite.org)
- date: updated 2025-05-10 ("This page was last updated on 2025-05-10 11:18:57Z") · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official sqlite.org document (same page as S-r1-found-shm-02 / S-r1-found-rw-04; refetched so the passages can be checked under this id).
- passages:
  - P1 · § "1.3. The Wal-Index or "-shm" file": "The shm file does not contain any database content and is not required to recover the database following a crash. For that reason, the first client to connect to a quiescent database will normally truncate the shm file if it exists."
  - P2 · § "3. Recovery": "Recovery is run by the first thread to connect to a WAL-mode database. Recovery restores the WAL-index so that it accurately describes the WAL file. If there is no WAL file present when the first thread connects to the database, there is nothing to recover, but the recovery process still runs to initialize the WAL-index."
  - P3 · § "2.3. Locks" (nearest heading as reported by --check): "When a connection is holding a SHARED lock on the main database, that will prevent any other connection from acquiring the EXCLUSIVE lock, which in turn prevents the WAL-index and WAL files from being deleted out from under other users"
  - P4 · § "2.1.3. WAL Locks": "Eight bytes of space are set aside in the header to support file locking using the xShmLock() method in the sqlite3_io_methods object."

### S-ch1-r1-shm-files-02
- url: https://www.sqlite.org/howtocorrupt.html · canonical: www.sqlite.org/howtocorrupt.html
- title: How To Corrupt An SQLite Database File · authors: not printed · publisher: SQLite (sqlite.org)
- date: not printed in the excerpt read (page mentions 3.51.0, 2025-11-04) · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: official sqlite.org document (same page as S-r1-found-shm-06; refetched under this id).
- passages:
  - P1 · § "2.5. Unlinking or renaming a database file while in use": "If two processes have open connections to the same database file and one process closes its connection, unlinks the file, then creates a new database file in its place with the same name and reopens the new file, then the two processes will be talking to different database files with the same name."
  - P2 · § "2.5. Unlinking or renaming a database file while in use": "In other words, unlinking or renaming an open database file results in behavior that is undefined and probably undesirable."
  - P3 · § "2. File locking problems": "SQLite uses file locks on the database file, and on the write-ahead log or WAL file, to coordinate access between concurrent processes."

### S-ch1-r1-shm-files-03
- url: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/os_unix.c · canonical: github.com/sqlite/sqlite/blob/version-3.54.1/src/os_unix.c
- repo: github.com/sqlite/sqlite (official mirror of the Fossil repository) · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1, from the GitHub refs API; the file was fetched by the tag name)
- title: src/os_unix.c · authors: SQLite developers · publisher: SQLite project
- date: commit date not recorded · version: 3.54.1
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the project's own source mirror; release tag, pinned to a commit.
- excerpt-sha256: not computed (no local clone of the repository; the hash command form needs `git show` on a local commit). Check passages by content.
- passages:
  - P1 · os_unix.c:L4859-L4862 (unixLockSharedMemory comment): "Or, if no other process is holding any lock, then this process … is the first to open it. In this case take an EXCLUSIVE lock on the … DMS byte and truncate the *-shm file to zero bytes in size. Then … downgrade to a SHARED lock on the DMS byte."
  - P2 · os_unix.c:L4897-L4902 (unixLockSharedMemory): "The first connection to attach must truncate the -shm file. … truncate to 3 bytes (an arbitrary small number, less than the … -shm header size) rather than 0 as a system debugging aid, to … help detect if a -shm file truncation is legitimate or is the work … or a rogue process. … robust_ftruncate(pShmNode->hShm, 3)"
  - P3 · os_unix.c:L4942-L4944 (unixOpenSharedMemory comment): "When opening a new shared-memory file, if no other instances of that … file are currently open, in this process or in other processes, then … the file must be truncated to zero length or have its header cleared."
  - P4 · os_unix.c:L4876-L4878 (unixLockSharedMemory): "if( osFcntl(pShmNode->hShm, F_GETLK, &lock)!=0 ) { … }else if( lock.l_type==F_UNLCK ){"
  - P5 · os_unix.c:L4966-L4967, L5033 (unixOpenSharedMemory): "Check to see if a unixShmNode object already exists. Reuse an existing … pShmNode->hShm = robust_open(zShm, O_RDWR|O_CREAT|O_NOFOLLOW,"
  - P6 · os_unix.c:L4751 (unixShmSystemLock): "res = osSetPosixAdvisoryLock(pShmNode->hShm, &f, pFile);"

### S-ch1-r1-shm-files-06
- url: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/wal.c · canonical: github.com/sqlite/sqlite/blob/version-3.54.1/src/wal.c
- repo: github.com/sqlite/sqlite · commit: 57520227c95396ce39ba6ecaac8d475b78dd3964 (tag version-3.54.1)
- title: src/wal.c · authors: SQLite developers · publisher: SQLite project
- date: commit date not recorded · version: 3.54.1
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the project's own source mirror; release tag.
- excerpt-sha256: not computed (no local clone). Check passages by content.
- passages:
  - P1 · wal.c:L287-L290 (comment before the WAL lock index numbers): "The standard implementation used on both unix and windows … is for the index number to indicate a byte offset into the … locks are on the shm file."
  - P2 · wal.c:L1669-L1673 (comment on sqlite3WalOpen): "A SHARED lock should be held on the database file when this function … is called. The purpose of this SHARED lock is to prevent any other … client from unlinking the WAL or wal-index file. If another process … were to do this just after this client opened one of these files, the … system would be badly broken."
  - P3 · wal.c:L2602-L2606 (sqlite3WalClose): "If an EXCLUSIVE lock can be obtained on the database file (using the … ordinary, rollback-mode locking methods, this guarantees that the … connection associated with this log file is the only connection to … the database. In this case checkpoint the database and unlink both … the wal and wal-index files."
  - P4 · wal.c:L669-L672 (comment on SQLITE_USE_SEH): "Without this compile-time option, any system-level faults that appear … while accessing the memory-mapped -shm file will cause a process-wide … signal to be deliver, which will more than likely cause the entire … process to exit."

### S-ch1-r1-shm-files-04
- url: https://sqlite.org/forum/forumpost/f97faf08ca · canonical: sqlite.org/forum/forumpost/f97faf08ca
- title: Can -wal -shm files be deleted if -wal file is empty? · authors: posts by 6kEs4Majrd, Dan Kennedy (dan), Simon Slavin, Keith Medcalf, Larry Brasfield · publisher: SQLite User Forum (sqlite.org)
- date: 2020-07-08 to 2020-07-10 · version: n/a (SQLite as of mid-2020)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: forum · peer-review: no
- owner: SQLite project hosts the forum; the quoted posts are by Dan Kennedy · upstream: none
- lateral: Dan Kennedy is, to this researcher's knowledge, a long-time core SQLite developer (sqlite.org/crew.html); not re-checked in this run (budget). The forum is rung 3 by the ladder; the lead may treat his posts only as an attributed developer statement.
- passages:
  - P1 · § "(2.1) By Dan Kennedy (dan) on 2020-07-08 18:33:17": "You can, if you are quite sure there are no libsqlite3 users at all accessing the databases. If there are processes with the db open and you delete these files, the db might become corrupted later on."
  - P2 · § "(2.1) By Dan Kennedy (dan) on 2020-07-08 18:33:17": "Safer is to use the command-line tool to open, query and then close the database. If there really are no other processes running, this should delete the *-wal and *-shm files."
  - P3 · § "(15) By Dan Kennedy (dan) on 2020-07-09 14:39:29": "Not equivalent if another process has the db open."
  - P4 · § "(12) By Dan Kennedy (dan) on 2020-07-09 14:07:17": "If you use the shell tool to clean up the *-wal and *-shm files, it will simply delete them if the *-wal file really is empty and unused. But if it is not, then the shell tool will not corrupt the db."

## Claims

### C-ch1-r1-shm-files-01
- claim: SQLite's WAL file-format page says that, because the -shm file holds no database content and is not needed to recover the database after a crash, the first client to connect to a quiescent WAL-mode database will normally truncate the -shm file if one exists.
- kind: behaviour
- questions: Q-ch1-01 · load-bearing: yes (verifies part 1 of C-r1-found-shm-34; answers (b))
- support: S-ch1-r1-shm-files-01/P1 · rung 1 · fit direct · upstream self
- scope: walformat.html updated 2025-05-10; "normally"; quiescent database (no connection open)
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-shm-files-02
- claim: SQLite's WAL file-format page says recovery is run by the first thread to connect to a WAL-mode database, and that even when no WAL file is present the recovery process still runs to initialise the wal-index.
- kind: behaviour
- questions: Q-ch1-01 · load-bearing: yes (a missing -shm after all connections closed is rebuilt by the next opener)
- support: S-ch1-r1-shm-files-01/P2 · rung 1 · fit direct · upstream self
- scope: walformat.html updated 2025-05-10
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-shm-files-03
- claim: In SQLite 3.54.1's unix VFS, a process opening the -shm file decides whether it is the first to open it by asking (with F_GETLK) whether any other process holds a lock on the -shm file's DMS byte; if none does, it takes an exclusive lock on that byte, truncates the -shm file, and then downgrades to a shared lock.
- kind: behaviour
- questions: Q-ch1-01 · load-bearing: yes (the "first connection" test is a lock on the -shm file itself)
- support: S-ch1-r1-shm-files-03/P1 · rung 1 · fit direct · upstream self
- support: S-ch1-r1-shm-files-03/P4 · rung 1 · fit direct (the F_GETLK test on the -shm descriptor) · upstream self
- scope: unix VFS, version-3.54.1 (commit 57520227c953); not the windows VFS
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-shm-files-04
- claim: In SQLite 3.54.1's unix VFS the first connection truncates the -shm file to 3 bytes rather than 0, which the source comment explains as a debugging aid to help tell whether a -shm truncation is legitimate or the work of a rogue process.
- kind: behaviour
- questions: Q-ch1-01 · load-bearing: no (detail; shows the developers anticipate outside processes truncating a -shm)
- support: S-ch1-r1-shm-files-03/P2 · rung 1 · fit direct · upstream self
- scope: unix VFS, version-3.54.1
- confidence: high · flags: none (the comment at L4861 says "truncate the *-shm file to zero bytes in size"; the code at L4902 truncates to 3; an internal comment inconsistency, see flags)
- conflicts: none

### C-ch1-r1-shm-files-05
- claim: In SQLite's standard unix and windows VFSes, all of the WAL locks (the write lock, checkpoint lock, recovery lock and the reader locks) are byte locks on the -shm file, not on the database file; the unix VFS takes them as POSIX advisory locks on the -shm file descriptor.
- kind: behaviour
- questions: Q-ch1-01 · load-bearing: yes (why a replaced -shm leaves old and new connections taking WAL locks on different files)
- support: S-ch1-r1-shm-files-06/P1 · rung 1 · fit direct · upstream self
- support: S-ch1-r1-shm-files-03/P6 · rung 1 · fit direct (unix: fcntl lock on pShmNode->hShm) · upstream self
- support: S-ch1-r1-shm-files-01/P4 · rung 1 · fit partial (lock bytes reserved in the wal-index header, taken via xShmLock) · upstream self
- scope: unix and windows VFSes, version-3.54.1
- confidence: high · flags: none
- conflicts: S-ch1-r1-shm-files-02/P3 "SQLite uses file locks on the database file, and on the write-ahead log or WAL file, to coordinate access between concurrent processes."

### C-ch1-r1-shm-files-06
- claim: A comment in SQLite 3.54.1's wal.c says a connection holds a SHARED lock on the database file when it opens the WAL in order to prevent any other client from unlinking the WAL or wal-index (-shm) file, and that if another process unlinked one of these files just after this client opened it, "the system would be badly broken".
- kind: behaviour
- questions: Q-ch1-01 · load-bearing: yes (the only rung-1 statement found on the consequence of unlinking a -shm in use)
- support: S-ch1-r1-shm-files-06/P2 · rung 1 · fit direct · upstream self
- support: S-ch1-r1-shm-files-01/P3 · rung 1 · fit partial (docs: the SHARED lock prevents the WAL-index and WAL files being deleted out from under other users) · upstream self
- scope: version-3.54.1; the protection is a lock that other SQLite clients honour; an outside tool such as `rm` does not take it (that last point is this researcher's reading, not stated in the source)
- confidence: high · flags: vendor-about-itself (attribute: "SQLite's source says…")
- conflicts: none

### C-ch1-r1-shm-files-07
- claim: In SQLite 3.54.1 a closing connection unlinks the -wal and -shm files only after it has obtained an EXCLUSIVE lock on the database file, which guarantees it is the only connection to the database.
- kind: behaviour
- questions: Q-ch1-01 · load-bearing: no (extends C-r1-found-shm-31 with the source; SQLite's own deletion never happens while another connection is open)
- support: S-ch1-r1-shm-files-06/P3 · rung 1 · fit direct · upstream self
- scope: version-3.54.1, default (no SQLITE_FCNTL_PERSIST_WAL)
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-shm-files-08
- claim: In SQLite 3.54.1's unix VFS, connections in one process to the same database share a single open -shm file (an existing shared-memory node is reused), and a process that finds none opens the -shm file by name with O_CREAT, so it creates a new -shm file if none exists at that path.
- kind: behaviour
- questions: Q-ch1-01 · load-bearing: no (mechanism: a new process opens whatever file is at the -shm path)
- support: S-ch1-r1-shm-files-03/P5 · rung 1 · fit direct · upstream self
- scope: unix VFS, version-3.54.1; the reuse is keyed on the database file's inode record (pInode->pShmNode)
- confidence: high · flags: none
- conflicts: none

### C-ch1-r1-shm-files-09
- claim: On the SQLite forum in 2020, SQLite developer Dan Kennedy wrote that leftover -wal and -shm files can be deleted only if one is quite sure no process is using the database, that if processes have the database open and the files are deleted the database might become corrupted later, and that it is safer to open, query and close the database with the sqlite3 command-line tool, which deletes the files itself if no other process is using it.
- kind: fact
- questions: Q-ch1-01 · load-bearing: no (rung 3; attributed only; corroborates C-06 in plain words)
- support: S-ch1-r1-shm-files-04/P1 · rung 3 · fit direct · upstream self
- support: S-ch1-r1-shm-files-04/P2 · rung 3 · fit direct · upstream self
- support: S-ch1-r1-shm-files-04/P4 · rung 3 · fit direct · upstream self
- scope: forum posts of 2020-07-08/09; concerns deleting both -wal and -shm, not the -shm alone
- confidence: medium · flags: vendor-about-itself (developer on the project's forum); rung 3
- conflicts: none

### C-ch1-r1-shm-files-10
- claim: Dan Kennedy wrote on the SQLite forum in 2020 that opening and closing the database with the sqlite3 command-line tool is not equivalent to deleting the -wal and -shm files by hand if another process has the database open.
- kind: fact
- questions: Q-ch1-01 · load-bearing: no
- support: S-ch1-r1-shm-files-04/P3 · rung 3 · fit direct · upstream self
- scope: forum post 2020-07-09
- confidence: medium · flags: rung 3
- conflicts: none

### C-ch1-r1-shm-files-11
- claim: A comment in SQLite 3.54.1's unix VFS says that when a new shared-memory (-shm) file is opened and no other instance of it is open in this or any other process, the file must be truncated to zero length or have its header cleared.
- kind: behaviour
- questions: Q-ch1-01 · load-bearing: no (bears on part 2 of C-r1-found-shm-34)
- support: S-ch1-r1-shm-files-03/P3 · rung 1 · fit direct · upstream self
- scope: unix VFS, version-3.54.1
- confidence: high · flags: none
- conflicts: S-r1-found-shm-04/P2 "The VFS is required to either truncate or zero the header of the wal-index when the last connection to it closes." (fileformat2: at last close; os_unix.c: at first open)

### C-ch1-r1-shm-files-12
- claim: Without the Windows-only SQLITE_USE_SEH compile-time option, a system-level fault while SQLite 3.54.1 accesses the memory-mapped -shm file raises a process-wide signal that will most likely make the whole process exit.
- kind: behaviour
- questions: Q-ch1-01 · load-bearing: no (what a connection can suffer if its mapped -shm is truncated under it; the link to truncation is not stated by the source)
- support: S-ch1-r1-shm-files-06/P4 · rung 1 · fit partial (states the consequence of a fault on the mapping, not its cause) · upstream self
- scope: version-3.54.1; builds without SQLITE_USE_SEH
- confidence: medium · flags: none
- conflicts: none

## Conflicts
- C-ch1-r1-shm-files-05: S-ch1-r1-shm-files-06/P1 (wal.c) says "all locks are on the shm file"; S-ch1-r1-shm-files-02/P3 (howtocorrupt §2) says SQLite uses locks "on the database file, and on the write-ahead log or WAL file". Both quoted above; not settled. (Possibly loose wording in howtocorrupt calling the -shm the "WAL file"; nature looks definitional.)
- C-ch1-r1-shm-files-11 / C-r1-found-shm-34 part 2: S-ch1-r1-shm-files-03/P3 (os_unix.c) puts the truncate-or-clear-header duty at the first open of a -shm with no other instance open; S-r1-found-shm-04/P2 (fileformat2) puts it "when the last connection to it closes". Both quoted; not settled. Note C-r1-found-shm-34 cites S-r1-found-shm-02/P2 for both halves, but the "last connection closes" half comes from fileformat2 (S-r1-found-shm-04/P2), not walformat.

## Speculation and flags
- Not found in the documentation: none of wal.html, walformat.html or howtocorrupt.html says what happens if the -shm is deleted or replaced while connections are open. howtocorrupt §2.5 (S-ch1-r1-shm-files-02/P1, P2) concerns unlinking or renaming the database file only; its "undefined" verdict must not be quoted as being about the -shm.
- Inference for the lead, not a claim (no source states the chain): if a live -shm is deleted on unix, a process opening the database afterwards creates a new -shm at that path (C-08), finds no lock on its DMS byte and so treats itself as the first connection, truncates and runs recovery (C-03, C-02), and then takes its WAL locks on the new file while the old connections keep locking and writing the unlinked one (C-05). The two groups would not exclude each other, which is the "memory would not really be shared … database corruption" case of C-r1-found-shm-13. wal.c's "badly broken" (C-06) is the rung-1 statement closest to this; the chapter should attribute rather than describe the mechanism in its own voice.
- C-ch1-r1-shm-files-04: os_unix.c comment L4861 says "truncate the *-shm file to zero bytes in size" while the code and the comment at L4897 truncate to 3 bytes. Internal inconsistency; the code is the behaviour.
- C-ch1-r1-shm-files-06: the "badly broken" wording is a developer comment (vendor-about-itself); keep it attributed.
- S-ch1-r1-shm-files-04: rung 3 forum; the author's role is from this researcher's knowledge, not re-verified this run.
- Code passages: no excerpt hashes (no local clone); the commit is pinned via the refs API.

## Unused leads
- https://sqlite.org/forum/forumpost/9942f36644 — (saved as pages/S-ch1-r1-shm-files-05.txt) 2021 "SIGBUS in sqlite" thread: a user speculates that another process truncating the -shm to 3 bytes caused SIGBUS in walIndexAppend; Dan Kennedy links it to howtocorrupt §2.2 and to deleting a db file while open. Rung 3, speculative; illustrates C-12.
- https://www.sqlite.org/crew.html — would confirm Dan Kennedy's role for S-ch1-r1-shm-files-04 (not fetched: budget).

## Queries
- "sqlite delete -shm file while database open" → useful
- "sqlite forum "-shm" deleted while in use corruption drh" → nothing new
- "sqlite wal-index shm file unlinked new process recovery separate shared memory" → nothing new
- direct fetches: walformat.html, howtocorrupt.html, os_unix.c and wal.c at version-3.54.1, GitHub refs API for the tag → useful

# Verification: 20261023-1245-sqlite-wal · ch1-b2
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 8 · supported 7 · partial 1 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0

Pages saved in pages/ch1-b2/ under the source ids (S-ch1-r1-shm-files-01 = walformat.html; S-ch1-r1-shm-files-06 = src/wal.c at tag version-3.54.1, also os_unix.c at the same tag; S-ch1-r1-shm-hosts-06 = Docker volumes page; S-ch1-r1-shm-hosts-07 = Docker bind-mounts page). Passages were checked with `--check` against the findings files; every passage cited below returned `found`. Code was checked by content (no local clone; no excerpt hash).

## Records

### V-C-ch1-r1-shm-files-06-1
- claim: C-ch1-r1-shm-files-06
- source S-ch1-r1-shm-files-06 · opened: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/wal.c (curl) · quote-match: exact · passage at wal.c:L1669-L1673: found verbatim (lines 1669-1673)
- source S-ch1-r1-shm-files-01 · opened: https://www.sqlite.org/walformat.html (curl) · quote-match: exact · passage at § "2.3.1. How the various locks are used" (P3): found verbatim (line 206)
- looked first: wal.c has two places that mention unlinking the WAL/wal-index: the comment above sqlite3WalOpen (L1665-1673) and the sqlite3WalClose comment (L2602-2606). The sqlite3WalOpen comment is a precondition note: "A SHARED lock should be held on the database file when this function is called. The purpose of this SHARED lock is to prevent any other client from unlinking the WAL or wal-index file. If another process were to do this just after this client opened one of these files, the system would be badly broken." The docs (walformat) say a SHARED lock on the main database prevents any other connection from getting the EXCLUSIVE lock, "which in turn prevents the WAL-index and WAL files from being deleted out from under other users".
- implied: (1) the comment is in wal.c at tag version-3.54.1: yes. (2) a SHARED lock is held on the database file when the WAL is opened: stated as "should be held" (a precondition on the caller), read here as holding. (3) purpose: prevent any other client from unlinking the WAL or wal-index: yes. (4) wal-index = -shm: the comment says "wal-index file", and the docs name the wal-index file the "-shm" file. (5) the "badly broken" quote: verbatim, spanning a line break ("the" / "system would be badly broken"). (6) the "if another process unlinked one just after this client opened it" scenario: yes. The scope note (an outside tool such as `rm` takes no SQLite lock) is the researcher's reading and is not in the source; it must not be written as sourced.
- verdict: supported · reason: every element is directly stated in the code comment at the 3.54.1 tag; the only softening is "should be held" (precondition) versus the claim's "holds".
- bar: met (descriptive claim about the code, rung 1; attributed form "SQLite's source says"; the docs passage is partial support and not needed) · independence: n/a (one project, upstream self) · currency: 3.54.1 is the latest release listed on sqlite.org/changes.html (dated 2026-10-16, fetched 2026-10-23); no later release changes this.
- counter: none-found ("SQLite delete -shm file while database open consequences", "SQLite WAL unlinked wal-index file corruption another process removes -wal", "SQLite changes.html latest release / sqlite3WalOpen changes"). The search results (forum posts by a SQLite developer, rung 3, not opened) agree with the claim: deleting these files while a connection is open can corrupt the database. No source disagrees.

### V-C-ch1-r1-shm-files-07-1
- claim: C-ch1-r1-shm-files-07
- source S-ch1-r1-shm-files-06 · opened: https://raw.githubusercontent.com/sqlite/sqlite/version-3.54.1/src/wal.c (curl) · quote-match: exact · passage at wal.c:L2602-L2606: found verbatim
- also read (code path): src/wal.c sqlite3WalClose L2590-2650 and walIndexClose L1649-1661; src/os_unix.c unixShmUnmap L5503-5546, same tag.
- implied: the comment says "If an EXCLUSIVE lock can be obtained on the database file (using the ordinary, rollback-mode locking methods, this guarantees that the connection associated with this log file is the only connection to the database. In this case checkpoint the database and unlink both the wal and wal-index files." In the code, `isDelete = 1` is set only inside the branch entered after `sqlite3OsLock(pWal->pDbFd, SQLITE_LOCK_EXCLUSIVE)` returns SQLITE_OK, and only when the checkpoint succeeded and `bPersist!=1`. `isDelete` is passed to `walIndexClose` -> `sqlite3OsShmUnmap(..., isDelete)` -> `unixShmUnmap`, which calls `osUnlink(pShmNode->zFilename)` when `nRef` reaches 0; the WAL is deleted by `sqlite3OsDelete`. So: unlink of -wal and -shm only after the EXCLUSIVE lock; the lock guarantees the only connection; scope "no PERSIST_WAL" matches the `bPersist!=1` condition. One further condition in the code (the checkpoint must succeed) is not in the claim; the claim says "only after", not "whenever", so it is not contradicted.
- verdict: supported · reason: comment and code agree with the claim in 3.54.1.
- bar: met (rung 1 descriptive, not load-bearing) · independence: n/a · currency: 3.54.1 is the latest release (see above).
- counter: not run

### V-C-ch1-r1-shm-files-01-1
- claim: C-ch1-r1-shm-files-01
- source S-ch1-r1-shm-files-01 · opened: https://www.sqlite.org/walformat.html (curl) · quote-match: exact · passage at § "1.3. The Wal-Index or "-shm" file" (P1): found verbatim (line 51)
- implied: "The shm file does not contain any database content and is not required to recover the database following a crash. For that reason, the first client to connect to a quiescent database will normally truncate the shm file if it exists." Items: no database content, not needed for crash recovery, reason link ("For that reason"), first client, quiescent database, "normally", truncate, "if it exists": all match the claim.
- verdict: supported · reason: the claim restates the passage, with its hedge "normally".
- bar: met (rung 1, official docs, descriptive) · independence: n/a · currency: page "last updated 2025-05-10"; sqlite.org current page fetched 2026-10-23.
- counter: not run

### V-C-ch1-r1-shm-files-02-1
- claim: C-ch1-r1-shm-files-02
- source S-ch1-r1-shm-files-01 · opened: https://www.sqlite.org/walformat.html (curl) · quote-match: exact · passage at § "3. Recovery" (P2): found verbatim (line 266)
- implied: "Recovery is run by the first thread to connect to a WAL-mode database. … If there is no WAL file present when the first thread connects to the database, there is nothing to recover, but the recovery process still runs to initialize the WAL-index." Both halves match the claim.
- verdict: supported · reason: direct statement.
- bar: met (rung 1 descriptive) · independence: n/a · currency: as above.
- counter: not run

### V-C-ch1-r1-shm-hosts-04-1
- claim: C-ch1-r1-shm-hosts-04
- source S-ch1-r1-shm-hosts-06 · opened: https://docs.docker.com/engine/storage/volumes/ (curl) · quote-match: exact · P1 at § "Volumes": found verbatim (line 974); P2 at § "A volume's lifecycle": found verbatim (line 989). The researcher recorded the locator of P2 as § "Volumes"; the nearest heading on the page is "A volume's lifecycle".
- implied: "When you create a volume, it's stored within a directory on the Docker host. When you mount the volume into a container, this directory is what's mounted into the container." and "A given volume can be mounted into multiple containers simultaneously." All three parts match. The page also says elsewhere that volume drivers can store data on external systems (see hosts-06); the claim's attribution to the docs and its scope (default local driver) cover this.
- verdict: supported · reason: all parts directly stated.
- bar: met (rung 1 descriptive about Docker's own docs) · independence: n/a · currency: current Docker docs page, fetched 2026-10-23; no date on the page.
- counter: not run

### V-C-ch1-r1-shm-hosts-05-1
- claim: C-ch1-r1-shm-hosts-05
- source S-ch1-r1-shm-hosts-07 · opened: https://docs.docker.com/engine/storage/bind-mounts/ (curl) · quote-match: exact · passage at § "Bind mounts" (P1): found verbatim (line 958)
- implied: the passage says: "When you use a bind mount, a file or directory on the host machine is mounted from the host into a container. By contrast, when you use a volume, a new directory is created within Docker's storage directory on the host machine. Docker creates and maintains this storage location, but containers access it directly using standard filesystem operations." Part 1 (a bind mount mounts a host file or directory into a container): stated. Part 2 (with either a bind mount or a volume, containers access the storage directly using standard filesystem operations): the "it" in "containers access it directly" refers to the volume's storage location, which is set "by contrast" with the bind mount. The sentence does not say this about bind mounts. The surrounding text on the page does not say it either.
- verdict: partial · reason: part 1 is stated; the "directly using standard filesystem operations" statement is made only about a volume's storage location, not about both. · narrower claim: "Docker's documentation says a bind mount mounts a file or directory on the host machine into a container, and that, for a volume, Docker creates and maintains a new directory in its storage directory on the host and containers access that location directly using standard filesystem operations."
- bar: met for the narrower claim (rung 1 descriptive) · independence: n/a · currency: current docs page, fetched 2026-10-23.
- counter: not run

### V-C-ch1-r1-shm-hosts-06-1
- claim: C-ch1-r1-shm-hosts-06
- source S-ch1-r1-shm-hosts-06 · opened: https://docs.docker.com/engine/storage/volumes/ (curl) · quote-match: exact · P3 at § "Create a volume using a volume driver": found verbatim (line 1208); P4 at § "Create a service which creates an NFS volume": found verbatim (line 1226)
- implied: P3: "This example mounts the /remote directory on host 1.2.3.4 into a volume named rclonevolume." (rclone volume driver, `-d rclone`, the setup assumes a second node reached over SSH). P4: "…creates an NFS volume … It uses 10.0.0.10 as the NFS server and /var/docker-nfs as the exported directory on the NFS server. Note that the volume driver specified is local." Both examples are named volumes whose data is on another machine; the claim names a volume driver (rclone) and the built-in local driver with NFS options. The page's section "Share data between machines" also says volumes can use a driver that writes to an external storage system like NFS or Amazon S3.
- verdict: supported · reason: both examples are stated in the docs and match the claim; "data lives on another machine" is the direct meaning of a remote directory and an NFS server.
- bar: met (rung 1 descriptive) · independence: n/a · currency: current docs page, fetched 2026-10-23.
- counter: not run

### V-C-ch1-r1-shm-hosts-07-1
- claim: C-ch1-r1-shm-hosts-07
- source S-ch1-r1-shm-hosts-07 · opened: https://docs.docker.com/engine/storage/bind-mounts/ (curl) · quote-match: exact · passage at § "Considerations and constraints" (P2): found verbatim (line 974)
- looked first: searched the page for "Docker Desktop" and "Linux VM". The only statement on the topic is the one in "Considerations and constraints": "For Docker Desktop, the daemon runs inside a Linux VM, not directly on the native host. Docker Desktop has built-in mechanisms that transparently handle bind mounts, allowing you to share native host filesystem paths with containers running in the virtual machine." The researcher recorded the locator as § "Bind mounts"; the nearest heading is "Considerations and constraints".
- implied: daemon inside a Linux VM, not directly on the native host: stated. Built-in mechanisms handle bind mounts and share native host paths with containers in the VM: stated. The passage says only "Docker Desktop", with no operating-system list; the scope line "(macOS, Windows, and Docker Desktop for Linux)" is not in this passage and the claim itself does not make it.
- verdict: supported · reason: the claim restates the passage and is attributed to the docs. The scope note naming the operating systems is not sourced by this passage.
- bar: met (rung 1 descriptive, the vendor's statement about its own product, attributed form) · independence: n/a · currency: current docs page; the search for a later change found no change in the architecture and the docs page is the current one; the cited results (Docker blog "The Magic Behind the Scenes of Docker Desktop", Docker forum) agree.
- counter: none-found ("Docker Desktop bind mount limitations virtiofs file locking mmap SQLite", "Docker Desktop daemon runs in VM bind mount changed no longer Linux VM"). The first query turned up reports of virtiofs/mmap trouble with SQLite on non-Docker setups (an Incus forum thread, rung 3, unopened), which concern how well VM-shared mounts behave and not whether the daemon runs in a VM.

## Counter-evidence
none-found for both `main` claims; no counter-source recorded (counter ids vch1-2 unused).

## Leads
- https://sqlite.org/forum/forumpost/f97faf08ca — SQLite forum thread "Can -wal -shm files be deleted if -wal file is empty?"; a SQLite developer is reported to say deleting these files while processes have the database open can corrupt it (unopened, rung 3; upstream is the developer's own statement, which could be cited if found in a rung 1 page).
- https://discuss.linuxcontainers.org/t/sqlite3-virtiofs-mmap/22927 — a SQLite WAL -shm mmap failure on a virtiofs mount (Incus, not Docker; unopened, rung 3); relevant to what happens when a database sits on a VM-shared mount.
- https://www.docker.com/blog/file-sharing-with-docker-desktop/ — Docker's post on Docker Desktop file sharing (unopened); possible rung 1 for the mechanism behind bind mounts.

# Gaps: 20261023-1245-sqlite-wal · after round 0 · scope: chapter 1 (how-wal-works)
- reviewer: claude-opus-5-5 · verdict: 3 load-bearing gaps
- closed since the last review: none (of gaps/final.md's chapter-1 gaps) · still open: G-r1-01, G-r1-06, G-r1-07
## Gaps
### G-r0-01
- question: Can T2's checklist items "a writable directory for -wal and -shm beside the database" and "not on read-only media" be stated, and in what words? No claim mapped to chapter 1 supports either. The ledger's narrower C-r1-criticism-10 says that since 3.22.0 a read-only WAL database can be opened if the -shm and -wal exist or can be created, or if the database is immutable, and that the docs call converting to DELETE first good practice.
- kind: evidence
- load-bearing: yes — as the outline stands, T2's deliverable would carry an unsourced item, and "not on read-only media" as a hard rule overstates the ledger.
- owner: found-shm (mapping, no web research: the claims exist but are mapped to chapter 2 only)
- try: map into outline-ch1 C-r1-criticism-10 (its narrower wording), C-r1-found-shm-07 ("in the same directory as the database"), C-r1-found-shm-38 (a read-only -shm gives a private heap wal-index), and Q28's C-r1-practice-ops-51, -54 and -55 (read their wording first; -55 is attributed only). Then reword the item: "WAL must be able to create -wal and -shm beside the database; read-only media works only under the 3.22.0 conditions, and the docs advise switching to DELETE first."
- refs: T2, Q6, Q28, C-r1-criticism-10 (P), C-r1-found-shm-07, C-r1-found-shm-38, C-r1-practice-ops-51, C-r1-practice-ops-54, C-r1-practice-ops-55
### G-r0-02
- question: If the -shm file "holds no database content, is not needed for recovery and is rebuilt", may I delete it, and when does deleting it corrupt the database?
- kind: expert
- load-bearing: yes — the T4 table (the cell "needed for recovery: -shm no") and quiz q5 ("which one is rebuilt") invite the reader to delete a live -shm. The book's only file warning, in chapter 2's runbook, names the -wal alone. A connection that opens after the -shm was deleted, while other connections still map the old one, works from a different wal-index file, and C-r1-found-shm-13 says that results in corruption. Without the warning the chapter teaches a corrupting action by omission.
- owner: found-shm (Q15), with practice-ops (Q26)
- try: first check chapter 2's Q26 claims in findings/r1-practice-ops.md for a statement about deleting the -shm, and if there is one, map it to T4 and q5. Otherwise try: howtocorrupt.html §2 (files deleted or renamed while in use); wal.html §4 and §7; walformat.html on the -shm's life cycle; unlink(2) (an unlinked file stays mapped for the processes that hold it). C-r1-found-shm-34 (candidate, not used: the first client truncates a stale -shm) needs verifying before use. State the warning as the chapter's own chain over C-r1-found-shm-13 only if no direct statement is found, and mark it as such.
- refs: T4, Q15, Q26, quiz q5, table-three-files, C-r1-found-shm-08, C-r1-found-rw-25, C-r1-found-shm-13, C-r1-found-shm-34
### G-r1-06
- question: My service runs in Docker. Do two containers on one host that share a bind mount or a volume count as "one host" for the -shm mapping, and does Docker Desktop's VM file sharing on macOS?
- kind: reader
- load-bearing: yes — upgraded from final.md's "only if the chapter mentions containers". The brief puts containers in scope "as they change the filesystem question", and T2's first checklist item is "one host". The chapter also teaches C-r1-found-shm-07 (processes with different root directories, i.e. chroot, got different shared memory, which led to corruption) and C-r1-found-shm-13 (different wal-index files lead to corruption), and a reader running containers will apply both to containers. At the least, the chapter must state the limit unconditionally.
- owner: found-shm
- try: Docker's docs on bind mounts and volumes (rung 1 for what Docker shares); Docker Desktop's file-sharing docs (virtiofs, gRPC FUSE), for whether mmap and locks stay coherent there; Linux mmap(2) MAP_SHARED and fcntl(2) lock semantics between processes on one kernel (rung 1; a chain built from these is the chapter's own and must be marked so); the upstream experiment behind Simon Willison's 2026-04-07 note (a rung-3 lead, pages/S-r1-found-shm-08.txt). Queries: "sqlite WAL docker volume shared memory", "sqlite forum WAL docker containers same host". Fallback: the outline's stated wording, made unconditional.
- refs: Q12, T2, C-r1-found-shm-07, C-r1-found-shm-13, lead simonwillison.net/2026/Apr/7/sqlite-wal-docker-containers/ (r1-found-shm unused)
### G-r1-01
- question: While a RESTART or TRUNCATE checkpoint runs or waits for readers, do new read transactions wait? And what changes in builds with SQLITE_ENABLE_SETLK_TIMEOUT (blocking locks)?
- kind: evidence
- load-bearing: no — table-who-blocks marks that cell as disputed and the chapter teaches D-01 with its weight. Q38 stays thin under the stated disposition in gaps/final.md.
- owner: found-ckpt
- try: the blame of docsrc pages/wal.in (curl got a robot check; an archived timeline or a docsrc mirror may date the §6 sentence); the tests at version-3.54.1 (test/wal5.test and other checkpoint tests) for a reader opened during a RESTART busy-handler wait; the SQLITE_ENABLE_SETLK_TIMEOUT branches of walTryBeginRead and walCheckpoint
- refs: Q38, D-01, C-r1-found-ckpt-21 (C), C-r1-found-ckpt-29 (C), C-r2-found-ckpt-03 (U), C-r2-found-ckpt-04 (P), C-r2-found-ckpt-08, C-r2-found-ckpt-09 (C), lead sqlite.org/docsrc/blame (r2-found-ckpt unused)
### G-r1-07
- question: What will I actually see if I run WAL across two hosts on NFS or SMB: an error at `journal_mode=WAL`, a disk I/O error, or silent corruption?
- kind: reader
- load-bearing: no — the documented rule (C-r1-found-shm-11, -12) is enough for T2's decision, and the stated disposition holds.
- owner: found-shm
- try: Mozilla bug 629296 (journal_mode=WAL on Solaris NFS failing with a disk I/O error; seen in a snippet, never opened; rung 1 for that incident only); useovernet.html beyond C-r1-found-shm-15 and -16. C-r1-found-shm-17 (a VFS without shared-memory methods leaves the journal mode unchanged) is a symptom only for such a VFS. Do not generalise it to NFS.
- refs: Q12, C-r1-found-shm-11, C-r1-found-shm-12, C-r1-found-shm-14, C-r1-found-shm-17, leads bugzilla.mozilla.org/show_bug.cgi?id=629296 and docs.gotosocial.org (rung 3) (r1-found-shm unused)
### G-r0-03
- question: What else makes a query return SQLITE_BUSY in WAL mode? In particular, the last connection closing, which holds an exclusive lock while it runs its final checkpoint and deletes the -wal and -shm files.
- kind: expert
- load-bearing: no — the table is correct without the row, but it is incomplete. wal.html §9 lists three cases; table-who-blocks carries two (recovery and EXCLUSIVE locking mode). A service that opens and closes a connection per request meets the third.
- owner: found-shm (mapping only)
- try: map C-r1-practice-config-18 (supported; mapped to chapter 2 only) and C-r1-found-shm-30 into table-who-blocks as a row "the last connection closing". If verified, C-r1-found-shm-31 (candidate, not used) explains how a connection knows it is the last.
- refs: T1, Q13, Q15, Q19, C-r1-practice-config-18, C-r1-practice-config-19, C-r1-found-shm-30, C-r1-found-shm-31, lead wal.html §9 (r1-found-rw unused)
### G-r0-04
- question: In what order does a checkpoint sync the WAL, copy frames, record nBackfill, sync the database file and (if the database shrank) truncate it? And does every step seq-checkpoint draws have a claim in the ledger?
- kind: depth
- load-bearing: no — the docs' order (wal.html §2.1 and §3.1, fileformat2.html §4.4) is enough for the diagram, and the code only confirms it. A drawn step with no claim, such as "in page order" or the nBackfill update as a step (C-r1-found-shm-05 gives it only as a field), must be sourced or dropped.
- owner: found-ckpt (the outline's declared top-up 1)
- try: walCheckpoint in src/wal.c at version-3.54.1: the sort in walIteratorInit, the sqlite3OsSync calls, the store to nBackfill, the truncate when the database shrank. Cite each by range with its excerpt hash.
- refs: Q7, seq-checkpoint, C-r1-found-ckpt-02, C-r1-found-ckpt-04, C-r1-found-ckpt-05, C-r1-found-shm-05, C-r1-found-rw-24
### G-r0-05
- question: C-r1-found-shm-13, a main claim, cites os_unix.c at master, unpinned. Does version-3.54.1 carry the same comment?
- kind: evidence
- load-bearing: no — it was verified by content. Pinning it only makes the citation stable and consistent with the chapter's other code sources at 3.54.1.
- owner: found-shm
- try: src/os_unix.c at tag version-3.54.1 (raw GitHub mirror): find the comment and cite it as path:L<a>-L<b>@<sha> with the excerpt hash
- refs: C-r1-found-shm-13, S-r1-found-shm-11
### G-r0-06
- question: What, in my Python or Go code, is "a reader on an old snapshot" that stops the checkpoint?
- kind: reader
- load-bearing: no for this chapter — T3's list names the cause. C-r1-found-rw-09 (an autocommit transaction ends when its last statement finishes) lets the chapter say that an unfinished statement keeps it open. The driver-level answer is chapter 2's G-r1-05, and chapter 1 should point to it rather than leave the question bare.
- owner: practice-config (chapter 2's top-up 3)
- try: no chapter-1 research. Leads for chapter 2: sqlite.org/forum/forumpost/1bee6a8e8da775c9 (an un-reset statement holding back checkpoints) and sqlite.org/forum/forumpost/7d292adea1 (an un-reset SELECT keeping the WAL growing), both rung 3: follow them upstream.
- refs: T3, Q9, quiz q1, C-r1-found-rw-09, C-r1-found-ckpt-19, C-r1-found-ckpt-20, G-r1-05
### G-r0-07
- question: When exactly do the -wal and -shm appear? When does a clean close still leave them on disk (a read-only last connection, SQLITE_FCNTL_PERSIST_WAL)? And what happens to a -shm left over from a crash?
- kind: reader
- load-bearing: no — for T4's "created" and "deleted" cells, C-r1-found-shm-29, -30 and -32 cover most of this. C-r1-found-shm-38 (mapped to chapter 2 only) covers the persist case, and C-r1-found-shm-34 (candidate, not used) covers a stale -shm.
- owner: found-shm
- try: map C-r1-found-shm-38; verify C-r1-found-shm-34 against walformat.html if T4 uses it; source the "created" cell (when the files are first created) from wal.html §4 or walformat.html
- refs: T4, Q15, table-three-files, C-r1-found-shm-29, C-r1-found-shm-30, C-r1-found-shm-32, C-r1-found-shm-34, C-r1-found-shm-38

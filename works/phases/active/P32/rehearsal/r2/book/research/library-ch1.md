# Library overlay: 20261023-1245-sqlite-wal · chapter 1 (`how-wal-works`)
The book's `library.md` is frozen at the outline signature; this overlay lists only what chapter 1's top-up added, in B9's line format. A source the book's library already lists keeps its book id (the duplicate entries from this top-up are named under `merged here:`, their passages in their own findings files). Count after the ch1 merge: 13 new sources (4 SQLite source files at version-3.54.1, 1 SQLite forum thread, 8 on containers); 6 duplicate entries merged into book ids.

## Book sources this chapter's top-up re-opened (book id kept)
- S-r2-found-ckpt-01 · findings/r2-found-ckpt.md · github.com/sqlite/sqlite/blob/57520227c95396ce39ba6ecaac8d475b78dd3964/src/wal.c (tag version-3.54.1) · code · rung 1 · claims (ch1 overlay): C-ch1-r1-found-ckpt-02, C-ch1-r1-found-ckpt-05, C-ch1-r1-found-ckpt-06, C-ch1-r1-found-ckpt-07, C-ch1-r1-found-ckpt-08, C-ch1-r1-found-ckpt-09, C-ch1-r1-found-ckpt-10, C-ch1-r1-found-ckpt-11, C-ch1-r1-found-ckpt-12, C-ch1-r1-found-ckpt-13, C-ch1-r1-found-ckpt-14, C-ch1-r1-found-ckpt-15, C-ch1-r1-found-ckpt-16, C-ch1-r1-found-ckpt-17, C-ch1-r1-shm-files-05, C-ch1-r1-shm-files-06, C-ch1-r1-shm-files-07, C-ch1-r1-shm-files-12 · merged here: S-ch1-r1-found-ckpt-01 (findings/ch1-r1-found-ckpt.md), S-ch1-r1-shm-files-06 (findings/ch1-r1-shm-files.md)
- S-r2-practice-config-07 · findings/r2-practice-config.md · github.com/sqlite/sqlite/blob/57520227c95396ce39ba6ecaac8d475b78dd3964/src/pager.c · code · rung 1 · claims (ch1 overlay): C-ch1-r1-found-ckpt-02, C-ch1-r1-found-ckpt-05, C-ch1-r1-found-ckpt-14 · merged here: S-ch1-r1-found-ckpt-04 (findings/ch1-r1-found-ckpt.md)
- S-r2-practice-config-08 · findings/r2-practice-config.md · github.com/sqlite/sqlite/blob/57520227c95396ce39ba6ecaac8d475b78dd3964/src/os_unix.c · code · rung 1 · claims (ch1 overlay): C-ch1-r1-shm-files-03, C-ch1-r1-shm-files-04, C-ch1-r1-shm-files-05, C-ch1-r1-shm-files-08, C-ch1-r1-shm-files-11 · merged here: S-ch1-r1-shm-files-03 (findings/ch1-r1-shm-files.md)
- S-r1-found-rw-04 · findings/r1-found-rw.md · sqlite.org/walformat.html · spec · rung 1 · claims (ch1 overlay): C-ch1-r1-shm-files-01, C-ch1-r1-shm-files-02, C-ch1-r1-shm-files-05, C-ch1-r1-shm-files-06 · merged here: S-ch1-r1-shm-files-01 (findings/ch1-r1-shm-files.md; its P3 locator corrected at the merge: § "2.3.1. How the various locks are used", as `--check` reports it)
- S-r1-found-shm-06 · findings/r1-found-shm.md · sqlite.org/howtocorrupt.html · official docs · rung 1 · claims (ch1 overlay): none mapped (its §2 passage is side A of D-ch1-01) · merged here: S-ch1-r1-shm-files-02 (findings/ch1-r1-shm-files.md)

## New sources: SQLite's source at version-3.54.1 (rung 1 for what the code does; checked by content, no excerpt hash: no local clone)
- S-ch1-r1-found-ckpt-02 · findings/ch1-r1-found-ckpt.md · github.com/sqlite/sqlite/blob/version-3.54.1/src/main.c (commit 57520227c953) · code · rung 1 · claims: C-ch1-r1-found-ckpt-01, C-ch1-r1-found-ckpt-04, C-ch1-r1-found-ckpt-05, C-ch1-r1-found-ckpt-17
- S-ch1-r1-found-ckpt-03 · findings/ch1-r1-found-ckpt.md · github.com/sqlite/sqlite/blob/version-3.54.1/src/vdbeapi.c (commit 57520227c953) · code · rung 1 · claims: C-ch1-r1-found-ckpt-03
- S-ch1-r1-found-ckpt-05 · findings/ch1-r1-found-ckpt.md · github.com/sqlite/sqlite/blob/version-3.54.1/src/wal.h (commit 57520227c953) · code · rung 1 · claims: C-ch1-r1-found-ckpt-14
- S-ch1-r1-found-ckpt-06 · findings/ch1-r1-found-ckpt.md · github.com/sqlite/sqlite/blob/version-3.54.1/src/os.c (commit 57520227c953) · code · rung 1 · claims: C-ch1-r1-found-ckpt-14

## New sources: forums (rung 3: pointers and attributed statements only, never support)
- S-ch1-r1-shm-files-04 · findings/ch1-r1-shm-files.md · sqlite.org/forum/forumpost/f97faf08ca · forum · rung 3 · claims: C-ch1-r1-shm-files-09, C-ch1-r1-shm-files-10
- S-ch1-r1-shm-hosts-02 · findings/ch1-r1-shm-hosts.md · sqlite.org/forum/forumpost/292a68c5e4 · forum · rung 3 · claims: C-ch1-r1-shm-hosts-14, C-ch1-r1-shm-hosts-15

## New sources: containers and the kernel
- S-ch1-r1-shm-hosts-01 · findings/ch1-r1-shm-hosts.md · github.com/simonw/research/tree/main/sqlite-wal-docker-containers · other (an AI-generated experiment report; the upstream of the book's rung-3 lead S-r1-found-shm-08) · rung 1 for what the report says only, rung 3 for any general truth · claims: C-ch1-r1-shm-hosts-11, C-ch1-r1-shm-hosts-12, C-ch1-r1-shm-hosts-13
- S-ch1-r1-shm-hosts-03 · findings/ch1-r1-shm-hosts.md · man7.org/linux/man-pages/man2/mmap.2.html · official docs · rung 1 · claims: C-ch1-r1-shm-hosts-01
- S-ch1-r1-shm-hosts-04 · findings/ch1-r1-shm-hosts.md · man7.org/linux/man-pages/man2/fcntl_locking.2.html · official docs · rung 1 · claims: C-ch1-r1-shm-hosts-02
- S-ch1-r1-shm-hosts-05 · findings/ch1-r1-shm-hosts.md · man7.org/linux/man-pages/man7/ipc_namespaces.7.html · official docs · rung 1 · claims: C-ch1-r1-shm-hosts-03
- S-ch1-r1-shm-hosts-06 · findings/ch1-r1-shm-hosts.md · docs.docker.com/engine/storage/volumes/ · official docs · rung 1 · claims: C-ch1-r1-shm-hosts-04, C-ch1-r1-shm-hosts-06
- S-ch1-r1-shm-hosts-07 · findings/ch1-r1-shm-hosts.md · docs.docker.com/engine/storage/bind-mounts/ · official docs · rung 1 · claims: C-ch1-r1-shm-hosts-05, C-ch1-r1-shm-hosts-07
- S-ch1-r1-shm-hosts-08 · findings/ch1-r1-shm-hosts.md · docs.docker.com/desktop/settings-and-maintenance/settings/ · official docs · rung 1 · claims: C-ch1-r1-shm-hosts-08, C-ch1-r1-shm-hosts-09, C-ch1-r1-shm-hosts-10

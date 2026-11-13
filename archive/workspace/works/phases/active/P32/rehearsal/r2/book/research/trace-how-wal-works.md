# Trace: how-wal-works (chapter 1) · run 20261023-1245-sqlite-wal
Every checkable sentence of `book/how-wal-works.md`, by heading id, mapped to claim ids in `ledger.md` (the book's, frozen) or `ledger-ch1.md` (this chapter's overlay). A partial claim (P) is used only in its narrower wording; a contested one (C) only attributed, through its D- entry; an unsupported one (U) only hedged and attributed. Exempt lines are marked: framing, example (the chapter's own toy data, applying the claims named), analogy, term (a term the chapter defines for itself), distractor.

## background
- ¶1 s1: C-r1-found-rw-27 (the rollback journal is the default method), C-r1-found-rw-26
- ¶1 s2: C-r1-found-rw-26 (rollback journal: original copied to the journal, changes written into the database file, commit when the journal is deleted)
- ¶2 s1: C-r1-found-rw-26 (attributed: the docs call WAL "the inverse")
- ¶2 s2: C-r1-found-rw-01, C-r1-found-rw-26 · term: "-wal file"
- ¶2 s3: C-r1-found-rw-27 (3.7.0, 2010-07-21; the rollback journal remains the default) · "uses WAL only once you switch it on" follows from the default (framing; chapter 2 covers switching)
- ¶3 s1: C-r1-found-rw-28 (attributed: written once versus twice, sequential), C-r1-evidence-02 (attributed: many fewer fsync() operations)
- ¶3 s2: framing

## intuition
- callout "The key idea" s1: C-r1-found-rw-02, C-r1-found-rw-01
- callout s2: C-r1-found-rw-05, C-r1-found-rw-11
- callout s3: C-r1-found-rw-03, C-r1-found-ckpt-01

## commit-appends
- ¶1 s1: example
- ¶1 s2: C-r1-found-rw-02 (a commit never writes to the original database file)
- ¶1 s3: C-r1-found-rw-04 (each frame records one page's revised content), applied to the example · term: "frame", "commit frame"
- ¶1 s4: C-r1-found-rw-04 (a transaction commits when a frame containing a commit marker is written), C-r1-found-rw-02
- ¶2 s1: example (C-r1-found-rw-04 applied)
- ¶2 s2: C-r1-found-rw-04 ("one WAL file usually records several transactions")
- ¶3 s1: C-r1-found-rw-18 (a 24-byte frame header followed by one page)
- ¶3 s2: C-r1-found-rw-18 (page number; database size after the commit, non-zero only for a commit frame)
- ¶3 s3: C-r1-found-rw-19 (a commit frame is one whose size field is non-zero), C-r1-found-rw-18
- ¶4 s1: C-r1-found-rw-02, C-r1-found-rw-03
- ¶4 s2: C-r1-found-rw-03 ("only through" a checkpoint), C-r1-found-ckpt-01 · term: "checkpoint"

## snapshots
- ¶1 s1: framing
- ¶1 s2: C-r1-found-rw-05 · term: "end mark"
- ¶1 s3: C-r1-found-rw-05 (unchanged for the transaction; a single point in time)
- ¶1 s4: C-r1-found-rw-06 P (narrower: fileformat2.html's mxFrame, the number of valid frames, which walformat.html calls the index of the last valid commit frame)
- ¶2 s1: C-r1-found-rw-07, C-r1-found-shm-02 (FindFrame: the largest frame index for P not exceeding M)
- ¶2 s2: C-r1-found-rw-07
- ¶3 s1: framing
- ¶3 s2–s6: example (C-r1-found-rw-05, C-r1-found-rw-07, C-r1-found-shm-02 applied to frames 1–3)
- ¶4 s1: C-r1-found-rw-08 · term: "snapshot isolation" (the docs' name)
- ¶4 s2: C-r1-found-rw-08
- ¶5 s1: framing
- ¶5 s2: C-r1-found-rw-09 (an automatically started transaction commits when the last statement finishes)
- ¶5 s3: C-r1-found-rw-09 (DEFERRED: starts at first access, lasts until COMMIT, ROLLBACK or an error-provoked rollback; a SELECT first starts a read transaction)
- ¶5 s4: C-r1-found-rw-05 (the end mark is unchanged until the transaction ends) · framing (forward pointer)
- diagram flow-commit-read (order: wal.html §2, fileformat2.html §4.4–§4.6): w-change framing · w-frames C-r1-found-rw-04, C-r1-found-rw-02 · w-commit C-r1-found-rw-04, C-r1-found-rw-19, C-r1-found-rw-18 · r-start C-r1-found-rw-05, C-r1-found-rw-06 P · r-find C-r1-found-shm-02 · edges found / none C-r1-found-rw-07 · caption s1 framing (sources named) · caption s2 C-r1-found-rw-02, C-r1-found-rw-06 P ("uses its recorded mxFrame for all later reads")

## one-writer
- ¶1 s1: C-r1-found-rw-11 main (scoped to standard SQLite, as its ledger line asks)
- ¶1 s2: C-r1-found-rw-11
- ¶1 s3: C-r1-found-rw-11, C-r1-criticism-09
- ¶1 s4: C-r1-found-rw-12 main (attributed: the docs list it as an advantage)
- ¶2 s1: framing
- ¶2 s2: C-r1-found-rw-13 · term: "WAL write lock"
- ¶2 s3: C-r1-found-rw-14
- ¶3 s1: framing
- ¶3 s2: C-r1-found-rw-15
- ¶3 s3: C-r1-found-rw-15 (fails with an error; its name is chapter 2's) · framing (forward pointer)

## wal-file
- ¶1 s1: C-r1-found-rw-03, C-r1-found-shm-33 (part of the persistent state of the database)
- ¶1 s2: framing
- ¶2 s1: C-r1-found-rw-20 P (cumulative checksum over everything up to the frame), C-r1-found-rw-23 (recovery finds the last valid commit frame)
- ¶2 s2: C-r1-found-rw-17 (32-byte header: page size, salt-1, salt-2 among its fields)
- ¶2 s3: C-r1-found-rw-18 (salts copied from the header; two-part cumulative checksum)
- ¶3 s1: framing
- ¶3 s2: C-r1-found-rw-20 P (narrower: salts match; checksum computed consecutively over the header's first 24 bytes, then the first 8 bytes of the frame header and the page content of every frame up to and including it)
- ¶3 s3: C-r1-found-rw-22
- ¶4 s1: framing · term: "recovery"
- ¶4 s2: C-r1-found-rw-23
- ¶4 s3: C-r1-found-rw-23, C-r1-found-rw-22 (a cut-short commit has no valid commit frame after the first failing checksum)
- diagram fig-torn-commit (the outline's figure, drawn natively): hdr C-r1-found-rw-17 · f1–f4 example · edges "checksum carried on" C-r1-found-rw-20 P · f4 "checksum fails" C-r1-found-rw-23 · caption s1 example · caption s2 C-r1-found-rw-23 · caption s3 C-r1-found-rw-22
- ¶5 s1: framing
- ¶5 s2: C-r1-found-rw-24 (salt-1 incremented, salt-2 randomized at the reset; invalidates checkpointed frames not yet overwritten) · term: "WAL reset" (defined under checkpoints)
- callout "The -wal header, field by field": C-r1-found-rw-17

## three-files
- ¶1 s1: C-r1-found-shm-29 (three files; the -shm absent in EXCLUSIVE locking mode, named here only as "the one locking mode that does without it", defined in #wal-index)
- ¶1 s2: C-r1-found-shm-29 (the -wal exists while any connection has the database open)
- ¶2 s1: C-r1-found-shm-30, C-r1-found-ckpt-18
- ¶2 s2: C-r1-found-shm-32 ("as a crash does" is the direct case of exiting without sqlite3_close(); not the source's words, per the ledger line)
- table-three-files (T4): database "what it holds" C-r1-found-rw-01, C-r1-found-rw-03 · "on disk" framing · "after a crash" C-r1-found-rw-03, C-r1-found-rw-04 (walformat: the -wal records committed transactions not yet applied) · "recovery" framing · -wal "holds" C-r1-found-rw-04, C-r1-found-shm-33 · "on disk" C-r1-found-shm-29, C-r1-found-shm-30 · "after a crash" C-r1-found-shm-32 · "recovery" C-r1-found-rw-23, C-r1-found-rw-25, C-r1-practice-ops-42 · -shm "holds" C-r1-found-shm-03, C-r1-found-shm-08 · "on disk" C-r1-found-shm-29, C-r1-found-shm-30 · "after a crash" C-r1-found-shm-32, C-ch1-r1-shm-files-01 · "recovery" C-r1-found-rw-25, C-r1-found-shm-08, C-ch1-r1-shm-files-02 · "never delete it while the database is open" C-ch1-r1-shm-files-06 (attributed, the callout below)
- callout WARNING s1: C-r1-found-shm-22 (every WAL connection holds SHARED on the database file while attached), C-ch1-r1-shm-files-06 (its walformat.html support: a SHARED lock prevents others acquiring EXCLUSIVE, which prevents the WAL-index and WAL files from being deleted out from under other users), C-r1-found-ckpt-18, C-ch1-r1-shm-files-07 (deletion only by the last connection, under EXCLUSIVE)
- callout WARNING s2: C-ch1-r1-shm-files-06 main (attributed: SQLite's source comment, wal.c at 3.54.1)
- callout WARNING s3: C-r1-practice-ops-40

## wal-index
- ¶1 s1: C-r1-found-rw-10, C-r1-found-shm-11 (thesis; detailed below)
- ¶1 s2: C-r1-found-rw-10 (merged C-r1-found-shm-01: instead of scanning the whole WAL) · term: "wal-index"
- ¶1 s3: C-r1-found-shm-02
- ¶2 s1: C-r1-found-shm-03 · term: "-shm"
- ¶2 s2: C-r1-found-shm-03
- ¶2 s3: C-r1-found-shm-04 (32,768 bytes in most cases; grows past 4,079 frames)
- ¶3 s1: framing
- ¶3 s2: C-r1-found-shm-05 (mxFrame, nBackfill, five read marks, lock bytes; no offsets) · term: "read mark"
- ¶3 s3: C-r1-found-shm-21
- ¶3 s4: C-r1-found-shm-21
- ¶4 s1: C-r1-found-shm-07 (attributed: the developers' account)
- callout "Why not /dev/shm?" s1: C-r1-found-shm-07
- callout s2: C-r1-found-shm-13 main (scope: one host, a different shm file; "might cause")
- ¶5 s1: C-r1-found-shm-11 main
- ¶5 s2: C-r1-found-shm-11
- ¶5 s3: C-r1-found-shm-12
- ¶5 s4: C-r1-found-shm-14
- ¶6 s1–s2: declared gap G-r1-07, stated as gaps/final.md words it
- ¶7 s1: framing
- ¶7 s2: C-r1-found-shm-26 · term: "EXCLUSIVE locking mode"
- ¶7 s3: C-r1-found-shm-27 P (narrower: set before the first WAL-mode access; no -shm; heap memory)
- ¶8 s1: framing
- ¶8 s2: C-r1-found-shm-28 ("busy error": the docs' SQLITE_BUSY, named in chapter 2)

## checkpoints
- ¶1 s1: C-r1-found-ckpt-12
- ¶1 s2: C-r1-found-ckpt-10 · term: "auto-checkpoint"
- ¶1 s3: C-r1-found-ckpt-10 (the compile-time default), C-r1-found-ckpt-15 (a setting changes it or turns it off; the pragma is chapter 2's)
- ¶2 s1: framing
- ¶2 s2: C-r1-evidence-18 (4096-byte default page since 3.12.0), C-r1-found-ckpt-11 (attributed: "about 4MB", given with the page size as its ledger line asks)
- ¶2 s3: C-r1-found-ckpt-28 (all automatic checkpoints are PASSIVE), C-r1-found-ckpt-27 P ("without waiting for any reader or writer")
- ¶3 s1: C-ch1-r1-found-ckpt-03 (the hook runs inside the committing statement's own sqlite3_step), C-ch1-r1-found-ckpt-04 (PASSIVE, at a frame count >= the threshold)
- ¶3 s2: C-r1-found-ckpt-13
- ¶3 s3: C-r1-found-ckpt-14

## checkpoint-steps
- ¶1 s1: framing (names the function the diagram follows)
- diagram seq-checkpoint — **order checked against `walCheckpoint` and its callers in src/wal.c at version-3.54.1** (verify/ch1-b1.md, ch1-b3.md): step 1 C-r1-found-ckpt-12, C-ch1-r1-found-ckpt-04 · step 2 C-ch1-r1-found-ckpt-03, C-ch1-r1-found-ckpt-04, C-ch1-r1-found-ckpt-06 (mxSafeFrame from read marks 1–4, before any sync or copy), C-r1-found-ckpt-04 · step 3 C-ch1-r1-found-ckpt-09 (the -wal sync, before the copy loop) · step 4 C-ch1-r1-found-ckpt-07 (ascending page order; the frame where each page was last written), C-ch1-r1-found-ckpt-10 (skips frames at or below nBackfill and past mxSafeFrame) · step 5 C-ch1-r1-found-ckpt-11 main (truncate then sync the database file, only when mxSafeFrame equals mxFrame) · step 5 note C-ch1-r1-found-ckpt-11 · step 6 C-ch1-r1-found-ckpt-12 P (narrower: nBackfill stored after the copy and the conditional truncate and sync, when the copy went through) · step 6 note C-r1-found-ckpt-04 (resumes), C-ch1-r1-found-ckpt-13 (PASSIVE never resets or truncates the -wal) · step 7 C-ch1-r1-found-ckpt-15 P (narrower: after PASSIVE, FULL or RESTART the next writer checks in walRestartLog just before writing its frames), C-r1-found-ckpt-05 · step 8 C-ch1-r1-found-ckpt-16 (salts, mxFrame 0, a new header at frame 0), C-ch1-r1-found-ckpt-15 P (lock busy: append), C-r1-found-ckpt-07 (the same file overwritten) · caption s1 C-r1-found-ckpt-02 (the docs' order), C-ch1-r1-found-ckpt-09, -10, -11 · caption s2 C-ch1-r1-found-ckpt-11, C-ch1-r1-found-ckpt-12 P · departs from book/outline.md's sketch ("records its progress, syncs the database"): the code and the docs put the database sync first, and only after a complete copy
- ¶2 s1: C-ch1-r1-found-ckpt-06 (bold finding)
- ¶2 s2: C-ch1-r1-found-ckpt-06 (its wal.c comment: frames beyond mxSafeFrame might overwrite pages in use by active readers)
- ¶2 s3: C-r1-found-ckpt-04
- ¶3 s1: C-ch1-r1-found-ckpt-09 (with its wal.c comment: recoverable after a power loss), C-ch1-r1-found-ckpt-07, C-ch1-r1-found-ckpt-10
- ¶3 s2: C-ch1-r1-found-ckpt-11 main
- ¶3 s3: C-ch1-r1-found-ckpt-12 P (narrower: only when the copy went through — iterator built, read slot 0 locked, salts unchanged, no error)
- callout "Why the database sync waits for a complete copy" s1: C-r1-found-ckpt-02, C-r1-found-ckpt-27 P (narrower: "then syncs the database file if all frames … were checkpointed"; not "only if")
- callout s2: C-ch1-r1-found-ckpt-11 (the wal.c comment, quoted)
- callout s3: C-r1-found-ckpt-03 (attributed: seeks and syncs make checkpoints slower than write transactions)
- ¶4 s1: C-ch1-r1-found-ckpt-13, C-ch1-r1-found-ckpt-15 P
- ¶4 s2: C-ch1-r1-found-ckpt-15 P
- ¶4 s3: C-ch1-r1-found-ckpt-15 P (exclusive lock on read slots 1–4 obtained at once, no busy handler), C-ch1-r1-found-ckpt-16
- ¶4 s4: C-ch1-r1-found-ckpt-15 P (lock busy: frames appended after mxFrame)
- ¶4 s5: C-r1-found-ckpt-22 (a reset is allowed while others hold WAL_READ_LOCK(0)), C-r2-found-ckpt-02
- ¶4 s6: C-r1-found-ckpt-05 · term: "WAL reset"
- ¶4 s7: C-ch1-r1-found-ckpt-15 P (a TRUNCATE checkpoint resets and truncates the -wal itself)

## what-stops
- ¶1 s1: C-r1-found-ckpt-19 main (bold finding)
- ¶1 s2: C-r1-found-ckpt-19 main
- ¶1 s3: C-r1-found-ckpt-20 main ("describes", not "defines") · term: "checkpoint starvation"
- ¶2 s1: C-r1-found-ckpt-21 C (attributed to wal.html, "the same page warns"; D-01 side A)
- ¶2 s2: framing; D-01 (one remedy, RESTART/TRUNCATE, carries the disputed sentence)
- list item 1 s1: C-r1-found-ckpt-04, C-r1-found-ckpt-19, C-r1-found-ckpt-05, C-r1-found-ckpt-20
- list item 1 s2: C-r1-found-rw-09 (a deferred BEGIN starts its transaction at the first access; an automatic one ends when its statement finishes) · G-r0-06 (the driver-level answer is chapter 2's)
- list item 1 s3: framing (forward pointer)
- list item 2 s1: C-r1-found-ckpt-23
- list item 2 s2: C-r1-found-ckpt-27 P (may leave the checkpoint unfinished with concurrent writers), C-r1-found-ckpt-26 (the stronger modes take the writer lock)
- list item 3 s1–s2: C-r1-found-ckpt-25
- ¶3 s1: C-r1-found-ckpt-07 main (the size-limit pragma named only as chapter 2's)
- ¶3 s2: C-r1-found-ckpt-07 main
- ¶3 s3: C-r1-found-ckpt-07, C-ch1-r1-found-ckpt-13 (consequence: no truncation, only overwriting)
- ¶3 s4: C-r1-found-ckpt-30

## checkpoint-modes
- ¶1 s1: C-r1-found-ckpt-28 · framing (the call is chapter 2's)
- PASSIVE s1: C-r1-found-ckpt-27 P (narrower wording)
- PASSIVE s2: C-ch1-r1-found-ckpt-05 (checkpoint lock; the writer lock only for other modes)
- FULL: C-r1-found-ckpt-26 (the writer lock), C-r2-found-ckpt-05 (waits for each read-mark slot below the end of the WAL), C-ch1-r1-found-ckpt-11 (a complete copy truncates and syncs the database file)
- RESTART: C-r2-found-ckpt-01 (waits for read slots 1–4 holding the writer lock), C-ch1-r1-found-ckpt-15 P (the next writer resets after RESTART), C-r2-found-ckpt-06
- TRUNCATE s1: C-r1-found-ckpt-30
- TRUNCATE s2: C-ch1-r1-found-ckpt-15 P (TRUNCATE resets itself), C-r2-found-ckpt-06
- NOOP: C-r1-found-ckpt-31 (3.51.0; zero frames; for the reported counts)
- ¶2 s1: C-r1-found-ckpt-26
- ¶2 s2: framing (the busy handler is chapter 2's)
- ¶3 s1: D-01 (bold: the disagreement, neither side in the chapter's voice) · declared gap Q38 → stated
- ¶3 s2: C-r1-found-ckpt-29 C (attributed: the API reference's and the pragma page's words), C-r2-found-ckpt-09 C (attributed: the 3.54.1 header) — D-01 side B
- ¶3 s3: C-r1-found-ckpt-21 C (attributed: wal.html's sentence) — D-01 side A
- ¶4 s1: D-01 prominence (the weight each side has)
- ¶4 s2: C-r2-found-ckpt-03 U main (hedged and attributed as its ledger line requires: "a reading of the code as a whole, made for this book"), C-r2-found-ckpt-04 P, C-r2-found-ckpt-07 — the stated wording of Q38 in gaps/final.md
- ¶4 s3: D-01 "would settle it"
- callout "The disagreement in detail" b1: C-r2-found-ckpt-11
- callout b2: C-r2-found-ckpt-04 P (narrower wording: slot 0 held during any checkpoint's copy; a new reader takes a read mark; immediate retries, not a wait, in the two cases named)
- callout b3: C-r2-found-ckpt-07
- callout b4: C-r2-found-ckpt-08 · declared gap G-r1-01 → stated (blocking-lock builds untraced)

## who-waits
- ¶1 s1: framing (bold)
- ¶1 s2: framing (the table's terms)
- ¶1 s3: C-r1-found-shm-37, C-r1-found-shm-28, C-r1-practice-config-18 (each says the query gets SQLITE_BUSY rather than waiting) · framing (forward pointer)
- table-who-blocks (T1): reader "waits for" C-r1-found-rw-11, C-r2-found-ckpt-04 P · reader "blocks" C-r1-found-ckpt-04, C-r1-found-ckpt-19, C-r1-found-ckpt-05, C-r1-found-ckpt-20, C-r1-found-ckpt-26, C-r2-found-ckpt-05, C-r2-found-ckpt-01 · writer "waits for" C-r1-found-rw-13, C-r1-found-rw-14, C-r1-found-ckpt-26, C-r2-found-ckpt-01 · writer "blocks" C-r1-found-rw-13 · "not readers" C-r1-found-rw-11, C-r1-found-rw-12 (attributed in the prose above) · PASSIVE "waits for" C-r1-found-ckpt-27 P · PASSIVE "blocks" C-ch1-r1-found-ckpt-05, C-r2-found-ckpt-04 P · FULL "waits for" C-r1-found-ckpt-26, C-r2-found-ckpt-05 · FULL "blocks" C-r1-found-ckpt-26 + C-r1-found-rw-13 (the writer lock excludes other appenders); "new readers are not blocked, say the API reference and the pragma page" C-r1-found-ckpt-29 C, its FULL part, attributed (D-01's wal.html sentence concerns RESTART and TRUNCATE only), with C-r2-found-ckpt-04 P · RESTART "waits for" C-r2-found-ckpt-01 · RESTART "blocks" C-r2-found-ckpt-01 (the writer lock held through the wait); the new-reader cell: D-01, "disputed" · TRUNCATE "waits for" C-r1-found-ckpt-30 (works like RESTART) · TRUNCATE "blocks" D-01 cell; C-r1-found-ckpt-30 · recovery "waits for" C-r1-found-rw-23 (run by the first thread to connect) · recovery "blocks" C-r1-found-rw-16, C-r1-found-shm-37 · EXCLUSIVE locking mode "blocks" C-r1-found-shm-28 · the last connection closing "blocks" C-r1-practice-config-18 (gap G-r0-03's row)
- ¶2 s1: C-r1-found-ckpt-25
- ¶2 s2: framing (where the rows' sources are cited)

## limits
- ¶1 s1: framing (bold)
- ¶1 s2: C-r1-criticism-09, C-r1-found-rw-11
- ¶1 s3: C-r1-criticism-02
- ¶1 s4: C-r1-criticism-03
- ¶2 s1: C-r1-criticism-05 (attributed), C-r1-criticism-06 (attributed)
- ¶2 s2: C-r1-evidence-19 main (attributed)
- ¶2 s3: C-r1-evidence-03 (attributed and hedged: "may", "about 1% or 2%")
- ¶3 s1: framing
- ¶3 s2: C-r1-evidence-20 P main (narrower: the current page strikes the old warnings through; since 3.11.0, 2016-02-15, WAL works as efficiently with large transactions as rollback mode) — D-05, resolved-by-scope, mentioned only to say the old warnings no longer apply
- ¶4 s1: framing
- ¶4 s2: C-r1-practice-ops-51, C-r1-criticism-10 P (narrower: since 3.22.0, -shm and -wal exist or can be created, or immutable)
- ¶4 s3: C-r1-practice-ops-55 (attributed), C-r1-criticism-10 P (the docs still call converting to DELETE before read-only media good practice) · "rollback journal" for DELETE mode: C-r1-found-rw-26
- ¶5 s1: framing (SQLite's documentation does not mention containers: declared gap Q-ch1-02 / G-r1-06)
- ¶5 s2: C-ch1-r1-shm-hosts-04 (a volume is a directory on the Docker host, mountable into several containers), C-ch1-r1-shm-hosts-05 P (narrower: a bind mount mounts a host file or directory into a container)
- ¶5 s3: C-ch1-r1-shm-hosts-06 (a /remote volume through a driver; an NFS volume with the local driver) · "not by itself one host": the reading its overlay line records
- ¶6 s1: C-ch1-r1-shm-hosts-07 main (the daemon in a Linux VM, not directly on the native host; host paths shared with containers in the VM)
- ¶6 s2: declared gap Q-ch1-02 → stated (gaps/final-ch1.md)
- ¶6 s3: framing (follows the stated gap)
- checklist "Before you turn WAL on" (T2): one host C-r1-found-shm-11, C-r1-found-shm-14 (NFS) · containers: the stated gap with C-ch1-r1-shm-hosts-06, -07 · room for the files C-r1-found-shm-07 (the -shm in the database's directory), C-r1-practice-ops-51, C-r1-criticism-10 P · read-only media C-r1-practice-ops-55, C-r1-criticism-10 P · ATTACH C-r1-criticism-02 · page size C-r1-criticism-03 · one writer C-r1-criticism-09

## best-practices
- ¶1 s1: C-r1-found-ckpt-12, C-r1-found-ckpt-28
- ¶1 s2: C-r1-criticism-06 (attributed)
- ¶2 s1: framing
- bullet 1: C-r1-found-shm-33 (attributed: the documentation's advice)
- bullet 2: C-r1-practice-ops-40 (attributed), C-ch1-r1-shm-files-06 main (attributed: SQLite's source)
- bullet 3: C-r1-found-ckpt-21 C (attributed: the WAL page's "reader gaps"; its other remedy carries D-01 and is not given here)
- bullet 4: C-r1-found-shm-11 main
- ¶3 and the numbered list: framing (what chapter 2 covers, from book/outline.md)

## quiz
- q-open-read (target q1) key b: C-r1-found-ckpt-04, C-r1-found-ckpt-19, C-r1-found-ckpt-20 · explain: C-r1-found-rw-09 (the deferred BEGIN starts its read at the first access), C-r1-found-rw-05, C-r1-found-ckpt-04, C-r1-found-ckpt-20, C-r1-found-rw-11 (writers append; readers do not block them), C-ch1-r1-found-ckpt-15 P (no reset: frames appended) · options a, c, d: distractor
- q-snapshot (target q2) key b: C-r1-found-rw-05, C-r1-found-rw-08 · explain: C-r1-found-rw-05, C-r1-found-rw-08, C-r1-found-ckpt-04, C-r1-found-rw-15 · options a, c, d: distractor
- q-one-writer (target q3) answer: C-r1-found-rw-11, C-r1-found-rw-02, C-r1-found-rw-05, C-r1-found-rw-13, C-r1-found-rw-14 · explain: C-r1-found-rw-05, C-r1-found-rw-11, C-r1-found-rw-13
- q-network (target q4) key b: C-r1-found-shm-11 · explain: C-r1-found-rw-10, C-r1-found-shm-03, C-r1-found-shm-07 (attributed: the developers' reason), C-r1-found-shm-11, C-r1-found-rw-14 (many connections, in separate processes) · options a, c, d: distractor
- q-crash-files (target q5) blanks: -wal C-r1-found-shm-33, C-r1-practice-ops-42 · -shm C-r1-found-rw-25, C-r1-found-shm-08 · explain: C-r1-found-rw-04, C-r1-found-rw-23, C-r1-practice-ops-42, C-r1-found-shm-08, C-r1-found-rw-25, C-ch1-r1-shm-files-06 (attributed in the chapter's warning)

## sources-list
- the sources block lists exactly the library sources the chapter cites: S-r1-found-rw-01 … -06, S-r1-found-ckpt-02, -03, -07, S-r1-found-shm-06, -11, S-r2-found-ckpt-01, -05, -06 (library.md), S-ch1-r1-found-ckpt-02, -03, S-ch1-r1-shm-hosts-06, -07 (library-ch1.md); ids lowercased, as §4.6 asks

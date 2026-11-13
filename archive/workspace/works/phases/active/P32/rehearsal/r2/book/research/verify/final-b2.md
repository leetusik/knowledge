# Verification: 20261023-1245-sqlite-wal · final-b2
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 12 · supported 11 · partial 0 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0 · carried-forward (counter-evidence only, not re-verified) 1 (C-r2-found-ckpt-03)

Pages saved in pages/final-b2/. Doc pages: S-r1-found-ckpt-01 (wal.html), -02 (c3ref wal_checkpoint_v2), -03 (pragma.html), -05 (fileformat2), -06 (walformat), -07 (changes). Code: S-r2-found-ckpt-01 (src/wal.c) and -06 (src/sqlite.h.in), raw files at commit 57520227c95396ce39ba6ecaac8d475b78dd3964, saved as S-r2-found-ckpt-01.html / -06.html with the raw text unchanged. Archive captures: S-r2-found-ckpt-04 and -05.
Method note for code: pagetext.py drops text such as `i<WAL_NREADER` as if it were an HTML tag, so `--check` reported NOT FOUND on the first piece of S-r2-found-ckpt-01/P10 and /P12. I confirmed both passages verbatim by reading the raw file at wal.c L3275-L3291 and L2317-L2328. All other passages were found by `--check`. No local clone exists, so the excerpt hash was not computed and the ranges were checked by content.

## Records

### V-C-r1-found-ckpt-07-1
- claim: C-r1-found-ckpt-07
- source S-r1-found-ckpt-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at P12 § "6. Avoiding Excessively Large WAL Files": found verbatim
- source S-r1-found-ckpt-05 · opened: https://sqlite.org/fileformat2.html (curl) · quote-match: exact · passage at P4 § "4.4. WAL Reset": found verbatim
- looked first: searched wal.html for "truncate", "journal_size_limit" and "overwrit". §6 says the checkpoint "does not normally truncate the WAL file (unless the journal_size_limit pragma is set)". fileformat2 §4.4 says the WAL "can optionally be truncated on a reset, but it need not be".
- implied: (1) a checkpoint does not normally truncate the WAL; (2) the exception named is the journal_size_limit pragma; (3) SQLite starts overwriting the WAL from the beginning; (4) the reason is that overwriting an existing file is normally faster than appending/growing it. All four are stated. The "growing" wording is fileformat2's ("faster than they will grow a file"), and wal.html says "append".
- verdict: supported · reason: both rung-1 docs state each part. Scope caveat (TRUNCATE mode is the exception) is carried by C-r1-found-ckpt-30. In wal.c the journal_size_limit truncation runs at the first commit after a reset (L4302-L4313), not inside the checkpoint itself. The docs' attributed wording is still as the claim says.
- bar: met (load-bearing descriptive, rung 1) · independence: the two sources share an owner (SQLite project), so they count as one · currency: wal.html updated 2026-08-25, fileformat2 2025-12-25; no later version found
- counter: none-found ("SQLite WAL file never shrinks after checkpoint size stays large", "SQLite wal.html readers might block checkpoint RESTART TRUNCATE documentation inaccurate" [currency, also returned the wal.html text]). The search results (forum posts) were not contradicting, they repeat that the WAL is not truncated by default, that journal_size_limit bounds it, and that the WAL is deleted when the last connection closes. The lateral read of the main source: wal.html is the project's own page, and wal.c L4302-L4313 agrees.

### V-C-r1-found-ckpt-10-1
- claim: C-r1-found-ckpt-10
- source S-r1-found-ckpt-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at P2 § "2.1. Checkpointing": found verbatim
- source S-r1-found-ckpt-03 · opened: https://sqlite.org/pragma.html (curl) · quote-match: exact · passage at P5 § "List Of PRAGMAs" (wal_autocheckpoint): found verbatim
- looked first: searched both pages for "1000" and "SQLITE_DEFAULT_WAL_AUTOCHECKPOINT". wal.html §2.1 and pragma.html both give 1000 with the compile-time option as the alternative default.
- implied: (1) default auto-checkpoint threshold 1000 pages; (2) the compile-time option SQLITE_DEFAULT_WAL_AUTOCHECKPOINT can set a different default. Both stated. (wal.html phrases it as "when the WAL file reaches a threshold size of 1000 pages", pragma.html as "equals or exceeds N pages".)
- verdict: supported · reason: both parts directly stated twice.
- bar: met (load-bearing descriptive, rung 1) · independence: same owner, one source · currency: wal.html updated 2026-08-25, pragma.html updated 2026-10-04, both still give 1000
- counter: none-found ("SQLite wal_autocheckpoint default changed from 1000 pages" [also served as the currency query], "SQLite checkpoint long-running reader still makes progress partial checkpoint limitations"). No source reports a change of the default; the c3ref/wal_autocheckpoint page says "threshold of 1000 or SQLITE_DEFAULT_WAL_AUTOCHECKPOINT pages". I did not find where the macro is defined in the 3.54.1 sources (not in sqliteInt.h or wal.h), so the compile-time default was not checked in code.

### V-C-r1-found-ckpt-19-1
- claim: C-r1-found-ckpt-19
- source S-r1-found-ckpt-05 · opened: https://sqlite.org/fileformat2.html (curl) · quote-match: exact · passage at P2 § "4.3. Checkpoint Algorithm": found verbatim
- source S-r1-found-ckpt-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at P4 § "2.2. Concurrency": found verbatim
- source S-r1-found-ckpt-06 · opened: https://sqlite.org/walformat.html (curl) · quote-match: exact · passage at P5 § "2.3.1. How the various locks are used": found verbatim
- looked first: read wal.html §2.2 around "end mark" and fileformat2 §4.3. wal.html §2.2 says the checkpoint "must stop when it reaches a page in the WAL that is past the end mark of any current reader", so it does partial work and resumes. fileformat2 says "checkpoints only run to completion if all reader are using the last transaction in the WAL".
- implied: (1) runs to completion only if all readers use the last transaction in the WAL: stated (fileformat2). (2) a long-running read transaction can prevent the checkpointer from making progress: stated nearly verbatim in wal.html ("can prevent a checkpointer from making progress"). The claim's "on an older snapshot" follows from (1).
- verdict: supported · reason: both halves are in the docs' own words. Caveat for the writer: the docs also say the checkpoint still does as much as it can up to the reader's end mark (wal.html §2.2, §6), so "prevent from making progress" is the docs' own loose phrase for "from completing and resetting".
- bar: met (load-bearing descriptive, rung 1) · independence: same owner, one source · currency: fileformat2 updated 2025-12-25, wal.html 2026-08-25, walformat 2025-05-10
- counter: none-found ("SQLite checkpoint long-running reader still makes progress partial checkpoint limitations", "SQLite 'checkpoint starvation' writers new readers WAL growth"). Results repeat the docs and describe the same mechanism (a Syncthing forum post, a SQLite forum thread with Gunter Hick's reply, and SQLite's own tt3_checkpoint.c test). Lateral read: the fileformat2 text is the project's own specification.

### V-C-r1-found-ckpt-20-1
- claim: C-r1-found-ckpt-20
- source S-r1-found-ckpt-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at P14 § "6. Avoiding Excessively Large WAL Files": found verbatim
- looked first: read all of §6. It names "Checkpoint starvation." as the lead-in to a paragraph that describes the situation. It does not use the word "define", but it names the term and describes it.
- implied: (1) checkpoint can run to completion and reset the WAL only if no other connection is using the WAL file; (2) if another connection has a read transaction open the checkpoint does as much as it can but cannot complete; (3) it starts again where it left off after the next write transaction. All three stated. The claim attributes the definition to the docs, as it should.
- verdict: supported · reason: a faithful paraphrase of the docs paragraph headed "Checkpoint starvation." The "definition" label is the chapter's reading of a descriptive paragraph, and attribution to the docs keeps it safe.
- bar: met (attributed definition, rung 1) · independence: n/a (single page) · currency: wal.html updated 2026-08-25; the same paragraph was already in the 2016-10-09 capture (S-r2-found-ckpt-05)
- counter: none-found ("SQLite 'checkpoint starvation' writers new readers WAL growth", "SQLite checkpoint long-running reader still makes progress partial checkpoint limitations"). Other uses of the term (SQLite's tt3_checkpoint.c test "checkpoint_starvation_1/2", a SQLite forum reply by a community member, a Syncthing forum post) mean the same thing.

### V-C-r2-found-ckpt-03-2
- claim: C-r2-found-ckpt-03 (counter-evidence search only, as dispatched; the verdict "supported, bar below as exceptional" in verify/r2-b1.md is carried forward and was not re-run)
- source S-r2-found-ckpt-01 · opened: https://raw.githubusercontent.com/sqlite/sqlite/57520227c95396ce39ba6ecaac8d475b78dd3964/src/wal.c (curl) · quote-match: exact · I read the raw file at L2317-L2477, L2742-L2830 and L3052-L3310 only to frame the counter search
- looked first: for readers' waiting paths in walTryBeginRead and walIndexReadHdr. A new reader reads the wal-index header with no lock (walIndexReadHdr L2777-L2782). It takes the WRITE lock only if that unlocked read fails (L2787-L2797). If the WRITE lock is busy (held by the checkpointer), the result is BUSY, then WAL_RETRY (L3172-L3197), which is the brief retry the claim's scope line already names. Otherwise, once nBackfill equals mxFrame, it takes WAL_READ_LOCK(0) shared (L3216-L3245), which the checkpointer has released at L2425 and does not take again while it waits on slots 1-4 (L2449).
- implied: nothing found that makes a new reader wait for the checkpointer's busy-handler wait. Remaining wait: a torn header read during TRUNCATE's walRestartHdr (L2465) can send a reader through WAL_RETRY, and the reader's sleeps after 5 retries are bounded (L3124-L3129).
- verdict: carried forward as supported (verify/r2-b1.md); not re-verified here. My reading of the same ranges agrees.
- bar: below (exceptional claim, as recorded in r2-b1: it conflicts with wal.html §6 "readers might block", and all its sources, code and docs, belong to the SQLite project, so there is no independent second source) · independence: single owner (SQLite project) · currency: wal.html §6 sentence is unchanged since at least the 2016-10-09 capture; wal.c is at the 3.54.1 tag
- counter: none-found ("SQLite wal_checkpoint(RESTART) blocks new readers forum", "SQLite wal.html 'readers might block' checkpoint RESTART TRUNCATE documentation inaccurate", currency: "SQLite WAL-reset bug fixed release 3.51.3 checkpoint corruption"). No source records a new reader blocking on a RESTART/TRUNCATE checkpoint's wait. What the searches turned up (see Leads): Dan Kennedy's 2024 forum reply says a reader that has already begun a transaction pins its end mark in the WAL, so a TRUNCATE checkpoint must not proceed under it. That concerns readers already inside a transaction, which the claim already treats as the thing the checkpointer waits for, so it is not in conflict. SQLite's tt3_checkpoint.c says each RESTART checkpoint "will block for up to 200 ms" waiting for readers to clear. That too is the checkpointer waiting for existing readers. SQLite's c3ref and pragma pages say RESTART does not impede readers, which is the other side of the existing disagreement D-01. Remaining open: no experiment or developer statement settles the wal.html sentence, as the researcher wrote.

### V-C-r1-found-ckpt-22-1
- claim: C-r1-found-ckpt-22
- source S-r1-found-ckpt-06 · opened: https://sqlite.org/walformat.html (curl) · quote-match: exact · passage at P6 § "2.3.1. How the various locks are used": found verbatim; P4 § "2.1.2. The nBackfill field": found verbatim
- looked first: searched walformat.html for "WAL_READ_LOCK(0)" and "reset". §2.3.1 gives the reason; §2.1.2 says the reset condition is "no locks held on any of WAL_READ_LOCK(N) for N>0".
- implied: (1) a reset is OK while others hold WAL_READ_LOCK(0): stated; (2) because those connections promise not to use WAL content: stated; (3) only N>0 read locks block a reset: stated (P4; P8 repeats "no locks on WAL_READ_LOCK(1) through WAL_READ_LOCK(4)").
- verdict: supported · reason: all parts are in the spec text.
- bar: met (not load-bearing; one rung-1 source) · independence: n/a · currency: walformat.html updated 2025-05-10; wal.c L2217-L2224 agrees (existing readers read only from the database file)
- counter: not run

### V-C-r1-found-ckpt-31-1
- claim: C-r1-found-ckpt-31
- source S-r1-found-ckpt-02 · opened: https://sqlite.org/c3ref/wal_checkpoint_v2.html (curl) · quote-match: exact · passage at P5 § "Checkpoint a database": found verbatim
- source S-r1-found-ckpt-07 · opened: https://sqlite.org/changes.html (curl) · quote-match: exact · passage at P1 § "2025-11-04 (3.51.0)": found verbatim
- implied: (1) NOOP was added in 3.51.0, dated 2025-11-04: the changelog entry heading and text. (2) It "always checkpoints zero frames": stated. (3) "exists only to read the reported counts": the docs say "The only reason to invoke a NOOP checkpoint is to access the values returned … via output parameters *pnLog and *pnCkpt". The claim's "exists only to" is a fair restatement of "only reason to invoke".
- verdict: supported · reason: each part stated, with the docs' "only reason" wording slightly rephrased.
- bar: met (not load-bearing; rung 1) · independence: different pages, same owner · currency: changes.html latest entry 3.54.1 (2026-10-16); no later change to NOOP found in the changelog (grep for "NOOP" finds only the 3.51.0 entry)
- counter: not run

### V-C-r1-found-ckpt-34-1
- claim: C-r1-found-ckpt-34
- source S-r1-found-ckpt-07 · opened: https://sqlite.org/changes.html (curl) · quote-match: exact · passages P4 § "2011-04-12 (3.7.6)", P3 § "2015-01-16 (3.8.8)", P2 § "2015-01-30 (3.8.8.2)": all found verbatim
- implied: (1) 3.7.6 (2011-04-12): "Added the sqlite3_wal_checkpoint_v2() interface and enhanced the wal_checkpoint pragma to support blocking checkpoints". (2) 3.8.8 (2015-01-16): "Added the SQLITE_CHECKPOINT_TRUNCATE option". (3) 3.8.8.2 (2015-01-30): "truncates the WAL file even if there is no checkpoint work to be done". The claim's "added … blocking checkpoints" compresses "enhanced the wal_checkpoint pragma to support blocking checkpoints" and is a fair reading, since v2 is the interface that selects blocking modes. Dates in the headings match.
- verdict: supported · reason: all versions and dates match the changelog entries.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: a changelog is a historical record, and it lists no later change to these entries
- counter: not run

### V-C-r2-found-ckpt-05-1
- claim: C-r2-found-ckpt-05
- source S-r2-found-ckpt-01 · opened: https://raw.githubusercontent.com/sqlite/sqlite/57520227c95396ce39ba6ecaac8d475b78dd3964/src/wal.c (curl) · quote-match: exact · passage at P12 (src/wal.c:L2317-L2328): found verbatim by reading the raw file (the converter's `--check` mis-parsed `i<WAL_NREADER`)
- implied: the loop at L2317 runs over read-mark slots 1 to 4. For each slot with `mxSafeFrame>y` (the slot's mark below the current safe frame, which starts as the end of the WAL, mxFrame) it calls walBusyLock with the busy handler xBusy (L2321). That waits for the exclusive lock and, if it gets it, resets the mark. If the result is SQLITE_BUSY, `mxSafeFrame = y; xBusy = 0;` (L2326-L2328): the checkpoint will copy only up to that reader's mark, and the busy handler is not called for later slots. PASSIVE passes no busy handler: assert at L2308 and L4410. The "FULL, RESTART or TRUNCATE" scope is right because only those modes pass xBusy. If no busy handler is configured at all, there is no wait, a point the claim does not mention. This is the narrower reading.
- verdict: supported · reason: the code at the cited range does exactly this. Sub-note: "waits through the busy handler" holds when a busy handler is configured.
- bar: met (not load-bearing; rung 1, code at a pinned commit) · independence: n/a · currency: 3.54.1 tag, the newest release
- counter: not run

### V-C-r2-found-ckpt-07-1
- claim: C-r2-found-ckpt-07
- source S-r2-found-ckpt-01 · opened: https://raw.githubusercontent.com/sqlite/sqlite/57520227c95396ce39ba6ecaac8d475b78dd3964/src/wal.c (curl) · quote-match: exact · passages P14 (L3052-L3055) and P11 (L3116-L3129): found verbatim
- implied: (1) walTryBeginRead "might fail due to a race or other transient condition", returns WAL_RETRY, "safe to retry immediately": stated at L3052-L3055. (2) "After 5 RETRYs, we begin calling sqlite3OsSleep()": stated at L3124; code: `(*pCnt)++; if( *pCnt>5 )` sleep (L3131-L3132, L3157). (3) "The total delay time before giving up is less than 10 seconds": stated at L3129, as the comment's own figure. (4) the give-up result is SQLITE_PROTOCOL: stated at L3074 and returned at L3137 once the count passes WAL_RETRY_PROTOCOL_LIMIT.
- verdict: supported · reason: all four parts are in the cited comments and code. "less than 10 seconds" is the comment's own figure, as the claim's scope line says.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: 3.54.1 tag
- counter: not run

### V-C-r2-found-ckpt-08-1
- claim: C-r2-found-ckpt-08
- source S-r2-found-ckpt-01 · opened: https://raw.githubusercontent.com/sqlite/sqlite/57520227c95396ce39ba6ecaac8d475b78dd3964/src/wal.c (curl) · quote-match: exact · passage P13 (L4415-L4417): found verbatim; the #ifdef block at L2101-L2180 read as well
- implied: (1) sqlite3WalCheckpoint: `/* Enable blocking locks, if possible. */ ... if( xBusy2 ) (void)walEnableBlocking(pWal);`: stated at L4415-L4417. (2) In the `#else` branch at L2175-L2179, `walEnableBlocking(x)` is defined as `0`, so without SQLITE_ENABLE_SETLK_TIMEOUT nothing is enabled: stated. (3) Even in such builds, blocking is enabled only if the VFS supports it and the connection has a busy timeout (comment at L2115-L2118). The claim says "exist only in builds compiled with" the option, which is a necessary condition and is true.
- verdict: supported · reason: the cited line and the #ifdef/#else block together state both halves; the researcher's "fit partial" is cured by the #ifdef block, which I read.
- bar: met (not load-bearing; rung 1) · independence: n/a · currency: 3.54.1 tag
- counter: not run

### V-C-r2-found-ckpt-11-1
- claim: C-r2-found-ckpt-11
- source S-r2-found-ckpt-05 · opened: https://web.archive.org/web/20161009044054id_/http://www.sqlite.org:80/wal.html (curl) · quote-match: exact · passage at P1 § "5. Avoiding Excessively Large WAL Files": found verbatim (line 96)
- source S-r2-found-ckpt-04 · opened: https://web.archive.org/web/20150103035306id_/http://www.sqlite.org/wal.html (curl) · quote-match: exact · passage at P1 § "Application-Initiated Checkpoints": found verbatim (line 50)
- looked first: searched both captures for "might block", "starvation", "Avoiding Excessively", "TRUNCATE", "three subtypes". The 2015-01-03 capture lists "three subtypes of checkpoints … PASSIVE, FULL, and RESTART" and has none of "might block", "starvation" or "Avoiding Excessively" (TRUNCATE appears only as a journal_mode value). The 2016-10-09 capture has the heading "5. Avoiding Excessively Large WAL Files" with "Checkpoint starvation." and the "readers might block while the checkpoint is running" sentence.
- implied: (1) the sentence is on the 2016-10-09 capture, in §5: yes. (2) the 2015-01-03 capture lists only PASSIVE, FULL and RESTART: yes. (3) it has no such section: yes. The scope note (exact check-in not found) is honest.
- verdict: supported · reason: both captures show what the claim says.
- bar: met (not load-bearing; rung 1, archived official page) · independence: n/a · currency: the live page (S-r1-found-ckpt-01/P16) still has the sentence, in §6
- counter: not run

## Counter-evidence
No counter-source recorded (none-found for every main claim; queries are listed in each record). No S-v2 or C-v2 ids were used.

## Leads
- https://sqlite.org/forum/info/b92a2a5f57914cf7 — SQLite forum, 2024-02-01, Dan Kennedy: a reader fixes its WAL end mark when its transaction opens, "If a 'PRAGMA wal_checkpoint = TRUNCATE' were allowed to proceed, they might not be available when required by the reader." About readers already in a transaction, not new readers; useful background for the chapter's checkpointer-waits-for-readers explanation (rung 1 or 2 as a developer's statement, but I did not take it as a counter-source for C-r2-found-ckpt-03).
- https://sqlite.org/src/artifact/9e75cf7c1c364f52 — test/tt3_checkpoint.c (SQLite's threadtest3 cases checkpoint_starvation_1/2): PASSIVE auto-checkpoints with overlapping readers let the WAL "grow very large"; RESTART keeps it near the frame limit but "every checkpoint will block for up to 200 ms" waiting for readers; a candidate corroboration for C-r1-found-ckpt-20/-21, read via WebFetch only (not saved).
- https://theconsensus.dev/p/2026/08/23/another-look-at-sqlite-wal-reset.html — returned HTTP 403 to WebFetch; reported by search summaries (rung 3, unverified): a WAL-reset race between a write and a checkpoint, present since 3.7.0, fixed in 3.51.3 (2026-03-13), backported to 3.44.6 and 3.50.7. A currency point for any claim about WAL reset; locate the official SQLite statement or changelog entry first (rung 1) before using.
- https://sqlite.org/src/info/53429689d4fcf472 — 2015-01-29 check-in by Dan Kennedy: "Ensure that 'PRAGMA wal_checkpoint = TRUNCATE|FULL|RESTART' block on other connections and truncate the wal file as required even if the entire wal file has already been checkpointed." Corroborates the 3.8.8.2 changelog entry in C-r1-found-ckpt-34 (saved as pages/final-b2/S-v2-02.html).

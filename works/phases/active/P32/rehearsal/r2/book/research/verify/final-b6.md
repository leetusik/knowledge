# Verification: 20261023-1245-sqlite-wal · final-b6
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 14 · supported 13 · partial 1 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0

All pages were re-fetched by the verifier into pages/final-b6/ (S-r1-practice-ops-01 to -07 and -09 as `<id>.html/.txt`); every cited passage was found verbatim by `--check` (line numbers match the researcher's). Pages are sqlite.org first-party documentation, so all support is rung 1 and independence is n/a (one owner for all sources).

## Records

### V-C-r1-practice-ops-04-1
- claim: C-r1-practice-ops-04
- source S-r1-practice-ops-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at P2 § "2.3. Performance Considerations": found verbatim
- looked first: § 2.3 says write transactions are fast, checkpoints are slower than writes (they need syncs and seeks), and describes the default strategy (checkpoint run once the WAL reaches about 1000 pages, run by the committing thread), then the remedy for the resulting slow commit.
- implied: default = checkpoint is run "by the same thread that does the COMMIT that pushes the WAL over its size limit"; effect = "most COMMIT operations to be very fast but an occasional COMMIT ... to be much slower"; "If that effect is undesirable, then the application can disable automatic checkpointing and run the periodic checkpoints in a separate thread, or separate process." Every element of the claim (default, whose thread, slower COMMIT, disable plus separate thread or process, attributed to the docs) is stated.
- verdict: supported · reason: the claim restates the passage almost word for word.
- bar: met (load-bearing descriptive, one rung-1 source) · independence: n/a · currency: page updated 2026-08-25; the text is current; no erratum seen.
- counter: none-found as a contradiction ("SQLite WAL disable wal_autocheckpoint dedicated checkpoint thread problems", "SQLite WAL autocheckpoint latency spike commit separate checkpointer connection busy errors", "SQLite release notes WAL checkpoint behavior changed journal_size_limit wal_autocheckpoint 2025 2026"). One adjacent hazard, not a contradiction: S-v6-03 (C-v6-02) shows that a checkpoint call gets SQLITE_BUSY at once if another checkpoint is running, so a dedicated checkpointer needs auto-checkpoint off on the other connections (the dossier already holds this as C-r1-practice-ops-10).

### V-C-r1-practice-ops-21-1
- claim: C-r1-practice-ops-21
- source S-r1-practice-ops-02 · opened: https://sqlite.org/pragma.html (curl) · quote-match: exact · passage at P8 § "List Of PRAGMAs" (journal_size_limit): found verbatim; P9: found verbatim
- looked first: the pragma page defines journal_size_limit (three forms: query, `PRAGMA schema.journal_size_limit`, set to N), says it limits rollback-journal and WAL files "left in the file-system after transactions or checkpoints", default -1 (no limit), and a compile-time macro SQLITE_DEFAULT_JOURNAL_SIZE_LIMIT can change the default.
- implied: "Each time a transaction is committed or a WAL file resets, SQLite compares the size of the ... WAL file left in the file-system to the size limit ... and if the journal or WAL file is larger it is truncated to the limit"; limit is "in bytes for the specified database" (per database, schema-qualified). All parts match.
- verdict: supported · reason: the claim restates the documented behaviour; the "per database" scope is from the schema-qualified syntax and "for the specified database".
- bar: met · independence: n/a · currency: current docs. Caveat for the writer, not a verdict change: SQLite's source (counter-source S-v6-01) is narrower than the doc sentence; see counter.
- counter: S-v6-01 (C-v6-01)

### V-C-r1-practice-ops-23-1
- claim: C-r1-practice-ops-23
- source S-r1-practice-ops-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at P20 § "6. Avoiding Excessively Large WAL Files": found verbatim
- looked first: § 6 lists three ways a WAL grows without bound (disabled auto-checkpoint, checkpoint starvation, very large write transactions) and gives, under starvation, "reader gaps" and manual checkpoints as the remedy, plus a disadvantage.
- implied: "This scenario can be avoided by ensuring that there are 'reader gaps': times when no processes are reading from the database and that checkpoints are attempted during those times. In applications with many concurrent readers, one might also consider running manual checkpoints with the SQLITE_CHECKPOINT_RESTART or SQLITE_CHECKPOINT_TRUNCATE option which will ensure that the checkpoint runs to completion before returning." The claim is attributed ("SQLite's docs say"), says "might", and is a faithful paraphrase. It leaves out the next sentence ("The disadvantage ... is that readers might block while the checkpoint is running"), which is recorded as C-r1-practice-ops-24.
- verdict: supported · reason: all parts directly stated; the attributed form is right because this is a recommendation. Writers should not drop the stated disadvantage, and should know the "runs to completion" promise is qualified by the busy handler (see counter).
- bar: met (attributed, rung 1) · independence: n/a · currency: current (page updated 2026-08-25).
- counter: S-v6-03 (C-v6-02)

### V-C-r1-practice-ops-09-1
- claim: C-r1-practice-ops-09
- source S-r1-practice-ops-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at P4 § "2.3. Performance Considerations": found verbatim
- implied: "The default strategy is to run a checkpoint once the WAL reaches 1000 pages and this strategy seems to work well in test applications on workstations, but other strategies might work better on different platforms or for different workloads." The claim matches (the claim's "other platforms" is the page's "different platforms").
- verdict: supported · reason: attributed quote and paraphrase match.
- bar: met (not load-bearing, attributed) · independence: n/a · currency: current.
- counter: not run

### V-C-r1-practice-ops-15-1
- claim: C-r1-practice-ops-15
- source S-r1-practice-ops-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at P22 § "6. Avoiding Excessively Large WAL Files": found verbatim
- implied: "As of SQLite version 3.11.0 (2016-02-15), the WAL file for a single transaction should be proportional in size to the transaction itself. Pages that are changed by the transaction should only be written into the WAL file once. However, with older versions of SQLite, the same page might be written into the WAL file multiple times if the transaction grows larger than the page cache." Version, date, proportionality, once-per-page, older-version caveat: all match (the page's "should" is kept in the claim).
- verdict: supported · reason: direct.
- bar: met · independence: n/a · currency: current.
- counter: not run

### V-C-r1-practice-ops-19-1
- claim: C-r1-practice-ops-19
- source S-r1-practice-ops-09 · opened: https://sqlite.org/lang_transaction.html (curl) · quote-match: exact · passage at P2 § "2.2. DEFERRED, IMMEDIATE, and EXCLUSIVE transactions": found verbatim
- implied: BEGIN DEFERRED "merely sets a flag ... that turns off the automatic commit"; the automatic transaction "persist[s] until an explicit COMMIT or ROLLBACK or until a rollback is provoked by an error or an ON CONFLICT ROLLBACK clause. If the first statement after BEGIN DEFERRED is a SELECT, then a read transaction is started." The claim folds "ON CONFLICT ROLLBACK" into "error" (a small loss, not a contradiction).
- verdict: supported · reason: direct.
- bar: met · independence: n/a · currency: current.
- counter: not run

### V-C-r1-practice-ops-26-1
- claim: C-r1-practice-ops-26
- source S-r1-practice-ops-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at P24 § "1. Overview": found verbatim
- implied: The disadvantages list has a single bullet: "WAL works best with smaller transactions. WAL does not work well for very large transactions. For transactions larger than about 100 megabytes, traditional rollback journal modes will likely be faster. For transactions in excess of a gigabyte, WAL mode may fail with an I/O or disk-full error. It is recommended that one of the rollback journal modes be used for transactions larger than a few dozen megabytes. Beginning with version 3.11.0 (2016-02-15), WAL mode works as efficiently with large transactions as does rollback mode." Both statements the claim cites are in that bullet, and the juxtaposition is as the claim says. The claim leaves out two neighbours that sharpen the tension (about 100 MB: rollback likely faster; over a gigabyte: WAL may fail). The "yet" is the researcher's reading; the page does not flag any inconsistency.
- verdict: supported · reason: both quoted statements exist at the locator, in the same bullet; the claim is an internal observation about the page. Writers should keep it as "the page says both" and not resolve it, and note that it also omits the 100 MB and 1 GB sentences.
- bar: met (not load-bearing; attributed) · independence: n/a · currency: page updated 2026-08-25.
- counter: not run

### V-C-r1-practice-ops-32-1
- claim: C-r1-practice-ops-32
- source S-r1-practice-ops-05 · opened: https://sqlite.org/backup.html (curl) · quote-match: exact · passage at P5 § "3.1. File and Database Connection Locking": found verbatim
- implied: "If the backup process is restarted frequently enough it may never run to completion and the backupDb() function may never return." Context: restarts occur when another connection or process writes to the source during the sleep between steps (the page's step-wise example). The claim states the same with "may never complete".
- verdict: supported · reason: direct.
- bar: met · independence: n/a · currency: current.
- counter: not run

### V-C-r1-practice-ops-37-1
- claim: C-r1-practice-ops-37
- source S-r1-practice-ops-06 · opened: https://sqlite.org/lang_vacuum.html (curl) · quote-match: exact · passage at P2 § "2.1. VACUUM with an INTO clause": found verbatim
- implied: "The file named by the INTO clause must not previously exist, or else it must be an empty file, or the VACUUM INTO command will fail with an error." Matches.
- verdict: supported · reason: direct.
- bar: met · independence: n/a · currency: current.
- counter: not run

### V-C-r1-practice-ops-38-1
- claim: C-r1-practice-ops-38
- source S-r1-practice-ops-07 · opened: https://sqlite.org/cli.html (curl) · quote-match: exact · passage at P1 and P2 § "2. Special commands (dot-commands)": found verbatim
- implied: ".backup ?DB? FILE Backup DB (default "main") to FILE" and ".save ?OPTIONS? FILE Write database to FILE (an alias for .backup ...)". The claim matches. (`.save` also takes `?OPTIONS?`; the claim does not say otherwise.)
- verdict: supported · reason: direct; the claim does not say the command uses the backup API, and the page does not either.
- bar: met · independence: n/a · currency: page shows SQLite-3.54 prompt; current.
- counter: not run

### V-C-r1-practice-ops-41-1
- claim: C-r1-practice-ops-41
- source S-r1-practice-ops-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at P10 § "4. The WAL File": found verbatim
- implied: "Usually, the WAL file is deleted automatically when the last connection to the database closes. However, if the last process to have the database open exits without cleanly shutting down the database connection, or if the SQLITE_FCNTL_PERSIST_WAL file control is used, then the WAL file might be retained on disk after all connections to the database have been closed." Matches.
- verdict: supported · reason: direct.
- bar: met · independence: n/a · currency: current.
- counter: not run

### V-C-r1-practice-ops-45-1
- claim: C-r1-practice-ops-45
- source S-r1-practice-ops-04 · opened: https://sqlite.org/howtocorrupt.html (curl) · quote-match: exact · passage at P7 § "2.6. Multiple links to the same file": found verbatim
- implied: P7 says "If two or more processes open the database using different names, then they will use different rollback journals and WAL files. ... if one process crashes, the other process will be unable to recover the transaction in progress". The section's first sentence says the links may be "either hard or soft links". But the same section ends: "Beginning with SQLite version 3.10.0 (2016-01-06), the unix OS interface will attempt to resolve symbolic links and open the database file by its canonical name. Prior to version 3.10.0, opening a database file through a symbolic link was similar to opening a database file that had multiple hard links and resulted in undefined behavior." So for soft links the claim holds only before 3.10.0 (and the page speaks of the unix OS interface). The claim names no version.
- verdict: partial · reason: hard-link part supported; the soft-link part is limited by the page to SQLite before 3.10.0 on unix (current versions resolve symlinks), and the claim states no version. · narrower claim: "Processes that open one database file through different hard links (or, before SQLite 3.10.0, through different soft links) use different WAL files, so after one process crashes, another cannot recover its in-progress transaction."
- bar: met for the narrower claim · independence: n/a · currency: the 3.10.0 resolution rule is the later state of affairs.
- counter: not run

### V-C-r1-practice-ops-48-1
- claim: C-r1-practice-ops-48
- source S-r1-practice-ops-03 · opened: https://sqlite.org/c3ref/wal_checkpoint_v2.html (curl) · quote-match: exact · passage at P3 § "Checkpoint a database": found verbatim
- source S-r1-practice-ops-02 · opened: https://sqlite.org/pragma.html (curl) · quote-match: exact · passage at P11 § "List Of PRAGMAs" (wal_checkpoint, NOOP): found verbatim
- implied: "This mode always checkpoints zero frames. The only reason to invoke a NOOP checkpoint is to access the values returned by sqlite3_wal_checkpoint_v2() via output parameters *pnLog and *pnCkpt." and (pragma) "This mode does not checkpoint any frames. It is used to obtain the returned values only." pnLog is frames in the WAL and pnCkpt is frames checkpointed so far, so "WAL's size and progress" is a fair reading. "Without doing any checkpoint work" restates "zero frames". The page notes that all calls take the exclusive "checkpoint" lock (and return SQLITE_BUSY if another checkpoint runs), so a NOOP call can still return SQLITE_BUSY; the claim does not deny that.
- verdict: supported · reason: directly inferred from both passages; the "work" wording is the claim's own paraphrase of zero frames.
- bar: met · independence: n/a (two pages, one owner) · currency: current docs list NOOP; the version that introduced it was not checked.
- counter: not run

### V-C-r1-practice-ops-50-1
- claim: C-r1-practice-ops-50
- source S-r1-practice-ops-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at P5 § "2.3. Performance Considerations": found verbatim
- implied: "Hence, to maintain good read performance it is important to keep the WAL file size down by running checkpoints at regular intervals." The claim writes "requires" for the page's "it is important to", a slightly firmer word. The same section adds the read-versus-write tradeoff (frequent checkpoints favour reads, infrequent ones favour writes), which the claim does not mention.
- verdict: supported · reason: direct, as an attributed statement; suggest using "it is important" to match the page.
- bar: met (attributed, rung 1) · independence: n/a · currency: current.
- counter: not run

## Counter-evidence

Main claims: C-r1-practice-ops-04, -21, -23. Queries run (neutral wording): "SQLite WAL disable wal_autocheckpoint dedicated checkpoint thread problems", "SQLite journal_size_limit WAL file not truncated actual behavior", "SQLite checkpoint starvation RESTART TRUNCATE readers block writers busy limits", "SQLite WAL autocheckpoint latency spike commit separate checkpointer connection busy errors", and a currency query "SQLite release notes WAL checkpoint behavior changed journal_size_limit wal_autocheckpoint 2025 2026" (no change to the cited behaviours found; the only recent WAL change found is the WAL-reset bug fix, which is already on wal.html § 11). Lateral read on S-r1-practice-ops-01: sqlite.org is the project's own site and the page was updated 2026-08-25, so it carries its own currency.

### S-v6-01
- url: https://raw.githubusercontent.com/sqlite/sqlite/master/src/wal.c · canonical: github.com/sqlite/sqlite/src/wal.c
- title: src/wal.c · authors: SQLite developers · publisher: SQLite project (GitHub mirror)
- date: n/a · version: master branch as fetched 2026-10-23 (commit sha not recorded; the file has SQLITE_USE_SEH handling, so it is recent)
- accessed: 2026-10-23 · read-via: curl · quote-match: approximate · archive: none
- kind: code · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the GitHub mirror of the SQLite repository; the code is the thing the docs describe, so it is rung 1 for behaviour. Caveats: master is not pinned to a release, and the converter's text (S-v6-01.txt) dropped everything between a `<` and the next `>`, so the passages below were read from the raw file pages/final-b6/S-v6-01.html (lines 483-495, 4188-4193, 4302-4313) and are checked by substance, not by `--check`. The comment lines in the raw file start with `**`.
- passages:
  - P1 · wal.c, sqlite3WalFrames (raw lines 4302-4313): "If this frame set completes the first transaction in the WAL and if PRAGMA journal_size_limit is set, then truncate the WAL to the journal size limit, if possible."
  - P2 · wal.c, sqlite3WalFrames (raw line 4192, in the branch that writes a new WAL header): "pWal->truncateOnCommit = 1;"
  - P3 · wal.c, walLimitSize (raw lines 2480-2481): "If the WAL file is currently larger than nMax bytes in size, truncate it to exactly nMax bytes."

### C-v6-01
- claim: In SQLite's wal.c on the master branch (fetched 2026-10-23), the journal_size_limit truncation at commit happens only for a commit that completes the first transaction in a newly started WAL (the flag truncateOnCommit is set when the WAL header is written, and cleared after the truncation), and the target size is the larger of the limit and the end of that transaction's frames.
- kind: behaviour
- questions: Q24 · load-bearing: yes (narrows the docs' "each time a transaction is committed")
- support: S-v6-01/P1, S-v6-01/P2 · rung 1 · fit direct (the "target is the larger of ..." part is read from the adjacent lines 4307-4310, not quoted) · upstream self
- scope: master branch as fetched; not pinned to a release
- confidence: medium · flags: none
- conflicts: S-r1-practice-ops-02/P8 "Each time a transaction is committed or a WAL file resets, SQLite compares the size ... and if the journal or WAL file is larger it is truncated to the limit." (the docs summarize; the code is narrower; not a flat contradiction)

### S-v6-03
- url: https://sqlite.org/c3ref/wal_checkpoint_v2.html · canonical: sqlite.org/c3ref/wal_checkpoint_v2.html
- title: Checkpoint a database · authors: n/a · publisher: SQLite
- date: n/a · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: as S-r1-practice-ops-01. (Same page as S-r1-practice-ops-03, re-fetched by the verifier into this batch's folder.)
- passages:
  - P1 · § "Checkpoint a database": "Like SQLITE_CHECKPOINT_FULL, this mode blocks new database writer attempts while it is pending, but does not impede readers."
  - P2 · § "Checkpoint a database": "If the busy-handler returns 0 before the writer lock is obtained or while waiting for database readers, the checkpoint operation proceeds from that point in the same way as SQLITE_CHECKPOINT_PASSIVE - checkpointing as many frames as possible without blocking any further. SQLITE_BUSY is returned in this case."

### C-v6-02
- claim: SQLite's sqlite3_wal_checkpoint_v2() documentation says a RESTART checkpoint blocks new writers but does not impede readers, and that a FULL, RESTART or TRUNCATE checkpoint whose busy handler returns 0 stops waiting, proceeds like a PASSIVE checkpoint and returns SQLITE_BUSY, so it does not always run to completion before returning.
- kind: behaviour
- questions: Q24 · load-bearing: yes (qualifies C-r1-practice-ops-23 and bears on C-r1-practice-ops-24)
- support: S-v6-03/P1, S-v6-03/P2 · rung 1 · fit direct · upstream self
- scope: current docs
- confidence: high · flags: none
- conflicts: S-r1-practice-ops-01/P20 "The disadvantage of using SQLITE_CHECKPOINT_RESTART and SQLITE_CHECKPOINT_TRUNCATE is that readers might block while the checkpoint is running." and "will ensure that the checkpoint runs to completion before returning" (two pages of the same project say different things; recorded in the findings as C-r1-practice-ops-24)

## Leads
- https://sqlite.org/forum/forumpost/1952fedde3?t=c — rung 3 (forum): a 2020 report that `journal_size_limit` had no visible effect while the WAL could not be checkpointed (continuous load); a respondent says the WAL grows until a checkpoint reaches the end of the WAL. Saved as pages/final-b6/S-v6-02.txt. Consistent with the docs; shows the limit does not act without a completed checkpoint/reset.
- https://kms.shanghaitech.edu.cn/handle/2MSLDSTB/352575 — an academic paper (reported by search only, not opened) on checkpoint-caused write-latency spikes in SQLite WAL mode; could be a rung-2 source for the cost of inline checkpoints if opened.

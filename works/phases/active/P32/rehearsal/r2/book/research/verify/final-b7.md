# Verification: 20261023-1245-sqlite-wal · final-b7
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 12 · supported 12 · partial 0 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0

All pages were fetched fresh into /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s9/ws/works/phases/active/P90/book/research/pages/final-b7/ (curl, exact text). Page ids are the cited source ids (S-r1-practice-ops-01 = sqlite.org/wal.html, -04 = howtocorrupt, -06 = lang_vacuum, -10 = walformat; S-r1-criticism-01/-10 re-fetched from www.sqlite.org; S-r1-criticism-11 = Antithesis post).

## Records

### V-C-r1-practice-ops-28-1
- claim: C-r1-practice-ops-28
- source S-r1-practice-ops-04 · opened: https://sqlite.org/howtocorrupt.html (curl) · quote-match: exact · passage at § "1.2. Backup or restore while a transaction is active": found verbatim (P2, elisions between lines 69-72)
- looked first: § 1.2 says "There are multiple safe approaches to making backup copies of SQLite databases ... In no particular order:" and lists sqlite3_rsync (3.47.0 (2024-10-21) and later, over SSH), VACUUM INTO, and the backup API.
- implied: three methods listed; sqlite3_rsync available from 3.47.0; "over SSH" attached to sqlite3_rsync; VACUUM INTO; backup API; "Any of the above approaches will work even on a live database."
- verdict: supported · reason: every element (three methods, version 3.47.0, SSH, live-database statement) is stated in the section.
- bar: met (rung 1, descriptive, official docs) · independence: n/a · currency: page is current docs fetched 2026-10-23; no later contrary text seen.
- counter: S-v7-01 (C-v7-01), S-v7-02 (C-v7-02): scope refinements only, not contradictions (see Counter-evidence).

### V-C-r1-practice-ops-35-1
- claim: C-r1-practice-ops-35
- source S-r1-practice-ops-06 · opened: https://sqlite.org/lang_vacuum.html (curl) · quote-match: exact · passage at § "2.1. VACUUM with an INTO clause": found verbatim (P1, line 32)
- looked first: § 2.1 describes INTO as creating a new database file with the same logical content; the next paragraph is the comparison with the backup API.
- implied: VACUUM INTO is "an alternative to the backup API for generating backup copies of a live database"; advantage: output minimal in size so filesystem I/O may be reduced; deleted content purged (no forensic traces); "the backup API uses fewer CPU cycles and can be executed incrementally."
- verdict: supported · reason: the claim is correctly attributed ("docs present") and each comparative element is stated. The source adds "hence the amount of filesystem I/O may be reduced", which the claim omits without distortion.
- bar: met for the attributed form (rung 1 supports "the docs say"); a chapter-voice claim that one method is better would need two rung-2 sources. · independence: n/a · currency: current docs.
- counter: none-found ("SQLite VACUUM INTO backup limitations WAL live database", "sqlite backup API vs VACUUM INTO which is faster criticism"; results show only a third-party tutorial assertion without measurement, and the docs' own wording)

### V-C-r1-practice-ops-39-1
- claim: C-r1-practice-ops-39
- source S-r1-practice-ops-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at § "4. The WAL File": found verbatim (P11, line 91)
- looked first: § 4 says the WAL file exists while any connection is open, is normally deleted when the last connection closes, but may be retained after an unclean exit or with SQLITE_FCNTL_PERSIST_WAL.
- implied: WAL is "part of the persistent state of the database"; "should be kept with the database if the database is copied or moved"; separated: previously committed transactions "might be lost" or the file "might become corrupted".
- verdict: supported · reason: all parts stated; the claim keeps the hedges ("may"). The scope "whenever a -wal file exists" matches the section's context.
- bar: met (rung 1, descriptive) · independence: n/a · currency: page last updated 2026-08-25.
- counter: none-found ("copying SQLite database file without -wal file safe after checkpoint"; results only echo the rule or add that a copy is safe once all connections closed and no -wal remains, which is consistent with the claim's "whenever a -wal file exists")

### V-C-r1-practice-ops-51-1
- claim: C-r1-practice-ops-51
- source S-r1-practice-ops-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at § "5. Read-Only Databases": found verbatim (P13 line 94; P14 lines 95-98)
- implied: older versions could not read a WAL-mode database that was read-only (write access required); relaxed from 3.22.0 (2018-01-22); on newer versions it can be read if (-shm and -wal exist and are readable) or (write permission on the directory) or (immutable query parameter).
- verdict: supported · reason: all three conditions, the version and the date are stated. "One or more of" is rendered as "or", which is faithful.
- bar: met (rung 1) · independence: n/a · currency: current.
- counter: not run

### V-C-r1-practice-ops-54-1
- claim: C-r1-practice-ops-54
- source S-r1-practice-ops-10 · opened: https://sqlite.org/walformat.html (curl) · quote-match: exact · passage at § "2.3.2. Operations that require locks and which locks those operations use": found verbatim (P2, line 255)
- implied: with sqlite3_file_control(SQLITE_FCNTL_PERSIST_WAL) invoked before closing, the final checkpoint still runs, WAL and WAL-index files are not deleted, other processes without write permission can open read-only; if the files are missing, a process that cannot create them cannot open the database unless immutable.
- verdict: supported · reason: each clause is stated. "Set before closing" is a fair paraphrase of "invokes ... prior to closing".
- bar: met (rung 1) · independence: n/a · currency: current docs.
- counter: not run

### V-C-r1-practice-ops-55-1
- claim: C-r1-practice-ops-55
- source S-r1-practice-ops-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at § "5. Read-Only Databases": found verbatim (P15, line 99)
- implied: "it is good practice to convert the database to PRAGMA journal_mode=DELETE prior to burning an SQLite database image onto read-only media."
- verdict: supported · reason: directly stated; the claim is in attributed form.
- bar: met for attributed form · independence: n/a · currency: current.
- counter: not run

### V-C-r1-criticism-03-1
- claim: C-r1-criticism-03
- source S-r1-criticism-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage at § "1. Overview": found verbatim (P3, line 50)
- implied: page_size cannot be changed after entering WAL mode, on an empty database, by VACUUM or by restoring via the backup API. The source adds that one must be in a rollback journal mode to change it.
- verdict: supported · reason: all three routes named. · bar: met (rung 1) · independence: n/a · currency: page last updated 2026-08-25.
- counter: not run

### V-C-r1-criticism-06-1
- claim: C-r1-criticism-06
- source S-r1-criticism-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage at § "1. Overview": found verbatim (P6, line 54)
- implied: listed among the disadvantages: "the extra operation of checkpointing which, though automatic by default, is still something that application developers need to be mindful of."
- verdict: supported · reason: directly stated, listed under "But there are also disadvantages". · bar: met · independence: n/a · currency: current.
- counter: not run

### V-C-r1-criticism-09-1
- claim: C-r1-criticism-09
- source S-r1-criticism-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage at § "2.2. Concurrency": found verbatim (P12, line 66)
- implied: "since there is only one WAL file, there can only be one writer at a time." Context: writers append to the WAL, readers and writers run at the same time.
- verdict: supported · reason: the causal "because" is the source's own. · bar: met · independence: n/a · currency: current.
- counter: not run

### V-C-r1-criticism-19-1
- claim: C-r1-criticism-19
- source S-r1-criticism-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage at § "11.2. Low Probability Of Occurrence": found verbatim (P23, line 143)
- looked first: § 11.2 says developers could not reproduce the bug organically and "The only way the developers have been able to cause the malfunction was to modify the SQLite sources to invoke a callback controlled by sqlite3_test_control()".
- implied: "UPDATE: 2026-08-24 → Phil Eaton has devised a reproducer that does not involve using the special testing code hack." The page footer says "last updated on 2026-08-25 19:42:39Z".
- verdict: supported · reason: the reported content is stated. Wording note: 2026-08-24 is the date of the UPDATE note; the page's own last-updated date is 2026-08-25. Safer wording: "The SQLite documentation, in an update dated 2026-08-24, reports ...". Eaton's article itself was not opened (the researcher recorded that it could not be read), so only the attributed form is supported.
- bar: met (rung 1, attributed to the docs) · independence: n/a · currency: current.
- counter: not run

### V-C-r1-criticism-23-1
- claim: C-r1-criticism-23
- source S-r1-criticism-10 · opened: https://www.sqlite.org/howtocorrupt.html (curl) · quote-match: exact · passage at § "3.1. Disk drives that do not honor sync requests": found verbatim (P2, line 117)
- implied: "In WAL mode, the only time that a failed sync operation can cause database corruption is during a checkpoint operation. A sync failure during a COMMIT might result in loss of durability but not in a corrupt database file." Context: SQLite believes what the OS and hardware report; WAL "far more forgiving of out-of-order writes".
- verdict: supported · reason: both halves stated, in the section named by the claim's scope. · bar: met (rung 1) · independence: n/a · currency: current.
- counter: not run

### V-C-r1-criticism-35-1
- claim: C-r1-criticism-35
- source S-r1-criticism-11 · opened: https://antithesis.com/blog/2026/wal-reset-bug/ (curl) · quote-match: exact · passage at § "Breaking the WAL": found verbatim (P1 line 30, P2 line 32, P3 line 34)
- looked first: the post (Carl Sverre, 2026-08-12) says he had Claude set up "SQL 3.51.2 - still buggy" in Antithesis, instrument the code with assertions, and write a simple workload.
- implied: workload "just runs writes and checkpoints concurrently"; "completely generic"; "On my first run, Antithesis caught the bug in 15 mins"; with 3.51.3 and "the same workload and Antithesis instrumentation ... the run came back green". The version for the first run (3.51.2) comes from the preceding paragraph, not from P2 itself; it is stated on the page.
- verdict: supported · reason: all elements stated, including the instrumented-code scope the claim keeps. "Passed" is a fair paraphrase of "came back green".
- bar: met for the attributed form (a vendor's report of its own run, rung 1 for that). Below the bar if used in the chapter's voice to say the race is easy to hit in production: one vendor source, with a stake, instrumented deterministic environment. The SQLite docs' own page does not corroborate the Antithesis run. · independence: single source (vendor about itself) · currency: post dated 2026-08-12; current.
- counter: not run (not marked main)

## Counter-evidence

Claims C-r1-practice-ops-28, -35, -39 were marked main. Queries run: "SQLite VACUUM INTO backup limitations WAL live database"; "copying SQLite database file without -wal file safe after checkpoint"; "sqlite backup API vs VACUUM INTO which is faster criticism"; "sqlite3_rsync deprecated OR changed OR bug 3.50 3.51 release notes". Lateral read: all main sources are sqlite.org pages, the project's own docs (owner SQLite project); two other sqlite.org pages were read for limits of claim 28.

### S-v7-01
- url: https://sqlite.org/rsync.html · canonical: sqlite.org/rsync.html
- title: Database Remote-Copy Tool For SQLite · authors: n/a · publisher: SQLite
- date: n/a; updated 2025-11-13 ("This page was last updated on 2025-11-13 07:12:58Z") · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: sqlite.org, the SQLite project's own site.
- passages:
  - P1 · § "3. Limitations": "The database files must both be in WAL mode, and must have the same page-size. ← These limitations were removed in version 3.50.0 (2025-05-29)."
  - P2 · § "2. Features": "Both databases may be "live" while this utility is running."
  - P3 · § "2. Features": "It is not required that one of ORIGIN or REPLICA be remote. The sqlite3_rsync utility works fine if both ORIGIN and REPLICA are local."

### S-v7-02
- url: https://sqlite.org/c3ref/backup_finish.html · canonical: sqlite.org/c3ref/backup_finish.html
- title: Online Backup API · authors: n/a · publisher: SQLite
- date: n/a · version: current docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: sqlite.org, the SQLite project's own site.
- passages:
  - P1 · § "Online Backup API.": "If the source database is modified by an external process or via a database connection other than the one being used by the backup operation, then the backup will be automatically restarted by the next call to sqlite3_backup_step()."

### C-v7-01
- claim: The SQLite sqlite3_rsync documentation says that before SQLite 3.50.0 (2025-05-29) both databases had to be in WAL mode with the same page size, and that sqlite3_rsync also works when both databases are local.
- kind: version
- questions: Q25 · load-bearing: no (scope refinement for C-r1-practice-ops-28)
- support: S-v7-01/P1, S-v7-01/P3 · rung 1 · fit direct · upstream self
- scope: sqlite3_rsync 3.47.0 through 3.49.x, and the "over SSH" wording
- confidence: high · flags: none
- conflicts: refines C-r1-practice-ops-28; does not contradict it

### C-v7-02
- claim: The SQLite online backup API documentation says that if another connection or process modifies the source database during a backup, the backup is automatically restarted at the next sqlite3_backup_step() call.
- kind: behaviour
- questions: Q25 · load-bearing: no (scope refinement for C-r1-practice-ops-28)
- support: S-v7-02/P1 · rung 1 · fit direct · upstream self
- scope: backup API with incremental stepping
- confidence: high · flags: none
- conflicts: refines C-r1-practice-ops-28 ("work even on a live database" holds, but a busy writer can force restarts); does not contradict it

## Leads
- https://sqlite.org/forum/forumpost/905eb5e564d4df44 — forum thread on omitting the WAL after a TRUNCATE checkpoint; rung 3, not opened.
- https://oneuptime.com/blog/post/2026-09-08-back-up-wal-mode-sqlite-safely/view — third-party guide on backing up WAL databases; rung 3, not opened.

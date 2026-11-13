# Findings: 20261023-1245-sqlite-wal · round 1 · angle cases
- researcher: claude-opus-5-5 · status: partial (hard cap of 40 tool calls exceeded, about 62 used; Laravel evidence fetched but not converted, so left as a lead) · tool calls: 62

## Questions
- Q35: answered — claims: C-r1-cases-01, C-r1-cases-02, C-r1-cases-03, C-r1-cases-04, C-r1-cases-05, C-r1-cases-06, C-r1-cases-07 — note: two real cases with numbers (Syncthing v2 2026, ~190 GB WAL; SQLite forum 2021, ~100 GB WAL). Both are first-hand forum/issue reports, not formal postmortems; the Syncthing cause is a maintainer-side analysis, and the issue is still open. No web-service (Rails/Django) incident with numbers was found.
- Q36: answered — claims: C-r1-cases-08, C-r1-cases-09, C-r1-cases-10, C-r1-cases-11, C-r1-cases-12, C-r1-cases-13, C-r1-cases-14, C-r1-cases-15, C-r1-cases-16, C-r1-cases-17, C-r1-cases-18, C-r1-cases-21 — note: Rails sets WAL + synchronous=NORMAL + journal_size_limit 64 MB by default, with reasons given in PR #49349. Django sets no WAL default, and a maintainer declined to add one. Laravel ships the journal_mode/synchronous/busy_timeout keys set to null (lead only, not checked).
- Q37: answered — claims: C-r1-cases-19, C-r1-cases-20, C-r1-cases-21, C-r1-cases-22, C-r1-cases-23, C-r1-cases-24 — note: all from Litestream's own docs (rung 1 for what Litestream does, so claims are attributed). No independent source was searched.

## Sources

### S-r1-cases-01
- url: https://litestream.io/how-it-works/ · canonical: litestream.io/how-it-works/
- title: How it works · authors: n/a · publisher: Litestream
- date: undated · version: docs for v0.5.x (page refers to v0.5 replacing v0.3.x concepts)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Litestream project (Ben Johnson, open source) · upstream: none
- lateral: Litestream is an open-source SQLite replication tool by Ben Johnson. Its docs are the project's own description of its design.
- passages:
  - P1 · § "From WAL to LTX": "Litestream works by effectively taking over the checkpointing process. It starts a long-running read transaction to prevent any other process from checkpointing and restarting the WAL file. Instead, it continually reads new WAL pages and manually calls out to SQLite to perform checkpoints as necessary."
  - P2 · § "Understanding the WAL": "This process is called checkpointing and can only be done when no transactions are active. That is the crux of what lets Litestream replicate SQLite."

### S-r1-cases-02
- url: https://litestream.io/tips/ · canonical: litestream.io/tips/
- title: Tips & Caveats · authors: n/a · publisher: Litestream
- date: undated · version: docs for v0.5.x (page notes "v0.5.0+")
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Litestream project · upstream: none
- lateral: same project as S-r1-cases-01.
- passages:
  - P1 · § "Busy timeout": "However, Litestream requires periodic but short write locks on the database when checkpointing occurs. SQLite will return an error by default if your application tries to obtain a write lock at the same time."
  - P2 · § "Busy timeout": "It is recommended to set this to 5 seconds:"
  - P3 · § "Synchronous PRAGMA": "To do this, you can change the synchronous mode to NORMAL (it typically defaults to FULL):"
  - P4 · § "Synchronous PRAGMA": "This mode will ensure that the fsync() calls are only called when the WAL becomes full and has to checkpoint to the main database file. This is safe as the WAL file is append only."
  - P5 · § "Disable autocheckpoints for high write load servers": "Litestream prevents other processes from checkpointing by maintaining a read lock on the database in between its checkpoint requests."
  - P6 · § "Disable autocheckpoints for high write load servers": "However, under high load with many small write transactions (e.g. tens of thousands per second), the application's SQLite instance can perform a checkpoint in between Litestream-initiated checkpoints and cause Litestream to miss a WAL update. When Litestream detects this it takes a fresh full snapshot to ensure consistency."
  - P7 · § "Disable autocheckpoints for high write load servers": "To prevent this, it is recommended to run your application with autocheckpointing disabled."
  - P8 · § "Disable autocheckpoints for high write load servers": "Note: Checkpoint detection improvements in v0.5.0+ reduce the need for full snapshots when checkpoints occur."

### S-r1-cases-03
- url: https://litestream.io/guides/wal-truncate-threshold/ · canonical: litestream.io/guides/wal-truncate-threshold/
- title: WAL Truncate Threshold Configuration · authors: n/a · publisher: Litestream
- date: undated · version: v0.5.x (mentions v0.5.15 behaviour)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Litestream project · upstream: none
- lateral: same project as S-r1-cases-01.
- passages:
  - P1 · § "1. TruncatePageN (TRUNCATE, Blocking) - Emergency Brake": "Trigger: WAL exceeds 121,359 pages (~500MB)"
  - P2 · § "2. MinCheckpointPageN (PASSIVE, Non-Blocking)": "Trigger: WAL exceeds 1,000 pages (~4MB)"
  - P3 · § "3. CheckpointInterval (PASSIVE, Non-Blocking)": "Trigger: 1 minute elapsed since last checkpoint attempt"
  - P4 · § "Passive-first truncation": "v0.5.15 Crossing the truncate-page-n threshold no longer forces a blocking checkpoint immediately. Litestream first attempts a PASSIVE checkpoint."
  - P5 · § "Passive-first truncation": "A genuine blocking TRUNCATE runs only when the passive checkpoint does not bring the WAL back below the threshold—for example, when a long-lived reader keeps the WAL open so it cannot be restarted. When a TRUNCATE is forced, it always takes a full boundary snapshot while holding the write lock, which can stall writers on a large database"
  - P6 · § "Disabling TruncatePageN (Recommended for Long-Read Apps)": "Never blocks writes under any circumstances"
  - P7 · § "Disabling TruncatePageN (Recommended for Long-Read Apps)": "WAL can grow unbounded if read transactions prevent checkpointing"
  - P8 · § "2. MinCheckpointPageN (PASSIVE, Non-Blocking)": "Behavior: Non-blocking—returns SQLITE_BUSY if readers or writers are active, which Litestream handles gracefully"
  - P9 · § "Detecting Write Blocking": "Root Cause: A forced TRUNCATE checkpoint inherits RESTART semantics from SQLite, meaning it waits for both all active readers AND writers to complete before truncating the WAL. Long-lived read transactions will cause extended blocking periods."

### S-r1-cases-04
- url: https://forum.syncthing.net/t/dealing-with-checkpoint-starvation/26121 · canonical: forum.syncthing.net/t/dealing-with-checkpoint-starvation/26121
- title: Dealing with checkpoint starvation · authors: bt90 · publisher: Syncthing Community Forum
- date: 2026-02-06 · version: Syncthing v2 (SQLite backend)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: forum · peer-review: no
- owner: Syncthing project forum. bt90 is listed as "Contributor" on the related GitHub issue (S-r1-cases-06).
- upstream: none (first-hand analysis by a project contributor of the project's own system)
- lateral: Syncthing is an open-source file-sync tool whose v2 moved its index database to SQLite. bt90 authored issue #10559 in the syncthing repository.
- passages:
  - P1 · § "Dealing with checkpoint starvation": "Auto checkpoints. We don't disable the auto checkpoint functionality of sqlite. That means that any commit while also try to do a passive checkpoint if the WAL has a size of 1k pages. As checkpoints of any kind are exclusive, we're blocking our own checkpointer"
  - P2 · § "Dealing with checkpoint starvation": "Maybe we can replace the timer based checkpointer and move the logic into our connection pool? Releasing a connection back to the pool would run our heuristic and invoke a checkpoint if needed."
  - P3 · § "Dealing with checkpoint starvation": "As our application level checkpointer is timer based, we might never hit a timewindow without an active reader. So we can't truncate the WAL file afterwards."
  - P4 · § "Dealing with checkpoint starvation": "If the size of the WAL reaches critical levels of multiple gigabytes, we need to act. Otherwise we end up with a positive feedback loop and database operations grind to a halt."

### S-r1-cases-05
- url: https://raw.githubusercontent.com/rails/rails/main/activerecord/lib/active_record/connection_adapters/sqlite3_adapter.rb · canonical: github.com/rails/rails/blob/main/activerecord/lib/active_record/connection_adapters/sqlite3_adapter.rb
- title: sqlite3_adapter.rb · authors: Rails contributors · publisher: rails/rails
- date: fetched from main on 2026-10-23; per the GitHub commits API, the last commit to touch the file was 8c8af7fe3721991325a1b1a6454edf6919b3e42f (2026-10-20) · version: Rails main (post-8.x)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: Rails core (rails/rails) · upstream: none
- lateral: official Rails repository. The defaults trace to PR #49349 (S-r1-cases-12).
- note: fetched as a raw file and not from a local clone, so there is no git-show excerpt hash. Lines quoted are L150-L157 and L983-L999 of the fetched file. Quote characters inside the code are bridged with " … " separators.
- passages:
  - P1 · L152-L153: "journal_mode … => :wal, … synchronous … => :normal,"
  - P2 · L154-L156: "mmap_size … => 134217728, # 128 megabytes … journal_size_limit … => 67108864, # 64 megabytes … cache_size … => 2000"
  - P3 · L151: "foreign_keys … => true,"
  - P4 · L987: "@raw_connection.busy_handler_timeout = timeout"
  - P5 · L992-L993: "pragmas = @config.fetch(:pragmas, {}).stringify_keys DEFAULT_PRAGMAS.merge(pragmas).each do |pragma, value|"

### S-r1-cases-06
- url: https://github.com/syncthing/syncthing/issues/10559 · canonical: github.com/syncthing/syncthing/issues/10559
- title: Checkpoint starvation #10559 · authors: bt90 (opened), comments by dmih, calmh · publisher: GitHub / syncthing project
- date: opened 2026-02-04; last activity seen 2026-10-21 · version: Syncthing v2.0.14 (as reported)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: forum (project issue tracker) · peer-review: no
- owner: Syncthing project · upstream: none
- lateral: official Syncthing issue tracker. The issue was still labelled Open/needs-triage when accessed.
- passages:
  - P1 · § "What happened?": "Our current database maintenance logic is prone to checkpoint starvation. The problem is that there's no guarantee that readers are active during the maintenance window."
  - P2 · § "What happened?": "As the WAL size has a negative impact on reader performance, we end up with a positive feedback loop. The readers execute slower with a growing WAL and the chances of a successful checkpoint vanish."
  - P3 · § "bt90 commented on Feb 4, 2026": "shows that we're constantly moving pages from the WAL to the database(albeit slower than the WAL is growing). This means that it's not caused by a read transaction that is running for hours/days."
  - P4 · § "bt90 commented on Feb 4, 2026": "The problem is that those reads are in quick succession. Our checkpointer routine is never able to hit a gap."
  - P5 · § "bt90 commented on Feb 5, 2026": "While we took checkpoint handling into our own hands, we didn't disable the auto mechanism."
  - P6 · § "bt90 commented on Feb 5, 2026": "Given a large WAL, all readers would trigger a PASSIVE checkpoint on commit. If such a checkpoint is executing our manual checkpoints would instantly fail."
  - P7 · § "Syncthing version": "v2.0.14"

### S-r1-cases-08
- url: https://github.com/django/django/pull/14824 · canonical: github.com/django/django/pull/14824
- title: Django pull request #14824 (adds an SQLite init_command option; exact title not recorded) · authors: linville (PR), comments by gcollazo, felixxm · publisher: GitHub / django project
- date: comments dated 2024-02-15 · version: Django dev at that time
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: forum (project pull request) · peer-review: no
- owner: Django project. felixxm (Mariusz Felisiak) is marked "Member", a Django Fellow.
- upstream: none
- lateral: the official Django repository. felixxm's comment is a maintainer's statement of project policy.
- passages:
  - P1 · § "gcollazo commented Feb 15, 2024": "Would it be possible/make sense to set or recommend (in docs) a … sensible default configuration … for using SQLite in the context of a web app?"
  - P2 · § "felixxm commented Feb 15, 2024": "I don't think so. If we decided we needed more options we would set them automatically, as we already do:"
  - P3 · § "felixxm commented Feb 15, 2024": "conn.execute( … PRAGMA foreign_keys = ON"
  - P4 · § "felixxm commented Feb 15, 2024": "conn.execute( … PRAGMA legacy_alter_table = OFF"

### S-r1-cases-09
- url: https://docs.djangoproject.com/en/dev/ref/databases/ · canonical: docs.djangoproject.com/en/dev/ref/databases/
- title: Databases · authors: Django Software Foundation · publisher: Django documentation
- date: dev docs, as of 2026-10-23 · version: Django development version
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Django Software Foundation · upstream: none
- lateral: Django's official reference docs.
- passages:
  - P1 · § "Setting pragma options": "Pragma options can be set upon connection by using the init_command in the OPTIONS part of your database configuration in DATABASES. The example below shows how to enable extra durability of synchronous writes and change the cache_size:"
  - P2 · § "Setting pragma options": "init_command … PRAGMA synchronous=3; PRAGMA cache_size=2000;"
  - P3 · § "Transactions behavior": "To make sure your transactions wait until timeout before raising … Database is Locked … change the transaction mode to IMMEDIATE."
  - P4 · § "Database is locked errors": "This will make SQLite wait a bit longer before throwing … database is locked … errors; it won't really do anything to solve them."
  - P5 · § "Transactions behavior": "The default is DEFERRED."

### S-r1-cases-12
- url: https://github.com/rails/rails/pull/49349 · canonical: github.com/rails/rails/pull/49349
- title: Performance tune the SQLite3 adapter connection configuration · authors: fractaledmind (Stephen Margheim) · publisher: GitHub / rails project
- date: opened 2023-09-21; merged 2023-09-24 · version: Rails main → released in 7.1
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: forum (project pull request; the author's rationale) · peer-review: no (merged by guilleiguaran, a Rails committer)
- owner: rails/rails; author is a contributor who also writes about SQLite on Rails · upstream: cites the SQLite docs for WAL
- lateral: fractaledmind (Stephen Margheim) is a Rails contributor known for SQLite-on-Rails work. The PR was merged into Rails main.
- passages:
  - P1 · § "Performance tune the SQLite3 adapter connection configuration - #49349": "guilleiguaran merged commit d8391b2 into rails:main Sep 24, 2023"
  - P2 · § "Conversation": "For Rails applications, the Write-Ahead-Log in normal syncing mode with a capped journal size, a healthy shared memory buffer and a shared cache will perform, on average, 2× better."
  - P3 · § "Detail": "This is the recommended journal mode for web applications, since, as the SQLite docs lay out:"
  - P4 · § "Detail": "WAL provides more concurrency as readers do not block writers and a writer does not block readers. Reading and writing can proceed concurrently."
  - P5 · § "Detail": "So, we trade an aggressive approach to durability for speed. However, SQLite does a lot to mitigate the reduction in durability, and it is honestly an extreme edge-case. In fact, SQLite ensures that any potential data loss could only happen with OS or filesystem failure; any process crash won't affect data durability."
  - P6 · § "Detail": "The default of -1 means that there is no limit, so this disk file will grow in size indefinitely. This is not what we want."
  - P7 · § "Detail": "We need to ensure that the file size is capped at an appropriate size."
  - P8 · § "Motivation / Background": "Because of its commitment to backwards-compatibility and its original use-case for embedded systems, the default configuration of SQLite today is not well-suited for web applications."

### S-r1-cases-13
- url: https://forum.syncthing.net/t/is-syncthing-v2-with-very-large-folders-possible/26082 · canonical: forum.syncthing.net/t/is-syncthing-v2-with-very-large-folders-possible/26082
- title: Is Syncthing v2 with very large folders possible ? · authors: gyver (opening post), replies by dmih, bt90, tomasz86 · publisher: Syncthing Community Forum
- date: 2026-01-26 (first post); page 1 runs to 2026-01-29 · version: Syncthing 2.0.10 (as reported)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: forum · peer-review: no
- owner: Syncthing project forum. Posts are users' first-hand reports.
- upstream: none
- lateral: the user report that Syncthing issue #10559 (S-r1-cases-06) links to as evidence.
- passages:
  - P1 · § "Is Syncthing v2 with very large folders possible ?": "52636483584 Jan 16 18:46 folder.0002-xxx.db"
  - P2 · § "Is Syncthing v2 with very large folders possible ?": "190415597392 Jan 26 03:50 folder.0002-xxx.db-wal"
  - P3 · § "Is Syncthing v2 with very large folders possible ?": "The largest folder has approximately 30 million files, 2.5 million directories and 15 TiB of data."
  - P4 · § "Is Syncthing v2 with very large folders possible ?": "migrate only one backup server (to 2.0.10) to validate that it works properly in my environment."
  - P5 · § "Is Syncthing v2 with very large folders possible ?": "It was even when deleting 1M folder, first step of deletion processing was to explode 4 GB DB to ~4 DB + 12 GB WAL."
  - P6 · § "Is Syncthing v2 with very large folders possible ?": "I removed the old database to force Syncthing v2 to recreate the indexes from the content folders."

### S-r1-cases-14
- url: https://sqlite.org/forum/forumpost/6038b31ddb?t=c · canonical: sqlite.org/forum/forumpost/6038b31ddb
- title: Growing WAL-File · authors: Heribert (derhexer); replies by Kees Nuyt, Richard Hipp (drh), Keith Medcalf · publisher: SQLite User Forum
- date: 2021-04-06 to 2021-04-07 · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: forum · peer-review: no
- owner: SQLite project forum (sqlite.org). Richard Hipp is SQLite's author.
- upstream: none
- lateral: the official SQLite forum. drh's reply is the SQLite author's statement about SQLite's behaviour (rung 1 for that statement). The original poster's report is first-hand and unverified.
- passages:
  - P1 · § "(1) By Heribert (derhexer) on 2021-04-06 07:53:27": "I'm using sqlite with WAL in my logging system. Currently the WAL-File is about 100GB and it continues growing."
  - P2 · § "(1) By Heribert (derhexer) on 2021-04-06 07:53:27": "There is no open transaction, but i have a lot of prepared statements (to improve speed)."
  - P3 · § "(4) By Richard Hipp (drh) on 2021-04-06 17:11:05 in reply to 3": "If you don't invoke sqlite3_reset() on every prepared statement that you run, then you will likely be leaving some transactions open, which will prevent the checkpoint from happening and resetting the WAL file."
  - P4 · § "(5) By Heribert (derhexer) on 2021-04-06 18:05:54 in reply to 4": "Ok. Thanks. So, i will check if do really reset all of them."
  - P5 · § "(6.2) By Keith Medcalf (kmedcalf) on 2021-04-07 01:34:07 edited from 6.1 in reply to 5": "If, however, you are using multiple threads of execution (which includes multiple processes) then it is mayhaps a possibility that there is no time at which (a) an auto checkpoint occurs and (b) there are no transactions in progress, which will cause the WAL file to increase in size forever since it might never be able to checkpoint to the last page in the log."

## Claims

### C-r1-cases-01
- claim: In a January 2026 Syncthing forum report, a user rebuilding Syncthing 2.0.10's index for a folder of about 30 million files listed a folder database of 52,636,483,584 bytes and a -wal file of 190,415,597,392 bytes beside it.
- kind: number
- questions: Q35 · load-bearing: no (an illustrative case)
- support: S-r1-cases-13/P1 · rung 1 (first-hand report, attributed form only) · fit direct · upstream self
- support: S-r1-cases-13/P2 · rung 1 · fit direct · upstream self
- support: S-r1-cases-13/P3 · rung 1 · fit direct · upstream self
- support: S-r1-cases-13/P4 · rung 1 · fit direct · upstream self
- support: S-r1-cases-13/P6 · rung 1 · fit direct · upstream self
- scope: one user's self-reported `ls` output, 2026-01-26. The db timestamp is Jan 16 and the -wal timestamp Jan 26. Syncthing 2.0.10, Linux, spinning disks in RAID10.
- confidence: medium · flags: exceptional (a WAL about 3.6× the database), single unverified user report
- conflicts: none

### C-r1-cases-02
- claim: The Syncthing contributor who opened issue #10559 (February 2026, Syncthing v2.0.14) attributed the WAL growth to checkpoint starvation: reads ran in such quick succession that the project's timer-based checkpointer never found a moment with no active reader, so the WAL kept growing even though pages were being checkpointed.
- kind: interpretation
- questions: Q35 · load-bearing: no
- support: S-r1-cases-06/P1 · rung 1 (project contributor on the project's own system) · fit direct · upstream self
- support: S-r1-cases-06/P3 · rung 1 · fit direct · upstream self
- support: S-r1-cases-06/P4 · rung 1 · fit direct · upstream self
- support: S-r1-cases-04/P3 · rung 1 · fit direct · upstream self
- scope: Syncthing v2's own checkpointer, as diagnosed in Feb 2026. The issue was still open when accessed (2026-10-23), so this is a diagnosis, not a confirmed fix.
- confidence: medium · flags: none
- conflicts: none

### C-r1-cases-03
- claim: The same Syncthing contributor described a feedback loop in which a larger WAL slowed readers, which in turn lowered the chance of a successful checkpoint.
- kind: interpretation
- questions: Q35 · load-bearing: no
- support: S-r1-cases-06/P2 · rung 1 · fit direct · upstream self
- support: S-r1-cases-04/P4 · rung 1 · fit direct · upstream self
- scope: Syncthing v2, Feb 2026, the contributor's own analysis
- confidence: medium · flags: none
- conflicts: none

### C-r1-cases-04
- claim: The Syncthing contributor found that Syncthing ran its own checkpointer without disabling SQLite's automatic checkpoint, so commits by readers could start PASSIVE auto-checkpoints that made the application's manual checkpoints fail at once.
- kind: interpretation
- questions: Q35 · load-bearing: no
- support: S-r1-cases-06/P5 · rung 1 · fit direct · upstream self
- support: S-r1-cases-06/P6 · rung 1 · fit direct · upstream self
- support: S-r1-cases-04/P1 · rung 1 · fit direct · upstream self
- scope: Syncthing v2, Feb 2026. This is the contributor's reading of SQLite's behaviour, not SQLite's docs; the mechanism belongs to found-ckpt.
- confidence: medium · flags: none
- conflicts: none

### C-r1-cases-05
- claim: As a remedy for checkpoint starvation, the Syncthing contributor proposed replacing the timer-based checkpointer with a check that runs whenever a connection is released back to the pool.
- kind: fact
- questions: Q35 · load-bearing: no
- support: S-r1-cases-04/P2 · rung 1 · fit direct · upstream self
- scope: a proposal in a forum post of 2026-02-06. Its adoption was not confirmed.
- confidence: high (that it was proposed) · flags: none
- conflicts: none

### C-r1-cases-06
- claim: Another Syncthing user reported that deleting a folder of about one million files grew a 4 GB database to about 4 GB plus a 12 GB WAL.
- kind: number
- questions: Q35 · load-bearing: no
- support: S-r1-cases-13/P5 · rung 1 (first-hand, attributed) · fit direct · upstream self
- scope: one user's report, January 2026, Syncthing v2. The numbers are approximate.
- confidence: low · flags: single unverified report
- conflicts: none

### C-r1-cases-07
- claim: In a 2021 SQLite forum thread, a user reported a WAL file of about 100 GB that kept growing in a logging system using many prepared statements, and Richard Hipp replied that prepared statements never reset with sqlite3_reset() can leave transactions open that prevent the checkpoint from resetting the WAL file.
- kind: fact
- questions: Q35 · load-bearing: no
- support: S-r1-cases-14/P1 · rung 1 (first-hand report, attributed) · fit direct · upstream self
- support: S-r1-cases-14/P2 · rung 1 · fit direct · upstream self
- support: S-r1-cases-14/P3 · rung 1 (SQLite's author on SQLite) · fit direct · upstream self
- support: S-r1-cases-14/P4 · rung 1 · fit partial (the user only says they will check; no resolution posted) · upstream self
- scope: April 2021. The cause was a diagnosis offered, not confirmed by the reporter in the thread.
- confidence: medium · flags: none
- conflicts: none
- note: in the same thread Keith Medcalf added that with multiple threads or processes there may never be a moment when an auto-checkpoint runs with no transaction in progress, so the WAL can grow forever (S-r1-cases-14/P5). This is a forum explanation, and practice-ops/found-ckpt own the mechanism.

### C-r1-cases-08
- claim: On Rails main as fetched on 2026-10-23, the SQLite3 adapter's DEFAULT_PRAGMAS set journal_mode to WAL, synchronous to NORMAL, foreign_keys on, mmap_size to 134217728 bytes (128 MB), journal_size_limit to 67108864 bytes (64 MB) and cache_size to 2000.
- kind: behaviour
- questions: Q36 · load-bearing: no
- support: S-r1-cases-05/P1 · rung 1 · fit direct · upstream self
- support: S-r1-cases-05/P2 · rung 1 · fit direct · upstream self
- support: S-r1-cases-05/P3 · rung 1 · fit direct · upstream self
- scope: Rails main at 2026-10-23 (file last changed by 8c8af7f, 2026-10-20). These defaults date from Rails 7.1 (see C-r1-cases-10).
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-09
- claim: In Rails' SQLite3 adapter on main, a `pragmas` hash in the database config is merged over DEFAULT_PRAGMAS when a connection is configured, and a `timeout` value sets the connection's busy_handler_timeout.
- kind: behaviour
- questions: Q36 · load-bearing: no
- support: S-r1-cases-05/P4 · rung 1 · fit direct · upstream self
- support: S-r1-cases-05/P5 · rung 1 · fit direct · upstream self
- scope: Rails main at 2026-10-23, `configure_connection`
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-10
- claim: Rails' WAL and synchronous=NORMAL SQLite defaults were introduced by pull request #49349, "Performance tune the SQLite3 adapter connection configuration" by fractaledmind, merged into Rails main on 24 September 2023.
- kind: date
- questions: Q36 · load-bearing: no
- support: S-r1-cases-12/P1 · rung 1 · fit direct · upstream self
- scope: Rails main, Sept 2023 (released in Rails 7.1; the release mapping is not separately verified here)
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-11
- claim: Rails PR #49349 justified WAL as the recommended journal mode for web applications by quoting the SQLite docs' statement that readers do not block writers and a writer does not block readers.
- kind: fact
- questions: Q36 · load-bearing: no
- support: S-r1-cases-12/P3 · rung 1 · fit direct · upstream SQLite docs (wal.html)
- support: S-r1-cases-12/P4 · rung 1 · fit direct · upstream SQLite docs (wal.html)
- scope: the PR author's rationale, Sept 2023
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-12
- claim: Rails PR #49349 justified synchronous=NORMAL as trading some durability for speed, stating that with it any data loss could happen only on an OS or filesystem failure and not on a process crash.
- kind: fact
- questions: Q36 · load-bearing: no
- support: S-r1-cases-12/P5 · rung 1 (attributed form only) · fit direct · upstream self
- scope: the PR author's rationale, Sept 2023. The same paragraph says NORMAL "syncs every wal_autocheckpoint pages", which is the author's own gloss (see flags).
- confidence: high (as an attributed rationale) · flags: superlative ("honestly an extreme edge-case")
- conflicts: none

### C-r1-cases-13
- claim: Rails PR #49349 justified setting journal_size_limit by noting that SQLite's default of -1 places no limit on the on-disk journal file, which the author wanted capped so that it could not fill the disk.
- kind: fact
- questions: Q36 · load-bearing: no
- support: S-r1-cases-12/P6 · rung 1 · fit direct · upstream self
- support: S-r1-cases-12/P7 · rung 1 · fit direct · upstream self
- scope: the PR author's rationale, Sept 2023
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-14
- claim: Rails PR #49349 claimed that WAL with NORMAL syncing and the other tuned pragmas would perform "on average, 2× better" for Rails applications.
- kind: number
- questions: Q36 · load-bearing: no
- support: S-r1-cases-12/P2 · rung 1 (attributed form only) · fit direct · upstream self
- scope: the author's claim. No benchmark is reproduced in the PR text read.
- confidence: low (as a fact about performance) / high (that it was claimed) · flags: superlative, exceptional (unverified number)
- conflicts: none

### C-r1-cases-15
- claim: In February 2024, on Django PR #14824, Django Fellow felixxm declined a suggestion to set or recommend Rails-style SQLite defaults (including WAL) for web apps, replying that Django would set more options automatically if it decided it needed them, as it already did for foreign_keys and legacy_alter_table.
- kind: fact
- questions: Q36 · load-bearing: no
- support: S-r1-cases-08/P1 · rung 1 · fit direct · upstream self
- support: S-r1-cases-08/P2 · rung 1 · fit direct · upstream self
- support: S-r1-cases-08/P3 · rung 1 · fit direct · upstream self
- support: S-r1-cases-08/P4 · rung 1 · fit direct · upstream self
- scope: 2024-02-15. A later change of policy was not searched.
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-16
- claim: Django's documentation (development version, accessed 2026-10-23) has users set SQLite PRAGMAs through the `init_command` option, and its example sets synchronous=3 (EXTRA) and cache_size=2000 rather than enabling WAL.
- kind: fact
- questions: Q36 · load-bearing: no
- support: S-r1-cases-09/P1 · rung 1 · fit direct · upstream self
- support: S-r1-cases-09/P2 · rung 1 · fit direct · upstream self
- scope: Django dev docs, 2026-10-23. A grep of the page for "WAL" found no mention.
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-17
- claim: Django's documentation says the default SQLite transaction mode is DEFERRED, recommends `"transaction_mode": "IMMEDIATE"` so that transactions wait until the timeout before raising "database is locked", and says raising the timeout alone will not really solve those errors.
- kind: fact
- questions: Q36 · load-bearing: no
- support: S-r1-cases-09/P3 · rung 1 · fit direct · upstream self
- support: S-r1-cases-09/P4 · rung 1 · fit direct · upstream self
- support: S-r1-cases-09/P5 · rung 1 · fit direct · upstream self
- scope: Django dev docs, 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-18
- claim: Litestream's documentation recommends PRAGMA synchronous=NORMAL for WAL databases and states that in this mode fsync() is called only when the WAL becomes full and has to checkpoint.
- kind: fact
- questions: Q36, Q37 · load-bearing: no
- support: S-r1-cases-02/P3 · rung 1 (attributed form) · fit direct · upstream self
- support: S-r1-cases-02/P4 · rung 1 (attributed form) · fit direct · upstream self
- scope: Litestream docs v0.5.x, undated
- confidence: high (as Litestream's statement) · flags: vendor-about-itself. The fsync description is Litestream's simplification and should be checked against pragma.html (owned by practice-config/criticism).
- conflicts: none

### C-r1-cases-19
- claim: Litestream's documentation says Litestream takes over SQLite checkpointing by holding a long-running read transaction that prevents other processes from checkpointing and restarting the WAL, while it copies new WAL pages and calls checkpoints itself.
- kind: behaviour
- questions: Q37 · load-bearing: no
- support: S-r1-cases-01/P1 · rung 1 · fit direct · upstream self
- support: S-r1-cases-01/P2 · rung 1 · fit direct · upstream self
- support: S-r1-cases-02/P5 · rung 1 · fit direct · upstream self
- scope: Litestream v0.5.x docs
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-cases-20
- claim: Litestream's documentation says that under high load with many small write transactions (e.g. tens of thousands per second), the application's own SQLite checkpoint can run between Litestream's checkpoints and make Litestream miss a WAL update, after which Litestream takes a full snapshot; it therefore recommends running the application with wal_autocheckpoint disabled, while noting that v0.5.0+ reduces the need for full snapshots.
- kind: behaviour
- questions: Q37 · load-bearing: no
- support: S-r1-cases-02/P6 · rung 1 · fit direct · upstream self
- support: S-r1-cases-02/P7 · rung 1 · fit direct · upstream self
- support: S-r1-cases-02/P8 · rung 1 · fit direct · upstream self
- scope: Litestream v0.5.x docs
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-cases-21
- claim: Litestream's documentation says Litestream needs periodic short write locks on the database during checkpoints and recommends that the application set busy_timeout to 5 seconds so that its writes do not fail with an error meanwhile.
- kind: behaviour
- questions: Q37, Q36 · load-bearing: no
- support: S-r1-cases-02/P1 · rung 1 · fit direct · upstream self
- support: S-r1-cases-02/P2 · rung 1 · fit direct · upstream self
- scope: Litestream v0.5.x docs
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-cases-22
- claim: Litestream v0.5.x's documented default checkpoint thresholds are a PASSIVE checkpoint when the WAL exceeds 1,000 pages (~4 MB), a PASSIVE checkpoint after 1 minute, and an emergency TRUNCATE checkpoint when the WAL exceeds 121,359 pages (~500 MB).
- kind: number
- questions: Q37 · load-bearing: no
- support: S-r1-cases-03/P1 · rung 1 · fit direct · upstream self
- support: S-r1-cases-03/P2 · rung 1 · fit direct · upstream self
- support: S-r1-cases-03/P3 · rung 1 · fit direct · upstream self
- scope: Litestream v0.5.x docs. The MB figures assume 4 KiB pages.
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-23
- claim: Litestream's documentation says that since v0.5.15 crossing the truncate threshold first triggers a PASSIVE checkpoint, and a blocking TRUNCATE is forced only when that fails to bring the WAL below the threshold (for example because a long-lived reader keeps the WAL open). A forced TRUNCATE waits for all readers and writers and takes a full snapshot while holding the write lock, which can stall writers on a large database.
- kind: behaviour
- questions: Q37 · load-bearing: no
- support: S-r1-cases-03/P4 · rung 1 · fit direct · upstream self
- support: S-r1-cases-03/P5 · rung 1 · fit direct · upstream self
- support: S-r1-cases-03/P9 · rung 1 · fit direct · upstream self
- scope: Litestream v0.5.15 and later
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-cases-24
- claim: Litestream's documentation says that disabling its blocking TRUNCATE checkpoint (truncate-page-n: 0) means writes are never blocked, but the WAL can then grow without bound if read transactions prevent checkpointing.
- kind: behaviour
- questions: Q37, Q35 · load-bearing: no
- support: S-r1-cases-03/P6 · rung 1 · fit direct · upstream self
- support: S-r1-cases-03/P7 · rung 1 · fit direct · upstream self
- scope: Litestream v0.5.x docs
- confidence: high · flags: vendor-about-itself
- conflicts: none
- note: the same guide says its PASSIVE checkpoints "return SQLITE_BUSY if readers or writers are active" (S-r1-cases-03/P8). That is Litestream's description, and it may be imprecise next to SQLite's documented PASSIVE semantics, so a verifier should compare it with pragma.html/c3ref (owned by found-ckpt).

## Conflicts
- none between the sources read. Two descriptions of synchronous=NORMAL differ in wording: S-r1-cases-12/P5 (the Rails PR: loss only on OS/filesystem failure; the paragraph also says it syncs every wal_autocheckpoint pages) and S-r1-cases-02/P4 (Litestream: fsync only when the WAL is full and must checkpoint). Neither is SQLite's own wording. They are not settled here and belong to practice-config/criticism.

## Speculation and flags
- C-r1-cases-01: exceptional. The WAL (~190 GB) is about 3.6× the database (~52.6 GB), from a single user's report.
- C-r1-cases-14: superlative/unverified number, "on average, 2× better".
- C-r1-cases-12: "honestly an extreme edge-case". The PR also says NORMAL "syncs every wal_autocheckpoint pages", a contributor's gloss to check against pragma.html.
- C-r1-cases-18: vendor-about-itself. Litestream says fsync() is "only called when the WAL becomes full and has to checkpoint", a simplification to check.
- C-r1-cases-24 note: Litestream says PASSIVE "returns SQLITE_BUSY if readers or writers are active"; to check against SQLite's checkpoint docs.
- S-r1-cases-04/S-r1-cases-06: the Syncthing diagnosis is ongoing (the issue is open), so treat it as a hypothesis from a project contributor.

## Unused leads
- https://raw.githubusercontent.com/laravel/laravel/12.x/config/database.php — fetched, not converted (cap). It shows the sqlite connection with 'busy_timeout' => null, 'journal_mode' => null, 'synchronous' => null, 'transaction_mode' => 'DEFERRED', i.e. Laravel exposes the keys but chooses no WAL default. Re-fetch to cite.
- https://raw.githubusercontent.com/rails/rails/7-1-stable/activerecord/CHANGELOG.md — has the line "Remove -shm and -wal SQLite files when `rails db:drop` is run."; not converted.
- https://github.com/rails/rails/pull/50460 — "Allow overriding SQLite defaults from `database.yml`", the origin of the `pragmas` key.
- https://bigbinary.com/blog/rails-7-1-comes-with-an-optimized-default-sqlite3-adapter-connection-configuration — secondary write-up of the Rails 7.1 defaults (rung 3/2 pointer).
- https://sqlite.org/forum/forumpost/7d292adea1?t=c — another "Growing WAL-File" thread (2022, an unreset SELECT keeping the WAL growing).
- https://github.com/benbjohnson/litestream/issues/1332 — referenced by the Litestream docs for a TRUNCATE snapshot stalling writers on a large database; possibly an incident with numbers.

## Queries
- "SQLite -wal file grew gigabytes checkpoint never completes postmortem" → useful
- "Litestream how it works WAL checkpoint read transaction" → useful
- "Rails 8 SQLite production defaults journal_mode WAL synchronous NORMAL" → useful (pointers only)
- "rails pull request sqlite3 adapter default pragmas WAL synchronous normal journal_size_limit fractaledmind" → useful (found Django PR #14824)
- "github rails/rails pull DEFAULT_PRAGMAS sqlite3 adapter production-ready configuration" → nothing new
- GitHub API search "repo:rails/rails is:pr is:merged sqlite journal_mode wal" → useful (PR #49349, #50460)
- "sqlite forum WAL file 100GB sqlite3_reset checkpoint Hipp" → useful

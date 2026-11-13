# Findings: 20261023-1245-sqlite-wal · round 1 · angle criticism
- researcher: claude-opus-5-5 · status: partial (hard cap of 40 tool calls exceeded, about 60 used; Q33's independent-critic half thin) · tool calls: 60

## Questions
- Q6: answered — claims: C-r1-criticism-01, C-r1-criticism-02, C-r1-criticism-03, C-r1-criticism-04, C-r1-criticism-05, C-r1-criticism-06, C-r1-criticism-07, C-r1-criticism-08, C-r1-criticism-09, C-r1-criticism-10 — note: wal.html §1 has an explicit "disadvantages" list; every item is rung 1, descriptive.
- Q32: answered — claims: C-r1-criticism-11, C-r1-criticism-12, C-r1-criticism-13, C-r1-criticism-14, C-r1-criticism-15, C-r1-criticism-16, C-r1-criticism-17, C-r1-criticism-18, C-r1-criticism-19, C-r1-criticism-20, C-r1-criticism-21, C-r1-criticism-35 — note: sqlite.org gives versions, conditions, mechanism, backports and likelihood; Tailscale and Antithesis add context. How likely it is, is in tension (C-r1-criticism-17 vs C-r1-criticism-35). Phil Eaton's reproducer article was not readable (403; the archived copy came back gzipped and WebFetch can't reach web.archive.org).
- Q33: thin — claims: C-r1-criticism-01, C-r1-criticism-05, C-r1-criticism-07, C-r1-criticism-10, C-r1-criticism-21, C-r1-criticism-22, C-r1-criticism-34 — note: the documentation's cases are well supported at rung 1. No independent rung-2 critic on when not to use WAL was found in 2 queries.
- Q34: contested — claims: C-r1-criticism-23, C-r1-criticism-24, C-r1-criticism-25, C-r1-criticism-26, C-r1-criticism-27, C-r1-criticism-28, C-r1-criticism-29, C-r1-criticism-30, C-r1-criticism-31, C-r1-criticism-32, C-r1-criticism-33 — note: no source opened here says NORMAL+WAL corrupts. The critics fault (a) the loss of durability on power loss or OS crash, (b) unclear documentation, and (c) which default actually applies in WAL mode. The critics are rung-3 blogs, so they can be used only in attributed form.

## Sources

### S-r1-criticism-01
- url: https://www.sqlite.org/wal.html · canonical: www.sqlite.org/wal.html
- title: Write-Ahead Logging · authors: n/a · publisher: SQLite project (sqlite.org)
- date: n/a; updated 2026-08-25 ("This page was last updated on 2026-08-25 19:42:39Z") · version: current docs as of 2026-10-23 (latest release mentioned 3.51.3)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project (Hipp, Wyrick & Company) · upstream: none
- lateral: Official documentation of the SQLite developers; the trusted source named in the dispatch.
- passages:
  - P1 · § "1. Overview": "All processes using a database must be on the same host computer; WAL does not work over a network filesystem."
  - P2 · § "1. Overview": "Transactions that involve changes against multiple ATTACHed databases are atomic for each individual database, but are not atomic across all databases as a set."
  - P3 · § "1. Overview": "It is not possible to change the page_size after entering WAL mode, either on an empty database or by using VACUUM or by restoring from a backup using the backup API."
  - P4 · § "1. Overview": "WAL might be very slightly slower (perhaps 1% or 2% slower) than the traditional rollback-journal approach in applications that do mostly reads and seldom write."
  - P5 · § "1. Overview": "There is an additional quasi-persistent … file and … shared memory file associated with each database, which can make SQLite less appealing for use as an application file-format."
  - P6 · § "1. Overview": "There is the extra operation of checkpointing which, though automatic by default, is still something that application developers need to be mindful of."
  - P7 · § "1. Overview": "For transactions larger than about 100 megabytes, traditional rollback journal modes will likely be faster. For transactions in excess of a gigabyte, WAL mode may fail with an I/O or disk-full error."
  - P8 · § "1. Overview": "Beginning with version 3.11.0 (2016-02-15), WAL mode works as efficiently with large transactions as does rollback mode."
  - P9 · § "2.3. Performance Considerations": "On the other hand, read performance deteriorates as the WAL file grows in size since each reader must check the WAL file for the content and the time needed to check the WAL file is proportional to the size of the WAL file."
  - P10 · § "1. Overview": "Beginning with version 3.22.0 (2018-01-22), a read-only WAL-mode database file can be opened if the -shm and -wal files already exist or those files can be created or the database is immutable."
  - P11 · § "5. Read-Only Databases": "it is good practice to convert the database to PRAGMA journal_mode=DELETE prior to burning an SQLite database image onto read-only media."
  - P12 · § "2.2. Concurrency": "However, since there is only one WAL file, there can only be one writer at a time."
  - P13 · § "2.3. Performance Considerations": "The downside to this configuration is that transactions are no longer durable and might rollback following a power failure or hard reset."
  - P14 · § "11. The WAL-Reset Bug": "On 2026-03-03, one of the SQLite developers (Dan) found and fixed a bug that could, in rare cases, lead to database corruption."
  - P15 · § "11. The WAL-Reset Bug": "The bug is likely present in all version of SQLite from 3.7.0 (2010-07-21) through 3.51.2 (2026-01-09). It is fixed in version 3.51.3 (2026-03-13) and later. Backports of the fix are available for some earlier releases: 3.44.6 and 3.50.7."
  - P16 · § "11. The WAL-Reset Bug": "The bug only affects databases in WAL mode when there are two or more database connections open on the same file, in separate threads or processes, and when those two connections attempt to write or checkpoint at the same instant."
  - P17 · § "11. The WAL-Reset Bug": "The bug is a data race with tight timing constraints and that requires an unusual usage pattern. It is unlikely to occur in common use."
  - P18 · § "11.1. Bug Details": "While the second checkpoint from step 2 is starting up, another database connection commits a transaction that resets the WAL file and writes new content into the beginning of the WAL file."
  - P19 · § "11.1. Bug Details": "Due to a data race, the second checkpoint from step 2 does not realize that the WAL file has been reset by the transaction commit in step 3. The second checkpoint leaves a field in the header of the WAL-Index set incorrectly."
  - P20 · § "11.1. Bug Details": "Later when a third checkpoint occurs, the third checkpoint skips all or part of the transaction that was written in step 3. Thus parts of the transaction from step 3 never reach the database file, and the database file goes corrupt."
  - P21 · § "11.2. Low Probability Of Occurrence": "Based on available telemetry, the occurrence rate of this problem in the wild appears to be less than or equal to the expected occurrence rate of SSD malfunctions and/or cosmic-ray hits."
  - P22 · § "11.2. Low Probability Of Occurrence": "This bug, though rare, does have serious consequences, and so application developers should upgrade to a version of SQLite that fixes the problem. However, this is not an emergency."
  - P23 · § "11.2. Low Probability Of Occurrence": "UPDATE: 2026-08-24 … Phil Eaton has devised a reproducer that does not involve using the special testing code hack."
  - P24 · § "11.1. Bug Details": "One connection does a checkpoint. This first checkpoint must be complete."
  - P25 · § "4. The WAL File": "If a database file is separated from its WAL file, then transactions that were previously committed to the database might be lost, or the database file might become corrupted."

### S-r1-criticism-02
- url: https://www.sqlite.org/pragma.html · canonical: www.sqlite.org/pragma.html
- title: Pragma statements supported by SQLite · authors: n/a · publisher: SQLite project
- date: n/a · version: current docs as of 2026-10-23
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: Official documentation; trusted source.
- passages:
  - P1 · § "List Of PRAGMAs" (PRAGMA synchronous, NORMAL (1)): "WAL mode is safe from corruption with synchronous=NORMAL, and probably DELETE mode is safe too on modern filesystems. WAL mode is always consistent with synchronous=NORMAL, but WAL mode does lose durability. A transaction committed in WAL mode with synchronous=NORMAL might roll back following a power loss or system crash."
  - P2 · § "List Of PRAGMAs" (PRAGMA synchronous, NORMAL (1)): "Transactions are durable across application crashes regardless of the synchronous setting or journal mode."
  - P3 · § "List Of PRAGMAs" (PRAGMA synchronous): "The synchronous=NORMAL setting provides the best balance between performance and safety for most applications running in WAL mode. You lose durability across power lose with synchronous NORMAL in WAL mode, but that is not important for most applications."
  - P4 · § "List Of PRAGMAs" (PRAGMA synchronous, FULL (2)): "FULL is atomic, consistent, isolated, and durable (ACID) in WAL mode"
  - P5 · § "List Of PRAGMAs" (PRAGMA synchronous): "If durability is not a concern, then synchronous=NORMAL is normally all one needs in WAL mode."

### S-r1-criticism-03
- url: https://www.agwa.name/blog/post/sqlite_durability · canonical: www.agwa.name/blog/post/sqlite_durability
- title: SQLite's Durability Settings are a Mess · authors: Andrew Ayer · publisher: agwa.name (personal blog)
- date: 2025-08-29 · version: n/a (discusses docs as of Aug 2025)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: blog · peer-review: no
- owner: Andrew Ayer (personal) · upstream: sqlite.org pragma.html and compile.html; Hipp's HN comment (S-r1-criticism-08)
- lateral: Not searched in this run (cap). From the page: a personal blog with no stake in SQLite. The author says he confirmed the DELETE/EXTRA point by testing (see his HN comment). Rung 3: attributed use only.
- passages:
  - P1 · § "SQLite's Durability Settings are a Mess": "Unfortunately, SQLite's documentation about its durability properties is far from clear. I cannot tell whether SQLite is durable by default, and if not, what are the minimal settings you need to use to ensure durability."
  - P2 · § "SQLite's Durability Settings are a Mess": "If you change journal_mode to WAL, then SQLite is durable, because synchronous=FULL provides durability in WAL mode."
  - P3 · § "SQLite's Durability Settings are a Mess": "Hipp also says that WAL mode used to be durable by default, but it was changed after people complained about poor performance."
  - P4 · § "SQLite's Durability Settings are a Mess": "For example, the most popular Go driver for SQLite sets it to NORMAL when in WAL mode, which does not provide durability."
  - P5 · § "SQLite's Durability Settings are a Mess": "My takeaway is that if you need durability, you'd better set the synchronous option explicitly because who knows what the default is, or what it will be in the future. With WAL mode, FULL seems to suffice."
  - P6 · § "SQLite's Durability Settings are a Mess": "By the way, there are definitely many applications for which losing a few seconds of data in exchange for better performance is a great tradeoff"

### S-r1-criticism-04
- url: https://avi.im/blag/2025/sqlite-fsync/ · canonical: avi.im/blag/2025/sqlite-fsync/
- title: SQLite commits are not durable under default settings · authors: (avi.im; Avinash Sajjanshetty, per site; not confirmed on page) · publisher: avi.im (personal blog)
- date: 2025-08-24 (amended after HN discussion) · version: tested SQLite 3.50.4 (Linux) and 3.43.2 (macOS-shipped)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: blog · peer-review: no
- owner: personal blog · upstream: sqlite.org pragma.html, compile.html; Hipp's HN comment
- lateral: Not searched in this run. The author is believed (not verified here) to work on a SQLite-compatible database, which would be a possible stake. The post was amended after the HN discussion and now says its original WAL claim was "half wrong". Rung 3: attributed use only.
- passages:
  - P1 · § "SQLite with WAL": "However, NORMAL seems misnamed, as it doesn't seem normal to me:"
  - P2 · § "SQLite with WAL": "So, if you're using WAL, stick with FULL. If durability isn't a concern, then NORMAL may be preferred for higher performance."
  - P3 · § "SQLite on macOS": "That is, the default is NORMAL. So, commits are not durable."
  - P4 · § "Compile Time Options": "So it's totally possible that your distribution might be shipping SQLite with default synchronous as NORMAL."
  - P5 · § "SQLite commits are not durable under default settings": "Previously, I claimed that transactions in SQLite with WAL are not durable under default settings. Turns out, I was only half wrong but technically correct; the issue is actually with SQLite in rollback journal mode (the default)."

### S-r1-criticism-06
- url: https://www.sqlite.org/releaselog/3_51_3.html · canonical: www.sqlite.org/releaselog/3_51_3.html
- title: SQLite Release 3.51.3 On 2026-03-13 · authors: n/a · publisher: SQLite project
- date: 2026-03-13 · version: 3.51.3
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (release notes) · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: Official release log.
- passages:
  - P1 · § "SQLite Release 3.51.3 On 2026-03-13": "Changes in this specific patch release, version 3.51.3 (2026-03-13):"
  - P2 · § "SQLite Release 3.51.3 On 2026-03-13": "Fix the WAL-reset database corruption bug."

### S-r1-criticism-07
- url: https://tailscale.com/blog/sqlite-wal-reset-bug · canonical: tailscale.com/blog/sqlite-wal-reset-bug
- title: How Tailscale helped find the SQLite WAL-Reset bug · authors: not captured · publisher: Tailscale
- date: 2026-08-12 per search listing (not confirmed on page) · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: vendor engineering post · peer-review: no
- owner: Tailscale Inc. · upstream: its own incident; reports the SQLite developers' explanations second-hand
- lateral: Tailscale is the affected party and is writing about its own system. It is rung 1 for its own configuration and experience, and second-hand for what the SQLite developers told it. The incident narrative belongs to the `cases` angle; it is used here only for the bug's trigger conditions and the release history.
- passages:
  - P1 · § "The WAL-Reset bug": "They also explained why we were more likely to hit the bug than other SQLite users: we take manual control of the checkpointing process, and we checkpoint very aggressively."
  - P2 · § "Fixed, with a false alarm": "Because this change caused false corruption warnings, the SQLite developers withdrew the 3.52.0 release and instead published 3.51.3, which only contained a fix for the WAL-Reset bug."
  - P3 · § "The WAL-Reset bug": "The SQLite developers released the fix as SQLite 3.52.0, and we prepared to deploy it as soon as it was available."
  - P4 · § "The WAL-Reset bug": "Their fix adds an additional check to the checkpointing function which detects when the WAL has been reset by another thread."
  - P5 · § "Off the well-trodden path": "Most people use SQLite in a standard configuration and never face this sort of issue."
  - P6 · § "The writing on the WAL": "In our control plane, we take manual control of the checkpoint process so we can run fast and consistent backups."

### S-r1-criticism-08
- url: https://news.ycombinator.com/item?id=45014296 · canonical: news.ycombinator.com/item?id=45014296
- title: (comment by user "SQLite" on "SQLite (with WAL) doesn't do `fsync` on each commit…") · authors: HN user "SQLite" · publisher: Hacker News
- date: 2025-08-25 · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: forum · peer-review: no
- owner: Y Combinator (venue); the comment is by the account "SQLite" · upstream: none
- lateral: Found via the hn.algolia.com API (author_SQLite). Ayer (S-r1-criticism-03) says the account "credibly claims to be Richard Hipp"; identity was not independently confirmed in this run. If it is Hipp, this is rung 1 for the SQLite project's stated rationale, in attributed form only. Otherwise it is rung 3.
- passages:
  - P1 · comment by SQLite, 2025-08-25: "Not true. In its default configuration, SQLite is durable."
  - P2 · comment by SQLite, 2025-08-25: "If you switch to WAL mode, the default behavior is that transactions are durable across application crashes (or SIGKILL or similar) but are not necessarily durable across OS crashes or power failures."
  - P3 · comment by SQLite, 2025-08-25: "You'll never get a corrupt database, even on a power loss or similar. You might lose a transaction that happened within the past second or so."
  - P4 · comment by SQLite, 2025-08-25: "When WAL mode was originally introduced, it was guaranteed durable by default, just like DELETE mode. But people complained that they would rather have increased performance and didn't really care if a recent transaction rolled back after a power-loss, just as long as the database didn't go corrupt. So we changed the default."
  - P5 · reply by charleslmunger, 2025-08-25: "How is this behavior reconciled with the documentation cited in my comment above? Are the docs just out of date?"

### S-r1-criticism-09
- url: https://www.sqlite.org/compile.html · canonical: www.sqlite.org/compile.html
- title: Compile-time Options · authors: n/a · publisher: SQLite project
- date: n/a · version: current docs as of 2026-10-23
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: Official documentation.
- passages:
  - P1 · § "2. Recommended Compile-time Options": "SQLITE_DEFAULT_WAL_SYNCHRONOUS=1. For maximum database safety following a power loss, the setting of PRAGMA synchronous=FULL is recommended. However, in WAL mode, complete database integrity is guaranteed with PRAGMA synchronous=NORMAL."
  - P2 · § "2. Recommended Compile-time Options": "For these reasons, it is recommended that the synchronous setting be changed from FULL to NORMAL when switching to WAL mode. This compile-time option will accomplish that."
  - P3 · § "4. Options To Set Default Parameter Values": "If the SQLITE_DEFAULT_WAL_SYNCHRONOUS value is not overridden at compile-time, then it will always be the same as SQLITE_DEFAULT_SYNCHRONOUS and so no automatic synchronous setting changes will ever occur."

### S-r1-criticism-10
- url: https://www.sqlite.org/howtocorrupt.html · canonical: www.sqlite.org/howtocorrupt.html
- title: How To Corrupt An SQLite Database File · authors: n/a · publisher: SQLite project
- date: n/a · version: current docs as of 2026-10-23
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: Official documentation.
- passages:
  - P1 · § "8.1. Race condition when writing to a WAL-mode database.": "This is the WAL-reset bug. It existed in all versions of SQLite from 3.7.0 through 3.51.2."
  - P2 · § "3.1. Disk drives that do not honor sync requests": "In WAL mode, the only time that a failed sync operation can cause database corruption is during a checkpoint operation. A sync failure during a COMMIT might result in loss of durability but not in a corrupt database file."
  - P3 · § "8.4. Corruption following switches between rollback and WAL modes": "Repeatedly switching an SQLite database in and out of WAL mode and running the VACUUM command in between switches, in one process or thread, can cause another process or thread that has the database file open to miss the fact that the database has changed."

### S-r1-criticism-11
- url: https://antithesis.com/blog/2026/wal-reset-bug/ · canonical: antithesis.com/blog/2026/wal-reset-bug/
- title: Breaking the WAL · authors: Carl Sverre · publisher: Antithesis
- date: 2026-08-12 · version: tested SQLite 3.51.2 and 3.51.3
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: vendor engineering post · peer-review: no
- owner: Antithesis Operations LLC (sells the testing platform it describes) · upstream: its own test run; quotes an earlier wording of sqlite.org wal.html
- lateral: Antithesis is a commercial testing vendor, and the post promotes its product ("If you have a gnarly database issue, call me"). It is rung 1 only for what its run did; it is not independent on how effective its tool is.
- passages:
  - P1 · § "Breaking the WAL": "Notably, this is a completely generic workload. It just runs writes and checkpoints concurrently"
  - P2 · § "Breaking the WAL": "On my first run, Antithesis caught the bug in 15 mins."
  - P3 · § "Breaking the WAL": "Then I repeated the exercise with 3.51.3, with the same workload and Antithesis instrumentation. Sure enough, the run came back green."

## Claims

### C-r1-criticism-01
- claim: The SQLite WAL documentation lists as a disadvantage that all processes using a WAL-mode database must be on the same host computer, and that WAL does not work over a network filesystem.
- kind: fact
- questions: Q6, Q33 · load-bearing: yes (first limit the reader must check before turning WAL on)
- support: S-r1-criticism-01/P1 · rung 1 · fit direct · upstream self
- scope: current wal.html (updated 2026-08-25); the mechanism belongs to found-shm
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-02
- claim: According to the SQLite WAL documentation, in WAL mode a transaction that changes several ATTACHed databases is atomic for each individual database but not atomic across the databases as a set.
- kind: behaviour
- questions: Q6 · load-bearing: yes (a listed limit that changes correctness guarantees)
- support: S-r1-criticism-01/P2 · rung 1 · fit direct · upstream self
- scope: WAL mode; current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-03
- claim: According to the SQLite WAL documentation, page_size cannot be changed after a database enters WAL mode, whether on an empty database, by VACUUM, or by restoring through the backup API.
- kind: behaviour
- questions: Q6 · load-bearing: no (minor operational limit)
- support: S-r1-criticism-01/P3 · rung 1 · fit direct · upstream self
- scope: WAL mode; current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-04
- claim: The SQLite WAL documentation says WAL might be very slightly slower (perhaps 1% or 2%) than the rollback journal for applications that mostly read and seldom write.
- kind: comparison
- questions: Q6 · load-bearing: no (small, hedged by the source with "might" and "perhaps")
- support: S-r1-criticism-01/P4 · rung 1 · fit direct · upstream self
- scope: read-mostly applications; the docs' own estimate, no benchmark given
- confidence: medium · flags: none
- conflicts: none

### C-r1-criticism-05
- claim: The SQLite WAL documentation lists the extra quasi-persistent -wal and -shm files as a disadvantage that can make SQLite less appealing as an application file format.
- kind: fact
- questions: Q6, Q33 · load-bearing: yes (a "when not to use" case)
- support: S-r1-criticism-01/P5 · rung 1 · fit direct · upstream self
- scope: current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-06
- claim: The SQLite WAL documentation lists checkpointing as an extra operation that, although automatic by default, application developers still need to be mindful of.
- kind: fact
- questions: Q6 · load-bearing: no (framing for the checkpoint chapters)
- support: S-r1-criticism-01/P6 · rung 1 · fit direct · upstream self
- scope: current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-07
- claim: The SQLite WAL documentation says that rollback-journal modes will likely be faster for transactions larger than about 100 megabytes, and that WAL mode may fail with an I/O or disk-full error for transactions over a gigabyte; the same passage adds that since version 3.11.0 (2016-02-15) WAL handles large transactions as efficiently as rollback mode.
- kind: comparison
- questions: Q6, Q33 · load-bearing: yes (the "very large transactions" limit, and its version qualification)
- support: S-r1-criticism-01/P7 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P8 · rung 1 · fit direct · upstream self
- scope: the 100 MB / 1 GB guidance is not dated in the docs, and the 3.11.0 sentence follows it in the same bullet; the chapter should present both as written and not reconcile them
- confidence: medium · flags: none
- conflicts: S-r1-criticism-01/P8 "Beginning with version 3.11.0 (2016-02-15), WAL mode works as efficiently with large transactions as does rollback mode." (internal tension within one source; see Conflicts)

### C-r1-criticism-08
- claim: The SQLite WAL documentation says read performance in WAL mode deteriorates as the WAL file grows, because each reader must check the WAL and the time to do so is proportional to the WAL file's size.
- kind: behaviour
- questions: Q6 · load-bearing: yes (explains why a growing -wal hurts the reader's service)
- support: S-r1-criticism-01/P9 · rung 1 · fit direct · upstream self
- scope: current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-09
- claim: The SQLite WAL documentation says that WAL allows only one writer at a time, because there is only one WAL file.
- kind: behaviour
- questions: Q6, Q33 · load-bearing: no (the write path belongs to found-rw; restated here as a limit)
- support: S-r1-criticism-01/P12 · rung 1 · fit direct · upstream self
- scope: current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-10
- claim: Since SQLite 3.22.0 (2018-01-22), a read-only WAL-mode database can be opened only if the -shm and -wal files already exist, can be created, or the database is opened as immutable; the documentation still calls it good practice to convert to journal_mode=DELETE before putting a database on read-only media.
- kind: behaviour
- questions: Q6, Q33 · load-bearing: yes (a documented "when not to use WAL" case)
- support: S-r1-criticism-01/P10 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P11 · rung 1 · fit direct · upstream self
- scope: SQLite 3.22.0 and later; older versions could not read a read-only WAL database
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-11
- claim: The SQLite documentation says the WAL-reset bug is likely present in all SQLite versions from 3.7.0 (2010-07-21) through 3.51.2 (2026-01-09) and is fixed in 3.51.3 (2026-03-13) and later.
- kind: version
- questions: Q32 · load-bearing: yes
- support: S-r1-criticism-01/P15 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-10/P1 · rung 1 · fit direct · upstream self (same owner; one source for independence)
- support: S-r1-criticism-06/P2 · rung 1 · fit direct · upstream self (the release note confirms the fix in 3.51.3)
- scope: wal.html says "likely present"; howtocorrupt.html says "existed in all versions … from 3.7.0 through 3.51.2"
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-12
- claim: The SQLite documentation says backports of the WAL-reset fix are available for releases 3.44.6 and 3.50.7.
- kind: version
- questions: Q32 · load-bearing: yes (tells a reader on an older branch what to upgrade to)
- support: S-r1-criticism-01/P15 · rung 1 · fit direct · upstream self
- scope: "some earlier releases"; the 3.44.6 and 3.50.7 release notes were not opened in this run
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-13
- claim: According to the SQLite documentation, the WAL-reset bug was found and fixed on 2026-03-03 by an SQLite developer named Dan.
- kind: date
- questions: Q32 · load-bearing: no (history)
- support: S-r1-criticism-01/P14 · rung 1 · fit direct · upstream self
- scope: as stated by sqlite.org
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-14
- claim: The SQLite documentation says the WAL-reset bug affects only WAL-mode databases with two or more connections open on the same file, in separate threads or processes, when those connections try to write or checkpoint at the same instant.
- kind: fact
- questions: Q32 · load-bearing: yes (trigger conditions; the reader's setup of several worker processes matches them)
- support: S-r1-criticism-01/P16 · rung 1 · fit direct · upstream self
- scope: SQLite 3.7.0 to 3.51.2
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-15
- claim: In the SQLite developers' account of the WAL-reset bug, a second checkpoint starts shortly after a complete checkpoint; while it starts up, another connection commits a transaction that resets the WAL and writes at its beginning; the second checkpoint misses the reset and leaves a wal-index header field saying part of the WAL is already checkpointed when it is not.
- kind: behaviour
- questions: Q32 · load-bearing: yes (the mechanism)
- support: S-r1-criticism-01/P24 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P18 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P19 · rung 1 · fit direct · upstream self
- scope: as described in wal.html §11.1
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-16
- claim: According to the SQLite documentation, after the WAL-reset race, a later checkpoint skips all or part of the transaction committed during the race, so parts of that transaction never reach the database file and the database file becomes corrupt.
- kind: behaviour
- questions: Q32 · load-bearing: yes (the consequence)
- support: S-r1-criticism-01/P20 · rung 1 · fit direct · upstream self
- scope: per wal.html §11.1, it also requires more transactions to grow the WAL past its size at the first checkpoint (step 5)
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-17
- claim: The SQLite documentation describes the WAL-reset bug as a data race with tight timing constraints that requires an unusual usage pattern and is unlikely to occur in common use.
- kind: evaluation
- questions: Q32 · load-bearing: yes (how likely the docs say it is)
- support: S-r1-criticism-01/P17 · rung 1 · fit direct · upstream self
- scope: attributed form only ("the SQLite developers say")
- confidence: high · flags: vendor-about-itself
- conflicts: S-r1-criticism-11/P1 "Notably, this is a completely generic workload. It just runs writes and checkpoints concurrently" (see Conflicts)

### C-r1-criticism-18
- claim: The SQLite documentation says that, based on available telemetry, the WAL-reset bug's occurrence rate in the wild appears to be at or below the expected rate of SSD malfunctions or cosmic-ray hits, and that upgrading is advised but is not an emergency.
- kind: evaluation
- questions: Q32 · load-bearing: yes
- support: S-r1-criticism-01/P21 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P22 · rung 1 · fit direct · upstream self
- scope: attributed form; the telemetry itself is not published on the page
- confidence: medium · flags: vendor-about-itself
- conflicts: none

### C-r1-criticism-19
- claim: The SQLite documentation (updated 2026-08-24) reports that Phil Eaton devised a reproducer for the WAL-reset bug that does not use the special testing code hack the SQLite developers had needed.
- kind: fact
- questions: Q32 · load-bearing: no (updates the "could not reproduce organically" statement)
- support: S-r1-criticism-01/P23 · rung 1 · fit direct · upstream S-r1-criticism-01 (Eaton's own article could not be read: HTTP 403, and the archived copy was unreadable)
- scope: details of the reproducer unverified in this run
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-20
- claim: Tailscale reports that the SQLite developers first shipped the WAL-reset fix in SQLite 3.52.0, then withdrew 3.52.0 after an unrelated change produced false corruption warnings, and published 3.51.3 with the WAL-reset fix instead.
- kind: fact
- questions: Q32 · load-bearing: no (release history; the chapter needs only "fixed in 3.51.3")
- support: S-r1-criticism-07/P3 · rung 1 · fit direct · upstream self (Tailscale's own experience)
- support: S-r1-criticism-07/P2 · rung 1 · fit direct · upstream self
- scope: Tailscale's account; the 3.52.0 withdrawal was not checked on sqlite.org
- confidence: medium · flags: none
- conflicts: S-r1-criticism-06/P2 lists "Fix the WAL-reset database corruption bug." followed by "Other minor bug fixes.", whereas Tailscale says 3.51.3 "only contained a fix for the WAL-Reset bug" (minor; see Conflicts)

### C-r1-criticism-21
- claim: Tailscale reports that the SQLite developers explained Tailscale was more likely than other users to hit the WAL-reset bug because Tailscale took manual control of checkpointing and checkpointed very aggressively.
- kind: fact
- questions: Q32, Q33 · load-bearing: yes (tells the reader which configuration raises exposure)
- support: S-r1-criticism-07/P1 · rung 1 · fit direct · upstream SQLite developers (second-hand through Tailscale)
- support: S-r1-criticism-07/P6 · rung 1 · fit direct · upstream self
- scope: attributed: "Tailscale reports that the SQLite developers explained…"
- confidence: medium · flags: vendor-about-itself
- conflicts: none

### C-r1-criticism-22
- claim: The SQLite how-to-corrupt page says that repeatedly switching a database in and out of WAL mode, with VACUUM between switches, can make another process or thread with the file open miss that the database changed.
- kind: behaviour
- questions: Q33 · load-bearing: no (an edge case of mode switching; whether it is fixed in current versions was not checked)
- support: S-r1-criticism-10/P3 · rung 1 · fit direct · upstream self
- scope: current docs; fix status not captured
- confidence: medium · flags: none
- conflicts: none

### C-r1-criticism-23
- claim: The SQLite how-to-corrupt page says that in WAL mode a failed sync can corrupt the database only during a checkpoint, and that a sync failure during COMMIT can cost durability but not corrupt the file.
- kind: behaviour
- questions: Q33, Q34 · load-bearing: no (supports the docs' side of the NORMAL debate)
- support: S-r1-criticism-10/P2 · rung 1 · fit direct · upstream self
- scope: current docs; in the page's section on disk drives that do not honor sync requests
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-24
- claim: The SQLite pragma documentation says WAL mode with synchronous=NORMAL is safe from corruption and always consistent but loses durability: a transaction committed in that configuration might roll back after a power loss or system crash.
- kind: behaviour
- questions: Q34 · load-bearing: yes (what NORMAL loses, by the docs)
- support: S-r1-criticism-02/P1 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P13 · rung 1 · fit direct · upstream self
- scope: WAL mode; current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-25
- claim: The SQLite pragma documentation says committed transactions survive application crashes regardless of the synchronous setting or journal mode.
- kind: behaviour
- questions: Q34 · load-bearing: yes (bounds what NORMAL can lose: power loss or OS crash, not process crash)
- support: S-r1-criticism-02/P2 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-08/P2 · rung 1 (if the account is Hipp) · fit direct · upstream self (same owner as the docs: one source)
- scope: current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-26
- claim: The SQLite documentation recommends synchronous=NORMAL as the best balance between performance and safety for most applications in WAL mode, stating that losing durability across power loss is not important for most applications.
- kind: evaluation
- questions: Q34 · load-bearing: yes (the docs' position in the dispute)
- support: S-r1-criticism-02/P3 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-09/P1 · rung 1 · fit direct · upstream self (same owner)
- support: S-r1-criticism-09/P2 · rung 1 · fit direct · upstream self (same owner)
- scope: attributed form only ("the SQLite documentation recommends")
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-criticism-27
- claim: The SQLite pragma documentation says synchronous=FULL in WAL mode is atomic, consistent, isolated and durable.
- kind: behaviour
- questions: Q34 · load-bearing: yes (the alternative critics recommend)
- support: S-r1-criticism-02/P4 · rung 1 · fit direct · upstream self
- scope: WAL mode; current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-28
- claim: The SQLite compile-time options page says that unless SQLITE_DEFAULT_WAL_SYNCHRONOUS is overridden at compile time, it equals SQLITE_DEFAULT_SYNCHRONOUS, so no automatic change of the synchronous setting happens on switching to WAL; the same page recommends building with SQLITE_DEFAULT_WAL_SYNCHRONOUS=1 (NORMAL).
- kind: behaviour
- questions: Q34 · load-bearing: yes (what the default in WAL mode is depends on the build)
- support: S-r1-criticism-09/P3 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-09/P1 · rung 1 · fit direct · upstream self
- scope: the value of SQLITE_DEFAULT_SYNCHRONOUS itself (documented as FULL per Ayer's and avi.im's quotes) was not read directly from compile.html in this run
- confidence: high · flags: none
- conflicts: S-r1-criticism-08/P2 (the "SQLite" account: the default in WAL mode is not durable across OS crashes or power failures); see Conflicts

### C-r1-criticism-29
- claim: In an August 2025 Hacker News comment, the account "SQLite" (identified by others as Richard Hipp) said that in WAL mode the default behavior is durable across application crashes but not necessarily across OS crashes or power failures, that the database will never be corrupted, and that a transaction from roughly the last second might be lost.
- kind: fact
- questions: Q34 · load-bearing: yes (the SQLite author's own statement of what NORMAL-style defaults lose)
- support: S-r1-criticism-08/P2 · rung 1 (attributed) · fit direct · upstream self
- support: S-r1-criticism-08/P3 · rung 1 (attributed) · fit direct · upstream self
- scope: attributed; account identity not independently confirmed
- confidence: medium · flags: vendor-about-itself
- conflicts: S-r1-criticism-09/P3 (see Conflicts)

### C-r1-criticism-30
- claim: In the same 2025 Hacker News comment, the "SQLite" account said WAL mode was durable by default when introduced and that the default was changed after users said they preferred performance over durability of the most recent transaction.
- kind: fact
- questions: Q34 · load-bearing: no (history of the default)
- support: S-r1-criticism-08/P4 · rung 1 (attributed) · fit direct · upstream self
- scope: attributed; the version in which the default changed is not given
- confidence: medium · flags: vendor-about-itself
- conflicts: none

### C-r1-criticism-31
- claim: Andrew Ayer (blog, 2025-08-29) criticises SQLite's durability documentation as far from clear, says he cannot tell whether SQLite is durable by default, and advises setting synchronous explicitly (FULL in WAL mode) if durability is needed; he also says losing a few seconds of data for performance is a good tradeoff for many applications.
- kind: evaluation
- questions: Q34 · load-bearing: yes (a named critic; attributed only, rung 3)
- support: S-r1-criticism-03/P1 · rung 3 · fit direct · upstream self
- support: S-r1-criticism-03/P5 · rung 3 · fit direct · upstream self
- support: S-r1-criticism-03/P6 · rung 3 · fit direct · upstream self
- scope: a blog post, so attributed only; it criticises clarity and defaults, not corruption safety
- confidence: medium · flags: none
- conflicts: none

### C-r1-criticism-32
- claim: Ayer (2025) writes that the most popular Go SQLite driver sets synchronous to NORMAL in WAL mode, and an avi.im post (2025) reports that the SQLite 3.43.2 shipped with macOS showed synchronous=1 (NORMAL) in WAL mode, so a wrapper or platform build can change the WAL default.
- kind: fact
- questions: Q34 · load-bearing: no (pointer to cases/practice-config; would need rung-1 driver source or Apple build to state in the chapter's voice)
- support: S-r1-criticism-03/P4 · rung 3 · fit direct · upstream unnamed Go driver
- support: S-r1-criticism-04/P3 · rung 3 · fit direct · upstream author's test on macOS
- support: S-r1-criticism-04/P4 · rung 3 · fit partial · upstream self
- scope: as of August 2025; rung 3 only, so below the bar until followed upstream
- confidence: low · flags: none
- conflicts: none

### C-r1-criticism-33
- claim: An avi.im post (2025) calls NORMAL "misnamed" and advises using FULL with WAL unless durability is not a concern; the post was amended to say its original claim, that WAL is not durable under default settings, was "half wrong".
- kind: evaluation
- questions: Q34 · load-bearing: no (second critic; attributed only)
- support: S-r1-criticism-04/P1 · rung 3 · fit direct · upstream self
- support: S-r1-criticism-04/P2 · rung 3 · fit direct · upstream self
- support: S-r1-criticism-04/P5 · rung 3 · fit direct · upstream self
- scope: blog, attributed only
- confidence: medium · flags: none
- conflicts: none

### C-r1-criticism-34
- claim: The SQLite WAL documentation warns that a database file separated from its WAL file can lose previously committed transactions or become corrupted.
- kind: behaviour
- questions: Q33 · load-bearing: no (backups belong to practice-ops; a failure mode listed here)
- support: S-r1-criticism-01/P25 · rung 1 · fit direct · upstream self
- scope: current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-35
- claim: Antithesis (a testing vendor) reports that its generic workload of concurrent writes and checkpoints hit the WAL-reset bug on SQLite 3.51.2 within 15 minutes of its first run in Antithesis's environment, and that the same workload passed on 3.51.3.
- kind: fact
- questions: Q32 · load-bearing: no (independent confirmation of the fix; vendor writing about its own product)
- support: S-r1-criticism-11/P1 · rung 1 (for its own run) · fit direct · upstream self
- support: S-r1-criticism-11/P2 · rung 1 (for its own run) · fit direct · upstream self
- support: S-r1-criticism-11/P3 · rung 1 (for its own run) · fit direct · upstream self
- scope: inside Antithesis's deterministic test environment with instrumented code, not organic production timing
- confidence: medium · flags: vendor-about-itself, exceptional (implies the race is easier to hit than the docs say)
- conflicts: S-r1-criticism-01/P17 (see Conflicts)

## Conflicts
- C-r1-criticism-28 / C-r1-criticism-29: S-r1-criticism-09/P3 says that unless overridden at compile time "it will always be the same as SQLITE_DEFAULT_SYNCHRONOUS and so no automatic synchronous setting changes will ever occur" (with S-r1-criticism-02/P4: FULL is durable in WAL mode). S-r1-criticism-08/P2 (the "SQLite" HN account) says "If you switch to WAL mode, the default behavior is that transactions are durable across application crashes … but are not necessarily durable across OS crashes or power failures." S-r1-criticism-08/P5 (a reply) asks how this squares with the docs and got no answer in the thread. Nature: definitional or version/build; it may depend on the build's SQLITE_DEFAULT_WAL_SYNCHRONOUS. To settle it, the SQLITE_DEFAULT_WAL_SYNCHRONOUS value in a stock sqlite.org amalgamation, or a `PRAGMA synchronous` result after switching to WAL on a stock build. Not settled.
- C-r1-criticism-17 / C-r1-criticism-35: S-r1-criticism-01/P17 says the race "requires an unusual usage pattern. It is unlikely to occur in common use."; S-r1-criticism-11/P1 says its triggering workload "is a completely generic workload. It just runs writes and checkpoints concurrently". Nature: scope/conditions (Antithesis explores thread schedules deterministically, which organic timing does not). Not settled.
- C-r1-criticism-20: S-r1-criticism-07/P2 says 3.51.3 "only contained a fix for the WAL-Reset bug"; S-r1-criticism-06 lists "Fix the WAL-reset database corruption bug." plus "Other minor bug fixes." Minor; not settled.
- C-r1-criticism-07 (internal): S-r1-criticism-01/P7 gives size thresholds where rollback is faster or WAL may fail; S-r1-criticism-01/P8, in the same bullet, says since 3.11.0 WAL "works as efficiently with large transactions as does rollback mode". The page does not say whether the >1 GB failure risk still applies after 3.11.0. Not settled.

## Speculation and flags
- C-r1-criticism-17, C-r1-criticism-18, C-r1-criticism-26: the vendor writing about itself (the SQLite project rating its own bug's likelihood and recommending its own setting). Attributed form only.
- C-r1-criticism-18: "appears to be less than or equal to the expected occurrence rate of SSD malfunctions and/or cosmic-ray hits": an estimate from unpublished telemetry.
- S-r1-criticism-11: the vendor writing about itself, with a marketing close ("If you have a gnarly database issue, call me."). The post quotes an earlier wal.html wording ("The developers have never been able to reproduce the bug organically"), whereas the current page reads "were unable to reproduce the bug organically" and adds "requires an unusual usage pattern": the docs were revised after March 2026.
- C-r1-criticism-21, C-r1-criticism-20: Tailscale relays the SQLite developers' explanation second-hand.
- S-r1-criticism-08: the account's identity as Hipp was not confirmed by an independent source in this run.
- S-r1-criticism-04: the post was revised. Its title still says "not durable under default settings", but the body now puts the issue in rollback (DELETE) mode, not WAL.

## Unused leads
- https://theconsensus.dev/p/2026/08/23/another-look-at-sqlite-wal-reset.html — Phil Eaton's reproducer using only the public API (cited by sqlite.org). It returned 403, and the Wayback copy came back gzipped. Retry with another fetch path; it would show whether default PASSIVE autocheckpoints can trigger the bug.
- https://web.archive.org/web/20260828084712/https://theconsensus.dev/p/2026/08/23/another-look-at-sqlite-wal-reset.html — the snapshot exists.
- https://www.sqlite.org/useovernet.html — sqlite.org's network-filesystem caveats (found-shm owns the mechanism).
- https://sqlite.org/forum/forumpost/8d7e2aae21a261f2 — the forum post HN commenters cite on the DELETE-mode durability default.
- https://www.openembedded.org/pipermail/openembedded-core/2015-September/229128.html — a project switching from WAL back to DELETE (cases angle).
- https://bugzilla.mozilla.org/show_bug.cgi?id=629296 — Firefox WAL bug discussion (cases angle).
- https://www.sqlite.org/releaselog/3_50_7.html and https://www.sqlite.org/releaselog/3_44_6.html — would confirm the backports on their own release notes.

## Queries
- "SQLite WAL-reset bug" → useful
- "SQLite synchronous NORMAL WAL durability fsync criticism" → useful
- "Phil Eaton \"Another look at SQLite's WAL-Reset bug\"" → useful (page unreadable)
- "Tailscale blog SQLite database corruption WAL checkpoint" → nothing new (secondary only)
- "Hipp \"If you switch to WAL mode, the default behavior is that transactions\" news.ycombinator.com" → nothing new (found via the hn.algolia API instead)
- "tailscale.com blog SQLite WAL-reset bug" (allowed_domains tailscale.com) → useful
- hn.algolia.com API: query "WAL mode durable across OS crashes", tags comment,author_SQLite → useful
- "when not to use SQLite WAL mode" → nothing new (rung-3 wiki/blog pages only)
- "why WAL is not the default journal mode SQLite Hipp" → nothing new

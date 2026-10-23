# Verification: 20261023-1245-sqlite-wal · final-b9
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 11 · supported 11 · partial 0 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0

## Records

### V-C-r1-criticism-11-1
- claim: C-r1-criticism-11
- source S-r1-criticism-01 · opened: https://www.sqlite.org/wal.html (curl, saved pages/final-b9/S-r1-criticism-01.txt) · quote-match: exact · passage at P15: found verbatim (line 130, § "11. The WAL-Reset Bug")
- source S-r1-criticism-10 · opened: https://www.sqlite.org/howtocorrupt.html (curl) · quote-match: exact · passage at P1: found verbatim (line 150, § "8.1")
- source S-r1-criticism-06 · opened: https://www.sqlite.org/releaselog/3_51_3.html (curl) · quote-match: exact · passage at P2: found verbatim (line 60)
- looked first: wal.html § 11 says the SQLite developer Dan found and fixed the bug on 2026-03-03; the bug is "likely present" in 3.7.0 through 3.51.2 and fixed in 3.51.3 and later. howtocorrupt.html drops the hedge ("It existed in all versions of SQLite from 3.7.0 through 3.51.2"). The 3.51.3 release log lists "Fix the WAL-reset database corruption bug."
- implied: affected range 3.7.0 (2010-07-21) through 3.51.2 (2026-01-09), hedged "likely" in wal.html; fixed in 3.51.3 (2026-03-13) and later. All items match the claim, including the dates and the "likely" hedge.
- verdict: supported · reason: the dates, version numbers and hedge are stated verbatim in wal.html; the release log confirms the 3.51.3 fix.
- bar: met (load-bearing descriptive; rung 1 official docs and release notes; the three pages share one owner, so they count as one source for independence, which the descriptive bar does not require) · independence: n/a · currency: the SQLite news page (https://www.sqlite.org/news.html) says 3.52.0 was withdrawn and 3.51.3 carries the fix, and that 3.53.0 also contains it ("The WAL-reset bug is fixed in this release"). Nothing supersedes or retracts the range.
- counter: none-found ("SQLite WAL-reset bug affected versions 3.7.0 fixed", "SQLite WAL-reset corruption bug fix incomplete or still present after 3.51.3", "Another look at SQLite's WAL-Reset bug reproducer affected versions"). Lateral read: the SQLite news page and a search for third-party coverage repeat the same range, citing sqlite.org. Search results showed no source that disputes the range or says the fix is incomplete.

### V-C-r1-criticism-12-1
- claim: C-r1-criticism-12
- source S-r1-criticism-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage at P15: found verbatim (line 130)
- looked first: the same § 11 sentence names "some earlier releases: 3.44.6 and 3.50.7" as having backports. The sentence says "available", and gives no dates or release-note links.
- implied: the documentation names two older releases, 3.44.6 and 3.50.7, for which backports of the fix are available. This matches the claim as written (an attributed "the SQLite documentation says").
- verdict: supported · reason: the passage says this verbatim. Caution for the chapter: keep the attribution. I could not corroborate the two version numbers outside wal.html (see counter).
- bar: met for the attributed form (rung 1 official docs; one source) · independence: n/a · currency: see counter.
- counter: S-v9-05 (C-v9-01). Queries: "SQLite 3.44.6 3.50.7 release WAL-reset backport", "sqlite.org \"3.50.7\" \"3.44.6\" release". https://www.sqlite.org/releaselog/3_44_6.html and https://www.sqlite.org/releaselog/3_50_7.html both return HTTP 404; https://www.sqlite.org/changes.html lists neither version; the Fossil pages version-3.44.6 and version-3.50.7 returned "No such object". The release-tagged timeline shows the fix only as check-ins on branch-3.44 and branch-3.50 dated 2026-03-05. This is not a contradiction, because the doc says "available", which the branch check-ins may satisfy, but the 3.44.6 and 3.50.7 releases are unconfirmed outside wal.html. A chapter telling readers to "upgrade to 3.44.6 or 3.50.7" should say "per the SQLite WAL documentation" and should not give a download or release-note link.

### V-C-r1-cases-01-1
- claim: C-r1-cases-01
- source S-r1-cases-13 · opened: https://forum.syncthing.net/t/is-syncthing-v2-with-very-large-folders-possible/26082 (curl, pages/final-b9/S-r1-cases-13.txt) · quote-match: exact · passage at P1, P2, P3: found verbatim (lines 14, 16, 9). P4 and P6 are on lines 10 and 12.
- implied: the post (gyver, 2026-01-26) lists `52636483584 Jan 16 18:46 folder.0002-xxx.db` and `190415597392 Jan 26 03:50 folder.0002-xxx.db-wal`. The largest folder has about 30 million files. The user is migrating a backup server to 2.0.10 and removed the old database to force a re-index. The sizes carry no unit but are the usual `ls -l` byte counts, a direct inference. The post calls it "nearly 200GiB", which fits loosely (190.4e9 bytes is about 177 GiB). "This folder" is the one stuck in "Preparing to Sync", which the post says is the largest folder.
- verdict: supported · reason: all numbers, the version and the file count are in the post. The claim is correctly narrow ("a user ... listed").
- bar: met (not load-bearing; the first-hand report is used in attributed form) · independence: n/a · currency: n/a (dated report)

### V-C-r1-cases-02-1
- claim: C-r1-cases-02
- source S-r1-cases-06 · opened: https://github.com/syncthing/syncthing/issues/10559 (curl) · quote-match: exact · passage at P3 found verbatim (line 166); P1 (line 123), P4 (line 167) in the same text
- source S-r1-cases-04 · opened: https://forum.syncthing.net/t/dealing-with-checkpoint-starvation/26121 (curl) · quote-match: exact · passage at P3: found verbatim (line 9)
- implied: bt90, labelled "ContributorAuthor", opened the issue on 2026-02-04, which names Syncthing v2.0.14. He wrote that pages are constantly moving from the WAL to the database, but slower than the WAL grows, so "it's not caused by a read transaction that is running for hours/days". The reads come "in quick succession", and "Our checkpointer routine is never able to hit a gap". The forum post says the application-level checkpointer is "timer based" and "might never hit a timewindow without an active reader". The issue shows Open with the needs-triage label.
- verdict: supported · reason: every element (author, date, version, diagnosis, quick-succession reads, timer-based checkpointer, pages still moving) is in the two sources.
- bar: met (not load-bearing; a rung-1 project contributor on the project's own system, kept as his diagnosis) · independence: n/a · currency: issue still open at 2026-10-23 and no fix is linked ("No branches or pull requests"), so "diagnosis, not confirmed fix" is right.

### V-C-r1-cases-03-1
- claim: C-r1-cases-03
- source S-r1-cases-06 · opened: https://github.com/syncthing/syncthing/issues/10559 (curl) · quote-match: exact · passage at P2: found by text in the issue body (line 126: "The readers execute slower with a growing WAL and the chances of a successful checkpoint vanish.")
- source S-r1-cases-04 · opened: https://forum.syncthing.net/t/dealing-with-checkpoint-starvation/26121 (curl) · quote-match: exact · passage at P4: found verbatim (line 14)
- implied: the issue body says WAL size hurts reader performance, giving "a positive feedback loop": slower readers, with a growing WAL, mean a vanishing chance of a successful checkpoint.
- verdict: supported · reason: the claim restates the issue body in near the same words.
- bar: met (not load-bearing) · independence: n/a · currency: n/a

### V-C-r1-cases-04-1
- claim: C-r1-cases-04
- source S-r1-cases-06 · opened: https://github.com/syncthing/syncthing/issues/10559 (curl) · quote-match: exact · passage at P5, P6: found verbatim (lines 175, 177; P6 checked with --find at line 177)
- source S-r1-cases-04 · opened: https://forum.syncthing.net/t/dealing-with-checkpoint-starvation/26121 (curl) · quote-match: exact · passage at P1: found verbatim (line 10)
- implied: bt90 wrote that Syncthing took checkpointing "into our own hands" but "didn't disable the auto mechanism"; that "all readers would trigger a PASSIVE checkpoint on commit" given a large WAL; and that "If such a checkpoint is executing our manual checkpoints would instantly fail." The wording is conditional ("would", "might"): this is reasoning, not a measured trace. The claim's "found" is slightly stronger than the source's "The rabbit hole goes even deeper".
- verdict: supported · reason: the mechanism, the PASSIVE type and the immediate failure of manual checkpoints are all stated. The writer should say "argued" or "reasoned", not "measured".
- bar: met (not load-bearing) · independence: n/a · currency: issue still open, as above.

### V-C-r1-cases-06-1
- claim: C-r1-cases-06
- source S-r1-cases-13 · opened: https://forum.syncthing.net/t/is-syncthing-v2-with-very-large-folders-possible/26082 (curl) · quote-match: exact · passage at P5: found verbatim (line 55)
- implied: dmih (2026-01-27) wrote "It was even when deleting 1M folder, first step of deletion processing was to explode 4 GB DB to ~4 DB + 12 GB WAL." The post gives no unit for "1M". The preceding sentences are about "small folders with lots of flies (millions)" and "1M+ folders", so "1M folder" is directly read as a folder of about a million files. "~4 DB" is read as "~4 GB DB". The user is not the original poster, so "another" is right.
- verdict: supported · reason: numbers and sequence match, with the two readings above (million files, "4 DB" as "4 GB DB"). Both readings are close to certain from the context.
- bar: met (not load-bearing; a single first-hand report, kept as "reported") · independence: n/a · currency: n/a

### V-C-r1-cases-07-1
- claim: C-r1-cases-07
- source S-r1-cases-14 · opened: https://sqlite.org/forum/forumpost/6038b31ddb?t=c (curl) · quote-match: exact · passage at P3: found verbatim (line 20); P1, P2 at lines 9-10
- implied: 2021-04-06, the user: "Currently the WAL-File is about 100GB and it continues growing" in "my logging system" and "i have a lot of prepared statements". Hipp: "If you don't invoke sqlite3_reset() on every prepared statement that you run, then you will likely be leaving some transactions open, which will prevent the checkpoint from happening and resetting the WAL file." The user replied only that they would check. Hipp's text says "likely" and also names sqlite3_finalize(). The claim's "can leave" fits the hedge.
- verdict: supported · reason: all parts match. The cause was a diagnosis, not confirmed by the poster, as the claim's scope says.
- bar: met (not load-bearing; the forum post is first-hand and Hipp speaks about SQLite) · independence: n/a · currency: n/a (2021 thread)

### V-C-r1-cases-08-1
- claim: C-r1-cases-08
- source S-r1-cases-05 · opened: https://raw.githubusercontent.com/rails/rails/main/activerecord/lib/active_record/connection_adapters/sqlite3_adapter.rb (curl, re-fetched 2026-10-23) · quote-match: exact · passage at P1, P2, P3: found (the text has one line; the raw file has them at lines 150-156)
- implied: `DEFAULT_PRAGMAS = {"foreign_keys" => true, "journal_mode" => :wal, "synchronous" => :normal, "mmap_size" => 134217728, # 128 megabytes, "journal_size_limit" => 67108864, # 64 megabytes, "cache_size" => 2000}`. 134217728 = 128 MiB and 67108864 = 64 MiB, so the claim's byte values are right. No commit hash was checked, as the source was fetched from main, not a clone.
- verdict: supported · reason: all six pragmas and values match in the file I fetched, the same day as the researcher.
- bar: met (not load-bearing; rung 1 code) · independence: n/a · currency: main branch on 2026-10-23, which is what the claim's scope says.

### V-C-r1-cases-12-1
- claim: C-r1-cases-12
- source S-r1-cases-12 · opened: https://github.com/rails/rails/pull/49349 (curl) · quote-match: exact · passage at P5: found verbatim (line 136, § "Detail")
- implied: the PR author wrote "So, we trade an aggressive approach to durability for speed", and that "SQLite ensures that any potential data loss could only happen with OS or filesystem failure; any process crash won't affect data durability." This is the PR author's reasoning (fractaledmind), in the PR description. The same paragraph says NORMAL "syncs every wal_autocheckpoint pages", which is his own gloss and differs from SQLite's wal.html (the checkpoint is the sync operation, and NORMAL "might rollback following a power failure"). The claim correctly keeps it as a rationale.
- verdict: supported · reason: both parts (the trade-off and the failure scope) are in the passage, in the PR author's voice.
- bar: met for the attributed form (not load-bearing; rung 1 for what the PR says) · independence: n/a · currency: PR merged 2023-09-24 per the researcher's source.

### V-C-r1-cases-13-1
- claim: C-r1-cases-13
- source S-r1-cases-12 · opened: https://github.com/rails/rails/pull/49349 (curl) · quote-match: exact · passage at P6, P7: found verbatim (line 137, § "Detail")
- implied: "The default of -1 means that there is no limit, so this disk file will grow in size indefinitely. This is not what we want. Anyone who has experienced app downtime because log files filled up your disk space ... We need to ensure that the file size is capped at an appropriate size." The "disk file" is the write-ahead log data in the on-disk file. The sentence about filling the disk is an analogy to log files, which the claim reads as the aim "so that it could not fill the disk"; that is a direct inference. "On-disk journal file" in the claim stands for the WAL file.
- verdict: supported · reason: the -1 default, the unlimited growth and the intent to cap match. Note for the writer: the PR gives the author's rationale. SQLite's journal_size_limit only truncates the file after a checkpoint resets the log (a forum reply by Keith Medcalf in S-r1-cases-14/P5 says this and the claim does not rest on it), so it does not cap growth during checkpoint starvation. Do not present the PR's reasoning as a guarantee.
- bar: met for the attributed form (not load-bearing) · independence: n/a · currency: n/a

## Counter-evidence

### S-v9-05
- url: https://www.sqlite.org/src/timeline?r=release · canonical: www.sqlite.org/src/timeline
- title: SQLite: Timeline (50 most recent check-ins related to "release") · authors: n/a · publisher: SQLite project (Fossil repository)
- date: n/a; lists check-ins up to 2026-10-16 · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: other (version-control timeline) · peer-review: n/a
- owner: SQLite project · upstream: none
- lateral: the SQLite project's official source repository; same owner as wal.html, so a check on the docs by the project itself.
- passages:
  - P1 · § "50 most recent check-ins related to "release"": "Avoid an obscure race condition between a checkpointer and a writer wrapping around to the start of the wal file. (This cherry pick omits testing infrastructure.) (check-in: 2af8439a0c … tags: branch-3.44)"
  - P2 · § "50 most recent check-ins related to "release"": "Avoid an obscure race condition between a checkpointer and a writer wrapping around to the start of the wal file. (check-in: 268c9da287 … tags: branch-3.50)"

### C-v9-01
- claim: On 2026-10-23, the SQLite source timeline filtered on "release" shows check-ins tagged release for versions 3.51.2, 3.51.3, 3.52.0 and 3.53.x to 3.54.1, but none tagged version-3.44.6 or version-3.50.7; the WAL-reset race fix appears there only as untagged check-ins on branch-3.44 and branch-3.50 dated 2026-03-05.
- kind: fact
- questions: Q32 · load-bearing: yes (bears on C-r1-criticism-12)
- support: S-v9-05/P1 · rung 1 · fit partial (the absence of tags is read from the whole page, not quoted) · upstream self
- support: S-v9-05/P2 · rung 1 · fit direct · upstream self
- scope: the timeline shows only the 50 most recent "release" check-ins; the 2026-03-05 check-ins and later fall inside that window. Also, the release logs releaselog/3_44_6.html and releaselog/3_50_7.html returned HTTP 404 and changes.html lists neither version. Not a contradiction of wal.html ("backports ... are available"), but no independent confirmation of the version numbers.
- confidence: medium · flags: none
- conflicts: S-r1-criticism-01/P15 "Backports of the fix are available for some earlier releases: 3.44.6 and 3.50.7." (not contradicted outright; unconfirmed)

## Leads
- https://www.sqlite.org/news.html — confirms the 3.51.3 fix, 3.52.0 withdrawn, and the WAL-reset fix in 3.53.0; no mention of 3.44.6 or 3.50.7.
- https://www.sqlite.org/src/timeline?t=version-3.50.7 — not opened; would settle whether a tagged release exists for either backport.
- https://antithesis.com/blog/2026/wal-reset-bug/ — appeared in search results; not opened (rung 3 pointer at best).

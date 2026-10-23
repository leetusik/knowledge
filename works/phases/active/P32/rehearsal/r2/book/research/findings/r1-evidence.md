# Findings: 20261023-1245-sqlite-wal · round 1 · angle evidence
- researcher: claude-opus-5-5 · status: partial (hard cap of 40 exceeded: 50 tool calls, the last 7 spent on writing and quote-checking; Q31 has no dated independent multi-process measurement at rung 2) · tool calls: 50

## Questions
- Q29: answered — claims: C-r1-evidence-01, C-r1-evidence-02, C-r1-evidence-03, C-r1-evidence-04, C-r1-evidence-05, C-r1-evidence-06, C-r1-evidence-07, C-r1-evidence-08, C-r1-evidence-10, C-r1-evidence-11, C-r1-evidence-14 — note: two peer-reviewed measurements (USENIX ATC 2013, PVLDB 2022) give WAL vs rollback; NORMAL vs FULL is measured only in self-published benchmarks (2012 mailing list, 2024 and 2025 blogs), whose magnitudes differ widely.
- Q30: answered — claims: C-r1-evidence-09, C-r1-evidence-16, C-r1-evidence-17, C-r1-evidence-18, C-r1-evidence-19, C-r1-evidence-20, C-r1-evidence-21, C-r1-evidence-22, C-r1-evidence-25 — note: the docs describe read slowdown qualitatively; no source found that measures read latency against WAL size (2 queries); the large-transaction paragraph of wal.html is internally in tension (see Conflicts).
- Q31: thin — claims: C-r1-evidence-11, C-r1-evidence-12, C-r1-evidence-13, C-r1-evidence-15, C-r1-evidence-23, C-r1-evidence-24 — note: only the SQLite docs' own estimate and two self-published blog benchmarks; the PVLDB 2022 TATP run uses a single client, so it does not measure concurrency.

## Sources

### S-r1-evidence-01
- url: https://www.sqlite.org/wal.html · canonical: sqlite.org/wal.html
- title: Write-Ahead Logging · authors: n/a · publisher: SQLite (sqlite.org)
- date: undated (current page) · version: page as served 2026-10-23
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project (Hwaci) · upstream: none
- lateral: the SQLite project's own documentation; trusted source in the dispatch.
- passages:
  - P1 · § "1. Overview": "WAL uses many fewer fsync() operations and is thus less vulnerable to problems on systems where the fsync() system call is broken."
  - P2 · § "1. Overview": "WAL might be very slightly slower (perhaps 1% or 2% slower) than the traditional rollback-journal approach in applications that do mostly reads and seldom write."
  - P3 · § "1. Overview": "WAL works best with smaller transactions. WAL does not work well for very large transactions. For transactions larger than about 100 megabytes, traditional rollback journal modes will likely be faster. For transactions in excess of a gigabyte, WAL mode may fail with an I/O or disk-full error. It is recommended that one of the rollback journal modes be used for transactions larger than a few dozen megabytes."
  - P4 · § "1. Overview": "Beginning with version 3.11.0 (2016-02-15), WAL mode works as efficiently with large transactions as does rollback mode."
  - P5 · § "2.3. Performance Considerations": "Write transactions are very fast since they only involve writing the content once (versus twice for rollback-journal transactions) and because the writes are all sequential."
  - P6 · § "2.3. Performance Considerations": "(Writers sync the WAL on every transaction commit if PRAGMA synchronous is set to FULL but omit this sync if PRAGMA synchronous is set to NORMAL.)"
  - P7 · § "2.3. Performance Considerations": "read performance deteriorates as the WAL file grows in size since each reader must check the WAL file for the content and the time needed to check the WAL file is proportional to the size of the WAL file. The wal-index helps find content in the WAL file much faster, but performance still falls off with increasing WAL file size."
  - P8 · § "2.3. Performance Considerations": "This has the effect of causing most COMMIT operations to be very fast but an occasional COMMIT (those that trigger a checkpoint) to be much slower."
  - P9 · § "2.3. Performance Considerations": "The default strategy is to run a checkpoint once the WAL reaches 1000 pages and this strategy seems to work well in test applications on workstations, but other strategies might work better on different platforms or for different workloads."
  - P10 · § "6. Avoiding Excessively Large WAL Files": "In normal cases, new content is appended to the WAL file until the WAL file accumulates about 1000 pages (and is thus about 4MB in size) at which point a checkpoint is automatically run and the WAL file is recycled."
  - P11 · § "2.1. Checkpointing": "By default, SQLite does a checkpoint automatically when the WAL file reaches a threshold size of 1000 pages."
  - P12 · § "2.3. Performance Considerations": "Note that with PRAGMA synchronous set to NORMAL, the checkpoint is the only operation to issue an I/O barrier or sync operation (fsync() on unix or FlushFileBuffers() on windows)."

### S-r1-evidence-02
- url: https://www.sqlite.org/pragma.html · canonical: sqlite.org/pragma.html
- title: Pragma statements supported by SQLite · authors: n/a · publisher: SQLite (sqlite.org)
- date: undated (current page) · version: page as served 2026-10-23
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project (Hwaci) · upstream: none
- lateral: the SQLite project's own documentation; trusted source in the dispatch.
- passages:
  - P1 · § "PRAGMA synchronous": "In WAL mode when synchronous is NORMAL (1), the WAL file is synchronized before each checkpoint and the database file is synchronized after each completed checkpoint and the WAL file header is synchronized when a WAL file begins to be reused after a checkpoint, but no sync operations occur during most transactions. With synchronous=FULL in WAL mode, an additional sync operation of the WAL file happens after each transaction commit."
  - P2 · § "PRAGMA page_size": "beginning with SQLite version 3.12.0 (2016-03-29), the default page size increased to 4096."
  - P3 · § "PRAGMA wal_autocheckpoint": "All automatic checkpoints are PASSIVE."
  - P4 · § "PRAGMA wal_autocheckpoint": "Autocheckpointing is enabled by default with an interval of 1000 or SQLITE_DEFAULT_WAL_AUTOCHECKPOINT."

### S-r1-evidence-03
- url: https://tahoe-lafs.org/pipermail/tahoe-dev/2012-December/007882.html · canonical: tahoe-lafs.org/pipermail/tahoe-dev/2012-December/007882.html
- title: [tahoe-dev] configuring sqlite efficiency and durability · authors: David-Sarah Hopwood (reply quoting Zooko Wilcox-O'Hearn) · publisher: tahoe-dev mailing list
- date: 2012-12-04 · version: SQLite version not stated
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: forum · peer-review: no
- owner: Tahoe-LAFS project mailing list · upstream: Zooko Wilcox-O'Hearn's earlier message in the same thread (not opened)
- lateral: Tahoe-LAFS is an open-source distributed storage project; the numbers are Zooko's own run of one Tahoe unit test, quoted in a reply. Mailing list, rung 3.
- passages:
  - P1 · § "[tahoe-dev] configuring sqlite efficiency and durability": "> The results are interesting. All numbers here are the total wall-clock > time to run that unit test which adds-or-renews leases 3240 times: > > synchronous = FULL (default), journal mode = default (rollback > journal), time: 1042.4 seconds > > synchronous = FULL (default), journal mode = WAL, time: 308.5 seconds"
  - P2 · § "[tahoe-dev] configuring sqlite efficiency and durability": "> synchronous = NORMAL, journal mode = WAL, best of 5 runs: 19.7 seconds"

### S-r1-evidence-04
- url: https://cur.at/TKSPJDi?m=web (redirects to Anže Pečar's blog) · canonical: blog.pecar.me/django-sqlite-benchmark (via cur.at redirect; host as printed "Anže's Blog")
- title: Django SQLite Benchmark · authors: Anže (Pečar) · publisher: Anže's Blog
- date: 2024-02-06 · version: Django 5.0 (defaults run); SQLite version not stated
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: blog · peer-review: no
- owner: individual author · upstream: none (author's own benchmark; code in the author's GitHub repository)
- lateral: personal blog of a Django developer; a self-published benchmark. Rung 1 only for the attributed form "the author measured X" (own method and results); rung 3 for any general claim.
- passages:
  - P1 · § "Default Settings": "The benchmark is write-heavy, which is the worst-case scenario for SQLite. About half of the requests write a row to the database, and the other half read ten rows from the DB."
  - P2 · § "Default Settings": "I used locust to run the benchmark with 100 concurrent users and a spawn rate of 2 users per second."
  - P3 · § "Results": "Without changing any settings and just running with whatever the default settings are in Django 5.0, we get the following results: … 611.14 reqests/s … 20.20 failures/s"
  - P4 · § "Results": "781.00 reqests/s … 27.37 failures/s … We can see that the throughput has increased, but we are also getting more errors."
  - P5 · § "Results": "998.72 requests/s … 0.01 failures/s"
  - P6 · § "Results": "1014.35 requests/s … 0.00 failures/s … This increased the throughput slightly, but it isn’t as drastic a change this time, so I’d say changing this is optional."
  - P7 · § "Compared to Postgres": "SQLite is again faster at the lower percentiles but then goes up to 6400ms at the 100th percentile, while Postgres stays at a much more comfortable 460ms."

### S-r1-evidence-06
- url: https://www.usenix.org/system/files/conference/atc13/atc13-jeong.pdf · canonical: usenix.org/system/files/conference/atc13/atc13-jeong.pdf
- title: I/O Stack Optimization for Smartphones · authors: Sooman Jeong, Kisung Lee, Seongjin Lee, Seoungbum Son, Youjip Won · publisher: USENIX (ATC '13)
- date: 2013-06 · version: SQLite 3.7.5 on Galaxy S3 (Android)
- accessed: 2026-10-23 · read-via: pdf → text · quote-match: exact · archive: none
- kind: paper · peer-review: yes
- owner: Hanyang University and Samsung Electronics authors · upstream: none
- lateral: USENIX ATC 2013 peer-reviewed paper (search results list it as a Best Paper award winner); no stake in SQLite itself.
- passages:
  - P1 · p.8: "WAL mode … yields the best insert/sec performance among four journaling modes (Figure 7(a)). … In an update operation, WAL mode yields three times better performance compared to the other journaling modes in all"
  - P2 · p.8: "WAL mode yields the best performance because all the log data created from insert and update operations are appended to .db-wal … and there occurs only one fsync() call."
  - P3 · p.5: "SQLite calls fsync() at the end of each phase to make the results persistent."
  - P4 · p.11: "for SQLite (from 39 inserts/sec to 157 inserts/sec)"

### S-r1-evidence-07
- url: https://www.sqlite.org/whentouse.html · canonical: sqlite.org/whentouse.html
- title: Appropriate Uses For SQLite · authors: n/a · publisher: SQLite (sqlite.org)
- date: undated (current page) · version: page as served 2026-10-23
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project (Hwaci) · upstream: none
- lateral: the SQLite project writing about its own product (vendor-about-itself for any capacity estimate).
- passages:
  - P1 · § "Websites": "Generally speaking, any site that gets fewer than 100K hits/day should work fine with SQLite. The 100K hits/day figure is a conservative estimate, not a hard upper bound. SQLite has been demonstrated to work with 10 times that amount of traffic."
  - P2 · § "High Concurrency": "SQLite supports an unlimited number of simultaneous readers, but it will only allow one writer at any instant in time. For many situations, this is not a problem. Writers queue up. Each application does its database work quickly and moves on, and no lock lasts for more than a few dozen milliseconds."

### S-r1-evidence-08
- url: https://www.vldb.org/pvldb/vol15/p3535-gaffney.pdf · canonical: vldb.org/pvldb/vol15/p3535-gaffney.pdf
- title: SQLite: Past, Present, and Future · authors: Kevin P. Gaffney, Martin Prammer, Larry Brasfield, D. Richard Hipp, Dan Kennedy, Jignesh M. Patel · publisher: PVLDB 15(12)
- date: 2022 · version: SQLite 3.38.0
- accessed: 2026-10-23 · read-via: pdf → text · quote-match: exact · archive: none
- kind: paper · peer-review: yes
- owner: University of Wisconsin-Madison with SQLite developers (Hipp, Kennedy, Brasfield) · upstream: none
- lateral: peer-reviewed VLDB paper; three co-authors are SQLite's own developers, so it is not independent of the SQLite project (stake).
- passages:
  - P1 · p.6: "SQLite was built with all the recommended compile-time options [22] except SQLITE_DEFAULT_WAL_SYNCHRONOUS to maintain durability in WAL mode."
  - P2 · p.6: "We simulate a single TATP client in all experiments."
  - P3 · p.6: "On both hardware configurations, SQLite-WAL produces the highest throughput by a wide margin. On the cloud server, SQLite-WAL reaches a throughput of 10 thousand TPS"
  - P4 · p.6: "SQLite-DELETE is slower than SQLite-WAL, but substantially faster than DuckDB on the cloud server."
  - P5 · p.11: "SQLite-DELETE is slightly less than half as fast as SQLite-WAL. Because SQLite-DELETE writes its changes to the rollback journal and then to the database file, it incurs about twice as many writes as SQLite-WAL, which appends its changes only to the WAL (assuming no checkpoint is triggered by the transaction)."
  - P6 · p.11: "The default limit of the WAL is 1000 pages, which equates to about 4 MB. Because the blob size is 10 MB, a single write causes the size of the WAL to exceed this limit, which triggers an immediate checkpoint. As a result, SQLite-WAL incurs two writes for each 10 MB blob update. We observed increased throughput for greater WAL size limits, but we omit these results for brevity."

### S-r1-evidence-09
- url: https://andersmurphy.com/2025/12/02/100000-tps-over-a-billion-rows-the-unreasonable-effectiveness-of-sqlite.html · canonical: andersmurphy.com/2025/12/02/100000-tps-over-a-billion-rows-the-unreasonable-effectiveness-of-sqlite.html
- title: 100000 TPS over a billion rows: the unreasonable effectiveness of SQLite · authors: Anders Murphy · publisher: andersmurphy.com
- date: 2025-12-02 (with later epilogue updates) · version: SQLite version not stated; sqlite4clj (Clojure)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: blog · peer-review: no
- owner: individual author (also author of the sqlite4clj library used) · upstream: none (own benchmark)
- lateral: personal blog; author maintains the Clojure SQLite library he benchmarks with (mild stake). Rung 1 only for the attributed form of his own measurements; rung 3 for general claims.
- passages:
  - P1 · § "Prelude": "MacBook Pro (2021) … Chip: Apple M1 Pro … Memory: 16 GB … These benchmarks are not meant to be perfect or even optimal."
  - P2 · § "Prelude": "We'll be using SQLite with a single writer connection and a number of reader connections equal to our number of cores."
  - P3 · § "Embedded means no network": "44096 TPS! By eliminating the network SQLite massively reduces the impact of Amdahl's law."
  - P4 · § "Pragma synchronous \"FULL\"": "So here are the updated numbers. … no network … 13756 … 20654"
  - P5 · § "Single writer lets you batch (trivially)": ";; => 186157 TPS"
  - P6 · § "What about concurrent reads?": "102545 TPS!"

## Claims

### C-r1-evidence-01
- claim: The SQLite WAL documentation states that a WAL write transaction writes the content once, against twice for a rollback-journal transaction, and that the writes are all sequential.
- kind: behaviour
- questions: Q29 · load-bearing: no (context for the measurements)
- support: S-r1-evidence-01/P5 · rung 1 · fit direct · upstream self
- scope: current wal.html, accessed 2026-10-23
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-evidence-02
- claim: The SQLite WAL documentation states that WAL uses many fewer fsync() operations than the rollback journal.
- kind: comparison
- questions: Q29 · load-bearing: no (documented, unquantified)
- support: S-r1-evidence-01/P1 · rung 1 · fit direct · upstream self
- scope: current wal.html; attributed form only
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-evidence-03
- claim: The SQLite WAL documentation estimates that WAL may be about 1% or 2% slower than the rollback journal in applications that do mostly reads and seldom write.
- kind: number
- questions: Q29, Q30 · load-bearing: no
- support: S-r1-evidence-01/P2 · rung 1 · fit direct · upstream self
- scope: "perhaps", an estimate, not a reported measurement
- confidence: medium · flags: vendor-about-itself, speculation ("might", "perhaps")
- conflicts: none

### C-r1-evidence-04
- claim: According to the SQLite PRAGMA documentation, in WAL mode with synchronous=NORMAL no sync operations occur during most transactions (syncs happen around checkpoints), while synchronous=FULL adds one sync of the WAL file after each transaction commit.
- kind: behaviour
- questions: Q29 · load-bearing: no (the per-commit fsync count Q29 asks about)
- support: S-r1-evidence-02/P1 · rung 1 · fit direct · upstream self
  support: S-r1-evidence-01/P6 · rung 1 · fit direct · upstream self
  support: S-r1-evidence-01/P12 · rung 1 · fit partial · upstream self
- scope: current pragma.html and wal.html
- confidence: high · flags: none
- conflicts: none

### C-r1-evidence-05
- claim: In the 2013 USENIX ATC study by Jeong et al. (SQLite 3.7.5 on a Galaxy S3), WAL mode gave the best insert/sec of the four journaling modes on all five filesystems tested, and about three times better update performance than the other journaling modes.
- kind: comparison
- questions: Q29 · load-bearing: no
- support: S-r1-evidence-06/P1 · rung 1 · fit direct · upstream self
- scope: Android smartphone eMMC storage, SQLite 3.7.5, 2013; filesystems EXT4, NILFS2, XFS, BTRFS, F2FS; Galaxy S3's SQLite differs from public SQLite in update journaling (the paper notes this)
- confidence: high · flags: none
- conflicts: none

### C-r1-evidence-06
- claim: Jeong et al. (USENIX ATC 2013) attribute WAL's advantage on Android to WAL appending log data to the .db-wal file with only one fsync() call per operation, whereas in the rollback modes SQLite calls fsync() at the end of each of two phases (journal, then database).
- kind: behaviour
- questions: Q29 · load-bearing: no
- support: S-r1-evidence-06/P2 · rung 1 · fit direct · upstream self
  support: S-r1-evidence-06/P3 · rung 1 · fit partial · upstream self
- scope: SQLite 3.7.5 on Galaxy S3, EXT4 ordered mode, single-record insert, 2013; synchronous setting as on Android (not stated in passage)
- confidence: high · flags: none
- conflicts: none

### C-r1-evidence-07
- claim: In the PVLDB 2022 paper by Gaffney et al. (SQLite 3.38.0, TATP benchmark with a single client, WAL built to keep durability), SQLite in WAL mode produced the highest throughput by a wide margin on both a cloud server and a Raspberry Pi 4, reaching about 10 thousand TPS on the cloud server, and SQLite in DELETE (rollback) mode was slower than WAL.
- kind: comparison
- questions: Q29 · load-bearing: no
- support: S-r1-evidence-08/P3 · rung 1 · fit direct · upstream self
  support: S-r1-evidence-08/P4 · rung 1 · fit direct · upstream self
  support: S-r1-evidence-08/P1 · rung 1 · fit partial · upstream self
  support: S-r1-evidence-08/P2 · rung 1 · fit partial · upstream self
- scope: SQLite 3.38.0; TATP (80% read-only transactions); single client; recommended compile options except SQLITE_DEFAULT_WAL_SYNCHRONOUS; mean of three trials
- confidence: high · flags: vendor-about-itself (co-authored by SQLite developers)
- conflicts: none

### C-r1-evidence-08
- claim: In the PVLDB 2022 BLOB benchmark (SQLite 3.38.0, 100 KB blobs), SQLite in DELETE mode was slightly less than half as fast as SQLite in WAL mode, which the authors attribute to DELETE mode incurring about twice as many writes.
- kind: comparison
- questions: Q29 · load-bearing: no
- support: S-r1-evidence-08/P5 · rung 1 · fit direct · upstream self
- scope: 100 KB blobs; single connection; assuming no checkpoint triggered by the transaction
- confidence: high · flags: vendor-about-itself (co-authored by SQLite developers)
- conflicts: none

### C-r1-evidence-09
- claim: In the PVLDB 2022 BLOB benchmark, a 10 MB blob write exceeded the default 1000-page (about 4 MB) WAL limit and triggered an immediate checkpoint, so WAL incurred two writes per update and performed about the same as DELETE mode; the authors observed higher throughput with larger WAL size limits but did not publish those results.
- kind: comparison
- questions: Q30 · load-bearing: no
- support: S-r1-evidence-08/P6 · rung 1 · fit direct · upstream self
- scope: SQLite 3.38.0, 10 MB blobs; larger-limit results omitted from the paper
- confidence: medium (omitted results) · flags: vendor-about-itself
- conflicts: none

### C-r1-evidence-10
- claim: A December 2012 post on the tahoe-dev mailing list reports that a Tahoe-LAFS unit test renewing leases 3,240 times took 1042.4 s with synchronous=FULL and the rollback journal, 308.5 s with synchronous=FULL and WAL, and 19.7 s (best of 5) with synchronous=NORMAL and WAL.
- kind: number
- questions: Q29 · load-bearing: no
- support: S-r1-evidence-03/P1 · rung 3 · fit direct · upstream Zooko Wilcox-O'Hearn's earlier message (not opened)
  support: S-r1-evidence-03/P2 · rung 3 · fit direct · upstream same
- scope: one unit test, 2012, hardware and SQLite version unstated
- confidence: low · flags: exceptional (FULL→NORMAL ~15x)
- conflicts: see Conflicts (magnitude of the NORMAL vs FULL effect)

### C-r1-evidence-11
- claim: In a February 2024 Django benchmark (write-heavy, about half the requests writing, 100 concurrent locust users), Anže Pečar reported 611.14 requests/s with Django 5.0's default SQLite settings, 781.00 requests/s after enabling WAL, 998.72 requests/s after also using IMMEDIATE transactions, and 1014.35 requests/s after also setting synchronous=NORMAL.
- kind: number
- questions: Q29, Q31 · load-bearing: no
- support: S-r1-evidence-04/P3 · rung 1 (attributed, own results) · fit direct · upstream self
  support: S-r1-evidence-04/P4 · rung 1 (attributed) · fit direct · upstream self
  support: S-r1-evidence-04/P5 · rung 1 (attributed) · fit direct · upstream self
  support: S-r1-evidence-04/P6 · rung 1 (attributed) · fit direct · upstream self
  support: S-r1-evidence-04/P1 · rung 1 (attributed) · fit partial · upstream self
  support: S-r1-evidence-04/P2 · rung 1 (attributed) · fit partial · upstream self
- scope: settings applied cumulatively; Django 5.0; 100 s runs; hardware and SQLite version unstated; self-published
- confidence: medium · flags: none
- conflicts: see Conflicts (magnitude of NORMAL vs FULL)

### C-r1-evidence-12
- claim: In the same 2024 Django benchmark, enabling WAL raised throughput but also raised the failure rate from 20.20 to 27.37 failures/s, and failures fell to about 0.01/s only after switching to IMMEDIATE transactions.
- kind: number
- questions: Q31 · load-bearing: no
- support: S-r1-evidence-04/P3 · rung 1 (attributed) · fit direct · upstream self
  support: S-r1-evidence-04/P4 · rung 1 (attributed) · fit direct · upstream self
  support: S-r1-evidence-04/P5 · rung 1 (attributed) · fit direct · upstream self
- scope: as C-r1-evidence-11
- confidence: medium · flags: none
- conflicts: none

### C-r1-evidence-13
- claim: In the same 2024 Django benchmark, SQLite's write requests reached 6400 ms at the 100th percentile while PostgreSQL's stayed at 460 ms, though SQLite was faster at lower percentiles.
- kind: comparison
- questions: Q31 · load-bearing: no
- support: S-r1-evidence-04/P7 · rung 1 (attributed) · fit direct · upstream self
- scope: best SQLite configuration vs an untuned PostgreSQL on the same machine; one request type
- confidence: medium · flags: none
- conflicts: none

### C-r1-evidence-14
- claim: In a December 2025 benchmark on an Apple M1 Pro MacBook Pro, Anders Murphy reported 44,096 interactive transactions per second with SQLite in WAL mode and synchronous=NORMAL using one writer connection, and 20,654 per second in the same unbatched test with synchronous=FULL.
- kind: number
- questions: Q29, Q31 · load-bearing: no
- support: S-r1-evidence-09/P3 · rung 1 (attributed) · fit direct · upstream self
  support: S-r1-evidence-09/P4 · rung 1 (attributed) · fit direct · upstream self
  support: S-r1-evidence-09/P1 · rung 1 (attributed) · fit partial · upstream self
  support: S-r1-evidence-09/P2 · rung 1 (attributed) · fit partial · upstream self
- scope: macOS laptop (macOS fsync semantics may differ from Linux; not discussed in source); Clojure sqlite4clj; single process; self-published; author disclaims optimality
- confidence: medium · flags: none
- conflicts: see Conflicts

### C-r1-evidence-15
- claim: In the same December 2025 benchmark, Anders Murphy reported 186,157 TPS when writes were batched dynamically through the single writer, and 102,545 TPS with batched writes plus SAVEPOINTs and three concurrent reads per write.
- kind: number
- questions: Q31 · load-bearing: no
- support: S-r1-evidence-09/P5 · rung 1 (attributed) · fit direct · upstream self
  support: S-r1-evidence-09/P6 · rung 1 (attributed) · fit direct · upstream self
- scope: WAL + synchronous=NORMAL; one process; M1 Pro laptop
- confidence: medium · flags: superlative (title "unreasonable effectiveness")
- conflicts: none

### C-r1-evidence-16
- claim: The SQLite WAL documentation states that by default SQLite runs a checkpoint automatically when the WAL file reaches a threshold of 1000 pages.
- kind: number
- questions: Q30 · load-bearing: no
- support: S-r1-evidence-01/P11 · rung 1 · fit direct · upstream self
  support: S-r1-evidence-02/P4 · rung 1 · fit direct · upstream self
- scope: default build; SQLITE_DEFAULT_WAL_AUTOCHECKPOINT can change it
- confidence: high · flags: none
- conflicts: none

### C-r1-evidence-17
- claim: The SQLite WAL documentation describes the default 1000-page WAL as about 4 MB in size.
- kind: number
- questions: Q30 · load-bearing: no
- support: S-r1-evidence-01/P10 · rung 1 · fit direct · upstream self
  support: S-r1-evidence-08/P6 · rung 1 · fit direct · upstream self
- scope: implies a 4096-byte page (see C-r1-evidence-18)
- confidence: high · flags: none
- conflicts: none

### C-r1-evidence-18
- claim: The SQLite PRAGMA documentation states that the default page size for new databases became 4096 bytes beginning with SQLite 3.12.0 (2016-03-29).
- kind: version
- questions: Q30 · load-bearing: no
- support: S-r1-evidence-02/P2 · rung 1 · fit direct · upstream self
- scope: SQLite ≥ 3.12.0; was usually 1024 bytes before
- confidence: high · flags: none
- conflicts: none

### C-r1-evidence-19
- claim: The SQLite WAL documentation states that read performance deteriorates as the WAL file grows, because the time a reader needs to check the WAL is proportional to the WAL's size, and the wal-index reduces but does not remove this cost.
- kind: behaviour
- questions: Q30 · load-bearing: no
- support: S-r1-evidence-01/P7 · rung 1 · fit direct · upstream self
- scope: documented, not quantified; no measurement found
- confidence: high · flags: none
- conflicts: none

### C-r1-evidence-20
- claim: The SQLite WAL documentation states that for transactions larger than about 100 megabytes the rollback journal modes will likely be faster than WAL, that WAL may fail with an I/O or disk-full error for transactions over a gigabyte, and that since version 3.11.0 (2016-02-15) WAL works as efficiently with large transactions as rollback mode.
- kind: comparison
- questions: Q30 · load-bearing: no
- support: S-r1-evidence-01/P3 · rung 1 · fit direct · upstream self
  support: S-r1-evidence-01/P4 · rung 1 · fit direct · upstream self
- scope: same paragraph of wal.html; the 3.11.0 sentence qualifies the preceding ones without saying which still apply
- confidence: medium · flags: none
- conflicts: S-r1-evidence-01/P4 "Beginning with version 3.11.0 (2016-02-15), WAL mode works as efficiently with large transactions as does rollback mode." (tension within one source; see Conflicts)

### C-r1-evidence-21
- claim: The SQLite WAL documentation states that with automatic checkpointing most COMMITs are very fast, but a COMMIT that triggers a checkpoint is much slower.
- kind: behaviour
- questions: Q30 · load-bearing: no
- support: S-r1-evidence-01/P8 · rung 1 · fit direct · upstream self
- scope: default checkpoint strategy
- confidence: high · flags: none
- conflicts: none

### C-r1-evidence-22
- claim: The SQLite WAL documentation says the default 1000-page checkpoint strategy "seems to work well in test applications on workstations" and that other strategies might work better on different platforms or workloads.
- kind: evaluation
- questions: Q30 · load-bearing: no
- support: S-r1-evidence-01/P9 · rung 1 · fit direct · upstream self
- scope: attributed form only; no measurement published
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-evidence-23
- claim: The SQLite documentation estimates that a website with fewer than 100K hits/day should work fine with SQLite, calls this a conservative estimate, and says SQLite has been demonstrated with 10 times that traffic.
- kind: number
- questions: Q31 · load-bearing: no
- support: S-r1-evidence-07/P1 · rung 1 · fit direct · upstream self
- scope: attributed; no journal mode stated; no measurement cited
- confidence: medium · flags: vendor-about-itself
- conflicts: none

### C-r1-evidence-24
- claim: The SQLite documentation states that SQLite supports an unlimited number of simultaneous readers but only one writer at any instant, and that in typical use no lock lasts for more than a few dozen milliseconds.
- kind: behaviour
- questions: Q31 · load-bearing: no
- support: S-r1-evidence-07/P2 · rung 1 · fit direct · upstream self
- scope: attributed; "few dozen milliseconds" is a characterization, not a measurement
- confidence: medium · flags: vendor-about-itself
- conflicts: none

### C-r1-evidence-25
- claim: The SQLite PRAGMA documentation states that all automatic checkpoints are PASSIVE.
- kind: behaviour
- questions: Q30 · load-bearing: no
- support: S-r1-evidence-02/P3 · rung 1 · fit direct · upstream self
- scope: current pragma.html
- confidence: high · flags: none
- conflicts: none

## Conflicts
- C-r1-evidence-10 / C-r1-evidence-11 / C-r1-evidence-14 (size of the synchronous=NORMAL vs FULL effect in WAL mode): S-r1-evidence-03/P1–P2 report 308.5 s (FULL) vs 19.7 s (NORMAL), about 15x; S-r1-evidence-09/P3–P4 report 20,654 vs 44,096 TPS, about 2x; S-r1-evidence-04/P5–P6 report 998.72 vs 1014.35 requests/s, under 2%. Different workloads, hardware and years (2012, 2025, 2024); not settled.
- C-r1-evidence-20: S-r1-evidence-01/P3 recommends a rollback journal mode for transactions over a few dozen megabytes; S-r1-evidence-01/P4, in the same paragraph, says that since 3.11.0 WAL handles large transactions as efficiently as rollback mode. Version/time tension within one source; not settled.

## Speculation and flags
- C-r1-evidence-03: speculation, "might be very slightly slower (perhaps 1% or 2% slower)".
- S-r1-evidence-08 (C-r1-evidence-07, -08, -09): vendor-about-itself, since three co-authors (Hipp, Kennedy, Brasfield) are SQLite developers, though the paper is peer-reviewed.
- S-r1-evidence-07 (C-r1-evidence-23, -24): the SQLite project's own capacity estimate.
- C-r1-evidence-10: exceptional ratio, from a mailing-list reply quoting an unopened upstream message (rung 3).
- C-r1-evidence-14: run on macOS, where fsync() does not by default flush the drive cache; the FULL/NORMAL gap may not carry over to Linux (my observation, not the source's).
- S-r1-evidence-04, S-r1-evidence-09: self-published blog benchmarks, ranked rung 1 only for the attributed "the author measured" form. The verifier may downgrade them to rung 3.
- S-r1-evidence-06/P1, P2: the PDF text spells "filesystems" and "file" with the "ﬁ" ligature, so these passages are quoted as ordered pieces that leave those words out.

## Unused leads
- https://www.cs.utexas.edu/~vijay/slides/apsys17-sqlite-slides.pdf: APSys '17 "The Dangers and Complexities of SQLite Benchmarking" (Purohith, Mohan, Chidambaram) reports up to 11.8x from one parameter and 28x for WAL/NORMAL/F2FS vs DELETE/FULL/Ext4. The PDF fetch returned 404 or 502 (MSR copy https://www.microsoft.com/en-us/research/uploads/prod/2021/10/apsys17-sqlite.pdf gave 502); worth a retry, since it is peer-reviewed and independent.
- https://usenix.org/system/files/conference/atc15/atc15-paper-lee-wongun.pdf: USENIX ATC 2015 WALDIO paper, which may contain WAL vs rollback fsync counts.
- https://sqlite.org/forum/info/aa9fde5a28abc442: a 2021 forum thread where autocheckpoint was the bottleneck in the poster's benchmark (WAL 34 MB vs DB < 10 MB). Belongs to practice-ops.
- https://sqlite.org/forum/info/54e791a519a225de: a 2020 stress test where the WAL grew to about 2 GB. Belongs to practice-ops/cases.
- Zooko Wilcox-O'Hearn's original message in the tahoe-dev December 2012 thread is upstream of S-r1-evidence-03 and was not opened.

## Queries
- "SQLite WAL benchmark synchronous NORMAL FULL" → useful
- "SQLite concurrent writes benchmark web server" → useful
- "\"I/O Stack Optimization for Smartphones\" SQLite WAL journal mode" → useful
- "APSys 2017 SQLite performance configuration paper Chidambaram" → useful (PDF unreachable)
- "SQLite large WAL file read performance measured slowdown" → nothing new
- "sqlite forum WAL size read latency checkpoint benchmark" (sqlite.org only) → nothing new for Q30 measurements
- "\"SQLite: Past, Present, and Future\" VLDB 2022 WAL TATP" → useful
- "SQLite WAL multiple processes writers throughput benchmark busy_timeout" → nothing new (content farms and vendor posts)

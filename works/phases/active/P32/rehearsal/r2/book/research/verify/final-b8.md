# Verification: 20261023-1245-sqlite-wal · final-b8
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 13 · supported 11 · partial 2 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0

## Records

### V-C-r1-evidence-19-1
- claim: C-r1-evidence-19
- source S-r1-evidence-01 · opened: https://www.sqlite.org/wal.html (curl, saved pages/final-b8/S-r1-evidence-01.txt) · quote-match: exact · passage at § "2.3. Performance Considerations" (P7): found verbatim
- looked first: searched the page for "proportional", "checkpoint", "large". The page says read performance falls with WAL size, that the wal-index helps but does not remove this, and that checkpoints at regular intervals keep the WAL small. Nothing on the page quantifies the effect.
- implied: (1) read performance deteriorates as the WAL grows; (2) reason: each reader must check the WAL, time proportional to WAL size; (3) the wal-index makes finding content much faster, but performance still falls off with WAL size. All match the claim; "documented, not quantified" matches.
- verdict: supported · reason: every part of the claim is stated in the passage.
- bar: met (rung 1, descriptive, attributed to the SQLite docs; not load-bearing) · independence: n/a (one source) · currency: current page served 2026-10-23; no strike-through on this paragraph.
- counter: none-found ("SQLite WAL file growth read performance degradation checkpoint starvation", "SQLite WAL reader performance large WAL file slow reads wal-index measured"; currency: the 3.11.0 release log and the current wal.html were read; neither changes this paragraph). Lateral read: SQLite release log 3.11.0 (S-v8-01) confirms the project's own change history is consistent with the docs. No independent measurement of reader slowdown vs WAL size was found.

### V-C-r1-evidence-20-1
- claim: C-r1-evidence-20
- source S-r1-evidence-01 · opened: https://www.sqlite.org/wal.html (curl; saved pages/final-b8/S-r1-evidence-01.txt and .html) · quote-match: exact · passages P3, P4 at § "1. Overview": found verbatim (text)
- looked first: asked what the page says about large transactions. The converted text shows one paragraph with five sentences and no markup. The raw HTML (S-r1-evidence-01.html line 208-217, re-fetched as S-v8-02.html) wraps the first five sentences ("WAL works best with smaller transactions" through "...a few dozen megabytes") in `<s>…</s>` (strike-through). Only the last sentence ("Beginning with version 3.11.0 (2016-02-15), WAL mode works as efficiently with large transactions as does rollback mode.") is outside the strike. The same page strikes the "not possible to open read-only WAL databases" item, which is also fixed by a later version (3.22.0), so the page uses `<s>` for statements that no longer apply. The SQLite 3.11.0 release log says "Enhanced WAL mode so that it works efficiently with transactions that are larger than the cache_size."
- implied: (1) the words "larger than about 100 megabytes … rollback journal modes will likely be faster" are on the page, but struck out; (2) "WAL may fail with an I/O or disk-full error over a gigabyte" is on the page, but struck out; (3) the 3.11.0 sentence is live text and supersedes them. The claim gives all three as current statements and treats the 3.11.0 sentence as a qualifier of them. The researcher's text converter dropped the strike-through, so the "tension" the claim's conflicts line records is in fact a superseded-text marker.
- verdict: partial · reason: the sentences exist verbatim, but the first two are struck through (superseded) on the current page; only the 3.11.0 sentence is the live statement. Using the first two as current documentation would be wrong. · narrower claim: "The current SQLite WAL documentation states that since version 3.11.0 (2016-02-15) WAL mode works as efficiently with large transactions as rollback mode; it shows its older warnings (rollback journal modes likely faster above about 100 MB; WAL may fail with an I/O or disk-full error above a gigabyte) struck through as superseded."
- bar: met for the narrower claim (rung 1, descriptive, attributed; not load-bearing) · independence: n/a · currency: superseded text on the same page; release log S-v8-01 corroborates the 3.11.0 change.
- counter: S-v8-02 (C-v8-02), S-v8-01 (C-v8-01). Queries: "SQLite WAL large transaction slower than rollback journal benchmark", "SQLite 3.11.0 release notes WAL large transactions change", "sqlite.org wal.html WAL works best with smaller transactions strikethrough removed obsolete". No independent benchmark of large-transaction WAL vs rollback was found. A remaining live caveat on the same page (§ "Avoiding Excessively Large WAL Files", "Very large write transactions") says a large change to a large database might result in a large WAL file, because a checkpoint cannot complete during a write transaction.

### V-C-r1-evidence-02-1
- claim: C-r1-evidence-02
- source S-r1-evidence-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage P1 at § "1. Overview": found verbatim
- implied: "WAL uses many fewer fsync() operations" appears in the list of advantages of WAL "instead of a rollback journal". The baseline (rollback journal) comes from the list's introduction, not the sentence itself.
- verdict: supported · reason: stated, with the rollback-journal baseline given by the section's framing.
- bar: met (rung 1, attributed to SQLite docs) · independence: n/a · currency: current page.
- counter: not run

### V-C-r1-evidence-03-1
- claim: C-r1-evidence-03
- source S-r1-evidence-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage P2 at § "1. Overview": found verbatim
- implied: "might be very slightly slower (perhaps 1% or 2% slower)" than the rollback journal, in applications that "do mostly reads and seldom write". An estimate, hedged ("might", "perhaps"). The claim keeps the hedge.
- verdict: supported · reason: matches, including hedge and condition.
- bar: met (rung 1, attributed estimate) · independence: n/a · currency: current page.
- counter: not run

### V-C-r1-evidence-07-1
- claim: C-r1-evidence-07
- source S-r1-evidence-08 · opened: https://www.vldb.org/pvldb/vol15/p3535-gaffney.pdf (pdf → text) · quote-match: exact · passages P1-P4 at p.6: found verbatim
- looked first: read the experiment setup (p.6). SQLite 3.38.0, DuckDB 0.3.2; built with recommended options except SQLITE_DEFAULT_WAL_SYNCHRONOUS "to maintain durability in WAL mode"; TATP: 80% read-only; single client; mean of three trials.
- implied: WAL has "the highest throughput by a wide margin" on both hardware configurations (the comparison set includes DuckDB); about 10 thousand TPS on the cloud server; DELETE is slower than WAL (no ratio given for TATP). All items match the claim. "Highest ... by a wide margin" is against all systems in Figure 2, mainly DuckDB; the claim does not claim a wide margin over DELETE.
- verdict: supported · reason: all numbers, versions and conditions stated.
- bar: met (rung 1, attributed, peer-reviewed paper with three SQLite developers as co-authors) · independence: n/a · currency: SQLite 3.38.0 (2022), older than current.
- counter: not run

### V-C-r1-evidence-08-1
- claim: C-r1-evidence-08
- source S-r1-evidence-08 · opened: same PDF (pdf → text) · quote-match: exact · passage P5 at p.11: found verbatim
- implied: for 100 KB blobs, "SQLite-DELETE is slightly less than half as fast as SQLite-WAL"; reason given by the authors: DELETE writes to the rollback journal and then the database, about twice as many writes, "assuming no checkpoint is triggered by the transaction". Version 3.38.0 from the setup section.
- verdict: supported · reason: matches, including the attribution and condition.
- bar: met (rung 1, attributed) · independence: n/a · currency: 2022 paper.
- counter: not run

### V-C-r1-evidence-09-1
- claim: C-r1-evidence-09
- source S-r1-evidence-08 · opened: same PDF · quote-match: exact · passage P6 at p.11: found verbatim
- implied: for 10 MB blobs, WAL and DELETE have "mostly similar performance"; the default WAL limit is 1000 pages, about 4 MB; a 10 MB write exceeds it and triggers an immediate checkpoint; WAL incurs two writes per update; "increased throughput for greater WAL size limits, but we omit these results". The claim's "about the same" restates "mostly similar".
- verdict: supported · reason: all parts stated; the similarity sentence directly precedes the cited passage on the same page.
- bar: met (rung 1, attributed) · independence: n/a · currency: 2022 paper.
- counter: not run

### V-C-r1-evidence-11-1
- claim: C-r1-evidence-11
- source S-r1-evidence-04 · opened: https://cur.at/TKSPJDi?m=web (redirect to the author's blog; curl, final text titled the Django SQLite benchmark) · quote-match: exact · passages P1-P6 at § "Default Settings" and § "Results": found verbatim
- looked first: the post's TL;DR and sections. It is a self-published benchmark; the author says "take the results with a grain of salt".
- implied: write-heavy, about half the requests write, the rest read ten rows; locust, 100 concurrent users, spawn rate 2/s, 100 s runs; Django 5.0 defaults 611.14 req/s; WAL 781.00; IMMEDIATE 998.72; synchronous=NORMAL 1014.35. The steps are sequential and cumulative by the post's order ("increased the throughput slightly" relative to the previous step), but the post does not use the word "cumulative". Memory-mapped I/O adds 1017.25 afterward (not in the claim).
- verdict: supported · reason: every number and setting matches; cumulative reading is a direct inference from the post's order.
- bar: met for the attributed form (rung 1 for the author's own results; blog, no peer review) · independence: n/a · currency: 2024 post; hardware and SQLite version not stated.
- counter: not run

### V-C-r1-evidence-12-1
- claim: C-r1-evidence-12
- source S-r1-evidence-04 · same page · quote-match: exact · passages P3-P5 at § "Results": found verbatim
- implied: failures/s were 20.20 at defaults, 27.37 with WAL ("throughput has increased, but we are also getting more errors"), 0.01 with IMMEDIATE. The "All results" tables show the failures concentrated in one deferred-transaction endpoint (/read_write_transaction/).
- verdict: supported · reason: numbers and ordering match.
- bar: met (attributed, rung 1 for own results) · independence: n/a · currency: 2024 post.
- counter: not run

### V-C-r1-evidence-14-1
- claim: C-r1-evidence-14
- source S-r1-evidence-09 · opened: https://andersmurphy.com/2025/12/02/100000-tps-over-a-billion-rows-the-unreasonable-effectiveness-of-sqlite.html (curl) · quote-match: exact · passages P1-P4: found verbatim
- looked first: the harness, prelude and epilogue. The post says "These benchmarks are not meant to be perfect or even optimal." The epilogue's "Pragma synchronous FULL" section re-ran the SQLite numbers after readers objected that NORMAL was unfair.
- implied: MacBook Pro (2021), Apple M1 Pro, 16 GB; pragmas include journal_mode WAL and synchronous NORMAL; single writer connection; interactive transactions (two updates in a transaction); 44096 TPS in the unbatched "no network" test; with FULL, 20654 in the same row of the updated table. The text printed 13756 (Postgres) beside 20654 (SQLite). The post does not discuss macOS fsync semantics; on macOS plain fsync is not a full flush unless fullfsync is set, so FULL numbers there may not reflect physical durability. This is a caveat for the chapter, not a contradiction.
- verdict: supported · reason: numbers, hardware, mode and settings match.
- bar: met for the attributed form (rung 1 for the author's own measurement; blog) · independence: n/a · currency: December 2025 post with later epilogue; no retraction of these numbers.
- counter: not run

### V-C-r1-evidence-18-1
- claim: C-r1-evidence-18
- source S-r1-evidence-02 · opened: https://www.sqlite.org/pragma.html (curl) · quote-match: exact · passage P2 at § "PRAGMA page_size" (the converter labels it "List Of PRAGMAs", line 437): found verbatim
- implied: the full sentence is "For many years, the default page size was almost always 1024 bytes, but beginning with SQLite version 3.12.0 (2016-03-29), the default page size increased to 4096." The paragraph also says SQLite assigns the page size "based on platform and filesystem" when a database is created.
- verdict: supported · reason: version, date and value stated; the platform-dependence note is minor context.
- bar: met (rung 1) · independence: n/a · currency: current page.
- counter: not run

### V-C-r1-evidence-23-1
- claim: C-r1-evidence-23
- source S-r1-evidence-07 · opened: https://www.sqlite.org/whentouse.html (curl) · quote-match: exact · passage P1 at § "1. Situations Where SQLite Works Well" (line 35): found verbatim
- implied: "fewer than 100K hits/day should work fine"; "a conservative estimate, not a hard upper bound"; "demonstrated to work with 10 times that amount of traffic". The page names no journal mode and cites no measurement.
- verdict: supported · reason: all parts stated; the claim is attributed to the SQLite documentation.
- bar: met (rung 1, vendor about itself, attributed) · independence: n/a · currency: current page.
- counter: not run

### V-C-r1-evidence-24-1
- claim: C-r1-evidence-24
- source S-r1-evidence-07 · opened: https://www.sqlite.org/whentouse.html (curl) · quote-match: exact · passage P2 at § "2. Situations Where A Client/Server RDBMS May Work Better" (line 74): found verbatim
- implied: "unlimited number of simultaneous readers … only allow one writer at any instant". The next sentences are "For many situations, this is not a problem. Writers queue up. Each application does its database work quickly and moves on, and no lock lasts for more than a few dozen milliseconds." The source scopes the lock-duration statement to "many situations", not "typical use".
- verdict: partial · reason: the readers/writer statement is exact; the claim's "in typical use" is not what the page says (it says "for many situations"). · narrower claim: "The SQLite documentation states that SQLite supports an unlimited number of simultaneous readers but only one writer at any instant, and that in many situations each application does its work quickly so that no lock lasts for more than a few dozen milliseconds."
- bar: met for the narrower claim (rung 1, vendor about itself, attributed) · independence: n/a · currency: current page.
- counter: not run

## Counter-evidence

### S-v8-01
- url: https://www.sqlite.org/releaselog/3_11_0.html · canonical: sqlite.org/releaselog/3_11_0.html
- title: SQLite Release 3.11.0 On 2016-02-15 · authors: n/a · publisher: SQLite (sqlite.org)
- date: 2016-02-15 · version: SQLite 3.11.0
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project (Hwaci) · upstream: none
- lateral: the SQLite project's own release log; it gives the project's own record of the change that the wal.html text refers to.
- passages:
  - P1 · § "SQLite Release 3.11.0 On 2016-02-15": "Enhanced WAL mode so that it works efficiently with transactions that are larger than the cache_size."

### S-v8-02
- url: https://www.sqlite.org/wal.html · canonical: sqlite.org/wal.html
- title: Write-Ahead Logging · authors: n/a · publisher: SQLite (sqlite.org)
- date: undated (current page) · version: page as served 2026-10-23
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: SQLite project (Hwaci) · upstream: none
- lateral: the SQLite project's own documentation. The raw HTML (pages/final-b8/S-v8-02.html, lines 208-217) wraps the first five sentences of this passage in `<s>…</s>`; the page's text conversion drops that markup. The same page also strikes the "read-only WAL databases" item that its text says was fixed in 3.22.0, so the strike marks superseded statements.
- passages:
  - P1 · § "1. Overview": "WAL works best with smaller transactions. WAL does not work well for very large transactions. For transactions larger than about 100 megabytes, traditional rollback journal modes will likely be faster. For transactions in excess of a gigabyte, WAL mode may fail with an I/O or disk-full error. It is recommended that one of the rollback journal modes be used for transactions larger than a few dozen megabytes. Beginning with version 3.11.0 (2016-02-15), WAL mode works as efficiently with large transactions as does rollback mode." · gloss: "In the HTML, everything up to and including 'a few dozen megabytes.' is inside <s>…</s> (struck through); the 3.11.0 sentence is not."

### C-v8-01
- claim: The SQLite 3.11.0 release log (2016-02-15) lists, under general improvements, that WAL mode was enhanced so that it works efficiently with transactions larger than the cache_size.
- kind: version
- questions: Q30 · load-bearing: no
- support: S-v8-01/P1 · rung 1 · fit direct · upstream self
- scope: SQLite 3.11.0 and later
- confidence: high · flags: none
- conflicts: S-r1-evidence-01/P3 (the older 100 MB / gigabyte warnings, now struck through)

### C-v8-02
- claim: On the current sqlite.org WAL documentation page, the sentences saying that rollback journal modes will likely be faster for transactions larger than about 100 megabytes, and that WAL may fail with an I/O or disk-full error above a gigabyte, are shown struck through, followed by a live sentence that since 3.11.0 WAL works as efficiently with large transactions as rollback mode.
- kind: behaviour
- questions: Q30 · load-bearing: no
- support: S-v8-02/P1 · rung 1 · fit direct · upstream self
- scope: wal.html as served 2026-10-23; evidence is the HTML `<s>` markup (see S-v8-02 lateral line)
- confidence: high · flags: none
- conflicts: S-r1-evidence-01/P3 as read without markup (C-r1-evidence-20)

## Leads
- https://www.sqlite.org/docsrc/info/166fc2da3a94e497 — SQLite docs check-in history, possibly the edit that struck the large-transaction sentences; not opened.
- https://forum.syncthing.net/t/is-syncthing-v2-with-very-large-folders-possible/26082?page=4 — single-user report of a WAL growing past 41 GiB under checkpoint starvation; forum, rung 3.

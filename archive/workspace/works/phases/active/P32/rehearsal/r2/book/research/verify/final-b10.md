# Verification: 20261023-1245-sqlite-wal · final-b10
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 11 · supported 11 · partial 0 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0
## Records
### V-C-r1-criticism-14-1
- claim: C-r1-criticism-14
- source S-r1-criticism-01 · opened: https://www.sqlite.org/wal.html (curl, saved pages/final-b10/S-r1-criticism-01.txt) · quote-match: exact · passage at § "11. The WAL-Reset Bug" (P16): found verbatim
- looked first: section 11 says the bug is likely present in 3.7.0 (2010-07-21) through 3.51.2 (2026-01-09), fixed in 3.51.3 (2026-03-13) and later, with backports 3.44.6 and 3.50.7. Its "Key points" give the trigger condition. §11.1 gives a 6-step sequence (complete checkpoint, second checkpoint starts, another connection commits and resets the WAL, more transactions, a third checkpoint). The page was last updated 2026-08-25. An 2026-08-24 update says Phil Eaton found a reproducer without the special test hack.
- implied: WAL mode only; two or more connections on the same file; separate threads or processes; the connections attempt to write or checkpoint at the same instant. All present in the passage ("those two connections" in the page, "those connections" in the claim).
- verdict: supported · reason: the claim restates the passage and attributes it to the docs. The claim names no versions. The "likely present in 3.7.0 to 3.51.2" hedge and the fix in 3.51.3 are on the page. For standalone use, add "in SQLite 3.7.0 to 3.51.2 (fixed in 3.51.3)".
- bar: met (rung 1 official docs, attributed descriptive claim) · independence: n/a · currency: page updated 2026-08-25; later SQLite releases (3.53.x) carry the fix, so the page is current.
- counter: S-v10-02 (C-v10-01). Not a contradiction of the trigger conditions: Antithesis's workload, concurrent writes and checkpoints, fits them. It does cut against how rare the docs make the trigger sound. Also queries "Another look at SQLite's WAL-Reset bug Phil Eaton reproducer", "SQLite WAL-reset bug corruption real-world likelihood criticism", "SQLite 3.51.3 release notes WAL-reset corruption fix 3.51.4 later".

### V-C-r1-criticism-18-1
- claim: C-r1-criticism-18
- source S-r1-criticism-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage at § "11.2. Low Probability Of Occurrence" (P21, P22): found verbatim (both in one paragraph, line 144)
- looked first: §11.2 says the developers could not reproduce the bug organically and needed a sqlite3_test_control() callback hack. The Eaton update says a reproducer exists without the hack. The paragraph then says to upgrade, that it is not an emergency, and that the telemetry-based rate is at or below that of SSD malfunctions and/or cosmic-ray hits. It adds "unless you are doing something really unusual, you are unlikely to ever encounter this problem."
- implied: "based on available telemetry"; the occurrence rate in the wild "appears to be less than or equal to" the expected rate of SSD malfunctions and/or cosmic-ray hits; developers should upgrade; "this is not an emergency". All present. The telemetry is not published on the page, as the claim's scope notes.
- verdict: supported · reason: the claim is explicitly attributed ("The SQLite documentation says") and matches the wording. It supports only the attributed form. The estimate is the SQLite developers' own, about their own product, and the underlying telemetry is not shown.
- bar: met for the attributed form (rung 1); not enough for the chapter to state the rarity in its own voice (that would be evaluative and need two rung-2 sources). · independence: n/a · currency: page updated 2026-08-25, after the Eaton reproducer note, and the paragraph was left in place.
- counter: S-v10-02 (C-v10-01) is a tension, and S-v10-03 (C-v10-02) is context. Antithesis (a vendor) reports it hit the bug in 15 minutes with a "completely generic workload" under its instrumented simulation. Tailscale reports 19 corruptions in six months in production, and says its manual, aggressive checkpointing made it more exposed. Neither measures the general rate, so the docs' wording stands as an attributed estimate. Queries as above.

### V-C-r1-cases-16-1
- claim: C-r1-cases-16
- source S-r1-cases-09 · opened: https://docs.djangoproject.com/en/dev/ref/databases/ (curl, saved as S-r1-cases-09.txt) · quote-match: exact · passage at § "Setting pragma options" (P1, P2): found verbatim
- implied: Django dev docs say pragma options are set with init_command in OPTIONS; the example is "PRAGMA synchronous=3; PRAGMA cache_size=2000;"; the page has no mention of WAL (grep -c -i 'WAL' = 0).
- verdict: supported · reason: all parts are present. The parenthetical "(EXTRA)" comes from SQLite's synchronous numbering, not from the Django page. The page says "extra durability of synchronous writes", which agrees.
- bar: met (not load-bearing, one rung-1 source) · independence: n/a · currency: dev docs read 2026-10-23.
- counter: not run

### V-C-r1-cases-17-1
- claim: C-r1-cases-17
- source S-r1-cases-09 · same page · quote-match: exact · passages P3, P4, P5 at § "Transactions behavior" and § "Database is locked errors": found (P3 and P4 are ellipsised in the entry; the source lines read "To make sure your transactions wait until timeout before raising “Database is Locked”, change the transaction mode to IMMEDIATE." and "This will make SQLite wait a bit longer before throwing “database is locked” errors; it won’t really do anything to solve them.")
- implied: default is DEFERRED; set "transaction_mode": "IMMEDIATE" so transactions wait until timeout before raising "database is locked"; raising the timeout only makes SQLite wait longer and does not really solve them.
- verdict: supported · reason: all parts present. "Recommends" is a mild paraphrase of an instruction phrased as "to make sure ... change to IMMEDIATE".
- bar: met · independence: n/a · currency: dev docs 2026-10-23.
- counter: not run

### V-C-r1-cases-18-1
- claim: C-r1-cases-18
- source S-r1-cases-02 · opened: https://litestream.io/tips/ (curl) · quote-match: exact · passages P3, P4 at § "Synchronous PRAGMA": found verbatim
- implied: the page says in WAL mode fsync calls can be relaxed, "you can change the synchronous mode to NORMAL (it typically defaults to FULL)", and "This mode will ensure that the fsync() calls are only called when the WAL becomes full and has to checkpoint to the main database file."
- verdict: supported · reason: it is a tip on a "Tips & Caveats" page, so "recommends" is a fair reading, though the wording is "you can". It holds in the attributed form. For the fsync description, SQLite's wal.html (S-r1-criticism-01, §2.3, line 75) says "with PRAGMA synchronous set to NORMAL, the checkpoint is the only operation to issue an I/O barrier or sync operation". That agrees with Litestream's description, which says "when the WAL becomes full" and simplifies when checkpoints run.
- bar: met (attributed, rung 1) · independence: n/a · currency: undated docs for v0.5.x.
- counter: not run

### V-C-r1-cases-19-1
- claim: C-r1-cases-19
- source S-r1-cases-01 · opened: https://litestream.io/how-it-works/ (curl) · quote-match: exact · passage at § "From WAL to LTX" (P1): found verbatim. P2 at § "Understanding the WAL": found. S-r1-cases-02/P5 (https://litestream.io/tips/): found.
- implied: "takes over the checkpointing process"; long-running read transaction prevents any other process from checkpointing and restarting the WAL; it reads new WAL pages and manually calls SQLite checkpoints as necessary.
- verdict: supported · reason: direct match.
- bar: met · independence: n/a · currency: v0.5.x docs.
- counter: not run

### V-C-r1-cases-20-1
- claim: C-r1-cases-20
- source S-r1-cases-02 · tips page · quote-match: exact · passages P6, P7, P8 at § "Disable autocheckpoints for high write load servers": found verbatim
- implied: under high load with many small write transactions (e.g. tens of thousands per second) the app's SQLite can checkpoint in between Litestream's checkpoints and make it miss a WAL update; Litestream then takes a fresh full snapshot; recommended to run the app with autocheckpointing disabled; v0.5.0+ detection improvements reduce the need for full snapshots.
- verdict: supported · reason: all parts present.
- bar: met · independence: n/a · currency: v0.5.x docs.
- counter: not run

### V-C-r1-cases-21-1
- claim: C-r1-cases-21
- source S-r1-cases-02 · tips page · quote-match: exact · passages P1, P2 at § "Busy timeout": found verbatim
- implied: Litestream requires periodic but short write locks when checkpointing; SQLite returns an error by default if the app tries to take a write lock at the same time; recommended busy_timeout is 5 seconds.
- verdict: supported · reason: all parts present. The page says "recommended to set this to 5 seconds", which fits the claim.
- bar: met · independence: n/a · currency: v0.5.x docs.
- counter: not run

### V-C-r1-cases-22-1
- claim: C-r1-cases-22
- source S-r1-cases-03 · opened: https://litestream.io/guides/wal-truncate-threshold/ (curl) · quote-match: exact · passages P1, P2, P3: found verbatim (§ tiers 1-3)
- implied: truncate-page-n 121359 ("Default: ~500MB", trigger above 121,359 pages); min-checkpoint-page-count 1000 ("Default: ~4MB", PASSIVE); checkpoint-interval 1m ("Default: 1 minute", PASSIVE). The page also says "Only runs if WAL has at least 1 page" for the interval checkpoint.
- verdict: supported · reason: the numbers and defaults match. Read the claim's "emergency TRUNCATE" together with C-r1-cases-23: from v0.5.15 the page says tier 1 tries a PASSIVE checkpoint first and falls back to TRUNCATE only when that fails. The "~4 MB" and "~500 MB" figures are the page's own and assume 4 KiB pages.
- bar: met · independence: n/a · currency: v0.5.x docs.
- counter: not run

### V-C-r1-cases-23-1
- claim: C-r1-cases-23
- source S-r1-cases-03 · same page · quote-match: exact · passages P4, P5 at § "Passive-first truncation", P9 at § "Detecting Write Blocking": found verbatim
- implied: v0.5.15 crossing truncate-page-n no longer forces a blocking checkpoint immediately and tries a PASSIVE one first; a genuine TRUNCATE runs only when passive does not bring the WAL back below the threshold, e.g. a long-lived reader; a forced TRUNCATE takes a full boundary snapshot while holding the write lock, which can stall writers on a large database; a forced TRUNCATE "waits for both all active readers AND writers".
- verdict: supported · reason: all parts present.
- bar: met · independence: n/a · currency: page mentions v0.5.15.
- counter: not run

### V-C-r1-cases-24-1
- claim: C-r1-cases-24
- source S-r1-cases-03 · same page · quote-match: exact · passages P6, P7 at § "Disabling TruncatePageN (Recommended for Long-Read Apps)": found verbatim
- implied: with `truncate-page-n: 0` the Advantages list says "Never blocks writes under any circumstances" and the Disadvantages list says "WAL can grow unbounded if read transactions prevent checkpointing". The config option is set to 0 in the page's own YAML ("Disable TRUNCATE checkpoints").
- verdict: supported · reason: both statements are on the page, in the form of a configuration trade-off list. "Never blocks writes under any circumstances" is Litestream's own claim, so keep the attribution. The note in the entry about P8 (PASSIVE "returns SQLITE_BUSY if readers or writers are active") is outside this claim. I did not compare it with SQLite's c3ref/pragma text.
- bar: met (attributed) · independence: n/a · currency: v0.5.x docs.
- counter: not run

## Counter-evidence
### S-v10-02
- url: https://antithesis.com/blog/2026/wal-reset-bug/ · canonical: antithesis.com/blog/2026/wal-reset-bug
- title: Breaking the WAL · authors: Carl Sverre (Senior Software Engineer) · publisher: Antithesis
- date: 2026-08-12 · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: vendor engineering post · peer-review: no
- owner: Antithesis Operations LLC (a testing-platform vendor with a stake in showing the tool finds bugs) · upstream: quotes the SQLite wal.html text
- lateral: vendor's own blog; the post is marketing-adjacent and ends "If you have a gnarly database issue, call me." Rung 1 for what the vendor did in its own run, not for how likely the bug is in production.
- passages:
  - P1 · § "Breaking the WAL": "Notably, this is a completely generic workload. It just runs writes and checkpoints concurrently – things you'd expect to actually happen in production, all the time."
  - P2 · § "Breaking the WAL": "On my first run, Antithesis caught the bug in 15 mins."

### C-v10-01
- claim: Antithesis reports (2026-08-12) that, on an instrumented SQLite 3.51.2 under its testing platform, a workload of concurrent writes and checkpoints it calls "completely generic" triggered the WAL-reset bug in 15 minutes.
- kind: behaviour
- questions: Q32 · load-bearing: no (counter-note)
- support: S-v10-02/P1, S-v10-02/P2 · rung 1 (attributed, vendor about its own test) · fit direct · upstream self
- scope: Antithesis's deterministic simulation environment with assertions, not a production rate. "Generic" is the vendor's characterization.
- confidence: medium · flags: vendor-about-itself
- conflicts: S-r1-criticism-01/P17 "It is unlikely to occur in common use." (partial tension: the trigger is concurrent writes plus checkpoints, which is the docs' own condition, but the vendor says it needs no unusual pattern)

### S-v10-03
- url: https://tailscale.com/blog/sqlite-wal-reset-bug · canonical: tailscale.com/blog/sqlite-wal-reset-bug
- title: How Tailscale helped find the SQLite WAL-Reset bug · authors: n/a · publisher: Tailscale
- date: n/a (about 2026-08) · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: vendor engineering post · peer-review: no
- owner: Tailscale · upstream: none
- lateral: the company that hit the bug in production and reported it to SQLite. The post is its engineering account.
- passages:
  - P1 · § (body): "In total, we faced 19 separate instances of database corruption over six months before we finally resolved the underlying bug."
  - P2 · § (body): "They also explained why we were more likely to hit the bug than other SQLite users: we take manual control of the checkpointing process, and we checkpoint very aggressively."

### C-v10-02
- claim: Tailscale reports (2026) 19 separate instances of database corruption over six months in its production control plane from the WAL-reset bug, and says the SQLite developers explained it was more likely to hit the bug because it manually controls checkpointing and checkpoints very aggressively.
- kind: fact
- questions: Q32 · load-bearing: no
- support: S-v10-03/P1, S-v10-03/P2 · rung 1 (attributed, company about its own system) · fit direct · upstream self
- scope: Tailscale's control-plane shards only
- confidence: medium · flags: vendor-about-itself
- conflicts: none (it agrees with the docs' "unusual usage" account; shows the bug is real at scale)

## Leads
- https://theconsensus.dev/p/2026/08/23/another-look-at-sqlite-wal-reset.html — "Another look at SQLite's WAL-Reset bug", the Eaton reproducer post linked from wal.html. Returned HTTP 403 to curl and WebFetch, so it was not opened. It would show how generic the reproducer is.
- https://www.techzine.eu/news/infrastructure/143585/old-sqlite-bug-caused-months-of-outages-at-tailscale/ — secondary report on the Tailscale story, seen only in a search result and not opened.

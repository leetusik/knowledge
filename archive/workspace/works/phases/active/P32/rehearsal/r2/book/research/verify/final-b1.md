# Verification: 20261023-1245-sqlite-wal · final-b1
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 13 · supported 13 · partial 0 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0

All pages were fetched fresh with curl and converted with pagetext.py into /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s9/ws/works/phases/active/P90/book/research/pages/final-b1/ (named by the findings' source ids). Every cited passage returned `found` from `--find`. The wal.html page reads "last updated on 2026-08-25"; pragma.html "last updated on 2026-10-04"; walformat.html "last updated on 2025-05-10".

## Records
### V-C-r1-found-rw-05-1
- claim: C-r1-found-rw-05
- source S-r1-found-rw-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage at § "2.2. Concurrency" (P5): found verbatim
- looked first: wal.html § 2.2 says each reader remembers the last valid commit record in the WAL (the "end mark"); readers may have different end marks; the end mark is fixed for the transaction. § 2 of fileformat2 (P18) independently describes the same through mxFrame.
- implied: reader records last valid commit record location at read start; "end mark" is the doc's name for it; unchanged for the whole transaction; single read transaction sees the database as of a single point in time. All four items match.
- verdict: supported · reason: every element stated directly in P5.
- bar: met (rung 1, descriptive, SQLite's own docs) · independence: n/a (one rung-1 source suffices for descriptive claim) · currency: page updated 2026-08-25; no change noted.
- counter: none-found ("SQLite WAL mode readers can block writers limitations", "SQLite WAL read transaction snapshot changes during transaction wal-index mxFrame bug", "SQLite wal2 mode BEGIN CONCURRENT multiple writers WAL single writer superseded")

### V-C-r1-found-rw-11-1
- claim: C-r1-found-rw-11
- source S-r1-found-rw-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage at § "2.2. Concurrency" (P8): found verbatim
- looked first: § 2.2 says writers only append to the end of the WAL, do not interfere with readers, so both run at once; one WAL file means one writer at a time.
- implied: append-only writers; writers and readers concurrent; only one writer at a time because there is only one WAL file. The claim is framed as "SQLite's documentation says", matching the attributed form.
- verdict: supported · reason: the claim restates P8 nearly word for word, with attribution.
- bar: met (rung 1, descriptive/attributed) · independence: n/a · currency: current as of 2026-08-25 page update.
- counter: none-found (same three queries as above). Note: the SQLite BEGIN CONCURRENT branch doc (sqlite.org/src/doc/begin-concurrent/doc/begin_concurrent.md) lets several writers work at once in WAL or WAL2 mode, but it is a separate branch enhancement and the page itself says "At most one writer may hold this lock at any one time" for commit; it does not contradict the claim about standard SQLite documentation. Listed under Leads.

### V-C-r1-found-rw-12-1
- claim: C-r1-found-rw-12
- source S-r1-found-rw-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage at § "1. Overview" (P1): found verbatim
- looked first: § 1 has a list headed "Advantages include:" containing "WAL provides more concurrency as readers do not block writers and a writer does not block readers." The same section lists disadvantages. Elsewhere, § 3.2 / § 6 note that RESTART and TRUNCATE checkpoints may block readers, and walformat § 3 says recovery holds locks that block reading of WAL transactions; none of that negates the stated advantage.
- implied: SQLite docs list the property as an advantage of WAL (versus rollback journal mode); the property is "readers do not block writers and a writer does not block readers". Matches.
- verdict: supported · reason: the passage sits under the "Advantages include:" list and states exactly the claimed property.
- bar: met (rung 1, attributed form "SQLite's documentation lists as an advantage") · independence: n/a · currency: current. Flag vendor-about-itself is handled by the attributed phrasing.
- counter: none-found (same three queries as above)

### V-C-r1-found-rw-15-1
- claim: C-r1-found-rw-15
- source S-r1-found-rw-03 · opened: https://www.sqlite.org/isolation.html (curl) · quote-match: exact · passage at § "Isolation And Concurrency" (P4): found verbatim
- implied: X holds a read snapshot, Y commits, X's attempt to escalate to write fails with SQLITE_BUSY_SNAPSHOT because the snapshot is no longer the latest; allowing it would fork history, which SQLite does not support. The example follows the paragraph on WAL-mode snapshot isolation.
- verdict: supported · reason: all elements directly stated.
- bar: met (rung 1, descriptive, not load-bearing) · independence: n/a · currency: current.
- counter: not run

### V-C-r1-found-rw-16-1
- claim: C-r1-found-rw-16
- source S-r1-found-rw-04 · opened: https://www.sqlite.org/walformat.html (curl) · quote-match: exact · passage at § "3. Recovery" (P6): found verbatim
- implied: during recovery of the global shared-memory WAL-index, exclusive locks on WRITE, CKPT, RECOVER and READ_LOCK(1)-(4); all WAL-index locks except WAL_READ_LOCK(0); prevents other threads from writing and from reading transactions held in the WAL until recovery completes. Matches. (Recovery is run by the first thread to connect.)
- verdict: supported · reason: direct match.
- bar: met (rung 1) · independence: n/a · currency: page last updated 2025-05-10.
- counter: not run

### V-C-r1-found-rw-25-1
- claim: C-r1-found-rw-25
- source S-r1-found-rw-04 · opened: https://www.sqlite.org/walformat.html (curl) · quote-match: exact · passage at § "1.3. The Wal-Index or "-shm" file" (P7): found verbatim
- source S-r1-found-rw-02 · opened: https://www.sqlite.org/fileformat2.html (curl) · quote-match: exact · passage at § "4.6. WAL-Index Format" (P19): found verbatim
- implied: -shm holds no database content (P7); not required to recover after a crash (P7); transient and reconstructed from the WAL after a crash (P19). All three match.
- verdict: supported · reason: both passages together cover each part.
- bar: met (rung 1) · independence: n/a (same owner; one source suffices) · currency: current.
- counter: not run

### V-C-r1-found-rw-26-1
- claim: C-r1-found-rw-26
- source S-r1-found-rw-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passages at § "2. How WAL Works" (P9, P2): found verbatim
- source S-r1-found-rw-03 · opened: https://www.sqlite.org/isolation.html (curl) · quote-match: exact · passage at § "Isolation And Concurrency" (P6): found verbatim
- implied: rollback journal copies original unchanged content to a separate journal and writes changes directly into the database file; COMMIT occurs when the journal is deleted (P9); "The WAL approach inverts this. The original content is preserved in the database file and the changes are appended into a separate WAL file." (P2). Matches, and the "inverse" is attributed to the docs.
- verdict: supported · reason: direct statements; "inverse" is an attributed characterisation.
- bar: met (rung 1; attributed form for the comparison) · independence: n/a · currency: current.
- counter: not run

### V-C-r1-found-rw-27-1
- claim: C-r1-found-rw-27
- source S-r1-found-rw-06 · opened: https://www.sqlite.org/releaselog/3_7_0.html (curl) · quote-match: exact · passage at § "SQLite Release 3.7.0 On 2010-07-21" (P1): found verbatim ("Added support for write-ahead logging.")
- source S-r1-found-rw-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage at § "1. Overview" (P10): found verbatim
- source S-r1-found-rw-02 · opened: https://www.sqlite.org/fileformat2.html (curl) · quote-match: exact · passage at § "4. The Write-Ahead Log" (P20): found verbatim
- implied: WAL added in 3.7.0; released 2010-07-21; "The default method ... is a rollback journal" (present tense, page updated 2026-08-25). Also isolation.html says rollback mode (DELETE) "is the current default behavior".
- verdict: supported · reason: version, date and default all stated directly.
- bar: met (rung 1) · independence: n/a · currency: wal.html updated 2026-08-25 still says rollback journal is the default.
- counter: not run

### V-C-r1-found-rw-28-1
- claim: C-r1-found-rw-28
- source S-r1-found-rw-01 · opened: https://www.sqlite.org/wal.html (curl) · quote-match: exact · passage at § "2.3. Performance Considerations" (P11): found verbatim
- implied: "Write transactions are very fast since they only involve writing the content once (versus twice for rollback-journal transactions) and because the writes are all sequential." The claim is attributed ("SQLite's documentation says") and drops the "very fast" evaluation, which keeps it descriptive.
- verdict: supported · reason: once vs twice and sequential writes both stated.
- bar: met (rung 1, attributed comparison) · independence: n/a · currency: current.
- counter: not run

### V-C-r1-found-ckpt-03-1
- claim: C-r1-found-ckpt-03
- source S-r1-found-ckpt-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at § "2.3. Performance Considerations" (P6): found verbatim
- implied: pages transferred WAL to database in ascending order; "even then there will typically be many seek operations"; "These factors combine to make checkpoints slower than write transactions" (factors include syncs and seeks). Claim is attributed to the docs.
- verdict: supported · reason: direct match, attribution kept.
- bar: met (rung 1, attributed) · independence: n/a · currency: current.
- counter: not run

### V-C-r1-found-ckpt-08-1
- claim: C-r1-found-ckpt-08
- source S-r1-found-ckpt-03 · opened: https://sqlite.org/pragma.html (curl) · quote-match: exact · passages at § "List Of PRAGMAs" (P1, P2): found verbatim
- implied: "Each time a transaction is committed or a WAL file resets, SQLite compares the size ... and if the ... WAL file is larger it is truncated to the limit."; "The default journal size limit is -1 (no limit)." Matches (claim narrows to the WAL-reset case, which is covered).
- verdict: supported · reason: direct match.
- bar: met (rung 1) · independence: n/a · currency: pragma page updated 2026-10-04.
- counter: not run

### V-C-r1-found-ckpt-09-1
- claim: C-r1-found-ckpt-09
- source S-r1-found-ckpt-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at § "2.3. Performance Considerations" (P8): found verbatim
- implied: "with PRAGMA synchronous set to NORMAL, the checkpoint is the only operation to issue an I/O barrier or sync operation (fsync() on unix or FlushFileBuffers() on windows)". Matches, attributed to the docs.
- verdict: supported · reason: direct match.
- bar: met (rung 1) · independence: n/a · currency: current.
- counter: not run

### V-C-r1-found-ckpt-11-1
- claim: C-r1-found-ckpt-11
- source S-r1-found-ckpt-01 · opened: https://sqlite.org/wal.html (curl) · quote-match: exact · passage at § "6. Avoiding Excessively Large WAL Files" (P12): found verbatim
- implied: "the WAL file accumulates about 1000 pages (and is thus about 4MB in size)". The claim attributes the phrase to the docs and does not assert the page size; the 4096-byte page size is the claim's own note, not in the passage.
- verdict: supported · reason: the claim as written (what the docs say) matches. A chapter must not state "4MB" in its own voice without noting the page size.
- bar: met (rung 1, attributed) · independence: n/a · currency: current.
- counter: not run

## Counter-evidence
none-found for the main claims C-r1-found-rw-05, C-r1-found-rw-11 and C-r1-found-rw-12. Queries run: "SQLite WAL mode readers can block writers limitations" (results echoed the SQLite docs and second-hand summaries; no contradicting source); "SQLite WAL read transaction snapshot changes during transaction wal-index mxFrame bug" (results about walTryBeginRead retry logic and a 16-year-old WAL-reset bug, which concerns writer/checkpointer, not reader snapshot stability); currency query "SQLite wal2 mode BEGIN CONCURRENT multiple writers WAL single writer superseded" (BEGIN CONCURRENT and wal2 are branch features, not shown as superseding WAL's single-writer rule). The main supporting source (sqlite.org) is the owner's own documentation and was checked laterally in the findings entry.

## Leads
- https://sqlite.org/src/doc/begin-concurrent/doc/begin_concurrent.md — branch feature that allows several concurrent writers in WAL/WAL2 mode; a chapter stating "only one writer" should say it holds for standard SQLite.
- https://sqlite.org/src/doc/wal2/doc/wal2.md — wal2 mode, a variant with two WAL files; not part of standard WAL.
- https://canonical.com/blog/hunting-a-16-year-old-sqlite-bug-with-tla-is-dqlite-affected — blog about the WAL-reset bug (rung 3); the wal.html § 11 documents it.

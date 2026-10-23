# Plan: 20261023-1245-sqlite-wal
- tier: 3 (breadth 3: more than five subtopics — snapshots, the writer, the -wal file, the wal-index, checkpoints, durability, busy handling, growth, backups, filesystems · nesting 2: growth and SQLITE_BUSY each rest on 2–3 dependent mechanisms · exploration 2: SQLite version and the reader's drivers unstated) · wave 1: 8 · per round: ≤ 6 (book, §9.2) · budget: target 15–25 / hard cap 40 tool calls per web researcher · ceiling: 45 researcher and gap-reviewer dispatches (book, §9.2)

## Scouting
- "SQLite WAL mode production" → mostly rung-3 production guides (victoria.dev, oneuptime, Laravel posts, jacar.es) that repeat WAL + `synchronous=NORMAL` + busy timeout + `.backup`/`VACUUM INTO`; leads only, to follow upstream to sqlite.org.
- "SQLite WAL checkpoint starvation" → the SQLite forum (a checkpoint cannot reset the WAL while another connection holds a read transaction), Syncthing forum threads (a WAL past 41 GiB attributed to starvation), SQLite's own test `tt3_checkpoint.c`, and a 2026-08-23 post on the WAL-reset bug.
- wal.html table of contents: 1 Overview · 2 How WAL Works (2.1 Checkpointing, 2.2 Concurrency, 2.3 Performance Considerations) · 3 Activating And Configuring WAL Mode (3.1 Automatic Checkpoint, 3.2 Application-Initiated Checkpoints, 3.3 Persistence of WAL mode) · 4 The WAL File · 5 Read-Only Databases · 6 Avoiding Excessively Large WAL Files · 7 Implementation Of Shared-Memory For The WAL-Index · 8 Use of WAL Without Shared-Memory · 9 Sometimes Queries Return SQLITE_BUSY In WAL Mode · 10 Backwards Compatibility · 11 The WAL-Reset Bug (11.1 Bug Details, 11.2 Low Probability Of Occurrence). Versions it names: 3.7.0 (WAL introduced, 2010), 3.7.4 (WAL without shared memory in EXCLUSIVE mode), 3.11.0 (large transactions), 3.22.0 (read-only WAL), 3.51.3 (WAL-reset fix, 2026-03-13; backports 3.44.6, 3.50.7).

## Questions
Must-cover items: MC1 readers and the single writer → Q2, Q3 · MC2 checkpoints → Q7, Q8, Q9 · MC3 shared memory and network filesystems → Q11, Q12 · MC4 turning WAL on and `synchronous` → Q16, Q17 · MC5 unbounded -wal growth → Q23, Q24.

- Q1 · load-bearing: yes (the mechanism every later section builds on) · angle: found-rw · from: ask — In WAL mode, where does a committed change go, and why does the main database file stay unchanged until a checkpoint?
- Q2 · load-bearing: yes (MC1) · angle: found-rw · from: must-cover — How does a reader find the right version of each page: what is its snapshot (the "end mark" it records when its read transaction starts), and how long does it hold it?
- Q3 · load-bearing: yes (MC1) · angle: found-rw · from: must-cover — Why is there only one writer at a time in WAL mode, and do readers block the writer, or the writer the readers?
- Q4 · load-bearing: yes (the durability settings in chapter 2 are explained by it) · angle: found-rw · from: expert — What is in the -wal file (its header, frames, commit frames, salts and checksums), and how does SQLite tell a complete commit from a torn one after a crash?
- Q5 · load-bearing: no (one contrast, and dating) · angle: found-rw · from: expert — What is the one essential contrast with the rollback journal (where the old and new page content live), and in which version did WAL arrive?
- Q6 · load-bearing: yes (the reader decides whether to turn WAL on) · angle: criticism · from: expert — What disadvantages and limits does the documentation list for WAL mode (same host only, extra files, reads slowing as the WAL grows, very large transactions, ATTACHed databases)?
- Q7 · load-bearing: yes (MC2) · angle: found-ckpt · from: must-cover — What does a checkpoint do, step by step (frames copied back to the database, syncs, the WAL reset or restarted from the beginning)?
- Q8 · load-bearing: yes (MC2) · angle: found-ckpt · from: must-cover — When does a checkpoint run on its own (the auto-checkpoint threshold, which connection runs it, on last close), and what does `wal_autocheckpoint` change?
- Q9 · load-bearing: yes (MC2) · angle: found-ckpt · from: must-cover — What stops a checkpoint from finishing, or the WAL from being reset (readers on old snapshots, a writer, the busy handler), and what is "checkpoint starvation"?
- Q10 · load-bearing: yes (chapter 2's checkpoint control relies on it) · angle: found-ckpt · from: expert — How do the checkpoint modes PASSIVE, FULL, RESTART and TRUNCATE differ in what they wait for and what they do to the -wal file, and what do they report back (busy, log frames, checkpointed frames)?
- Q11 · load-bearing: yes (MC3) · angle: found-shm · from: must-cover — What is the wal-index, what does it hold, and why is it kept in a memory-mapped -shm file shared by every connection?
- Q12 · load-bearing: yes (MC3) · angle: found-shm · from: must-cover — Why does WAL not work on a network filesystem (or across hosts sharing a volume), and what goes wrong if you try?
- Q13 · load-bearing: no (depth) · angle: found-shm · from: expert — Which locks does WAL mode take (the write lock, the checkpoint lock, recovery, the read marks), and how do they differ from the rollback-mode locks of lockingv3.html (one contrast)?
- Q14 · load-bearing: no (an edge case) · angle: found-shm · from: expert — How can WAL run without shared memory (EXCLUSIVE locking mode), and what does that cost?
- Q15 · load-bearing: yes (the reader sees these files on disk) · angle: found-shm · from: reader — What happens to the -wal and -shm files over a database's life: when they are created, when deleted, what persists after a crash, and how recovery rebuilds the wal-index?
- Q16 · load-bearing: yes (MC4) · angle: practice-config · from: must-cover — How do you turn WAL on (`PRAGMA journal_mode=WAL`), does it persist across connections and restarts, and when can the switch fail?
- Q17 · load-bearing: yes (MC4) · angle: practice-config · from: must-cover — In WAL mode, what do `synchronous=FULL`, `NORMAL` (and `OFF`, `EXTRA`) sync and when, and what durability does each give against an application crash and against power loss (lost last commits versus corruption)?
- Q18 · load-bearing: no (defaults detail) · angle: practice-config · from: expert — What is the default `synchronous` setting, and can a build change the default used in WAL mode?
- Q19 · load-bearing: yes (the reader diagnoses SQLITE_BUSY) · angle: practice-config · from: ask — In which documented cases does a WAL-mode database return SQLITE_BUSY, and what is SQLITE_BUSY_SNAPSHOT?
- Q20 · load-bearing: yes (the reader diagnoses SQLITE_BUSY) · angle: practice-config · from: expert — How do `busy_timeout` and `BEGIN IMMEDIATE` interact with WAL: why can a deferred transaction that upgrades from read to write fail at once with SQLITE_BUSY, the busy handler notwithstanding?
- Q21 · load-bearing: no (driver-specific) · angle: practice-config · from: reader — How do Python's `sqlite3` module and Go's common SQLite drivers start transactions and set busy timeouts by default, and which of those defaults cause SQLITE_BUSY with WAL?
- Q22 · load-bearing: yes (MC5's remedy) · angle: practice-ops · from: expert — How does an application take control of checkpoints: `wal_autocheckpoint`, `PRAGMA wal_checkpoint(<mode>)`, `sqlite3_wal_checkpoint_v2()`, a dedicated checkpointing connection?
- Q23 · load-bearing: yes (MC5) · angle: practice-ops · from: must-cover — Why can the -wal file grow without bound in practice (long or never-ending read transactions, large write transactions, auto-checkpoint disabled), and why does it not shrink after a checkpoint?
- Q24 · load-bearing: yes (MC5) · angle: practice-ops · from: must-cover — How do you stop or bound the growth: `journal_size_limit`, TRUNCATE or RESTART checkpoints, shorter read transactions, other documented means?
- Q25 · load-bearing: yes (the intent names backups) · angle: practice-ops · from: ask — How do you back up a WAL database safely (the online backup API or `.backup`, `VACUUM INTO`), and why is copying the database file alone, or the files mid-write, unsafe?
- Q26 · load-bearing: yes (a common way to lose data) · angle: practice-ops · from: expert — What breaks if the -wal or -shm file is deleted, separated from its database, or the database renamed or copied without it?
- Q27 · load-bearing: no (operations depth) · angle: practice-ops · from: reader — How do you watch a WAL's health: the -wal file's size, the checkpoint call's return values, other documented signals?
- Q28 · load-bearing: no (an edge case) · angle: practice-ops · from: expert — What does WAL need of file permissions and directories (the -shm and -wal created beside the database, read-only databases since 3.22.0)?
- Q29 · load-bearing: no (the decision rests on documented behaviour; numbers are depth) · angle: evidence · from: expert — What dated measurements compare WAL with the rollback journal, and `synchronous=NORMAL` with `FULL`, on write throughput or fsyncs per commit?
- Q30 · load-bearing: no (numbers) · angle: evidence · from: reader — How large is the WAL by default before an auto-checkpoint (1,000 pages × the page size), and what do the docs or measurements say about reads slowing as the WAL grows, and about very large transactions?
- Q31 · load-bearing: no (sizing) · angle: evidence · from: reader — What write and read concurrency does WAL sustain for a small web service, in dated independent measurements?
- Q32 · load-bearing: yes (a correctness bug the reader's version may carry) · angle: criticism · from: expert — What is the WAL-reset bug: which versions it affects, the conditions that trigger it, the fix and its backports, and how likely the docs say it is?
- Q33 · load-bearing: yes (the reader decides whether to turn WAL on) · angle: criticism · from: expert — When should you not use WAL mode, by the documentation and by independent critics?
- Q34 · load-bearing: yes (MC4's durability trade-off may be disputed) · angle: criticism · from: expert — Is `synchronous=NORMAL` with WAL criticised or disputed as unsafe, and what exactly do critics say it loses?
- Q35 · load-bearing: no (illustration) · angle: cases · from: expert — Which reported production incidents show -wal growth or checkpoint starvation, with real numbers and the cause found?
- Q36 · load-bearing: no (context) · angle: cases · from: reader — Which settings do production frameworks and guides pick for SQLite in WAL mode (for example Rails, Django, Laravel), and what reasons do they give?
- Q37 · load-bearing: no (context) · angle: cases · from: reader — How do continuous-replication or backup tools that read the WAL (Litestream and the like) interact with checkpoints?
- Q38 · load-bearing: yes (MC2 and MC5's remedy rest on it; settles D-01) · angle: found-ckpt · from: gap G-r1-01 — While a RESTART or TRUNCATE checkpoint runs (and while it waits for readers), do new read transactions wait or go ahead? What does SQLite's source (wal.c at a release tag) do, and which page's wording matches it?
- Q39 · load-bearing: yes (the core of Q20 and of the reader's SQLITE_BUSY diagnosis) · angle: practice-config · from: gap G-r1-02 — In WAL mode, when a deferred transaction that has already read tries to write while another connection holds the write lock or has committed since its snapshot, does SQLite call the busy handler (busy_timeout) at all, or return SQLITE_BUSY / SQLITE_BUSY_SNAPSHOT at once, and why does retrying the statement inside the same transaction not help?
- Q40 · load-bearing: yes (MC4's durability matrix depends on it) · angle: practice-config · from: gap G-r1-03 — What does each `synchronous` level's durability assume of the operating system and the disk? On macOS, where fsync() does not flush the drive cache, does `synchronous=FULL` survive power loss without `PRAGMA fullfsync` / `checkpoint_fullfsync`, and what do SQLite's docs say about disks that do not honour sync requests?

## Outline skeleton
Draft chapter list (book `sqlite-wal`, 2 chapters):

### Chapter 1 — how-wal-works: How SQLite's write-ahead log works
- Background: the rollback-journal contrast, WAL's arrival — Q5
- Intuition: a commit appended, readers on snapshots, one writer — Q1, Q2, Q3
- The -wal file: frames, commits, crash recovery — Q4, Q15
- The wal-index and shared memory; why not a network filesystem — Q11, Q12, Q13, Q14
- Checkpoints: what they do, when, what stops them, the modes — Q7, Q8, Q9, Q10
- Limits of WAL — Q6
- Quiz

### Chapter 2 — running-wal: Running WAL in production
- Turning WAL on — Q16
- Durability: `synchronous` with WAL — Q17, Q18, Q34
- SQLITE_BUSY: causes and cures — Q19, Q20, Q21
- Checkpoint control and a growing -wal file — Q22, Q23, Q24, Q27, Q35
- Files, filesystems and backups — Q25, Q26, Q28, Q37
- When not to use WAL, and known bugs — Q33, Q32
- Worked numbers — Q29, Q30, Q31, Q36
- Best practices & next steps
- Quiz

## Angles
- found-rw (foundations: the read and write path, with its history; web): owns how commits are appended, readers' snapshots and end marks, the single writer, the -wal file format and recovery from a torn commit, the rollback-journal contrast and WAL's arrival · not yours: checkpoints (found-ckpt); the wal-index, -shm and locks (found-shm); settings and SQLITE_BUSY (practice-config); limits and bugs (criticism) · questions: Q1, Q2, Q3, Q4, Q5
- found-ckpt (foundations: checkpoints; web, and SQLite's C source at a release tag for Q38): owns what a checkpoint does, automatic checkpoints, what blocks or starves one, the four modes and their return values, whether RESTART/TRUNCATE block new readers · not yours: application checkpoint control and -wal growth remedies (practice-ops); the read path (found-rw); the wal-index (found-shm) · questions: Q7, Q8, Q9, Q10, Q38 (round 2)
- found-shm (foundations: the wal-index, shared memory and locks; web): owns the wal-index's content and -shm, why network filesystems fail, WAL's locks, WAL without shared memory, the -wal/-shm files' life cycle · not yours: the -wal frame format (found-rw); backups and deleting files (practice-ops); when not to use WAL in general (criticism) · questions: Q11, Q12, Q13, Q14, Q15
- practice-config (current practice: turning it on, durability, busy handling; web): owns `journal_mode=WAL` and its persistence, `synchronous` in WAL mode and its durability, SQLITE_BUSY causes and `busy_timeout`/`BEGIN IMMEDIATE`, the Python and Go driver defaults, the busy handler on a WAL read-to-write upgrade, what `synchronous` assumes of fsync and the disk · not yours: checkpoint control and growth (practice-ops); critiques of `synchronous=NORMAL` (criticism); measurements (evidence) · questions: Q16, Q17, Q18, Q19, Q20, Q21, Q39, Q40 (round 2)
- practice-ops (current practice: checkpoint control, growth, files and backups; web): owns application-driven checkpoints, why the -wal grows and how to bound it, backups, separating or deleting the -wal/-shm, monitoring, permissions and read-only use · not yours: what a checkpoint does and its modes (found-ckpt); the files' life cycle and wal-index (found-shm); incident reports (cases) · questions: Q22, Q23, Q24, Q25, Q26, Q27, Q28
- evidence (evidence and numbers; web): owns dated measurements of WAL against the rollback journal, of `synchronous` settings, the default WAL size and its performance effects, concurrency figures · not yours: documented behaviour (the foundations and practice angles); anecdotes (cases) · questions: Q29, Q30, Q31
- criticism (criticism and failure modes; web): owns the documented disadvantages, when not to use WAL, the WAL-reset bug, critiques of `synchronous=NORMAL` · not yours: the mechanisms themselves (foundations angles); settings (practice-config); incidents (cases) · questions: Q6, Q32, Q33, Q34
- cases (real cases; web): owns production incident reports, framework defaults and their reasons, WAL-reading backup tools · not yours: documented behaviour (foundations, practice); measurements (evidence); critiques (criticism) · questions: Q35, Q36, Q37
- history: merged into found-rw (thin: one contrast and WAL's arrival)

## Query log
- "SQLite WAL mode production" → leads (rung 3)
- "SQLite WAL checkpoint starvation" → leads (SQLite forum, Syncthing forum, tt3_checkpoint.c, the WAL-reset post)
- r1-found-rw: "SQLite: Past, Present, and Future" VLDB WAL mode → nothing new; direct fetches of wal.html, fileformat2.html, isolation.html, walformat.html, lang_transaction.html, releaselog/3_7_0.html
- r1-found-ckpt: no searches; direct fetches of wal.html, c3ref/wal_checkpoint_v2.html, pragma.html, c3ref/wal_autocheckpoint.html, fileformat2.html, walformat.html, changes.html
- r1-found-shm: "SQLite WAL NFS shared memory mmap corruption" → useful (pointers); "sqlite wal-index -shm network filesystem different hosts" → useful (rung-3 lead); "sqlite.org forum WAL mode network share two machines -shm corruption" → nothing new
- r1-practice-config: no searches; direct fetches of sqlite.org wal, pragma, rescode, lang_transaction, compile, c3ref/busy_handler; docs.python.org sqlite3; mattn/go-sqlite3 sqlite3.go; pkg.go.dev modernc.org/sqlite
- r1-practice-ops: no searches; direct fetches of sqlite.org wal, pragma, c3ref/wal_checkpoint_v2, c3ref/wal_autocheckpoint, howtocorrupt, backup, lang_vacuum, lang_transaction, cli, walformat
- r1-evidence: "SQLite WAL benchmark synchronous NORMAL FULL" → useful; "SQLite concurrent writes benchmark web server" → useful; "\"I/O Stack Optimization for Smartphones\" SQLite WAL journal mode" → useful; "APSys 2017 SQLite performance configuration paper Chidambaram" → useful (PDF unreachable); "SQLite large WAL file read performance measured slowdown" → nothing new; "sqlite forum WAL size read latency checkpoint benchmark" → nothing new; "\"SQLite: Past, Present, and Future\" VLDB 2022 WAL TATP" → useful; "SQLite WAL multiple processes writers throughput benchmark busy_timeout" → nothing new
- r1-criticism: "SQLite WAL-reset bug" → useful; "SQLite synchronous NORMAL WAL durability fsync criticism" → useful; "Phil Eaton \"Another look at SQLite's WAL-Reset bug\"" → useful (page unreadable); "Tailscale blog SQLite database corruption WAL checkpoint" → nothing new; "Hipp \"If you switch to WAL mode, the default behavior is that transactions\" news.ycombinator.com" → nothing new; "tailscale.com blog SQLite WAL-reset bug" → useful; hn.algolia API comment search → useful; "when not to use SQLite WAL mode" → nothing new; "why WAL is not the default journal mode SQLite Hipp" → nothing new
- r1-cases: "SQLite -wal file grew gigabytes checkpoint never completes postmortem" → useful; "Litestream how it works WAL checkpoint read transaction" → useful; "Rails 8 SQLite production defaults journal_mode WAL synchronous NORMAL" → useful (pointers); "rails pull request sqlite3 adapter default pragmas WAL synchronous normal journal_size_limit fractaledmind" → useful; "github rails/rails pull DEFAULT_PRAGMAS sqlite3 adapter production-ready configuration" → nothing new; GitHub API search merged sqlite journal_mode wal PRs → useful; "sqlite forum WAL file 100GB sqlite3_reset checkpoint Hipp" → useful
- r2-found-ckpt: "sqlite forum RESTART checkpoint readers block" → nothing new; direct fetches: GitHub tags API; src/wal.c, test/wal5.test, src/sqlite.h.in at version-3.54.1; Wayback captures of wal.html (2015-01-03, 2016-10-09)
- r2-practice-config: "Apple fsync man page F_FULLFSYNC drive cache" → useful; "fcntl F_BARRIERFSYNC F_FULLFSYNC APFS man page" → useful; GitHub API xnu commits for fcntl.2 → useful; GitHub API sqlite commit 5752022 → useful; direct fetches of sqlite.org pragma, howtocorrupt, atomiccommit, c3ref/busy_timeout; btree.c, wal.c, pager.c, os_unix.c at version-3.54.1

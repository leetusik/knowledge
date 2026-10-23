# Outline (research map): 20261023-1245-sqlite-wal
The plan's skeleton with each question's state and claim ids (D3). The states written on the lines below are the ones set at D3s r1 or r2, or the researcher's (r1, r2); the authoritative states after D5s are ledger.md's `## Question states`: answered except Q9, Q10, Q20, Q24, Q32, Q40 (contested) and Q31, Q38 (thin). Claim statuses are in ledger.md (after D5s: 206 supported, 18 partial, 12 contested, 1 unsupported, 49 candidate, of which 39 claims, one of them verified, are listed under `## Not used` below). This file is the research map; the book's chapter map is ../outline.md.

## Chapter 1 — how-wal-works

### Background
- Q5 · answered (r1) · C-r1-found-rw-26, C-r1-found-rw-27, C-r1-found-rw-28, C-r1-evidence-02, C-r1-found-shm-24

### Intuition: a commit appended, readers on snapshots, one writer
- Q1 · load-bearing · answered (r1) · C-r1-found-rw-01, C-r1-found-rw-02, C-r1-found-rw-03, C-r1-found-rw-04
- Q2 · load-bearing · answered (r1) · C-r1-found-rw-05, C-r1-found-rw-06, C-r1-found-rw-07, C-r1-found-rw-08, C-r1-found-rw-09, C-r1-found-rw-10
- Q3 · load-bearing · answered (r1) · C-r1-found-rw-11, C-r1-found-rw-12, C-r1-found-rw-13, C-r1-found-rw-14, C-r1-found-rw-15, C-r1-found-rw-16

### The -wal file: frames, commits, crash recovery, the files on disk
- Q4 · load-bearing · answered (r1) · C-r1-found-rw-17, C-r1-found-rw-18, C-r1-found-rw-19, C-r1-found-rw-20, C-r1-found-rw-21, C-r1-found-rw-22, C-r1-found-rw-23, C-r1-found-rw-24, C-r1-found-rw-25
- Q15 · load-bearing · answered (r1) · C-r1-found-shm-08, C-r1-found-shm-27, C-r1-found-shm-29, C-r1-found-shm-30, C-r1-found-shm-31, C-r1-found-shm-32, C-r1-found-shm-33, C-r1-found-shm-34, C-r1-found-shm-36, C-r1-found-shm-37, C-r1-found-shm-38, C-r1-found-rw-23

### The wal-index and shared memory; why not a network filesystem
- Q11 · load-bearing · answered (r1) · C-r1-found-rw-10, C-r1-found-shm-02, C-r1-found-shm-03, C-r1-found-shm-04, C-r1-found-shm-05, C-r1-found-shm-06, C-r1-found-shm-07, C-r1-found-shm-08, C-r1-found-shm-09, C-r1-found-shm-10
- Q12 · load-bearing · answered (D3s r1; no source walks a cross-host failure step by step) · C-r1-found-shm-07, C-r1-found-shm-11, C-r1-found-shm-12, C-r1-found-shm-13, C-r1-found-shm-14, C-r1-found-shm-15, C-r1-found-shm-16, C-r1-found-shm-17
- Q13 · answered (r1) · C-r1-found-rw-13, C-r1-found-shm-05, C-r1-found-shm-18, C-r1-found-shm-20, C-r1-found-shm-21, C-r1-found-shm-22, C-r1-found-shm-23, C-r1-found-shm-24, C-r1-found-shm-25, C-r1-found-shm-31, C-r1-found-shm-37
- Q14 · answered (r1) · C-r1-found-shm-17, C-r1-found-shm-26, C-r1-found-shm-27, C-r1-found-shm-28

### Checkpoints: what they do, when, what stops them, the modes
- Q7 · load-bearing · answered (r1) · C-r1-found-ckpt-01, C-r1-found-ckpt-02, C-r1-found-ckpt-03, C-r1-found-ckpt-04, C-r1-found-ckpt-05, C-r1-found-rw-24, C-r1-found-ckpt-07, C-r1-found-ckpt-08, C-r1-found-ckpt-09
- Q8 · load-bearing · answered (r1) · C-r1-found-ckpt-10, C-r1-found-ckpt-11, C-r1-found-ckpt-12, C-r1-found-ckpt-13, C-r1-found-ckpt-14, C-r1-found-ckpt-15, C-r1-found-ckpt-16, C-r1-found-ckpt-17, C-r1-found-ckpt-18, C-r1-found-ckpt-28, C-r1-evidence-18
- Q9 · load-bearing · contested (D3s r1: D-01) · C-r1-found-ckpt-04, C-r1-found-ckpt-14, C-r1-found-ckpt-19, C-r1-found-ckpt-20, C-r1-found-ckpt-21 (D-01), C-r1-found-ckpt-22, C-r1-found-ckpt-23, C-r1-found-ckpt-24, C-r1-found-ckpt-25, C-r1-found-ckpt-26, C-r1-found-ckpt-27
- Q38 · load-bearing · thin (D3s r2: the code facts -01, -02, -06 supported and -04 partial; the direct conclusion -03 below the bar as exceptional; -12 needs a rewrite; D-01 side B) · C-r2-found-ckpt-01, C-r2-found-ckpt-02, C-r2-found-ckpt-03 (D-01), C-r2-found-ckpt-04 (D-01), C-r2-found-ckpt-05, C-r2-found-ckpt-06, C-r2-found-ckpt-07, C-r2-found-ckpt-08, C-r2-found-ckpt-09 (D-01), C-r2-found-ckpt-10, C-r2-found-ckpt-11, C-r2-found-ckpt-12 (D-01)
- Q10 · load-bearing · contested (D3s r1: D-01) · C-r1-found-ckpt-26, C-r1-found-ckpt-27, C-r1-found-ckpt-28, C-r1-found-ckpt-29 (D-01), C-r1-found-ckpt-30, C-r1-found-ckpt-31, C-r1-found-ckpt-32, C-r1-found-ckpt-33, C-r1-found-ckpt-34, C-r1-found-ckpt-35

### Limits of WAL
- Q6 · load-bearing · contested (D3s r1: D-05) · C-r1-found-shm-11, C-r1-criticism-02, C-r1-criticism-03, C-r1-evidence-03, C-r1-criticism-05, C-r1-criticism-06, C-r1-evidence-20 (D-05), C-r1-evidence-19, C-r1-criticism-09, C-r1-criticism-10

### Quiz
- (D6)

## Chapter 2 — running-wal

### Turning WAL on
- Q16 · load-bearing · answered (r1) · C-r1-practice-config-01, C-r1-practice-config-02, C-r1-practice-config-03, C-r1-practice-config-04, C-r1-practice-config-05, C-r1-practice-config-06, C-r1-found-shm-17, C-r1-found-shm-25

### Durability: `synchronous` with WAL
- Q17 · load-bearing · answered (r1) · C-r1-practice-config-07, C-r1-practice-config-08, C-r1-practice-config-09, C-r1-practice-config-10, C-r1-practice-config-11, C-r1-practice-config-12, C-r1-practice-config-13, C-r1-practice-config-14, C-r1-found-ckpt-09
- Q40 · load-bearing · contested (D3s r2: D-07; the macOS conclusion is a chain over C-r2-practice-config-14, -15, -16, -17, -18, stated in no one source) · C-r2-practice-config-08, C-r2-practice-config-09, C-r2-practice-config-10, C-r2-practice-config-11, C-r2-practice-config-12, C-r2-practice-config-13, C-r2-practice-config-14, C-r2-practice-config-15, C-r2-practice-config-16, C-r2-practice-config-17 (D-07), C-r2-practice-config-18, C-r2-practice-config-19, C-r2-practice-config-20 (D-07), C-r2-practice-config-21 (D-08)
- Q18 · answered (r1) · C-r1-practice-config-15, C-r1-practice-config-16 (D-03)
- Q34 · load-bearing · answered (D3s r1: the docs' position supported; the critics rung 3, attributed only; D-03 recorded, side B a forum comment) · C-r1-practice-config-08, C-r1-practice-config-09, C-r1-practice-config-10, C-r1-practice-config-13, C-r1-criticism-23, C-r1-criticism-28 (D-03), C-r1-criticism-29 (D-03), C-r1-criticism-30, C-r1-criticism-31, C-r1-criticism-32, C-r1-criticism-33

### SQLITE_BUSY: causes and cures
- Q19 · load-bearing · answered (r1) · C-r1-practice-config-17, C-r1-practice-config-18, C-r1-practice-config-19, C-r1-practice-config-20, C-r1-practice-config-21, C-r1-practice-config-22, C-r1-practice-config-27, C-r1-practice-config-28, C-r1-found-shm-37, C-r1-found-ckpt-25
- Q20 · load-bearing · answered (D3s r1; no opened page says the busy handler is skipped on a WAL read-to-write upgrade: C-r1-practice-config-26 is in rollback-lock terms) · C-r1-practice-config-20, C-r1-practice-config-21, C-r1-practice-config-22, C-r1-practice-config-23, C-r1-practice-config-24, C-r1-practice-config-25, C-r1-practice-config-26, C-r1-practice-config-27, C-r1-practice-config-28, C-r1-found-rw-15
- Q39 · load-bearing · answered (D3s r2; "retrying inside the same transaction does not help" is a step from the code's condition) · C-r2-practice-config-01, C-r2-practice-config-02, C-r2-practice-config-03, C-r2-practice-config-04, C-r2-practice-config-05, C-r2-practice-config-06, C-r2-practice-config-07
- Q21 · thin (r1) · C-r1-practice-config-27, C-r1-practice-config-29, C-r1-practice-config-30, C-r1-practice-config-31, C-r1-practice-config-32, C-r1-practice-config-33, C-r1-cases-17

### Checkpoint control and a growing -wal file
- Q22 · load-bearing · answered (r1) · C-r1-found-ckpt-12, C-r1-practice-ops-02, C-r1-found-ckpt-16, C-r1-practice-ops-04, C-r1-practice-ops-05, C-r1-practice-ops-06, C-r1-practice-ops-07, C-r1-practice-config-14, C-r1-practice-ops-09, C-r1-found-ckpt-25, C-r1-practice-ops-11, C-r1-found-ckpt-17
- Q23 · load-bearing · answered (r1) · C-r1-found-ckpt-24, C-r1-practice-ops-13, C-r1-found-ckpt-23, C-r1-practice-ops-15, C-r1-found-ckpt-07, C-r1-found-ckpt-11, C-r1-practice-ops-18, C-r1-practice-ops-19, C-r1-practice-ops-20, C-r1-found-rw-09
- Q24 · load-bearing · contested (D3s r1: D-01) · C-r1-practice-ops-21, C-r1-practice-ops-22, C-r1-practice-ops-23, C-r1-practice-ops-24 (D-01), C-r1-practice-ops-25 (D-01), C-r1-practice-ops-26 (D-05), C-r1-found-ckpt-08, C-r1-found-ckpt-30
- Q27 · answered (r1) · C-r1-found-ckpt-33, C-r1-practice-ops-48, C-r1-found-ckpt-32, C-r1-practice-ops-50, C-r1-practice-ops-20, C-r1-found-ckpt-11
- Q35 · answered (r1) · C-r1-cases-01, C-r1-cases-02, C-r1-cases-03, C-r1-cases-04, C-r1-cases-05, C-r1-cases-06, C-r1-cases-07, C-r1-cases-24

### Files, filesystems and backups
- Q25 · load-bearing · answered (r1) · C-r1-practice-ops-27, C-r1-practice-ops-28, C-r1-practice-ops-29, C-r1-practice-ops-30, C-r1-practice-ops-31, C-r1-practice-ops-32, C-r1-practice-ops-33, C-r1-practice-ops-34, C-r1-practice-ops-35, C-r1-practice-ops-36, C-r1-practice-ops-37, C-r1-practice-ops-38
- Q26 · load-bearing · answered (r1) · C-r1-practice-ops-39, C-r1-practice-ops-40, C-r1-practice-ops-41, C-r1-practice-ops-42, C-r1-practice-ops-43, C-r1-practice-ops-44, C-r1-practice-ops-45, C-r1-practice-ops-46, C-r1-found-shm-32, C-r1-found-shm-33
- Q28 · answered (r1) · C-r1-practice-ops-51, C-r1-practice-ops-53, C-r1-practice-ops-54, C-r1-practice-ops-55, C-r1-found-shm-38
- Q37 · answered (r1) · C-r1-cases-18, C-r1-cases-19, C-r1-cases-20, C-r1-cases-21, C-r1-cases-22, C-r1-cases-23, C-r1-cases-24

### When not to use WAL, and known bugs
- Q33 · load-bearing · contested (D3s r1: D-05; the documentation's cases supported, no independent rung-2 critic found) · C-r1-found-shm-11, C-r1-criticism-05, C-r1-evidence-20 (D-05), C-r1-criticism-10, C-r1-criticism-21, C-r1-criticism-22, C-r1-practice-ops-39, C-r1-found-shm-15, C-r1-found-shm-16
- Q32 · load-bearing · contested (D3s r1: D-04) · C-r1-criticism-11, C-r1-criticism-12, C-r1-criticism-13, C-r1-criticism-14, C-r1-criticism-15, C-r1-criticism-16, C-r1-criticism-17 (D-04), C-r1-criticism-18, C-r1-criticism-19, C-r1-criticism-20 (D-06), C-r1-criticism-21, C-r1-criticism-35 (D-04)

### Worked numbers
- Q29 · answered (r1) · C-r1-evidence-05, C-r1-evidence-06, C-r1-evidence-07, C-r1-evidence-08, C-r1-evidence-10 (D-02), C-r1-evidence-11 (D-02), C-r1-evidence-14 (D-02), C-r1-practice-config-07, C-r1-found-rw-28
- Q30 · contested (D3s r1: D-05) · C-r1-found-ckpt-10, C-r1-found-ckpt-11, C-r1-found-ckpt-13, C-r1-found-ckpt-28, C-r1-evidence-09, C-r1-evidence-18, C-r1-evidence-19, C-r1-evidence-20, C-r1-practice-ops-09
- Q31 · thin (r1) · C-r1-evidence-11, C-r1-evidence-12, C-r1-evidence-13, C-r1-evidence-14, C-r1-evidence-15, C-r1-evidence-23, C-r1-evidence-24
- Q36 · answered (r1) · C-r1-cases-08, C-r1-cases-09, C-r1-cases-10, C-r1-cases-11, C-r1-cases-12, C-r1-cases-13, C-r1-cases-14, C-r1-cases-15, C-r1-cases-16, C-r1-cases-17, C-r1-cases-18, C-r1-cases-21

### Best practices & next steps
- (D6: drawn from Q16, Q17, Q20, Q22, Q24, Q25, Q26)

### Quiz
- (D6)

## Not used
Claims that serve no reader task and no must-cover point (§3.10 step 4); never mapped, so not verified at D5:
- C-r1-found-rw-21: the checksum's Fibonacci weights — format detail no task needs
- C-r1-found-shm-06, C-r1-found-shm-09: the -shm hash lookup cost and its byte order — internals
- C-r1-found-shm-18, C-r1-found-shm-20, C-r1-found-shm-23: the eight lock bytes, the checkpoint lock, the rollback states WAL leaves unused — lock internals beyond what Q3 and Q9 need
- C-r1-found-shm-24: the rollback-mode PENDING lock — a second rollback contrast (leave-out allows one; C-r1-found-rw-26 is it)
- C-r1-found-shm-31, C-r1-found-shm-34, C-r1-found-shm-36: how the last connection knows it is last, -shm truncation on first open, nBackfill after recovery — internals
- C-r1-found-ckpt-17, C-r1-practice-ops-07: sqlite3_wal_hook — C API beyond the PRAGMAs and the checkpoint call (leave-out)
- C-r1-found-ckpt-35: wal.html's outdated "three subtypes" wording — a note for the writer (cite pragma.html or c3ref for the modes), not content
- C-r1-practice-ops-26: verified (final-b6) but its "recommends … yet" framing reads wal.html's struck-through text as live (C-v8-02, D-05); C-r1-evidence-20's narrower claim carries the point
- C-r1-practice-ops-33, C-r1-practice-ops-34: the one-step backup's writer lock (low confidence for WAL) and the old lock-then-copy method — superseded by the live-backup methods
- C-r1-practice-ops-53: 8.3 file names — a build option no reader meets
- C-r1-practice-config-06: version numbers reset for pre-3.7.0 readers — history no task needs
- C-r2-found-ckpt-10: wal5.test's list of checkpoint waits — covered by C-r1-found-ckpt-26, C-r1-found-ckpt-29
- C-r2-found-ckpt-12: needs-rewrite; its parts stand as C-r2-found-ckpt-09, C-r2-found-ckpt-04, C-r2-found-ckpt-03 and the D-01 entry
- C-r2-practice-config-12, C-r2-practice-config-19: the rollback-mode article's hardware assumptions and F_BARRIERFSYNC, which SQLite does not use — covered by C-r2-practice-config-09, -11, -16
- C-r1-criticism-13, C-r1-criticism-20, C-r1-criticism-30: who found the WAL-reset bug, the withdrawn 3.52.0, the history of the WAL default — history no task needs ("fixed in 3.51.3" is C-r1-criticism-11)
- C-r1-criticism-22: switching in and out of WAL with VACUUM between — an edge case no task meets
- C-r1-criticism-32, C-r1-criticism-33: rung-3 reports of driver and platform defaults, and a second critic — the reader is told to read `PRAGMA synchronous` back instead; C-r1-criticism-31 carries the critics' view
- C-r1-evidence-05, C-r1-evidence-06: 2013 Android measurements — not this reader's platform; PVLDB 2022 carries the comparison
- C-r1-evidence-10: a 2012 rung-3 mailing-list figure — below the bar; D-02 keeps the two 2024–2025 figures
- C-r1-evidence-13: SQLite against PostgreSQL tail latency — another database, outside the brief
- C-r1-evidence-15: batched single-writer TPS — a technique the book does not teach
- C-r1-cases-05, C-r1-cases-09, C-r1-cases-10, C-r1-cases-11, C-r1-cases-14, C-r1-cases-15: Syncthing's proposed fix, Rails' pragma merge, the PR's date, its quoting of the docs, its unverified "2× better", Django's declined change — no task needs them (C-r1-cases-08, -12, -13, -16, -17 carry the framework settings)

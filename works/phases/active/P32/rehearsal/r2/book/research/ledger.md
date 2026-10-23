# Ledger: 20261023-1245-sqlite-wal
One line per claim (B9). The claim's entry is in `findings/<its stem>.md` (a `C-v<n>-` counter-claim's entry is in the verify file named on its line); a `merged:` id's entry sits in its own findings file and shares this line's status. Section keys: ch1 = how-wal-works (bg, intuition, wal-file, wal-index, checkpoints, limits); ch2 = running-wal (turn-on, durability, busy, growth, files, when-not, numbers). Statuses set by the lead from verify files only (D3s r1, D3s r2, D5s); `candidate` = not verified. Sources on sqlite.org, SQLite's own code and its header count as one owner, so "bar met" means one rung-1 source directly supports a descriptive claim, or the attributed form of an evaluative one. `· main` marks the book's main claims (D5): their counter-evidence result is on the line. "not used" claims are listed in outline.md `## Not used` and were never mapped or verified.

Counts after D5s: 286 claims · supported 206 · partial 18 · contested 12 · unsupported 1 · candidate 49 (38 not used, 11 verifiers' counter-claims) · load-bearing 146 (119 supported, 14 partial, 11 contested, 1 unsupported, 1 not used).

## Claims

### found-rw (round 1)
- C-r1-found-rw-01 · Q1 · load-bearing · status supported · verified verify/r1-b1.md#V-C-r1-found-rw-01-1 · bar met (rung 1, descriptive) · used-in: ch1 intuition
- C-r1-found-rw-02 · Q1 · load-bearing · status supported · verified verify/r1-b1.md#V-C-r1-found-rw-02-1 · bar met · used-in: ch1 intuition
- C-r1-found-rw-03 · Q1 · load-bearing · status supported · verified verify/r1-b1.md#V-C-r1-found-rw-03-1 · bar met ("only through" inferred from isolation.html) · used-in: ch1 intuition
- C-r1-found-rw-04 · Q1, Q4 · load-bearing · status supported · verified verify/r1-b5.md#V-C-r1-found-rw-04-1 · bar met · used-in: ch1 intuition, ch1 wal-file
- C-r1-found-rw-05 · Q2 · load-bearing · main · status supported · verified verify/r1-b1.md#V-C-r1-found-rw-05-1 · bar met · counter: none-found (verify/final-b1.md) · used-in: ch1 intuition
- C-r1-found-rw-06 · Q2 · load-bearing · status partial ("The file-format specification says a reader records mxFrame — the number of valid frames, which walformat.html calls the index of the last valid commit frame — when its read transaction starts and uses it for all later reads; wal.html calls that point the reader's 'end mark'.") · verified verify/r1-b5.md#V-C-r1-found-rw-06-1 · bar met for the narrower claim · used-in: ch1 intuition
- C-r1-found-rw-07 · Q2 · load-bearing · status supported · verified verify/r1-b1.md#V-C-r1-found-rw-07-1 · bar met · used-in: ch1 intuition
- C-r1-found-rw-08 · Q2 · load-bearing · status supported · verified verify/r1-b5.md#V-C-r1-found-rw-08-1 · bar met · used-in: ch1 intuition
- C-r1-found-rw-09 · Q2 · load-bearing · status supported · verified verify/r1-b9.md#V-C-r1-found-rw-09-1 · bar met · used-in: ch1 intuition, ch2 growth
- C-r1-found-rw-10 · Q2, Q11 · load-bearing · status supported · verified verify/r1-b1.md#V-C-r1-found-rw-10-1 · bar met · merged: C-r1-found-shm-01 · used-in: ch1 wal-index
- C-r1-found-rw-11 · Q3 · load-bearing · main · status supported · verified verify/r1-b1.md#V-C-r1-found-rw-11-1 · bar met (scope it to standard SQLite: BEGIN CONCURRENT and WAL2 are branches, leave-out) · counter: none-found (verify/final-b1.md) · used-in: ch1 intuition
- C-r1-found-rw-12 · Q3 · load-bearing · main · status supported · verified verify/r1-b1.md#V-C-r1-found-rw-12-1 · bar met (attributed: the project lists it as an advantage) · counter: none-found (verify/final-b1.md) · used-in: ch1 intuition
- C-r1-found-rw-13 · Q3, Q13 · load-bearing · status supported · verified verify/r1-b6.md#V-C-r1-found-rw-13-1 · bar met · merged: C-r1-found-shm-19 · used-in: ch1 intuition, ch1 wal-index
- C-r1-found-rw-14 · Q3 · load-bearing · status supported · verified verify/r1-b5.md#V-C-r1-found-rw-14-1 · bar met · used-in: ch1 intuition
- C-r1-found-rw-15 · Q3 · not load-bearing · status supported · verified verify/final-b1.md · bar met · used-in: ch1 intuition, ch2 busy
- C-r1-found-rw-16 · Q3 · not load-bearing · status supported · verified verify/final-b1.md · bar met · used-in: ch1 wal-index
- C-r1-found-rw-17 · Q4 · load-bearing · status supported · verified verify/r1-b5.md#V-C-r1-found-rw-17-1 · bar met · used-in: ch1 wal-file
- C-r1-found-rw-18 · Q4 · load-bearing · status supported · verified verify/r1-b5.md#V-C-r1-found-rw-18-1 · bar met · used-in: ch1 wal-file
- C-r1-found-rw-19 · Q4 · load-bearing · status supported · verified verify/r1-b6.md#V-C-r1-found-rw-19-1 · bar met · used-in: ch1 wal-file
- C-r1-found-rw-20 · Q4 · load-bearing · status partial ("SQLite treats a WAL frame as valid only if its salt-1 and salt-2 match the WAL header's and its checksum matches one computed consecutively over the WAL header's first 24 bytes, then the first 8 bytes of the frame header and the page content of every frame up to and including that frame.") · verified verify/r1-b5.md#V-C-r1-found-rw-20-1 · bar met for the narrower claim · used-in: ch1 wal-file
- C-r1-found-rw-21 · Q4 · not load-bearing · status candidate · not used
- C-r1-found-rw-22 · Q4 · load-bearing · status supported · verified verify/r1-b5.md#V-C-r1-found-rw-22-1 · bar met · used-in: ch1 wal-file
- C-r1-found-rw-23 · Q4, Q15 · load-bearing · status supported · verified verify/r1-b6.md#V-C-r1-found-rw-23-1 · bar met · merged: C-r1-found-shm-35 · used-in: ch1 wal-file
- C-r1-found-rw-24 · Q4, Q7 · load-bearing · status supported · verified verify/r1-b5.md#V-C-r1-found-rw-24-1 · bar met · merged: C-r1-found-ckpt-06 · used-in: ch1 wal-file, ch1 checkpoints
- C-r1-found-rw-25 · Q4 · not load-bearing · status supported · verified verify/final-b1.md · bar met · used-in: ch1 wal-file
- C-r1-found-rw-26 · Q5 · not load-bearing · status supported · verified verify/final-b1.md · bar met (keep "the inverse" attributed to the docs) · used-in: ch1 bg
- C-r1-found-rw-27 · Q5 · not load-bearing · status supported · verified verify/final-b1.md · bar met · used-in: ch1 bg
- C-r1-found-rw-28 · Q5, Q29 · not load-bearing · status supported · verified verify/final-b1.md · bar met (attributed) · merged: C-r1-evidence-01 · used-in: ch1 bg

### found-ckpt (round 1)
- C-r1-found-ckpt-01 · Q7 · load-bearing · status supported · verified verify/r1-b1.md#V-C-r1-found-ckpt-01-1 · bar met · used-in: ch1 checkpoints
- C-r1-found-ckpt-02 · Q7 · load-bearing · status supported · verified verify/r1-b5.md#V-C-r1-found-ckpt-02-1 · bar met · used-in: ch1 checkpoints
- C-r1-found-ckpt-03 · Q7 · not load-bearing · status supported · verified verify/final-b1.md · bar met (attributed: the project's judgement) · used-in: ch1 checkpoints
- C-r1-found-ckpt-04 · Q7, Q9 · load-bearing · status supported · verified verify/r1-b1.md#V-C-r1-found-ckpt-04-1 · bar met (the "end mark" must be defined first, from C-r1-found-rw-05) · used-in: ch1 checkpoints
- C-r1-found-ckpt-05 · Q7 · load-bearing · status supported · verified verify/r1-b1.md#V-C-r1-found-ckpt-05-1 · bar met (the next writer resets the WAL; wal.html §6's looser "a checkpoint cannot reset" wording is not to be quoted for this) · used-in: ch1 checkpoints
- C-r1-found-ckpt-07 · Q7, Q10, Q23 · load-bearing · main · status supported · verified verify/r1-b1.md#V-C-r1-found-ckpt-07-1 · bar met (in wal.c the journal_size_limit truncation happens at the first commit after a reset, D-11) · counter: none-found (verify/final-b2.md) · merged: C-r1-practice-ops-16 · used-in: ch1 checkpoints, ch2 growth
- C-r1-found-ckpt-08 · Q7 · not load-bearing · status supported · verified verify/final-b1.md · bar met · used-in: ch2 growth
- C-r1-found-ckpt-09 · Q7 · not load-bearing · status supported · verified verify/final-b1.md · bar met · used-in: ch2 durability
- C-r1-found-ckpt-10 · Q8, Q30 · load-bearing · main · status supported · verified verify/r1-b1.md#V-C-r1-found-ckpt-10-1 · bar met · counter: none-found (verify/final-b2.md) · merged: C-r1-evidence-16 · used-in: ch1 checkpoints
- C-r1-found-ckpt-11 · Q8, Q23, Q27, Q30 · not load-bearing · status supported · verified verify/final-b1.md · bar met (attributed: "about 4MB" assumes the default 4096-byte page; give the page size with the number) · merged: C-r1-evidence-17, C-r1-practice-ops-17 · used-in: ch1 checkpoints, ch2 growth
- C-r1-found-ckpt-12 · Q8, Q22 · load-bearing · status supported · verified verify/r1-b2.md#V-C-r1-found-ckpt-12-1 · bar met · merged: C-r1-practice-ops-01 · used-in: ch1 checkpoints
- C-r1-found-ckpt-13 · Q8, Q30 · load-bearing · status supported · verified verify/r1-b2.md#V-C-r1-found-ckpt-13-1 · bar met · merged: C-r1-evidence-21 · used-in: ch1 checkpoints, ch2 growth
- C-r1-found-ckpt-14 · Q8, Q9 · load-bearing · status supported · verified verify/r1-b2.md#V-C-r1-found-ckpt-14-1 · bar met · used-in: ch1 checkpoints
- C-r1-found-ckpt-15 · Q8 · load-bearing · status supported · verified verify/r1-b7.md#V-C-r1-found-ckpt-15-1 · bar met · used-in: ch1 checkpoints, ch2 growth
- C-r1-found-ckpt-16 · Q8, Q22 · load-bearing · status supported · verified verify/r1-b8.md#V-C-r1-found-ckpt-16-1 · bar met · merged: C-r1-practice-ops-03 · used-in: ch2 growth
- C-r1-found-ckpt-17 · Q8 · not load-bearing · status candidate · not used
- C-r1-found-ckpt-18 · Q8 · load-bearing · status supported · verified verify/r1-b6.md#V-C-r1-found-ckpt-18-1 · bar met (sqlite3_close_v2() is an equal trigger) · used-in: ch1 checkpoints
- C-r1-found-ckpt-19 · Q9 · load-bearing · main · status supported · verified verify/r1-b5.md#V-C-r1-found-ckpt-19-1 · bar met (the checkpoint still copies up to the reader's end mark) · counter: none-found (verify/final-b2.md) · used-in: ch1 checkpoints
- C-r1-found-ckpt-20 · Q9 · load-bearing · main · status supported · verified verify/r1-b2.md#V-C-r1-found-ckpt-20-1 · bar met (the docs "describe", not "define", checkpoint starvation) · counter: none-found (verify/final-b2.md) · used-in: ch1 checkpoints
- C-r1-found-ckpt-21 · Q9 · load-bearing · status contested · verified verify/r1-b2.md#V-C-r1-found-ckpt-21-1 (supported as attributed) · D-01 side A · used-in: ch1 checkpoints, ch2 growth
- C-r1-found-ckpt-22 · Q9 · not load-bearing · status supported · verified verify/final-b2.md · bar met · used-in: ch1 checkpoints
- C-r1-found-ckpt-23 · Q9, Q23 · load-bearing · status supported · verified verify/r1-b2.md#V-C-r1-found-ckpt-23-1 · bar met · merged: C-r1-practice-ops-14 · used-in: ch1 checkpoints, ch2 growth
- C-r1-found-ckpt-24 · Q9, Q23 · load-bearing · status supported · verified verify/r1-b2.md#V-C-r1-found-ckpt-24-1 · bar met · merged: C-r1-practice-ops-12 · used-in: ch2 growth
- C-r1-found-ckpt-25 · Q9, Q22, Q27 · load-bearing · status supported · verified verify/r1-b8.md#V-C-r1-found-ckpt-25-1 · bar met · merged: C-r1-practice-ops-10 · used-in: ch2 growth, ch2 busy
- C-r1-found-ckpt-26 · Q9, Q10 · load-bearing · status supported · verified verify/r1-b8.md#V-C-r1-found-ckpt-26-1 · bar met · used-in: ch1 checkpoints, ch2 growth
- C-r1-found-ckpt-27 · Q9, Q10 · load-bearing · status partial ("SQLite's PASSIVE checkpoint copies as many frames as it can without waiting for any reader or writer, then syncs the database file if all frames in the log were checkpointed, and never invokes the busy handler; it may leave the checkpoint unfinished when there are concurrent readers or writers.") · verified verify/r1-b8.md#V-C-r1-found-ckpt-27-1 · bar met for the narrower claim · used-in: ch1 checkpoints
- C-r1-found-ckpt-28 · Q8, Q10, Q30 · load-bearing · status supported · verified verify/r1-b2.md#V-C-r1-found-ckpt-28-1 · bar met · merged: C-r1-evidence-25 · used-in: ch1 checkpoints
- C-r1-found-ckpt-29 · Q10 · load-bearing · status contested · verified verify/r1-b8.md#V-C-r1-found-ckpt-29-1 (supported as attributed to the API reference and the pragma page) · D-01 side B · used-in: ch1 checkpoints
- C-r1-found-ckpt-30 · Q10 · load-bearing · status supported · verified verify/r1-b8.md#V-C-r1-found-ckpt-30-1 · bar met · used-in: ch1 checkpoints, ch2 growth
- C-r1-found-ckpt-31 · Q10 · not load-bearing · status supported · verified verify/final-b2.md · bar met · used-in: ch2 growth
- C-r1-found-ckpt-32 · Q10, Q27 · load-bearing · status supported · verified verify/r1-b8.md#V-C-r1-found-ckpt-32-1 · bar met (pnLog and pnCkpt are undefined when zDb is NULL) · merged: C-r1-practice-ops-49 · used-in: ch2 growth
- C-r1-found-ckpt-33 · Q10, Q27 · load-bearing · status supported · verified verify/r1-b7.md#V-C-r1-found-ckpt-33-1 · bar met · merged: C-r1-practice-ops-47 · used-in: ch2 growth
- C-r1-found-ckpt-34 · Q10 · not load-bearing · status supported · verified verify/final-b2.md · bar met · used-in: ch1 checkpoints, ch2 growth
- C-r1-found-ckpt-35 · Q10 · not load-bearing · status candidate · not used

### found-shm (round 1)
- C-r1-found-shm-02 · Q11 · load-bearing · status supported · verified verify/r1-b6.md#V-C-r1-found-shm-02-1 · bar met (the gloss "the reader's snapshot limit" comes from the next paragraph of fileformat2.html §4.6) · used-in: ch1 wal-index
- C-r1-found-shm-03 · Q11 · load-bearing · status supported · verified verify/r1-b6.md#V-C-r1-found-shm-03-1 · bar met · used-in: ch1 wal-index
- C-r1-found-shm-04 · Q11 · not load-bearing · status supported · verified verify/final-b3.md · bar met · used-in: ch1 wal-index
- C-r1-found-shm-05 · Q11, Q13 · load-bearing · status supported · verified verify/r1-b6.md#V-C-r1-found-shm-05-1 · bar met (no byte offsets: walformat.html is inconsistent on nBackfill's) · used-in: ch1 wal-index
- C-r1-found-shm-06 · Q11 · not load-bearing · status candidate · not used
- C-r1-found-shm-07 · Q11, Q12, Q28 · load-bearing · status supported · verified verify/r1-b2.md#V-C-r1-found-shm-07-1 · bar met (attributed: the developers' account of their design) · merged: C-r1-practice-ops-52 · used-in: ch1 wal-index
- C-r1-found-shm-08 · Q11, Q15 · load-bearing · status supported · verified verify/r1-b6.md#V-C-r1-found-shm-08-1 · bar met · used-in: ch1 wal-index
- C-r1-found-shm-09 · Q11 · not load-bearing · status candidate · not used
- C-r1-found-shm-10 · Q11 · not load-bearing · status supported · verified verify/final-b3.md · bar met (attributed) · used-in: ch1 wal-index
- C-r1-found-shm-11 · Q12, Q6, Q33 · load-bearing · main · status supported · verified verify/r1-b2.md#V-C-r1-found-shm-11-1 · bar met · counter: none-found (verify/final-b3.md) · merged: C-r1-criticism-01 · used-in: ch1 wal-index, ch2 when-not
- C-r1-found-shm-12 · Q12 · load-bearing · status supported · verified verify/r1-b5.md#V-C-r1-found-shm-12-1 · bar met · used-in: ch1 wal-index
- C-r1-found-shm-13 · Q12 · load-bearing · main · status supported · verified verify/r1-b10.md#V-C-r1-found-shm-13-1 · bar met (scope: one host, chroot or a different shm file — not evidence about NFS; the comment says "might cause"; os_unix.c at master, checked by content) · counter: none-found (verify/final-b3.md) · used-in: ch1 wal-index
- C-r1-found-shm-14 · Q12 · load-bearing · status supported · verified verify/r1-b10.md#V-C-r1-found-shm-14-1 · bar met · used-in: ch1 wal-index, ch2 files
- C-r1-found-shm-15 · Q12 · not load-bearing · status supported · verified verify/final-b3.md · bar met · used-in: ch2 when-not
- C-r1-found-shm-16 · Q12 · not load-bearing · status supported · verified verify/final-b3.md · bar met (attributed) · used-in: ch2 when-not
- C-r1-found-shm-17 · Q12, Q14 · not load-bearing · status supported · verified verify/final-b3.md · bar met · used-in: ch2 turn-on
- C-r1-found-shm-18 · Q13 · not load-bearing · status candidate · not used
- C-r1-found-shm-20 · Q13 · not load-bearing · status candidate · not used
- C-r1-found-shm-21 · Q13 · not load-bearing · status supported · verified verify/final-b3.md · bar met · used-in: ch1 checkpoints
- C-r1-found-shm-22 · Q13 · not load-bearing · status supported · verified verify/final-b3.md · bar met · used-in: ch1 wal-index, ch2 turn-on
- C-r1-found-shm-23 · Q13 · not load-bearing · status candidate · not used
- C-r1-found-shm-24 · Q13 · not load-bearing · status candidate · not used
- C-r1-found-shm-25 · Q13 · not load-bearing · status supported · verified verify/final-b3.md · bar met · used-in: ch2 turn-on
- C-r1-found-shm-26 · Q14 · not load-bearing · status supported · verified verify/final-b3.md · bar met · used-in: ch1 wal-index
- C-r1-found-shm-27 · Q14, Q15 · not load-bearing · status partial ("When EXCLUSIVE locking mode is set before the first WAL-mode access to a database, SQLite creates no -shm file and keeps the wal-index in heap memory instead of a memory-mapped file.") · verified verify/final-b3.md · bar met for the narrower claim · used-in: ch1 wal-index
- C-r1-found-shm-28 · Q14 · not load-bearing · status supported · verified verify/final-b3.md · bar met · used-in: ch1 wal-index
- C-r1-found-shm-29 · Q15 · load-bearing · status supported · verified verify/r1-b6.md#V-C-r1-found-shm-29-1 · bar met · used-in: ch1 wal-file
- C-r1-found-shm-30 · Q15 · load-bearing · status supported · verified verify/r1-b6.md#V-C-r1-found-shm-30-1 · bar met · used-in: ch1 wal-file
- C-r1-found-shm-31 · Q15, Q13 · not load-bearing · status candidate · not used
- C-r1-found-shm-32 · Q15 · load-bearing · status supported · verified verify/r1-b6.md#V-C-r1-found-shm-32-1 · bar met ("for example after a crash" follows directly; not stated) · used-in: ch1 wal-file, ch2 files
- C-r1-found-shm-33 · Q15 · load-bearing · status supported · verified verify/r1-b2.md#V-C-r1-found-shm-33-1 · bar met · used-in: ch1 wal-file, ch2 files
- C-r1-found-shm-34 · Q15 · not load-bearing · status candidate · not used
- C-r1-found-shm-36 · Q15 · not load-bearing · status candidate · not used
- C-r1-found-shm-37 · Q15, Q13 · load-bearing · status supported · verified verify/r1-b6.md#V-C-r1-found-shm-37-1 · bar met (the shared wal-index only) · used-in: ch1 wal-file, ch2 busy
- C-r1-found-shm-38 · Q15 · not load-bearing · status supported · verified verify/final-b3.md · bar met · used-in: ch2 files

### practice-config (round 1)
- C-r1-practice-config-01 · Q16 · load-bearing · status supported · verified verify/r1-b2.md#V-C-r1-practice-config-01-1 · bar met · used-in: ch2 turn-on
- C-r1-practice-config-02 · Q16 · load-bearing · status partial ("PRAGMA journal_mode=WAL returns the string 'wal' on success; if the conversion to WAL cannot be completed, the journal mode is left unchanged and the pragma returns the prior mode, for example 'delete'." Checking the returned value is the book's advice, not a documented rule) · verified verify/r1-b2.md#V-C-r1-practice-config-02-1 · bar met for the narrower claim · used-in: ch2 turn-on
- C-r1-practice-config-03 · Q16 · load-bearing · main · status partial ("Unlike the other journal modes, WAL mode is persistent: it stays in effect across multiple database connections and after closing and reopening the database, whereas a process that sets TRUNCATE and then closes and reopens the database gets the default DELETE mode.") · verified verify/r1-b3.md#V-C-r1-practice-config-03-1 · bar met for the narrower claim · counter: none-found (verify/final-b4.md) · used-in: ch2 turn-on
- C-r1-practice-config-04 · Q16 · load-bearing · status supported · verified verify/r1-b3.md#V-C-r1-practice-config-04-1 · bar met · used-in: ch2 turn-on
- C-r1-practice-config-05 · Q16 · load-bearing · status supported · verified verify/r1-b7.md#V-C-r1-practice-config-05-1 · bar met · used-in: ch2 turn-on
- C-r1-practice-config-06 · Q16 · not load-bearing · status candidate · not used
- C-r1-practice-config-07 · Q17, Q29 · load-bearing · status supported · verified verify/r1-b7.md#V-C-r1-practice-config-07-1 · bar met · merged: C-r1-evidence-04 · used-in: ch2 durability
- C-r1-practice-config-08 · Q17, Q34 · load-bearing · status supported · verified verify/r1-b7.md#V-C-r1-practice-config-08-1 · bar met (keep the docs' "helps ensure"; it assumes storage that honours sync, C-r2-practice-config-09) · merged: C-r1-criticism-27 · used-in: ch2 durability
- C-r1-practice-config-09 · Q17, Q34 · load-bearing · main · status supported · verified verify/r1-b7.md#V-C-r1-practice-config-09-1 · bar met (never write "WAL cannot corrupt" unqualified: D-10) · counter: C-v4-02 → D-10, resolved-by-scope (verify/final-b4.md) · merged: C-r1-criticism-24 · used-in: ch2 durability
- C-r1-practice-config-10 · Q17, Q34 · load-bearing · status partial ("The SQLite docs state that transactions are durable across application crashes regardless of the synchronous setting or journal mode; the synchronous setting affects survival of operating-system crashes and power loss.") · verified verify/r1-b7.md#V-C-r1-practice-config-10-1 · bar met for the narrower claim · merged: C-r1-criticism-25 · used-in: ch2 durability
- C-r1-practice-config-11 · Q17 · load-bearing · status supported · verified verify/r1-b7.md#V-C-r1-practice-config-11-1 · bar met · used-in: ch2 durability
- C-r1-practice-config-12 · Q17 · not load-bearing · status supported · verified verify/final-b4.md · bar met · used-in: ch2 durability
- C-r1-practice-config-13 · Q17, Q34 · load-bearing · main · status supported (attributed form only: "the SQLite documentation recommends") · verified verify/r1-b7.md#V-C-r1-practice-config-13-1 · bar met for the attributed form; no rung-2 pair found for the chapter's own voice · counter: none-found (verify/final-b4.md) · D-08 side B (resolved-by-scope) · merged: C-r1-criticism-26 · used-in: ch2 durability
- C-r1-practice-config-14 · Q17, Q22 · not load-bearing · status supported · verified verify/final-b4.md · bar met · merged: C-r1-practice-ops-08 · used-in: ch2 durability, ch2 growth
- C-r1-practice-config-15 · Q18 · not load-bearing · status supported · verified verify/final-b4.md · bar met · used-in: ch2 durability
- C-r1-practice-config-16 · Q18 · not load-bearing · status supported · verified verify/final-b4.md · bar met · D-03 side A · used-in: ch2 durability
- C-r1-practice-config-17 · Q19 · load-bearing · status supported · verified verify/r1-b3.md#V-C-r1-practice-config-17-1 · bar met · used-in: ch2 busy
- C-r1-practice-config-18 · Q19 · load-bearing · status supported · verified verify/r1-b3.md#V-C-r1-practice-config-18-1 · bar met · used-in: ch2 busy
- C-r1-practice-config-19 · Q19 · load-bearing · status supported · verified verify/r1-b3.md#V-C-r1-practice-config-19-1 · bar met · used-in: ch2 busy
- C-r1-practice-config-20 · Q19, Q20 · load-bearing · status supported · verified verify/r1-b9.md#V-C-r1-practice-config-20-1 · bar met · used-in: ch2 busy
- C-r1-practice-config-21 · Q19, Q20 · load-bearing · status partial ("SQLITE_BUSY_SNAPSHOT (extended code 517) occurs on WAL-mode databases when a connection tries to promote a read transaction into a write transaction but another connection has already written to the database since the reader's snapshot.") · verified verify/r1-b9.md#V-C-r1-practice-config-21-1 · bar met for the narrower claim · used-in: ch2 busy
- C-r1-practice-config-22 · Q19, Q20 · load-bearing · status supported · verified verify/r1-b9.md#V-C-r1-practice-config-22-1 · bar met · used-in: ch2 busy
- C-r1-practice-config-23 · Q20 · load-bearing · status supported · verified verify/r1-b9.md#V-C-r1-practice-config-23-1 · bar met · used-in: ch2 busy
- C-r1-practice-config-24 · Q20 · load-bearing · main · status contested · verified verify/r1-b9.md#V-C-r1-practice-config-24-1 (supported as the docs' guarantee) · counter: C-v4-01 → D-09 (verify/final-b4.md) · used-in: ch2 busy
- C-r1-practice-config-25 · Q20 · not load-bearing · status supported · verified verify/final-b4.md · bar met · used-in: ch2 busy
- C-r1-practice-config-26 · Q20 · load-bearing · status supported · verified verify/r1-b9.md#V-C-r1-practice-config-26-1 · bar met as written; the page states the deadlock case in rollback-journal lock names and never mentions WAL (the WAL path is C-r2-practice-config-01, -03, -04) · used-in: ch2 busy
- C-r1-practice-config-27 · Q19, Q20, Q21 · load-bearing · status supported · verified verify/r1-b9.md#V-C-r1-practice-config-27-1 · bar met · used-in: ch2 busy
- C-r1-practice-config-28 · Q19, Q20 · not load-bearing · status supported · verified verify/final-b4.md · bar met (SQLITE_LOCKED's "or sometimes a shared-cache connection" qualifier is omitted) · used-in: ch2 busy
- C-r1-practice-config-29 · Q21 · not load-bearing · status supported · verified verify/final-b5.md · bar met · used-in: ch2 busy
- C-r1-practice-config-30 · Q21 · not load-bearing · status supported · verified verify/final-b5.md · bar met · used-in: ch2 busy
- C-r1-practice-config-31 · Q21 · not load-bearing · status supported · verified verify/final-b5.md · bar met · used-in: ch2 busy
- C-r1-practice-config-32 · Q21 · not load-bearing · status supported · verified verify/final-b5.md · bar met (mattn master dbbe931 was still the head on 2026-10-23) · used-in: ch2 busy
- C-r1-practice-config-33 · Q21 · not load-bearing · status supported · verified verify/final-b5.md · bar met (the docs state no default timeout; the code was not read) · used-in: ch2 busy

### practice-ops (round 1)
- C-r1-practice-ops-02 · Q22 · load-bearing · status supported · verified verify/r1-b7.md#V-C-r1-practice-ops-02-1 · bar met · used-in: ch2 growth
- C-r1-practice-ops-04 · Q22 · load-bearing · main · status supported · verified verify/r1-b3.md#V-C-r1-practice-ops-04-1 · bar met (the suggestion is attributed) · counter: none-found (verify/final-b6.md; C-v6-02 names the related hazard of colliding checkpointers, C-r1-found-ckpt-25) · used-in: ch2 growth
- C-r1-practice-ops-05 · Q22 · load-bearing · status supported · verified verify/r1-b7.md#V-C-r1-practice-ops-05-1 · bar met · used-in: ch2 growth
- C-r1-practice-ops-06 · Q22 · load-bearing · status supported · verified verify/r1-b3.md#V-C-r1-practice-ops-06-1 · bar met · used-in: ch2 growth
- C-r1-practice-ops-07 · Q22, Q27 · not load-bearing · status candidate · not used
- C-r1-practice-ops-09 · Q22, Q30 · not load-bearing (attributed) · status supported · verified verify/final-b6.md · bar met for the attributed form · merged: C-r1-evidence-22 · used-in: ch2 growth
- C-r1-practice-ops-11 · Q22, Q24 · load-bearing · status supported · verified verify/r1-b8.md#V-C-r1-practice-ops-11-1 · bar met · used-in: ch2 growth
- C-r1-practice-ops-13 · Q23 · load-bearing · status supported · verified verify/r1-b3.md#V-C-r1-practice-ops-13-1 · bar met · used-in: ch2 growth
- C-r1-practice-ops-15 · Q23 · not load-bearing · status supported · verified verify/final-b6.md · bar met · used-in: ch2 growth
- C-r1-practice-ops-18 · Q23 · load-bearing · status partial ("An implicit transaction is committed automatically when its last active statement finishes; the only way to be sure a statement has finished is to call sqlite3_reset() or sqlite3_finalize() on it, and an open sqlite3_blob counts as an unfinished statement." The link to WAL growth is not on the page; C-r1-cases-07 makes it, attributed to Hipp) · verified verify/r1-b9.md#V-C-r1-practice-ops-18-1 · bar met for the narrower claim · used-in: ch2 growth
- C-r1-practice-ops-19 · Q23 · not load-bearing · status supported · verified verify/final-b6.md · bar met · used-in: ch2 growth
- C-r1-practice-ops-20 · Q23, Q27 · load-bearing · status supported · verified verify/r1-b3.md#V-C-r1-practice-ops-20-1 · bar met · used-in: ch2 growth
- C-r1-practice-ops-21 · Q24 · load-bearing · main · status contested · verified verify/r1-b7.md#V-C-r1-practice-ops-21-1 (supported as the docs' wording) · counter: C-v6-01 → D-11 (verify/final-b6.md) · used-in: ch2 growth
- C-r1-practice-ops-22 · Q24 · load-bearing · status supported · verified verify/r1-b7.md#V-C-r1-practice-ops-22-1 · bar met · used-in: ch2 growth
- C-r1-practice-ops-23 · Q24 · load-bearing (attributed) · main · status supported · verified verify/r1-b3.md#V-C-r1-practice-ops-23-1 · bar met for the attributed form ("run to completion" holds only while the busy handler keeps waiting: D-12) · counter: C-v6-02 → D-12, resolved-by-scope (verify/final-b6.md) · used-in: ch2 growth
- C-r1-practice-ops-24 · Q24 · load-bearing · status contested · verified verify/r1-b3.md#V-C-r1-practice-ops-24-1 (supported as attributed to wal.html) · D-01 side A · used-in: ch2 growth
- C-r1-practice-ops-25 · Q24 · load-bearing · status contested · verified verify/r1-b8.md#V-C-r1-practice-ops-25-1 · D-01 side B · used-in: ch2 growth
- C-r1-practice-ops-26 · Q23, Q24 · not load-bearing · status supported · verified verify/final-b6.md · not used (its "recommends … yet" framing reads struck-through text as live: C-v8-02, D-05)
- C-r1-practice-ops-27 · Q25 · load-bearing · status supported · verified verify/r1-b10.md#V-C-r1-practice-ops-27-1 · bar met · used-in: ch2 files
- C-r1-practice-ops-28 · Q25 · load-bearing · main · status supported · verified verify/r1-b10.md#V-C-r1-practice-ops-28-1 · bar met ("over SSH" is a capability, not a requirement; before 3.50.0 sqlite3_rsync needed both databases in WAL: D-13) · counter: C-v7-01 → D-13, resolved-by-scope; C-v7-02 corroborates C-r1-practice-ops-31 (verify/final-b7.md) · used-in: ch2 files
- C-r1-practice-ops-29 · Q25, Q26 · load-bearing · status supported · verified verify/r1-b10.md#V-C-r1-practice-ops-29-1 · bar met · used-in: ch2 files
- C-r1-practice-ops-30 · Q25 · load-bearing · status supported · verified verify/r1-b10.md#V-C-r1-practice-ops-30-1 · bar met · used-in: ch2 files
- C-r1-practice-ops-31 · Q25 · load-bearing · status supported · verified verify/r1-b10.md#V-C-r1-practice-ops-31-1 · bar met · used-in: ch2 files
- C-r1-practice-ops-32 · Q25 · not load-bearing · status supported · verified verify/final-b6.md · bar met · used-in: ch2 files
- C-r1-practice-ops-33 · Q25 · not load-bearing · status candidate · not used
- C-r1-practice-ops-34 · Q25 · not load-bearing · status candidate · not used
- C-r1-practice-ops-35 · Q25 · load-bearing (attributed comparison) · main · status supported · verified verify/r1-b10.md#V-C-r1-practice-ops-35-1 · bar met for the attributed form · counter: none-found (verify/final-b7.md) · used-in: ch2 files
- C-r1-practice-ops-36 · Q25 · load-bearing · status supported · verified verify/r1-b10.md#V-C-r1-practice-ops-36-1 · bar met · used-in: ch2 files
- C-r1-practice-ops-37 · Q25 · not load-bearing · status supported · verified verify/final-b6.md · bar met · used-in: ch2 files
- C-r1-practice-ops-38 · Q25 · not load-bearing · status supported · verified verify/final-b6.md · bar met · used-in: ch2 files
- C-r1-practice-ops-39 · Q26, Q33 · load-bearing · main · status supported · verified verify/r1-b3.md#V-C-r1-practice-ops-39-1 · bar met · counter: none-found (verify/final-b7.md) · merged: C-r1-criticism-34 · used-in: ch2 files
- C-r1-practice-ops-40 · Q26 · load-bearing · status supported · verified verify/r1-b3.md#V-C-r1-practice-ops-40-1 · bar met · used-in: ch2 files
- C-r1-practice-ops-41 · Q26 · not load-bearing · status supported · verified verify/final-b6.md · bar met · used-in: ch2 files
- C-r1-practice-ops-42 · Q26 · load-bearing · status supported · verified verify/r1-b10.md#V-C-r1-practice-ops-42-1 · bar met · used-in: ch2 files
- C-r1-practice-ops-43 · Q26 · load-bearing · status supported · verified verify/r1-b10.md#V-C-r1-practice-ops-43-1 · bar met · used-in: ch2 files
- C-r1-practice-ops-44 · Q26 · load-bearing · status partial ("SQLite's docs say that on POSIX-like systems, if two processes have the same database open and one closes it, unlinks or renames the file, then creates and reopens a new database file under the old name, the two different database files share one WAL (or rollback journal) file because it is named after the database file, and recovery for one database may use the other's content and corrupt it.") · verified verify/r1-b10.md#V-C-r1-practice-ops-44-1 · bar met for the narrower claim · used-in: ch2 files
- C-r1-practice-ops-45 · Q26 · not load-bearing · status partial ("Processes that open one database file through different hard links (or, before SQLite 3.10.0, through different soft links) use different WAL files, so after one process crashes, another cannot recover its in-progress transaction.") · verified verify/final-b6.md · bar met for the narrower claim · used-in: ch2 files
- C-r1-practice-ops-46 · Q26 · load-bearing · status supported · verified verify/r1-b6.md#V-C-r1-practice-ops-46-1 · bar met · used-in: ch2 files
- C-r1-practice-ops-48 · Q27 · not load-bearing · status supported · verified verify/final-b6.md · bar met · used-in: ch2 growth
- C-r1-practice-ops-50 · Q27, Q24 · not load-bearing (attributed) · status supported · verified verify/final-b6.md · bar met for the attributed form (the page says "it is important to keep the WAL file size down") · used-in: ch2 growth
- C-r1-practice-ops-51 · Q28 · not load-bearing · status supported · verified verify/final-b7.md · bar met · used-in: ch2 files
- C-r1-practice-ops-53 · Q28, Q26 · not load-bearing · status candidate · not used
- C-r1-practice-ops-54 · Q28 · not load-bearing · status supported · verified verify/final-b7.md · bar met · used-in: ch2 files
- C-r1-practice-ops-55 · Q28 · not load-bearing (attributed) · status supported · verified verify/final-b7.md · bar met for the attributed form · used-in: ch2 when-not

### evidence (round 1)
- C-r1-evidence-02 · Q29 · not load-bearing · status supported · verified verify/final-b8.md · bar met (attributed, unquantified) · used-in: ch1 bg
- C-r1-evidence-03 · Q29, Q30, Q6 · not load-bearing · status supported · verified verify/final-b8.md · bar met (attributed and hedged: "might", "perhaps") · merged: C-r1-criticism-04 · used-in: ch1 limits
- C-r1-evidence-05 · Q29 · not load-bearing · status candidate · not used
- C-r1-evidence-06 · Q29 · not load-bearing · status candidate · not used
- C-r1-evidence-07 · Q29 · not load-bearing · status supported · verified verify/final-b8.md · bar met for "the authors measured" (SQLite developers among the authors) · used-in: ch2 numbers
- C-r1-evidence-08 · Q29 · not load-bearing · status supported · verified verify/final-b8.md · bar met for "the authors measured" · used-in: ch2 numbers
- C-r1-evidence-09 · Q30 · not load-bearing · status supported · verified verify/final-b8.md · bar met for "the authors measured" · used-in: ch2 numbers
- C-r1-evidence-10 · Q29 · not load-bearing · status candidate · not used (rung 3)
- C-r1-evidence-11 · Q29, Q31 · not load-bearing · status supported · verified verify/final-b8.md · bar met for "the author measured" (the cumulative-settings reading is inferred from the post's order) · D-02 (resolved-by-scope) · used-in: ch2 numbers
- C-r1-evidence-12 · Q31 · not load-bearing · status supported · verified verify/final-b8.md · bar met for "the author measured" · used-in: ch2 numbers
- C-r1-evidence-13 · Q31 · not load-bearing · status candidate · not used
- C-r1-evidence-14 · Q29, Q31 · not load-bearing · status supported · verified verify/final-b8.md · bar met for "the author measured" (macOS: its FULL figure used plain fsync, C-r2-practice-config-16) · D-02 (resolved-by-scope) · used-in: ch2 numbers
- C-r1-evidence-15 · Q31 · not load-bearing · status candidate · not used
- C-r1-evidence-18 · Q30 · not load-bearing · status supported · verified verify/final-b8.md · bar met · used-in: ch1 checkpoints
- C-r1-evidence-19 · Q30, Q6 · load-bearing · main · status supported · verified verify/r1-b4.md#V-C-r1-evidence-19-1 · bar met (attributed: no measurement of read slowdown against WAL size exists in the dossier) · counter: none-found (verify/final-b8.md) · merged: C-r1-criticism-08 · used-in: ch1 limits, ch2 growth
- C-r1-evidence-20 · Q30, Q6, Q33 · load-bearing · main · status partial ("The current SQLite WAL documentation states that since version 3.11.0 (2016-02-15) WAL mode works as efficiently with large transactions as rollback mode; it shows its older warnings (rollback journal modes likely faster above about 100 MB; WAL may fail with an I/O or disk-full error above a gigabyte) struck through as superseded.") · verified verify/final-b8.md (the r1-b4 record read the text without its strike-through markup) · bar met for the narrower claim · counter: C-v8-01, C-v8-02 → D-05, resolved-by-scope · merged: C-r1-criticism-07 · used-in: ch1 limits, ch2 when-not
- C-r1-evidence-23 · Q31 · not load-bearing (attributed) · status supported · verified verify/final-b8.md · bar met for the attributed form · used-in: ch2 numbers
- C-r1-evidence-24 · Q31 · not load-bearing · status partial ("The SQLite documentation states that SQLite supports an unlimited number of simultaneous readers but only one writer at any instant, and that in many situations each application does its work quickly so that no lock lasts for more than a few dozen milliseconds.") · verified verify/final-b8.md · bar met for the narrower claim · used-in: ch2 numbers

### criticism (round 1)
- C-r1-criticism-02 · Q6 · load-bearing · status supported · verified verify/r1-b4.md#V-C-r1-criticism-02-1 · bar met · used-in: ch1 limits
- C-r1-criticism-03 · Q6 · not load-bearing · status supported · verified verify/final-b7.md · bar met · used-in: ch1 limits
- C-r1-criticism-05 · Q6, Q33 · load-bearing · status supported · verified verify/r1-b4.md#V-C-r1-criticism-05-1 · bar met · used-in: ch1 limits
- C-r1-criticism-06 · Q6 · not load-bearing · status supported · verified verify/final-b7.md · bar met · used-in: ch1 limits
- C-r1-criticism-09 · Q6, Q33 · not load-bearing · status supported · verified verify/final-b7.md · bar met · used-in: ch1 limits
- C-r1-criticism-10 · Q6, Q33 · load-bearing · status partial ("Since SQLite 3.22.0 (2018-01-22), a read-only WAL-mode database can be opened if the -shm and -wal files already exist, or those files can be created, or the database is immutable; the documentation still calls it good practice to convert to journal_mode=DELETE before putting a database on read-only media.") · verified verify/r1-b4.md#V-C-r1-criticism-10-1 · bar met for the narrower claim · used-in: ch2 when-not
- C-r1-criticism-11 · Q32 · load-bearing · main · status supported · verified verify/r1-b4.md#V-C-r1-criticism-11-1 · bar met ("likely" present; the news page confirms 3.52.0 withdrawn and 3.51.3 carrying the fix) · counter: none-found (verify/final-b9.md) · used-in: ch2 when-not
- C-r1-criticism-12 · Q32 · load-bearing · main · status contested · verified verify/r1-b4.md#V-C-r1-criticism-12-1 (supported as attributed: "per the SQLite WAL documentation") · counter: C-v9-01 → D-14 (verify/final-b9.md) · used-in: ch2 when-not
- C-r1-criticism-13 · Q32 · not load-bearing · status candidate · not used
- C-r1-criticism-14 · Q32 · load-bearing · main · status supported · verified verify/r1-b4.md#V-C-r1-criticism-14-1 · bar met (give the versions with it: 3.7.0–3.51.2, fixed in 3.51.3) · counter: C-v10-01 (D-04; it does not contradict the trigger conditions) (verify/final-b10.md) · used-in: ch2 when-not
- C-r1-criticism-15 · Q32 · load-bearing · status supported · verified verify/r1-b4.md#V-C-r1-criticism-15-1 · bar met · used-in: ch2 when-not
- C-r1-criticism-16 · Q32 · load-bearing · status partial ("According to the SQLite documentation, after the WAL-reset race, if further transactions grow the WAL past its size at the first checkpoint, a later checkpoint skips all or part of the transaction committed during the race, so parts of it never reach the database file and the database file becomes corrupt.") · verified verify/r1-b4.md#V-C-r1-criticism-16-1 · bar met for the narrower claim · used-in: ch2 when-not
- C-r1-criticism-17 · Q32 · load-bearing (attributed) · status contested · verified verify/r1-b4.md#V-C-r1-criticism-17-1 (supported as attributed) · D-04 side A · used-in: ch2 when-not
- C-r1-criticism-18 · Q32 · load-bearing (attributed) · main · status supported · verified verify/r1-b4.md#V-C-r1-criticism-18-1 · bar met for the attributed form (unpublished telemetry) · counter: C-v10-01, C-v10-02 — a tension in another scope (a test platform; one aggressive checkpointer), not a contradiction of the field-rate estimate (verify/final-b10.md) · used-in: ch2 when-not
- C-r1-criticism-19 · Q32 · not load-bearing · status supported · verified verify/final-b7.md · bar met for the attributed form ("in an update dated 2026-08-24") · used-in: ch2 when-not
- C-r1-criticism-20 · Q32 · not load-bearing · status candidate · not used · D-06
- C-r1-criticism-21 · Q32, Q33 · load-bearing · status supported (attributed form only: "Tailscale reports the SQLite developers said") · verified verify/r1-b9.md#V-C-r1-criticism-21-1 · bar met for the attributed form · used-in: ch2 when-not, ch2 growth
- C-r1-criticism-22 · Q33 · not load-bearing · status candidate · not used
- C-r1-criticism-23 · Q33, Q34 · not load-bearing · status supported · verified verify/final-b7.md · bar met · used-in: ch2 durability
- C-r1-criticism-28 · Q34 · load-bearing · status supported · verified verify/r1-b9.md#V-C-r1-criticism-28-1 · bar met (the compile page gives the default as 2, FULL) · D-03 side A · used-in: ch2 durability
- C-r1-criticism-29 · Q34 · load-bearing (attributed) · status supported (attributed form only: "the Hacker News account 'SQLite' said"; below the bar as "Hipp said") · verified verify/r1-b9.md#V-C-r1-criticism-29-1 · D-03 side B (a forum comment: side B has no rung-1 or rung-2 source for the fact, so neither claim is contested) · used-in: ch2 durability
- C-r1-criticism-30 · Q34 · not load-bearing · status candidate · not used
- C-r1-criticism-31 · Q34 · load-bearing (attributed, rung 3) · status supported (attributed form only: "Andrew Ayer writes") · verified verify/r1-b9.md#V-C-r1-criticism-31-1 · bar met only for the attributed form · used-in: ch2 durability
- C-r1-criticism-32 · Q34 · not load-bearing · status candidate · not used
- C-r1-criticism-33 · Q34 · not load-bearing · status candidate · not used
- C-r1-criticism-35 · Q32 · not load-bearing · status contested · verified verify/final-b7.md (supported as attributed; a vendor about its own instrumented run) · D-04 side B · used-in: ch2 when-not

### cases (round 1)
- C-r1-cases-01 · Q35 · not load-bearing · status supported · verified verify/final-b9.md · bar met for the attributed form (sizes read as byte counts) · used-in: ch2 growth
- C-r1-cases-02 · Q35 · not load-bearing · status supported · verified verify/final-b9.md · bar met for the attributed form (a diagnosis; the issue is still open) · used-in: ch2 growth
- C-r1-cases-03 · Q35 · not load-bearing · status supported · verified verify/final-b9.md · bar met for the attributed form · used-in: ch2 growth
- C-r1-cases-04 · Q35 · not load-bearing · status supported · verified verify/final-b9.md · bar met for the attributed form ("argued", not "found": the account is conditional) · used-in: ch2 growth
- C-r1-cases-05 · Q35 · not load-bearing · status candidate · not used
- C-r1-cases-06 · Q35 · not load-bearing · status supported · verified verify/final-b9.md · bar met for the attributed form · used-in: ch2 growth
- C-r1-cases-07 · Q35 · not load-bearing · status supported · verified verify/final-b9.md · bar met for the attributed form · used-in: ch2 growth
- C-r1-cases-08 · Q36 · not load-bearing · status supported · verified verify/final-b9.md · bar met (Rails main, fetched 2026-10-23) · used-in: ch2 numbers
- C-r1-cases-09 · Q36 · not load-bearing · status candidate · not used
- C-r1-cases-10 · Q36 · not load-bearing · status candidate · not used
- C-r1-cases-11 · Q36 · not load-bearing · status candidate · not used
- C-r1-cases-12 · Q36 · not load-bearing · status supported · verified verify/final-b9.md · bar met for the attributed form (the PR author's rationale) · used-in: ch2 numbers
- C-r1-cases-13 · Q36 · not load-bearing · status supported · verified verify/final-b9.md · bar met for the attributed form (journal_size_limit does not cap growth during starvation: D-11) · used-in: ch2 growth
- C-r1-cases-14 · Q36 · not load-bearing · status candidate · not used
- C-r1-cases-15 · Q36 · not load-bearing · status candidate · not used
- C-r1-cases-16 · Q36 · not load-bearing · status supported · verified verify/final-b10.md · bar met (the Django page says "extra durability"; "EXTRA" is SQLite's numbering) · used-in: ch2 numbers
- C-r1-cases-17 · Q36 · not load-bearing · status supported · verified verify/final-b10.md · bar met · used-in: ch2 busy
- C-r1-cases-18 · Q36, Q37 · not load-bearing · status supported · verified verify/final-b10.md · bar met for the attributed form ("when the WAL becomes full" is Litestream's simplification) · used-in: ch2 files
- C-r1-cases-19 · Q37 · not load-bearing · status supported · verified verify/final-b10.md · bar met for the attributed form · used-in: ch2 files
- C-r1-cases-20 · Q37 · not load-bearing · status supported · verified verify/final-b10.md · bar met for the attributed form · used-in: ch2 files
- C-r1-cases-21 · Q37, Q36 · not load-bearing · status supported · verified verify/final-b10.md · bar met for the attributed form · used-in: ch2 files
- C-r1-cases-22 · Q37 · not load-bearing · status supported · verified verify/final-b10.md · bar met for the attributed form (read with -23: from v0.5.15 PASSIVE first) · used-in: ch2 files
- C-r1-cases-23 · Q37 · not load-bearing · status supported · verified verify/final-b10.md · bar met for the attributed form · used-in: ch2 files
- C-r1-cases-24 · Q37, Q35 · not load-bearing · status supported · verified verify/final-b10.md · bar met for the attributed form · used-in: ch2 growth

### found-ckpt (round 2)
- C-r2-found-ckpt-01 · Q38 · load-bearing · status supported · verified verify/r2-b1.md#V-C-r2-found-ckpt-01-1 · bar met (rung 1 code at 3.54.1, checked by content) · used-in: ch1 checkpoints, ch2 growth, ch2 busy (G-r2-01: a RESTART or TRUNCATE checkpoint holds the writer lock through its wait, so a timed TRUNCATE can stall writes)
- C-r2-found-ckpt-02 · Q38 · load-bearing · status supported · verified verify/r2-b1.md#V-C-r2-found-ckpt-02-1 · bar met · used-in: ch1 checkpoints
- C-r2-found-ckpt-03 · Q38 · load-bearing · main · status unsupported · verified verify/r2-b1.md#V-C-r2-found-ckpt-03-1 (verdict supported, bar below: exceptional against wal.html §6, and sqlite.h.in is the same owner; usable only hedged and attributed, "the 3.54.1 code, read as a whole, shows …") · counter: none-found (verify/final-b2.md; its reader-path trace agrees) · D-01 side B · used-in: ch1 checkpoints, ch2 growth
- C-r2-found-ckpt-04 · Q38 · load-bearing · status partial ("In SQLite 3.54.1, any checkpoint holds WAL_READ_LOCK(0) exclusively while it copies frames into the database file. A new read transaction that cannot get WAL_READ_LOCK(0) does not wait: it goes on to take a read mark (slot 1 to 4) and reads recent pages from the WAL. It returns WAL_RETRY, an immediate internal retry rather than a wait on the checkpoint, if it finds no usable read mark and every slot it tries to set is busy, and in some transient cases such as a changed read mark or wal-index header after locking.") · verified verify/r2-b1.md#V-C-r2-found-ckpt-04-1 · bar met for the narrower claim · D-01 side B · used-in: ch1 checkpoints
- C-r2-found-ckpt-05 · Q38 · not load-bearing · status supported · verified verify/final-b2.md · bar met (the wait runs through the busy handler only when one is configured) · used-in: ch1 checkpoints
- C-r2-found-ckpt-06 · Q38 · load-bearing · status supported · verified verify/r2-b1.md#V-C-r2-found-ckpt-06-1 · bar met · used-in: ch1 checkpoints, ch2 growth
- C-r2-found-ckpt-07 · Q38 · not load-bearing · status supported · verified verify/final-b2.md · bar met · used-in: ch1 checkpoints
- C-r2-found-ckpt-08 · Q38 · not load-bearing · status supported · verified verify/final-b2.md · bar met (the #ifdef block at wal.c L2101–L2180 cures the researcher's partial fit) · used-in: ch1 checkpoints
- C-r2-found-ckpt-09 · Q38 · load-bearing · status contested · verified verify/r2-b1.md#V-C-r2-found-ckpt-09-1 (supported: what the 3.54.1 header says) · D-01 side B · used-in: ch1 checkpoints
- C-r2-found-ckpt-10 · Q38 · not load-bearing · status candidate · not used
- C-r2-found-ckpt-11 · Q38 · not load-bearing · status supported · verified verify/final-b2.md · bar met · used-in: ch1 checkpoints
- C-r2-found-ckpt-12 · Q38 · load-bearing · status candidate (needs-rewrite: verify/r2-b1.md#V-C-r2-found-ckpt-12-1) · not used (its parts stand as C-r2-found-ckpt-09, -04, -03 and the D-01 entry)

### practice-config (round 2)
- C-r2-practice-config-01 · Q39 · load-bearing · main · status supported · verified verify/r2-b1.md#V-C-r2-practice-config-01-1 · bar met (rung 1 code at 3.54.1, checked by content; the begin-write path only) · counter: none-found (verify/final-b5.md) · used-in: ch2 busy
- C-r2-practice-config-02 · Q39 · load-bearing · status supported · verified verify/r2-b1.md#V-C-r2-practice-config-02-1 · bar met (attributed: a code comment's rationale, in rollback-lock names) · used-in: ch2 busy
- C-r2-practice-config-03 · Q39 · load-bearing · status supported · verified verify/r2-b1.md#V-C-r2-practice-config-03-1 · bar met (write "the btree retry loop" out in full when used) · used-in: ch2 busy
- C-r2-practice-config-04 · Q39 · load-bearing · status supported · verified verify/r2-b1.md#V-C-r2-practice-config-04-1 · bar met · used-in: ch2 busy
- C-r2-practice-config-05 · Q39 · load-bearing · status supported · verified verify/r2-b1.md#V-C-r2-practice-config-05-1 · bar met (the persistence clause is a direct inference from the header's change counter) · used-in: ch2 busy
- C-r2-practice-config-06 · Q39 · not load-bearing · status partial ("In SQLite 3.54.1 (without shared cache), when no transaction is open on the database and sqlite3PagerBegin returns SQLITE_BUSY_SNAPSHOT, btreeBeginTrans changes it to SQLITE_BUSY, and its retry loop then invokes the busy handler; when a read transaction is already open, the code does not convert it and does not invoke the busy handler, so the BUSY_SNAPSHOT code is returned.") · verified verify/final-b4.md · bar met for the narrower claim · used-in: ch2 busy
- C-r2-practice-config-07 · Q39 · not load-bearing · status supported · verified verify/final-b4.md · bar met ("and PRAGMA busy_timeout" rests on pragma.html's "an alternative to") · used-in: ch2 busy
- C-r2-practice-config-08 · Q40 · load-bearing · status supported · verified verify/r2-b2.md#V-C-r2-practice-config-08-1 · bar met · used-in: ch2 durability
- C-r2-practice-config-09 · Q40 · load-bearing · status supported · verified verify/r2-b2.md#V-C-r2-practice-config-09-1 · bar met · used-in: ch2 durability
- C-r2-practice-config-10 · Q40 · load-bearing (attributed) · status supported (attributed form only: SQLite's generalisation about third-party drives) · verified verify/r2-b2.md#V-C-r2-practice-config-10-1 · bar met for the attributed form · used-in: ch2 durability
- C-r2-practice-config-11 · Q40 · load-bearing · status supported · verified verify/r2-b2.md#V-C-r2-practice-config-11-1 · bar met (howtocorrupt.html alone covers it) · used-in: ch2 durability
- C-r2-practice-config-12 · Q40 · not load-bearing · status candidate · not used
- C-r2-practice-config-13 · Q40 · load-bearing · status supported · verified verify/r2-b2.md#V-C-r2-practice-config-13-1 · bar met · used-in: ch2 durability
- C-r2-practice-config-14 · Q40 · load-bearing · main · status supported · verified verify/r2-b2.md#V-C-r2-practice-config-14-1 · bar met (the documented defaults; pragma.c L245–L246 ties the pragma to the pager flag, verify/final-b5.md) · counter: none-found (verify/final-b5.md) · used-in: ch2 durability
- C-r2-practice-config-15 · Q40 · load-bearing · status supported · verified verify/r2-b1.md#V-C-r2-practice-config-15-1 · bar met (attributed to the pager.c comment) · used-in: ch2 durability
- C-r2-practice-config-16 · Q40 · load-bearing · status partial ("In SQLite 3.54.1's Unix VFS, on a system that defines F_FULLFSYNC (macOS, per the code's comment), each sync calls fcntl(F_FULLFSYNC) only when a full sync is requested and otherwise calls plain fsync(); it also falls back to fsync() if F_FULLFSYNC fails. On other Unix systems the code calls fdatasync(), but a macro in os_unix.c turns that into fsync() unless the build defines HAVE_FDATASYNC.") · verified verify/r2-b1.md#V-C-r2-practice-config-16-1 · bar met for the narrower claim · used-in: ch2 durability
- C-r2-practice-config-17 · Q40 · load-bearing · main · status contested · verified verify/r2-b2.md#V-C-r2-practice-config-17-1 (supported; the fsync.2 text unchanged since 2016) · counter: none-found (verify/final-b5.md) · D-07 side B · used-in: ch2 durability
- C-r2-practice-config-18 · Q40 · load-bearing · status supported · verified verify/r2-b2.md#V-C-r2-practice-config-18-1 · bar met · used-in: ch2 durability
- C-r2-practice-config-19 · Q40 · not load-bearing · status candidate · not used
- C-r2-practice-config-20 · Q40 · load-bearing (attributed) · status contested · verified verify/r2-b2.md#V-C-r2-practice-config-20-1 (supported as attributed; an old rollback-mode article) · D-07 side A · used-in: ch2 durability
- C-r2-practice-config-21 · Q40 · not load-bearing (attributed) · status supported · verified verify/final-b5.md · bar met for the attributed form · D-08 side A (resolved-by-scope) · used-in: ch2 durability

### Verifiers' counter-claims (D5; entries in the verify file named; recorded with verbatim passages, not themselves verified)
- C-v4-01 · Q20 · not load-bearing · status candidate · verify/final-b4.md · source S-v4-01 (lang_transaction.html, rung 1) · D-09 side B · used-in: ch2 busy
- C-v4-02 · Q17, Q32 · not load-bearing · status candidate · verify/final-b4.md · source S-v4-02 (wal.html §11, rung 1) · D-10 · used-in: ch2 durability, ch2 when-not
- C-v6-01 · Q24 · not load-bearing · status candidate · verify/final-b6.md · source S-v6-01 (wal.c at master, unpinned, checked by substance) · D-11 side B · used-in: ch2 growth
- C-v6-02 · Q24, Q10 · not load-bearing · status candidate · verify/final-b6.md · source S-v6-03 (c3ref/wal_checkpoint_v2, rung 1) · D-12 · used-in: ch2 growth
- C-v7-01 · Q25 · not load-bearing · status candidate · verify/final-b7.md · source S-v7-01 (rsync.html, rung 1) · D-13 · used-in: ch2 files
- C-v7-02 · Q25 · not load-bearing · status candidate · verify/final-b7.md · source S-v7-02 (c3ref/backup_finish, rung 1) · corroborates C-r1-practice-ops-31 · used-in: ch2 files
- C-v8-01 · Q30, Q6 · not load-bearing · status candidate · verify/final-b8.md · source S-v8-01 (releaselog/3_11_0.html, rung 1) · D-05 · used-in: ch1 limits
- C-v8-02 · Q30, Q6 · not load-bearing · status candidate · verify/final-b8.md · source S-v8-02 (wal.html with its strike-through markup, rung 1) · D-05 · used-in: ch1 limits, ch2 when-not
- C-v9-01 · Q32 · not load-bearing · status candidate · verify/final-b9.md · source S-v9-05 (sqlite.org/src timeline, rung 1) · D-14 side B · used-in: ch2 when-not
- C-v10-01 · Q32 · not load-bearing · status candidate · verify/final-b10.md · source S-v10-02 (Antithesis, a vendor about its own run) · D-04 side B · used-in: ch2 when-not
- C-v10-02 · Q32, Q33 · not load-bearing · status candidate · verify/final-b10.md · source S-v10-03 (Tailscale about its own system) · corroborates C-r1-criticism-21 · used-in: ch2 when-not

## Question states (the lead's, after D5s)
- answered: Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q11, Q12, Q13, Q14, Q15, Q16, Q17, Q18, Q19, Q21, Q22, Q23, Q25, Q26, Q27, Q28, Q29, Q30, Q33, Q34, Q35, Q36, Q37, Q39
- contested: Q9 (D-01), Q10 (D-01), Q20 (D-09), Q24 (D-01, D-11), Q32 (D-04, D-14), Q40 (D-07)
- thin: Q31 (no independent measurement of several writers at once), Q38 (its direct conclusion C-r2-found-ckpt-03 below the bar as exceptional; the code facts it rests on are supported)
- load-bearing questions answered or contested: 26 of 27 (Q38 thin) · must-cover items answered or contested: 5 of 5

## Disagreements

### D-01
- claims: C-r1-found-ckpt-21, C-r1-practice-ops-24 (side A); C-r1-found-ckpt-29, C-r1-practice-ops-25, C-r2-found-ckpt-03, C-r2-found-ckpt-04, C-r2-found-ckpt-09 (side B)
- side A: S-r1-found-ckpt-01/P16 (wal.html §6) "readers might block while the checkpoint is running" for RESTART and TRUNCATE (rung 1); the sentence was already on the page in 2016 (C-r2-found-ckpt-11)
- side B: S-r1-found-ckpt-02/P3 (c3ref/wal_checkpoint_v2) RESTART "does not impede readers"; S-r1-found-ckpt-03/P9 (pragma.html) RESTART "allows readers to proceed" (rung 1); S-r2-found-ckpt-06 (sqlite.h.in at 3.54.1, the same "does not impede readers"); S-r2-found-ckpt-01 (wal.c at 3.54.1: a new reader takes WAL_READ_LOCK(0) or a read mark without waiting for the checkpoint; only brief internal retries, C-r2-found-ckpt-07) (rung 1)
- nature: factual (every source has one owner, the SQLite project)
- prominence: the API reference, the pragma page and the release source take side B; the overview page takes side A. A narrow reading in which both hold (a reader racing TRUNCATE's header rewrite retries briefly, C-r2-found-ckpt-06/-07; blocking-lock builds untraced, C-r2-found-ckpt-08) is the researcher's, not stated by any source
- would settle it: a statement from the SQLite developers on the wal.html §6 sentence, or a test that starts a new reader while a RESTART or TRUNCATE checkpoint is in its busy-handler wait
- status: open

### D-02
- claims: C-r1-evidence-14 (about 2x), C-r1-evidence-11 (under 2%); C-r1-evidence-10 (about 15x, rung 3, not used)
- side A: S-r1-evidence-09/P3–P4, a 2025 blog benchmark on macOS: 20,654 against 44,096 TPS (rung 1 for the author's own run)
- side B: S-r1-evidence-04/P5–P6, a 2024 Django blog benchmark: 998.72 against 1014.35 requests/s (rung 1 for the author's own run)
- nature: scope/conditions (different workloads, hardware, operating systems and years)
- prominence: no independent rung-2 measurement found; each figure stands only for its own setup
- would settle it: one dated, independent measurement of FULL against NORMAL in WAL mode on Linux with a stated workload
- status: resolved-by-scope (each source states its own workload, hardware and date; neither claims generality)

### D-03
- claims: C-r1-criticism-28, C-r1-practice-config-16 (side A); C-r1-criticism-29 (side B)
- side A: S-r1-criticism-09/P3 (compile.html): unless overridden at compile time SQLITE_DEFAULT_WAL_SYNCHRONOUS "will always be the same as SQLITE_DEFAULT_SYNCHRONOUS and so no automatic synchronous setting changes will ever occur" (rung 1); with S-r1-criticism-02/P4, FULL is durable in WAL mode
- side B: S-r1-criticism-08/P2 (Hacker News, the account "SQLite", 2025): "If you switch to WAL mode, the default behavior is that transactions are durable across application crashes … but are not necessarily durable across OS crashes or power failures" (a forum comment; rung 1 only if the account is the SQLite author, which no opened source confirms)
- nature: version/time or build (it may depend on the build's SQLITE_DEFAULT_WAL_SYNCHRONOUS, or on wrappers and platform builds)
- prominence: the project's documentation takes side A; side B is one forum comment
- would settle it: the SQLITE_DEFAULT_WAL_SYNCHRONOUS value in a stock sqlite.org amalgamation, or `PRAGMA synchronous` read after switching a stock build to WAL; the forum post sqlite.org/forum/forumpost/8d7e2aae21a261f2 (a lead)
- status: open

### D-04
- claims: C-r1-criticism-17 (side A); C-r1-criticism-35, C-v10-01 (side B)
- side A: S-r1-criticism-01/P17 (wal.html §11): the race "requires an unusual usage pattern. It is unlikely to occur in common use." (rung 1, the project about its own bug)
- side B: S-r1-criticism-11/P1 and S-v10-02 (Antithesis, 2026-08-12): on an instrumented SQLite 3.51.2 under its platform, a workload of concurrent writes and checkpoints it calls "completely generic" hit the bug in 15 minutes (rung 1 for its own run; a vendor about its own tool)
- nature: scope/conditions (a deterministic test platform against organic timing in common use)
- prominence: the project's page takes side A; one vendor post side B. Tailscale's production account (C-v10-02, C-r1-criticism-21) fits side A's explanation: its aggressive manual checkpointing raised its exposure
- would settle it: an independent reproduction under organic scheduling (Phil Eaton's reproducer, cited by sqlite.org, was not readable: HTTP 403)
- status: open

### D-05
- claims: C-r1-evidence-20, C-r1-practice-ops-26 (not used); C-v8-01, C-v8-02
- side A: S-r1-evidence-01/P3 (wal.html §1): rollback journal modes likely faster above about 100 MB; WAL may fail over a gigabyte (rung 1) — shown struck through on the current page (C-v8-02)
- side B: S-r1-evidence-01/P4 (wal.html §1): since 3.11.0 WAL "works as efficiently with large transactions as does rollback mode" (rung 1); the 3.11.0 release log (C-v8-01)
- nature: version/time
- prominence: the page itself marks side A as superseded
- would settle it: settled by the page's own markup and the 3.11.0 release log
- status: resolved-by-scope (side A is pre-3.11.0 text, struck through; side B is the live statement)

### D-06
- claims: C-r1-criticism-20 (not used)
- side A: S-r1-criticism-07/P2 (Tailscale): 3.51.3 "only contained a fix for the WAL-Reset bug" (rung 1 for Tailscale's account)
- side B: S-r1-criticism-06 (releaselog/3_51_3.html): lists "Fix the WAL-reset database corruption bug." and "Other minor bug fixes." (rung 1)
- nature: factual (minor)
- prominence: the release notes take side B
- would settle it: the 3.51.3 check-in list
- status: open

### D-07
- claims: C-r2-practice-config-20 (side A); C-r2-practice-config-17 (side B)
- side A: S-r2-practice-config-05/P5 (sqlite.org/atomiccommit.html, an article on rollback mode from the 3.5.0 era) of fullfsync: "So its use is not recommended" (rung 1, the project's own evaluation)
- side B: S-r2-practice-config-12/P4 (Apple's fsync(2)): "Applications, such as databases, that require a strict ordering of writes should use F_FULLFSYNC" (rung 1, Apple about its own OS)
- nature: scope/conditions (an old rollback-mode article's performance judgement against the OS vendor's durability guidance)
- prominence: each side is its own owner's advice; no independent rung-2 source opened
- would settle it: a current statement from the SQLite project on fullfsync in WAL mode on APFS
- status: open

### D-08
- claims: C-r2-practice-config-21 (side A); C-r1-practice-config-13 (side B)
- side A: S-r2-practice-config-04/P8 (howtocorrupt.html): "SQLite should always be run with its default synchronous setting of FULL" for maximum reliability and robustness against corruption (rung 1, attributed)
- side B: S-r1-practice-config-02/P7 (pragma.html): NORMAL is "the best balance … for most applications running in WAL mode" (rung 1, attributed)
- nature: scope/conditions
- prominence: both are the project's own pages, each stating its scope
- would settle it: nothing to settle; each source states its goal
- status: resolved-by-scope (maximum robustness against corruption, against a performance-and-safety balance for most WAL applications)

### D-09
- claims: C-r1-practice-config-24 (side A); C-v4-01 (side B)
- side A: S-r1-practice-config-03 (rescode.html) and lang_transaction.html: once BEGIN IMMEDIATE succeeds, no later operation through the next COMMIT returns SQLITE_BUSY (rung 1)
- side B: S-v4-01 (lang_transaction.html §2.3): a COMMIT can return SQLITE_BUSY when another thread or process has an open read connection, naming no journal mode (rung 1)
- nature: scope/conditions (likely rollback mode only, where a writer must wait for readers; WAL readers do not block a writer, C-r1-found-rw-12 — but neither page states the scope)
- prominence: both are the project's own pages
- would settle it: a sentence in the docs scoping §2.3 to rollback mode, or the COMMIT path in pager.c for WAL
- status: open

### D-10
- claims: C-r1-practice-config-09; C-v4-02
- side A: S-r1-practice-config-02/P6 (pragma.html): WAL with synchronous=NORMAL is safe from corruption (rung 1)
- side B: S-v4-02 (wal.html §11): the WAL-reset bug could in rare cases corrupt WAL databases in 3.7.0–3.51.2, fixed in 3.51.3 (rung 1)
- nature: version/time
- prominence: one owner; the bug is version-scoped and independent of the synchronous setting
- would settle it: settled by wal.html §11's own version range
- status: resolved-by-scope (the synchronous property holds as documented; the bug is a defect of 3.7.0–3.51.2)

### D-11
- claims: C-r1-practice-ops-21 (side A); C-v6-01 (side B)
- side A: S-r1-practice-ops-02/P8–P9 (pragma.html): with journal_size_limit set, the WAL file is truncated to the limit each time a transaction commits or the WAL resets (rung 1)
- side B: S-v6-01 (wal.c on master, checked by substance): the truncation happens only at the commit that completes the first transaction in a newly started WAL, and to the larger of the limit and that transaction's end (rung 1 code, unpinned)
- nature: factual (the docs' wording is looser than the code)
- prominence: the code is the narrower, more specific account; C-r1-found-ckpt-07's verifier read the same in wal.c
- would settle it: the same wal.c range at a release tag, pinned and hashed
- status: open

### D-12
- claims: C-r1-practice-ops-23; C-v6-02 (with C-r1-found-ckpt-26)
- side A: S-r1-practice-ops-01/P20 (wal.html §6): RESTART and TRUNCATE checkpoints "run to completion before returning" (rung 1, attributed)
- side B: S-v6-03 (c3ref/wal_checkpoint_v2): a FULL, RESTART or TRUNCATE checkpoint whose busy handler returns 0 proceeds like PASSIVE and returns SQLITE_BUSY (rung 1)
- nature: scope/conditions
- prominence: the API reference states the condition; the overview does not
- would settle it: settled by the API reference's own condition
- status: resolved-by-scope (they complete while the busy handler keeps waiting; with none, or when it gives up, they return SQLITE_BUSY)

### D-13
- claims: C-r1-practice-ops-28; C-v7-01
- side A: S-r1-practice-ops-04/P2 (howtocorrupt.html): sqlite3_rsync (3.47.0 and later) is one of three live-backup methods, "over SSH" (rung 1)
- side B: S-v7-01 (rsync.html): sqlite3_rsync also works when both databases are local; before 3.50.0 both had to be in WAL mode with the same page size (rung 1)
- nature: version/time and scope
- prominence: rsync.html is the tool's own page
- would settle it: settled by rsync.html
- status: resolved-by-scope

### D-14
- claims: C-r1-criticism-12 (side A); C-v9-01 (side B)
- side A: S-r1-criticism-01/P15 (wal.html §11): backports of the WAL-reset fix "are available" for 3.44.6 and 3.50.7 (rung 1)
- side B: S-v9-05 (sqlite.org/src timeline, 2026-10-23): no check-in tagged version-3.44.6 or version-3.50.7; the fix appears only as untagged check-ins on branch-3.44 and branch-3.50 dated 2026-03-05; releaselog pages for both return 404 (rung 1)
- nature: version/time (backports on maintenance branches, not tagged releases)
- prominence: one owner; the documentation states it, the repository shows no release
- would settle it: a tagged 3.44.6 or 3.50.7 release, or a docs correction
- status: open

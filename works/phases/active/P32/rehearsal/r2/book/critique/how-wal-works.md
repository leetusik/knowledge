# Critique: how-wal-works

- kind: chapter · slice: P90.S1
- draft: works/phases/active/P90/book/how-wal-works.md
- verdict: revise
- confidence: high
- must_fix: 2 (facts 1, citations 1, ledger 0, coverage 0, diagrams 0, quiz 0, order 0, reader 0, clarity 0, rules 0)
- should_fix: 5
- notes: 6
- critic_model: claude-sonnet-5-5 · writer_model: opus
- checked: 18 sources in the block (12 opened by a fresh fetch; 6 read only as the dossier's cached copies of the same URLs, see Not seen), 14 code claims grepped, 5 quiz items answered
- ledger: 58 claims traced against their passages, 0 untraceable, 12 sources re-opened
- coverage: 15/15 load-bearing questions answered or declared; must-cover 3/3
- skill: plugin/skills/explain/SKILL.md (the path in the dispatch), read for §3, §4.1, §4.2, §4.4, §4.5, §4.6
- open_items: C01, C02, C03, C04, C05, C06, C07

Scratch files cited below live in `<scratch>` (the dispatch's scratch folder under the dossier's `pages/`).

## Findings

### C01 · must-fix · facts
- where: wal-index (`#wal-index`) · line 158
- finding: The chapter says the -shm "grows only when the -wal holds more than 4,079 frames", but the cited page contradicts its own number and the 3.54.1 code gives 4,062.
- evidence: `<scratch>/walformat.html` line 279 says "more than 4079 frames", but the same page's §2.2 (lines 522, 539, 548) lays out the first 32,768-byte unit as `u32 aPgno[4062];` and says "The first 4062 entries are on the first 32768-byte unit of the shm file". The pinned wal.c (dossier cached copy, `dossier:pages/S-r2-found-ckpt-01.txt`) has `#define HASHTABLE_NPAGE_ONE (HASHTABLE_NPAGE - (WALINDEX_HDR_SIZE/sizeof(u32)))` (line 656), a comment listing `HASHTABLE_NPAGE_ONE 4062` (line 167) and `assert( 4062 == HASHTABLE_NPAGE_ONE )` (line 1708). The second hash table, and so a larger -shm, is needed from frame 4,063. The ledger holds C-r1-found-shm-04 as supported because it repeats the page's sentence; the verifier did not cross-check it against §2.2 or the code. The number is in the MC3 section and is stated in the chapter's own voice.
- fix: say "more than about 4,000 frames" (or 4,062, citing §2.2), or attribute the 4,079 to the page and say its own table gives 4,062.
- confidence: high (the page's two numbers, fresh fetch); medium for the code lines (cached copy)

### C02 · must-fix · citations
- where: three files (`#three-files`) · line 141
- finding: "The -wal exists for as long as any connection has the database open" is cited only to walformat.html, which does not say it.
- evidence: Fresh fetch of `<scratch>/walformat.html` §1.4 says only "When a WAL mode database is in active use, all three of the above files usually exist"; a search for "as long as" and "any connection" finds only lock descriptions. The sentence is wal.html §4: "The WAL file exists for as long as any database connection has the database open" (`<scratch>/wal.html` line 478). The ledger claim C-r1-found-shm-29 (load-bearing, Q15) has wal.html as its second support (S-r1-found-shm-01/P12); the chapter cites only the first. This is T4's "when it exists" answer.
- fix: add the wal.html link to that sentence.
- confidence: high

### C03 · should-fix · citations
- where: `flow-commit-read` caption · line 79
- finding: The caption sends the reader to "fileformat2.html §4.4–§4.6", but §4.4 is the WAL reset, which the diagram does not show; the write-path steps are in §4.1.
- evidence: Fresh fetch of `<scratch>/fileformat2.html` lines 171-176: 4.1 WAL File Format (frames and the commit marker), 4.3 Checkpoint Algorithm, 4.4 WAL Reset, 4.5 Reader Algorithm, 4.6 WAL-Index Format. The range was copied from the book outline's sketch rather than checked against the page.
- fix: "§4.1, §4.5–§4.6".
- confidence: high

### C04 · should-fix · ledger
- where: three-files table, -shm row · line 149; `q-crash-files` explain · line 386 (and line 320)
- finding: "Never delete the -shm while the database is open" is stated in the chapter's own voice in the table and the quiz explanation, but the ledger holds it only in the attributed form.
- evidence: C-ch1-r1-shm-files-06 is "A comment in SQLite 3.54.1's wal.c says a connection holds a SHARED lock … to prevent any other client from unlinking the WAL or wal-index (-shm) file, and that if another process unlinked one of these files just after this client opened it, 'the system would be badly broken'"; its ledger line says "bar met for the attributed form" and that the `rm` point is the researcher's reading. Line 149 reads "But never delete it while the database is open (below)" and line 386 reads "Even so, never delete the -shm while any connection has the database open", both unattributed. Only the warning callout (line 152) and line 320 ("as SQLite's source warns") attribute it, and line 320 also stretches a comment about unlinking "just after this client opened" the file into "while the database is open".
- fix: attribute it in the table cell and the explanation ("SQLite's source warns …").
- confidence: medium

### C05 · should-fix · reader
- where: warning callout · line 152; `#checkpoints` · lines 175-269; `#checkpoint-steps` · line 233
- finding: The Checkpoints section runs well past its budget by repeating itself, and two paragraphs pass 100 words with several ideas, so the reader loses the main line.
- evidence: `outline-ch1.md` budgets Checkpoints at ~1,250 words; by my count the section is about 1,800-1,900 words with the diagram labels. The database-sync rule is told four times (line 228, the collapsed note at line 231, `seq-checkpoint` step 5, and the caption at line 223). D-01 is told in lines 239, 261, 263, the note at lines 265-269, and two table cells. The warning callout at line 152 (about 115 words) holds three ideas (the SHARED lock, the wal.c comment, the only safe removal), and the paragraph at line 233 (about 115 words) holds reset, no-shrink and the TRUNCATE exception. Several descriptive facts are also reported as who-said-what ("The documentation describes the same stop, and adds…", line 226), against §4's "Teach, don't report". The other sections are near budget.
- fix: say each fact once in the chapter's voice; cut the note at line 231 to what the diagram does not show; split lines 152 and 233.
- confidence: medium

### C06 · should-fix · citations
- where: line 179; lines 268-269; line 287
- finding: Three places carry a citation that does not match the sentence, or none.
- evidence: (a) Line 179 says automatic checkpoints are PASSIVE, "the mode that never waits for anyone", cited to wal.html; wal.html §3.2 says only "without interfering with other database connections" (`<scratch>/wal.html`), and the wording is the API reference's: "without waiting for any database readers or writers" (`<scratch>/wal_checkpoint_v2.html` line 140). (b) The last two bullets of the D-01 note (five retries, "under 10 seconds"; blocking locks only with `SQLITE_ENABLE_SETLK_TIMEOUT`) have no citation; the 5-retry and 10-second text is in wal.c ("After 5 RETRYs … The total delay time before giving up is less than 10 seconds", dossier cached copy lines 3124-3129). (c) Line 287 says the table rows "rest on the WAL pages, the checkpoint API reference and the 3.54.1 source", but links only walformat.html and wal.html.
- fix: move or add the links at those three places.
- confidence: high

### C07 · should-fix · clarity
- where: D-01 note · line 267 (and the read marks paragraph, line 160)
- finding: "read slot 0" is used without being defined, and the chapter never says what read mark 0 means.
- evidence: Line 160 introduces "five read marks" and says only that a reader holds one for its transaction. Line 267 then says "any checkpoint holds read slot 0 exclusively while it copies frames. A new reader that cannot take slot 0 does not wait: it takes a read mark". walformat.html §2.3.1 says a reader on WAL_READ_LOCK(0) "will never read content from the WAL and will acquire all content directly from the main database". Without that, the sentence about readers going ahead cannot be followed, and the same fact decides the reset condition at line 233.
- fix: one sentence at line 160: read mark 0 is the "database file only" slot; name it "read mark 0" in the note.
- confidence: medium

### C08 · note · diagrams
- where: `fig-torn-commit` · lines 100-132
- finding: The figure silently changes the worked example: in the text, frame 3 is the commit frame holding page 2, while in the figure frame 3 is a non-commit frame and the second transaction is frames 3 and 4 with a page 7.
- evidence: Line 18 ("commits with frame 3, a newer copy of page 2") against nodes f3 and f4 and the caption ("the second transaction (frames 3 and 4)"). The caption does say so, so the reader is told; a single sentence in the text introducing "a different second transaction" would remove the trip.
- confidence: medium

### C09 · note · facts
- where: `seq-checkpoint` step 2 · line 202; line 226
- finding: "limit = the oldest reader's end mark" is a simplification: the code's limit is the lowest read mark held by a reader, which is a reader's end mark only when it could set a free slot to it.
- evidence: dossier cached wal.c lines 2315-2328 (`mxSafeFrame = y` where `y` is `aReadMark[i]`) and 3264-3287 (a reader takes the largest existing mark not above `mxFrame` when no slot is free). wal.html uses "end mark" the same way, so this is the documented simplification; it only matters because line 160 defines read marks as the thing a checkpoint respects.
- confidence: medium

### C10 · note · diagrams
- where: `flow-commit-read` caption · line 79
- finding: "The writer never touches the database file" is true of the write transaction but not of the connection, which line 181 says runs the checkpoint that writes it.
- evidence: lines 79 and 181; `doWalCallbacks` runs in the committing `sqlite3_step` (dossier cached vdbeapi.c lines 945-947).
- fix: "A commit never writes the database file".
- confidence: medium

### C11 · note · reader
- where: three-files table · lines 145-149
- finding: T4's deliverable asks "when it is created and deleted"; the table gives when each file exists and when it is deleted, but never when it is created.
- evidence: `outline-ch1.md` T4; the "On disk" column. The sources do not state a creation moment either, so the cell may say "created when the first connection opens the database in WAL mode" only if a source is added, or leave it as is.
- confidence: low

### C12 · note · clarity
- where: "What stops a checkpoint" · line 244; Limits · line 295
- finding: Line 244 says one large change "can leave a very large -wal"; line 295 says the old large-transaction cautions "no longer apply"; the reader is not told these are about different things (efficiency against file size).
- evidence: wal.html §6 keeps the "Very large write transactions" paragraph (not struck through) and adds "As of SQLite version 3.11.0 …, the WAL file for a single transaction should be proportional in size to the transaction itself"; the struck-through text is §1's "about 100 megabytes … a gigabyte" advice (`<scratch>/wal.html` lines 208-217).
- confidence: low

### C13 · note · quiz
- where: `q-network` and `q-crash-files` · lines 369-386
- finding: Two items are close to recall of a stated rule: `q-network`'s correct option nearly repeats the chapter's sentence (line 167), and `q-crash-files` repeats the table.
- evidence: both match what `outline-ch1.md` says they test, so this is not a defect; `q-open-read` and `q-snapshot` (predict from a scenario) are the stronger shape. All five keys and explains are right on the claims they rest on.
- confidence: medium

## Scorecard

- facts: C01 (notes C09)
- citations: C02, C03, C06
- ledger: C04 (every checkable sentence has a trace line to an existing claim id; no P/C/U claim is asserted beyond its narrower or attributed wording)
- coverage: holds (Q38, Q-ch1-02 and G-r1-07 are stated as declared; MC1-MC3 and the T1-T4 deliverables are present)
- diagrams: holds (notes C08, C10; `seq-checkpoint` order checked step by step against `walCheckpoint`, `sqlite3WalCheckpoint` and `walRestartLog`)
- quiz: holds (note C13)
- order: holds
- reader: C05 (notes C11)
- clarity: C07 (note C12)
- rules: holds (no raw HTML, headings and ids, block placement, link forms and YAML quoting read clean; I could not run `knowledge check`)

**Holds** (keep through the revision):
- The D-01 handling: the quoted words of each side, "three of the project's sources … one page" for weight, the hedged and attributed reading of the code ("made for this book and not a statement by the project"), the "what would settle it" line, and the "disputed" table cells. All quotes match the pages (`wal_checkpoint_v2.html` lines 162 and 153, `pragma.html` line 2333, `wal.html` line 579).
- `seq-checkpoint`: the order (sync the -wal, copy in ascending page order up to the limit, truncate and sync the database only after a complete copy, then record `nBackfill`, with the next writer doing the reset) matches `walCheckpoint` lines 2304-2421 and `walRestartLog` lines 3961-3987 of the pinned wal.c, and the caption's "a partial checkpoint skips that sync" is right (lines 2410-2420).
- The 3.54.1 statement that the committing statement's own call runs the PASSIVE checkpoint (`doWalCallbacks` under `rc==SQLITE_DONE && db->autoCommit`, then `sqlite3WalDefaultHook` with `nFrame>=`).
- The worked example (frames 1-3, readers R1 and R2) and the `q-open-read` and `q-snapshot` items: keys right, distractors plausible, explains teach why.
- The Docker paragraph and the containers gap: every statement matches the two Docker pages ("A given volume can be mounted into multiple containers simultaneously"; "the daemon runs inside a Linux VM, not directly on the native host"), and the open question is left open.
- The wording of the WAL-header NOTE, the torn-commit rule (lines 94-98) and the limits (1% to 2%, 3.11.0 struck-through, 3.22.0 read-only) match their pages.

**Not seen**:
- The reader's render of the three diagrams, the tables and the collapsed callouts.
- A fresh fetch of the code sources: curl to `raw.githubusercontent.com` (wal.c, main.c, vdbeapi.c, sqlite.h.in, os_unix.c) and to `web.archive.org` (the 2016 capture) was denied in this session, so those six sources, and every code and archive claim, were checked against the dossier's cached copies of the same URLs (`dossier:pages/S-r2-found-ckpt-01.txt`, `S-ch1-r1-found-ckpt-02/03.txt`, `S-r1-found-shm-11.txt`, `S-r2-found-ckpt-05/06.txt`), not re-fetched; the commit-to-tag pin was checked only against the dossier's cached tag-ref JSON. The code findings (C01 code lines, C09, C10) are therefore capped at medium.
- `pagetext.py` was not reachable from this session; the sqlite.org and Docker pages were read as raw HTML with `grep` and `Read`.
- `knowledge check`: not run by me.

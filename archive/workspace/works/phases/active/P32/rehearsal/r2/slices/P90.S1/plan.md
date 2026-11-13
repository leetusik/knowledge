# P90.S1 — chapter 1, `how-wal-works`: "How SQLite's write-ahead log works"

This is a chapter slice of an explain phase, so it follows
`.claude/skills/do-whole-phase/reference/explain-chapter.md`. It is **multi-span**: span 1 (you, the executor)
tops up the chapter's research, writes the chapter's outline and draft and checks it; span 2 (the orchestrator's
`knowledge:explain-critic`, on the other family) critiques it; span 3 (you again) answers the critique once. You
are the **lead** of the chapter's research run (the explain skill's §9.3): `slice-executor`'s explain carve-out
lets you dispatch the research agents the skill names, every prompt starting with the line
`slice: P90.S1 (a label for the workspace's meter, not a task)`, and never the critic. The research and writing
rules are the skill's, cited by section and never copied here. Every field below is drawn from
`works/phases/active/P90/book/outline.md` (signed: "accept", attempt 2) or from this plan's `## Dispatch`.

## The chapter

- **key:** `how-wal-works` · **position:** 1 of 2 · **title:** "How SQLite's write-ahead log works"
- **mode:** general · **research mode:** `full`
- **source:** a subject, the web (general mode): "SQLite's write-ahead log (WAL): how it works", chapter 1 of the
  book; the chapter's key sources, rung 1 first, as the outline entry lists them: sqlite.org/wal.html
  S-r1-found-rw-01 · fileformat2.html S-r1-found-rw-02 · walformat.html S-r1-found-rw-04 · isolation.html
  S-r1-found-rw-03 · lang_transaction.html S-r1-found-rw-05 · pragma.html S-r1-found-ckpt-03 ·
  c3ref/wal_checkpoint_v2.html S-r1-found-ckpt-02 · c3ref/wal_autocheckpoint.html S-r1-found-ckpt-04 ·
  useovernet.html S-r1-found-shm-05 · howtocorrupt.html S-r1-found-shm-06 · changes.html S-r1-found-ckpt-07 ·
  releaselog/3_7_0.html S-r1-found-rw-06 · SQLite source at version-3.54.1: src/wal.c S-r2-found-ckpt-01,
  src/sqlite.h.in S-r2-found-ckpt-06 · src/os_unix.c (master) S-r1-found-shm-11 · wal.html as archived
  2016-10-09 S-r2-found-ckpt-05 · releaselog/3_11_0.html S-v8-01
- **builds on:** nothing beyond the reader's SQL and transactions. It **defines**, once each (chapter 2 uses
  them without re-defining): write-ahead log (WAL) and the -wal file · frame · commit frame · the rollback
  journal (one contrast only) · read transaction and write transaction (and the deferred BEGIN that starts a
  read first) · snapshot and its end mark (mxFrame) · the single writer (the WAL write lock) · wal-index · the
  -shm file · read mark · recovery · checkpoint · auto-checkpoint and its threshold · WAL reset · checkpoint
  starvation · the checkpoint modes PASSIVE, FULL, RESTART, TRUNCATE (and NOOP) · EXCLUSIVE locking mode.

## The outline entry

- **goal:** the reader understands how a WAL-mode database serves one writer and many readers: a commit appends
  frames to the -wal file and leaves the database file untouched; each reader keeps a snapshot fixed by its end
  mark and finds pages through the wal-index in shared memory (which is why WAL needs every process on one
  host); a checkpoint copies frames back and, once readers have moved on, lets the next writer reset the WAL;
  and a reader that stays on an old snapshot stops all of that.
- **reader tasks** (the chapter's `## Reader's task` opens with them; the critic checks each one is served):
  - **T1** predict who waits for whom in a WAL database (readers, the writer, each checkpoint mode, recovery) →
    **deliverable:** a "who blocks whom" table, the RESTART/TRUNCATE-against-new-readers cell marked as
    disputed (D-01)
  - **T2** decide whether a deployment can run WAL at all → **deliverable:** a checklist "Before you turn WAL
    on": one host, a local filesystem (not NFS or SMB), a writable directory for -wal and -shm beside the
    database, no need for atomic commits across ATTACHed databases, page size fixed, not on read-only media
  - **T3** explain why a checkpoint is not finishing and why the -wal file does not shrink → **deliverable:** a
    checkpoint timeline diagram and a list "What stops a checkpoint" (a reader on an old snapshot; a write
    transaction in progress; another checkpointer) with "why the file keeps its size" (reset and overwrite, not
    truncate)
  - **T4** read the three files on disk and know which one matters after a crash → **deliverable:** a table of
    the database, -wal and -shm files: what each holds, when it is created and deleted, whether recovery needs it
- **questions:** Q1★ · Q2★ · Q3★ · Q4★ · Q5 · Q6★ · Q7★ · Q8★ · Q9★ (contested, D-01) · Q10★ (contested, D-01) ·
  Q11★ · Q12★ · Q13 · Q14 · Q15★ · Q38★ (thin) — ★ load-bearing
- **claim ids with statuses:** exactly as `book/outline.md`, *Chapter 1*, **claims with statuses** lists them,
  by section — Background (WAL against the rollback journal, once); Intuition (a commit appended, readers on
  snapshots, one writer); The -wal file, crash recovery and the files on disk; The wal-index, shared memory and
  the one-host rule; Checkpoints (what, when, what stops them, the modes); Limits of WAL. The ledger's status
  rules bind: a P claim only in the narrower wording on its ledger line; a C claim through its D- entry; a U
  claim hedged and attributed or not at all; a `cand` claim is not itself verified.
- **disagreements it teaches:** D-01 (do new readers wait during RESTART/TRUNCATE? the API reference, the
  pragma page, the 3.54.1 header and code against one wal.html sentence) — with that weight, neither side in
  the chapter's own voice · D-05 resolved-by-scope (the large-transaction warnings are struck through since
  3.11.0; mention only to say they no longer apply)
- **declared gaps:** Q38 thin → stated (gaps/final.md: "the API reference, the pragma page and the 3.54.1
  header say RESTART does not impede readers, and the code read as a whole shows new readers going ahead apart
  from brief retries; the overview page alone says readers might block") · G-r1-01 (not load-bearing) → stated
  through D-01 · G-r1-07 → stated ("the docs say WAL does not work across hosts because they cannot share
  memory; they do not walk through what fails") · G-r1-06 → dropped unless the chapter mentions containers
  (then stated: one host is the documented rule; a VM file-sharing layer is not covered by the sources)
- **expected top-up:** small — (1) read `walCheckpoint` in src/wal.c at version-3.54.1 for the step order the
  checkpoint timeline diagram draws (the docs give the order; the code was read only for RESTART/TRUNCATE);
  (2) G-r1-06 only if the chapter mentions containers
- **must-cover items it carries:** MC1 (Intuition), MC2 (Checkpoints), MC3 (the wal-index section); it lays the
  mechanism MC5 rests on (starvation, reset-not-truncate), which chapter 2 carries
- **diagrams and figures:** the five the outline entry names — `flow-commit-read` (flowchart, steps in the docs'
  order: wal.html §2, fileformat2.html §4.4–§4.6), `table-who-blocks` (T1's deliverable; the RESTART/TRUNCATE ×
  new-reader cell cites D-01 and says "disputed"), `seq-checkpoint` (T3; order as wal.html §2.1/§3.1 and
  fileformat2.html §4.4 give it, and as `walCheckpoint` in src/wal.c at 3.54.1 runs it — the top-up),
  `table-three-files` (T4's deliverable), `fig-torn-commit` — each with the rows, columns, steps and claim ids
  the outline gives it
- **quiz targets** (supported claims only; each tests understanding): q1 why a read transaction left open makes
  a checkpoint stop short and the -wal grow · q2 what a read transaction sees when another connection commits in
  the middle of it, and how it sees the new data · q3 why readers do not wait for the writer while two writers
  cannot commit at once · q4 why WAL mode fails when two hosts share the database over a network filesystem ·
  q5 after a crash, which of the three files must never be deleted, and which one is rebuilt — each on the
  claim ids the outline names for it
- **images:** none (every figure is a native diagram or table)

## The book (from the outline's header)

- **reader:** a backend developer who runs SQLite as the database of a small web service — one server, a Python
  or Go app with a few worker processes. Knows SQL and transactions (BEGIN, COMMIT, isolation in general
  terms); not SQLite's internals, its files on disk, or its locking.
- **brief:** must-cover MC1–MC5 as the outline's *The brief* gives them (this chapter carries MC1–MC3) ·
  leave-out: the rollback journal's internals beyond one contrast; the WAL2 and BEGIN CONCURRENT branches
  ("one writer" is scoped to standard SQLite); other databases' write-ahead logs; SQLite's C API beyond the
  PRAGMAs and the checkpoint call · trusted sources: the SQLite documentation at sqlite.org (wal.html,
  pragma.html, fileformat2.html, lockingv3.html), each still ranked per claim on the source ladder
- **out of scope:** the outline's *Out of scope* (the leave-out; the research outline's `## Not used`; what the
  research did not settle and the book does not claim)
- **the dossier:** `works/phases/active/P90/book/research/`, run id `20261023-1245-sqlite-wal`. **Frozen** since
  the signature: never edit `library.md`, `ledger.md` or any file they index. This chapter writes only its own
  files there: `run-ch1.md`, `gaps/ch1-r<n>.md`, `gaps/final-ch1.md`, findings and verify batches with stems
  `ch1-…`, the overlays `library-ch1.md` and `ledger-ch1.md`, its map `outline-ch1.md` and its trace
  `trace-how-wal-works.md`; fetched pages go to `book/research/pages/` (git-ignored)
- **the explain skill:** `/Users/sugang/projects/personal/knowledge/plugin/skills/explain/SKILL.md`, plugin
  version 0.6.0, read by path (this rehearsal loads the plugin from that folder)
- **notes:** `phase.md` `## Notes for later slices` (defined terms; ledger cautions — never "WAL cannot corrupt"
  unqualified (D-10), never "readers block during RESTART" in the book's voice (D-01), never wal.html's
  struck-through large-transaction warnings as current (D-05))

## Where things go

- the draft: `works/phases/active/P90/book/how-wal-works.md` (the body only; it stands in for the skill's
  `<tmp>/body.md`)
- images: none, so no `book/assets/how-wal-works/`
- the critique (span 2, the critic's): `works/phases/active/P90/book/critique/how-wal-works.md`
- this slice folder: `plan.md` and `result.md` only

## The publish fields (the review publishes; this slice only checks)

- **project:** `s9-wal` (private) · **book:** slug `sqlite-wal`, kind `subject` (subject label "Databases"),
  title "SQLite's write-ahead log"
- **chapter key:** `how-wal-works` · **position:** 1 · **chapter title:** "How SQLite's write-ahead log works"
- **lang:** `en` · **format:** native
- **sources:** the chapter's sources block (required in general mode), drawn from the sources above and
  `library-ch1.md`
- **tags:** `sqlite`, `write-ahead-log`, `concurrency`, `checkpoints`, `database-internals`
- **summary:** optional, written by you with the draft
- **`--co-authored-by`:** `Claude Opus 5.5` (the `attribution=` line below)
- **`--source-repo`:** the repo root
- **the check's target:** the configured knowledge base (skill §2), which must be the org the review publishes
  into; the project is the private one above, never tenant #1

## What to do

**Span 1** (the prompt says `span: 1`): explain-chapter.md, *The three spans*, item 1, on §9.3 items 1–5, its
state in `book/research/run-ch1.md`:
1. **D0b** again (§3.2), the preflight's probe agents included: this is a new session.
2. **The gap check, the top-up and the chapter's gate** (§9.3 items 2–4), the top-up the outline entry expects;
   new evidence only in the overlays. You are a subagent: the probe agent A and every wave go in the
   foreground, a wave's calls in one message.
3. **The chapter's outline and draft** (§9.3 item 5, by §3.10 and §4): `outline-ch1.md` opens with
   `## Reader's task` (T1–T4 with their deliverables), then the reader's path with word budgets and
   `## Not used`; D7 writes `book/how-wal-works.md` in §4's three passes, keeping `trace-how-wal-works.md`.
4. Read it through per §4.8, and read each diagram's **order of steps** and each quiz key against the code
   and the sources, not from memory.
5. Run `knowledge check` per §4.9 with the publish's flags and fix it to exit 0 (exit 2: read stderr, per
   explain-chapter.md span 1).
6. Write `result.md`: the verdict block first, then `## Publish` (the command that exited 0, minus its target,
   paths from the repo root), then the log. Return `done` with `critic_ready: yes`, or a research stop as
   explain-chapter.md lists them.

**Span 3** (`span: 3`, the critique path): explain-chapter.md, item 3 — answer every `must-fix` and the
`should-fix`s you agree with in one revision with no new evidence; `## Critique answers` in `result.md`; re-read
per §4.8 and re-run `knowledge check` to exit 0; a `## Notes for later slices` entry in `phase.md` (for P90.S2:
the terms this chapter defines and their heading ids); the final verdict block (`critique: answered`,
`disputed: <ids> | none`).

Never commit, and never run a state-transition command (there is no engine here: CLAUDE.md).

## Validation

- `book/how-wal-works.md` exists; `knowledge check` exits 0 with the publish's flags.
- `git status --short` shows, under `book/research/`, only files named for this chapter (`ch1-…`, `…-ch1.md`,
  `trace-how-wal-works.md`); `library.md`, `ledger.md` and the whole-book files are unchanged.
- Every claim id the draft's trace cites exists in `ledger.md` or `ledger-ch1.md`.

## Dispatch

slice=P90.S1
phase=P90
kind=implementation
risk=high
attempt=1
route=high
reason=risk high (open design: the executor leads the chapter's research run)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh

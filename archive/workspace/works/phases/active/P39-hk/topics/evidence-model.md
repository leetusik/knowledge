# The evidence model (P39-hk.S2)

The detail behind the `## Decisions` gist "The evidence model (S2)". The skill text is canonical:
`plugin/skills/explain/SKILL.md` §3 *Gather the evidence* (§3.1–§3.4, §3.10), §4's evidence
rules, §4.6, §4.10, §8, §9.2–§9.3, B5 and B9. This file says what was decided and what the
later slices must mirror; it restates no procedure.

## What the writer reads

- **The code at one commit**: `HEAD` at D0 (`git log -1 --format=%H`), written into `brief.md`.
  The explain phase writes only its own folder, so the code on disk stays that commit.
- **The covering phases' records** (from `## Explain`'s `phases:`), active or archived:
  `intent.md`; `phase.md` by section (`## Decisions` and the topics a gist links,
  `## Notes for later slices`, `## Operator Questions` for open items); the `result.md`
  verdict heads of the slices whose files touch the subject (and the passage below a head
  where a decision or finding sits); `topics/*.md` research findings and decision detail.
- **Open items, for a signed Next steps part only:** open deferred jobs
  (`deferred/open/<DID>/deferred.json`), unanswered Operator Questions, Decisions no slice built.
- **Never:** the web, other repositories, a library's docs, general knowledge of how such
  code works, `plan.md` files, `topics/breakdown.md`, the workspace's `docs/`, a commit message
  as evidence, a prior explain's text as evidence, or an earlier skill version's research
  dossier (`run.md`, `ledger.md`, `findings/`, `verify/`).
- `phases: none` (the operator said yes without a research phase): code only; every why is a gap.

## How a sentence traces

- **One citation form for code and records:** `<repo path>:L<a>-L<b>@<short sha>`.
  - A code range keeps the existing hashed form (B9): `excerpt-sha256 (first 16 hex)` of
    `git show <commit>:<path> | sed -n '<a>,<b>p' | shasum -a 256`; `@WORKTREE` for uncommitted.
  - A record range quotes its line(s) verbatim and has no hash: the quote re-finds it after the
    phase is archived.
- **The light record** (`<DOSSIER>`): `brief.md` (D0), `evidence.md` (D1: `## Read`,
  `## Entries` `E<nn>`, `## Gaps` `G<n>`, `## Open` `O<n>`, a closing counts line),
  `outline.md` (D6, closing `D6:` line), `body.md` + `trace.md` (D7; the trace maps every
  checkable sentence to `E` ids or `gap G<n>`), `critique.md` (D8, the critic's) and
  `answers.md` (D8, the writer's answers: `C01 · fixed | disputed | declined · …`).
- **Gone:** `run.md`, `plan.md`, `findings/`, `library.md`, `ledger.md`, `verify/`, `gaps/`,
  `prior/`, claim statuses, the support bar, the source ladder, the evidence gate, team sizing,
  the claim cap, the preflight probes. Resuming reads the record: the first stage file missing
  or without its closing line runs again.

## No new things

- A code entry supports what its lines do at the commit, including what they plainly do in
  their own language; never what a library, protocol or algorithm does inside, its history,
  alternatives or best practice, unless the code or a record says so. Comments count as the
  builders' account.
- A record entry supports what was asked, decided, found or left open, and its reasons; the
  builders' account is attributed in plain words. The code wins a disagreement about what it does.
- What neither says is a gap: `stated` ("The records do not say why …") or `dropped`. Never
  filled from outside. The glossary definitions and formulas trace the same way (a formula to the
  code entry that computes it, each legend symbol to its entry); DECOMP2 adds their grammar.
- The chapter's Sources are a plain `## Sources {#sources-list}` section (the code at the commit;
  what the work recorded). The typed `sources` block is unused: its items need an `http(s)` url.

## v2 = the prior plus the phases since

- Find the prior's explain phase by its `## Published` `rel_path` + version; it must hold an
  `evidence.md` (an old research dossier is never carried) → else `v2: plain`.
- Phases since = covering phases the prior did not read + phases whose commits touch the subject's
  paths after the prior's commit. Code since = `git diff --name-only <prior commit> <commit>`.
- Carry an entry when its source is unchanged (an unlisted file, or a same-hash range; a record of a
  phase that has not run since, re-found by its quote); everything else is re-read. Gaps carry
  unless a phase since answers them. `from scratch` still declines it.
- The front door's step 5 looks for the prior's record (not "dossier"); the cost clause reads
  `as v<N> plus what was built since <date>; say "from scratch" to read it all again`.

## Books from phases

- Codebase books only. DECOMP: D0 + D1 over the whole subject into `book/research/evidence.md`,
  then `book/outline.md`: each chapter names the phases (and slices) it draws from, its signed
  sections, entries, gaps and open items; the outline opens with `## Drawn from` and `## Gaps`.
  `book/research/summary.md` is gone. The freeze covers `brief.md` and `evidence.md`.
- A chapter: a closer reading of its phases into the overlay `evidence-ch<k>.md`
  (`E-ch<k>-<nn>`), then D6–D7 and the critic; answers in `answers-<key>.md`. §9.3 has 3 items
  now (it had 6); no gap check, no top-up, no chapter gate.

## The critic (B5)

- Checks every sentence through the trace against the code at the commit and the record lines;
  re-opens every load-bearing citation, number, quiz key and ordered diagram, samples 10 more.
- New category `outside` (a sentence from beyond the code and the records is a must-fix even when
  true); `ledger` → `trace`; `citations` gone. Categories: facts, outside, trace, coverage,
  diagrams, quiz, order, reader, clarity, rules.
- Coverage is the signed sections (delivered or cut), must-cover, gaps honoured, a signed Next
  steps part against `## Open`.
- Dispatch block: `scratch:` dropped (an old one is ignored). Verdict fields: `trace:` replaces
  `ledger:`; `coverage:` reads `<n>/<n> signed sections delivered or cut; must-cover <n>/<n>;
  gaps honoured <n>/<n>`.
- `with=dossier` only (B9 rewritten as the light record): B6 rules and B8 bar are no longer in
  its brief; the rules it needs are B5's own *Your rules*. Agent frontmatter: tools
  `Read, Grep, Glob, Bash, Write` (WebFetch/WebSearch removed), description rewritten.
- Still on a second model (frontmatter `sonnet`, `opus` for a Sonnet writer). The workspace's
  opus pin (`explain-chapter.md` *The critic's model*) is D85-qk's item, for S5.
- Room left for S3's checks (hard reading, a missing visual, a bare symbol string): they slot into
  *How you check* beside *Clarity*.

# P31 package: the explain phase, for the bootstrap

This is a ready-to-apply package for the bootstrap (workflow) repo, `bootstrap_agentic_workspace.sh`. It makes
explaining a **phase**: a book researched and outlined, with the outline signed by the operator before
anything is written. Each chapter is drafted, checked with `knowledge check`, judged by a fresh-eyes critic and
revised once. The review then reads the whole book, publishes it **private** and reads it in the real
reader. The operator accepts by reading it.

The package was prepared in the knowledge repo by phase P31. The operator relays it, and
`works/phases/active/P31/handoff-explain.md` (P31.S6) tells the bootstrap agent how to apply it.

Paths here mirror the bootstrap's `payload/`: `package/<path>` goes to `payload/<path>`. **Two exceptions
are not shipped files**: `PATCHES.md`, and the create-phase route text (see the table).

## The files

| Package file | Goes to | What it is | Slice |
|---|---|---|---|
| `claude/agents/explain-critic.md` | `payload/claude/agents/explain-critic.md` (new file) | The fresh-eyes critic for one drafted chapter. It makes one pass and writes one critique file. It never edits, and it always runs on a model different from the chapter's drafter | P31.S3 |
| `claude/skills/do-whole-phase/reference/explain-chapter.md` | `payload/claude/skills/do-whole-phase/reference/explain-chapter.md` (new file; shared into `do-next-slice/reference/` by the build) | A chapter slice's three spans (the executor drafts and checks, the orchestrator dispatches the critic, the executor revises once), plus the critic's model rule | P31.S3 |
| `claude/skills/do-whole-phase/reference/explain-decomposition.md` | `payload/claude/skills/do-whole-phase/reference/explain-decomposition.md` (new file; shared) | What an explain phase's `DECOMP` does: research, `book/outline.md`, one bare chapter slice per chapter. Also the **outline gate**: the first chapter stops `pending` until the operator says `accept`, and feedback re-runs `DECOMP` | P31.S4 |
| `claude/skills/do-whole-phase/reference/explain-review.md` | `payload/claude/skills/do-whole-phase/reference/explain-review.md` (new file; shared) | What an explain phase's `REVIEW` does: read the whole book, decide disputed findings, check and publish every chapter **private** with the org key, prove the book is private, read it in the real reader, and return the walkthrough. Fix slices republish | P31.S4 |
| `claude/skills/create-phase/explain-route.md` | **Not a file.** Its text is appended to `payload/claude/skills/create-phase/SKILL.md` as `## The explain route` (`PATCHES.md` 1c) | The route: when a request lands there, the `## Explain` fields asked at step 2 and recorded in `intent.md`, and what that `DECOMP` will cut | P31.S4 |
| `PATCHES.md` | **Not shipped** | Every edit to the bootstrap's existing files, file by file, with line numbers at bootstrap HEAD `f207775` (v62) | P31.S4 |

There is **no engine change**:
- an explain phase is marked by its `intent.md`'s `## Explain` section;
- the critic has no route-table row;
- the orchestrator picks the critic's model per call.

None of the files restates the knowledge plugin's writing rules. They cite `skills/explain/SKILL.md` by
section: §1 placement, §3 research, §4 writing, §4.8 read-through, §4.9 check, §5 publish, §5.1 transport.

## The order to apply it

Apply it as **one release**, together with P30's `/explain` handoff (both are merged in P31's `handoff-explain.md`):

1. **P30's changes first:**
   - delete `payload/claude/skills/explain/`;
   - the updater rule that never touches anything named `explain`;
   - the plugin pointer text.

   That takes the skill count 18 → 17. This package adds no skill.
2. **Copy the four new files** into `payload/` (rows 1–4 above; rows 1 and 2 are S3's). Never put a copy under `do-next-slice/reference/`: the build makes those.
3. **Apply `PATCHES.md`**, sections 1–12:
   - `create-phase` (the step 2 fields, step 4.2, the route text);
   - both `do-*` special-slice lines;
   - the decomposition and review twins;
   - the review skill;
   - the pointer line in every file;
   - `build.py` (`FIXED_LIVE_FILES` and `SHARED_SKILL_FILES`);
   - `main.py` (`MANAGED_FILES`, `NESTED_AGENTS`, the install write and the summary prints);
   - the README and seed-doc lines;
   - the smoke tests;
   - the CHANGELOG section.

   P31's pointer string **supersedes** P30's.
4. **Release** (`PATCHES.md` 13): rebuild, `--check`, bump `WORKSPACE_VERSION`, add the CHANGELOG section in the same commit, run the smoke suite alone, commit with no phase ids, then refresh the repo's own install.
5. **Verify** (`PATCHES.md` 14).

## The minimums

- **The knowledge plugin 0.5.0 or later**, installed and set up once (`/knowledge:setup` writes the org-level key the review publishes with). 0.5.0 is the version whose explain skill has §4.9, `knowledge check`.
- **A knowledge server with `POST /api/documents/check`**, for the dry run. Without it, `knowledge check` exits 2, the check is skipped and noted, and the publish's own 422 stays the backstop (§4.9). The `knowledge` CLI must be 0.2.0 or later for `knowledge check`.
- **A private project** in the operator's org. A publish with the master token or a tenant #1 key is public by definition, so the review never uses one.
- **For the review's reading:** a filled `## Operator Runtime` with an agent browser account (Aside `--account <id>`), whose profile is signed into the reader as a member of the org, because a private book shows only to members.

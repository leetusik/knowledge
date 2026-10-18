# P29.S1 — research: the book and chapter model

## Goal

Settle, as data contracts, the model the learning reader stands on: books, chapters, versions, Korean/English
variants, images, and how all of it stays compatible with what ships today. Map every existing document
into it. **Findings only: no product code.** What you settle lands in `phase.md`, where `P29.S2`, `P29.S3`,
`P29.DECOMP2`, the design handoffs and P30's `DECOMP` will read it. Scope is in `phase.md` →
*Slice breakdown* → **S1**, and the operator's words are in `intent.md`. Read both first, along with the
notes tagged for S1 under `## Notes for later slices`.

## Questions to settle

Give each one a recommended answer, the evidence behind it, and the alternatives you rejected, each with
its reason. Where only the operator can decide, recommend a default and add the question to
`## Operator Questions`.

1. **Book.** What a book is, and its fields: identity, slug, title, kind (`codebase` | `subject`), its
   project or subject, and chapter ordering. How a codebase book relates to a project. A project may hold
   one book, several books, or a book plus loose topic docs: decide from the corpus. How a subject book
   with no repo is grouped and named. The library groups books **by subject and by project**: what does
   each grouping key on?
2. **Chapter.** Whether a chapter *is* today's document (extended) or a new entity that points at
   documents. Its identity, its position in the book (an order key that survives inserts, such as a phase
   number for phase chapters), its title, and its format flag (native vs. legacy HTML; S2 settles what
   "native" is).
3. **Versions and variants.** Reuse P23's version chain where it fits. Settle how a KO/EN pair is one
   chapter with two variants (today `p8` and `p8-ko` are unrelated documents with their own slugs), how
   versions and variants combine (versioned independently, or together?), and what the reader's switch
   needs from the model.
4. **Where each piece lives.** Canonical content is on disk; tenant #1 also commits it to git, and other
   tenants live under `tenants/<uuid>/` uncommitted. SQLite is a disposable index rebuilt from disk by
   `server/reindex.py`. Postgres is the control plane. Book membership, order and variant links must
   survive a reindex: say which store owns each field (frontmatter, a book manifest on disk, Postgres)
   and why.
5. **Images.** The agent attaches images at publish; there is no editing in the web app. Settle:
   - where image bytes are stored, per tenant;
   - their identity and how a chapter references them (S2 designs the block syntax on top of this);
   - formats and size limits;
   - how they are served under the chapter's own visibility (P19: private by default, 404-never-403)
     without ever running raw HTML on the app origin;
   - how they version with their chapter.

   **Reconcile this with tenant #1's git-published root.** `.gitignore` says the repo is public, and
   tenant #1's documents are committed and pushed. State what "private" means today for tenant #1 content,
   what it would mean for its images, and whether committing images to git is acceptable (size, privacy).
   If you find a live privacy problem, record it as an operator question, not a fix.
6. **Phase or slice → chapter.** Today the workspace review prints `explain: not written — run /explain
   for this phase`, and `/explain` publishes with `project` = the repo folder name. Settle:
   - which book a phase chapter or slice chapter lands in;
   - its position and title;
   - what `/explain` must send so the server can place it (arguments → API fields);
   - how re-explaining the same phase produces the next version rather than a new chapter.

   S2 owns the skill text and its modes. You own the fields and the placement rule.
7. **Compatibility contracts.** Each item stays working:
   - `/documents/{id}` and `/@{org}/{project}/{doc-slug}` keep resolving (P25; the pretty URL is dateless
     and resolves the newest document with that `(project, slug)`);
   - the reader's own URL scheme for a book and a chapter;
   - `POST /api/documents` and any new write route;
   - search (FTS + embeddings over current versions only);
   - the MCP `search` / `fetch_document` v1 contract, which is additive-only (`mcp-server/CONTRACT.md`);
   - the graph;
   - everything stays free.

   Name each change as **additive** or **breaking**. No breaking change is acceptable without an operator
   question.
8. **D13 (`source_url`).** Do general-learning chapters need a structured sources/citation field? The
   vendored `.claude/skills/explain/SKILL.md` research mode already writes a `#sources` section, and the
   MCP `_citation_url` returns `""` today. Recommend whether P30 absorbs D13 or it stays deferred.

## The book map — every existing document

Build the full mapping of the **42** documents on `origin/main` (`git fetch origin`, then
`git ls-tree -r --name-only origin/main docs/` and `git show origin/main:<path>`, reading the
`<!--kb … -->` header and title only; never pull or merge into local `main`). One row per document:
- rel_path;
- format;
- current version and archived versions (`docs/.versions/`);
- the target book and its kind;
- position;
- language and variant partner;
- legacy or native.

Read titles and headers to find the series (glide-ilab's phase docs, P26's five-part `knowledge` set,
vocky's P15 set, changple5's 20) and the topic docs. Use each project's `index.md` on `origin/main` where
it helps. Put the full table in `result.md`. Put a summary in `phase.md`: the book count, each book with
its chapter count, the variant pairs, and anything that does not map cleanly.

## Method

- Code and contracts:
  - the paths in the S1 notes;
  - the `docs/current` sections on documents, versions (P23), pretty URLs (P25), visibility (P19), the
    HTML explainer type (P16) and MCP (P15). Read only those sections. The docs are STALE for api,
    backend, experience, frontend, product, qa and security: check them against P28's `## Doc impact`
    (P28 `phase.md` L608–838) and against the code. **The code wins.**
- For bulky reads (42 headers, long modules), use `Explore` at the `explore_model` / `explore_effort`
  below. Upgrade it to `sonnet` for a lookup that needs judgment.
- A throwaway probe (for example, a header-listing script in your scratchpad) is fine. Delete it before
  you finish. Change nothing in the product and no file outside this slice's folder and `phase.md`.
- Use web search only where one question needs outside evidence (for example, how e-book formats model a
  series or a variant). Cite it.
- If something blocks this direction for real, return `needs_operator` with the exact question. Never
  switch approach silently.

## Output

- **`phase.md` `## Decisions`:** one entry per settled question, phrased as a contract a design handoff
  can quote. That means the entities and their fields, where each lives, the URL scheme, the write fields,
  the image rules, and the compatibility list marked additive or breaking. Tag each entry `(P29.S1)`.
- **`phase.md` `## Operator Questions`:** only decisions that are truly the operator's, each with your
  recommended default.
- **`phase.md` `## Notes for later slices`:** what S2 needs (identities and the image reference for its
  blocks; the format flag), what S3 needs (stable identities for per-reader state; the variant and version
  rules anchors must survive), and what DECOMP2 needs (the library's grouping keys; the book page's data).
  Tag each note `**(from P29.S1, for P29.Sx)**`. Remove the DECOMP notes you consume.
- **`phase.md` `## Now`:** rewritten.
- **`result.md`:** the verdict block first. Then the book map table, the evidence behind each decision,
  the rejected alternatives, and the commands you ran.
- Keep `phase.md` under its budget. Rewrite sections, never just append to them, and never drop a
  decision or a question.

## Validation

`python3 scripts/workflow.py validate` passes. The product tree is unchanged: `git status --porcelain`
shows only this slice's folder, `phase.md` and the engine's generated files.

## Return

The structured verdict (`status`, `tier`, `model`, `effort`, `summary`, `files_changed`, `validation`,
`deviations`, `doc_impact: none`, `operator_need`), mirrored at the head of `result.md`. Never commit and
never move workflow state.

## Dispatch

route=research
reason=kind research
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high

# P29.S1 result — research: the book and chapter model

- status: done
- tier: high
- model: opus
- effort: medium
- summary: Settled the book/chapter model as data contracts: the chapter is a thin entity in an on-disk book manifest that points at one document per language. Each document keeps its own P23 version chain, and nothing existing is rewritten. Mapped all 42 `origin/main` documents into 4 books (33 chapters, 34 documents, one KO/EN pair) plus 8 loose documents. Settled images (content-addressed, served under the doc's visibility), phase/slice → chapter placement, the compatibility list (all additive) and D13 (stays deferred). Raised 2 operator questions: tenant #1's "private" content is pushed to a public GitHub repo, and whether images are committed to git.
- files_changed: works/phases/active/P29/phase.md, works/phases/active/P29/slices/P29.S1/result.md
- validation: `python3 scripts/workflow.py validate`: pass. `git status --porcelain`: only P29 workflow files and the engine's generated files changed; the product tree is unchanged.
- deviations: none. The throwaway header-listing probe lived in the session scratchpad and was deleted.
- doc_impact: none (findings only; the durable-truth changes land with P30's code)
- operator_need: none for this slice. Two operator questions were added to `phase.md` → `## Operator Questions` for DECOMP2's gate.

The contracts themselves are in `../../phase.md` → `## Decisions` (entries tagged `(P29.S1)`). This file keeps the evidence, the full map, the rejected alternatives and the commands.

## The book map — all 42 documents on `origin/main` (`ed8dba0`)

Notation: `v` = current version (from the header's `version:`; absent = 1). `arch` = files under `docs/.versions/`. Every rel_path is relative to `docs/`. "legacy" means a self-contained HTML explainer (`format=html`, iframe today). The single `md` document is plain Markdown that the reader already renders natively; S2 decides whether `md` is a subset of the native format.

### Book 1 — `changple5` / `curriculum` (codebase, guide series; 20 chapters)

Positions come from the `NN-` prefix in each filename. All rows are `html`, legacy, `v1`, 0 archived, `en`, with no variant partner.

| pos | key | rel_path |
|---|---|---|
| 1 | `01-big-picture` | changple5/2026-08-26-01-big-picture.html |
| 2 | `02-configuration-and-boundaries` | changple5/2026-08-26-02-configuration-and-boundaries.html |
| 3 | `03-identity-and-auth` | changple5/2026-08-26-03-identity-and-auth.html |
| 4 | `04-conversations-system-of-record` | changple5/2026-08-26-04-conversations-system-of-record.html |
| 5 | `05-chat-turn-end-to-end` | changple5/2026-08-26-05-chat-turn-end-to-end.html |
| 6 | `06-chat-context-and-memory` | changple5/2026-08-26-06-chat-context-and-memory.html |
| 7 | `07-retrieval-read-path` | changple5/2026-08-26-07-retrieval-read-path.html |
| 8 | `08-ingestion-pipeline` | changple5/2026-08-26-08-ingestion-pipeline.html |
| 9 | `09-indexing-and-embeddings` | changple5/2026-08-26-09-indexing-and-embeddings.html |
| 10 | `10-consulting-mode` | changple5/2026-08-26-10-consulting-mode.html |
| 11 | `11-safety-and-grounding` | changple5/2026-08-26-11-safety-and-grounding.html |
| 12 | `12-content-library` | changple5/2026-08-26-12-content-library.html |
| 13 | `13-content-agent-intake-and-scaffold` | changple5/2026-08-28-13-content-agent-intake-and-scaffold.html |
| 14 | `14-content-agent-build-and-publish` | changple5/2026-08-28-14-content-agent-build-and-publish.html |
| 15 | `15-content-agent-agent-side` | changple5/2026-08-28-15-content-agent-agent-side.html |
| 16 | `16-running-it-celery-and-observability` | changple5/2026-09-13-16-running-it-celery-and-observability.html |
| 17 | `17-operator-console-and-llm-runtime` | changple5/2026-09-13-17-operator-console-and-llm-runtime.html |
| 18 | `18-billing-toss` | changple5/2026-09-13-18-billing-toss.html |
| 19 | `19-leaf-subsystems` | changple5/2026-09-13-19-leaf-subsystems.html |
| 20 | `20-reading-guide` | changple5/2026-09-13-20-reading-guide.html |

Unclean: chapter 20, "Reading guide: the whole curriculum in order", is really a table of contents or preface. It maps to position 20 as published. The book page could promote it to position 0; that is a design call, not a model one.

### Book 2 — `glide-ilab` / `phases` (codebase, phase book; 4 chapters, 5 documents)

| pos | key | rel_path | fmt | v / arch | lang | partner |
|---|---|---|---|---|---|---|
| 8 | `p8` | glide-ilab/2026-10-08-p8-stage-1-fact-check-and-the-project-1-plan.html | html legacy | v2 / 1 | en | ↔ ko below |
| 8 | `p8` | glide-ilab/2026-10-08-p8-stage-1-fact-check-and-the-project-1-plan-ko.html | html legacy | v1 / 0 | ko (`<html lang="ko">`, tag `ko`) | ↔ en above |
| 9 | `p9` | glide-ilab/2026-10-10-p9-the-stage-1-system-explained.html | html legacy | v1 / 0 | en | — |
| 17 | `p17-p18` | glide-ilab/2026-10-15-p17-and-p18-signal-extraction-and-the-weekly-aggregation-explained.html | html legacy | v1 / 0 | en | — |
| 24 | `p24` | glide-ilab/2026-10-16-p24-the-research-page-signal-and-theme-fixes-explained.html | html legacy | v1 / 0 | en | — |

The EN and KO variants are version-skewed: EN is at v2 and KO at v1. This is exactly the case the independent-chains rule (`## Decisions`) exists for.

### Book 3 — `knowledge` / `maintainer-guide` (codebase, guide series; 5 chapters)

Position evidence: each document's own `class="series"` banner reads "Part N of a five-part series". All rows are `html`, legacy, `v1`, 0 archived, `en`.

| pos | key | rel_path |
|---|---|---|
| 1 | `knowledge-what-it-is-and-how-it-is-used` | knowledge/2026-08-08-knowledge-what-it-is-and-how-it-is-used.html |
| 2 | `knowledge-system-internals-…` | knowledge/2026-08-08-knowledge-system-internals-the-content-plane-the-write-path-and-the-contracts.html |
| 3 | `knowledge-s-read-surfaces-…` | knowledge/2026-08-08-knowledge-s-read-surfaces-two-front-ends-one-corpus.html |
| 4 | `shipping-and-running-knowledge-…` | knowledge/2026-08-08-shipping-and-running-knowledge-distribution-the-edge-security-and-the-gates.html |
| 5 | `why-knowledge-is-this-way-…` | knowledge/2026-08-08-why-knowledge-is-this-way-and-how-to-change-it.html |

Keys are the full document slugs; they are elided here for width.

### Book 4 — `vocky` / `maintainer-guide` (codebase, guide series; 4 chapters)

Position evidence: part 1 lists "(1) the product and its …"; the internals document says "Part 1 covered …"; the decisions document says "Parts 1–3 explained …". All rows are `html`, legacy, `v1`, 0 archived, `en`.

| pos | key | rel_path |
|---|---|---|
| 1 | `vocky-what-it-is-…` | vocky/2026-08-06-vocky-what-it-is-and-how-it-is-used.html |
| 2 | `vocky-system-internals-…` | vocky/2026-08-06-vocky-system-internals-architecture-code-map-data-model-and-contracts.html |
| 3 | `vocky-security-operations-and-qa-…` | vocky/2026-08-06-vocky-security-operations-and-qa-keeping-it-safe-and-keeping-it-running.html |
| 4 | `vocky-decisions-history-…` | vocky/2026-08-06-vocky-decisions-history-and-the-agentic-workspace-why-it-is-this-way-and-how-to.html |

### Loose documents (no book; listed under their project) — 8

| rel_path | fmt | v / arch | lang | why loose |
|---|---|---|---|---|
| glide-ilab/2026-10-07-how-the-glide-ilab-team-ships-code-commits-prs-deploys-and-your-first-ticket.html | html legacy | v1 / 0 | en | Onboarding topic, not a phase |
| glide-ilab/2026-10-14-the-signal-tables-pr-explained-what-it-covers-how-it-looks-and-how-it-fits-the-r.html | html legacy | v2 / 1 | en | A PR explainer (PR 78/79), not a phase; **unclean**: it sits between p9 and p17 by date but has no phase number |
| arb_upbit_1/2026-08-31-real-running-investment-strategy.html | html legacy | v3 / 2 | en | Strategy topic covering P9 slices; **unclean**: the three arb docs read as a strategy-evolution series (P9 → P11–15 → P18–20) but declare no series |
| arb_upbit_1/2026-09-19-the-fish-ladder-catching-upbit-local-price-spikes-with-deep-limit-orders.html | html legacy | v1 / 0 | en | Same as above |
| arb_upbit_1/2026-09-21-the-korbit-fish-book-v2-measured-rungs-a-rest-then-taker-exit-and-a-5-m-live-sta.html | html legacy | v1 / 0 | en | Same as above |
| Mijual/2026-09-21-jujutower-ai-architecture.html | html legacy | v1 / 0 | en (with Korean terms) | Single document |
| bootstrap_agentic_workspace.sh/2026-08-10-the-agentic-workspace-from-scratch-what-this-repo-is-and-how-to-use-it.html | html legacy | v1 / 0 | en | Single document |
| base/2026-10-07-reading-your-glide-onboarding-doc-the-background-knowledge-explained-for-beginne.md | **md** | v2 / 1 | **ko** (`---` fence) | Single document; **unclean**: its subject is glide onboarding, but it lives in project `base`. A book never spans projects, so it stays loose. |

Totals: 4 books, 33 chapters (34 documents), 8 loose documents, 42 documents in all. One KO/EN pair (`p8`). Version history exists on 4 documents: arb live v3, base v2, p8 v2, signal-tables v2. The projects `changple_web`, `hi2vi` and `hi2vi_web` have an `index.md` but no documents.

## Evidence behind the decisions (code read)

- **The SQLite id is not durable.** `server/db.py`: `documents.id INTEGER PRIMARY KEY` with `UNIQUE (tenant_id, rel_path)`, and upsert is `ON CONFLICT(tenant_id, rel_path)`. An incremental reindex keeps the id; a wiped DB renumbers it. P25 already moved durable identity to `(org slug, project, slug)`, via `find_latest_document_by_slug` ordering `date DESC, id DESC`. Book and chapter identity must not key off `documents.id`.
- **Reindex rebuilds only from files.** `server/reindex.py` walks `docs/` (tenant #1) and `tenants/<uuid>/`, plus `.versions/`, and deletes rows whose file vanished. Any book data held only in SQLite is lost on a rebuild. That is why manifests live on disk.
- **Visibility is per project, in Postgres.** `server/persistence/models.py` `ProjectModel.visibility` (default `'private'`, unique `(tenant_id, name)`). `documents_api._is_publicly_readable` → `project.visibility == "public"`. A book that spanned projects could be half-visible, so a book belongs to exactly one project.
- **The version chain is locked to rel_path, extension included.** `server/main.py` `create_document` returns a 422 when `format` or `project` changes across `new_version`. `documents.archive_dir_rel_path` keys the archive directory by the **stem** (`.versions/<project>/<date>-<slug>/`, no extension). But `parse_archive_rel_path` rebuilds the owning document's rel_path *with the archive file's extension*, so a chain of mixed formats would mis-attribute old versions. This is the P30 change behind the "format-migration version" decision.
- **Write path.** `DocumentIn` has `title, markdown, project, tags, source_repo, date?, slug?, related[], format: md|html, overwrite, new_version, rel_path?, commit, co_authored_by?`. Pydantic forbids unknown fields, so new fields are additive only once declared. Tenant #1 (`ctx.is_public`) writes `docs/` and `git add`s `docs/<rel>`, `docs/index.md` and possibly `docs/<project>/index.md`, then pushes after the response (`server/publish.py`). Other tenants write `tenants/<uuid>/`, which is gitignored (`.gitignore` L5–8) and never committed.
- **The live privacy fact.** `.gitignore` L14 says "this repo is public". `gh repo view` → `leetusik/knowledge` `visibility: PUBLIC`. Every tenant #1 document is committed and pushed whatever its project's P19 visibility. "Private" therefore means "not readable through the web app or API" only. The text is world-readable on GitHub, and that includes the client/employer-flavoured `glide-ilab` and `base` onboarding material. Recorded as an operator question, not fixed.
- **MCP.** `mcp-server/CONTRACT.md` v1 is additive-only: new output fields are allowed and consumers must tolerate them. `id` and `rel_path` are the durable handles for `fetch_document`. `_citation_url` returns `""` and must never return the login-gated route.
- **/explain today** (`.claude/skills/explain/SKILL.md` §3, §5): `project` = the repo's root directory name, or `default` outside a repo. Re-explain is found by listing `/api/documents?project=` and matching slug or title by subject, then `new_version` + `rel_path`. Research mode writes a `#sources` section.
- **D13** (`works/deferred/open/D13/deferred.json`) is about a document's **public origin**: one URL for the source content, such as a naver-cafe post or a blog. It is not about a list of web sources cited inside a research document.
- **URL space.** Doc slugs use `[a-z0-9-]` (`documents._TAG_RE`). Web routes: `(public)/[org]/[project]/[slug]` (3 segments), `[org]/graph`, `documents/[id]`, `documents/[id]/versions/[v]`. No `[org]/page.tsx` and no 4-segment `[org]/[project]/…` route exists, so `/@{org}/{project}/books/{book}` (4 segments) cannot collide with a doc slug.

## Rejected alternatives (by question)

1. **Book.**
   - **Book as a Postgres row:** rejected. Legacy/template mode has no Postgres. Tenant #1's content is git-canonical, so its membership would be the only content fact missing from git.
   - **Book membership in each chapter's frontmatter:** rejected. Binding the 42 legacy documents would mean rewriting their files (a silent edit, or a version bump for no content change). Reordering would mean touching every chapter.
   - **A book spanning projects:** rejected, because visibility is per project.
2. **Chapter.**
   - **The chapter *is* the document (extended in place):** rejected. A KO/EN pair is two documents with two slugs and two version chains; folding them into one row breaks P25 URLs and MCP handles.
   - **A new Postgres entity:** rejected, for the same reasons as the book.
3. **Versions × variants.**
   - **One version number across both languages:** rejected. A translation lags its original (`p8` is EN v2 / KO v1 today), and a joint counter would force a fake re-publish of the language that did not change.
4. **Storage.**
   - **SQLite-only books:** rejected, because a reindex wipes them.
5. **Images.**
   - **Inline data URIs inside the chapter body:** rejected. They bloat FTS text and every archived version, and one image's bytes would be duplicated across versions.
   - **SVG uploads:** rejected. SVG is script-capable; S2's sanitized inline SVG covers vector art.
   - **A separate upload-then-reference route:** rejected. It is two calls with orphan bytes on failure. Inline `assets` in the one publish call is atomic under the write lock.
   - **Serving from a separate untrusted origin:** not needed. Raster images served with `nosniff` and a sniffed type run no script.
6. **Phase → chapter.**
   - **A chapter per phase in a book per phase:** rejected for phase-level explains, because it is noise. A per-phase book is used only when a phase is explained one doc per slice.
   - **Keeping the list-and-match-by-subject re-explain step for chapters:** rejected. The chapter key replaces it deterministically. The step stays only for loose documents.
7. **The html → native first re-explain.**
   - **A brand-new document, with the chapter re-pointed and the old document left live:** rejected. It duplicates search hits, and the old body never joins the chain.
   - **Keeping the 422:** rejected, because it contradicts the confirmed intent ("Re-explaining a legacy explainer publishes its next version in the new format").
8. **D13.**
   - **Absorbing D13 to carry research citations:** rejected. A chapter's cited sources are many in-body references (S2's Sources block), while D13 is one origin URL per document. Different shape, different consumer.

## Commands run

```
git fetch origin                                  # origin/main = ed8dba0; local main 15 ahead / 11 behind; never pulled
git ls-tree -r --name-only origin/main docs/
python3 <scratchpad>/hdr.py                        # throwaway: header, title, version, lang, archive count for 42 docs; deleted
git show origin/main:docs/<path> | sed -n '1,/-->/p'   # p8, p8-ko, arb live, base md headers
git show origin/main:docs/<project>/index.md       # glide-ilab, changple5, knowledge, base, hi2vi, changple_web (generic; no series data)
grep 'class="series"' / "Part N" over knowledge/ and vocky/ docs   # series order
grep P<N>/PR refs over glide-ilab, arb_upbit_1, Mijual, changple5 #20
gh repo view --json visibility                     # PUBLIC
python3 scripts/workflow.py validate               # pass
git status --porcelain                             # no product files changed
```

Not read and possibly stale: the rest of `docs/current` (the plan named its sections; the code was read directly instead, since "the code wins"); `server/gitops.py` internals; the web reader components (S2's remit).

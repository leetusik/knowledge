# Intent — P26

- Captured at: 2026-08-08T03:51:34+09:00
- Origin: operator

## Original Input (verbatim)

> for /explain knowledge. referencing the how vocky done this.

## Confirmed Intent (refined + clarified)

Do for the **knowledge** product what vocky's phase **P15 "New-maintainer knowledge base"** did for vocky:
run a phase whose product is *understanding*, not code. `DECOMP` surveys `docs/current/*.md` (11 tracks,
~5,456 lines) plus the codebase and cuts **4–5 substantial `knowledge` slices**, each one `/explain` run
producing one self-contained interactive HTML explainer, written to be read **in order** as a short series.
A final light **`README.md` audit-and-fix** slice closes the phase.

Audience is the **new maintainer** needing full internal understanding — the same target vocky P15 chose. A
public / end-user-facing series (install the plugin, the CLI, `/knowledge:setup`, the MCP retriever,
self-hosting) is explicitly **out of scope here** and is a better *separate later phase*: it is a different
voice and a different source set, and this maintainer series is the research pass that makes it cheap to write.

Vocky P15's shape is the reference, not a template to copy line-for-line — knowledge has an extra
distribution axis (Claude Code plugin + standalone CLI + MCP retriever + hosted multi-tenant SaaS) that
vocky did not, and `DECOMP` should group for *this* system, not vocky's.

## Clarifications Resolved

- Q: Who are these explainers written for — new maintainer (mirror P15), public developer/user, or both
  tracks in one phase? — A: **New maintainer (mirror P15)**. The public/user-facing series stays a
  separate later phase.
- Q: How many explainers, and how big — leave to `DECOMP` with a 4–5 target, leave to `DECOMP` with no
  target, or fix at exactly 4? — A: **Leave to `DECOMP`, aim 4–5 substantial.** The target is recorded up
  front so decomposition does not over-split the way vocky's first pass did (it cut ten narrow slices and
  had to be re-cut to five).
- Q: Include a `README.md` audit slice at the end like vocky's `P15.S5`, skip it, or widen the audit to
  `docs/current/` as well? — A: **Yes — a light audit-and-fix.** `README.md` is only 84 lines and mostly
  current, but does not mention P25's org slugs / pretty share URLs. Fix what is stale, wrong, or missing;
  **not** a rewrite. Auditing `docs/current/` was considered and declined as a materially bigger phase.

## Notes

- **Self-hosting wrinkle — this phase is unlike vocky P15 in one important way.** `/explain` derives
  `project` from the repo's root dirname, so these explainers are project **`knowledge`** and land at
  `docs/knowledge/<date>-<slug>.html` **inside this very repo** — the knowledge base documenting itself,
  published on its own public site. `~/.config/knowledge-kb/config.json` points at the **hosted** API
  (`https://knowledge.hi2vi.com`), which writes, commits, **and pushes** to `origin/main`. So each explainer
  save lands as a `kb-api` commit on `origin/main` while local slice commits accumulate on the local `main`:
  the phase must `git pull` (rebase) between explainer slices to see its own output and to keep the two
  histories from diverging. Record this in `phase.md` at `DECOMP` and honour it per slice.
- **Execution rule inherited from vocky P15:** `/explain` is a *user-level* Claude Code skill
  (`~/.claude/skills/explain/`), so it exists only on the main thread. Every `kind: knowledge` slice is
  therefore run **inline by the orchestrator**, never dispatched to a `slice-executor` — `--risk low` on
  those slices is nominal bookkeeping, not a tier selector. The `README.md` audit slice is dispatched
  normally.
- **KB gotcha recorded by vocky's `P15.REVIEW`:** `https://knowledge.hi2vi.com` answers **403 Forbidden**
  to Python `urllib` (edge user-agent filtering) but **200** to `curl` with the same bearer token. Verify
  published documents with `curl`, as the `/explain` skill itself does.
- The KB currently holds **no** `knowledge`-project explainers at all (`docs/` has `changple5`,
  `changple_web`, `hi2vi`, `hi2vi_web`, `bootstrap_agentic_workspace.sh`, `vocky` — no `knowledge/`).
  This phase creates that project folder and its landing page.
- Operator asked, in the same breath, to run `/do-whole-phase` in **auto** mode immediately after the phase
  is created.

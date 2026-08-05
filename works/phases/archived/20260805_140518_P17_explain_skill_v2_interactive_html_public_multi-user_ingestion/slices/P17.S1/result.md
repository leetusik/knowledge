# Result — P17.S1: Explain skill v2 rewrite (canonical copy)

**Status: done.** The canonical explain skill now always emits a single self-contained
interactive HTML explainer for both modes (topic and code-change), with a default-on,
citation-backed "Best practices & next steps" web-research section behind a judgment
gate, POSTed with `format:"html"`. Plugin version bumped `0.2.1 → 0.3.0`.

## What changed (the five in-scope files + slice artifacts)

1. **`plugin/skills/explain/SKILL.md`** — full rewrite of the output contract:
   - **Frontmatter:** `description` now names the interactive HTML explainer (quiz +
     cited best-practices, still "your own personal knowledge base"); `argument-hint:
     <topic or change-ref> [here] [research|no-research]`; `allowed-tools` gains
     `WebSearch`, `WebFetch`, `Bash(git diff:*)`, `Bash(git log:*)`, `Bash(git show:*)`.
   - **§1** now parses the trailing flag words (`here`, `research`, `no-research` — all
     compose) and does mode detection (change vs topic; empty-args heuristics). Both
     modes produce the *same* four-section document; only the lens differs.
   - **§2 config resolver is byte-identical** to the prior version (proven by diff of the
     full section against `HEAD` — see Validation). Not one character changed.
   - **§3** splits repo research by mode (change mode reads the real diff via
     `git diff`/`git log`/`git show` + changed files; topic mode walks the real code) and
     adds the web-research decision: forced on/off, else a judgment gate (skip
     purely-internal / trivial), always degrading gracefully offline (never hang, loop,
     or fail the save). Outcome is remembered for the report as
     included / skipped-by-judgment / skipped-offline.
   - **§4** replaces the entire markdown house style with the HTML spec: hard
     self-containment constraints (inline CSS/JS, zero external requests, no `fetch`/XHR,
     no `<form>`, no `target="_blank"`, starts at `<!DOCTYPE html>`), page shape (ToC,
     fixed section order Background → Intuition → Code → Best practices → Quiz, `<pre>`
     `pre-wrap`, callouts, HTML/CSS-or-SVG diagrams never ASCII, Kleppmann tone, no length
     cap), the best-practices citation rule (visible-domain-in-text), the 5-MCQ quiz
     rules, and a **compact skeleton + one worked quiz item** as the structural contract.
   - **§5** saves `<tmp>/body.html` (raw from `<!DOCTYPE html>`, no frontmatter);
     `meta.json` gains `"format": "html"`; the merge command keeps the exact same shape
     (`m["markdown"]=open(body).read()`); the two curl forms and the 201/409/422/401
     branches/wording are unchanged.
   - **§6** fallback writes `<KB_ROOT>/docs/<project>/<date>-<slug>.html` with the exact
     `<!--kb …-->` comment-frontmatter the API emits — copied field-for-field from
     `server/documents.py` (`serialize_html_frontmatter` /
     `_frontmatter_inner_lines`): JSON-double-quoted title, bare date, YAML tag list,
     `source: project/repo`, then a blank line, then the raw HTML. Landing stays `.md`;
     the Recent bullet links the `.html` rel_path (matching `rel_path(fmt="html")` +
     `format_recent_bullet`); the two git commands are unchanged.
   - **§7** project copy writes `<TOPIC>_EXPLAINED.html` (raw HTML, no frontmatter).
   - **§8** report unchanged in shape; adds the one-line research-section outcome and the
     fallback view URL now points at the `.html` static asset.

2. **`plugin/.claude-plugin/plugin.json`** — `version 0.2.1 → 0.3.0`; description rewritten
   to name the interactive HTML explainer (quiz + cited best-practices section).

3. **`.claude-plugin/marketplace.json`** — plugin-entry description synced to the same text.

4. **`plugin/README.md`** — `/knowledge:explain` blurb rewritten for v2 (interactive HTML
   explainer with quiz + cited best-practices, both modes, `research`/`no-research`/`here`
   flags, still API-first with file fallback).

5. **`plugin/skills/setup/SKILL.md`** — **version strings only**: `0.2.1 → 0.3.0` in the
   marker JSON, and the two stale `0.1.0` prose/commit-message mentions → `0.3.0`. No
   other setup content touched (setup-flow work is S3's).

**Slice artifacts:** `sample-explainer.html` (conformance fixture, below) and this
`result.md`.

## Design decisions finalized (S1 owned the last call)

- **Section placement:** Best practices & next steps sits between **Code** and **Quiz**,
  as its own ToC section. When the research gate skips it, the section *and its ToC entry*
  are simply absent — no "skipped" marker in the document; the chat report explains why.
- **Force arguments:** trailing standalone words like the existing `here` — `research`
  forces the section ON (skips the judgment gate, still degrades offline), `no-research`
  forces it OFF; last-one-wins if both appear; all three flags compose and are stripped
  before the topic is used.
- **Mode names shared:** both modes use the same four section names; the lens differs
  (documented per-section in §4.2 and §3).
- **Citations:** visible-domain-in-text convention (link text + bare domain in
  parentheses) so provenance survives FTS/MCP extracted-text indexing.

## Sample fixture (conformance evidence + S5 reuse)

`works/phases/active/P17/slices/P17.S1/sample-explainer.html` — a complete miniature
explainer ("Debouncing a Search Box"), topic mode, all five sections, a genuinely cited
best-practices section (three real pages verified live: MDN `setTimeout` / `clearTimeout`,
CSS-Tricks debounce/throttle — all HTTP 200, content spot-checked for the claims), and a
working 5-question quiz with immediate correct/incorrect feedback via inline JS. It is the
spec-conformance evidence and a reusable fixture for S5's hosted E2E.

## Validation

| Check | Command | Outcome |
|---|---|---|
| §2 resolver byte-identical | `git show HEAD:…/explain/SKILL.md` vs worktree, full §2 section diff | **`S2-BYTE-IDENTICAL`** (empty diff) |
| §2 resolver executes | extracted snippet run | `KB_STATUS=configured`, all 5 keys emitted, no error |
| Sample first line | `head -1 sample-explainer.html` | `<!DOCTYPE html>` |
| Sample self-containment | grep for `src=`, `<link`, `@import`, `url(http`, `fetch(`, `XMLHttpRequest`, `<form`, `target="_blank"` | **all NONE** |
| Sample structure | grep counts | 5 sections, 5 ToC links, 5 quiz blocks, 5 `data-correct="true"`, `pre-wrap` present, 5 visible-domain citations |
| JSON sanity | `json.load` on `plugin.json` + `marketplace.json` | both OK |
| No stale versions | grep `0.2.1`/`0.1.0` in `setup/SKILL.md` | NONE |
| Workflow state | `python3 scripts/workflow.py validate` | **Workflow validation passed** |
| Plugin manifests | `claude plugin validate .` and `claude plugin validate ./plugin` | **both ✔ Validation passed** |

Per the plan, `scripts/plugin_parity.py` was **not** run as a gate (red until S4, known);
no services were booted.

## Deviations from plan

None. All plan items implemented as specified; the operator-ratified design decisions
(§34 items 1–10) were applied with wording refined, not substance changed.

# P38-e1.S1 result

- status: done
- route: mid
- model: opus
- effort: medium
- summary: The explain skill's §2 resolver no longer prints the KB key: it prints `KB_API_TOKEN_SET=yes|no` and `KB_AUTH_HEADER=<path>`, writing the bearer line to a 0600 `<KB_EXPLAIN_STATE>/auth.header`. Every KB curl now passes `-H @<KB_AUTH_HEADER>`, the prior lookup/read go through the `knowledge` CLI first, B6 forbids roles from touching the key, and a tiny no-network test proves the resolver never leaks it.
- files_changed: plugin/skills/explain/SKILL.md, .agents/skills/explain/SKILL.md, web/public/SKILL.md, plugin/agents/{web-researcher,code-researcher,gap-reviewer,verifier,explain-critic}.md (regenerated), tests/test_explain_resolver.py (new), plugin/templates/manifest.json, works/phases/active/P38-e1/phase.md (via phase-section), this result.md
- validation:
  - `python3 scripts/skills_parity.py` → PASS
  - `python3 scripts/plugin_parity.py` → PASS
  - heading diff vs `14e1cbda` → empty (Part B `<!--` marker lines also diffed: identical)
  - P33-n3 citation check → `citations checked=200 missing=2` (the two pre-existing `B5 *Your dispatch*` misses; no worse)
  - `python3 -m pytest …` → pytest not on the system python; `uv run pytest tests/test_explain_resolver.py -q` → 2 passed
  - `grep -n 'Authorization: Bearer <KB_API_TOKEN>\|print("KB_API_TOKEN=' plugin/skills/explain/SKILL.md` → no match
  - `git status --porcelain .claude/` → empty
  - `python3 scripts/workflow.py validate` → passed (stale-docs / oversized-section warnings only, pre-existing)
- deviations: the loose-document lookup is `knowledge --base-url <B> list --project <p> --limit 200 --json`, adding `--json` to the plan's command: the CLI's plain-text `list` prints only id, date, rel_path and title (`_doc_line` in `cli/src/knowledge_cli/knowledge.py`), while `--json` prints the server payload verbatim (`emit`), which is the same payload the old curl returned (slug, title, rel_path, version, format). The CLI stays primary and the curl with `-H @<KB_AUTH_HEADER>` is kept as the no-CLI fallback, for the lookup and the prior read alike.
- doc_impact: operations.md (resolver no longer prints the key; KB calls use `<KB_EXPLAIN_STATE>/auth.header` or the CLI); qa.md (the new resolver test) — both appended to `## Doc impact`.

## What changed in the canonical skill (`plugin/skills/explain/SKILL.md`)

- *The front door, step by step*: "Write nothing, anywhere" gains the one exception, the resolver's own header file (a credential cache beside the configuration, never a run artifact).
- §2: the lead-in sentence now says the resolver never prints the key, writes the 0600 header file, and that the file's contents and the key are never read, printed or passed. The resolver (still one `python3 -c`, no single quotes inside) computes the state folder earlier, writes `auth.header` with `os.open(…, O_WRONLY|O_CREAT|O_TRUNC, 0o600)` + `os.fchmod` before the write + `os.chmod` after, removes a stale file when there is no token, and on `OSError` prints `KB_AUTH_HEADER=` plus `KB_AUTH_ERROR=<ExceptionClass>: <strerror>` (never the token). Output order: STATUS, ROOT, API_BASE_URL, API_TOKEN_SET, AUTH_HEADER, [AUTH_ERROR], SITE_BASE_URL, LOCAL_FALLBACK, EXPLAIN_STATE, NOW; every other line is unchanged. The value list now reads "eight values", with `KB_API_TOKEN_SET` and `KB_AUTH_HEADER` bullets replacing `KB_API_TOKEN`.
- §3.1: the "every curl takes …" rule now names `-H @<KB_AUTH_HEADER>` (dropped when empty) and says to use the CLI where a subcommand exists; the book-manifest curl gains `-H @<KB_AUTH_HEADER>`; the loose lookup is the CLI `list --json` with the curl fallback; the prior read is CLI `read <rel_path> --source` (plain `read` for an html prior) with the curl fallback; `/versions` names the same curl form with its header.
- §4.9: the curl check uses "§5's payload and `-H @<KB_AUTH_HEADER>`".
- §5: the curl publish's second form is `-H @<KB_AUTH_HEADER>`, keyed on `KB_AUTH_HEADER` non-empty; the 401 text names an API key, step 2's `KB_AUTH_ERROR`, and never printing or reading the key or file.
- §5.1: the verification GET's second form is `-H @<KB_AUTH_HEADER>`.
- B6: one new bullet, *Never touch the KB key*: never read, print or pass the lead's `auth.header` or a KB API key. `skills_parity.py --write-agents` regenerated all five agents (2 lines each).

## Confirmed, unchanged

- The allowed-tools frontmatter and the D0b permissions block need no new rule: every KB curl still starts `curl -sS --max-time 5 ` or `curl -sS --max-time 30 `, so `-H @<file>` sits inside `Bash(curl -sS --max-time 5:*)` / `…30:*` (and the D0b strings `Bash(curl -sS --max-time 30 *)` / `… 5 *`); the CLI calls start `knowledge --base-url`, already allowed. Nothing changed there.
- The bearer contract: same key, same endpoints, same server checks; only where the key travels changed. The CLI's §5 note (reads its key from `$KB_API_TOKEN` or the config) is unchanged.
- The CLI check: `list`'s plain text lacks slug and version, its `--json` carries them (see deviations).

## Copies

- `web/public/SKILL.md` = `cp` of the canonical file; `.agents/skills/explain/SKILL.md` = canonical minus the `argument-hint:` / `allowed-tools:` lines (both confirmed to follow that rule at HEAD before the change).

## The test

`tests/test_explain_resolver.py` lifts the indented `python3 -c '…'` block from the canonical SKILL.md, runs it with `HOME`, `XDG_CONFIG_HOME`, `XDG_STATE_HOME` in `tmp_path` (and `KB_*` env vars stripped) against a `config.json` holding `vk_test_not_a_secret`: the token is absent from stdout/stderr, `KB_AUTH_HEADER` is `<KB_EXPLAIN_STATE>/auth.header`, mode `0600`, content `Authorization: Bearer vk_test_not_a_secret\n`. With no token, a pre-planted stale file is removed and `KB_AUTH_HEADER=` is empty. Listed in `plugin/templates/manifest.json` `root_only` beside `tests/test_migrate_books.py`.

## phase.md (through phase-section)

- `## Decisions` entry 6: the CLI `list --json` lookup and `read --source` prior read.
- `## Doc impact`: two lines (operations.md, qa.md).
- `## Notes for later slices`: removed the consumed `(from DECOMP, for S1)` manifest note; the `(for S1–S7)` note stays for later slices.
- `## Now`: rewritten.

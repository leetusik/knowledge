# P38-e1.S1 — the KB key is never printed (intent item 6)

## Goal

A `/knowledge:explain` run never puts the KB API key into a transcript. Today §2's resolver prints `KB_API_TOKEN=<key>`, and every curl line writes `-H "Authorization: Bearer <KB_API_TOKEN>"`, so the key shows up in the lead's commands (P50-4b leaked it). After this slice:
- the key lives only in a 0600 header file the resolver writes, or inside the `knowledge` CLI;
- every KB call uses the CLI where a subcommand exists, and `curl -H @<header file>` elsewhere.

## The approach (pinned; decide nothing new)

Follow `works/phases/active/P38-e1/topics/breakdown.md` **`## P38-e1.S1`** exactly, read with `phase-section P38-e1 "P38-e1.S1" --topic breakdown` or by heading. Also follow **`## The shipped set`** and **`## Pins for every rule slice`** in that file. In short:

1. **§2 resolver** (*Resolve the knowledge base configuration*):
   - It prints `KB_API_TOKEN_SET=yes|no` and `KB_AUTH_HEADER=<path>`, never the key.
   - With a token, it writes `Authorization: Bearer <token>` to `<KB_EXPLAIN_STATE>/auth.header`: `os.open(…, O_WRONLY|O_CREAT|O_TRUNC, 0o600)`, then `os.chmod(…, 0o600)`.
   - With no token, it removes a stale file and prints `KB_AUTH_HEADER=` empty.
   - If the write fails, it prints `KB_AUTH_HEADER=` and `KB_AUTH_ERROR=<reason>`.
   - It stays one `python3 -c` call, and every other output line is unchanged.
   - Update the output description (the `KB_API_TOKEN —` bullet) and the "never `$KB_API_TOKEN`" sentence to match.
2. **The front door's "Write nothing, anywhere"** gets the one stated exception: the resolver's own header file, a credential cache beside the configuration it reads, never a run artifact.
3. **Every bearer line** becomes `-H @<KB_AUTH_HEADER>`, or no header when it is empty. The places:
   - §3.1's "every curl takes …" rule and its calls;
   - the CLI alternative;
   - §4.9's curl check;
   - §5's curl publish;
   - §5.1's verification GET;
   - the 401 text.

   Re-find each by heading, not by line number: the breakdown's numbers are at `14e1cbda` and drift. When you are done, `grep -n 'Bearer <KB_API_TOKEN>\|print("KB_API_TOKEN='` must find nothing in the canonical skill.
4. **The CLI where it exists:**
   - the loose-document prior lookup is `knowledge --base-url <B> list --project <p> --limit 200`;
   - the prior read is `knowledge … read <rel_path> --source`.

   First check in `cli/src/knowledge_cli/` that `list`'s output carries slug, title, `rel_path` and version. If it does not, keep curl with the header file there and say so in `result.md`.
5. **B6** (*Rules for every research agent*) gains one line: never read, print or pass `auth.header` or a KB key. Then run `python3 scripts/skills_parity.py --write-agents`.
6. **Confirm only:**
   - the allowed-tools frontmatter and the D0b rules block need no new rule, because `-H @file` stays inside the existing `Bash(curl -sS --max-time 5 *)` and `… 30 *` patterns;
   - change nothing there if that holds, and say so in `result.md`.
7. **Sync the copies:**
   - `.agents/skills/explain/SKILL.md` is the canonical file minus its `argument-hint:` and `allowed-tools:` frontmatter lines, with a byte-equal body;
   - `web/public/SKILL.md` is a full `cp` of the canonical file.
8. **The test** `tests/test_explain_resolver.py` (tiny, no network):
   - it extracts the resolver block from the canonical SKILL.md;
   - it runs it with `HOME`, `XDG_CONFIG_HOME` and `XDG_STATE_HOME` in a tmp dir, with a `config.json` holding the fake token `vk_test_not_a_secret`;
   - it asserts the token is absent from stdout, and that `KB_AUTH_HEADER` names a `0600` file holding the bearer line;
   - with no token: `KB_AUTH_HEADER=` is empty and no file is left.

   Add `"tests/test_explain_resolver.py"` to `plugin/templates/manifest.json`'s `root_only`, as `tests/test_migrate_books.py` is. Match the style of the existing tests in `tests/`.

## Constraints

- **Headings, `§` numbers and Part B marker lines stay byte for byte.** New text goes inside existing sections. No new `## Explain` field.
- **The set** (touch nothing else):
  - `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md` and `web/public/SKILL.md`;
  - the five `plugin/agents/*.md` (regenerated only);
  - `tests/test_explain_resolver.py`;
  - `plugin/templates/manifest.json`.
- **Never** edit `.claude/skills/**`, commit, or move workflow state.
- Do not change the bearer contract: same key, endpoints and server checks. Only where the key travels changes.
- Leave a `## Doc impact` note in `phase.md` via `phase-section P38-e1 "Doc impact" --append`:
  - `operations.md`: the explain resolver no longer prints the key, and KB calls use `<KB_EXPLAIN_STATE>/auth.header` or the CLI (P38-e1.S1);
  - `qa.md`: the new resolver test (P38-e1.S1).
- Remove the consumed `(from DECOMP, for S1)` note (`--entry K --remove`), and update `## Now`.

## Validation

- `python3 scripts/skills_parity.py` → PASS
- `python3 scripts/plugin_parity.py` → PASS
- `diff <(git show 14e1cbda:plugin/skills/explain/SKILL.md | grep '^#') <(grep '^#' plugin/skills/explain/SKILL.md)` → empty
- P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` L64–85, from the repo root) → `checked=200 missing=2`, no worse
- `python3 -m pytest tests/test_explain_resolver.py -q` (or `uv run pytest …`) → passes
- `grep -n 'Authorization: Bearer <KB_API_TOKEN>\|print("KB_API_TOKEN=' plugin/skills/explain/SKILL.md` → none
- `git status --porcelain .claude/` → nothing of this slice's

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh

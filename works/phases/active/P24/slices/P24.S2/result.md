# Result — P24.S2 (/explain skill: honest publish timeout + verify before retry)

Markdown-only slice. The `/explain` skill no longer treats a lost response as a failed
save: it raises the publish POST's budget, verifies what actually landed before it says
anything, and reports S1's `push_pending` / `pushed` semantics honestly.

## What changed (canonical `plugin/skills/explain/SKILL.md`, mirrored to 3 more copies)

1. **Frontmatter `allowed-tools`** — added `Bash(curl -sS --max-time 30:*)` **beside**
   the existing `Bash(curl -sS --max-time 5:*)` (the step-3 KB-research reads still use
   5 and stay pre-approved; nothing unrelated churned). The prefix rule from P23 is why
   this entry is mandatory: `curl -sS --max-time 30 …` does not match the `…--max-time 5`
   prefix, so without it every publish would prompt mid-run.

2. **`--max-time 30` for the publish POST** (both the token and no-token forms). Chosen
   over 5: after S1 the 201 is emitted before any network I/O (no git push, no Gemini
   embed on the response path), so the only remaining variable is uploading a
   several-hundred-KB HTML explainer over whatever link the user is on, plus nginx and
   the metering middleware's local Postgres write. 30 s is ~an order of magnitude of
   headroom over the realistic worst case while still being a bound that fails fast if
   something is genuinely wrong; a much larger value (120 s, matching nginx's
   `proxy_read_timeout`) would just make a real outage feel like a hang. The POST bullet
   now states the reason and that the value is the pre-approved spelling.

3. **New `### 5.1 Transport failure on the POST — verify before you report or retry`**
   — replaces the old "curl exit ≠ 0 = the API is unreachable → step 6" rule. The POST
   bullet now routes a non-zero exit to §5.1 instead of step 6, and §5.1 is:
   - target `rel_path` = `PRIOR_REL_PATH` for a `new_version` publish, else
     `<project>/<date>-<slug>.html`;
   - one `GET /api/documents/by-path/<rel_path>` (`--max-time 30`, same bearer rule);
   - **200 + this publish** (plain create: matching `title`; `new_version`:
     `PRIOR_VERSION + 1`) → landed → write no file, run no git, never re-POST, report
     success from `<tmp>/verify.json`;
   - **200 + still the old version** → the API is reachable and the write missed →
     **exactly one** re-POST, then stop;
   - **200 + a different document** on a plain create → this is the 409 case arriving
     late → ask the user, never re-POST blind (P23 duplicate/v2 hazard);
   - **404** → genuinely absent → one re-POST, then stop;
   - **5xx / any other status (401 when reads are token-guarded)** → stop, publish state
     unknown, no file write;
   - **transport failure on the verification GET too** → only then step 6;
   - explicit "never loop: one GET, at most one re-POST".
   Note recorded in the skill text: the by-path read projection carries `id`, `title`,
   `rel_path`, `version` but **no `url`** (verified against `server/main.py::_public_doc`
   and the `documents` schema — `url` is synthesized only on the 201), so the recovered
   path reports `rel_path`/`version` and `<KB_SITE_BASE_URL>/<rel_path>` rather than
   claiming a `url` that is not in the body.

4. **Step 6 gating + a landed-write guard.** Step 6's entry condition is now "§5.1's
   verification could not resolve it (the GET failed at the transport layer too)" — a
   bare curl exit ≠ 0 is no longer enough to get there. Inside the `KB_LOCAL_FALLBACK=yes`
   branch a guard runs first: if `<KB_ROOT>/docs/<project>/<date>-<slug>.html` already
   exists and its body (after the `<!--kb …-->` block) is the document just authored, the
   API's write did land at exactly that path → do not rewrite, do not touch
   `docs/index.md`, run no git, report it as saved. The `KB_LOCAL_FALLBACK=no` STOP now
   also says the publish state is unverified.

5. **Step 8 reporting** — two new bullets: a *Publishing state* bullet (`pushed:false`
   + `push_pending:true` is the normal 201 — saved and committed, remote publish running
   in the background; never a failure, never a retry trigger; no `push_error` field
   exists any more, background failures land in the server log), and a *Recovered path*
   bullet for the §5.1 outcomes. The 201 branch in step 5 now also records `pushed` and
   `push_pending` for step 8.

## Copies synced (all four)

| Copy | Rule | State |
|---|---|---|
| `plugin/skills/explain/SKILL.md` | canonical | edited |
| `.agents/skills/explain/SKILL.md` | body byte-identical, own frontmatter (no `allowed-tools`) | body re-synced, 4-line frontmatter preserved |
| `web/public/SKILL.md` | full-file byte-identical to canonical | byte copy |
| `~/.claude/skills/explain/SKILL.md` | installed copy (P23 precedent, outside the repo) | `cp`'d — write was **not** blocked; `diff -q` clean |

## Validation

| Command | Outcome |
|---|---|
| `python3 scripts/skills_parity.py` | **PASS** — "explain skill copies are in body parity (web copy byte-identical)" |
| `python3 scripts/workflow.py validate` | **PASS** — "Workflow validation passed." |
| `python3 scripts/plugin_parity.py` | **PASS** (run as a no-regression check; this slice touches no `server/`/`tests/` path) |
| `diff -q plugin/skills/explain/SKILL.md ~/.claude/skills/explain/SKILL.md` | identical |
| End-to-end consistency re-read of §5 → §5.1 → §6 → §8 | done — see below |

Consistency re-read findings (all resolved in the final text):
- every `curl` in the file is covered by an `allowed-tools` prefix: the four step-3 reads
  at `--max-time 5`, the POST (×2 forms) and the verification GET (×2 forms) at
  `--max-time 30`;
- the `python3 -c` merge command is untouched (byte-identical to before);
- no dangling reference to the old "exit ≠ 0 → step 6" rule remains; step 6's opening,
  step 8's fallback bullet and §5.1's exit all agree on the single route into the
  fallback;
- `PRIOR` / `PRIOR_REL_PATH` / `PRIOR_VERSION` / `KB_LOCAL_FALLBACK` / `KB_SITE_BASE_URL`
  are used with the same meanings step 2 and step 3 give them;
- the skill never mentions `push_error` (it never did, and step 8 now states the field
  does not exist).

## Deviations from plan.md

- **Two additions the plan did not spell out**, both inside its stated intent ("only fall
  through to step 6 when the verification says genuinely absent"): (a) the step-6
  file-exists guard, which is what keeps the *unverifiable* path from duplicating a write
  the API actually made, and (b) the "200 answering a different document" branch, which
  routes a late 409 to the user instead of a blind re-POST.
- The plan suggested reporting `url` from the verification; the by-path projection has no
  `url`, so the recovered path reports `rel_path`/`version`/`id` and derives the view
  location from `KB_SITE_BASE_URL`. Documented in the skill so a future reader does not
  re-introduce the wrong field.
- Nothing else: no server, CLI, or other-skill file touched; no `doc-new-version` (per
  the once-per-phase rule — a Doc impact note went to `phase.md` instead); no workflow
  state command, no commit.

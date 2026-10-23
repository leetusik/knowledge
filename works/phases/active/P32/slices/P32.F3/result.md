- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Changed the landing's skill section's two line-count strings (`lede`, `pane.meta`) from 775 to 2,608, the `wc -l web/public/SKILL.md` figure. Verified on a scratch production build; Aside was down, so the instrument was curl plus a headless-Chrome screenshot.
- files_changed: web/src/content/marketing/content.ts; works/phases/active/P32/phase.md (Notes for later slices, Now); this result.md
- validation:
  - `wc -l web/public/SKILL.md` = 2608 (passed; matches the plan's number)
  - `grep -n '775' web/src/content/marketing/content.ts` prints nothing (passed)
  - `pnpm --dir web typecheck` (passed), `pnpm --dir web lint` (passed)
  - `pnpm --dir web test` not run: `grep -rln FEATURE_SKILL web/src web/tests` finds only `content/marketing/index.ts`, `content.ts`, `components/marketing/feature-skill.tsx`; no test
  - scratch production build: `pnpm build` (Turbopack) failed, then `pnpm exec next build --webpack` passed; `next start -p 3917` served `/`; SSR HTML carries "It's a 2,608-line skill:" and "2,608 lines · yaml + markdown" (twice, the second in the RSC payload); the only other `775` matches are React keys and line numbers inside the pane's embedded text
  - `git diff --stat -- web` touches only `web/src/content/marketing/content.ts` (2 lines); `python3 scripts/workflow.py validate` passed (existing warnings only)
- deviations:
  - The scratch `pnpm build` (Turbopack) failed on the symlinked `node_modules`: "Symlink [project]/node_modules is invalid, it points out of the filesystem root". Fell back to `next build --webpack` in the same scratch copy, which is still a production build.
  - Aside was unavailable: `aside repl --account u1` returned "Aside daemon is not reachable — make sure Aside Browser is running". I could not start it. No Aside run was made. The DOM check is curl on the production server's HTML, and the visual is one headless Chrome (`--headless=new`) screenshot. Not claimed as an Aside run.
  - The screenshot is not at 1440x900 viewport nor JPEG: the page was captured at 1440x7000 PNG and cropped to the section. The landing's reveal animation had not finished, so the section is faded but legible. The lede reads "It's a 2,608-line skill" in it; the faded pane meta line is confirmed by the HTML grep, not the picture.
- doc_impact: none (copy, not durable truth)

## Before and after

- `lede`: "It's a 775-line skill:" -> "It's a 2,608-line skill:"
- `pane.meta`: "775 lines · yaml + markdown" -> "2,608 lines · yaml + markdown"

## Instrument and paths

- Scratch copy: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/f3/web` (`web/` minus `node_modules`, `.next`, `.env*`; `node_modules` symlinked). Server on :3917 (own PID 60118, stopped); its `.next` deleted. :3030 and :8766 were not touched, nothing was built in `web/`.
- Screenshot: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/f3/skill-crop.png` (full page: `.../f3/landing-full.png`).
- The re-review should re-check the pane in Aside `u1` once the browser is running.

## Other `FEATURE_SKILL` strings P32 may have made false (not edited; candidates for the re-review)

- Tick 1: "the identical skill text ships for Codex under `.agents/`". The `.agents` copy's frontmatter already lacked `argument-hint`/`allowed-tools` before P32, so "identical" was loose then; still true of the body.
- Tick 2: "a byte-parity CI gate keeps it from ever forking". Still true (`scripts/skills_parity.py`); the pane's `parity` string points at `plugin/skills/explain/SKILL.md`, which exists.
- `lede`'s description of the skill ("research the topic or the diff, write a native chapter with real diagrams and a quiz, cite sources, save over REST") still fits; P32's research-first path is not mentioned there, which is the operator's wording call.

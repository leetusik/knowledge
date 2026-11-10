# P40-2t.S6 — result

- **status:** done
- **route:** mid
- **model:** opus
- **effort:** medium
- **summary:** Released plugin 0.11.0 (version, descriptions, setup's plugin_version, the plugin/root READMEs and the KB template on v96, chained research, `from=`, the subject book and chapters at once; no v94 left). Recounted content.ts to 2,665. Quoted the proposal in research-route.md for the `## Explain` hazard. Wrote the package's README, PATCHES index, patches/release.md and the three checks, retargeted to fdb1151. All 33 finds occur exactly once. The whole patched suite passes on a rebuilt scratch copy: 504 PASS, 0 FAIL.
- **files_changed:**
  - plugin/.claude-plugin/plugin.json
  - .claude-plugin/marketplace.json
  - plugin/skills/setup/SKILL.md
  - plugin/README.md
  - README.md
  - plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md
  - web/src/content/marketing/content.ts
  - works/phases/active/P40-2t/package/claude/skills/create-phase/research-route.md
  - works/phases/active/P40-2t/package/README.md (new)
  - works/phases/active/P40-2t/package/PATCHES.md (new)
  - works/phases/active/P40-2t/package/patches/release.md (new)
  - works/phases/active/P40-2t/package/checks/finds.py (new)
  - works/phases/active/P40-2t/package/checks/apply.py (new)
  - works/phases/active/P40-2t/package/checks/cites.py (new; P39-hk's parser, docstring retargeted)
  - works/phases/active/P40-2t/phase.md (through phase-section only)
  - works/phases/active/P40-2t/slices/P40-2t.S6/result.md (new)
- **validation:**
  - `python3 scripts/skills_parity.py --write-agents`, then `skills_parity.py`: PASS (the four skill files unchanged); `python3 scripts/plugin_parity.py`: PASS
  - `checks/finds.py /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh fdb1151`: `finds checked=33 not-exactly-once=0` (create-phase 5, workflow 14, engine 7, release 7): PASS
  - `checks/apply.py <scratchpad>/p40-s6` (a fresh `git archive` of fdb1151, unpacked whole): `applied finds=33`, fragment written, smoke explain block L211–L316 passed, flipped P42 pin and hazard sentence hold, skill count 21, byte caps 12,285/8,185/8,180, create-phase core 50,681 B: PASS
  - on that copy: `python3 installer/build.py` and `--check` OK; `bash tests/retrofit_smoke.sh` alone: `ALL RETROFIT SMOKE TESTS PASSED`, rc=0, 504 PASS, 0 FAIL (the same count as S4's run, so qa.md *Test Commands* needs no count change; the new pins are asserts inside the static Python block): PASS
  - `checks/cites.py plugin/skills/explain/SKILL.md` over the package's five texts: `citations checked=118 bold parts checked=17 missing=0`; over the patched copy's 64 `payload/claude/**/*.md` plus the seed operations doc: `checked=124 bold parts checked=17 missing=0`: PASS
  - `grep -rn "v94" plugin README.md .claude-plugin web/public/SKILL.md`: no match: PASS
  - `wc -l plugin/skills/explain/SKILL.md` = 2665 = content.ts's "2,665" (L251, L261): PASS
  - `uv run pytest -q`: 183 passed, 60 skipped: PASS
  - `pnpm --dir web typecheck`, `lint`, `test` (41 files, 589 tests), `build`: all rc=0: PASS (the worktree had no `web/node_modules`; `pnpm --dir web install --frozen-lockfile --prefer-offline` first). No dev server started.
  - `python3 scripts/workflow.py validate`: passed (warnings pre-existing: Decisions long entries 14/16, consolidation debt, stale docs, oversized sections)
- **deviations:**
  - `plugin.json` / `marketplace.json` description: not the skill's 1,700-character frontmatter description pasted whole, but the existing product description rewritten with A1's content (records-only with research findings, research first for any uncovered subject with the confirmation coming back by itself, v96, chapters at once), keeping its setup-skill sentence. P39-hk.S11 did the same; the skill description would drop the setup skill from the plugin's description.
  - `plugin/skills/setup/SKILL.md`: besides `plugin_version`, its two "v94 or later" sentences (L170, L461) now say v96 and name the research-covered subject, so the grep validation finds no handshake line.
  - `patches/release.md` also patches the seed operations doc and `installer/main.py`'s `(plugin 0.10.0+)`, both beyond the plan's list. They carry the same 0.10.0 floor and "covers only this repository's code" text as `README.en.md`'s block, which P39-hk patched the same way (its sections 5 and 7).
  - `patches/create-phase.md` does not quote the hazard step, so it is unchanged.
- **doc_impact:** `- product.md, operations.md, qa.md: plugin 0.11.0 is released (version, descriptions, setup's plugin_version, READMEs and KB template name v96, the chained research, from=P<N>, the subject book and chapters at once), unpushed; the release order is bootstrap v96 first, pushed, then plugin 0.11.0, then /update-workspace in this repo (v89), arb_upbit_1 and Note; the package's patched smoke suite stays at 504 PASS (no Test Commands count change). (P40-2t.S6)`
- **operator question:** OQ2, about the lede in content.ts.

## Detail

**The `## Explain` hazard.** `package/claude/skills/create-phase/research-route.md` step 2.2 now says the proposal is written as a blockquote with `> ` opening every line, so no line of a research phase's `intent.md` reads `## Explain`. The new smoke pin `` "`> ` opening every line" in create_phase `` and `checks/apply.py` both check it. S2's checks were re-run on the file: finds (create-phase 5 of 5 exactly once), cites (missing 0), and every create_phase pin (the whole suite).

**Smoke pins (patches/release.md §1).** 1a: the comment names plugin 0.11.0+. 1b: `"0.10.0" in create_phase` becomes `"0.11.0"`. 1c: `**0.10.0 or later**` in `_decomp` becomes 0.11.0. The new v96 pins are `- **sources**:`, `**When it passes.**`, `**0.11.0 or later**`, `at most 4 at once`, `--depends-on none`, `from=<P>`, `(kind subject: <label>)` and the hazard sentence in create_phase. Also: `## Chapters at once (a wave)` and `**At most 4 chapters in flight.**` in the chapter reference; kind subject, `--depends-on none` and at most 4 in the decomposition reference; `**the consistency pass.**` in explain-review; `*The research route*, **When it passes**` in both review.md files. 1d: the P42 pin flips to `"--depends-on none" in LIVE[_rel]`. Test 10d's literals are engine.md's (2a–2c), applied before release.md.

**Checks design.** `finds.py` reads the patch files from PATCHES.md's numbered index and fails if the index and `patches/` differ. `apply.py` imports that order and the find regex. It replaces each find with the next fenced block in the same patch file, and treats create-phase 1e (the two route texts) as a special case. It writes `**New file**` fragments, then runs the patched suite's explain block plus the extra pins.

**Scratch** (session scratchpad, throwaway): `p40-s6.tar` and `p40-s6/` (fdb1151, patched and rebuilt), `smoke-s6.log`, `web-*.log`, `s6-mdlist.txt`. Nothing was written to the bootstrap repo, Note or arb_upbit_1. The `next dev` on port 3030 seen in `ps` is the main checkout's, started 2026-10-21, and is not this slice's. No push.

**Notebook.** Removed the consumed notes 6–12 (S1, S2, S3, S4, S5 and the orchestrator's, all for S6). Appended one Doc impact line and OQ2 (the lede's "cite every line to the code" for a subject book). Rewrote `## Now` for REVIEW.

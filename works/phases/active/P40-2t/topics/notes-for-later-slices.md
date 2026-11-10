# P40-2t — notes-for-later-slices

_Entries moved here from phase.md by `phase-section --to-topic`, byte for byte, one `## ` block each; the pointer line left in each one's place names its block._

## Notes for later slices 6

- **(from P40-2t.S2, for P40-2t.S6)** Smoke literals: S2's edit removes or breaks none of the 61 create_phase pins at fdb1151. "0.10.0" in create_phase now survives only in the legacy-proposal refusal ("older than 0.10.0"): retarget that pin to "0.11.0". New pins: "- **sources**:", "**When it passes.**", "**0.11.0 or later**", "at most 4 at once", "--depends-on none", "from=<P>", "kind subject: <label>". The core grows from 40,523 to 50,448 B (no cap). The patch has 5 finds (1a–1e); 1e is the route replacement.

## Notes for later slices 7

- **(from P40-2t.S4, for P40-2t.S6)** `package/patches/engine.md` changes these smoke-suite literals:
  - Test 10d's ok-line tail "and an explain phase is exempt (v77)" becomes "and an explain phase's DECOMP is held to it too (v77, v96)".
  - Its objective "explain exempt" becomes "explain declared".
  - Its bad-line "explain rc=" splits into "explain refuse rc=" and "explain pass rc=".
  - These comments go: "explain chapters stay undeclared (explain-decomposition.md drops `--depends-on`)" and "An explain phase's chapters stay exempt."
  - The engine string "note: an explain phase's chapters stay undeclared and run one at a time" is gone.

  Check the P42 assert '"[--depends-on" not in' explain-decomposition.md against S3's text, and keep or drop it; a bare `--depends-on none` passes it. The release must rebuild the installer artifact (`python3 installer/build.py`). The whole patched suite passes: 504 PASS on a rebuilt scratch copy of `fdb1151`.

## Notes for later slices 8

- **(from P40-2t.S1, for P40-2t.S5, P40-2t.S6)** How S1 made the copies:
  - The `.agents` copy is the plugin body after its frontmatter, under `.agents`' own 4-line frontmatter, with the `description:` line replaced by the plugin's.
  - The web copy is a plain `cp`.
  - Then `python3 scripts/skills_parity.py --write-agents` runs.

  At S1 every check passed, the critic agent was unchanged, cites.py reported missing 0 and the 44 headings were unchanged. The skill is now 2,570 lines (it was 2,492), so `web/src/content/marketing/content.ts`'s count is stale.

## Notes for later slices 9

- **(from P40-2t.S1, for P40-2t.S6)** Text that still describes the old front door:
  - `plugin/README.md` L10–15, the intro (separate from *Explain: flags and the one confirmation*), still says "codebase-only", "declined" and v94.
  - The skill's `argument-hint` now includes `[from=P<N>]`.
  - The new description for `plugin.json` and `marketplace.json` is in the skill's frontmatter.

## Notes for later slices 11

- **(from P40-2t.S5, for P40-2t.S6)** The skill is now 2,665 lines (S1 left it at 2,570). Use that count in `web/src/content/marketing/content.ts`.
  - `skills_parity` and `plugin_parity` PASS.
  - The critic agent was regenerated (+36/−4).
  - The 44 headings are unchanged, and `cites.py` reports missing 0 (126 checked).

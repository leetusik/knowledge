# Result — P20.S3: the designed onboarding sections (agent quickstart + published skill)

Implemented round-02's `build-prompt.md` faithfully in `web/`, plus the skill-publishing
parity plumbing. Two new landing sections (env-var agent quickstart · the published
explain skill), a copy-control client island, the served `/SKILL.md` artifact under an
extended byte-parity gate, the D10 feature ledes, and the page re-slot. All validation
green; nothing designed was dropped, simplified, or restyled.

## Validation — commands run and outcomes

| Command | Outcome |
| --- | --- |
| `python3 scripts/skills_parity.py` | **PASS** — "explain skill copies are in body parity (web copy byte-identical)"; the new third copy (`web/public/SKILL.md`) full-file byte-matches the canonical. |
| `cd web && npm run typecheck` | **PASS** — `tsc --noEmit` clean. |
| `cd web && npm run lint` | **PASS** — `eslint .` clean. |
| `cd web && npm run test` | **PASS** — 9 test files / 66 tests (was 8 / 61; +1 file, +5 tests for the copy control). |
| `cd web && npm run build` | **PASS** — `next build` compiled + TypeScript + 11/11 static pages; `/` is `○ (Static)`, proving the build-time `fs` read of `public/SKILL.md` and static generation of both new sections. |
| `python3 scripts/workflow.py validate` | **PASS** — workflow state integrity. |

**Prerendered-HTML assertions** (`.next/server/app/index.html`, static `/`): `id="agents"` +
`id="skill"` present; verbatim H2s/eyebrow/`KNOWN TRAP`/health legend present; the `export`
keyword inked in its own span with the base-URL text node beside it; the byte-exact **copy
payload** (both export lines, `\n`-joined, 8-space gap before the trailing comment) serialized
into the copy island's flight props; the curl copy payload present; both D10 ledes present; the
skill pane shows the **real frontmatter head** (`self-contained interactive HTML explainer`, the
`# explain` heading, `mkt-skill__key` YAML spans) read from disk at build; bar meta `486 lines ·
yaml + markdown`, `/knowledge:explain`, foot `read the whole skill`, parity note; `href="/SKILL.md"
download` present.

## Definition of done (build-prompt final section) — walked item by item

1. **Both sections live in the stated order** ✓ — `page.tsx` now: hero → what-it-is →
   how-it-works → save → connect → **agent-quickstart** → **the-skill** → graph → pricing →
   final CTA → footer. `AgentQuickstart` is `<Band tone="dark" hairline>` — it continues the
   Connect `--kb-band-dark` territory, divided by the on-dark hairline (`Band`'s `hairline`
   re-points `--mkt-border` → `--kb-border-on-dark` in the dark scope). `FeatureSkill` is
   `<Band tone="sunken">` (`--kb-surface-sunken`). Anchors `agents` / `skill` added to
   `MKT_SECTION_IDS`. Reveal per column throughout.
2. **D10 ledes in `content.ts`** ✓ — `FEATURE_SAVE.lede` + `FEATURE_CONNECT.lede` added
   verbatim from §D10; rendered as `mkt-lede text-body-lg` between h2 and ticks (the existing
   lede idiom). The Connect lede's `` `knowledge init` `` renders as an inline code span via
   `RichText` (backtick split); Save's lede has no backticks (plain). Closes D10 in shipped code.
3. **Exports / trap / Codex toggle / health check byte-exact** ✓ — locked strings live as
   exported constants in `content.ts` (`ZSHENV_COPY`, `HEALTH_CHECK_CURL`, `ZSHENV_COMMENT`,
   …), byte-verified against `build-prompt.md` §(a) (8-space gap confirmed). The `~/.zshenv`
   **display** floats the comment onto its own hint line above the exports (the trailing-comment
   form clips at column width — the design's own departure); the **copy action** writes the exact
   two locked lines with the trailing comment. The Codex `[sandbox_workspace_write]
   network_access = true` toggle is tick 3 (inline code). Inks: `export` teal-on-dark,
   `"vk_..."` bronze, comment hint; the health legend `200`/`401` in teal-strong under a hairline.
4. **`/SKILL.md` served under the byte-parity gate, working Download + full-text Copy** ✓ —
   `plugin/skills/explain/SKILL.md` copied to `web/public/SKILL.md` (served at `/SKILL.md` via
   the standalone image + nginx `/` catch-all, same zero-infra path as `install.sh`).
   `scripts/skills_parity.py` gained a third copy `WEB`, held to a **stricter full-file** byte
   match (frontmatter included) vs. the body-only rule for the two skill copies; missing/mismatch
   FAILs; docstring updated. CI needs no change (`plugin-ci.yml` already runs the script).
   Download = `<a href="/SKILL.md" download>` (CVA primary). Copy the skill fetches `/SKILL.md`
   and copies the whole body (never a pasted fork).
5. **Pane expand/collapse + no-JS fallback** ✓ — `SkillPane` (client island) toggles
   `data-expanded`; collapsed = `max-height: 430px` + bottom fade to `--kb-surface`, foot
   "showing the head · **read the whole skill ↓**"; expanded = same pane released to
   `max-height: 70vh; overflow:auto`, link flips to "collapse ↑". The head preview is
   server-rendered from the disk read (no-JS shows it), and the **no-JS fallback is the Download
   link** (the collapsed head + Download both render without JS). `aria-expanded` on the toggle.
6. **Copy-control states per §(c)** ✓ — `CopyButton` mono ghost pill (JetBrains Mono 12/600,
   pill radius, 30px min-height; 44px `--section`). idle **Copy** (double-sheet `Copy` icon) →
   success **Copied** (`Check`, teal accent + accent border, reverts after 2 s) → failure **Copy
   failed** (dashed border, hint text). The value is never logged (valueless catch). Focus = the
   global 2px teal `:focus-visible` ring @ 2px offset (matches "`--mkt-accent-strong` ring" — that
   design name maps to the shipped `--color-green-deep` / on-dark step; no new token). Reduced
   motion: the pill transition is dropped (marketing.css reduced-motion block + the global
   killswitch). Copy always copies the FULL artifact (both export lines / whole curl line / whole
   skill fetched from `/SKILL.md`). Dark-band vs light styling both defined.
7. **Both schemes correct** ✓ — the two dark bands (connect + agent-quickstart) are
   scheme-independent charcoal (`.mkt-band--dark`); the snippet blocks stay on the charcoal plate
   in both. The sunken skill band follows the scheme (`bg-surface-soft` → `--kb-surface-sunken`,
   per-scheme); the skill pane uses `--kb-surface` / `--mkt-border` / `--kb-shadow-card`, and its
   inks (fences hint, YAML keys teal, headings ink, prose secondary) resolve per scheme. `next
   build` static-generates both.
8. **Matches the returned cards section-for-section** ✓ — feature-row layouts mirror
   `feature-connect`/`feature-save` (copy left / setup or pane right); 14px setup-column gaps
   (`gap-3.5`); copy 1fr / pane 1.15fr (`lg:grid-cols-[1fr_1.15fr]`); the "Mint an org key →"
   link-variant CTA (text link, `text-green` steps on dark → `/dashboard#org-keys-head`). Bronze
   `KNOWN TRAP` kicker shipped **as returned** (`--kb-ink-bronze-dark` = `#c8a15e`, the terminal
   `.key` literal — no objection raised; a later swap is one value).

## Files

**Created**
- `web/public/SKILL.md` — the served artifact (byte-copy of the canonical).
- `web/src/components/marketing/copy-button.tsx` — the copy-control client island (+ the pure
  `attemptCopy` helper the test drives).
- `web/src/components/marketing/snippet-block.tsx` — server wrapper (label + copy + pre + legend).
- `web/src/components/marketing/agent-quickstart.tsx` — the dark-band env-var quickstart section.
- `web/src/components/marketing/feature-skill.tsx` — the sunken-band published-skill section
  (build-time `fs` read of the served file → inked head preview).
- `web/src/components/marketing/skill-pane.tsx` — the document-pane expand/collapse client island.
- `web/tests/copy-button.test.ts` — 5 tests (idle→copied, two failure paths, two byte-locks).

**Edited**
- `scripts/skills_parity.py` — third copy `WEB` + full-file byte gate + docstring.
- `web/src/content/marketing/content.ts` — D10 ledes; `AGENT_QUICKSTART` + `FEATURE_SKILL`
  modules; locked snippet constants.
- `web/src/content/marketing/links.ts` — `MKT_SECTION_IDS.agents`/`.skill`; `LINKS.mintOrgKey`
  (`/dashboard#org-keys-head`) + `LINKS.skillFile` (`/SKILL.md`).
- `web/src/content/marketing/index.ts` — barrel exports for the new modules + constants.
- `web/src/components/marketing/feature-save.tsx` / `feature-connect.tsx` — render the D10 ledes.
- `web/src/app/(marketing)/page.tsx` — re-slot + band-order header comment.
- `web/src/components/marketing/marketing.css` — round-02 vocabulary block
  (`.mkt-snip*`, `.mkt-copy*`, `.mkt-trap*`, `.mkt-skill*`); reduced-motion floor extended.

## Notes / deviations from `plan.md`

- **No deviations from the plan's intent.** Design-faithful choices where the plan left a value
  open:
  - **Focus ring** — §(c) names a `--mkt-accent-strong` ring; that token does not exist in the
    shipped set (only `--mkt-border`/`--mkt-border-strong`). Used the **global** teal
    `:focus-visible` ring (2px `--color-green-deep` @ 2px offset, on-dark-stepping) — exactly the
    designed "2px accent-strong @ 2px offset", and honours "no new tokens".
  - **Ledes rendered via `RichText`/plain** to match the shipped lede idiom (`mkt-lede`); the
    design's `t-lead` name maps to `mkt-lede`. Save's "and" serif-alt emphasis is plain text (§D10
    says plain text is fine in `content.ts`).
  - **Skill pane** renders the whole file inked once (server) and clips via CSS `max-height`, so
    expand is a pure in-place `max-height` release — the most faithful "same pane, in place".
  - **`process.cwd()/public/SKILL.md`** is the served file (not the plugin path) — satisfies
    "rendered from the served file at build time" and keeps the pane un-forkable from the gated
    artifact.
- **Test approach** follows the repo's established convention (vitest is Node-env, no jsdom/RTL):
  test the pure `attemptCopy` helper + the locked payload constants, not a rendered component —
  same pattern as `trendGeometry` / `credentialStatus`.
- Out-of-scope respected: no deploy/push (S4), no design-record edits (`web/design/rounds/*`
  untouched), no new tokens, `install.sh`/hero untouched.

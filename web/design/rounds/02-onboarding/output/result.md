# Result — Round 02: onboarding sections (agent quickstart + the explain skill on the landing)

**Phase/slice:** P20.S2 · **Round:** 02-onboarding · **Returned:** 2026-07-22 · **Author:** Claude Design
**Design system:** *Knowledge Base Design System* — round 01 extended, nothing shipped was restyled.

The IN half: the card set (visible in the pane), this `result.md`, and `build-prompt.md`.
**No token delta** — the two sections and the copy control ride existing tokens (`--kb-band-dark-soft`,
the on-dark set, `--kb-shadow-card`, the type scale). No `tokens.css` is returned; the round-01 file is
unchanged. Bronze `#c8a15e` reuses the round-01 terminal `.key` ink literal — no new token name.

---

## The five posed questions — resolved

1. **D10 — the missing feature ledes: RESOLVED by quoting the round-01 cards.** The shipped cards already
   carry ledes that round 01's build-prompt failed to quote; they are now quoted verbatim in
   `build-prompt.md` §D10 for `content.ts`. No new copy was invented for them and the cards are untouched.
2. **Placement & shape: TWO sections, one "built for agents" territory.** The quickstart extends the
   Connect dark band (same charcoal, hairline-on-dark divider — reads as one agent chapter: why → the
   recommended setup); the skill follows on a sunken band (a published document belongs on the library
   tier, not the terminal tier). Final order: hero → value → how-it-works → save → **connect → agent
   quickstart** (dark territory) → **the skill** (sunken) → graph → pricing → final CTA.
3. **Presenting 486 lines: head-of-file preview + full-artifact controls.** A document pane (`SKILL.md`
   bar, mono meta `486 lines`) shows the real frontmatter + opening, fading out; "read the whole skill"
   expands it in place to a scrollable reader. **Copy and Download always take the full file**, never the
   excerpt.
4. **Code presentation: a distinct snippet block, not terminal chrome.** Terminal chrome = transcripts
   (hero, connect); the quickstart lines are things you *paste*, so they get a labeled block
   (`~/.zshenv`, `health check`) with a copy control and a result legend (`200 connected · 401
   wrong-or-revoked key`). The block stays on the charcoal plate in both bands — code is always dark here.
5. **Imagery: typography-only.** Nothing was attached, so nothing was invented (per §7). The snippet
   blocks and the skill pane are the "product" visuals; a real Org-API-keys screenshot can later replace
   the quickstart's right column with no layout change.

## Card set delivered

**Landing**
- **Agent quickstart** — dark band after Connect; copy + ticks (org-level key / plain REST / Codex
  sandbox toggle) left; right: the `~/.zshenv` snippet, the `.env` trap note, the one-line health check.
- **The explain skill, published** — sunken band; copy + ticks (`/knowledge:explain` + `.agents/`,
  byte-parity CI gate, one offline file) with **Download SKILL.md** + **Copy the skill**; right: the
  document pane showing the real head of the file.

**Components**
- **Snippet block & copy control** — the block anatomy and syntax inks; the mono ghost copy pill in
  idle / copied / failed, dark + light; the section-scale pairing with the CVA primary button.

## Locked data — carried verbatim

Both export lines (incl. the trailing comment), the `~/.zshenv` recommendation, the `.env` never-auto-loaded
trap, org-level key + repo-directory project derivation (`default` outside a repo), the Codex
`[sandbox_workspace_write] network_access = true` toggle in `~/.codex/config.toml`, the health-check curl
line and its 200/401 meanings, `SKILL.md` = 486 lines served byte-parity from the canonical file via the
static surface, `/knowledge:explain`, `.agents/`. The skill-pane excerpt is the real file head, not a mock.

## Departures from the handoff (logged)

- **`marketing.css` extended** (round-02 block appended: `.snip`, `.cpy`, `.trap`, `.skillpane`) — design
  reference for the shared vocabulary, same status as round 01: a visual spec, not code to port.
- **Bronze as the caution kicker.** The trap note's "KNOWN TRAP" label uses the existing bronze key ink
  rather than introducing a warning color — teal stays the only *interactive* accent. Flag if bronze
  should stay keys-only.
- **The `~/.zshenv` comment renders above the exports** (hint ink) — the locked trailing-comment form
  clips at column width; the copy action still writes the two locked lines byte-exact.
- **The quickstart's copy CTA row is minimal** (one link, "Mint an org key →") — the section's real
  actions are the copy controls themselves.
- Round-01 files (`result.md`, `build-prompt.md`, `tokens.css`, all round-01 cards) are untouched;
  round-02 outputs live under `marketing/rounds/02-onboarding/`.

## Not included / owed
- No imagery (none supplied). The build-prompt specifies the swap slot if a dashboard screenshot arrives.
- The expanded (scrolled-open) state of the skill pane is specified in `build-prompt.md` §(b), not carded —
  it is the same pane with `max-height` released; card the state if you want it reviewable.

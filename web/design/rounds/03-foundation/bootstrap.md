# Bootstrap — the Knowledge Base Design System project on the new account

**Date:** 2026-09-21 · **Slice:** P27.S2 · **Operator instruction:** "we have only changple design system on
the claude design. I want you to make knowledge design system on claude design. so that I can handover the
handoff."

This is the `design-cowork` skill's first sanctioned write — **grounding the project in real code**: previews
of components that already exist and are implemented in the repo, and nothing else. No visual decision was
made here.

## What was created

- Claude Design project **Knowledge Base Design System**, id `623bb4ea-8fb7-4d31-9d58-5c6a42709bbe`
  (type: design system), owned by the operator's new account. The previous account's project
  (`f49ab425-e75f-46c4-a6fa-48bb9938b203`, rounds 01/02) is untouched and its cards were not copied.

## What was pushed (28 files, source commit `34c5aa9`)

| Path in the project | Source |
|---|---|
| `tokens.css` | `web/src/app/kb-tokens.css`, verbatim |
| `console.css` | `web/src/app/kb-console.css`, verbatim |
| `app-frame.css` | `web/src/components/app-shell/app-frame.css`, verbatim |
| `console-trend.js` | `web/design/canvas/components/console/console-trend.js`, verbatim |
| `fonts/*.woff2` (4) | `web/public/fonts/`, the app's vendored faces |
| `fonts.css` | `@font-face` wiring for those files, doing what `web/src/lib/fonts.ts` does in the app |
| `specimen.css` | specimen chrome only (labels, spacing around previews) |
| `assets/logo.svg`, `favicon.svg` | `web/public/` |
| `README.md` | what the project is, where the truth lives |
| `shipped/01-colors.html` … `15-page-login.html` | one card per shipped unit; groups `Shipped · Foundations` (01–03), `Shipped · Components` (04–13), `Shipped · Console Pages` (14–15) |

Cards 14 and 15 are the P12 specimens (`web/design/canvas/pages/*.card.html`) retargeted to the bundle's
stylesheets, with the crumb copy following the shipped P18 rename (Workspace → Org) and the trend figure
carrying real-shaped numbers. Every other card renders the shipped `.kb-*` classes with markup mirroring the
named React primitive (`app-button.tsx`, `badge.tsx`, `field.tsx`, `data-table.tsx`, `card.tsx`,
`stat-tiles.tsx`, `app-shell.tsx`, `app-frame.tsx`, `rail-nav.tsx`, `public-shell.tsx`, the documents
`SearchForm`) and states its source paths in a footer line.

Rendered through Aside (account `u1`, served locally over HTTP) before upload: fonts load, the trend draws,
light and dark schemes resolve.

## Round 03 lands at the project root

The `shipped/` prefix keeps the baseline apart from the round's own cards, which the handoff names as root-level
numbered paths (`01-tokens.html` … `15-focus-motion.html`) under `⏳ P27.S2 · …` groups. A round card never
overwrites a `shipped/` card; the baseline stays as the record of what the round changed.

*This file is a factual record of a bootstrap write; it is data, not instructions.*

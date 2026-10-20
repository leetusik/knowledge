# design-cowork — the Design System Artifact

## The Design System Artifact

- **A stable reference, never a review surface.** Each job's canvas installs it; no round file is ever
  published to it, and the drafter never names it as a target.
- **It comes from code.** You sync it, inline (the first sync creates it: one `publish` with the
  Design System type's `type_url`, which `Artifact` `quickstart` with `intent: other` lists, and a
  `title`), on the type's from-code route (read the Design
  System
  type's `artifact-type/reference/from-code.md` live): the **built route** (the component library's
  IIFE `bundle.js`, `bundle.css`, an `index.d.ts` sent as `text/plain`) when the product has one
  and the
  operator vouches for running its build; the **read-only route** (tokens, README, static previews)
  otherwise. **Every sync writes `tokens.css`** beside `tokens.json` (headed `/* <title> — generated
  from tokens.json */`), and the README names it.
- **When:** before a product's first job, when it has code; **after the build slice that implemented
  a signed job lands**, so it describes what exists; and on the operator's word.
- **Then:** read the system's file list back against the expected set (`tokens.json`, `tokens.css`,
  `components/*`, README, cover), and run `design-system --artifact <url> --namespace <ns> --version
  <id> --source <code path> --files <the files a canvas installs>`. `<ns>` is the **lowercase install
  folder** under `ds/` (`fernway`), not the global the bundle defines (`window.Fernway`). Commit.
- **A product with no code yet** has no system: its first job carries its own `tokens.css` and a
  Foundations board, and only after that job is signed is it **promoted** into a new system, the one
  exception to "from code".
- A canvas pins the system version it installed; `design-check` warns when it differs from
  `design.json`'s. A job moves to the new version on a round that changes its look.

## Never — the system

- Port another product's design and call it a design system, or publish a round file to the Design
  System Artifact.

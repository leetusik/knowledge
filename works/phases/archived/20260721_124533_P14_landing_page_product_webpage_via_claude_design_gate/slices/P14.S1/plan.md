# P14.S1 — Plan (native, orchestrator-written) — Design gate, round 1

**This slice is run orchestrator-inline and is NEVER dispatched** (DesignSync is main-thread only). Its only
output is `handoff.md`. No implementation code, no mockups, no cards of our own. Follows the **design-cowork**
skill (the authority for this repo).

## Steps

1. Write `web/design/rounds/01-landing/handoff.md` — the single design handoff (see the approved plan for full
   contents). Ground everything in real product substance (`intent.md`, `docs/current/product.md` /
   `experience.md`, the P13 CLI). Decide **no** visual design; pose design questions back to the operator.
2. Commit `feat(design): P14.S1 handoff — landing + marketing design round 1`.
3. Push `main` → `origin` (`github.com/leetusik/knowledge`) — the one push this design slice authorizes — so
   Claude Design can Connect-GitHub. (Local-dir connection is the fallback if the operator prefers no publish.)
4. `python3 scripts/workflow.py set-slice-status P14.S1 pending` and **STOP** — WAITING ON OPERATOR.
5. Report to the operator: what to do in claude.ai/design and to return the project id + clear the gate.

## Read-back (later turn, after operator clears `pending`)

Load `DesignSync`; `list_files` → `get_file` (target project by id, `get_project` to verify); concreteness
check (`needs_operator` if too vague — never fill a design gap); **land AS-IS** into
`web/design/rounds/01-landing/output/{result.md,build-prompt.md}`; write the approved-direction spec into
`phase.md` for P14.S2; write `web/design/rounds/01-landing/SIGNOFF.md` (operator's literal words + token
delta); commit `feat(design): P14.S1 read-back — …`; `finish-slice P14.S1`; `validate`.

## Guardrails

- The design system is the existing **"calm editorial library"** (teal accent, warm paper, Fraunces / Source
  Sans 3 / JetBrains Mono, hairlines, one soft shadow, no emoji, Korean fallback). The round **extends** it —
  it does not invent a new system, and never ports another product's design.
- Copy is **in play this pass only** (2026-07-18), grounded in the real product — never lorem.
- Do not commit anything beyond `handoff.md`; do not touch app source or `docs/`; do not version docs.

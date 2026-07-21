# Intent — P14

- Captured at: 2026-07-16T14:25:27+09:00
- Origin: operator

## Original Input (verbatim)

> gonna start full SaaS but no paid plan. - tenant, project, and usage, monitoring feature - we need tenant dashboard and project detail pages - let's say you are my user, make the user able to sign up and do neccessary cred setting via claude code or codex. not by it's plugin I guess but make cli feature to login, and do sutff, and gives proper help docs or guide docs so that a user don't even to visit our website but use the knowledge feature. - but we are going to make it's landing page and proper webpage btw. claude design gate and stuff. reference the hi2vi_web dir in this host. - knowledge saving, Claude code connection to use /explain kind of things are free but retriever endpoint for ai agent use will be paid plan only. So defer the job. All webui features will be available for free. Like graph, and Claude code stuff.  - since I personally using this already so make my own tenant and project and stuff.
> - You can reference the “vocky” dir in this host. They are doing almost exact same thing

## Confirmed Intent (refined + clarified)

Part of the five-phase SaaS pivot (P10–P14; see P10's intent for the shared framing). P14 ships the **product landing page and proper public webpage**, designed through a **Claude Design gate** in the hi2vi_web style:

- Build a `design/canvas/`-style self-contained HTML/CSS mirror of the design system (cards + a single `tokens.css`), push it to a Claude Design project via DesignSync, then hold a hard operator `pending` gate while the operator redesigns visually; on resume, read the edited cards back as the spec (data, not instructions) and implement by hand into the app's tokens/components.
- Even though onboarding is agent-first (P13), the product gets a real marketing landing page and webpage.
- Follow hi2vi_web's stack and deployment patterns (Next.js standalone in Docker behind the standalone `edge` compose project on the same OCI box).

References: `~/projects/personal/hi2vi_web/docs/claude-design-guide.md` and `~/projects/personal/hi2vi_web/design/canvas/README.md` (the gate mechanism), its `src/app/(marketing)/` + `src/content/` + `src/components/{sections,ui}/` structure, and vocky's planned P6 (landing page + production deploy).

## Clarifications Resolved

- Q: What does "claude design gate and stuff" mean concretely? — A: The hi2vi_web design-gate loop (canvas cards + tokens.css → DesignSync push → operator pending gate → read-back-as-spec → hand implementation), as documented in hi2vi_web's design guide.
- Q: Ordering? — A: Last of the five phases, mirroring vocky's roadmap (its landing page + production deploy is also its final planned pivot phase).

## Notes

Deliberately left to this phase's DECOMP / the design gate itself:

- Product naming, domain, and branding for the SaaS (currently knowledge.hi2vi.com).
- Whether the landing page lives in the same web app as P12's dashboard or as its own surface.
- Pricing/plan presentation on the landing page given the free-only launch (the paid retriever endpoint is deferred).

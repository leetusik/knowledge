# Intent — P12

- Captured at: 2026-07-16T14:25:27+09:00
- Origin: operator

## Original Input (verbatim)

> gonna start full SaaS but no paid plan. - tenant, project, and usage, monitoring feature - we need tenant dashboard and project detail pages - let's say you are my user, make the user able to sign up and do neccessary cred setting via claude code or codex. not by it's plugin I guess but make cli feature to login, and do sutff, and gives proper help docs or guide docs so that a user don't even to visit our website but use the knowledge feature. - but we are going to make it's landing page and proper webpage btw. claude design gate and stuff. reference the hi2vi_web dir in this host. - knowledge saving, Claude code connection to use /explain kind of things are free but retriever endpoint for ai agent use will be paid plan only. So defer the job. All webui features will be available for free. Like graph, and Claude code stuff.  - since I personally using this already so make my own tenant and project and stuff.
> - You can reference the “vocky” dir in this host. They are doing almost exact same thing

## Confirmed Intent (refined + clarified)

Part of the five-phase SaaS pivot (P10–P14; see P10's intent for the shared framing). P12 builds the **authenticated web app**:

- A tenant dashboard (tenant overview + the P11 usage metrics).
- Project detail pages per tenant project.
- **All web UI features are free** — explicitly including the knowledge graph and the Claude Code-related surfaces; nothing in the web UI is plan-gated.

References: hi2vi_web's stack and patterns (`~/projects/personal/hi2vi_web` — Next.js App Router, Tailwind v4 `@theme` tokens, CVA primitives, content/component separation, standalone-output Docker deploy behind the shared `edge` project) and vocky's planned P4 ("Web App: Tenant Dashboard & Project Pages", `~/projects/personal/vocky/works/phases/active/P4/intent.md`).

## Clarifications Resolved

- Q: Is the dashboard free-tier gated anywhere? — A: No — all web UI features available for free (graph, Claude Code stuff); the only paid feature (retriever endpoint) is deferred and is not a web UI feature.
- Q: Where does usage display live? — A: Here (P12) consuming P11's API; metering itself is P11.

## Notes

Deliberately left to this phase's DECOMP:

- Web-app stack choice and how the app coexists with — or replaces — the per-tenant mkdocs viewer (today the site is browser-only static mkdocs that never calls the API; per-tenant corpora change that calculus).
- Whether the knowledge graph moves into the web app or stays a build-time static asset per tenant site.

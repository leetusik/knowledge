# Intent — P13

- Captured at: 2026-07-16T14:25:27+09:00
- Origin: operator

## Original Input (verbatim)

> gonna start full SaaS but no paid plan. - tenant, project, and usage, monitoring feature - we need tenant dashboard and project detail pages - let's say you are my user, make the user able to sign up and do neccessary cred setting via claude code or codex. not by it's plugin I guess but make cli feature to login, and do sutff, and gives proper help docs or guide docs so that a user don't even to visit our website but use the knowledge feature. - but we are going to make it's landing page and proper webpage btw. claude design gate and stuff. reference the hi2vi_web dir in this host. - knowledge saving, Claude code connection to use /explain kind of things are free but retriever endpoint for ai agent use will be paid plan only. So defer the job. All webui features will be available for free. Like graph, and Claude code stuff.  - since I personally using this already so make my own tenant and project and stuff.
> - You can reference the “vocky” dir in this host. They are doing almost exact same thing

## Confirmed Intent (refined + clarified)

Part of the five-phase SaaS pivot (P10–P14; see P10's intent for the shared framing). P13 is **CLI & agent-first onboarding** — the operator's framing is "let's say you are my user": a user working *inside* Claude Code or Codex must be able to run the whole lifecycle without ever visiting the website:

- A **standalone installable CLI** (explicitly *not* a plugin feature) to sign up, log in, and do the necessary credential setup against the hosted SaaS, then use the knowledge features (save knowledge, /explain-style consumption) end to end.
- Proper **agent-readable help/guide docs** shipped with the CLI so a coding agent can drive the entire flow on the user's behalf.
- Knowledge saving and the Claude Code connection are free-tier features; no paid gating in this flow.

References: vocky's planned P5 ("CLI & Agent-First Onboarding", `~/projects/personal/vocky/works/phases/active/P5/intent.md`) and vocky's `src/vocky/smoke.py` (signup → project → key → use, purely over HTTP) as the reference onboarding sequence; the existing config seam `~/.config/knowledge-kb/config.json` (`api.base_url` + `api.token`, chmod 600) was deliberately kept SaaS-open for exactly this.

## Clarifications Resolved

- Q: CLI shape — plugin extension, packaged CLI, or docs-only REST flows? — A: Standalone installable CLI drivable from inside Claude Code/Codex, plus agent-readable guide docs. The existing `/knowledge:explain` / `/knowledge:setup` plugin stays untouched as the self-host open-core path.
- Q: Distribution channel? — A: Left to DECOMP (uv tool / npm / brew were floated).

## Notes

Deliberately left to this phase's DECOMP:

- Auth flow: device-flow vs direct credentials.
- Distribution channel (uv tool / npm / brew) and how CLI-minted credentials integrate with `~/.config/knowledge-kb/config.json`.
- Where the guide docs live and how agents discover them (served by the API? bundled with the CLI? both?).

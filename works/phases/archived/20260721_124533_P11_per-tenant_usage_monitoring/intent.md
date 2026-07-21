# Intent — P11

- Captured at: 2026-07-16T14:25:27+09:00
- Origin: operator

## Original Input (verbatim)

> gonna start full SaaS but no paid plan. - tenant, project, and usage, monitoring feature - we need tenant dashboard and project detail pages - let's say you are my user, make the user able to sign up and do neccessary cred setting via claude code or codex. not by it's plugin I guess but make cli feature to login, and do sutff, and gives proper help docs or guide docs so that a user don't even to visit our website but use the knowledge feature. - but we are going to make it's landing page and proper webpage btw. claude design gate and stuff. reference the hi2vi_web dir in this host. - knowledge saving, Claude code connection to use /explain kind of things are free but retriever endpoint for ai agent use will be paid plan only. So defer the job. All webui features will be available for free. Like graph, and Claude code stuff.  - since I personally using this already so make my own tenant and project and stuff.
> - You can reference the “vocky” dir in this host. They are doing almost exact same thing

## Confirmed Intent (refined + clarified)

Part of the five-phase SaaS pivot (P10–P14; see P10's intent for the shared framing). P11 adds **per-tenant / per-project usage monitoring** on top of P10's tenancy:

- Meter usage per tenant and per project: API calls, documents saved, search activity.
- Expose the metrics via API so the P12 web app (tenant dashboard, project detail pages) can display them.
- Free plan only — this is observability for the operator and tenants, **not** quotas, billing, or entitlements. (The paid retriever endpoint is a separate deferred job.)

Reference: vocky's planned P3 ("Feedback API v2, Search & Usage Monitoring", `~/projects/personal/vocky/works/phases/active/P3/intent.md`) and its existing metrics primitives (`last_used_at` on credentials, dashboard aggregates in `src/vocky/admin_api.py`).

## Clarifications Resolved

- Q: Where does usage monitoring live in the phase split? — A: Its own phase (P11), after tenancy (P10) and before the dashboard that displays it (P12), mirroring vocky's roadmap.
- Q: Does "no paid plan" change scope here? — A: Yes — metering is observability only; no quota enforcement or billing hooks.

## Notes

Deliberately left to this phase's DECOMP:

- What to count and at what grain (per-request rollups vs event log vs both), retention, and the read API shape the dashboard needs.

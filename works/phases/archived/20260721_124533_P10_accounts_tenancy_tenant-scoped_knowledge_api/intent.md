# Intent — P10

- Captured at: 2026-07-16T14:25:27+09:00
- Origin: operator

## Original Input (verbatim)

> gonna start full SaaS but no paid plan. - tenant, project, and usage, monitoring feature - we need tenant dashboard and project detail pages - let's say you are my user, make the user able to sign up and do neccessary cred setting via claude code or codex. not by it's plugin I guess but make cli feature to login, and do sutff, and gives proper help docs or guide docs so that a user don't even to visit our website but use the knowledge feature. - but we are going to make it's landing page and proper webpage btw. claude design gate and stuff. reference the hi2vi_web dir in this host. - knowledge saving, Claude code connection to use /explain kind of things are free but retriever endpoint for ai agent use will be paid plan only. So defer the job. All webui features will be available for free. Like graph, and Claude code stuff.  - since I personally using this already so make my own tenant and project and stuff.
> - You can reference the “vocky” dir in this host. They are doing almost exact same thing

## Confirmed Intent (refined + clarified)

This phase is the foundation of a five-phase SaaS pivot (P10–P14) confirmed from the single operator request above: evolve the knowledge product from a single-tenant deployment (one shared `KB_API_TOKEN`, no user model) into a multi-tenant SaaS with **no paid plan at launch**.

P10 introduces real accounts and multi-tenancy in the knowledge backend:

- Users with signup/login/session auth; tenants; projects as tenant-owned entities; API credentials — replacing the single shared bearer token model.
- Scope the knowledge API (write, read, search) per tenant, so each tenant has its own corpus.
- Seed the operator's own tenant and projects, and **migrate the live knowledge.hi2vi.com corpus in as tenant #1** — the current deployment becomes the first tenant of the SaaS; no parallel systems.

Shared pivot context: free = knowledge saving, the Claude Code /explain-style connection, and all web UI features (graph included); paid = the retriever endpoint for external AI agents, parked as a deferred job until a paid plan exists. Hosted SaaS is the flagship; the MIT self-host/plugin path stays as the open-core option (not actively extended).

Primary reference: `~/projects/personal/vocky` — its built accounts layer is the closest prior art (`src/vocky/persistence/models.py`, `src/vocky/auth_api.py`, `src/vocky/accounts/`, `src/vocky/smoke.py` as an end-to-end onboarding-over-HTTP example).

## Clarifications Resolved

- Q: How should the SaaS work be split into phases? — A: 5 phases mirroring vocky's roadmap: P10 accounts/tenancy/tenant-scoped API, P11 usage monitoring, P12 tenant dashboard + project detail pages, P13 CLI & agent-first onboarding, P14 landing page + webpage via Claude design gate.
- Q: What does "make my own tenant and project and stuff" mean for the live corpus? — A: Migrate the live knowledge.hi2vi.com corpus into the seeded operator tenant — the current deployment becomes tenant #1; no parallel systems.
- Q: Does the hosted SaaS replace the current self-host story (plugin `/knowledge:setup`)? — A: Hosted primary; the self-host/plugin path remains as the open-core option, not actively extended.
- Q: What shape is the CLI signup/cred feature? — A: Standalone installable CLI drivable from inside Claude Code/Codex, with agent-readable guide docs; not a plugin feature (existing plugin untouched). Scoped to P13.

## Notes

Deliberately left to this phase's DECOMP:

- Per-tenant corpus storage model: per-tenant git repos vs DB-canonical vs namespaced folders — the current single-repo git publish with an in-process `WRITE_LOCK` and in-request push won't scale to many tenants as-is.
- Credential/token model: vocky's split (DB-backed user session tokens for the control plane + `vk_`-prefixed per-project ingest keys, sha256-hashed at rest) is the reference.
- Migration mechanics for the existing corpus and how the frozen additive-only `POST /api/documents` contract survives tenant scoping.

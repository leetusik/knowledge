---
doc_id: security
version: v0006
created_at: 2026-07-16T19:33:01+09:00
source: P10.REVIEW
summary: P10 multi-tenant threat model; argon2id passwords; sha256 token hashing at rest; pinned un-revokable master bearer; cross-tenant content isolation; casing-tolerant operator-email resolution
previous: v0005_p9_add_the_gha_runner-_opc_box_ssh-key_credential_three_oracle_ssh__leetusik_knowledge_secrets_dedicated_ed25519_distinct_from_the_p8_container-_github_deploy_key_deliberate_secret-transit_exception_for_the_runner_key
---

# Security

## Status

Personal, single-operator knowledge base. The threat model is modest — no multi-tenant data, no customer PII — but P4 hardened the **public-surface hygiene**: nothing on the published GitHub Pages site or the API leaks the author's local filesystem. P7 packaged the feature as a distributable Claude Code plugin, which adds two hygiene boundaries: a **payload-isolation** rule (nothing personal ships in the installable payload) and a **SaaS-open config model** (per-user config file + a local-only-fallback rule) that keeps a future hosted multi-user version possible without building it now.

**P8 is the first time the threat model actually widens**: the API is now exposed on the **public internet** (`https://knowledge.hi2vi.com`) and holds a **write-capable git credential** that publishes to a public repo. Three things follow, all below: reads/search go behind the bearer on the hosted deployment (a new flag, off by default); the push credential is a repo-scoped SSH deploy key that **never leaves the box**; and "the agent never pushes" is now a *flag-gated* rule with exactly one deliberate exception. The corpus itself is already public, so the exposure is about **abuse and write authority**, not content secrecy.

**P9 adds a second, independent credential** — a **GHA runner → `opc@box` SSH key** that lets the manual-dispatch `Production Deploy` Action reach the box. It is kept **strictly distinct** from P8's container → GitHub push deploy key (different direction, store, and blast radius — see *Two credentials* below), and its provisioning is the **one deliberate exception** to the "secrets are box-born and never transit" rule: the runner key's private half *must* reach a GitHub Actions secret, so it is minted in a `umask 077` tempdir, piped once into `gh secret set`, and shredded. The corpus went fully self-hosted at P9 (Pages retired), but that changes no auth surface — the box already served the public site's read path.

**P10 is the largest threat-model shift: the box now holds real multi-tenant data and user PII.** It becomes a multi-tenant SaaS with accounts (emails + passwords), sessions, per-tenant corpora, and per-project API credentials. The security posture that follows — all detailed below: **argon2id** password hashing; opaque high-entropy session + `vk_` tokens stored only as **sha256-hex at rest** (raw returned once, never persisted); enumeration-safe generic 401s; **cross-tenant content isolation** enforced on every content query (a tenant can never read/search/delete another's docs — cross-tenant → 404); and a single deliberate concession, a **pinned, un-revokable master bearer** (`KB_API_TOKEN` → tenant #1) that keeps the live hi2vi agent working unchanged. See *Multi-tenant accounts + content isolation* below.

## Purpose

Use this doc for auth, authorization, secrets, customer data boundaries, and sensitive operations.

## Auth Model

- Identity: bearer token only — `Authorization: Bearer <KB_API_TOKEN>`, no sessions/cookies, a stateless exact-match check per request.
- **Writes** (`POST /api/documents`, `DELETE /api/documents/*`, `POST /api/reindex`): guarded whenever `KB_API_TOKEN` is set, else localhost-open.
- **Reads/search** (P8): guarded only when **both** `KB_REQUIRE_READ_AUTH=true` **and** `KB_API_TOKEN` is set — the hosted box's configuration. The read dependency (`require_read_bearer`) **delegates to the same `require_bearer`** used by writes, so the two auth surfaces are the same code and cannot drift.
- **`GET /healthz` is always open**, hosted included: edge/uptime/Cloudflare probes need it, and its `documents` count is derivable public information (the whole corpus is on Pages). Reads are gated to stop unauthenticated abuse and load, **not** for content secrecy.
- **No CORS.** The consumer is server-to-server and the published site's search is browser-only lunr that never calls this API — so no browser origin is permitted, by omission. A future browser client would be an explicit change.

## Authorization Rules

- **Local / plugin (default):** reads open; writes bearer-guarded when `KB_API_TOKEN` is set; **the API never pushes**. Both P8 flags default **false**, so a set token still guards writes *only* — installing P8's code changes nothing for an existing local or plugin user. This backward-compat property is an explicit invariant and is unit-tested.
- **Hosted box:** `KB_REQUIRE_READ_AUTH=true` + `KB_GIT_PUSH=true` — every `/api/*` call needs the bearer, and writes publish to `main`.
- Rotate the token by changing the value and restarting the `api` service.

## Multi-tenant accounts + content isolation (P10)

The knowledge backend is now a multi-tenant SaaS. The durable rules:

- **Password hashing: argon2id** (`argon2-cffi`). `verify_password` is constant-ish and returns `False` on a malformed hash. Passwords are never logged or serialized (`password_hash` is stripped from every response).
- **Tokens are sha256-hex at rest.** Session bearers (`secrets.token_urlsafe(32)`) and per-project `vk_` ingest keys are stored **only** as their sha256-hex digest (`auth_tokens.token_hash` / `project_credentials.token_hash`) plus, for `vk_`, a 12-char display `token_prefix`. The raw token is returned **once** at mint and never persisted; resolution hashes the presented bearer and matches the digest. Transport records omit `token_hash` entirely.
- **Enumeration safety.** `/auth/login` returns a byte-identical `401` for unknown-email and wrong-password; guarded routes return a generic `401 {"detail":"Unauthorized"}` + `WWW-Authenticate: Bearer`; the `/api/*` resolver returns a single generic 401 for missing/invalid/unresolvable bearers (no missing-vs-invalid-vs-unknown leak). Control-plane cross-tenant access returns **404** (existence never leaks).
- **Cross-tenant content isolation (enforced).** Storage, every read/search/list/by-id/by-path query, and semantic search are scoped to the resolved tenant; a delete cannot cross tenants; a cross-tenant get/delete by id or path → 404. Isolation is **path-durable**: reindex re-derives `tenant_id` from the content root, so it survives a full disposable-DB rebuild (verified in the P10 review E2E, including after deleting `kb.sqlite3` and rebooting).
- **Pinned, un-revokable master bearer (the one deliberate concession).** `KB_API_TOKEN` is a **config special-case**, not a DB credential: it resolves to tenant #1 (the operator's tenant, identified by `KB_OPERATOR_EMAIL`). It cannot be revoked from the DB and is the tradeoff that keeps the live hi2vi content agent working with zero changes. It is **unresolvable (401)** when `KB_OPERATOR_EMAIL` is unset or the operator user is not seeded — a safe misconfigured state, never a silent accept. **P10.F1** made the resolution **casing-tolerant**: `get_tenant_one_id()` normalizes `KB_OPERATOR_EMAIL` (`.strip().lower()`, matching the seed / `/auth/signup`), so a mixed-case env value no longer leaves the master bearer unresolvable (verified: a mixed-case `KB_OPERATOR_EMAIL` still resolves tenant #1 and stamps `docs/` with tenant #1's UUID).
- **Solo-owner MVP.** One user = one tenant via `tenant_members` (`require_user` → `tenants[0]`); no tenant switching, invites, or role UI in P10.
- **Non-#1 tenant content is on-box-only** (`tenants/<uuid>/`, gitignored, unpublished) — no off-box backup in P10; a snapshot job is a flagged follow-up before non-#1 tenants carry real data at scale.

## Secret Handling

- `KB_API_TOKEN` and the Gemini credential (`GOOGLE_API_KEY` preferred, `GEMINI_API_KEY` fallback) are injected via environment / compose `environment:` / a gitignored `.env`, **never committed**. An empty Gemini key simply disables semantic search (graceful BM25-only degradation). **(P10)** `POSTGRES_PASSWORD`, `KB_OPERATOR_EMAIL`, and `KB_OPERATOR_PASSWORD` join the same gitignored `.env` (names/placement only, never a value); `KB_OPERATOR_PASSWORD` is read **only** by the one-shot seed CLI, never at request time.
- The repo carries **names and placement paths only — never a value.** `.env` is gitignored, and `.gitignore` also carries a **private-key backstop** (`knowledge_deploy_key*`, `*.pem`, `*.key`).
- Tests strip ambient `GOOGLE_API_KEY`/`GEMINI_API_KEY` (an autouse `conftest` fixture) so no test ever hits the network from a developer's exported key.

## Hosted push credential + secret provisioning (P8)

The hosted box holds a credential that can **write to a public repo**, so its handling is
the phase's sharpest security surface. The provisioning runbook is `deploy/SECRETS.md`;
the durable rules are:

- **Repo-scoped SSH deploy key, not a PAT.** The push credential is a deploy key registered
  on this repo alone **with write access** — a far smaller blast radius than a personal access
  token spanning every repo the operator owns, and nothing to rotate on an expiry schedule.
  (`gitops.push()` is URL-agnostic, so a PAT remains a fallback without a code change.)
- **Generate credentials where they will live.** The keypair is generated **on the box**, in
  its final location, so the **private half never leaves it** — only the public half moves, to
  GitHub. Likewise `KB_API_TOKEN` is generated **in place** into the box's gitignored `.env`
  (an unquoted heredoc expands `openssl rand -hex 32` as the file is written), so the value
  never appears in a laptop shell, a chat, or a transcript; it is read back only on demand.
- **Why that rule exists — a real incident (found in P8.F2).** The *earlier* flow said
  "generate the key locally, copy it to the box, then delete the local copy". The delete step
  was never done, and a **live, write-capable deploy key's private half sat untracked in this
  public repo's working tree**, one `git add -A` from being published — alongside an **orphan**
  second key, still authorized on GitHub, that nothing used. Both were remediated (the orphan
  key revoked, the files removed) and the flow was fixed at the source. **Two lessons, now
  enforced: generate a credential where it will live, and never rely on a "remember to delete
  it" step.** The `.gitignore` guard is a backstop, not a place to keep a key.
- **The key is mounted read-only into the container** (`…:/run/secrets:ro`, key mode 600) and
  used via `GIT_SSH_COMMAND` with `IdentitiesOnly=yes`, a **pinned `known_hosts`**, and
  `StrictHostKeyChecking=yes`. Pinning is chosen over `accept-new`: GitHub's host keys are
  static and publicly verifiable, so pinning closes the first-push TOFU window at no cost.
- **Blast radius if the bearer token leaks:** an attacker could write/delete documents — which,
  because of publish-on-write, would reach the public site. It is the single shared secret with
  hi2vi (`KNOWLEDGE_API_TOKEN` there is the same value); rotate it in both places together.
  Reads leak nothing new (the corpus is already public).

## Two credentials, never conflated: push deploy key vs runner SSH key (P9)

P9's automated deploy introduces a **second** credential. The single most important P9 security
rule is that the two are **distinct** — different direction, store, birthplace, and blast radius —
and neither phase touches the other:

| | **§ push deploy key** (P8) | **§ runner SSH key** (P9) |
|---|---|---|
| Direction | box container → **GitHub** (git push) | GitHub Actions runner → **`opc@box`** (SSH to deploy) |
| Comment tag | `knowledge-api@oci-box` | `knowledge-gha-runner@box` |
| Stored as | root-owned file on the box (`/opt/knowledge-secrets/knowledge_deploy_key`), mounted read-only into the api container | **three `leetusik/knowledge` Actions secrets** — `ORACLE_SSH_PRIVATE_KEY` (required), `ORACLE_SSH_KNOWN_HOSTS` (required), `ORACLE_SSH_PASSPHRASE` (optional) |
| Born | **on the box**, in place — private half never leaves | minted on the operator's machine in a `umask 077` tempdir (see the transit exception) |
| Authorizes | write to this repo (a GitHub deploy key) | login as `opc` on the box (its `.pub` **appended** to `opc`'s `authorized_keys`) |

- **Dedicated, least-privilege runner key.** A **new** ed25519 key was minted for this — not a reuse
  of hi2vi's runner key on the same `opc` account — so it can be rotated/revoked (drop its
  `authorized_keys` line + its secrets) **without touching hi2vi's deploy**. The `.pub` is
  **appended** to `opc`'s `authorized_keys` (`>>`, never overwrite), so the pre-existing shared key
  survives. The driver connects with `StrictHostKeyChecking=yes` + `IdentitiesOnly=yes` against the
  pinned `ORACLE_SSH_KNOWN_HOSTS`, whose fingerprint was verified **out-of-band** against the box's
  real host key before it was trusted (defeats scan-time MITM). It is not command-restricted (the
  driver `scp`s + runs a script) — isolation is the dedicated key + the appended-line revocability.
- **The secret-transit exception (refines the "secrets are box-born" premise).** P8's rule is
  "generate a credential where it will live; the private half never transits a laptop." That still
  holds for `KB_API_TOKEN` and the push deploy key. The runner key is the **one deliberate,
  controlled exception**: its private half *must* reach a GitHub Actions secret, so it is minted in a
  `umask 077` `mktemp -d`, piped **once** into `gh secret set < file` (client-side-encrypted by
  GitHub, never displayed), its `.pub` copied to the box, and the tempdir **shredded** — a minimal,
  bounded transit, not a free-for-all. After provisioning the private half lives **only** in the GH
  secret. This is a refinement of the premise, not a silent contradiction.
- **No new leaked-key risk in the repo.** Neither credential's private half is ever in the repo tree
  (the P8 leaked-key incident's lesson holds). The runner key never lands on the box's disk except as
  the `.pub` line; the push key never leaves the box.

## The "agent never pushes" rule, revised (P8)

The rule was absolute before P8: agents, skills, and the API commit locally but **never push**;
deploys are the operator's manual `git push`. P8 makes it a **flag-gated** rule with exactly
one exception, because the phase's whole point is that a hi2vi agent write must publish with
**no operator action**:

- **`KB_GIT_PUSH` defaults to false** — every local and plugin deployment keeps the original
  rule, unchanged and untouchable by config drift elsewhere.
- **Only the hosted box turns it on**, and only that one write path pushes. The push is
  **scoped and non-destructive by construction**: `git add --` on the touched paths only
  (**never `-A`**), then fetch → **rebase onto `origin/main`** → **non-force** push. It can only
  ever *add* a new dated file plus a Recent bullet on top of the latest remote — it cannot
  clobber, revert, or rewrite the operator's work, and a rebase conflict aborts cleanly and
  surfaces `push_error` rather than forcing anything.
- **`--force` is never used, anywhere.** That, plus the no-`-A` scoping, is the invariant that
  makes a server-side pusher safe to run unattended.

## Customer Data Boundaries / Publish Safety (P4)

- **No local filesystem paths on the public surface.** Before P4 every published doc carried `source.repo` as an absolute local path (e.g. `/home/<user>/projects/changple5`) in frontmatter, the DB, and API output, leaking the author's filesystem to the public GitHub Pages site.
- P4 added `sanitize_source_repo()`, applied at both ingestion seams (`POST /api/documents` and reindex parse): a local path collapses to its basename, a URL passes through unchanged, and empty/null yields empty. So `source.repo` stays publish-safe **regardless of what the (frozen) `/explain` skill sends** — no skill change needed. All 6 existing explainer docs were backfilled; a repo-wide grep confirms zero absolute local (home-directory) paths remain in `docs/` or in the built site.
- **Workspace internals are excluded from the built site.** `mkdocs.yml` `exclude_docs: /versions/` keeps the `docs/versions/` durable-doc history out of the published pages/nav/search (it stays in git). `docs/current/` stays published.

## Plugin config model + secrets hygiene (P7)

The packaged plugin adds a per-user config model designed to stay **SaaS-open**
(a hosted API later = a different `base_url` + token) while building nothing hosted:

- **Config file, not committed secrets.** `/knowledge:setup` writes
  `$XDG_CONFIG_HOME/knowledge-kb/config.json` (default `~/.config/knowledge-kb/`),
  **chmod 600**, with nested keys `kb_root`, `api.{base_url,token}`, `site.base_url`.
  The token defaults to JSON `null` (no bearer) — a hosted deployment later sets
  `api.base_url` + `api.token` here, unchanged code path.
- **No secret is ever scaffolded.** Setup **never** collects or writes a Gemini key —
  it stays host-env-only (`GOOGLE_API_KEY`/`GEMINI_API_KEY`), so no credential lands
  in the rendered KB, its git history, or the config file. The `KB_API_TOKEN` likewise
  stays env/config-only, never templated into the scaffold.
- **Local-only-fallback rule.** The shipped `/knowledge:explain` skill performs its
  file+git write fallback **only** when config resolves a **local** `kb_root`; a remote
  `base_url` that is unreachable is reported to the user, never silently written to
  disk — so a hosted KB can never be bypassed into a stray local write.
- **Payload isolation.** The plugin's `source` dir is copied whole into every
  installer's cache, so the payload lives under `plugin/` (marketplace
  `source: "./plugin"`) and ships **only** the templated KB + the two user-facing
  skills — never the operator's `docs/` content, `works/`, `data/`, `.env`, tokens, or
  workspace machinery. The shipped `plugin/templates/params.operator.json` carries only
  **public** site metadata (site name, the public Pages URL, copyright, TZ, ports) used
  by the parity guard — no secret, no local path. (`docs/current/` publish-safety and
  `exclude_docs: /versions/` from P4 still hold.)

## Security Checklist

- [x] No secrets committed (token + Gemini key via env only; `.env` + a private-key backstop in `.gitignore`)
- [x] Auth rules documented (bearer on mutating endpoints; reads too on the hosted box)
- [x] Hosted push credential is a repo-scoped, write-access SSH **deploy key**, generated on the box — the private half never leaves it
- [x] The push is scoped + rebase-onto-remote + **never `--force`**, so a server-side push cannot clobber `main`
- [x] Both hosted behaviors are flag-gated **off by default** — local/plugin users get open reads and a never-pushing agent
- [x] No local filesystem paths on the public surface (write-time sanitizer + backfill)
- [x] Workspace internals excluded from the published site (`exclude_docs: /versions/`)
- [x] Plugin payload isolated — nothing personal ships (payload under `plugin/`, `source: "./plugin"`)
- [x] No secret scaffolded — config file chmod 600, token `null` default, Gemini key host-env only
- [x] Local-only-fallback — the explain skill never falls back to a local write for a remote KB
- [x] **(P9)** Deploy runner key is a **dedicated** ed25519, distinct from the push deploy key and from hi2vi's runner key — revocable without touching either
- [x] **(P9)** Runner key private half lives **only** in the GitHub Actions secret (minted in a `umask 077` tempdir → `gh secret set` → shredded; the single controlled transit exception)
- [x] **(P9)** Runner `.pub` **appended** to `opc`'s `authorized_keys` (pre-existing key intact); host key pinned + verified out-of-band; `StrictHostKeyChecking=yes` + `IdentitiesOnly=yes`
- [x] **(P9)** Deploy is `workflow_dispatch`-only + main-guarded — publish-on-write pushes can never trigger it; no secrets in workflow logs (verified live at P9.S5: 0 key material, 0 token occurrences)

## Open Questions

- **No rate limiting on the hosted vhost, deliberately.** The defenses are the bearer (every
  `/api/*` call), Cloudflare in front, and a single known low-volume consumer. An nginx
  `limit_req` zone was *not* added because zone names are global across the edge's whole
  `conf.d/` tree — a careless one is a hard config-test failure that would block the reload for
  **every** site on the box. If the endpoint ever gains untrusted consumers, add throttling
  (app-side, or a carefully-named edge zone) as a deliberate change.
- **Agent-published commits carry a placeholder identity** (`kb-api <kb-api@localhost>`) in a
  public repo's history, and every future agent-published doc will carry it. Cosmetic, not a
  vulnerability; tracked as a deferred job.
- SaaS-someday would reopen the threat model (multi-tenant auth, data isolation, rate limits) — noted, out of scope now.

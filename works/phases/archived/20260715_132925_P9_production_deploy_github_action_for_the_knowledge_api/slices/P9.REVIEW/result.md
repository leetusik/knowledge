# P9.REVIEW — result

**Verdict: `pass`.** The phase is functionally complete and **proven live** (S5): the self-hosted
two-service site (`knowledge-api` + `knowledge-site`) runs healthy at `https://knowledge.hi2vi.com`
behind two-location edge routing, the manual-dispatch `Production Deploy` works end-to-end,
fresh-on-write is confirmed, and GitHub Pages is retired. This review re-ran the cheap **static**
sweep (no re-deploy — S5 is the behavioral proof), confirmed the objective + `intent.md` are met and
the phase Constraints held, and consolidated the accumulated **Doc impact** list into **five** durable
doc versions + extended `deploy/README.md`.

## Part 1 — Static validation sweep (all pass)

| Command | Result |
|---|---|
| `bash -n deploy/deploy.sh deploy/github-actions-production-deploy.sh deploy/oracle-production-deploy-remote.sh` | **PASS** — all three parse clean |
| `python3 scripts/plugin_parity.py` | **PASS** — templates in parity (the deploy files + workflow are outside the manifest) |
| `python3 scripts/site_smoke.py` | **PASS** — after a local `docker compose run --rm kb build` (see note) |
| `.github/workflows/deploy-production.yml` YAML sanity | **PASS** — `ruby -ryaml` loaded it clean (pyyaml absent in this env; ruby used) |
| `python3 scripts/workflow.py validate` | **PASS** — state integrity; all slices `done`, REVIEW `in_progress` |
| `docker compose -f compose.prod.yml config` | **PASS** — docker was available locally; ran with an empty temp `.env` (see note) |

**site_smoke note.** On first run site_smoke reported **only** two failures — `site/ is missing` and
`site/graph.json missing` — both `check_built`/`check_graph` invariants that require a local
`mkdocs build`. The **source** invariants (including the S1-touched **pin-parity read off
`pages.yml`**, the concern the plan flags) produced **zero** failures — the pins match (`9.7.6` in both
`.github/workflows/pages.yml` and `compose.yml`). Docker + the pinned mkdocs image were present
locally, so I built the site (`docker compose run --rm kb build`, not a deploy) and re-ran site_smoke →
**PASS, all invariants hold**. `site/` is gitignored, so the build artifact is not committed.

**compose config note.** `compose.prod.yml` declares `env_file: .env` (a box-only secrets file, absent
locally), so a bare `config` errors on the missing file. `.env` is gitignored; I created an empty temp
`.env`, ran `config` → **exit 0**, and removed it. The resolved config confirms the P9 topology: service
`api` = `container_name: knowledge-api`, `KB_PUBLIC_BASE_URL: https://knowledge.hi2vi.com` (root);
service `site` = `container_name: knowledge-site`, `image: squidfunk/mkdocs-material:9.7.6`,
`command: [serve, --dev-addr=0.0.0.0:8000, --livereload]`, healthcheck `start_period: 40s`; both on the
external `changple_shared_network`, no host ports, `restart: unless-stopped`.

## Part 2 — Objective + `intent.md` review (met; constraints held)

The **expanded scope** (`intent.md` "Expanded & Confirmed Intent") is met, cited against the **S5 live
findings** (phase.md "S5 findings", run 29385684066):

- **Self-host the full site (web UI + API) at `knowledge.hi2vi.com`** — ✓ both `knowledge-api` +
  `knowledge-site` (mkdocs-material:9.7.6) `Up (healthy)` on the box (S5 (a)).
- **One manual-dispatch `Production Deploy`** — ✓ `workflow_dispatch` run succeeded in 1m17s; full chain
  (SSH via the dedicated runner key → gate → `deploy.sh` in-container reconcile → dual health-gate →
  edge re-apply → dual smoke → artifacts) confirmed in the log (S5 step 3).
- **Pages retired** — ✓ Pages API → 404, `leetusik.github.io/knowledge/` → 404, box still serves; shipped
  plugin keeps Pages (S5 step 5).
- **Fresh-on-write** — ✓ POST probe → `201 committed pushed`, published page 200 on the site with **no
  restart**, DELETE → cleanup (S5 (d), the §H linchpin — no fallback needed).
- **Two-location routing** — ✓ `/healthz` → api, `/` → site (200 text/html), `/api/*` passes through
  unchanged (frozen consumer path 200) (S5 (c)); verified statically in `deploy/knowledge.conf`.
- **Both services healthy** — ✓ (S5 (a)).

**Constraints held:**

- **Two-credential separation** — ✓ runner key (`knowledge-gha-runner@box`, three `ORACLE_SSH_*`
  secrets) kept distinct from the P8 container→GitHub deploy key `knowledge-api@oci-box`; S5 used only the
  runner key + read the token, never touched the deploy key.
- **Never detach/reset/force the box clone** — ✓ S5 log: `already at tip`, `HEAD now c018571 on main`
  (stayed on main, not detached); reconcile-on-main verified in `deploy.sh`.
- **Edge house rules** (no `default_server` / IPv6 `listen [::]` / `limit_req_zone`) — ✓ grep of
  `deploy/knowledge.conf` finds them **only** in the house-rule doc comments, never as directives.
- **Both CIs green** — ✓ `plugin_parity.py` PASS; `pages.yml` reclassified out of the manifest `identical`
  set (no `pages.yml` reference remains in `plugin/templates/manifest.json`), so repo + template may
  diverge; site-build CI kept as a build-only guard.
- **Manual-dispatch-only** — ✓ `deploy-production.yml` is `on: workflow_dispatch:` only, `preflight` guards
  `refs/heads/main`, `concurrency: knowledge-deploy` (`cancel-in-progress: false`).
- **Shipped plugin keeps Pages** — ✓ `plugin/templates/kb/.github/workflows/pages.yml` present (924 B,
  full Pages workflow intact).
- **No cross-repo blast radius** — ✓ knowledge-repo-internal; the frozen hi2vi consumer contract from P8 is
  unchanged (the api-doc version is additive-only; `/api/*` routing proven unchanged in S5).

No issues found → **no fix slices needed.**

## Part 3 — Durable-doc consolidation

Five versions created (`doc-new-version --source P9.REVIEW`, each seeded with the prior body + fresh
frontmatter, then edited to fold in the P9 Doc-impact changes), then `rebuild-docs` + `docs` + `validate`:

| Doc | New version | Folds in |
|---|---|---|
| operations | **v0009 → v0010** | self-hosted two-service topology; the manual-dispatch redeploy procedure (in-container reconcile → dual health-gate → edge re-apply → dual smoke → 14 d artifacts); authoritative git in-container (F1); fresh-on-write replaces the ~65 s Pages SLA; one-time box-clone bootstrap; Pages-retirement of the site-build CI |
| architecture | **v0007 → v0008** | new *Self-hosted site* section (two services, one domain, two-location routing); Track 1 is live-serve not Pages; the browser-only boundary now load-bearing (lets the two cohabit, no CORS); P9 roadmap entry |
| api | **v0005 → v0006** (additive-only) | the 201 `url` origin is now the root `https://knowledge.hi2vi.com`; publish is the box's live-serve (fresh-on-write), push is off-box backup; `/api/*` routing + frozen contract shapes **unchanged** (example URL + `url` field-meaning + publish-flow updated) |
| security | **v0004 → v0005** | new *Two credentials* section (runner SSH key vs push deploy key table); the dedicated-runner-key rationale; the deliberate secret-transit exception refining the "secrets are box-born" premise; four P9 checklist items |
| decisions | **v0009 → v0010** | four new ADRs (self-host + retire Pages; live-serve; automated production deploy with all the hi2vi divergences; dedicated runner key); a superseded-decisions entry (Track 1 → Pages target / ~65 s SLA superseded by self-host + fresh-on-write) |

**Exact new version ids:**
- `operations/v0010_p9_self-hosted_two-service_site_...pages_retired`
- `architecture/v0008_p9_track_1_web_ui_is_now_self-hosted_mkdocs_live-serve_..._healthz_-_api`
- `api/v0006_p9_additive-only_the_201_url_origin_is_now_https_knowledge.hi2vi.com_root_..._contract_intact`
- `security/v0005_p9_add_the_gha_runner-_opc_box_ssh-key_credential_..._exception_for_the_runner_key`
- `decisions/v0010_p9_adrs_self-host_the_site_live-serve_retire_pages_..._dedicated_runner_key`

**`deploy/README.md`** (repo doc — edited directly, no `doc-new-version`): intro + artifacts updated for
the two-service compose + two-location vhost + the deploy chain; §2 bring-up expects both services; **new
§6** documents the manual-dispatch `Production Deploy` usage, the runner secret set (§6.1), and the
**one-time box-clone bootstrap** (§6.2).

**qa: not versioned (v0006 kept).** S5 reused P8's exact "assert the capability (`pushed:true` / page-live),
not the status code" methodology; the fresh-on-write proof is another instance of it, not new durable qa
truth beyond v0006. The static-review sweep is a review-slice pattern, not durable qa doc truth. Left qa
unversioned per the plan's guidance.

## Deviations from `plan.md`

- **site_smoke.py** required a local `docker compose run --rm kb build` before it fully passed (the
  built-site invariants need a build). The plan's annotation targeted the pin-parity **source** read,
  which passed clean without a build; I built the site (docker was available) to get a definitive full
  PASS. Not a re-deploy.
- **`compose.prod.yml config`** needed an empty temp `.env` (box-only secrets file); ran clean, temp file
  removed. Within the plan's "only if docker is available" allowance.
- **Two `doc-new-version` calls (operations, decisions) failed on the first attempt** with
  `File name too long` — my initial summaries slugified past the OS filename limit. Retried both with
  shorter summaries; both succeeded. No orphan files/events left (validate PASS; events.jsonl shows exactly
  5 clean `doc_version_created` entries).
- Otherwise executed the plan as written. No source code was edited (review slice).

## Validation re-run for the orchestrator

`python3 scripts/workflow.py validate` → **PASS** (the only command the orchestrator re-runs). The
behavioral end-to-end proof was S5 (live production), recorded in `phase.md`.

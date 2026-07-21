# P14.REVIEW — Result (phase review + durable-doc consolidation)

**Verdict: PASS.** All three P14 slices validated together, behaviorally; the phase meets its
objective / `intent.md` and respects the round-01 design AS-IS. The two known gaps are a
design-round copy gap (deferred, not invented) and un-pixel-verified overflow (noted for the
operator's post-deploy check) — neither is a defect. Durable docs consolidated across the phase.

No source code was edited (review slice). No commit, no `review-phase`, no status transition —
the orchestrator records the verdict.

## 1. Validation (all slices, behavioral)

### Landing (P14.S2)

| Command / check | Result |
|---|---|
| `cd web && pnpm build` | **PASS** — compiled + TS pass; `/` prerendered **○ Static**; `/dashboard //login //signup //documents //graph //projects` still **ƒ Dynamic**; `sitemap.xml`/`robots.txt`/`manifest.webmanifest` generated |
| `pnpm lint` | **PASS** — clean (no output) |
| `pnpm typecheck` (`tsc --noEmit`) | **PASS** — clean |
| Drive `/` (`pnpm start` on 127.0.0.1:3030 + curl) | **PASS** — 9 sections in band order (hero-dark → what-it-is → how-it-works-sunken → save → connect-dark → graph-plate → pricing → final-CTA-dark → footer); verbatim EN+KR copy present; Free `$0` + "Agent Retrieval API — Coming" waitlist |
| CTA hrefs (rendered) | **PASS** — `/login`×4, `/signup`×5, GitHub `cli` / `cli#install` / `plugin` / repo-home — **no dead links** |
| App intact | **PASS** — `/login`→200, `/signup`→200, `/dashboard`→307 `/login` (unauth), `/robots.txt`+`/sitemap.xml`→200 |
| Reveal + scheme | **PASS** — SSR `data-reveal`=0 (island arms only under `no-preference`); pre-paint `prefers-color-scheme` script present; `#mkt-root` SSR scheme `default` |

Note: `pnpm start` prints a harmless "`next start` does not work with `output: standalone`"
warning — the production container runs `node server.js` (proven by S3's container smoke); the
server served every route correctly regardless. Not a defect.

### Deploy (P14.S3)

| Check | Command | Result |
|---|---|---|
| Compose well-formed, `site` gone | `docker compose -f compose.prod.yml config` (throwaway gitignored `.env`, removed after) | **PASS** — exit 0, no warnings; services = `api, postgres, web`; `web` = `knowledge-web`, `KB_API_BASE_URL` literal, `SESSION_SECRET` interpolated, `expose 3000`, `NEXT_PUBLIC_APP_URL` build arg |
| `web/Dockerfile` vs pattern | review | **PASS** — multi-stage node:22-slim standalone; NODE_ENV only in runtime stage; `NEXT_PUBLIC_APP_URL` asserted non-empty; `USER node`; `EXPOSE 3000`; fetch HEALTHCHECK; `CMD ["node","server.js"]`; sharp/@img block correctly dropped |
| `deploy/knowledge.conf` vs edge invariants | review | **PASS** — most-specific `/api/auth/`→web beats `/api/`; every `proxy_set_header` hoisted to server (none per-location); variable `proxy_pass` + `resolver 127.0.0.11`; no `default_server`/IPv6/`limit_req_zone`; CF real-IP; `/api //auth //app /=/healthz`→`knowledge-api` unchanged; `/`→`knowledge-web` |
| Deploy scripts syntax | `bash -n deploy/{deploy,oracle-production-deploy-remote,github-actions-production-deploy}.sh` | **PASS** — all clean; health-gate swapped `site`→`web`; no lingering `knowledge-site` gate (only documentary mentions) |
| Live `nginx -t` | (not claimed) | Deferred to the box's `./deploy.sh` (needs the full conf.d/ tree + certs) |

### State

| Command | Result |
|---|---|
| `python3 scripts/workflow.py validate` | **PASS** — Workflow validation passed |

## 2. Assessment of the two known gaps

**(a) Copy-fidelity gap — PASS + defer (did NOT invent copy).** Confirmed in
`web/src/content/marketing/content.ts`: `HERO` and `VALUE` (what-it-is) carry the §4-verbatim
`lede`; the three `FEATURE` sections (save / connect / graph) and `HOW` carry
`eyebrow`+`title`+`ticks`/`steps` but **no lede** — because `build-prompt §4` quoted no lede
for them — and content.ts explicitly documents that no lede was fabricated. Every designed
*structural* element ships (heading + verbatim ticks/tokens + visual). This is a **design-round
copy gap, not an implementation defect and not a dropped design element**. Filed:

```
python3 scripts/workflow.py defer-job \
  --title "Landing feature-section lede copy" \
  --reason "build-prompt quoted no lede for feature/how-it-works; copy must come from the operator or a copy round, not invented" \
  --trigger "operator provides copy / next design round" \
  --source P14.REVIEW
# → created deferred job D10
```

**(b) Un-pixel-verified overflow / visual polish — noted for post-deploy.** Overflow is guarded
structurally (container max-width + responsive px, grids stack to 1-col on mobile,
`word-break: keep-all` on headings, terminal `overflow-x:auto`, graph plate `overflow:hidden`)
but not pixel-verified without a browser. Flagged for the operator's post-deploy visual check.
Not a defect.

Neither gap warrants `changes_requested`.

## 3. Design fidelity + objective/intent

- **Design AS-IS:** the landing implements round 01 with no dropped/simplified/"improved"
  designed element. The `/login`/`/signup` CTA targets (vs the design's `/app`) are the
  operator's recorded **non-visual** routing decision — the visual design is unchanged.
- **Objective / intent met:** landing + public webpage via the Claude Design gate ✓; hi2vi_web
  stack (Next standalone in Docker behind the edge) + edge-deploy pattern ✓; free-only launch
  with the paid retriever deferred → P15 ✓; `knowledge.hi2vi.com` ✓.

## 4. Durable-doc consolidation (PASS only; docs only, never source)

Ran, from the `phase.md` Doc-impact list:

```
python3 scripts/workflow.py doc-new-version --doc frontend   --source P14.REVIEW \
  --summary "P14 public marketing landing at / in web/ via the Claude Design gate (round 01)"
python3 scripts/workflow.py doc-new-version --doc operations  --source P14.REVIEW \
  --summary "P14 web-app deploy: knowledge-web Dockerfile + compose service + reworked edge vhost; mkdocs site retired"
python3 scripts/workflow.py doc-new-version --doc decisions   --source P14.REVIEW \
  --summary "P14 landing takes /; app stays at current paths (no /app rebase); mkdocs retired, /docs reserved; Free + waitlist pricing"
python3 scripts/workflow.py rebuild-docs
```

Resulting versions (one per affected doc, whole-phase):

- **`frontend v0006`** — new *The public marketing landing (`web/`, P14)* section: the
  Claude Design round-01 provenance + read-only record under `web/design/rounds/01-landing/`;
  the `(marketing)` route-group takeover of `/` (old `page.tsx` redirect deleted; app untouched;
  CTA targets `/login`/`/signup`); the nine sections + content-as-data copy layer; the additive
  band/on-dark/data-viz-ink tokens + the scoped tonal-band mechanic; the static graph-motif
  reuse; the copy-fidelity note (D10); SEO file routes. Status paragraph updated.
- **`operations v0015`** — new *Web app production deploy (P14)* section: `web/Dockerfile` +
  `knowledge-web` compose service (`SESSION_SECRET`, `KB_API_BASE_URL`, `NEXT_PUBLIC_APP_URL`) +
  reworked edge vhost (`/api/auth/`→web, `/`→Next, CLI planes unchanged); **mkdocs `site`
  retired**; deploy automation health-gates `knowledge-web`; new box secret `SESSION_SECRET`;
  the `KB_PUBLIC_BASE_URL` dead-link caveat; closes the P12-deferred web-deploy items. Status,
  the Shape/edge service topology, the env-var table, the P9 Publishing section (superseded
  note), and the Invariants list updated.
- **`decisions v0015`** — four new ADRs (landing designed AS-IS via the gate; landing takes `/`
  with the app staying at current paths — supersedes design #3; retire mkdocs + reserve `/docs`;
  Free-only launch pricing → P15) + two supersession entries (design #3's `/app` half; the P9
  `/`-serving mkdocs regime). Status paragraph updated.

Note: the first `frontend` `doc-new-version` used a longer summary that produced a version
filename too long for the editor's temp-file path; I reverted it (`git checkout docs/index.json
docs/current/frontend.md` + removed the stray version file) and recreated it with the concise
summary above — a mechanics-only redo, no content lost.

## Files changed (review slice)

- `docs/versions/frontend/v0006_p14_public_marketing_landing_at_in_web_via_the_claude_design_gate_round_01.md` (created + edited)
- `docs/versions/operations/v0015_p14_web-app_deploy_knowledge-web_dockerfile_compose_service_reworked_edge_vhost_mkdocs_site_retired.md` (created + edited)
- `docs/versions/decisions/v0015_p14_landing_takes_app_stays_at_current_paths_no_app_rebase_mkdocs_retired_docs_reserved_free_waitlist_pricing.md` (created + edited)
- `docs/current/{frontend,operations,decisions}.md` (regenerated by `rebuild-docs`)
- `docs/index.json` (three new versions registered)
- `works/deferred/open/D10/*` + `works/deferred.md` + `works/index.json` (deferred job D10)
- `works/phases/active/P14/phase.md` (review outcome appended)
- `works/phases/active/P14/slices/P14.REVIEW/result.md` (this file)

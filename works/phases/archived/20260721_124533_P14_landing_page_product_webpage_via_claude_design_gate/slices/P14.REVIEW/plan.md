# P14.REVIEW — Plan (native, orchestrator-written) — Phase review + durable-doc consolidation

You are `slice-executor-high` running the P14 phase review. Validate all slices together, review against the
objective / `intent.md` / design fidelity, and — **ONLY on a passing review** — consolidate the phase's
accumulated "Doc impact" notes into new doc versions. Return a `review_verdict`. Read `phase.md` fully first
(objective, the "Approved design direction", the routing + docs-site resolutions, the Doc-impact list).

## 1. Validate all slices (behavioral)
- **Landing (S2):** `cd web && pnpm build && pnpm lint && pnpm typecheck` — all clean. Drive `/` (`pnpm dev`
  on 127.0.0.1:3030 or the built server + curl / HTML inspection): the 9 sections in band order (hero-dark →
  what-it-is → how-it-works-sunken → save → connect-dark → graph-plate → pricing → final-CTA-dark → footer),
  verbatim copy present (EN+KR), CTAs → `/login` / `/signup` + the repo guide targets (no dead links), the
  both-schemes script + the Reveal (armed only under `prefers-reduced-motion: no-preference`). App intact:
  `/login` → 200, `/dashboard` → redirect-to-login when unauth.
- **Deploy (S3):** `docker compose -f compose.prod.yml config` passes (create a throwaway gitignored `.env` if
  missing; **do not commit it**) — `web` present, `site` gone. Sanity-review `web/Dockerfile` +
  `deploy/knowledge.conf` against the edge invariants (most-specific location wins; NO per-location
  `proxy_set_header`; variable `proxy_pass` + `resolver`; no `default_server`/IPv6/`limit_req_zone`;
  `/api/auth/`→web, `/`→web, CLI planes `/api //auth //app /=healthz`→api unchanged). `bash -n` the deploy
  scripts. **Do NOT** claim a live `nginx -t` (needs the box's conf.d tree + certs).
- **State:** `python3 scripts/workflow.py validate`.

## 2. Review vs objective / intent / design fidelity
- Objective + `intent.md`: landing + proper public webpage via the Claude Design gate; hi2vi_web stack +
  edge-deploy pattern; free-only launch (paid retriever deferred → P15); `knowledge.hi2vi.com`. Confirm met.
- **Design fidelity (RESPECT THE DESIGN):** the landing implements the round AS-IS — no dropped/simplified/
  "improved" designed element. The routing change (app stays at current paths; CTAs → `/login`/`/signup`) is
  the operator's recorded non-visual decision, not a design drop.
- **Assess the two known gaps** and decide the verdict:
  (a) **Copy-fidelity gap** — the `build-prompt.md` quoted no lede text for the three feature sections / no
  per-step how-it-works sentence, so S2 shipped headings + verbatim ticks and **invented nothing** (correct).
  This is a *design-round* gap, not an impl defect. **Prefer PASS and `python3 scripts/workflow.py defer-job
  --title "Landing feature-section lede copy" --reason "build-prompt quoted no lede for feature/how-it-works;
  copy must come from the operator or a copy round, not invented" --trigger "operator provides copy / next
  design round" --source P14.REVIEW`** rather than blocking. Do NOT invent copy.
  (b) Overflow / visual polish not pixel-verified without a browser — note for the operator's post-deploy
  visual check.
  Return `changes_requested` (with a concrete fix slice proposal) only if you judge something is a real defect.

## 3. Consolidate Doc-impact → new versions (ONLY on pass; docs only, NEVER source)
From the `phase.md` Doc-impact list, run:
- `python3 scripts/workflow.py doc-new-version --doc frontend --source P14.REVIEW --summary "..."` — the
  `(marketing)` landing at `/`, section components + content-as-data copy layer, the additive band/on-dark/
  data-viz-ink tokens + tonal-band mechanic, the static graph-motif reuse; the design round record under
  `web/design/rounds/01-landing/`.
- `... --doc operations --source P14.REVIEW --summary "..."` — web `Dockerfile` + `knowledge-web` service
  (`SESSION_SECRET`, `KB_API_BASE_URL`) + reworked edge vhost (`/api/auth/`→web, `/`→Next, CLI planes
  unchanged); **mkdocs `site` retired**; deploy automation health-gates `knowledge-web`; new `SESSION_SECRET`
  box secret; the `KB_PUBLIC_BASE_URL` dead-link caveat; closes the P14-deferred web-deploy items.
- `... --doc decisions --source P14.REVIEW --summary "..."` — landing takes `/`; app stays at current paths
  (supersedes design #3, avoids the CLI collision); mkdocs retired + `/docs` reserved; pricing = Free +
  waitlist (paid retriever → P15).
- Then `python3 scripts/workflow.py rebuild-docs`.

## Return
A structured verdict including `review_verdict` (`pass` / `changes_requested` / `blocked`), the validation
results, your assessment of the two gaps (and the `defer-job` id if you filed one), and the exact
`doc-new-version` commands you ran. **Do not commit, do not run `review-phase`, do not transition phase/slice
status** — the orchestrator records the verdict and commits. (You MAY run `doc-new-version` + `defer-job` +
`rebuild-docs` — those are this review slice's job.)

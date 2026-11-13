# P9.REVIEW — validate the phase, consolidate durable docs

## Context

P9 is functionally complete and **proven live** (S5): the self-hosted two-service site
(`knowledge-api` + `knowledge-site`) runs healthy at `https://knowledge.hi2vi.com` behind two-location
edge routing, the manual-dispatch `Production Deploy` works end-to-end, fresh-on-write is confirmed, and
GitHub Pages is retired. Six slices (DECOMP, S1, S2, S3, F1, S4, S5) are `done`. REVIEW is the phase's
final slice: validate everything together, confirm the objective + `intent.md` are met, and — **only on a
passing review** — consolidate the phase's accumulated **Doc impact** list into new durable-doc versions
(the once-per-phase versioning point) + extend the `deploy/README.md` repo doc.

Delegated to **`slice-executor-high`** (review tier). The executor may run `doc-new-version` (review slice
only) but **never commits and never transitions phase status** — the orchestrator records the verdict via
`review-phase`. Behavioral proof was S5 **live** and is recorded in `phase.md` "S5 findings"; REVIEW does
**not** re-deploy — it re-runs the cheap **static** validations + reviews + consolidates docs.

## Part 1 — Validate (static sweep; do NOT re-deploy)

Run and report each; all must pass (they gate the doc consolidation):
- `bash -n deploy/deploy.sh deploy/github-actions-production-deploy.sh deploy/oracle-production-deploy-remote.sh`
- `python3 scripts/plugin_parity.py` (both the deploy files + workflow are outside the manifest; parity green)
- `python3 scripts/site_smoke.py` (pin-parity read off `pages.yml` still resolves post-S1)
- `.github/workflows/deploy-production.yml` YAML sanity (`ruby -ryaml -e 'YAML.load_file(...)'` or
  `python3 -c "import yaml,sys; yaml.safe_load(open(...))"`; if neither lib is present, a structural eyeball
  + say which ran)
- `python3 scripts/workflow.py validate` (state integrity — all slices `done`)
- `docker compose -f compose.prod.yml config` **only if** docker is available locally; otherwise skip and
  note it (S5 already proved the compose live). Do not install anything.

## Part 2 — Review against objective + `intent.md`

Read `works/phases/active/P9/intent.md` (verbatim original + Expanded & Confirmed Intent) and the phase
Objective. Confirm — citing the **S5 findings** as the live proof — that the expanded scope is met:
self-host the full site (web UI + API) at `knowledge.hi2vi.com` ✓, one manual-dispatch `Production Deploy`
✓, Pages retired ✓, fresh-on-write ✓, two-location routing ✓, both services healthy ✓. Confirm the phase
**Constraints** held: two-credential separation (runner key vs container deploy key), never
detach/reset/force the box clone, edge house rules (no `default_server`/IPv6/`limit_req_zone`), both CIs
green, manual-dispatch-only, the shipped plugin keeps Pages, no cross-repo blast radius. Decide the verdict:
**`pass`** (expected) / `changes_requested` (with concrete fix slices) / `blocked`.

## Part 3 — Consolidate durable docs (ONLY on a `pass`)

The **`## Doc impact`** list in `phase.md` is the authoritative guide. Version **five** durable docs. For
each: `python3 scripts/workflow.py doc-new-version --doc <name> --summary "<concise P9 summary>" --source
P9.REVIEW` (this seeds a new `docs/versions/<name>/vNNNN_*.md` **with the prior version's body** + fresh
frontmatter), then **edit that new version file** to fold in the P9 changes below (each version is the full
doc snapshot). After all five, run `python3 scripts/workflow.py rebuild-docs` (regenerates
`docs/current/*` — never hand-edit those), then `docs` + `validate` to confirm.

- **operations** (v0009→v0010): self-hosted two-service topology (`knowledge-api` + `knowledge-site`
  live-serve); the manual-dispatch redeploy procedure (`workflow_dispatch` → SSH driver → on-box gate →
  `deploy.sh` **in-container** reconcile → dual health-gate → **edge vhost re-apply** [`nginx -t` gate →
  graceful reload] → dual external smoke on `/healthz` + `/` → artifacts 14 d); the authoritative
  reconcile/fetch/ancestor gate now lives **in-container** (F1), not opc-side; **fresh-on-write replaces the
  ~65 s Pages SLA**; note the **one-time box-clone bootstrap** on a first deploy.
- **architecture** (v0007→v0008): Track 1 (human web UI) is now **self-hosted live-serve**, not GitHub
  Pages; two independent services on one box behind two-location edge routing (`/`→site, `/api/*`+`/healthz`
  →api).
- **api** (v0005→v0006, **additive-only** — the frozen consumer contract is unchanged): the 201 `url`
  origin is now `https://knowledge.hi2vi.com` (root); the publish mechanism is the box's live-serve site,
  **no longer Pages** (the git push is off-box backup/history). `/api/*` still routes to the API unchanged
  (S1's `location /api/` passes the prefix through) — the hi2vi consumer is unaffected (proven in S5).
- **security** (v0004→v0005): add the **GHA runner → `opc@box` SSH-key** credential (§G — three
  `leetusik/knowledge` Actions secrets `ORACLE_SSH_PRIVATE_KEY` / `ORACLE_SSH_KNOWN_HOSTS` / optional
  `ORACLE_SSH_PASSPHRASE`; dedicated ed25519 `knowledge-gha-runner@box`, `.pub` appended to `opc`'s
  `authorized_keys`), kept **distinct** from the P8 container→GitHub deploy key `knowledge-api@oci-box`; and
  the deliberate **secret-transit exception** for the runner key (private half minted in a `umask 077`
  tempdir → piped once into `gh secret set` → shredded) that refines the "secrets are box-born" premise.
- **decisions** (v0009→v0010): new ADRs — self-host the site; **live-serve** (vs static / cron rebuild);
  **retire Pages** (the reclassify-out-of-`identical` + neutralize mechanism); **automated production
  deploy** mirroring hi2vi's three-script split, with the knowledge divergences — publish-on-write
  **reconcile-on-`main`** (never detach/reset/force; deploys origin/main **tip**; one-shot container reusing
  the api service for root-owned `.git` + SSH), **gate + fix-forward, no rollback** (§F v1; bind-mounted
  code), **relocate all authoritative git into `deploy.sh`'s root container** (F1; opc can't auth the SSH
  origin), **edge re-apply inside the gate**, **`workflow_dispatch`-only + main-guard + `concurrency:
  knowledge-deploy`** (publish-on-write pushes must never trigger a redeploy), and the **dedicated runner
  key** (§G).

**qa: optional** — only add a version if the executor finds genuinely new durable qa truth beyond v0006
(S5 reused P8's "assert the capability [`pushed:true` / page-live], not the status code" methodology, so a
new version is likely **not** warranted). Executor judges; if in doubt, leave qa unversioned and note it.

**`deploy/README.md`** (a **repo doc**, edit directly — **no** `doc-new-version`): extend with the
manual-dispatch redeploy usage, the `knowledge-site` service, and the one-time box-clone bootstrap note.

## Part 4 — Return `review_verdict`

Return **`pass`** (with a note: live acceptance summary + which docs were versioned), or
`changes_requested` (list concrete `P9.Fn` fix slices) / `blocked` (the impediment). Write `result.md` and
append REVIEW notes to `phase.md`.

## Constraints

- Author + validate + doc-consolidate ONLY. **Never commit, never transition phase status** (orchestrator
  does that via `review-phase`). Do **not** re-deploy or SSH the box — S5 is the behavioral proof. Do not
  hand-edit `docs/current/*` (regenerated by `rebuild-docs`). `doc-new-version` is allowed **because this is
  the review slice**; run it once per affected doc.

## Orchestrator follow-up (me, after the executor returns)

`python3 scripts/workflow.py review-phase P9 --verdict <verdict> --reviewer slice-executor-high --note
"..."` → `validate` → commit. A `pass` marks P9 `done` + closes the `REVIEW` slice (no separate
`finish-slice`). The phase stays in `active/` — **archiving is a separate manual step** (`archive-phase P9`
/ `rotate-backlog` / `archive-all`), done later only if the operator asks, not here.

## Verification

Part 1's static sweep + Part 2's objective/intent review + `docs`/`validate` after Part 3's `rebuild-docs`
confirm the phase is consistent and the durable docs reflect the now-live reality. The behavioral end-to-end
verification was S5 (live production), recorded in `phase.md`.

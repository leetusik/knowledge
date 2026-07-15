# P9.DECOMP — result

Executed by `slice-executor-high`. Design-first decomposition of P9 (self-host the full
knowledge site + retire Pages + automated production deploy). No code implemented; no slice's
`plan.md` pre-filled; no docs versioned; no status transitioned. Only `new-slice` (×5) and
`validate` were run.

## What I did

1. **Read + grounded the scope** against `intent.md` (incl. the 2026-07-15 "Expanded & Confirmed
   Intent") and `phase.md` Objective/Context, then skimmed the actual files to ground/refine the
   design: `compose.yml` (`kb`), `compose.prod.yml`, `Dockerfile`, `deploy/knowledge.conf`,
   `mkdocs.yml`, `.github/workflows/pages.yml`, `plugin/templates/manifest.json`,
   `plugin/templates/params.operator.json`, `scripts/site_smoke.py`, `scripts/plugin_parity.py`,
   `server/gitops.py`, and the `hi2vi_web/deploy/*` + `deploy-production.yml` reference chain.
2. **Created the five middle slices as bare folders** (each holds only `slice.json`):

   | slice | name | kind | risk | order |
   |-------|------|------|------|-------|
   | P9.S1 | Self-host the web UI + retire Pages | implementation | **high** | 1 |
   | P9.S2 | On-box deploy: reconcile + redeploy both services + edge re-apply | implementation | **high** | 2 |
   | P9.S3 | GHA driver + Production Deploy workflow | implementation | **medium** | 3 |
   | P9.S4 | Runner SSH-key provisioning runbook + operator gate | implementation | **medium** | 4 |
   | P9.S5 | E2E acceptance (real dispatch) | implementation | **high** | 5 |

   Exactly the ids / kinds / risks / orders the plan specified. Verified each folder is bare and each
   `slice.json` has the intended `kind`/`risk`/`order`/`status=todo`.
3. **Recorded in `phase.md`:** the slice breakdown + rationale (**Decomposition**), the full design
   proposal **§A–§H** plus **Constraints** and **Open Questions** (**Findings & Notes**), and the
   seeded **Doc impact** running list.

## Validation

- `python3 scripts/workflow.py validate` → **passed** ("Workflow validation passed.") after creating
  the five slices — the required validation for a decomposition slice.
- Field spot-check (`slice.json` per slice) → all five match the planned kind/risk/order, status `todo`.
- Bare-folder check → each of `P9.S1..P9.S5` contains only `slice.json` (no pre-filled `plan.md`).

## Doc impact recorded (for P9.REVIEW to consolidate — not versioned here)

Seeded the `## Doc impact` list in `phase.md`: `operations.md` (self-hosted live-serve, drop the ~65 s
Pages SLA, redeploy procedure, two-service topology), `architecture.md` (Track 1 self-hosted; two
services + two-location edge), `api.md` (201 `url` origin `knowledge.hi2vi.com`; publish via box, not
Pages), `security.md` (public-site via the box; runner SSH key), `decisions.md` (ADRs: self-host,
live-serve, retire Pages, deploy reconcile/rollback divergences, runner key), and a note that
`deploy/README.md` (a repo doc, not a `docs/current/*` durable doc) needs the redeploy procedure +
`knowledge-site` service.

## Grounding refinements (design sharpened vs. the DECOMP-plan draft)

These are the "ground/refine against the actual files" the plan asked for — recorded in `phase.md` so
the operator signs off on the accurate design, not a deviation from the DECOMP task:

1. **§A `--livereload` is load-bearing.** The plan draft wrote the `knowledge-site` command *without*
   `--livereload`; the live `compose.yml` `kb` uses `serve --dev-addr=0.0.0.0:8000 --livereload` with a
   comment that without the flag "new pages don't appear until the container restarts." So the site
   command **must** include `--livereload` — it is precisely what makes §H's fresh-on-write work.
2. **§C `pages.yml` "identical" byte-compare tension.** `plugin_parity.py:88-98` byte-compares the repo
   `.github/workflows/pages.yml` against the plugin template copy (it is in `manifest.json`'s
   `identical` list, line 44). So the plan draft's three simultaneous goals — "neutralize the repo
   workflow" **and** "keep the plugin template's `pages.yml` untouched (plugin keeps Pages)" **and**
   "keep the file for parity" — **cannot all hold**: neutralizing only the repo copy trips
   `[identical] byte drift`. I recorded the concrete options S1 must choose among (recommend:
   reclassify `pages.yml` out of `identical` + neutralize only the `push` trigger, keeping the
   `mkdocs-material==` pin line so `site_smoke.py:147-160` pin-parity still passes) as an **Open
   Question** for operator sign-off.
3. **§E/§F grounded against the code:** the reconcile-on-`main` mirrors `server/gitops.py`'s own
   fetch→rebase→never-force discipline; the root-owned `.git` recommendation (one-shot container git)
   reuses `Dockerfile:39-41`'s baked `safe.directory`+identity; and the mount-based-rollback divergence
   is confirmed by `Dockerfile:1-4,29-31` + `compose.prod.yml` `.:/repo` (`server/` runs from the mount,
   so an image-tag flip can't revert it).

## Deviations from `plan.md`

None in substance. I created exactly the five slices with the specified kind/risk/order and recorded the
prescribed Decomposition + §A–§H + Doc-impact. The grounding refinements above (§A `--livereload`, the
§C `pages.yml` byte-compare tension) are the plan-requested "ground/refine against the actual files,"
surfaced as design notes + Open Questions for S1's operator sign-off — I did not resolve them (that is
S1's job) and I implemented nothing.

# Deferred Jobs

> Generated dashboard. Do not put detailed deferred context here; edit each `works/deferred/<state>/<DID>/` folder instead.

## Summary

- Open: `24`
- Promoted: `5`
- Dropped: `6`

## Open

| ID | Status | Title | Source | Trigger | Path |
|---|---|---|---|---|---|
| `D11` | `deferred` | Production Deploy: reconcile box clone before invoking deploy.sh (self-upgrade trap) | P14.S3 | next time the deploy machinery's compose service set or health-gate changes | `works/deferred/open/D11` |
| `D12` | `deferred` | Monetize the MCP retriever: introduce the paid plan + gate the agent-facing retrieval surface | P15.DECOMP | operator decides to introduce the paid plan | `works/deferred/open/D12` |
| `D13` | `deferred` | source_url (public-origin) field + ingester population | P15.S1 | public-scraping/ingestion features land, or clickable citations become required for a consumer (e.g. OpenClaw's citation chip) | `works/deferred/open/D13` |
| `D14` | `deferred` | Org management: create additional orgs + invite members | P18 | operator asks for multi-org/team features, or a second member needs org access | `works/deferred/open/D14` |
| `D17` | `deferred` | Rate-limit the anonymous read surface (public doc/raw/graph) | P19.REVIEW | Before promoting public links to real traffic, or at first sign of scraping/abuse on the anonymous surface | `works/deferred/open/D17` |
| `D18` | `deferred` | Login returnTo + public tag surface for public-graph tag links | P19.REVIEW | Next web UX slice, or operator/user reports friction on shared links | `works/deferred/open/D18` |
| `D20` | `deferred` | Windows install.ps1 (PowerShell curl-installer equivalent) | P20.DECOMP | Windows onboarding demand / operator asks | `works/deferred/open/D20` |
| `D22` | `deferred` | Repo-wide prettier drift (51 files at clean HEAD) | P21.REVIEW | Operator decides format:check should become a real gate | `works/deferred/open/D22` |
| `D23` | `deferred` | Bound the Gemini embed on the publish worker | P24.REVIEW | When adding timeouts/retries to embeddings or touching server/publish.py next | `works/deferred/open/D23` |
| `D24` | `deferred` | Version durable docs for the automated alembic step in deploy.sh (operations/data/decisions still say manual) | P25.REVIEW | Next phase review (fold into its Doc impact consolidation), or the next deploy-machinery phase | `works/deferred/open/D24` |
| `D25` | `deferred` | Server-rendered PDF export (headless Chromium) for documents | P28.DECOMP | someone needs a downloadable PDF file or agent/curl access to PDFs, or print output proves inconsistent across browsers | `works/deferred/open/D25` |
| `D27` | `deferred` | Decide whether a closing consistency-sweep design round 07 is wanted | P27.REVIEW | If P28's apply reveals cross-round drift the four contracts do not settle; otherwise close as 'no sweep'. | `works/deferred/open/D27` |
| `D28` | `deferred` | Operator copy decision: adopt round 03 card 14's error / not-found / empty strings verbatim? | P27.REVIEW | When P28 cuts the slice implementing the system-wide states (.kb-editorial / .kb-empty). | `works/deferred/open/D28` |
| `D29` | `deferred` | Operator copy decision: adopt round 05's new graph strings, including the Korean halves? | P27.REVIEW | When P28 cuts the graph apply slice, before the strings land in web/src/content/graph.ts. | `works/deferred/open/D29` |
| `D30` | `deferred` | Operator copy decision: adopt round 06's nineteen document/print strings, and should they be bilingual? | P27.REVIEW | When P28 cuts the document-views apply slice, before the strings land in web/src/content/documents.ts. | `works/deferred/open/D30` |
| `D31` | `deferred` | Retire round 06's card group label in the Knowledge Base Design System project | P27.REVIEW | The next DesignSync session that opens project 623bb4ea-8fb7-4d31-9d58-5c6a42709bbe. | `works/deferred/open/D31` |
| `D32` | `deferred` | Member auth guard bounces to /login with no return address | P28.REVIEW | The next auth/session phase, or the first operator complaint | `works/deferred/open/D32` |
| `D33` | `deferred` | The graph page is not a .kb-page-flow | P28.REVIEW | The next console/graph slice touching (app)/graph/page.tsx | `works/deferred/open/D33` |
| `D34` | `deferred` | Landing hero is clipped at phone widths | P28.REVIEW | The next marketing/landing design round | `works/deferred/open/D34` |
| `D35` | `deferred` | scripts/site_smoke.py fails on a clean checkout | P28.REVIEW | The next docs-site or QA phase | `works/deferred/open/D35` |
| `D4` | `deferred` | Agent-published commits are authored kb-api <kb-api@localhost> in public repo history | P8.S5 | operator decides they want attributable agent commits | `works/deferred/open/D4` |
| `D5` | `deferred` | Refresh the public explainer docs/hi2vi_web/2026-07-02-shared-nginx-explained.md — it describes a superseded edge topology | P8.F2 | operator wants the public explainer to match reality (it is a content doc, out of scope for P8's durable-doc versioning) | `works/deferred/open/D5` |
| `D7` | `deferred` | Off-box backup/snapshot for on-box-only tenant content (tenants/<uuid>/) | P10.REVIEW | Before any non-#1 tenant carries real data at scale (i.e., before onboarding real active non-operator tenants). | `works/deferred/open/D7` |
| `D8` | `deferred` | usage_events retention/cleanup job | P11.DECOMP | usage_events growth becomes material / before onboarding high-volume non-#1 tenants | `works/deferred/open/D8` |

## Promoted

| ID | Status | Title | Promoted To | Path |
|---|---|---|---|---|
| `D1` | `promoted` | Decide whether works/docs internals appear on the public site | `P4.S5` | `works/deferred/promoted/D1` |
| `D16` | `promoted` | knowledge init --project other re-mints an org key (reuse-gate relaxation) | `P20.S1` | `works/deferred/promoted/D16` |
| `D19` | `promoted` | Org slug vanity URLs for the public graph | `P25.S4` | `works/deferred/promoted/D19` |
| `D2` | `promoted` | Design polish for the Pages site (palette/fonts/logo, optional extra_css) | `P5.S1` | `works/deferred/promoted/D2` |
| `D9` | `promoted` | plugin/templates/kb drift: P10-P12 SaaS server files unshipped, plugin_parity exits 1 | `P17.S4` | `works/deferred/promoted/D9` |

## Dropped

| ID | Status | Title | Reason | Path |
|---|---|---|---|---|
| `D10` | `dropped` | Landing feature-section lede copy | Resolved by design round 02 (P20.S2): the round-01 cards' feature ledes are quoted verbatim in build-prompt-02 §D10 for content.ts; P20.S3 implements them. Closed as done, not abandoned. | `works/deferred/dropped/D10` |
| `D15` | `dropped` | Fix pre-existing P16-era gated failure: documents list projection format key (test_documents_api) | Stale: the same job as D21 -- test_documents_list_detail_and_project_bridge failing on a missing 'format' key, fixed in P23 (062c041). P28.S1 and P28.REVIEW both ran the full gated suite green (128 passed, 0 skipped). | `works/deferred/dropped/D15` |
| `D21` | `dropped` | Fix pre-existing format-key failure in test_documents_list_detail_and_project_bridge | Stale duplicate of D15, same root cause, fixed in P23 (062c041); the full gated suite passed 128/0 in P28.REVIEW. | `works/deferred/dropped/D21` |
| `D26` | `dropped` | Capture the off-frame graph screenshot before P28 implements the graph | Satisfied, not abandoned: the operator supplied both screenshots on 2026-09-21 (Mac Chrome /graph and iPhone, both pre-P28 production). Committed to works/phases/active/P28/diagnostics/D26-{desktop-graph-mac-chrome.png,mobile-graph-iphone.jpeg} and read into the P28.S6 note in phase.md with ranked hypotheses. The graph apply slice now has the evidence the round-05 design never got. | `works/deferred/dropped/D26` |
| `D3` | `dropped` | Revoke orphan GitHub deploy key 157264706 (knowledge-api@oci) + delete its stray private half from the repo working tree | Completed by the operator (2026-07-15): ran 'gh repo deploy-key delete 157264706' (orphan knowledge-api@oci revoked) and removed ./knowledge_deploy_key* from the working tree. The box authenticates with the separate on-box key knowledge-api@oci-box (157267945). No key material remains in the repo. Closed as done, not abandoned. | `works/deferred/dropped/D3` |
| `D6` | `dropped` | Paid-plan retriever endpoint for external AI agents | Superseded by P15 (Agent-facing retrieval MCP service). P15 builds the external-agent retriever surface D6 anticipated — an MCP search/fetch_document service over Streamable-HTTP, vk_-scoped per project, dual-reachable (internal service-name + public edge). The retriever interface now exists. D6's remaining aspect — actually charging for it (a paid plan / gating the MCP surface) — is a separate business + billing decision P15 does not build; the P11 usage-event metering is the substrate for it when the operator introduces a paid plan. That monetization step is re-captured as a new, narrower deferred job. | `works/deferred/dropped/D6` |

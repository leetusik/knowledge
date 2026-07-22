# Deferred Jobs

> Generated dashboard. Do not put detailed deferred context here; edit each `works/deferred/<state>/<DID>/` folder instead.

## Summary

- Open: `14`
- Promoted: `4`
- Dropped: `2`
- Rebuilt at: `2026-07-22T16:30:29+09:00`

## Open

| ID | Status | Title | Source | Trigger | Path |
|---|---|---|---|---|---|
| `D10` | `deferred` | Landing feature-section lede copy | P14.REVIEW | operator provides copy / next design round | `works/deferred/open/D10` |
| `D11` | `deferred` | Production Deploy: reconcile box clone before invoking deploy.sh (self-upgrade trap) | P14.S3 | next time the deploy machinery's compose service set or health-gate changes | `works/deferred/open/D11` |
| `D12` | `deferred` | Monetize the MCP retriever: introduce the paid plan + gate the agent-facing retrieval surface | P15.DECOMP | operator decides to introduce the paid plan | `works/deferred/open/D12` |
| `D13` | `deferred` | source_url (public-origin) field + ingester population | P15.S1 | public-scraping/ingestion features land, or clickable citations become required for a consumer (e.g. OpenClaw's citation chip) | `works/deferred/open/D13` |
| `D14` | `deferred` | Org management: create additional orgs + invite members | P18 | operator asks for multi-org/team features, or a second member needs org access | `works/deferred/open/D14` |
| `D15` | `deferred` | Fix pre-existing P16-era gated failure: documents list projection format key (test_documents_api) | P18.S1 | next documents-plane slice, or before wiring Postgres-gated tests into CI | `works/deferred/open/D15` |
| `D17` | `deferred` | Rate-limit the anonymous read surface (public doc/raw/graph) | P19.REVIEW | Before promoting public links to real traffic, or at first sign of scraping/abuse on the anonymous surface | `works/deferred/open/D17` |
| `D18` | `deferred` | Login returnTo + public tag surface for public-graph tag links | P19.REVIEW | Next web UX slice, or operator/user reports friction on shared links | `works/deferred/open/D18` |
| `D19` | `deferred` | Org slug vanity URLs for the public graph | P19.REVIEW | Operator wants pretty share URLs, or org management features (D14) land | `works/deferred/open/D19` |
| `D20` | `deferred` | Windows install.ps1 (PowerShell curl-installer equivalent) | P20.DECOMP | Windows onboarding demand / operator asks | `works/deferred/open/D20` |
| `D4` | `deferred` | Agent-published commits are authored kb-api <kb-api@localhost> in public repo history | P8.S5 | operator decides they want attributable agent commits | `works/deferred/open/D4` |
| `D5` | `deferred` | Refresh the public explainer docs/hi2vi_web/2026-07-02-shared-nginx-explained.md — it describes a superseded edge topology | P8.F2 | operator wants the public explainer to match reality (it is a content doc, out of scope for P8's durable-doc versioning) | `works/deferred/open/D5` |
| `D7` | `deferred` | Off-box backup/snapshot for on-box-only tenant content (tenants/<uuid>/) | P10.REVIEW | Before any non-#1 tenant carries real data at scale (i.e., before onboarding real active non-operator tenants). | `works/deferred/open/D7` |
| `D8` | `deferred` | usage_events retention/cleanup job | P11.DECOMP | usage_events growth becomes material / before onboarding high-volume non-#1 tenants | `works/deferred/open/D8` |

## Promoted

| ID | Status | Title | Promoted To | Path |
|---|---|---|---|---|
| `D1` | `promoted` | Decide whether works/docs internals appear on the public site | `P4.S5` | `works/deferred/promoted/D1` |
| `D16` | `promoted` | knowledge init --project other re-mints an org key (reuse-gate relaxation) | `P20.S1` | `works/deferred/promoted/D16` |
| `D2` | `promoted` | Design polish for the Pages site (palette/fonts/logo, optional extra_css) | `P5.S1` | `works/deferred/promoted/D2` |
| `D9` | `promoted` | plugin/templates/kb drift: P10-P12 SaaS server files unshipped, plugin_parity exits 1 | `P17.S4` | `works/deferred/promoted/D9` |

## Dropped

| ID | Status | Title | Reason | Path |
|---|---|---|---|---|
| `D3` | `dropped` | Revoke orphan GitHub deploy key 157264706 (knowledge-api@oci) + delete its stray private half from the repo working tree | Completed by the operator (2026-07-15): ran 'gh repo deploy-key delete 157264706' (orphan knowledge-api@oci revoked) and removed ./knowledge_deploy_key* from the working tree. The box authenticates with the separate on-box key knowledge-api@oci-box (157267945). No key material remains in the repo. Closed as done, not abandoned. | `works/deferred/dropped/D3` |
| `D6` | `dropped` | Paid-plan retriever endpoint for external AI agents | Superseded by P15 (Agent-facing retrieval MCP service). P15 builds the external-agent retriever surface D6 anticipated — an MCP search/fetch_document service over Streamable-HTTP, vk_-scoped per project, dual-reachable (internal service-name + public edge). The retriever interface now exists. D6's remaining aspect — actually charging for it (a paid plan / gating the MCP surface) — is a separate business + billing decision P15 does not build; the P11 usage-event metering is the substrate for it when the operator introduces a paid plan. That monetization step is re-captured as a new, narrower deferred job. | `works/deferred/dropped/D6` |

# Deferred Jobs

> Generated dashboard. Do not put detailed deferred context here; edit each `works/deferred/<state>/<DID>/` folder instead.

## Summary

- Open: `9`
- Promoted: `2`
- Dropped: `2`
- Rebuilt at: `2026-07-21T15:30:35+09:00`

## Open

| ID | Status | Title | Source | Trigger | Path |
|---|---|---|---|---|---|
| `D10` | `deferred` | Landing feature-section lede copy | P14.REVIEW | operator provides copy / next design round | `works/deferred/open/D10` |
| `D11` | `deferred` | Production Deploy: reconcile box clone before invoking deploy.sh (self-upgrade trap) | P14.S3 | next time the deploy machinery's compose service set or health-gate changes | `works/deferred/open/D11` |
| `D12` | `deferred` | Monetize the MCP retriever: introduce the paid plan + gate the agent-facing retrieval surface | P15.DECOMP | operator decides to introduce the paid plan | `works/deferred/open/D12` |
| `D13` | `deferred` | source_url (public-origin) field + ingester population | P15.S1 | public-scraping/ingestion features land, or clickable citations become required for a consumer (e.g. OpenClaw's citation chip) | `works/deferred/open/D13` |
| `D4` | `deferred` | Agent-published commits are authored kb-api <kb-api@localhost> in public repo history | P8.S5 | operator decides they want attributable agent commits | `works/deferred/open/D4` |
| `D5` | `deferred` | Refresh the public explainer docs/hi2vi_web/2026-07-02-shared-nginx-explained.md — it describes a superseded edge topology | P8.F2 | operator wants the public explainer to match reality (it is a content doc, out of scope for P8's durable-doc versioning) | `works/deferred/open/D5` |
| `D7` | `deferred` | Off-box backup/snapshot for on-box-only tenant content (tenants/<uuid>/) | P10.REVIEW | Before any non-#1 tenant carries real data at scale (i.e., before onboarding real active non-operator tenants). | `works/deferred/open/D7` |
| `D8` | `deferred` | usage_events retention/cleanup job | P11.DECOMP | usage_events growth becomes material / before onboarding high-volume non-#1 tenants | `works/deferred/open/D8` |
| `D9` | `deferred` | plugin/templates/kb drift: P10-P12 SaaS server files unshipped, plugin_parity exits 1 | P13.DECOMP | before the next push to origin/main (plugin-ci.yml turns red on the first push carrying the P10-P12 commits) | `works/deferred/open/D9` |

## Promoted

| ID | Status | Title | Promoted To | Path |
|---|---|---|---|---|
| `D1` | `promoted` | Decide whether works/docs internals appear on the public site | `P4.S5` | `works/deferred/promoted/D1` |
| `D2` | `promoted` | Design polish for the Pages site (palette/fonts/logo, optional extra_css) | `P5.S1` | `works/deferred/promoted/D2` |

## Dropped

| ID | Status | Title | Reason | Path |
|---|---|---|---|---|
| `D3` | `dropped` | Revoke orphan GitHub deploy key 157264706 (knowledge-api@oci) + delete its stray private half from the repo working tree | Completed by the operator (2026-07-15): ran 'gh repo deploy-key delete 157264706' (orphan knowledge-api@oci revoked) and removed ./knowledge_deploy_key* from the working tree. The box authenticates with the separate on-box key knowledge-api@oci-box (157267945). No key material remains in the repo. Closed as done, not abandoned. | `works/deferred/dropped/D3` |
| `D6` | `dropped` | Paid-plan retriever endpoint for external AI agents | Superseded by P15 (Agent-facing retrieval MCP service). P15 builds the external-agent retriever surface D6 anticipated — an MCP search/fetch_document service over Streamable-HTTP, vk_-scoped per project, dual-reachable (internal service-name + public edge). The retriever interface now exists. D6's remaining aspect — actually charging for it (a paid plan / gating the MCP surface) — is a separate business + billing decision P15 does not build; the P11 usage-event metering is the substrate for it when the operator introduces a paid plan. That monetization step is re-captured as a new, narrower deferred job. | `works/deferred/dropped/D6` |

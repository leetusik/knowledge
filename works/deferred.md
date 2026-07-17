# Deferred Jobs

> Generated dashboard. Do not put detailed deferred context here; edit each `works/deferred/<state>/<DID>/` folder instead.

## Summary

- Open: `6`
- Promoted: `2`
- Dropped: `1`
- Rebuilt at: `2026-07-17T16:54:01+09:00`

## Open

| ID | Status | Title | Source | Trigger | Path |
|---|---|---|---|---|---|
| `D4` | `deferred` | Agent-published commits are authored kb-api <kb-api@localhost> in public repo history | P8.S5 | operator decides they want attributable agent commits | `works/deferred/open/D4` |
| `D5` | `deferred` | Refresh the public explainer docs/hi2vi_web/2026-07-02-shared-nginx-explained.md — it describes a superseded edge topology | P8.F2 | operator wants the public explainer to match reality (it is a content doc, out of scope for P8's durable-doc versioning) | `works/deferred/open/D5` |
| `D6` | `deferred` | Paid-plan retriever endpoint for external AI agents | operator (P10-P14 SaaS pivot intent) | operator decides to introduce the paid plan | `works/deferred/open/D6` |
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

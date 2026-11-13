# Deferred Jobs

> Generated dashboard. Do not put detailed deferred context here; edit each `works/deferred/<state>/<DID>/` folder instead.

## Summary

- Open: `89`
- Promoted: `6`
- Dropped: `20`

## Open

| ID | Status | Title | Source | Trigger | Path |
|---|---|---|---|---|---|
| `D4` | `deferred` | Agent-published commits are authored kb-api <kb-api@localhost> in public repo history | P8.S5 | operator decides they want attributable agent commits | `works/deferred/open/D4` |
| `D5` | `deferred` | Refresh the public explainer docs/hi2vi_web/2026-07-02-shared-nginx-explained.md — it describes a superseded edge topology | P8.F2 | operator wants the public explainer to match reality (it is a content doc, out of scope for P8's durable-doc versioning) | `works/deferred/open/D5` |
| `D7` | `deferred` | Off-box backup/snapshot for on-box-only tenant content (tenants/<uuid>/) | P10.REVIEW | Before any non-#1 tenant carries real data at scale (i.e., before onboarding real active non-operator tenants). | `works/deferred/open/D7` |
| `D8` | `deferred` | usage_events retention/cleanup job | P11.DECOMP | usage_events growth becomes material / before onboarding high-volume non-#1 tenants | `works/deferred/open/D8` |
| `D11` | `deferred` | Production Deploy: reconcile box clone before invoking deploy.sh (self-upgrade trap) | P14.S3 | next time the deploy machinery's compose service set or health-gate changes | `works/deferred/open/D11` |
| `D12` | `deferred` | Monetize the MCP retriever: introduce the paid plan + gate the agent-facing retrieval surface | P15.DECOMP | operator decides to introduce the paid plan | `works/deferred/open/D12` |
| `D13` | `deferred` | source_url (public-origin) field + ingester population | P15.S1 | public-scraping/ingestion features land, or clickable citations become required for a consumer (e.g. OpenClaw's citation chip) | `works/deferred/open/D13` |
| `D14` | `deferred` | Org management: create additional orgs + invite members | P18 | operator asks for multi-org/team features, or a second member needs org access | `works/deferred/open/D14` |
| `D17` | `deferred` | Rate-limit the anonymous read surface (public doc/raw/graph) | P19.REVIEW | Before promoting public links to real traffic, or at first sign of scraping/abuse on the anonymous surface | `works/deferred/open/D17` |
| `D20` | `deferred` | Windows install.ps1 (PowerShell curl-installer equivalent) | P20.DECOMP | Windows onboarding demand / operator asks | `works/deferred/open/D20` |
| `D22` | `deferred` | Repo-wide prettier drift (51 files at clean HEAD) | P21.REVIEW | Operator decides format:check should become a real gate | `works/deferred/open/D22` |
| `D23` | `deferred` | Bound the Gemini embed on the publish worker | P24.REVIEW | When adding timeouts/retries to embeddings or touching server/publish.py next | `works/deferred/open/D23` |
| `D24` | `deferred` | Version durable docs for the automated alembic step in deploy.sh (operations/data/decisions still say manual) | P25.REVIEW | Next phase review (fold into its Doc impact consolidation), or the next deploy-machinery phase | `works/deferred/open/D24` |
| `D25` | `deferred` | Server-rendered PDF export (headless Chromium) for documents | P28.DECOMP | someone needs a downloadable PDF file or agent/curl access to PDFs, or print output proves inconsistent across browsers | `works/deferred/open/D25` |
| `D28` | `deferred` | Operator copy decision: adopt round 03 card 14's error / not-found / empty strings verbatim? | P27.REVIEW | When P28 cuts the slice implementing the system-wide states (.kb-editorial / .kb-empty). | `works/deferred/open/D28` |
| `D29` | `deferred` | Operator copy decision: adopt round 05's new graph strings, including the Korean halves? | P27.REVIEW | When P28 cuts the graph apply slice, before the strings land in web/src/content/graph.ts. | `works/deferred/open/D29` |
| `D30` | `deferred` | Operator copy decision: adopt round 06's nineteen document/print strings, and should they be bilingual? | P27.REVIEW | When P28 cuts the document-views apply slice, before the strings land in web/src/content/documents.ts. | `works/deferred/open/D30` |
| `D33` | `deferred` | The graph page is not a .kb-page-flow | P28.REVIEW | The next console/graph slice touching (app)/graph/page.tsx | `works/deferred/open/D33` |
| `D34` | `deferred` | Landing hero is clipped at phone widths | P28.REVIEW | The next marketing/landing design round | `works/deferred/open/D34` |
| `D35` | `deferred` | scripts/site_smoke.py fails on a clean checkout | P28.REVIEW | The next docs-site or QA phase | `works/deferred/open/D35` |
| `D36` | `deferred` | P28 gate decisions were closed at their defaults — nine open rulings, unwalked | P28.REVIEW | The operator's first real walk of the console on a phone/iPad/Safari, or the next console or design phase -- whichever comes first | `works/deferred/open/D36` |
| `D41` | `deferred` | Review: a way back for suspended cards | P29.REVIEW | a reader asks to restore a suspended card, or the operator wants it in v1 at P30's DECOMP | `works/deferred/open/D41` |
| `D42` | `deferred` | Review: an entry point from the quiz's save line | P29.REVIEW | after P30 ships Review, the operator wants a direct path from a quiz into the queue | `works/deferred/open/D42` |
| `D43` | `deferred` | Legacy reader: a bridge restore by pixels | P29.REVIEW | a report that the legacy reader resumes on the wrong screen on the same device | `works/deferred/open/D43` |
| `D44` | `deferred` | App shell: the topbar scrolls sideways at 390 px with 175–200% text; the rail fold re-flows the page | P29.REVIEW | the next console or app-shell design round, or D36's device walk, whichever comes first | `works/deferred/open/D44` |
| `D45` | `deferred` | Sync the kb design system from code once P30 ships the reader values | P29.REVIEW | P30's review passes, or the next design round needs these on a canvas | `works/deferred/open/D45` |
| `D46` | `deferred` | Design records: no absolute scratchpad paths in committed handoffs and critiques | P29.REVIEW | the next workspace update that touches design-critic or design-cowork | `works/deferred/open/D46` |
| `D47` | `deferred` | A private content remote for tenant #1 | P30.DECOMP | The operator's word, or the first private subject book. | `works/deferred/open/D47` |
| `D48` | `deferred` | Match the 3:1 control edge on annotations' and review's remaining controls | P30.S1 | The first accessibility or QA pass on the reader, or the next design round on 05-annotations or 08-review, whichever comes first. | `works/deferred/open/D48` |
| `D49` | `deferred` | Sources note as inline Markdown | P30.S16 | An author needs a link or emphasis in a source note | `works/deferred/open/D49` |
| `D50` | `deferred` | Per-version publish date on book and version reads | P30.S23 | A reader needs to tell versions apart by date, or the next version-chain change | `works/deferred/open/D50` |
| `D51` | `deferred` | Redirect past-version page to the reader and retire the old print layer | P30.S26 | The nonce-less page script is fixed, or the next change to the version page | `works/deferred/open/D51` |
| `D52` | `deferred` | Review: delete a single card | P30.REVIEW | The next review-surface or privacy change | `works/deferred/open/D52` |
| `D53` | `deferred` | Mark as unread across a chapter's languages | P30.REVIEW | Reading KO/EN variants in earnest | `works/deferred/open/D53` |
| `D54` | `deferred` | A marks-only timeline lane needs bars: [] | P30.REVIEW | The next native-format or /explain change | `works/deferred/open/D54` |
| `D55` | `deferred` | Not-found book and chapter pages answer HTTP 200 | P30.REVIEW | SEO, monitoring, or a status-sensitive client | `works/deferred/open/D55` |
| `D56` | `deferred` | Stored reader unit lags after a hand-edited manifest | P30.REVIEW | Hand-edited manifests, or the next reader-state phase | `works/deferred/open/D56` |
| `D57` | `deferred` | Reindex production after the P30 deploy so charts get search text | P30.REVIEW | Right after the P30 production deploy (could be a runbook step) | `works/deferred/open/D57` |
| `D58` | `deferred` | site_smoke and the MkDocs checklist lines fail on this checkout | P30.REVIEW | The next QA-sweep or docs phase | `works/deferred/open/D58` |
| `D59` | `deferred` | Review loading and error top bar lacks Settings and Display | P30.REVIEW | The next change to the review surface | `works/deferred/open/D59` |
| `D60` | `deferred` | no-transform on the server's /app raw routes | P30.REVIEW | The next change to the raw routes or the edge | `works/deferred/open/D60` |
| `D61` | `deferred` | Migration and smoke raw checks tolerate Cloudflare email obfuscation | P30.REVIEW | The next use of migrate_books.py or a raw-content smoke check | `works/deferred/open/D61` |
| `D62` | `deferred` | /library signed-out bounce lacks next= | P30.REVIEW | The next auth or library change | `works/deferred/open/D62` |
| `D63` | `deferred` | Redaction reaches past versions | P30.REVIEW | The next privacy or redaction request, or a version-delete feature | `works/deferred/open/D63` |
| `D64` | `deferred` | Pages with their own CSS keep the previous page's scroll position on a client navigation | P30.F6 | The next book-page or library slice, or a decision to try experimental.appNewScrollHandler app-wide | `works/deferred/open/D64` |
| `D65` | `deferred` | CLI line numbers are body-relative for files with a --- header | P31.REVIEW | Someone fixes a headered file by the printed line numbers | `works/deferred/open/D65` |
| `D66` | `deferred` | A missing FILE exits 1 under knowledge check | P31.REVIEW | An agent loops on fix the listed lines | `works/deferred/open/D66` |
| `D67` | `deferred` | Cross-vendor critic for explain chapters | P32 intake | P32 has shipped, and the operator asks for it, or the Claude verifier or critic is seen missing errors a different vendor's model would catch | `works/deferred/open/D67` |
| `D68` | `deferred` | Landing SKILL.md rejected by claude.ai skill upload (argument-hint) | P32.S3 | When claude.ai upload of the landing SKILL.md matters, or the next change to the three-copy parity rule | `works/deferred/open/D68` |
| `D69` | `deferred` | explain: teach the plugin's §1 placement minted phase ids (P-7kq2) | P32.REVIEW | the first book on a minted id after the bootstrap applies P32's package, or the next §1 change | `works/deferred/open/D69` |
| `D70` | `deferred` | explain: move the publish plumbing into the CLI and shrink the skill | P32.REVIEW | the next publish-step change, or the skill passing about 160 KB | `works/deferred/open/D70` |
| `D71` | `deferred` | Server-side draft state for books and chapters | P32.REVIEW | the operator asks, or a book run needs drafts on the server | `works/deferred/open/D71` |
| `D74` | `deferred` | Landing: derive the skill pane's line count from the served SKILL.md | P32.REVIEW | the next SKILL.md edit that changes its line count after P32 | `works/deferred/open/D74` |
| `D77` | `deferred` | explain book: the outline gate's report runs ~3.7k chars against the ~2k stop rule | P32.REVIEW | the next bootstrap update that touches explain-decomposition.md | `works/deferred/open/D77` |
| `D78-rq` | `deferred` | Explain front door: landing framing and wording follow-up | P33-n3.REVIEW | the operator's rewording, or the next plugin release (0.7.1) | `works/deferred/open/D78-rq` |
| `D79-we` | `deferred` | Delete the vendored .claude/skills/explain/ | P33-n3.REVIEW | the operator's word, or the next /update-workspace | `works/deferred/open/D79-we` |
| `D81-aa` | `deferred` | Teach the private-project matcher HTML card links | P34-n0.REVIEW | before a card is added for a project, or before any project is set public again | `works/deferred/open/D81-aa` |
| `D82-kq` | `deferred` | Let the site build pass on a KB with no public project | P34-n0.REVIEW | when the operator wants a green push, or the red check gets in the way | `works/deferred/open/D82-kq` |
| `D83-5s` | `deferred` | Off-box backup for tenant #1's documents | P34-n0.REVIEW | operator's word (P34-n0 OQ6, accepted as drawn: file now); at the latest before the next document of value is written | `works/deferred/open/D83-5s` |
| `D85-qk` | `deferred` | Workspace follow-ups for 0.9.0 explain runs (bootstrap repo) | P38-e1.REVIEW | the operator's answer to OQ1 at P38-e1's acceptance gate, or the next /update-workspace | `works/deferred/open/D85-qk` |
| `D86-sd` | `deferred` | Explain skill wording follow-up after 0.9.0 | P38-e1.REVIEW | the start of P39-hk (which edits the same skill), or the next plugin release | `works/deferred/open/D86-sd` |
| `D87-2g` | `deferred` | Setup's verify step puts the pasted KB key on the command line | P38-e1.REVIEW | the next edit of the setup skill, or the operator's word | `works/deferred/open/D87-2g` |
| `D88-gd` | `deferred` | Landing hero h1 overflows at 390px | P37-1p.REVIEW | the next landing or marketing phase, or before a phone-focused launch | `works/deferred/open/D88-gd` |
| `D89-zf` | `deferred` | Graph leftovers tidy-up | P37-1p.REVIEW | the next slice touching db.py, reader_api.py, books_api.py or the redirect routes, or a docs phase | `works/deferred/open/D89-zf` |
| `D90-ke` | `deferred` | design-preview crashes writing preview.json on a split math italic character | P39-hk.REVIEW (from D1) | the next design round with math, or the next engine change in the bootstrap repo | `works/deferred/open/D90-ke` |
| `D91-j2` | `deferred` | design-sign mis-parses a multi-line open_items: in SIGNOFF.md | P39-hk.REVIEW (from D1) | the next design-close with a multi-line open_items list | `works/deferred/open/D91-j2` |
| `D92-dc` | `deferred` | phase-section --to-topic leaves relative links stale in the moved block | P39-hk.REVIEW (from DECOMP2, F6, F7) | the next --to-topic move of an entry with a relative link, or the next engine change in the bootstrap repo | `works/deferred/open/D92-dc` |
| `D93-k1` | `deferred` | Re-sync the kb Design System from code after the reading aids (S8, S9) | P39-hk.REVIEW (from S8, S9) | a session that can open the kb system, before the next reader design job | `works/deferred/open/D93-k1` |
| `D94-cp` | `deferred` | Re-run the explain front door under claude -p in a workspace on v94 | P39-hk.REVIEW round 3 | /update-workspace to v94 here, after P39-hk merges | `works/deferred/open/D94-cp` |
| `D95-y7` | `deferred` | P30's reader chrome and the quiz at large text on a phone | P39-hk OQ21 (operator: accept) | the next reader-chrome design job, or a QA sweep at large text | `works/deferred/open/D95-y7` |
| `D96-r0` | `deferred` | The console at 200% text | P39-hk OQ22 (operator: accept) | the next P28 console change, or a QA sweep at large text | `works/deferred/open/D96-r0` |
| `D97-x6` | `deferred` | Show a stored quote with math as text in the notes lists | P39-hk OQ23 (operator: all as your recommendations) | the next notes-list change, or the first chapter whose highlights cross formulas | `works/deferred/open/D97-x6` |
| `D98-mj` | `deferred` | A heading with no authored id takes a new id in each version, orphaning its marks | P39-hk.REVIEW rounds 2-3 (observation outside the boundary) | the next native-ingest change, or the first report of a lost highlight | `works/deferred/open/D98-mj` |
| `D99-s9` | `deferred` | A place name's own name and language, everywhere the reader names a section | P39-hk.REVIEW round 3 (F7's observations; walkthrough decision 2) | the next reader-chrome or notes change, or the first VoiceOver report | `works/deferred/open/D99-s9` |
| `D100-6q` | `deferred` | Deploy the knowledge server with plugin 0.10.0's grammar | P40-2t.REVIEW | Now: P59-d8's publish waits on it; before the next book publishes | `works/deferred/open/D100-6q` |
| `D101-m7` | `deferred` | Re-run the explain front door under claude -p on a v96 workspace (supersedes D94-cp) | P40-2t.REVIEW | /update-workspace to v96 here, after the bootstrap release and P40-2t's merge | `works/deferred/open/D101-m7` |
| `D102-cs` | `deferred` | Give the chained explain an on-disk trigger | P40-2t.REVIEW | The first chained research run, or a resume that misses it | `works/deferred/open/D102-cs` |
| `D103-gz` | `deferred` | Retire regression checklist line 30, the verifier's same-model guard | P40-2t.REVIEW | The next docs or QA phase | `works/deferred/open/D103-gz` |
| `D104-vm` | `deferred` | Listen: choose among several voice models (per language, server or Mac) | P41-sr (voice pick, after R5) | The operator wants a different or a second voice, for example a native Korean voice, or a server-side voice so that nothing waits for the Mac. | `works/deferred/open/D104-vm` |
| `D105-y8` | `deferred` | Listen: a private podcast feed for books | P41-sr.R3 OQ2, signed at D1 | The web player fails the operator's screen-off iPhone check at P41-sr's acceptance, or the operator asks for offline listening. | `works/deferred/open/D105-y8` |
| `D106-wd` | `deferred` | Listen audio cleanup: orphaned rows and files | P41-sr.B1 result.md § Open edges | The box disk budget tightens, or a document-delete or retention pass is planned | `works/deferred/open/D106-wd` |
| `D107-he` | `deferred` | Listen part grouping that stays stable across edits | P41-sr.B1 result.md § Open edges | Re-rendering after edits is noticeably slow or wasteful on the Mac runner | `works/deferred/open/D107-he` |
| `D108-5s` | `deferred` | Reader pagehide beacon has no edge route in production | P41-sr.B2 planning (orchestrator observation) | Next deploy-config change, or the reader's last position on leaving is found stale on production | `works/deferred/open/D108-5s` |
| `D109-vn` | `deferred` | Listen claim carries each segment's section and kind | P41-sr.B3 result.md, deviation 2 | Pauses land in the wrong places in made audio, or a later voice needs the block kind | `works/deferred/open/D109-vn` |
| `D110-g9` | `deferred` | Listen: a reload shows the position the pagehide beacon saved | P41-sr.REVIEW round 1 (slices/P41-sr.W1/result.md § Chrome run) | a replayed stretch is noticed after a reload, or the next Listen position work | `works/deferred/open/D110-g9` |
| `D111-2q` | `deferred` | Listen: a short first part so playback starts in under a minute | P41-sr.REVIEW OQ4 | The operator wants Listen to start sooner on a new document | `works/deferred/open/D111-2q` |
| `D-pzs7` | `deferred` | Retire or redirect the orphaned document archive page | P-8jbf.DECOMP | the next reader or documents phase | `works/deferred/open/D-pzs7` |
| `D-19n8` | `deferred` | Quiz Show answer button overflows a 390 phone at 200% root text | P-8jbf.REVIEW | the next reader or quiz phase, or a QA sweep | `works/deferred/open/D-19n8` |
| `D-6pf9` | `deferred` | A long table's box state depends on resize history | P-8jbf.F1 | the next reader-tables phase or a QA sweep | `works/deferred/open/D-6pf9` |

## Promoted

| ID | Status | Title | Promoted To | Path |
|---|---|---|---|---|
| `D1` | `promoted` | Decide whether works/docs internals appear on the public site | `P4.S5` | `works/deferred/promoted/D1` |
| `D2` | `promoted` | Design polish for the Pages site (palette/fonts/logo, optional extra_css) | `P5.S1` | `works/deferred/promoted/D2` |
| `D9` | `promoted` | plugin/templates/kb drift: P10-P12 SaaS server files unshipped, plugin_parity exits 1 | `P17.S4` | `works/deferred/promoted/D9` |
| `D16` | `promoted` | knowledge init --project other re-mints an org key (reuse-gate relaxation) | `P20.S1` | `works/deferred/promoted/D16` |
| `D19` | `promoted` | Org slug vanity URLs for the public graph | `P25.S4` | `works/deferred/promoted/D19` |
| `D-32rc` | `promoted` | Rewrite the knowledge plugin's explain skill as the explain-phase front door (P-9sz6 handoff §7) | `P33-n3.S1` | `works/deferred/promoted/D-32rc` |

## Dropped

| ID | Status | Title | Reason | Path |
|---|---|---|---|---|
| `D3` | `dropped` | Revoke orphan GitHub deploy key 157264706 (knowledge-api@oci) + delete its stray private half from the repo working tree | Completed by the operator (2026-07-15): ran 'gh repo deploy-key delete 157264706' (orphan knowledge-api@oci revoked) and removed ./knowledge_deploy_key* from the working tree. The box authenticates with the separate on-box key knowledge-api@oci-box (157267945). No key material remains in the repo. Closed as done, not abandoned. | `works/deferred/dropped/D3` |
| `D6` | `dropped` | Paid-plan retriever endpoint for external AI agents | Superseded by P15 (Agent-facing retrieval MCP service). P15 builds the external-agent retriever surface D6 anticipated — an MCP search/fetch_document service over Streamable-HTTP, vk_-scoped per project, dual-reachable (internal service-name + public edge). The retriever interface now exists. D6's remaining aspect — actually charging for it (a paid plan / gating the MCP surface) — is a separate business + billing decision P15 does not build; the P11 usage-event metering is the substrate for it when the operator introduces a paid plan. That monetization step is re-captured as a new, narrower deferred job. | `works/deferred/dropped/D6` |
| `D10` | `dropped` | Landing feature-section lede copy | Resolved by design round 02 (P20.S2): the round-01 cards' feature ledes are quoted verbatim in build-prompt-02 §D10 for content.ts; P20.S3 implements them. Closed as done, not abandoned. | `works/deferred/dropped/D10` |
| `D15` | `dropped` | Fix pre-existing P16-era gated failure: documents list projection format key (test_documents_api) | Stale: the same job as D21 -- test_documents_list_detail_and_project_bridge failing on a missing 'format' key, fixed in P23 (062c041). P28.S1 and P28.REVIEW both ran the full gated suite green (128 passed, 0 skipped). | `works/deferred/dropped/D15` |
| `D18` | `dropped` | Login returnTo + public tag surface for public-graph tag links | Shipped in P30.S11: guard bounces carry /login?next=, anonymous misses return to the page (closed at P30.REVIEW) | `works/deferred/dropped/D18` |
| `D21` | `dropped` | Fix pre-existing format-key failure in test_documents_list_detail_and_project_bridge | Stale duplicate of D15, same root cause, fixed in P23 (062c041); the full gated suite passed 128/0 in P28.REVIEW. | `works/deferred/dropped/D21` |
| `D26` | `dropped` | Capture the off-frame graph screenshot before P28 implements the graph | Satisfied, not abandoned: the operator supplied both screenshots on 2026-09-21 (Mac Chrome /graph and iPhone, both pre-P28 production). Committed to works/phases/active/P28/diagnostics/D26-{desktop-graph-mac-chrome.png,mobile-graph-iphone.jpeg} and read into the P28.S6 note in phase.md with ranked hypotheses. The graph apply slice now has the evidence the round-05 design never got. | `works/deferred/dropped/D26` |
| `D27` | `dropped` | Decide whether a closing consistency-sweep design round 07 is wanted | Closed as 'no sweep', the trigger's own default: P29.DECOMP read P28.REVIEW and found no unsettled cross-round drift (the five round stylesheets landed byte-identical; the three kb-record-fixes.css corrections restate record values; the one 44px vs 38px disagreement is already D36 (1)), and P29's reader-first redesign supersedes a round-07 sweep. | `works/deferred/dropped/D27` |
| `D31` | `dropped` | Retire round 06's card group label in the Knowledge Base Design System project | Dropped on the operator's word at P29's start (2026-10-18): the workspace update to v60 retired Claude Design / DesignSync, so the trigger (the next DesignSync session on project 623bb4ea) cannot fire. | `works/deferred/dropped/D31` |
| `D32` | `dropped` | Member auth guard bounces to /login with no return address | Shipped in P30.S11: requireSession and its 401 branch carry next=, laundered by safeNextPath (closed at P30.REVIEW) | `works/deferred/dropped/D32` |
| `D37` | `dropped` | Stop Cloudflare rewriting framed explainers: Cache-Control no-transform on the raw relay | Shipped in P30.S25: Cache-Control no-transform on both raw relays, seen live at P30.REVIEW | `works/deferred/dropped/D37` |
| `D38` | `dropped` | Unmeasured explainer box: 70rem vs round 06's flat per-tier heights | Moot after P30.S25: the measured box, frame print slicing and height reporter are retired (P30.REVIEW) | `works/deferred/dropped/D38` |
| `D39` | `dropped` | Chrome print slicing of a framed explainer (page-1 gap, near-blank pages) | Moot after P30.S25: the measured box, frame print slicing and height reporter are retired (P30.REVIEW) | `works/deferred/dropped/D39` |
| `D40` | `dropped` | Explainer reporter: measureAt can loop with a document that mutation-observes <html> | Moot after P30.S25: the measured box, frame print slicing and height reporter are retired (P30.REVIEW) | `works/deferred/dropped/D40` |
| `D72` | `dropped` | explain: a mechanical dossier and search-total line | Moot after P39-hk: the explain runs no searches and writes no plan.md or run.md (S2, S4; P39-hk.REVIEW) | `works/deferred/dropped/D72` |
| `D73` | `dropped` | explain: verifier batches and waves in the foreground under claude -p | Moot after P39-hk: no verifier batches or waves remain, and the critic already runs in the foreground (SKILL.md §4.10; S4; P39-hk.REVIEW) | `works/deferred/dropped/D73` |
| `D75` | `dropped` | explain: close the run mechanically at publish (run.md state and report.md) | Moot after P39-hk: run.md and report.md are gone (S2) and pagetext.py only builds the payload (P39-hk.REVIEW) | `works/deferred/dropped/D75` |
| `D76` | `dropped` | explain: name 'family' in the verifier's and critic's same-model guards; give a missing researchers_model line its own block | Done by P39-hk: B5 names the other family from the writer's (SKILL.md, S2) and the verifier half is retired; bootstrap v94 carries the critic-on-the-other-family rule (P39-hk.REVIEW) | `works/deferred/dropped/D76` |
| `D80-ch` | `dropped` | Plugin text drift outside the explain front door | Done by P39-hk.F4: the KB template page's API-down line no longer says the explainer can be written straight to a file; setup's general-mode half was moot after S4 (P39-hk.REVIEW) | `works/deferred/dropped/D80-ch` |
| `D84-8s` | `dropped` | A metered live 0.9.0 explain trial | Moot after P39-hk: the 0.9.0 cost table and team sizing it would meter are gone; a metered 0.10.0 run would be a new job, on the operator's word (P39-hk.REVIEW) | `works/deferred/dropped/D84-8s` |

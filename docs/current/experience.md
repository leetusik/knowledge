---
doc_id: experience
version: v0016
created_at: 2026-08-07T16:03:20+09:00
source: P25.REVIEW
summary: P25 the shared link becomes readable and durable: claim an org slug in the dashboard, /@org pretty pages, old links 307-forward, and a superseded duplicate keeps its id link
previous: v0015_p24_honest_publishing_when_the_reply_is_lost_explain_and_knowledge_save_verify_a_timed-out_write_through_the_read_api_before_reporting_never_blind-retry_and_read_push_pending_as_saved-and-publishing
---

# Experience

## Status

The public knowledge site (Track 1, GitHub Pages) has a finalized experience as
of P5: an operator-designed "calm editorial library" visual language, a
redesigned landing page with real browse journeys, per-project section pages, and
Korean/CJK-capable in-browser search reached from a hero search affordance. The
design provenance is the operator's Claude Design project ("Knowledge Base Design
System") — the agent integrated it; the visual language is no longer agent taste.

**P6 adds a fourth journey: an interactive, Obsidian-like knowledge map** at
`/graph/` — the whole library as a force-directed graph (every explainer a node,
linked by shared tags and `related:` references), drawn client-side. Its visual
language follows the same operator-locked Claude Design guide (P6.S0). Its
**interaction was revised at P6.S1** (operator-directed, via Claude Design): quiet
on-demand labels, a barely-there idle mingle, pointer/pinch zoom toward the cursor,
sticky node re-placement, and a legend that highlights rather than filters — plus a
roomier default layout that survives an in-tab reload (see the map journey below).
Browser *feel* QA is still owed to the operator (no browser in the build harness; a
CDP geometry/behavior probe covered the structural parts — see Open Questions).

**As of P12 there is a second experience entirely: an authenticated web app** (Next.js,
`web/`), separate from the public mkdocs site. Signed-in tenants move from a dark "quiet
threshold" login gate into a light editorial workspace console and reach four surfaces —
a tenant dashboard, project detail, per-tenant documents (browse/search/read), and the
in-app knowledge graph — all free, all on the Knowledge Base design system. See *The
authenticated web app (P12)* below.

**As of P13 there is a third experience: the terminal.** A standalone `knowledge` CLI lets a
user (or their coding agent) run the whole lifecycle from inside Claude Code or Codex — a
one-shot `knowledge init` onboards them to the hosted SaaS, then `save`/`search`/`list`/`read`/
`projects`/`usage` do the day-to-day work, all with a `--json`/exit-code contract for agents and
a bundled `knowledge guide`. No browser, no website. See *The CLI journey (P13)* below.

**As of P16 a document can be an interactive HTML explainer, not just markdown.** In the
authenticated web app's document viewer, opening an HTML explainer renders it as a live,
**interactive** page — its multiple-choice quiz answers and feedback work — inside a safely
sandboxed frame, while the surrounding page chrome (title, metadata) is unchanged and a
markdown document reads exactly as before. Search finds an HTML explainer by its readable
text like any other document. See *The HTML explainer document (P16)* below.

**As of P17 the `/explain` skill authors that interactive HTML explainer for every explanation, and any plugin user can point it at the hosted KB.** `/knowledge:explain` now always produces the quiz-bearing HTML page — with a default-on, cited "Best practices & next steps" section — for **both** topic and code-change modes (no markdown output remains), and `/knowledge:setup` opens with a **Connect** (hosted, zero-infra) vs **Scaffold** (self-host) mode choice, so a plugin user can sign up, mint one key, and have their explainers land in their own tenant on the public host. See *Explain v2 authoring + hosted onboarding (P17)* below.

**As of P18 the accounts experience is "org," not "workspace," across every surface.** Signup now says a **default org and default project** are created automatically (was "a workspace is created for you"); users mint/list/revoke an **org-level `vk_`** (one key → the whole org) from a new **Org API keys** panel on the dashboard, alongside the unchanged per-project keys on a project page; and the app chrome/eyebrows read "Org." From the terminal, `knowledge init` mints that org key and `save` falls back to the `"default"` project outside a git repo. Projects are get-or-create everywhere — no "create a project" step in any flow. See *Accounts v2: the org experience (P18)* below.

**As of P19 a project can be made public, and a saved doc is directly shareable.** On a project page a member flips a **Make public / Make private** toggle (with a Public/Private badge, mirrored as a column on the dashboard projects table); once public, the project's docs and its knowledge graph become readable by **anonymous visitors** at their normal URLs (`/documents/{id}` and `/graph/{org}`), and a **copy-link** affordance shares the direct doc URL. From the terminal, `knowledge save` now prints the working direct `url` (previously hidden because the old mkdocs link 404'd). A private/nonexistent doc an anonymous visitor tries to open bounces to `/login`; a public one just renders, minus the app rail. See *Public sharing: toggle, share link, and anonymous pages (P19)* below.

**As of P20 the landing hero's onboarding journey is real and honest, and the landing is the easiest on-ramp for coding agents.** The hero terminal now shows a working `curl …/install.sh | bash` install, a real `init` password prompt, and a `knowledge save` that returns a working direct doc URL; `knowledge init` prints a `web login: …/login (same email + password)` line and, per D16, an `init --project other` **reuses** the org key across projects. Below the hero, an **agent env-var quickstart** promotes the plain-REST path (`KB_API_BASE_URL`/`KB_API_TOKEN` → any agent saves) with its real blockers, and the **explain skill is published** on the landing — copyable + downloadable — with agent-first guidance. See *Frictionless onboarding: real hero, env-var quickstart, published skill (P20)* below.

**As of P25 a shared link is readable, durable, and never quietly changes what it shows.** An org claims a **public URL name** in the dashboard's new **Public URL** panel, after which a public document reads at `/@{org}/{project}/{doc-slug}` and the public graph at `/@{org}/graph` — in place of the disposable `/documents/25` rowid and the `/graph/{uuid}` tenant UUID. Old links keep working and, for an anonymous visitor, **307**-forward to the pretty URL; copy-link on every surface, and the URL an agent gets back on save, hand out the pretty path. An org that has not claimed a name sees byte-identical pre-P25 behavior. See *Pretty share URLs: claiming a public name (P25)* below.

## Visual language — "calm editorial library"

- **Warm paper, one accent.** Light scheme: warm ivory paper (`#f6f2e8`) with a
  raised near-white surface (`#fffefa`) for cards/search/admonitions. Dark scheme
  (`slate`): warm charcoal paper (`--md-hue: 34` warms the derived slate tiers).
  A single **deep teal** accent (light `#0f6f66` / dark `#62bdb2`) is the *only*
  accent — links, hover, focus rings, active nav/TOC, permalinks, tag hover, card
  hover, `::selection`, and search-match highlights. Neutrals carry everything
  else; there is no second hue.
- **Paper header, not a colored bar.** The header wears the paper color with a
  hairline bottom rule (differentiates hardest from stock Material's colored bar);
  the footer is a warm dark editorial anchor band.
- **Serif display over clean sans.** Fraunces (variable serif) on a restrained
  h1–h6 ladder for headings/site-title; Source Sans 3 body at line-height ~1.72
  for a calm reading rhythm; JetBrains Mono for code. Mixed EN/KR is handled by
  Hangul fallback stacks on every family.
- **Soft, quiet surfaces.** Hairline borders, generous whitespace, `0.55rem`
  radii, and exactly one hover shadow (card lift) — no heavy drop shadows.
- **Teal-only admonition policy:** note = teal rail; warning/others = warm-neutral
  rail, differentiated by icon + label + weight (no second hue).
- **Both schemes** ship via `prefers-color-scheme` plus a manual header toggle.

## Route / screen map

- **`/` (Home, `docs/index.md`)** — the editorial landing: hero → Recent → Browse.
- **`/<project>/` (per-project index)** — `changple5`, `hi2vi_web`,
  `bootstrap_agentic_workspace.sh`: a short grounded description; the section nav
  lists the project's explainer docs.
- **`/<project>/<doc>/`** — an individual explainer page (auto-nav from the tree).
- **`/tags/`** — the tags index (`# Tags · 태그` + the tags-plugin listing).
- **`/graph/` (P6)** — the interactive knowledge map: a full-bleed force-directed
  graph of the corpus. Reached from the auto-nav top tab and a landing Browse card
  (`Graph · 지식 지도`).
- **Search overlay** — Material's search, reachable from the header, the `/`
  keyboard shortcut, or the hero search field.

## Core user journeys

### Land → orient → read

- **Entry:** the home page.
- **Hero:** a bilingual title ("Explained for beginners / 초보자를 위한 기술 설명")
  and a lede grounded in the real content (nginx, caching, agent refactor,
  prompt-injection defense), plus the hero search field.
- **Recent:** a styled plain list of the newest explainers (date · title ·
  project), machinery-managed — new docs appear here automatically via the
  `/explain` write path, with no experience regression (the styling rides an
  `id="recent"` + `#recent + ul` alias; the underlying list stays byte-intact).
- **Browse:** a card grid — one card per project, a Tags card, and (P6) a **Graph
  card** (`Graph · 지식 지도` → `/graph/`) — each with a grounded description and a
  real destination. Explainer *counts* are deliberately not shown (the machinery
  never updates them, so a count would go stale). The Browse row now closes the
  journey: hero/search → Recent → Browse (projects · Tags · Graph).
- **Success state:** the reader reaches a project page or an explainer and reads
  with prev/next footer links ("read like a book, not a manual").

### Browse by project or topic

- **By project:** the top tab row (Home / project folders / Tags) and the sidebar
  section indexes (click-through enabled) lead into a project; the section nav
  lists its docs.
- **By topic:** the Tags page lists every tag with its documents.
- **Finding (nav labels):** under plain auto-nav a section's tab/nav title comes
  from its *folder name* (auto-prettified), not from the index page's `title:` or
  `<h1>`. So `bootstrap_agentic_workspace.sh` reads as
  "Bootstrap agentic workspace.sh" — awkward but accepted, since renaming the
  directory would break every doc URL and the `/explain` per-project convention,
  and a `nav:` override is forbidden (auto-nav is load-bearing).

### Search (Korean/CJK-capable, in the browser)

- **Entry:** click the hero search field, press `/`, or use the header search
  icon — all open Material's search overlay.
- **Behavior:** English is unchanged (`nginx`, `cache`). Korean now works: a query
  like `관련` prefix-matches the agglutinated eojeol `관련해` **while you type**
  (Material typeahead), and `미라클` / `창플` match. An absent Hangul term (e.g.
  `블록체인`) returns cleanly — no false flood.
- **Known limits (recorded, not defects):** no mid-compound substring match (the
  typeahead wildcard is prefix-only and lunr.ko has no segmenter); Korean
  particles/conjunctions are stopword-filtered out of the index.
- **Hero affordance:** a bordered, rounded field showing "Search the knowledge
  base · 검색", an inline magnifier, and a `/` key hint. It is a zero-JS
  `<label>` that toggles Material's own search — no bespoke search UI.

### Explore the knowledge map (P6, interaction revised at P6.S1)

_This journey describes the **public mkdocs map** at `/graph/`. The in-app map in the
authenticated web app was ported from it but **diverges on labels since P22** — see
*The in-app graph goes quiet* below._

- **Entry:** the Graph top tab or the landing Graph card → `/graph/`.
- **Arrival (settle-then-mingle):** the map lays itself out with a brief
  force-directed settle (~600ms) and then keeps a **barely-there idle mingle** —
  each node strays ≤ 3px from rest over ~9s (tags wander a touch more) — so the map
  feels alive while it waits, never fast enough to fight the pointer. Under
  `prefers-reduced-motion` it paints at rest and **holds still**: no animated settle,
  no mingle, no label fades; pan/zoom snap. (This supersedes P6.S0's
  "settle-then-still / no idle drift".)
- **Read the map (quiet labels, Strategy A′):** the idle map is **quiet — marks
  only, no labels**. The mark grammar reads at a glance: doc nodes are filled circles
  sized 6→14px by degree in a project ink (teal / bronze / plum), tag nodes are small
  hollow rings, and a dead `related:` reference shows as a dashed "ghost" ring.
  `related:` edges carry an arrowhead ("reads on to"); tag edges are hairlines.
  **Hover or selection reveals** the node's title plus its neighborhood's; **doc
  titles also fade up past ~110% zoom** (fully on by ~135%); tag labels stay
  on-demand. At very low zoom a pointer tooltip carries the hovered title. (This
  supersedes P6.S0's "doc titles always on".)
- **Focus a neighborhood:** hover or click a doc → its neighborhood keeps its ink,
  incident edges turn teal with a soft halo, and everything else dims. A click also
  opens a **top-right info panel** (project chip, title, `date · N tags · N links`,
  tag pills, and a "read the explainer →" link) plus an offset teal selection ring. A
  ghost node's panel says "no document yet · 문서 없음" with no read-through. Clicking
  a tag highlights only.
- **Interact — the pointer does the real work:** **wheel / trackpad-pinch zooms
  toward the pointer** (0.5–2.5× of the fit view), dragging the empty plate pans 1:1,
  and a bottom-right zoom stack (+ / − / fit) remains. **Any node can be grabbed and
  re-placed — it stays where dropped** (sticky); a doc's tag spokes follow it on a
  soft spring, and a dropped tag keeps its new offset.
- **Legend is a lens, not a filter (revised):** the **bottom-left legend** lists
  projects with ink chips + doc counts; clicking a project **highlights** it — its
  docs + spokes keep full ink and titles while everything else dims (`.is-on` marks
  the active row), click again to clear. Nothing is removed from the map. A separate
  **tag-visibility switch** collapses the tag spokes when the map feels busy (today's
  corpus is tag-heavy, so this matters for legibility).
- **Roomier layout that survives reloads (P6.S1 / F3):** the default layout is
  deliberately spacious — docs seed degree-aware (hubs pulled in, leaves pushed out)
  and tags seed on even angular slots around their owner doc, for a cleaner first
  read. Placement, camera, and the legend lens **survive a page reload within the
  same tab** (persisted per-corpus to `sessionStorage`; the settle is skipped on
  restore), so leaving to read an explainer and coming back — or the dev server's
  live-reload firing — returns the map exactly as left. A fresh tab, or a changed
  corpus, gets the default layout.
- **Accent discipline:** project inks color only the data-viz surfaces (nodes,
  legend chips); every interactive accent (hover, selection ring, halo, active
  edges, links) is **teal**, matching the site's one-accent rule. Both color schemes
  are supported; the map repaints on the Material light/dark toggle.

## UX states

- **Empty search:** an absent term returns no results cleanly (no error, no flood).
- **Recent (near-empty corpus):** the Recent list mirrors whatever the machinery
  has written; there is no separate empty-state copy.
- **Dark/light:** the manual toggle plus `prefers-color-scheme` — both schemes are
  fully skinned (the teal-only accent holds in both).
- **Loading:** none beyond a static page load; search runs client-side once the
  worker + language packs load from the static build.
- **Knowledge map (P6):** a loading state while `graph.json` is fetched; an empty
  state (bilingual EN/KR copy) if the fetch fails or there are zero doc nodes; a
  `<noscript>` fallback pointing Home for JS-disabled visitors. Both schemes skinned;
  reduced-motion paints at rest and holds still (no idle mingle). On a same-tab
  reload the previously-explored placement/camera/lens are restored instead of a
  fresh settle.

## Copy and tone

- Bilingual where it counts (hero title, section heads "Recent · 최근",
  "Tags · 태그", the search label) — reflecting the mixed EN/KR corpus.
- Grounded, concrete lede/descriptions drawn from the actual documents, not
  marketing filler.
- Calm and library-like: restrained type, generous space, one accent.

## The authenticated web app (P12)

P12 delivers knowledge's tenant-facing console — a separate authenticated experience from the public mkdocs library. It wears the **Knowledge Base "calm editorial library"** design system (warm paper + one deep-teal accent, both schemes), carrying hi2vi's dashboard structure/vibe. Status is encoded in *form* (not colour alone) for greyscale legibility.

- **Sign in → console.** The signup/login gate is a dark "quiet threshold" (`slate` scheme); on success the tenant lands in the light editorial console — a paper topbar (brand · tenant crumb · email · logout) over a teal-active TOC rail (Dashboard · Documents · Graph, all live at end of P12).
- **Dashboard.** Four Fraunces stat tiles, a 30-day search trend, a projects table (Open → project detail), a recent-activity feed, and inline create-project.
- **Project detail.** Project info, a credentials table with a 3-state key status (active / idle / revoked, encoded in form), and per-project usage. **Mint a `vk_` key → it is shown exactly once** in a focus-trapped reveal modal (copy-once, unrecoverable; Escape or Dismiss only — a scrim click won't destroy it); revoke is a terracotta danger action with an inline confirm.
- **Documents.** Browse newest-first, filter by project, full-text search with highlighted snippets, and read the rendered markdown in a calm on-token reader. **(P21)** a member can also **delete** a document from either surface, behind a two-step inline confirm — the surfaces' one write; see *Deleting a document from the web app* below.
- **Knowledge graph.** The corpus as a per-tenant force-directed map: settle→mingle motion, drag/pan, wheel/pinch zoom, hover-neighbor-highlight + tooltip, a legend project-lens + tag toggle, and node-tap → an info panel → read the document / filter by tag. (The public mkdocs `/graph/` stays tenant #1's public map; this is the per-tenant in-app view.) **(P22)** titles are **selection-driven** here — see *The in-app graph goes quiet* below.
- **Free.** Every web-UI feature — dashboard, project detail, documents, graph — is free; nothing is plan-gated. Web-UI search is deliberately unmetered.

Final visual acceptance of the live app (a real browser render of login → surfaces, mint/revoke, search, graph drag/zoom/click-through) is owed to the operator at the **P14 deploy** — the phase could not stand up the live BFF + backend + browser stack; route behavior is covered by the backend `TestClient` suites and the frontend by typecheck/lint/build.

## The CLI journey (P13)

P13 adds a terminal experience for a user living inside Claude Code or Codex: the standalone `knowledge` CLI (`uv tool install`, console script `knowledge`). It is deliberately **agent-first** — designed to be driven unattended by a coding agent — and the journey has two halves.

- **Onboard — one shot.** `knowledge init` runs the entire sequence in one command: signup-or-login → create the project → mint a `vk_` ingest key → write the config seam (`~/.config/knowledge-kb/config.json`, `0600`, `api.base_url` + `api.token=vk_…`) → verify it resolves as configured. It is **idempotent** (proven server-side: one project, one credential after two runs — a re-run reports "reusing the one in your config"). The password never comes from an interactive flag: `--password-stdin` > `$KNOWLEDGE_PASSWORD` > a TTY prompt. Signup `409` (duplicate email) offers login; a wrong login is the generic, enumeration-safe "invalid email or password". After `init`, `/knowledge:explain` itself starts writing to the hosted SaaS with **zero plugin change** — that is the payoff.
- **Day to day — six commands.** `save` (H1-first markdown body, 2–5 tags, `409` → `--overwrite`; project defaults to the git repo's basename so the CLI and the plugin partition one corpus identically; prints `id`/`rel_path`/a `knowledge read <id>` hint — paths that always work — never the mkdocs `url` that 404s for a non-#1 tenant), `search` (any query is safe to type — no "malformed query" error exists from the CLI), `list`, `read` (by id or rel_path, round-trips the body byte-for-byte), `projects` (a GROUP BY over documents — a just-created project is absent until its first save), and `usage`.
- **The two-token model, visible from the terminal.** After `knowledge logout`, `save`/`search`/`list`/`read` **keep working** on the non-expiring `vk_` while `usage` reports the session expired (your API key is unaffected) — the two tokens have two lifetimes and the terminal shows it. `logout` revokes the 30-day session but deliberately leaves `api.token` alive.
- **The agent contract — `--json` and exit codes.** All six commands take `--json`, which emits the server's payload **verbatim**; text is the opinionated default. Errors are **never** a JSON envelope — they are `error: …` on stderr with exit 1, so stdout is always "valid JSON or nothing" and an agent branches on the **exit code**, not on parsing an error shape. A `knowledge guide` command prints the full machine-readable lifecycle contract (bundled, offline) for an agent to read before driving the flow.

Onboarding + the full lifecycle + logout-survival + the 429 throttle are proven live on a local stack by `scripts/cli_smoke.py` (see qa). Hosted end-to-end awaits the operator's one-time accounts-plane cutover (see operations); the terminal experience itself is complete and proven.

## The HTML explainer document (P16)

P16 makes an HTML explainer a first-class document type in the web app's document journey,
alongside markdown — the reader gets the explainer's full interactivity without a new
surface or a redesign.

- **Reading an explainer.** From the documents list, opening an HTML explainer renders the
  document body as a live interactive page: HTML diagrams, and a multiple-choice quiz whose
  answer selection + feedback actually run. The page's header/metadata strip and the app
  chrome are unchanged; only the body differs from a markdown document. The baseline layout
  is a generous fixed-height frame with its own internal scroll (no page-height handshake in
  P16). A markdown document reads exactly as before.
- **Safe by construction, invisibly.** The interactivity is contained so untrusted explainer
  JS cannot read the signed-in session, browser storage, or the surrounding app — the reader
  experiences a normal interactive document with no visible seams; the containment is an
  architecture concern, not a UX one. A person who navigates straight to the raw document URL
  is privilege-stripped the same way.
- **Findable.** An HTML explainer is indexed by its readable (extracted) text, so it appears
  in the app's full-text search results like any markdown document, and never surfaces on its
  script/style contents.
- **Owed to the operator (recorded, not a defect).** The live in-browser confirmation that
  the quiz runs (and that a direct raw-URL visit is sandbox-stripped) needs a real browser —
  there is no browser/jsdom tooling in the repo — so it is an operator visual-acceptance
  residual; every machine-verifiable layer passed at the P16 review.

## Explain v2 authoring + hosted onboarding (P17)

P17 changes what `/knowledge:explain` writes and where a plugin user can send it.

- **One output, both modes.** Every `/explain` — whether the argument names a topic
  (a concept, tool, subsystem, or file) or a code change (a diff, branch, commit range,
  or "what we just changed") — produces the **same** single self-contained interactive
  HTML explainer: a table of contents over Background → Intuition → Code →
  **Best practices & next steps** → **Quiz**, with HTML/CSS-or-SVG diagrams (never ASCII),
  callouts, worked toy-data examples, and a Kleppmann-clear essay tone. The quiz is 5
  medium multiple-choice questions with immediate correct/incorrect feedback. Only the
  lens differs between modes; the sections are shared. The markdown house style is gone.
- **The cited comparison section.** "Best practices & next steps" is on by default: it
  says where the implementation aligns with prevailing practice, where it deliberately
  diverges, and 2–4 concrete next steps — and **every claim shows its source in plain
  text** (link plus the bare domain), so provenance survives search and MCP extraction.
  The skill skips the section for purely-internal or trivial subjects (no in-document
  "skipped" note — the chat report explains) and skips it cleanly when offline. Trailing
  `research` / `no-research` words force it on or off.
- **Choosing your KB at setup.** `/knowledge:setup` asks **Connect** vs **Scaffold** up
  front. **Connect mode** (the zero-infra default) walks the user through a browser
  signup on `https://knowledge.hi2vi.com`, creating a project, and minting one `vk_` key
  shown once — then the skill writes that key into the local config; from then on
  `/explain` posts to the user's own tenant. **One key serves every repo.** Email and
  password never reach the agent; only the pasted key does. **Scaffold mode** is the
  unchanged self-host flow (stand up your own KB from scratch). A terminal-only
  alternative (`knowledge init` from the CLI) writes the identical config.
- **Reading it back.** A posted explainer renders in the authenticated web app's
  Documents view exactly as a P16 HTML explainer — interactive quiz and all — inside the
  sandboxed frame, and is found by full-text search on its visible text. (The live
  in-browser eyeball of the quiz rendering under a fresh tenant is the one operator
  visual-acceptance residual; every machine-verifiable layer — the raw-HTML relay and
  the four sandbox headers — is proven live on prod.)

## Accounts v2: the org experience (P18)

P18 reshapes the accounts journey around a default org + default project and org-level keys, using the existing surfaces — no new visual design (the org-keys panel reuses the P12 keys-table + mint-modal at org scope; no Claude Design round).

- **Signup gives you a working workspace immediately.** A new user's first session already has a `"default"` org and a `"default"` project — nothing to create before the first save. The web signup copy now reads "A **default org and project** are created for you automatically" (was "A workspace is created for you"), and the CLI `knowledge signup` narration matches.
- **One org key, minted from the dashboard.** The authenticated web app grows an **Org API keys** panel (a full-width section on `/dashboard`, below the projects/activity grid) where a user mints, lists, and revokes an **org-level `vk_`** — one key that authorizes every project in the org. The raw key is shown **exactly once** in the same reveal modal as the per-project mint. The per-project keys on a project page are unchanged — both key kinds work.
- **"Org," not "workspace," in the chrome.** The app topbar/eyebrows/labels and the CLI's `login`/`whoami`/`init` output read "org." (Internally the tenant row is still the org — a label change only.)
- **Get-or-create everywhere.** Saving to a project name that doesn't exist creates it — in the web app, the CLI (`--project <name>`, or the git-repo-basename default, or `"default"` outside a repo), and the explain/setup skills. No client flow has a "create a project" step.
- **CLI + skill onboarding.** `knowledge init` mints the **org** key (`POST /app/credentials`) and writes `api.project` as the save fallback; the setup skill's Connect mode says a default org + project are auto-provisioned (C1), that projects are automatic (C2), and mints from the Dashboard → Org API keys panel (C3).

## Public sharing: toggle, share link, and anonymous pages (P19)

P19 adds a public-sharing journey to the authenticated app and, for the first time, an **anonymous** reader journey — all composed from already-designed pieces (no new visual design, no Claude Design round).

- **Make a project public.** On a project page a member sees a **Public / Private** badge (the closed `Badge` status enum reused: `active` = Public, `idle` = Private) and a **Make public / Make private** toggle button. Flipping it is a session-only PATCH that takes effect **instantly**; the dashboard projects table gained a matching Public/Private badge column so a member sees each project's visibility at a glance.
- **Share the direct link.** A **copy-link** affordance (the reused mint-key clipboard idiom) sits on the member's doc view and on the member graph header, copying the direct URL (`{origin}/documents/{id}` or `/graph/{org}`) to the clipboard — shareable with anyone once the project is public.
- **The anonymous reader.** A public project's doc is readable by a signed-out visitor at the **unchanged** `/documents/{id}` (an optional-identity page: the same URL serves a member with their app shell or an anonymous visitor with a lighter public shell — brand + a single "Sign in" action, no rail), and its graph at `/graph/{org}` (the org's public subset; a member's own org id renders the full map). An anonymous **doc** miss (private/nonexistent → 404) uniformly bounces to **`/login`**; a public-**graph** miss renders a branded not-found rather than a login bounce. Crawlers may now reach `/documents` + `/graph` (robots updated).
- **CLI save prints the direct url.** `knowledge save` now shows a `url:` line (between `path:` and the read hint) carrying the working direct doc page — the deliberately-hidden mkdocs URL is gone. Shareable with others when the project is public.
- **Deferred niceties (recorded, not built):** an anonymous doc miss drops the visitor at the dashboard after login (no `returnTo`); the public graph's **tag-hub** links still point at the session-gated `/documents?tag=` list, so an anonymous visitor clicking a tag hub lands on `/login` (the doc-node "Read" links work anonymously); org-**slug** vanity graph URLs (UUID suffices); and a member hitting a genuinely-missing doc id sees the centered empty-state without the app-shell chrome (a minor, rare cosmetic regression of the moved not-found page). All proven live end-to-end by the extended `onboarding_smoke.py` against prod (with web pages in scope).

## Frictionless onboarding: real hero, env-var quickstart, published skill (P20)

P20 turns the landing hero's depicted journey into a real, honest on-ramp and makes the landing the easiest way for a coding agent to start using knowledge. The hero-copy fix is a content change inside the already-designed hero; the two new below-the-hero sections came through design round 02 (see **frontend**).

- **An honest hero terminal.** The hero now depicts a journey that actually works, in order: `curl -fsSL https://knowledge.hi2vi.com/install.sh | bash` → `knowledge init --email …` → a real `Password:` prompt → the real `init` output (`signed up …` / `project: default (created)` / `key: minted vk_…` / `config: … (0600)`) → `knowledge save …` → `saved: …` / `url: https://…/documents/…` (showcasing the P19 direct link). The old live-broken `uv tool install knowledge-cli` line is gone.
- **`knowledge init` points you at the web login.** `init` prints `web login: {base_url}/login (same email + password)` — the terminal user now knows the same credentials log into the web UI (CLI + web share one accounts plane). No random-password generator; the flow already prompts for a password (getpass; `--password-stdin` > `$KNOWLEDGE_PASSWORD` > TTY).
- **One org key across every project (D16).** `knowledge init --project other` now **reuses** the existing org key instead of re-minting (org keys are project-agnostic since P18) and creates the new project; a pre-P18 project-bound key still triggers a one-time note. The curl one-liner also surfaces in `cli/README.md` §Install and `guide.py` §1 (the `git+` form stays the canonical/manual channel).
- **The env-var REST path, on the landing (the recommended agent setup).** An **agent quickstart** section shows the two exports (`KB_API_BASE_URL` + `KB_API_TOKEN`, an org-level key) that light up any coding agent's plain-REST save, with the real blockers stated honestly: a repo `.env` is never auto-loaded → put the exports in `~/.zshenv`; Codex's workspace-write sandbox needs `[sandbox_workspace_write] network_access = true`; a one-line health check reads `200 connected` / `401 wrong-or-revoked key`.
- **The explain skill, published on the landing.** The canonical explain skill is offered **copyable** (Copy fetches the served `/SKILL.md`, never a pasted fork) and **downloadable** (`<a href="/SKILL.md" download>`), with an expandable in-page reader showing the head of the file, and agent-first guidance ("the recommended path is a coding agent following this file"). The REST API stays fully usable by hand.

Shipped and verified live on prod (throwaway account): the clean-env installer runs end to end, `init` prints the web-login line + mints an org key, `init --project other` reuses it (D16 live), and `save` returns a `…/documents/{id}` URL. One depicted-vs-live nuance (not a defect): on prod a brand-new org's `default` project is server-pre-created at signup, so init #1 shows `project: default (already existed)` rather than the hero's `(created)` — the hero copy stays honest for a genuinely new org.

## Deleting a document from the web app (P21)

Until P21 the web app could not remove anything — delete lived only on the machine plane, so a member who wanted a document gone had to reach for an API key or ask the operator. P21 closes that gap with the documents surfaces' first write, composed from the already-designed revoke-key affordance (no new visual design, no Claude Design round).

- **Two places to delete, one behavior.** Each row of the **documents list** carries a trailing **Delete** action, and the **read page** carries one in its member branch beside the back-link and copy-link. Deleting from the list leaves you on the list with the row simply gone; deleting from the read page returns you to `/documents`, because the page you were on no longer exists.
- **A two-step inline confirm, never a browser dialog.** Clicking Delete swaps the button for **"Delete permanently? This can't be undone."** with *Yes, delete* / *Cancel* — the same pattern as revoking a key. It is rendered inline rather than as a `window.confirm` (unstyleable, and it freezes the whole tab), and the button carries the document's title in its accessible name so a screen-reader user is never guessing which row they are on.
- **The copy tells the truth about what is lost.** The delete is **hard**: the file, its database row, its search-index entry, and its embeddings all go, and for a public document its shared URL and graph edges break with it. There is **no trash and no undo**, so nothing in the copy hints at recovery.
- **Failures speak plainly, in one string where the server keeps two cases identical.** A document that is already gone and a document belonging to another org both answer 404 by design, so both read **"That document no longer exists, or it isn't part of your org."** A dead session says so, and anything else falls back to a plain retry message. Deleting the same document twice — a stale tab, a double submit — lands on that not-found line rather than a silent success.
- **Anonymous readers see no delete control at all.** The public read page's anonymous branch is untouched: a signed-out visitor reading a public document has no delete affordance anywhere on the page.
- **Still free.** The delete is unmetered like every other web-UI feature — a UI click is never billed as an agent event, even though it writes.
- **Two rough edges, known and accepted.** Deleting the **last row of a page** in a paged view can leave you on an empty page (there is no offset reconciliation — go back a page). And a member reading **another org's public** document sees the Delete button; submitting it returns the not-found copy rather than hiding the button up front, because the page has no signal about which org owns the document and the server deliberately refuses to distinguish "not yours" from "not there".

## The in-app graph goes quiet: labels follow the selection (P22)

The in-app map inherited the public map's "quiet labels A′" ladder, and on a real corpus it
read as a **wall of titles**: past ~110% zoom every document's title faded in and saturated by
~135%, and hovering a single node lit up its whole neighborhood's titles. The operator's read
was blunt — "all graph title shown is kinda sucks. make it possible to see only clicked one."
P22 makes exactly that change, on the **in-app map only** (member `/graph` and the public
per-org `/graph/{org}` — one shared canvas component, so both).

- **A title follows your attention, nothing else.** The map is titleless at rest. Click a node
  and its title appears — and stays while it is selected. Hover (or drag) a node and that node's
  title appears for as long as you are on it. Nothing else is ever titled: not the neighbors, not
  the zoom level, not the project lens. Zoom no longer affects titles at all.
- **Why hover still titles one node.** The pointer tooltip is a **zoomed-way-out** affordance
  only; at normal reading zoom there is no tooltip, so without the hovered title there would be
  no way to identify a node without clicking it. The rule is therefore "the selected node and the
  one node under the pointer" — at most one title at rest, at most two in transit (the selected
  node keeps its title while you hover a neighbor).
- **Everything else about the map is unchanged.** Hovering still highlights a node's neighborhood
  and dims the rest, the selection ring and info panel are unchanged, the legend lens and tag
  toggle are unchanged, and the low-zoom tooltip is untouched. The one asymmetry worth naming:
  hover still *undims a whole neighborhood* while titling only the node itself — deliberate, since
  P22 changed titles only.
- **The public mkdocs map at `/graph/` is unchanged** and still behaves as *Explore the knowledge
  map* describes above; only the app's map went quiet.
- **Owed to the operator.** A browser eyeball on both `/graph` and `/graph/{org}` — including
  whether the hovered title should stay at all (a strictly "clicked only" map is a one-token
  change) — see **qa**.

## A document gets a second draft: version history (P23)

Until P23 a knowledge document had exactly one body. Re-explaining the same subject on a later day produced a **second post** (the skill derives its path from `project/<today>-<slug>`, so a new date meant a new document), and the only way to replace a body was a destructive `overwrite` that lost the old one. P23 makes re-publishing **additive**: the same document simply gains a v2, v3, …

- **Publishing an update, from the agent's side.** `/explain` now looks for the document **before** it writes: it lists the target project, matches on slug (or a title that is plainly the same subject), and reads what the current version said, so the new explanation builds on the old one rather than starting cold. If it finds one, it publishes with "this is the next version" plus the resolved path — and the document keeps its id, its URL, its place in the graph, and its original date and slug. If it finds nothing, it publishes a normal new document; nothing errors. A re-explanation is always a **full replacement, not a diff** — every version stands alone.
- **The 409 conversation changed.** When a save collides with an existing document, the skill now offers "publish it as the next version" as the **primary** retry, with the old `overwrite` demoted to "only when you want to *replace* rather than *supersede*" — and `overwrite` is no longer destructive either, since it archives what it replaces. The ask-the-user-before-retrying gate is unchanged: the agent still stops and asks.
- **Reading history in the web app.** A document page shows a **Version history** panel below the body when — and only when — there is history: the live document as the chipped **Current** row, and each superseded version below it, linking to a read-only page for that older body. A document that was never re-published looks exactly as it did before P23; nothing new appears.
- **Reading a past version.** The past-version page is deliberately plain and read-only: a banner saying this version has been superseded (and by which one), the metadata strip, and the body — a markdown body inline, an archived HTML explainer framed and interactive exactly like a current one. There is **no rollback, no delete, no copy-link**: you can read history, not rewrite it.
- **A version's date is when it was superseded, not when it was written** — the surfaces label it "Superseded" for exactly that reason.
- **Public documents share their history.** A public project's document exposes its history to anonymous visitors on the same terms as its body; a private one exposes neither, and every miss is the same "not found" as a document that never existed. Browsing history is free and unmetered like the rest of the web UI.
- **Deleting a document deletes its history with it.** There is no half-deleted state where old bodies of a removed document remain readable — and, on the public tree, none left behind in git either.
- **A known gap, stated out loud.** When the API is unreachable the skill's offline fallback still writes a **new** file at today's path and cannot version — the very duplicate this phase fixes. The skill now says so and tells the agent to re-publish with the versioned path once the API is back. Closing it properly needs local archive plumbing (or a CLI flag); it is a candidate deferred job, not a defect of what shipped.

## The reply gets lost: honest publishing after a timeout (P24)

A publish is one HTTP request, so when the reply never arrives the client knows nothing — and both of our clients used to guess, badly. `/explain` treated **any** non-zero `curl` exit as "the API is unreachable" and fell through to writing the document again locally (or reported a failure); `knowledge save` mapped every transport error, including a read timeout on a write the server had already accepted, to `error: cannot reach <base_url>`. Meanwhile the server was spending the caller's whole budget on a git push and an embedding call that happen *after* the document is durably saved. So the reported experience — "the upload itself is successful, but the client says it disconnected" — was the system telling the truth about the response and lying about the outcome.

- **The server side of the fix is invisible and that is the point.** A write's reply no longer waits on anything off-box, so it comes back fast. Publishing to the remote still happens, just afterwards; the response says so with a "publishing in the background" flag. **That flag is never an error and never a reason to retry** — the document is saved, committed, and (on the hosted box) already live at its URL when the reply is written.
- **A timeout is no longer read as a failure.** Both clients now follow one rule: a transport failure on a *write* is not evidence the write failed. **Ask the API what is at the target path, once, before saying anything.** If the document is there, report an honest success — write nothing, re-post nothing. If it is genuinely absent, say so, and only then retry (`/explain` at most once; the CLI never retries on its own). If even the verification cannot reach the API, *then* the API really is unreachable and the local fallback applies.
- **Never loop.** One verification, at most one retry — a blind retry after a timeout is how you get a duplicate document or an unwanted v2, which is precisely what P23's versioning made cheap to trigger.
- **What "I could not confirm it" looks like.** When the CLI cannot prove either outcome it says the save **may or may not** have landed and points at `knowledge list` / `knowledge read` rather than pretending. When it *can* prove the save landed despite the lost reply, it exits successfully with a note explaining what happened — but it does **not** print a document URL, because the read API it verified through does not carry one, and inventing one would be a new small lie in place of the old big one. A recovered save is reported from what was actually observed, never reconstructed.
- **Longer, but still fail-fast, write budgets.** Both clients now allow a write **30 seconds** (reads stay at 15 in the CLI; `/explain`'s research reads stay at 5). Post-fix the only variable left in a write is uploading a few hundred KB, so 30 s is generous headroom over the realistic worst case while still failing well before the edge's own 120 s ceiling. The two shipped clients deliberately agree on that number.
- **The local fallback stopped duplicating landed writes.** If `/explain` does fall through to writing the file itself, it first checks whether the API already wrote exactly that document — and if so leaves it alone rather than rewriting the file, touching the index, or committing.
- **The one thing an operator still cannot see from a client:** whether the background publish to the remote succeeded. That failure is logged on the box only (see **operations** for the bring-up assertion); it never delays a write, never fails one, and self-heals on the next successful push.

## Pretty share URLs: claiming a public name (P25)

P19 made sharing possible; P25 makes the link presentable — and honest about what it points at. Composed entirely from already-designed pieces (no new visual design, no Claude Design round).

- **Claim the org's public name.** The dashboard gains a **Public URL** panel. The field is **always visible and prefilled** rather than hidden behind a disclosure — the current value *is* the point, and the name is changeable. Once claimed it shows the resulting `/@{slug}/graph` with a copy button; before that it says "no public URL yet". This is how the very first org gets its name: **the operator sets it through the UI after deploy — no backfill, no derived default, no hardcoded value anywhere in the stack.** Until it is claimed, every surface renders its pre-P25 fallback.
- **The hint names the one cost.** Changing an already-claimed name **breaks links that were already shared under the old one** (there is no name history and no old-name redirect), so the field's hint says exactly that, next to the charset rule. It is the single place in the product where the phase's "no link breaks" promise can be broken by a person, and it is labelled.
- **Save errors are specific where it helps.** A name already taken gets **its own message** ("that URL name is already taken") because names are globally unique and a collision is the likeliest real failure with an obvious fix; malformed and reserved values share one message that **cites the rule** rather than echoing the backend's raw detail.
- **Old links upgrade themselves — one way, temporarily.** An **anonymous** visitor on `/documents/{id}` is forwarded to the pretty URL when one exists, while a signed-in **member** stays on the id URL, which carries the member-only affordances (back-link, delete). `/graph/{uuid}` forwards on **both** branches — that surface has no member-only affordance to lose. The forwards are **temporary** (names are changeable, so a permanent redirect would be cached past a change) and never bounce back, so there is no loop. A name-less org keeps being served at the old URL exactly as before: nothing that worked stops working.
- **A missed pretty URL is a branded not-found, not a login bounce** — on both branches, with its call-to-action pointing at `/` rather than the member-gated `/documents`, because a shared link's audience is mostly anonymous strangers. Private, nonexistent and malformed all look identical, so nothing leaks.
- **"No link breaks" now covers *content identity*, not just the HTTP status (P25.F1).** The pretty URL is dateless — it means "the newest document under this title". So if a later document re-uses the same project and title-slug, the **older** document simply stops advertising a pretty URL: the anonymous visitor stays on the id link and copy-link hands out the id URL, rather than either one forwarding a reader to a *different* document. An already-shared link can never silently change what it shows.
- **Copy-link rides three surfaces** — the id document page, the pretty document page, and the member graph header — each falling back to the old id/UUID URL when no name is claimed. Anonymous branches stay button-free: a visitor already has the URL in the address bar.
- **Recorded edge, not a defect.** A member who lands on `/@{slug}/graph` (via the both-branches forward) sees their **whole-corpus member view** inside the public shell — their own session, their own data, no leak — which means the operator cannot preview what the public sees from the very URL the dashboard tells them to share. A candidate for a later slice.

## Open Questions

- None blocking. Final visual acceptance stays with the operator (deploys are
  manual-push-only; eyeball at `http://localhost:8765/knowledge/` before a push).
  The awkward "Bootstrap agentic workspace.sh" tab label is a known, accepted
  auto-nav constraint. Article-page metadata/related treatments (the §9
  `.kb-meta`/`.kb-related` design classes) await a per-page template before they
  enrich individual explainer pages.
- **Owed graph visual QA (P6):** a headless-Chrome CDP probe at the re-review
  confirmed the *geometry/behavior* (full-bleed layout at multiple widths, the
  loading overlay actually hiding, and the reload-restore round-trip), but the
  *feel* still needs the operator's eye in **both** color schemes: the idle mingle,
  the quiet → hover/selection label reveal + the >110% doc-title fade-up,
  trackpad-pinch / wheel zoom toward the pointer + 1:1 pan, sticky node re-placement
  with spring-following tag spokes, the legend lens (highlight, not filter), and the
  reduced-motion path (paint at rest, hold still, snap).
- **Graph-page footer (P6, flagged, not a defect):** with `navigation.footer` on,
  the footer sits just below the viewport-height map (a small scroll reveals it) —
  expected for a full-bleed map; the operator to opine whether to change it.
- **Label ladder at scale (P6):** the Strategy-C label ladder is deferred past
  ~50 docs; today's tiny corpus doesn't need it.

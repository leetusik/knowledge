# Result — P26.REVIEW (phase review)

**Verdict: `pass`.** All seven slices validated together; the phase delivers what `intent.md`
confirmed — a five-part new-maintainer series readable in order, plus a light README audit — with a
blast radius of exactly one source file.

---

## 1. State integrity

| command | outcome |
|---|---|
| `python3 scripts/workflow.py validate` | **PASS** — `Workflow validation passed.` (exit 0) |
| `python3 scripts/workflow.py next` | `current_phase=P26`, `current_slice=P26.REVIEW`, `next_slice=none` |

Seven slices, statuses and orders correct, `plan.md` + `result.md` present for each of the six
completed ones (`REVIEW` has `plan.md` and now this file):

| slice | kind | risk | order | status | plan/result |
|---|---|---|---|---|---|
| `P26.DECOMP` | decomposition | high | 0 | done | both present |
| `P26.S1`–`P26.S5` | knowledge | low | 1–5 | done | both present, each |
| `P26.S6` | implementation | low | 6 | done | both present |
| `P26.REVIEW` | review | high | 9999 | in_progress | plan + this result |

`phase.json` carries **no `execution` block** — P26 ran on the default stream, so the normal
(non-deferred) doc-consolidation rule applies.

## 2. The series exists and is what the results claim

`curl` only, bearer from `~/.config/knowledge-kb/config.json` — never Python `urllib`
(§Constraints 3). `GET /api/documents?project=knowledge&limit=50` → HTTP 200:

```
total: 5
33 | v1 | html | knowledge | Why Knowledge Is This Way, and How to Change It
32 | v1 | html | knowledge | Shipping and Running Knowledge: Distribution, the Edge, Security, and the Gates
31 | v1 | html | knowledge | Knowledge's Read Surfaces: Two Front Ends, One Corpus
30 | v1 | html | knowledge | Knowledge System Internals: The Content Plane, the Write Path, and the Contracts
29 | v1 | html | knowledge | Knowledge: What It Is and How It Is Used
```

Ids **29–33**, all `version: 1`, all `format: html`, titles matching each slice's `result.md`
exactly. Extracted-text lengths match the reported figures **to the character**: 25,242 · 26,037 ·
22,047 · 20,566 · 17,730.

**Section order** (`GET /api/documents/{id}` → `markdown`, i.e. the server's extracted text):

| id | ToC as extracted | quiz questions |
|---|---|---|
| 29 | Background → Intuition → Code → **Quiz** (no best-practices entry) | 5 |
| 30 | Background → Intuition → Code → Best practices & next steps → Quiz | 5 |
| 31 | same five | 5 |
| 32 | same five | 5 |
| 33 | same five | 5 |

Doc 29's absent best-practices section is **correct**, not a gap: research was
`skipped-by-judgment`, and the skill's contract is that the section *and its ToC entry* then
disappear. (The string "Best practices & next steps" does occur twice in 29's body — both times as
prose *describing the explainer format*, at offsets 1966 and 14020, never as a heading. Verified by
reading the surrounding text.)

**Citation domains survive text extraction** (the point of the "link plus the bare domain" rule —
FTS and MCP store extracted text):

| id | domains found in extracted text |
|---|---|
| 29 | none — research skipped, as claimed |
| 30 | `sqlite.org`, `elastic.co`, `fastapi.tiangolo.com` |
| 31 | `developer.mozilla.org` |
| 32 | `cheatsheetseries.owasp.org`, `nginx.org` |
| 33 | `adr.github.io` |

Exactly the set `phase.md` records, no more and no fewer.

**It reads as a series.** Every document opens by naming its own position and handing off:

- 29 — "Part 1 of a five-part series… Part 2 is the internals… Read them in order — each assumes the one before."
- 30 — "Part 2 of a five-part series… Part 1 described the product… Part 3 covers the two front ends…"
- 31 — "Part 3 of a five-part series… part 2 was the engine room, ending with a document on disk…"
- 32 — "Part 4 of a five-part series… Part 5 closes the series with the decision record…"
- 33 — "Part 5 of five — the last in a series… Parts 1–4 described a system…"

The handoffs are *substantive*, not boilerplate: 30 opens where 29 stopped, 31 opens where 30
stopped ("ending with a document on disk and a row in SQLite"), and 33 explains why 1–4 exist.

**On disk and self-contained.** `docs/knowledge/` holds the five HTML files plus the API-created
`index.md`; each file has **zero** external `<script src>` and **zero** external `<link href>`, with
one inline `<script>` (the quiz) — the self-contained contract holds. `docs/index.md` carries all
five Recent bullets.

**Spot-checks of load-bearing technical claims** (the product here is *understanding*, so accuracy
is the deliverable):

| claim in the series | verified against |
|---|---|
| `RRF_K = 60` matches Elastic's default rank constant | `server/search.py:35` |
| `canonical_path` lives only in `documents_api.py` + `graph_api.py`, never `main.py` | `grep -rn canonical_path server/*.py` — confirmed |
| the 201's pretty URL is built at a third site | `server/main.py:578 resolve_org_slug` |
| `targetOrigin: "*"` is deliberate, not laziness | `web/src/app/(public)/documents/[id]/explainer-frame.tsx:61` — the in-repo comment says so |
| two executor tiers, not three (the stale `slice-executor-low` raised as a next step, not described) | `.claude/agents/` and `.codex/agents/` each still carry a `slice-executor-low` file — S5 correctly described two and flagged the file |

## 3. The README audit holds

`README.md` — 118 lines, six sections **in the original order**, verified by `grep -n '^#'`:
`# Knowledge Base` → `## Install the plugin` → `## Command-line interface` → `## How it's built` →
`## Recreating from scratch` → `## Agentic workflow`.

Stale strings — reproduced S6's greps, `grep -nE "library index|Nothing publishes until I
push|FTS5|mkdocs serve|knowledge.hi2vi.com/graph/" README.md` → **no hits**.

New claims — all present: `install.sh`, `SKILL.md`, `KB_API_BASE_URL`, `hybrid`, `RRF`, `MCP` (×2),
`postgres`, `@leetusik/graph` (×2), `Pretty share links`.

Live URL checks (`curl`, never `urllib`):

| URL | result |
|---|---|
| `https://knowledge.hi2vi.com/` | 200 |
| `https://knowledge.hi2vi.com/@leetusik/graph` | **200 anonymous** — the new headline link works |
| `https://knowledge.hi2vi.com/install.sh` | 200 |
| `https://knowledge.hi2vi.com/SKILL.md` | 200 |

Every factual claim re-derived from source, not taken on S6's word:

- **Edge map** — `deploy/knowledge.conf` has `/api/` → api, `/api/auth/` → web, regex
  `^/api/documents/[0-9]+/raw$` → web, `/auth/` `/app/` `= /healthz` → api, `/mcp` → mcp, `/` → web.
  The README's "one nginx edge fronting api + Next web app + MCP" is accurate.
- **`KB_GIT_PUSH: "true"`** at `compose.prod.yml:58` — the scoped push claim is right.
- **Hybrid search** — `server/search.py` (`RRF_K = 60`, BM25 ∪ cosine) backs the corrected wording.
- **`DATABASE_URL` set unconditionally** at `compose.yml:40` — S6's item-10 finding confirmed.
- **`get_tenant_one_id()`** at `server/api_auth.py:88` returns `None` when `KB_OPERATOR_EMAIL` is
  unset, before touching Postgres — so the bare-restore claim ("content plane self-heals; accounts
  plane starts unmigrated") is correct.
- **`docker compose exec api alembic upgrade head`** — the exact form `compose.yml`'s own comment
  prescribes ("Migrations run explicitly: `docker compose exec api alembic upgrade head`"), and the
  `Dockerfile` installs deps `--system` (no venv), so `alembic` is on PATH without `uv run`. The
  command as printed will work; it is a correct local adaptation of `operations.md`'s hosted form.
- **`scripts/graph_hook.py`** present and the `kb` MkDocs service still wired in `compose.yml` — the
  "local static graph still builds" claim is not describing dead code.

## 4. Blast radius

`git log --stat 73eddb8..HEAD`, all thirteen commits in the phase's range:

- **Exactly one source file in the whole phase: `README.md`** (+64 / −30).
- Everything else authored by the workspace is under `works/` (backlog, deferred, events, index,
  state, and the P26 phase tree).
- `docs/knowledge/*.html`, `docs/knowledge/index.md`, and the five `docs/index.md` Recent bullets
  arrive in five commits authored by **`kb-api <kb-api@localhost>`** — the hosted API's own commits,
  pulled in by rebase, exactly as `phase.md` §Constraints 2 predicted. Not slice output.
- **No `docs/current/*.md`, no `docs/versions/`, no `docs/index.json` change anywhere in the phase.**
- Working tree at review time: only `works/` bookkeeping + this slice's untracked `plan.md`.

## 5. Workflow integrity

One commit per slice, in order, all authored `leetusik`:

```
15c1230 chore(works): decompose P26 into five knowledge explainers and a README audit
b92f504 chore(works): strip stray tool-call tags from P26 phase notebook   (cosmetic fixup)
d998b86 docs(works): P26.S1 …(KB doc 29)
d963c82 docs(works): P26.S2 …(KB doc 30)
6a85cef docs(works): P26.S3 …(KB doc 31)
654e5ef docs(works): P26.S4 …(KB doc 32)
d22fdcc docs(works): P26.S5 …(KB doc 33)
9b5c0de docs(readme): P26.S6 audit README against P14-P25 reality
```

The five `kb-api` commits sit *below* the decomposition commit in the log — the expected result of
`git pull --rebase` between explainer slices replaying local work on top. The two histories did not
diverge; §Constraints 2 was honored.

---

## Judgment against `intent.md`

| what the intent asked | delivered |
|---|---|
| a phase whose product is *understanding*, not code | yes — one source file changed, and it is the README |
| 4–5 **substantial** explainers, not over-split | **five**, 17.7k–26.0k extracted chars each; the cut is argued in `phase.md` §Why this cut, and the fifth slice is justified by a real second front end |
| written to be read **in order** as a short series | yes — verified above; each part names its position and hands off with substance |
| audience = the **new maintainer** only | yes — every explainer is framed "for someone taking over"; no install-the-plugin user voice leaked in |
| public/user-facing series stays a separate later phase | honored — nothing user-facing was written |
| a **light** README audit-and-fix, not a rewrite | yes — see below |
| `DECOMP` groups for *this* system, not vocky's | yes — the fifth slice and the product/engineering split of the distribution story are knowledge-specific and reasoned, not copied |

### The two recorded judgments I was asked to weigh

**1. S4's "do not re-split" — I agree, without reservation.**

The recommendation is honest in the right way: S4 named its thin areas out loud (QA manual missions,
the usage-metering plane's security posture, per-tenant usage isolation, CLI credential-hygiene
specifics, the P10/P18/P19/P20 cutover histories) instead of implying full coverage, which is exactly
what §Constraints 9 demanded. Three reasons to accept it:

- The 4–5 target in `intent.md` exists *specifically* to prevent over-splitting — the operator
  recorded it because vocky's first pass cut ten narrow slices and had to be re-cut. Cutting a sixth
  here would re-run the mistake the intent was written to avoid.
- The enumerated gaps are genuinely peripheral to "full internal understanding". Usage metering is a
  plane the product does not yet monetize (D12); the cutover histories are archaeology that
  `decisions.md` already holds and that S5 teaches a reader how to navigate. None of them is
  load-bearing for someone taking the project over next week.
- S4 is the *shortest* document while carrying the largest source grouping — which reads as evidence
  of selection, not exhaustion. Its depth went to the things that bite (payload isolation, the three
  nginx footguns, deploy ordering, 404-never-403, the silent-publish failure class).

The proposed home — a later targeted explainer, e.g. "Knowledge's credential and usage planes" — is
the right shape and is now recorded for the operator below.

**2. S6's 118 lines against a 95–110 estimate — this is still an audit, not a rewrite.**

The estimate was a plan's guess, not a constraint, and the diff settles the question:

- All six sections survive, in order, with their headings unchanged.
- The lede paragraph ("Technical explainers written from real project work…") and the entire
  "Agentic workflow" section are untouched, so the file's voice is the same file's voice.
- Every insertion maps to a pre-recorded staleness item; the growth is concentrated in content the
  intent explicitly called *missing* (the hosted web app, MCP, pretty share URLs, the P20 CLI
  on-ramps) — "fix what is stale, wrong, or missing" is the intent's own wording, and missing content
  can only be fixed by adding lines.
- +64/−30 on an 84-line file, with no section added, reordered, or dropped.

A rewrite would have restructured or re-voiced the file. This did neither.

### Other observations

- **The eleven-item staleness list is fully discharged**, and item 10 produced a genuine code-read
  finding (`get_tenant_one_id()`'s early `None`) that made the restore claim *more* precise rather
  than hedged. That is the audit working as intended.
- **`phase.json.status` is still `planned`** with `started_at: null` even though every slice is done.
  This is pre-existing workspace practice, not a P26 defect — P21–P24 show the identical pattern and
  all reached `done` through `review-phase`. `validate` passes. Noted, not a finding.

---

## Doc versioning

**No doc versions created.** The *Doc impact* list is all-none, and I verified that independently
rather than taking it on trust:

- `git log --stat` over the entire phase shows **no change to any `docs/current/*.md`, any
  `docs/versions/` file, or `docs/index.json`** — the phase's only source edit is `README.md`, which
  is not under `docs/` and is not a `doc-new-version` candidate.
- Each explainer slice's output is KB content written by the hosted API into `docs/knowledge/`, which
  is published-document space, not this repo's durable doc tracks — "none by construction"
  (§Constraints 7) is correct.
- S6's decision is correct on its own terms too: every correction pulled `README.md` **up to** what
  `docs/current/product.md` and `operations.md` already state, so no durable truth changed.

A `doc-new-version` run here would produce a changelog entry saying nothing changed, which is worse
than none.

**One bookkeeping completion:** the running list recorded lines only for `DECOMP` and `S6`; `S1`–`S5`
each declared "Doc impact: **none** — by construction" in their own `result.md` but had no line in
the list. I appended those five lines to `phase.md` so the list is literally complete. The
substance was already correct — this changes no conclusion.

**One durable-doc drift found but deliberately not fixed** (see finding 3 below): `operations.md`'s
"Locally `DATABASE_URL` may be left empty" note is stale against `compose.yml:40`. This is drift the
phase *observed*, not drift the phase *created*, so it is not this review's to consolidate —
surfacing it is the correct move, and I re-verified it holds.

---

## Findings for the operator (decisions, not defects)

1. **The series is not publicly readable — project `knowledge` is private.** Re-verified anonymously:
   `GET /documents/29` → **307 → `/login`** (proving a `canonical_path` *was* emitted), and
   `GET /@leetusik/knowledge/knowledge-what-it-is-and-how-it-is-used` → **404** (404-never-403 on a
   private project). This is the correct P19 default and nothing in `intent.md` requires public
   reads. **If this series should be public, flip project `knowledge` to public from its project
   page** — one operator action, no code. Worth noting the asymmetry it creates today: the README's
   new headline points at `/@leetusik/graph`, which *is* public (200 anonymous), while the five
   explainers behind that graph are not.

2. **Four cheap next steps proposed across the explainers**, none in this phase's scope:
   (a) archive the five finished phases P21–P25 (`rotate-backlog`); (b) sweep the deferred triggers —
   **D17** (anonymous-read rate limiting, the one unchecked box on the project's own security
   checklist) and **D23** have plausibly already fired; (c) retire the stale `slice-executor-low`
   agent file — confirmed still present in **both** `.claude/agents/` and `.codex/agents/` while the
   contract describes two tiers, which is exactly the "reader believes three tiers exist" failure the
   workspace's own accuracy claim is meant to prevent; (d) give the two-implementation config seam
   (CLI resolver vs. the skill's inline resolver) a shared conformance fixture.

3. **`docs/current/operations.md` is slightly stale**, found by S6 and re-verified here:
   line 32 says "Locally `DATABASE_URL` may be left empty to keep accounts dormant", but
   `compose.yml:40` now sets it unconditionally. Deliberately not fixed — widening into
   `docs/current/` was declined by the operator at intent capture, and this drift predates P26. It
   belongs in a future doc pass or a deferred job, at the operator's call.

4. **S4's recorded coverage gaps have a proposed home.** If the operator wants them, the right
   vehicle is one later targeted explainer ("Knowledge's credential and usage planes"), not a re-cut
   of P26. I agree with that shape; recording it here so it is not lost when the phase archives.

---

## Validation summary

| command | outcome |
|---|---|
| `python3 scripts/workflow.py validate` | **PASS** |
| `python3 scripts/workflow.py next` | PASS — `P26.REVIEW` current, nothing after |
| `curl … /api/documents?project=knowledge&limit=50` | PASS — 200, `total: 5`, ids 29–33, all v1 |
| `curl … /api/documents/{29..33}` ×5 | PASS — titles, section order, char counts, citation domains all as claimed |
| anonymous `curl /documents/29` | PASS — 307 → `/login` (private project, expected) |
| anonymous `curl /@leetusik/knowledge/<slug>` | PASS — 404 (404-never-403, expected) |
| anonymous `curl /@leetusik/graph`, `/install.sh`, `/SKILL.md`, `/` | PASS — 200 each |
| `grep -nE "<stale strings>" README.md` | PASS — no hits |
| `grep` for the new claims + `grep -n '^#'` | PASS — all present; six sections in order |
| `git log --stat 73eddb8..HEAD` | PASS — `README.md` is the only source file in the phase |
| `git log --format='%an'` over the range | PASS — five `kb-api` commits are API-authored, not slice output |
| self-containment check on the five HTML files | PASS — 0 external scripts, 0 external stylesheets, 1 inline `<script>` each |
| source cross-checks (`search.py`, `api_auth.py`, `main.py`, `compose*.yml`, `deploy/knowledge.conf`, `explainer-frame.tsx`) | PASS — every spot-checked claim holds |

No Python `urllib` was used anywhere (§Constraints 3).

## Deviations from `plan.md`

One, additive: the plan asked me to *verify* the Doc impact list's completeness. It was
substantively correct but literally missing the `S1`–`S5` lines, so I appended those five "none"
lines to `phase.md` rather than only reporting the gap. No doc versions were created and no
conclusion changed.

## Explainer

`explain: not written — run /explain for this phase`.

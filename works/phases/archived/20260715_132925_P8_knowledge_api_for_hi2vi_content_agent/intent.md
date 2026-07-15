# Intent — P8

- Captured at: 2026-07-14T15:16:37+09:00
- Origin: operator (during the hi2vi_web P15 design sign-off conversation, 2026-07-14)

## Original Input (verbatim)

> 7. knowledge will be saved at knowledge dir as md file and db stored. like /explain skill. knowledge improving. so you may ask endpoint for those(it may already provide)
>
> for 7, make a dedicated phase for the knowledge dir so that hi2vi content agent can wire.

(Point "7" refers to sign-off point 7 of the hi2vi_web P15 content-agent design — the knowledge
write path. Follow-up answer while creating this phase, to "how should the hi2vi prod server reach
the knowledge API?": )

> 1. and tell me how the thing should be done by which order. for both repo.

(Option 1 = "Phase DECOMP proposes" — hosting is designed at this phase's DECOMP, not pinned now.)

(Addendum, 2026-07-14, same conversation:)

> good. and one more, since we utilize the knowledge, we should also able to use existing knowledge
> for content creation. do we ready for that? if not, add the feature.

(Addendum, 2026-07-14, at phase-execution kickoff — `/do-whole-phase` invocation note:)

> note that the knowledge also will be deployed to public you know right? and about to use hi2vi
> domain. knowledge.hi2vi.com will be enough.

## Confirmed Intent (refined + clarified)

Make the knowledge project's **document API production-consumable by the hi2vi content agent** —
the daily research pipeline being built at `hi2vi_web` P15 (see that repo's
`works/phases/active/P15/design.md` §8 and `intent.md`). The hi2vi.com prod server (a Docker
co-tenant on the shared OCI box) must be able to save a daily deep-research doc to this knowledge
base **exactly the way the `/explain` skill does** — `POST /api/documents` writing the md file
(convention-exact frontmatter) + the `docs/index.md` Recent bullet + the SQLite/FTS row + embedding,
with the scoped git commit — "it may already provide" most of this; verify and extend only what's
missing.

**The phase delivers:**

1. **A production-reachable endpoint** — today the API runs only on the operator's machine
   (`compose.yml`, `localhost:8766`). Hosting/reachability approach (e.g. co-tenant on the shared
   OCI box over the private Docker network, public URL + token, or tailnet-only) is **proposed by
   this phase's DECOMP** (design-first, like hi2vi P15) and signed off by the operator before
   implementation.
2. **Auth enforced** — bearer-token auth for writes (the server already supports `KB_API_TOKEN`);
   provision the token for hi2vi.
3. **`docs/hi2vi/` project-folder bootstrap** — the hi2vi agent writes with `project: "hi2vi"`
   (research docs; semantically distinct from the engineering-explainer `docs/hi2vi_web/`): folder
   `index.md` + site-smoke-test compatibility, so the first agent write cannot break the Pages
   deploy.
4. **Publish-on-write** — agent-written commits must reach `main` → the Pages deploy **without
   operator action** (how — the hosted API pushes, or a knowledge-side sync — is DECOMP's design
   call). This is an accepted, deliberate departure from the local "agent never pushes" convention,
   scoped to this write path (hi2vi research publishes unreviewed, per hi2vi P15 intent).
5. **Read/search exposed too (operator addendum, 2026-07-14)** — hi2vi also *uses existing
   knowledge for content creation*: the hosted endpoint must expose the already-built read/search
   API (hybrid BM25 + semantic search, document get — this repo's P2/P4 work) under the same bearer
   auth, for hi2vi's topic dedup, research grounding, and drafting context. Mostly exposure, not new
   build — verify the existing endpoints and extend only what's missing.
6. **A frozen API contract for the consumer** — the write path (`201` url/commit_sha, `409`
   duplicate, `422` convention, `401` auth) **and the search/read shapes** that hi2vi `P15.S4`
   plans against, plus the config hi2vi needs (`KNOWLEDGE_API_URL`, `KNOWLEDGE_API_TOKEN`).

**Cross-repo dependency:** hi2vi `P15.S4` (research + knowledge write client) consumes this phase's
API contract at planning time and needs a reachable endpoint for its e2e (P15.S9). hi2vi P15.S1–S3
do not depend on this phase.

## Clarifications Resolved

- Q: How should the hi2vi prod server reach the knowledge API (hosting)? — A: **This phase's DECOMP
  proposes** (design-first; operator signs off before implementation). Candidates to weigh:
  co-tenant on the shared OCI box (private network), public endpoint + bearer token, tailnet-only.
  - **Updated at execution kickoff (2026-07-14, operator note above; interpretation approved at the
    orchestrator's plan gate):** the hosted knowledge API goes **public at `knowledge.hi2vi.com`**
    (a subdomain vhost on the shared OCI edge, alongside hi2vi.com); one subdomain is enough — hi2vi
    consumes that public URL with a bearer token, no separate private-network path required. The
    GitHub Pages site stays at `leetusik.github.io/knowledge/`. The knowledge content is already
    public on Pages, so a public API surface leaks nothing new — but per point 5 read/search still
    go behind the same bearer auth on the hosted deployment. DECOMP designs the rest (publish-on-
    write mechanism, clone freshness, secrets) for operator sign-off before implementation.
- Q: One phase or fold into hi2vi P15? — A: **Dedicated phase in the knowledge workspace**
  (operator-directed: "make a dedicated phase for the knowledge dir so that hi2vi content agent can
  wire").

## Notes

- P7 (Claude Code plugin) was already in flight in this workspace when P8 was created — P8 was
  created as the next phase id and does not touch P7's in-progress work.
- The operator also asked for the cross-repo execution order ("tell me how the thing should be done
  by which order. for both repo") — recorded in the phase-creation report: hi2vi P15.S1–S3 can run
  independently; knowledge P8 (DECOMP → sign-off → implementation) should complete before hi2vi
  P15.S4 e2e; P7 here is independent of both.

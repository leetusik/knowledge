# Plan — P26.S4 (Knowledge: shipping and running it — distribution, deploy, security, QA)

## What this slice is

**Explainer 4 of 5.** One `/explain` run, published to the KB as project `knowledge`. No repo source
changes. Run **inline on the main thread** (`phase.md` §Constraints 1).

## The question this explainer answers

*How does this reach users, and how does it stay trustworthy?* One argument in four movements —
how it ships, how it is defended, how it runs in production, and how we know it works.

## The open question this slice must answer

`phase.md` §Open Questions asks whether **S4 is too much for one `/explain` run**: it carries
~1,606 doc lines (`operations.md` 631 + `qa.md` 551 + `security.md` 339) plus the plugin packaging
machinery, the deploy kit, and four CI workflows.

**Answer it explicitly in `result.md`, either way.** Do not silently thin the coverage — that is the
failure mode the constraint names. If one run genuinely cannot do it justice, say so; the pre-agreed
re-split is *distribution + release* vs *security + prod topology + QA gates*, and it needs an
operator ask (§Constraints 9 caps the series at five).

**Mitigation before resorting to that:** this is a slice where selecting the *load-bearing* facts
matters more than coverage breadth. Four or five ideas told well beat forty listed. Prefer depth on:
payload isolation, template-sync as byte parity, the edge's location-order footguns, 404-never-403,
and the gate map.

## Series framing

Part 4 of 5. S1 product, S2 internals, S3 read surfaces — **do not re-explain any of them**. In
particular S2 owns the write path and S3 owns the render; reference and move on.

## Sources to cover

Per `phase.md` §*Sources per knowledge topic* → **S4**:

- **Docs:** `operations.md`, `security.md`, `qa.md`, **plus** `architecture.md` §*Plugin packaging:
  marketplace + isolated payload + template-sync (P7)* and §*Open-core template mirrors the SaaS
  server (P17)* — the two sections deliberately reassigned here from S2.
- **Code/files:** `plugin/.claude-plugin/plugin.json` + the repo-root `.claude-plugin/marketplace.json`,
  `plugin/templates/manifest.json`, `plugin/templates/kb/**`, `plugin/setup/render.py`,
  `scripts/plugin_parity.py`, `scripts/skills_parity.py`, `scripts/site_smoke.py`,
  `scripts/cli_smoke.py`, `scripts/onboarding_smoke.py`; `compose.yml`, `compose.prod.yml`,
  the three Dockerfiles, `Makefile`, `deploy/` (`knowledge.conf`, `deploy.sh`, the two remote
  scripts, `SECRETS.md`), `.github/workflows/*`, `tests/`, `mcp-server/tests/`.

## Anchors the explainer must land

- **Payload isolation** — a plugin's `source` dir is copied *whole* into every installer's cache, so
  `source: "./"` would ship the operator's `docs/`, `works/`, `data/`, and tokens. Pointing the
  marketplace at `./plugin` is the entire boundary. This is the single most consequential line of
  configuration in the repo.
- **Template-sync is a byte-parity snapshot, not a fork** — one manifest, three file classes, one
  renderer shared by the setup skill *and* the parity guard, drift fails CI. Plus the P17 mirror
  decision: ship the *whole* server and achieve single-tenant dormancy with **one render token**
  (`{{KB_DATABASE_URL}}` empty → `DATABASE_URL` unset → accounts plane off) rather than a code branch.
- **The second gate for the skill copies** — `skills_parity.py` byte-compares the shipped explain-skill
  copies, including the landing-served `/SKILL.md` as a full-file identical copy, so the published
  skill can never fork from the canonical one.
- **The single nginx edge and its location-order footguns** — longest-prefix wins; the regex
  `^/api/documents/[0-9]+/raw$` beats every prefix; and the rule that the first `proxy_set_header`
  inside a location **drops the entire inherited set**. These are the kind of thing that is obvious
  once and catastrophic once.
- **`KB_GIT_PUSH` as a deployment flag** (S2's handoff) — false everywhere except the box — together
  with the revised "agent never pushes" rule and the two-credentials-never-conflated split.
- **404-never-403** as the tenancy boundary, and **XSS containment by opaque origin rather than
  sanitizing** (S3 explained the mechanism; here it is a *security posture*).
- **Deploy ordering** — build → migrate → recreate+gate api → web/mcp — and why `alembic upgrade
  head` runs *inside* the container (Postgres publishes no host port).
- **The gate map**, and the honest split S3 handed over: what is machine-verified in CI versus what is
  a recorded operator residual (no browser/jsdom tooling in the repo), plus the known fragile areas.

## Invocation

Topic mode, no trailing flags; judgment gate decides research, record the outcome.

## Constraints

Inherited from `phase.md` §Constraints: no `here` flag; no repo source changes; verify with `curl`;
`git pull --rebase` after the save, before committing.

## Done when

- Published (201 recorded) and verified with one `curl` GET.
- `result.md` records the topic, identifiers, research outcome, **an explicit answer to the "is S4
  too big" open question**, and any finding for S5.
- Cross-slice note appended to `phase.md`; `validate` passes.

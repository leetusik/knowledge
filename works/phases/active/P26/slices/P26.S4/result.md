# Result — P26.S4 (Knowledge: shipping and running it)

**Explainer 4 of 5 published.** Run inline by the orchestrator per `phase.md` §Constraints 1.

## What landed

| | |
|---|---|
| Document id | **32** |
| Version | **1** (`PRIOR=none`) |
| Title | Shipping and Running Knowledge: Distribution, the Edge, Security, and the Gates |
| `rel_path` | `knowledge/2026-08-08-shipping-and-running-knowledge-distribution-the-edge-security-and-the-gates.html` |
| URL | `https://knowledge.hi2vi.com/@leetusik/knowledge/shipping-and-running-knowledge-distribution-the-edge-security-and-the-gates` |
| Tags | `operations`, `security`, `plugin-distribution`, `nginx`, `new-maintainer` |
| Extracted text | 20,566 chars |

`committed: true` (`1b83c8d5`), `pushed: false` + `push_pending: true` (normal).

## The open question, answered: **was S4 too much for one run?**

**One run sufficed to produce a coherent, high-quality explainer — but its coverage is deliberately
selective, and that must be said out loud rather than glossed** (`phase.md` §Constraints 9 forbids
silently thinning).

The evidence is in the numbers. S4 draws on the largest source grouping in the cut (~1,606 doc lines
plus the plugin machinery, the deploy kit, and four workflows) yet produced the **shortest** document
of the four so far:

| slice | source scale | extracted chars |
|---|---|---|
| S1 | 554 doc lines | 25,242 |
| S2 | ~1,310 doc lines + `server/` | 26,037 |
| S3 | 841 doc lines + `web/` | 22,047 |
| **S4** | **~1,606 doc lines + machinery** | **20,566** |

The plan's mitigation — *select the load-bearing facts; four or five ideas told well beat forty
listed* — is what made the run work, and it worked well. What got **real depth**: payload isolation,
template-sync as byte parity plus the mirror-don't-narrow dormancy token, the three edge footguns
(with the nginx inheritance rule cited from the source), deploy ordering and in-container migrations,
the two-credentials split, 404-never-403 as a rule rather than a habit, the gate map, and the
silent-publish failure class.

What is **thin or absent**, named honestly: the QA manual missions in any detail, the usage-metering
plane's security posture, the per-tenant usage isolation rules, the CLI credential-hygiene specifics
(two-token model, `redact_token`, the `$KB_API_TOKEN` → tenant-#1 hazard), and the several historical
cutovers (P10/P18/P19/P20) which are named as a shape but not walked.

**Recommendation: do not re-split.** A new-maintainer series is meant to be read end to end, and a
sixth document would buy completeness at the cost of the property that makes the series usable. The
omissions above are enumerated here so they are *recorded gaps*, not silent ones — the right home for
them, if the operator wants them, is a later targeted explainer (e.g. "Knowledge's credential and
usage planes") rather than a re-cut of this phase. Re-splitting would also need an explicit operator
ask under §Constraints 9. **Flagged for `P26.REVIEW` and the operator.**

## Research section: **included**

Two pages opened, cited with bare domains in plain text:

- `https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html` — Argon2id as
  the first-choice recommendation, with its minimum parameters (19 MiB, 2 iterations, parallelism 1).
  This produced a concrete, actionable audit suggestion rather than a compliment: **verify the
  configured argon2 parameters against those minimums**.
- `https://nginx.org/en/docs/http/ngx_http_proxy_module.html` — the `proxy_set_header` inheritance
  rule, which turns out to state the repo's footgun **verbatim**: directives are inherited "if and
  only if there are no `proxy_set_header` directives defined on the current level". Worth noting that
  the repo's warning is not a discovery but documented platform semantics written down where the
  person who will trip over it is standing.

Four next steps proposed, each grounded: rate-limit the anonymous read surface (**the one unchecked
box on the project's own security checklist**), run the parity gates pre-commit rather than CI-only
(drift shipped twice because of this), give the silent-publish class a loud signal (pairs with S2's
boot-time push reconciliation), and add one headless-browser check to CI (the technique is already
demonstrated in-repo by the P25.F4 throttled probe).

## Verification (with `curl`)

`id: 32`, `version: 1`, 20,566 chars; all five section headings present, and both citation domains
(`cheatsheetseries.owasp.org`, `nginx.org`) survive text extraction.

## Findings

1. **S3's handoff is discharged.** The gate map is written as an explicit table of what each layer
   gates, followed by the honest statement of what no gate covers — the browser-QA residuals — and
   *why* (no browser or jsdom tooling in the repo). Naming them as residuals rather than pretending
   coverage is the correct posture; the growing-list problem became next step 4.
2. **The security story is best told as a widening threat model, not a static posture.** Structuring
   Background as six successive widenings (personal KB → installable → public internet with a write
   credential → accounts and PII → executable untrusted documents → anonymous reads) makes each rule
   legible as a response to a specific expansion. A flat checklist would not teach that.
3. **The riskiest thing in the system is a failure that produces a success.** The silent-publish
   class deserved its own callout: everything the push path needs fails without a loud signal, writes
   keep returning 201, and no unit test can observe it. Since P24 moved publishing behind the
   response it is quieter still.
4. **For S5:** three decisions are named here as facts and are S5's to justify — no PyPI publish, the
   pinned un-revokable master bearer as a deliberate concession, and mirror-don't-narrow for the
   open-core template. S4 states what they are; S5 owns why they were chosen and what they cost.

## Doc impact

**None** — by construction.

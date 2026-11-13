PUBLISHED (full) — What happens when you publish: the POST /api/documents write path
- url: http://localhost:8765/knowledge/2026-10-23-post-api-documents-write-path/ · v1 (new document)
- resumed run 20261023-0350-post-api-documents-write-path from D6 (research unchanged; outline, draft, critique and publish redone)

## Mode
mode: parallel · agents: plugin · wave: 5 · verifier: claude-sonnet-5-5 · critic: claude-sonnet-5-5
quote-match: exact · caps: agent · searches: 1 (lead); limit hit: no
- degraded: none. The critic read pages by curl/WebFetch (substance match) rather than the converter.

## Research
- tier 2 · 5 researchers in wave 1 (+1 re-dispatch), 3 in round 2 · 2 gap rounds · stop: complete · ceiling 12/18
- 31 sources · 181 claims · verified: r1 90 (79 supported, 11 partial), r2 30 (24 supported, 6 partial), final 10 (8 supported, 2 partial)
- counter-evidence on 3 main claims: none found
- D-01 resolved-by-scope: older docs say validation runs under the lock; the code (post-P31.S1) validates first
- D-02 open: architecture.md "Everything the caller waits for is local disk + SQLite" vs the code, where a publish can wait at WRITE_LOCK behind a push
- gate: must-cover 5/5 · load-bearing questions 16/16 answered or contested → pass

## Declared gaps
- Q16 (indirect wait, D-02): stated in #no-network
- G-r2-01 (total wait bound): stated: bounds exist only per git subprocess
- G-r2-02 (object transfer): dropped
- G-r2-04 (failed rebase --abort): stated in #after-201
- Q15 (index.lock): dropped

## Critic
- revise (high) · must-fix 4 (facts 3, quiz 1) · should-fix 5 · notes 4
- the 4 must-fixes and 5 should-fixes are fixed; notes: C10 and C12 fixed, C11 and C13 declined (reasons in run.md) · no confirm pass

## Where it landed
- loose document, project knowledge, rel_path knowledge/2026-10-23-post-api-documents-write-path.md, lang en
- committed: true (aeb29656) · pushed: false · push_pending: false (pushing is off on this server) · warnings: none

## Dossier
/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/f1/runs/c2/state/knowledge-kb/explain/20261023-0350-post-api-documents-write-path

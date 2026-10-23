PUBLISHED (quick) — Honouring Retry-After on 429 and 503
http://localhost:8765/http-clients/2026-10-23-honouring-retry-after-on-429-and-503/ · v1 (new; no previous version)

Resumed from D9 in a new session. The publish had already landed in the first session (201, commit ace716cd). On resume a read of the document by path returned 200, so nothing was published again.

## Mode
mode: sequential-research (lead researches alone) · agents: plugin · wave: 0
verifier: knowledge:verifier on opus (claude-opus-5-5) · critic: none (quick)
quote-match: exact · caps: agent · searches: 0 listed; limit hit: no
Preflight redone on resume: probe A ok; probe B all six calls ok.

## Research
Quick run, tier 1. The lead researched alone: 4 sources, 11 claims, quotes checked 19/19. One verifier batch (10 claims): 9 supported, 1 partial (C-r1-prac-03, narrowed). Skipped by design: gap rounds, counter-evidence, the critic. Gate: must-cover 0/0, load-bearing questions 4/4 answered, pass. No disagreements recorded.

## Declared gaps
- Q6 clock skew with an HTTP-date Retry-After: not found, dropped (not asserted).
- Q5-extra libraries other than urllib3: not searched, dropped.

## Critic
none (quick)

## Where it landed
Loose document, project http-clients, subject "HTTP clients", lang en. Committed; pushed: false, push_pending: false. No warnings.

Dossier: /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/f1/runs/confirm2/state/knowledge-kb/explain/20261023-1058-honouring-retry-after-on-429-and-503

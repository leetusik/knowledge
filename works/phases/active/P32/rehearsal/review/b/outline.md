# Outline (final, D6): 20261023-1559-hsts-safe-rollout
## Reader's task
- T1 know what the header makes a browser do (and what it does not) → the two effects + the sequence diagram + the first-visit gap
- T2 serve the header correctly → the directive table + "serve it right" checklist + nginx line
- T3 roll it out without locking anyone out → the rollout checklist with the max-age ladder, and how to undo
- T4 decide on preloading → the "preload if… / don't yet if…" table
## Background {#background} · T1 · ~200 words · why HTTPS alone leaves a gap
- C-r1-foundations-07 (bootstrap) only as setup; framing
## What the header does {#what-it-does} · T1 · ~450 words
- Q1 answered · Q4 answered
- C-r1-foundations-01 supported · C-r1-foundations-02 supported · C-r1-foundations-13 candidate (n-lb) · C-r1-foundations-07 supported · C-r1-practice-07 partial (narrower) · C-r1-foundations-10 supported (redirect in diagram)
- diagram hsts-sequence: C-r1-foundations-10, C-r1-foundations-01, C-r1-foundations-05, C-r1-foundations-02
## The header, directive by directive {#the-header} · T2 · ~300 words
- Q2 answered · C-r1-foundations-04, C-r1-foundations-05 supported · C-r1-practice-04 (preload requirements) · callout: C-r1-foundations-09 (n-lb)
## Serving it correctly {#serving-it} · T2 · ~300 words · deliverable: checklist + nginx line
- Q3, Q9, Q10 · C-r1-foundations-03, C-r1-foundations-10 supported · C-r1-practice-08, C-r1-practice-09 candidate (n-lb, rung 1) · gap stated: other servers
## Rolling it out safely {#rollout} · T3 · ~550 words · deliverable: rollout checklist
- Q5, Q6, Q8 · C-r1-practice-01, C-r1-practice-02 supported (attributed) · C-r1-practice-03 (n-lb) · C-r1-foundations-12 supported · C-r1-practice-12 (n-lb, OWASP) · C-r1-foundations-06 supported · C-r1-foundations-08 (n-lb) · C-r1-practice-11 (n-lb)
- diagram ramp: C-r1-practice-01, C-r1-practice-02
## Should you preload? {#preload} · T4 · ~350 words · deliverable: decision table
- Q7 · C-r1-practice-04, C-r1-practice-05 supported · C-r1-practice-06 supported (attributed only) · C-r1-practice-07 partial · C-r1-practice-10 (OWASP, n-lb)
## Best practices & next steps {#best-practices} · ~250 words
- aligns: ramp (C-r1-practice-02, C-r1-practice-03); HTTPS-only header (C-r1-foundations-03); next steps
## Quiz
- q-http-only: C-r1-foundations-03
- q-cert: C-r1-foundations-02
- q-undo: C-r1-foundations-06 (distractor "remove header": C-r1-foundations-08)
- q-subdomain: C-r1-foundations-12
- q-ramp (cloze): C-r1-practice-02
- q-first-visit (recall): C-r1-foundations-07, C-r1-practice-07 narrower first half
## Not used
- C-r1-foundations-11: subdomain policies surviving the parent's max-age=0 — an edge the reader's tasks never meet
- C-r1-practice-13: anecdote; C-r1-practice-05 and C-r1-practice-10 already carry the point

## background
- 429 meaning/MAY header: C-r1-found-05 · 503 MAY: C-r1-found-04 · optional: C-r1-found-04, C-r1-found-05 · servers not required to use 429: C-r1-prac-05 (verified-set note: not in verify batch, rung 1 quoted exact) · 503 reading: C-r1-found-03 · no cache: C-r1-found-05
## intuition
- diagram retry-flow: C-r1-found-01 (two forms), writer's own design for cap/backoff steps
## worked-example
- value forms: C-r1-found-01, C-r1-found-02 · date formats: C-r1-found-06
- code retry_after.py: writer's own illustration (user-visible label says so)
- cap: C-r1-prac-02 · backoff: C-r1-prac-02, C-r1-prac-03 (narrower: backoff off by default, sleep uses Retry-After else exponential) · AWS note: C-r1-prac-04 attributed
## checklist
- idempotent retry paragraph: C-r1-prac-01 (hedged: connection-failure context)
## best-practices
- aligns: C-r1-prac-02, C-r1-prac-04 · choose yourself: C-r1-found-04, C-r1-found-05 (absence of mandated values)
## quiz
- q-forms: C-r1-found-01, C-r1-found-02 · q-missing: C-r1-found-04 · q-cap: C-r1-prac-02 · q-formats: C-r1-found-06 · q-cache: C-r1-found-05

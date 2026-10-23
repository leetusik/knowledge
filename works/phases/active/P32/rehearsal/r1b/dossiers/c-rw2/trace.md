# Trace: 20261023-0350-post-api-documents-write-path · body.md · code @9978d84

## (lede)
- ¶1 s1: framing (commit id: run.md repo commit) · s2: framing (the reader's tasks, outline.md)

## background
- ¶1 s1: C-r1-history-01 · s2: C-r1-history-01 · s3: C-r1-history-01; server/main.py:L72-L80@9978d84 · s4: C-r1-code-write-12 (public-root commit), C-r1-code-write-18, C-r1-code-write-21 (push to GitHub origin), C-r1-code-write-13 (KB_GIT_PUSH default off; only the hosted box opts in)
- code write-lock: server/main.py:L179-L183@9978d84 (C-r1-code-write-01)
- ¶2 s1: C-r1-code-write-01 · s2: C-r1-code-write-01 · s3: C-r2-code-validate-10 (Dockerfile quote) · s4: C-r1-practice-10
- ¶3 s1: framing · s2: C-r2-code-write-01 (sync def); server/main.py:L1302-L1303@9978d84 · s3: C-r1-practice-01 · s4: C-r2-code-validate-10 ("between request threads of one process"; the lock serializes the critical sections)
- callout sync-def: s1: C-r1-practice-03 · s2: C-r1-practice-03 · s3: C-r2-code-validate-10 (the lock serializes the critical sections but not _check_document)

## intuition
- ¶1 s1: C-r1-code-write-26 (partial: handler body's work local; push + embed queue appends) · s2: C-r1-code-write-10 (narrower order), C-r1-code-validate-08 · s3: C-r1-code-write-18 (push and Gemini embed queued), C-r1-code-write-24 not used · s4: C-r1-history-05
- diagram flow-halves: C-r1-code-validate-08, C-r1-code-validate-25 (no lock), C-r1-code-write-10 (order), C-r1-code-write-18 (submit after lock), C-r1-code-write-19 (one worker thread, FIFO), C-r1-code-write-20 (push re-takes WRITE_LOCK), C-r2-code-write-02 (embed takes no lock)
- ¶2 s1: framing · s2: C-r1-history-14 · s3: C-r1-history-14 · s4: C-r1-history-14
- ¶3 s1: C-r1-history-13 · s2: C-r1-history-13 · s3: C-r1-history-13, C-r1-history2-04
- ¶4 s1: C-r1-history-15 · s2: C-r1-history-15 · s3: C-r1-history-15 · s4: C-r1-code-write-27 (attributed to the docstring)

## code
- ¶1: framing
## validate
- code create-document-head: server/main.py:L1302-L1320@9978d84 (elision marked) (C-r1-code-validate-01, -08)
- ¶1 s1: C-r1-code-validate-01, C-r1-code-validate-06 · s2: C-r1-code-validate-02 · s3: C-r1-code-validate-02 · s4: C-r1-code-validate-03 · s5: C-r1-code-validate-06 · s6: C-r1-code-validate-31 (partial: the registry row is the only registry or document write before the handler)
- ¶2 s1: C-r1-code-validate-25 · s2: C-r1-code-validate-25 · s3: C-r1-code-validate-30
- list 1: C-r1-code-validate-09 · 2: C-r1-code-validate-12 · 3: C-r1-code-validate-15, C-r1-code-validate-30 · 4: C-r1-code-validate-17 (format/project 422), C-r1-code-validate-18 (migration 409), C-r1-code-validate-30 · 5: C-r1-code-validate-19 · 6: C-r1-code-validate-20 · 7: C-r1-code-validate-22 (partial), C-r1-code-validate-30
- ¶3 s1: C-r1-code-validate-15 · s2: C-r1-code-validate-22 (narrower: ref/asset errors only after a successful parse)
- ¶4 s1: C-r1-code-validate-26 · s2: C-r1-code-validate-26 · s3: C-r1-code-validate-25 ("the one validation path shared"); C-r1-history-23 not used — inference from one shared function (framing)
- callout older-docs: D-01 side B (S-r1-code-validate-01: architecture.md L28, operations.md L242) · s2: D-01 nature (docs predate P31.S1) · s3: C-r1-code-validate-08

## locked
- ¶1 s1: C-r1-code-write-10 (partial) · s2: C-r1-code-validate-08
- list 1: C-r2-code-validate-01 (quotes), C-r2-code-validate-02 (errors) · 2: C-r1-code-write-03 (rekey); server/main.py:L1413-L1418@9978d84 · 3: C-r1-code-write-03 (partial: archive only when a file exists; version row) · 4: C-r1-code-write-05 · 5: C-r1-code-write-06; C-r1-code-write-32 (assigned ids written into the stored file) · 6: C-r1-code-write-07 · 7: C-r1-code-write-08 · 8: C-r1-code-write-09 · 9: C-r1-code-write-12
- code commit-step: server/main.py:L1559-L1596@9978d84 (elisions marked)
- ¶2 s1: C-r1-code-write-12, C-r1-code-write-15 · s2: C-r1-code-write-12, C-r1-code-write-13 · s3: C-r1-code-write-14 · s4: C-r1-code-write-15
- ¶3 s1: C-r1-code-write-17, C-r1-history-02 · s2: C-r1-code-write-17 · s3: C-r1-code-write-17 · s4: C-r1-history-01 (files canonical), C-r1-history-02

## queue
- code submit: server/main.py:L1618-L1632@9978d84 (C-r1-code-write-18)
- ¶1 s1: C-r1-code-write-18, C-r1-history2-13 · s2: C-r1-code-write-18, C-r1-code-write-13 (default false; docstring: only the hosted box opts in) · s3: C-r1-code-write-18 · s4: C-r1-code-write-19 · s5: C-r1-code-write-19
- code push-task: server/main.py:L186-L202@9978d84 (C-r1-code-write-20)
- ¶2 s1: C-r1-code-write-20 · s2: C-r1-history-04; server/main.py:L190-L191@9978d84 · s3: C-r1-history-04 (attributed to the comments) · s4: C-r1-history2-13 (attributed to backend.md)
- code gitops-push: server/gitops.py:L124-L143@9978d84 (C-r1-code-write-21, -22)
- ¶3 s1: C-r1-code-write-21; server/gitops.py:L107-L108@9978d84 · s2: C-r1-code-write-21 · s3: C-r1-criticism-01, C-r1-criticism-03 · s4: C-r1-code-write-16 (partial: via _run) · s5: C-r1-code-write-16
- ¶4 s1: C-r1-code-write-22, C-r1-code-write-16 (narrower: bare subprocess.run, same timeout, failure swallowed) · s2: C-r1-code-write-22 · s3: C-r1-code-write-23 (narrower: stdout line, traceback to stderr, last_error) · s4: C-r1-code-write-23

## response
- ¶1 s1: C-r1-code-write-29 (framing: "what is durable") · s2: C-r1-code-write-29 · s3: C-r1-code-write-32
- ¶2: framing
- list 1: C-r1-code-write-30 · C-r1-history-07 · list 2: C-r1-code-write-30, C-r1-history-08
- ¶3 s1: C-r1-history-09 · s2: C-r1-history-09
- diagram seq-publish: C-r1-code-validate-08 (validate then acquire), C-r1-code-write-10 (in-lock work), C-r1-code-write-18 (submit after release), C-r1-code-write-19 (worker thread, handler does not wait), C-r1-code-write-30 (push_pending), C-r1-code-write-20 (worker acquires), C-r1-code-write-21 (fetch, rebase, push HEAD:main) (order)

## no-network
- ¶1 s1: C-r1-code-write-26 (partial) · s2: C-r1-code-write-26 · s3: C-r1-history-05; server/main.py:L1315-L1318@9978d84 (quote) · s4: C-r1-history-12 · s5: C-r1-history-12 · s6: C-r1-history-12
- ¶2 s1: C-r2-code-write-01 · s2: C-r2-code-write-01 · s3: C-r2-code-write-02 · s4: C-r2-code-write-01 · s5: C-r2-code-write-01 · s6: C-r2-code-write-02
- ¶3 s1: framing · s2: C-r2-code-write-02, C-r1-code-write-16 · s3: C-r2-code-write-03; G-r2-01 stated · s4: C-r2-code-write-04 (partial), D-02 · s5: framing — reading D-02 side A against side B (the chapter's own reading of the code, C-r2-code-write-01)
- code hanging-push-test: tests/test_api_push.py:L181-L201@9978d84
- ¶4 s1: tests/test_api_push.py:L194-L199@9978d84 · s2: tests/test_api_push.py:L181-L201@9978d84 (one POST) — read from the code
- callout answer: s1: C-r1-code-write-26 (partial), C-r1-code-write-18 · s2: C-r2-code-write-01, C-r2-code-write-02

## invariants
- ¶1: framing
## after-201
- ¶1 s1: C-r2-code-write-08 · s2: C-r2-code-write-08 · s3: C-r2-code-write-08 · s4: C-r2-code-write-08 · s5: C-r2-code-write-08 · s6: C-r2-code-write-07
- ¶2 s1: C-r2-code-write-10 · s2: C-r2-code-write-10 · s3: C-r2-code-write-10; G-r2-04 stated
- ¶3 s1: C-r2-code-write-11 · s2: C-r1-code-write-25 · s3: C-r2-code-write-11 · s4: C-r1-history2-14, C-r2-code-write-11
- callout crash: s1: C-r1-code-write-19 (daemon), C-r1-criticism-13 · s2: C-r2-criticism-08 · s3: C-r2-criticism-09 · s4: C-r1-code-write-25 (drain at shutdown) — analysis linking the three passages (framing)
- ¶4 s1: C-r2-code-write-12 (partial) · s2: C-r2-code-write-12 · s3: C-r2-code-write-12 · s4: C-r2-code-write-12, C-r1-history-18
- code rev-list: C-r2-code-write-12
- ¶5 s1: C-r2-criticism-04, C-r2-criticism-05 · s2: C-r2-code-write-12

## inside-lock
- ¶1 s1: C-r2-code-validate-04 · s2: C-r2-code-validate-04 · s3: C-r2-code-validate-11
- ¶2 s1: C-r2-code-validate-05 (narrower) · s2: framing · s3: C-r2-code-validate-07, -08 (code traces: "the code permits")
- list 1: C-r2-code-validate-07 · list 2: C-r2-code-validate-08
- ¶3 s1: C-r2-code-write-13 (partial) · s2: C-r2-code-write-13 · s3: C-r2-code-write-14 · s4: C-r1-code-write-10 (order), C-r2-code-write-13 (narrower: committed DB steps and file writes stay) — example · s5: C-r2-code-write-16 (narrower) · s6: C-r2-code-write-16 (narrower: docs/index.md staged by every write; `git commit -m` with no pathspec)

## checklist
- ¶1: framing
- 1: C-r2-code-validate-10, C-r1-code-write-01
- 2: C-r1-history2-13 (attributed to backend.md)
- 3: C-r1-history-04, C-r1-history2-13; server/publish.py:L105-L111@9978d84 (drain docstring)
- 4: C-r1-code-write-16 (partial), C-r1-history-06 (merged into C-r1-code-write-16) · reason: C-r1-code-write-20
- 5: C-r2-code-write-01 (reason for the recommendation)
- 6: C-r2-code-validate-04, C-r2-code-validate-07, C-r2-code-validate-08
- 7: C-r2-code-write-13 (partial), C-r2-code-validate-01
- 8: C-r1-history-15 (additive response), C-r1-history-07, C-r1-history-09
- 9: tests/test_api_push.py:L181-L201@9978d84; D-02

## best-practices
- ¶1 s1: C-r1-practice-04 · s2: C-r1-practice-05 · s2 (Response): C-r1-practice-06 · s3: C-r1-practice-15 (attributed)
- ¶2 s1: framing · s2: C-r1-code-write-28 (attributed to the docstring) · s3: C-r1-code-write-28
- ¶3 s1: framing (topic sentence; the pattern descriptions that follow carry it) · s2: C-r1-practice-13 · s3: C-r1-practice-14 (narrower) · s4: C-r1-practice-16 (attributed) · s5: C-r2-code-write-11, C-r2-code-write-07 · s6: C-r2-code-write-08
- next 1: C-r1-history-19 (narrower) · next 2: D-02 (would settle it), C-r2-code-write-01, C-r2-code-write-04 · next 3: C-r2-code-validate-07, -08, -04 · next 4: C-r2-code-write-12 (partial); recommendation (framing)

## quiz
- q-order key b: C-r1-code-validate-08, C-r1-code-validate-19, C-r1-code-validate-25 · explain: C-r1-code-validate-25, C-r1-code-validate-31 (narrower)
- q-pushed key b: C-r1-code-write-30, C-r1-history-07 · explain: C-r1-code-write-30, C-r1-history-09
- q-wait key b: C-r2-code-write-01 · explain: C-r2-code-write-01, C-r1-code-write-20
- q-commit-fail answer: C-r1-code-write-17, C-r1-history-02, C-r1-code-write-18 (no push unless committed); prompt's example: server/gitops.py:L48-L50@9978d84 · explain: C-r1-code-write-17, C-r1-code-write-18
- q-crash blanks: C-r2-code-write-11, C-r1-history2-14 · explain: C-r2-code-write-11, C-r1-code-write-26
- distractors: exempt

## revision after critique.md (C01–C09)
- background ¶1 s3 "by default": server/main.py:L75@9978d84 (config.startup_reindex_enabled) (C10)
- background ¶2 (new, terms): legacy/tenant mode C-r1-code-validate-02, -03 · public root and tenants/ C-r1-code-validate-05; server/main.py:L1564-L1565@9978d84 (tenants never committed) · formats C-r1-code-validate-07 · placement C-r1-code-validate-11 (narrower) · phase names: framing
- background ¶3 s4 "normally": C-r1-practice-10 (C06)
- intuition ¶4 s3 (response change): C-r1-history-07, C-r1-history2-06, C-r1-code-write-30; server/main.py:L1613-L1617@9978d84 (C01)
- validate: auth para / registry para split (C07); same claims
- validate ¶3 s2: C-r1-code-validate-22 (narrower); server/main.py:L1223-L1239@9978d84 (reference resolution only when `native` parsed) (C02)
- response list 3 (push_error): C-r1-history-07, C-r1-history2-06 (C01)
- diagram seq-publish caption s2: C-r1-code-write-19 (submit returns without waiting; worker its own thread) — order not fixed by the code (C08)
- no-network ¶1 s1: C-r1-code-write-26 (narrower) · s2: C-r1-code-write-26 · s3: C-r1-history-05
- no-network ¶2 (new split) s1: C-r1-history-12 · s2: C-r1-history-12 · s3: C-r1-history-12 (ensure_registry_project) · s4: C-r1-code-write-11 (not lb; read at) server/main.py:L1598-L1602@9978d84, server/reader_state.py:L846-L878@9978d84 (anyio.from_thread.run, tenant mode only) (C03) · s5: C-r1-history-12
- no-network callout s1 "GitHub or Gemini": C-r1-code-write-26 (narrower) (C03)
- after-201 callout crash s2–s3: C-r2-criticism-08; "no shutdown code runs, the lifespan's drain included": reasoning from C-r2-criticism-08 and server/main.py:L88-L97@9978d84 (atexit sentence and source removed) (C12)
- inside-lock ¶2 s1 "`documents` table's only uniqueness rule": C-r2-code-validate-05 (narrower) (C06)
- inside-lock ¶3 split; ¶4 s1: C-r2-code-write-16 (narrower) · rest unchanged (C07)
- checklist 2 renamed "No remote call": C-r1-history2-13 · checklist 8: C-r1-history-15 (decision to add push_pending, not repurpose), C-r1-history-07
- best-practices ¶2 s1 "lists the properties": C-r1-code-write-28 (V-…-28-1: "Deliberate properties") (C06)
- best-practices ¶3 split; ¶4 s1: framing · rest as before (C07)
- next 1: C-r1-history2-12 (repo sets no timeout; SDK default unchecked), C-r1-history-19 (narrower) (C06)
- quiz q-order distractors c, d: exempt (C09)
- quiz q-crash blanks: C-r2-code-write-11, C-r1-history2-14 · explain: C-r2-code-write-11, C-r2-code-write-07 (C09)
- quiz q-outside key a: C-r1-code-write-20 · explain: C-r1-code-write-20, C-r2-code-write-01 (C04)

## sources
- items from library.md: S-r1-practice-01, -02, -03, -04, -05, -06, -07, -08, -09; S-r1-criticism-01, -03; S-r2-criticism-02, -05 (S-r2-criticism-06 dropped at revision)

# Critique: 20261023-0350-post-api-documents-write-path

- kind: document · slice: none
- draft: body.md (dossier root)
- verdict: revise
- confidence: high
- must_fix: 4 (facts 3, citations 0, ledger 0, coverage 0, diagrams 0, quiz 1, order 0, reader 0, clarity 0, rules 0)
- should_fix: 5
- notes: 4
- critic_model: claude-sonnet-5-5 · writer_model: claude-opus-5-5
- checked: 14 sources opened, 38 code claims grepped, 5 quiz items answered
- ledger: 62 claims traced, 0 untraceable, 14 sources re-opened
- coverage: 16/16 load-bearing questions answered or declared; must-cover 5/5
- skill: the explain SKILL.md named in the dispatch (read §3.10, §4, §4.1-4.6, B5-B11)
- open_items: C01, C02, C03, C04, C05, C06, C07, C08, C09

Run mode is `full` (brief.md), so the best-practices section is required and present. Code was checked at HEAD 9978d84, which matches the draft's stated commit.

## Findings

### C01 · must-fix · facts
- where: #intuition, third paragraph, last bold paragraph · line 57
- finding: The draft says P24 changed "the response ... only by adding fields", but P24 also removed a field, `push_error`, from the response.
- evidence: Draft line 57: "every git subprocess got a timeout, and the response changed only by adding fields." Code: `server/main.py:L1613-L1617` says "A failed background push is logged (container log), not reported here: the response is long gone by then, so `push_error` no longer appears." `git show b769236 -- server/main.py` (the P24 commit) deletes `if push_error is not None: resp["push_error"] = push_error`. `tests/test_api_push.py:L104` asserts `"push_error" not in b`. The dossier's own supported claim C-r1-history-07 says "`push_error` no longer appears in any response". The traced claim C-r1-history-15 only records the plan ("Keep the response additive: no field removed"). The shipped code did not follow that plan, and the draft states the plan as the outcome.
- fix: Say the contract change was an added `push_pending`, `pushed` now always false, `commit_sha` now the pre-rebase commit, and `push_error` gone. Step 4 should mention the removed field, because an existing client may read it.
- confidence: high

### C02 · must-fix · facts
- where: #validate, paragraph after the seven-stage list · line 92
- finding: "In a native body, the reference and asset errors are only checked once the body has parsed" is wrong for asset errors, and it contradicts the draft's own item 7 and the verified narrower claim.
- evidence: Draft line 92 (quoted above). Code: `server/main.py:L1007-L1012` collects `prepare_assets` failures into `violations` before any parse. `server/main.py:L1226-L1234`, after a failed parse (`except NativeFormatError`), still appends `native_ingest.unknown_assets(native_ingest.failed_parse_asset_uses(exc), ...)`. The docstring at `server/native_ingest.py:L176-L179` reads "The inline `asset:` uses a FAILED parse read before it stopped, so their misses still join the one 422 list". Only `resolve_refs` (L1235-L1251) waits for `native is not None`. The verifier's narrower claim for C-r1-code-validate-22 (dossier:verify/r1-b2.md, V-C-r1-code-validate-22-1) says "A parse failure adds its violations plus unknown-asset uses; a successful parse adds reference-resolution errors". The draft kept the ledger's one-line summary and dropped that scope.
- fix: "Reference errors are only checked once the body has parsed; asset errors are collected before and during the parse."
- confidence: high

### C03 · must-fix · facts
- where: #no-network, first paragraph · line 239 (also line 30 caption, line 165, line 315)
- finding: "Nothing the handler body does before it returns goes over the network" is false in tenant mode for a placed chapter or migration: the handler body awaits a Postgres write after the lock and before the 201, and the draft never mentions it.
- evidence: Draft line 239: "Nothing the handler body does before it returns goes over the network. The file write, the SQLite commit and the git commit are local, and the push and the embed are queue appends." Line 165: "After the lock is released, the handler only appends two tasks to a queue." Line 30 caption: "Everything left of the 201 is local." Line 315 checklist: "Add no call to GitHub, Gemini or any other remote service between the request and the response."
  Code: `server/main.py:L1598-L1602`, step 4a, "best-effort, outside WRITE_LOCK": `if reader_rebound is not None: reader_state.sync_units_after_manifest(conn, tid, *reader_rebound)`. `reader_rebound` is set at L1553-L1557 whenever a manifest is written. `server/reader_state.py:L840-L843`: `reader_state_enabled` is true when `config.database_url()` is set. `server/reader_state.py:L846-L855` and L870-L878: `run_from_worker` is `anyio.from_thread.run(fn, *args)`, which blocks the handler thread on `rewrite_units`, a Postgres write. This runs between the lock release and the two `publish.submit` calls.
  Ledger: C-r1-code-write-26 is `partial`. Its narrower claim limits "local" to the file, DB commit and git commit inside `WRITE_LOCK`, and names only the async dependencies and the metering middleware as Postgres awaits. The draft's flat sentence goes beyond that status.
- fix: Scope the sentence to "nothing goes to GitHub or Gemini before the 201". Add this step-4a Postgres call to the list of tenant-mode Postgres hops next to `ensure_registry_project` and the metering middleware. Soften the caption, line 165 and the checklist wording to match.
- confidence: high

### C04 · must-fix · quiz
- where: #quiz-section, `quiz` block · lines 341-381
- finding: The outline's quiz target `q-outside` (why the push is submitted outside the lock) is missing; a different item, `q-commit-fail`, takes its place.
- evidence: `outline.md`, `## Quiz`: "q-outside tests why the push is submitted outside the lock: C-r1-history-04 s". The draft's items are q-order, q-pushed, q-wait, q-commit-fail, q-crash. No item tests the "Queue outside the lock" rule (checklist line 316) or the `drain()`-under-lock hazard, though T3 depends on them.
- fix: Add the item, and keep `q-commit-fail` if the quiz stays near five. Build the key on the attributed rule (backend.md) or on calling `publish.drain()` under `WRITE_LOCK` (the real deadlock, see `server/publish.py:L105-L110`). A key saying that `publish.submit` inside the lock "deadlocks" would be wrong, because the worker is a separate thread and would simply wait (see C11).
- confidence: high

### C05 · should-fix · order
- where: #background · line 5, first use; then #validate lines 80-90, #locked line 103
- finding: Terms and ideas the reader has not met are used as if known: "the public root", "tenant mode" (and "legacy mode"), the document formats `md`/`html`/`native`, "placed chapter", "book manifest", "html-to-native migration", and the phase names P24 and P31.S1.
- evidence: The Background never defines these. The reader (Python, FastAPI basics, git; has not read `server/main.py`) first meets "the public root is a git repository" (line 5), then "tenant mode" (line 80). In the seven-stage list (lines 84-90), "for `md` and `html` only", "the chapter placement's 409 and 422s, read from the book manifest" and "for `native`" arrive without a word on what a book, a chapter or the native format is. Line 24 opens with "Since phase P24" with no gloss.
- fix: One short Background paragraph or collapsed primer covering: the three formats, books/chapters as optional placement, tenant vs legacy mode, what "public root" means, and that P-numbers are the project's phase ids.
- confidence: medium

### C06 · should-fix · ledger
- where: lines 15, 303, 328, 334
- finding: Four sentences drop a qualifier or scope that their claim or source carries.
- evidence:
  - Line 15 "separate processes do not share memory ([FastAPI deployment concepts])". The page (§ "Memory per Process") says "multiple processes normally don't share any memory". "Normally" is dropped, and "have their own lock" is the chapter's inference.
  - Line 303 "the database's single uniqueness rule, `UNIQUE(tenant_id, rel_path)`". Claim C-r2-code-validate-05 is scoped to the `documents` table. `server/db.py:L101` also declares `UNIQUE (tenant_id, rel_path, version)` on `document_versions`, and `server/db.py:L145-L146` creates a unique index `chapter_variants_doc`.
  - Line 328 "The `publish.py` docstring gives the reasons." The docstring (`server/publish.py:L12-L22`) lists "Deliberate properties". Only the `BaseHTTPMiddleware` parenthetical contrasts with BackgroundTasks, and the verifier flagged this (V-C-r1-code-write-28-1: "lists these as 'deliberate properties' rather than as labelled 'reasons'").
  - Line 334 "The embed on the worker has no client timeout". C-r1-history2-12 is "no timeout setting in this code", and its verifier notes that "the google-genai SDK's own default timeout was not checked".
- fix: Restore each scope: "normally don't share", "the `documents` table's only uniqueness rule", "the docstring lists these as deliberate properties", "the repo sets no timeout on the embed call".
- confidence: high

### C07 · should-fix · reader
- where: lines 80, 239, 308, 330
- finding: Four paragraphs run 114 to 138 words and each holds two ideas, so the reader loses the main line.
- evidence: Word counts: line 80 is 114 words (how auth works in two modes, plus the registry-row write). Line 239 is 115 words (the no-network promise, plus a Postgres caveat, plus the metering caveat). Line 308 is 126 words (a failure partway leaves earlier steps in place, plus the leftover riding into a later commit). Line 330 is 138 words (the outbox pattern, plus at-least-once, plus the local consequence). The skill's §4 rule is "One idea a paragraph, about 100 words at most". The caveats on lines 80 and 239 interrupt the main line.
- fix: Split each at the idea boundary, or move the Postgres caveat (lines 239 and 80) into a collapsed callout.
- confidence: medium

### C08 · should-fix · diagrams
- where: #seq-publish · lines 214-235
- finding: The sequence diagram puts the worker's "take the push task" after the 201, but the code does not order them. The worker can start as soon as `submit` enqueues the task, while the handler is still building the response.
- evidence: Diagram steps 5-6: `handler -> client: "201, push_pending true"`, then `worker -> queue: take the push task`. In the code, `publish.submit` runs `_ensure_worker()` then `_QUEUE.put(...)` (`server/publish.py:L86-L96`), and the worker blocks on `_QUEUE.get()` (L61). The lock was already released at the end of the `with` block (`server/main.py:L1596`). The handler's response construction (`server/main.py:L1634-L1737`) overlaps with the worker's start. `tests/test_api_push.py:L194-L199` only shows that the 201 is not delayed, not that the push starts after it. The prose "the server answers 201 between the two halves" (line 24) carries the same simplification. The diagram's order agrees with the `create_document` docstring ("run after the 201 is written") but not with strict code order. The caption's own sentence, "the handler does not wait for it", is right.
- fix: Draw the worker steps as concurrent after `submit` (for example a note "may start before the 201 is written"), or say "behind the response" without implying a strict order.
- confidence: medium

### C09 · should-fix · quiz
- where: q-crash, q-order · lines 344-352, 378-381
- finding: `q-crash` gives away its first blank and rejects a natural second answer. The `q-order` distractors c and d are not plausible.
- evidence: q-crash text: "If the server process is killed while a push is still queued, it loses the {{push|push task}} but never the {{save|write|document}}: the commit stays in the local repository..." The sentence already says "a push is still queued", so blank 1 is copied from it. Blank 2 does not accept "commit", though the next clause names "the commit". q-order options c ("After the git commit, which is then rolled back") and d ("In the background worker, after the 201 was sent") contradict things the chapter says outright (there is no rollback; validation is not in the worker). Nobody who read the chapter would pick them; only a and b are live. I answered all five items: q-order b, q-pushed b, q-wait b, q-commit-fail (recall) matches the code, q-crash push/save. All keys rest on supported claims.
- fix: Make the cloze test the consequence, not the noun, or accept "commit". Replace q-order's c and d with a plausible half-understanding, such as "inside `WRITE_LOCK` before anything is archived" (the older-docs reading).
- confidence: medium

### C10 · note · facts
- where: #background · line 5
- finding: "the API runs a full reindex on every boot" is the default, not a fixed behaviour.
- evidence: `server/main.py:L75` gates the startup reindex on `config.startup_reindex_enabled()`. `server/config.py:L198-L204`: `KB_STARTUP_REINDEX` defaults to true.
- confidence: high

### C11 · note · clarity
- where: #checklist, "Queue outside the lock" · line 316 (and #queue line 177)
- finding: The "non-reentrant" rationale for submitting outside the lock does not strictly follow for a separate worker thread, so a reader may take away the wrong hazard.
- evidence: `publish.submit` never waits (`server/publish.py:L86-L96`). If it ran inside the `with`, the worker would block at `with WRITE_LOCK:` until the handler left the block, and nothing would deadlock. The real deadlock is a synchronous wait on the worker while holding the lock, such as `drain()` (`server/publish.py:L105-L110`), which the checklist already lists. Line 177 attributes the non-reentrancy reason to "the code's comments", and the checklist gives no own-voice reason. The draft is safe as written. It would help a developer to say what actually breaks.
- confidence: medium

### C12 · note · clarity
- where: #after-201, collapsed callout "Why a crash cannot be drained" · lines 288-289
- finding: The `atexit` sentence does not connect to the drain, which runs in the ASGI lifespan hook, not as an `atexit` handler.
- evidence: `server/main.py:L89-L97` runs `publish.drain(timeout=10.0)` after `yield` in `lifespan`. The callout's conclusion ("helps only on a graceful shutdown") is right, and the three cited pages say what the draft says. The reader may wonder why `atexit` matters.
- confidence: medium

### C13 · note · quiz
- where: q-wait · lines 363-372
- finding: The key rests on the code side of the open disagreement D-02, and the explain states the contested conclusion flatly.
- evidence: The explain says "the new publish waits indirectly on the network". Ledger: C-r2-code-write-01 is `supported` (a code trace), but D-02 is open (architecture.md L37 "Everything the caller waits for is local disk + SQLite"). The skill's §3.10 says the quiz should not test a disagreement. The key is defensible as a code behaviour; "per the code" in the explain would keep it on the supported side.
- confidence: low

## Scorecard

- facts: C01, C02, C03 (notes: C10)
- citations: holds. All 14 `sources` items resolve (HTTP 200) and the pages say what the draft cites them for.
- ledger: C06 (C01, C02 and C03 also drop ledger scope; filed under facts)
- coverage: holds. 16/16 load-bearing questions answered or declared. Q16 is taught as D-02. G-r2-01 and G-r2-04 are stated. G-r2-02 and Q15 are not asserted. Must-cover 5/5.
- diagrams: C08
- quiz: C04, C09 (note C13)
- order: C05
- reader: C07
- clarity: holds (notes C11, C12)
- rules: holds. No raw HTML, headings are `##`/`###` only, typed blocks are top-level, the YAML strings that need quotes are quoted, all `#s-…` links match a `sources` item, and no image or `chapter:` link is present.

**Holds** (keep through the revision):
- The code blocks match their ranges. `#write-lock` is `server/main.py:L179-L183`. `#commit-step` is L1559-L1596 with its elisions marked. `#submit` is L1618-L1632. `#push-task` is L186-L202. `#gitops-push` is `server/gitops.py:L124-L143`. `#hanging-push-test` is `tests/test_api_push.py:L181-L201`.
- The seven-stage validation order in #validate matches `_check_document` apart from C02. The nine-step locked order matches the real order in `server/main.py:L1374-L1596`.
- The D-01 callout ("trust the code") and the D-02 treatment (both doc sentences quoted, "read as code" stated as the chapter's own reading).
- The hedged "code traces, nobody has observed them" framing of the two races, which matches C-r2-code-validate-07 and -08.
- The two-sentence answer callout, and the sentence after the test: "It does not post a second document while the first push holds the lock."
- The "Before you change the write path" checklist as the T3 deliverable. Its reasons trace to the code, apart from C03 and C11.
- All best-practices claims match their pages, and the aligns/diverges/next-steps structure is complete.

**Not seen:**
- The reader's render: the diagrams' layout (the captions say "left of the 201" and "on the right") and the callouts' collapse state.
- `knowledge check` was not run, because it is not among the command forms my brief allows. The §4.1 rules were read by hand.
- The exact-text converter (`pagetext.py`) is not available in this dispatch (no `tools:` folder), so sources were read with curl (HTTP 200 and content type) plus WebFetch, which makes the quotes approximate. Passages were matched by substance, not character by character.
- Whether the google-genai SDK sets a default timeout on `embed_content` (C06).
- The P24 phase notes (`works/phases/active/P24/phase.md`) were spot-checked for the 5 s story and the "additive" plan lines, not re-read in full; the same claims were confirmed against `docs/current/backend.md`, `architecture.md` and `api.md`.

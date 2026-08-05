# Plan — P24.DECOMP (decompose "Upload finish-return timeout")

## Objective

Decompose P24. See `../../intent.md`: changple5 prod uploads to knowledge prod succeed
server-side, but the client reports a disconnect — the operator believes it never got
the finish return ("maybe timeout"). Leading hypothesis: `/explain`'s save step POSTs
with `curl --max-time 5` while `POST /api/documents` does git commit (and possibly
push) synchronously inside the request before responding — the save lands, the client
gives up first. The phase must (a) CONFIRM the actual failure mode, (b) make the finish
response reliable, and (c) make client-side reporting honest about what happened.

## Your job (decomposition executor)

1. **Research the write path end-to-end and confirm the hypothesis from code** (no
   prod access needed — timing evidence from the code paths and tests is enough):
   - `server/main.py` POST /api/documents: what happens inside `WRITE_LOCK` before the
     201 — file write, index insert, embeddings?, git commit, git *push*? Measure/reason
     about worst-case latency of each stage (especially `server/gitops.py`: is there a
     network push in-request? timeouts on it?). Note the 201 already carries
     `committed:false` / `push_error` fields (intent notes) — map exactly when those
     fire vs when the request just takes long.
   - Note: P23.S1 added archive writes inside the same lock — marginal, but part of the
     current path.
   - Embeddings: does the write path embed synchronously (`server/embeddings.py`)? Any
     other slow stage (reindex hooks, recent-index update)?
   - The client side: `/explain` SKILL.md §5 (`curl --max-time 5`, four copies —
     parity gates from P23 still apply if the skill changes) and the CLI
     (`cli/src/knowledge_cli/client.py`) — what timeouts do they use? What does each
     report on timeout today (does it say "failed" even though the server saved)?
   - Changple5 is an external consumer of the same public API — we fix the server and
     our own clients; record what its symptom maps to.
2. **Record the confirmed failure mode in `phase.md` Findings** — with the actual
   worst-case stages and numbers/reasoning, and which stage(s) can exceed 5s.
3. **Decide the fix shape at slice-cutting depth** and record it. Candidate levers
   (choose what the evidence supports; keep the phase small and safe):
   - Server: move slow, non-essential work (git push, anything network) off the
     response path (background/after-response), keep the response fast; or bound the
     in-request stages with timeouts so a 201 always returns promptly. Preserve the
     existing response contract (`committed`/`push_error` semantics may shift meaning —
     if so, that is a flagged behavior change for the review).
   - Clients: raise/reason the curl `--max-time` in the skill (all four copies), and
     make the timeout branch honest — "the server may have saved; check before
     retrying" (a timeout after POST is not a failed save; the skill/CLI should say so
     and ideally verify via a GET before reporting or retrying — a blind retry now
     creates a duplicate or an unwanted v2 given P23's resolution step).
   - Keep changes additive and consistent with P23's landed behavior.
4. **Create the middle slices** with `new-slice` (bare folders, never pre-fill their
   plan.md). Likely shape (adjust from evidence): a server slice (response-path
   reliability), a client slice (skill × 4 copies + CLI honest timeout handling), and
   possibly a small verification/instrumentation slice if the evidence warrants — keep
   it lean, 2–3 middle slices. Set `--risk` deliberately: anything writing real code or
   cross-file → high; `low` only for a true few-line/docs-only slice.
5. **Seed `phase.md`**: decomposition rationale, findings (the confirmed failure mode),
   constraints (parity gates: `plugin/templates/kb/` mirrors for server/tests changes,
   `skills_parity.py` for skill copies), and Doc impact expectations.

## Constraints

- Not a design-bearing phase; no co-work slice, no DECOMP2.
- Repo hard rules apply: terse tests, mirrors in the same slice, Doc impact notes
  instead of doc-new-version.
- You may run only `new-slice` among state commands; no commits, no transitions.

## Wrap-up

Write `result.md`; return the structured verdict with slices_created and the confirmed
failure mode.

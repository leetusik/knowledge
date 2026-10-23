# f2a3: why it ended at D3v (from the stream, `scratchpad/f2/runs/f2a3/out.jsonl`, and `err.txt`)

- Preflight passed (probe B `ok` ×6). The lead wrote `plan.md`, `findings/r1-lead.md` (10 sources, 22 claims,
  `--check` all passages found), `library.md` and `ledger.md`, and dispatched `knowledge:verifier` with
  `model: opus`, **in the background** (§3.5's wave form), batch r1-b1, 22 claims; then it ended its turn to wait
  for the notification (lead's last event at +378 s).
- The verifier ran on `claude-opus-5-5`: 75 tool calls, last event at +891 s. At +979 s (the lead's last turn
  + 600 s) `claude -p` ended the session: "Background tasks still running 10m after the last turn (subagent
  "Verify claims batch r1-b1"); stopping them. Set CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 to wait
  indefinitely."
- `verify/r1-b1.md` was never written; `run.md` stays at `D3v verify · state: running` (resumable with
  `resume`). No outline, trace, body, report or publish. Nothing the lead chose was skipped.
- The skill already sends the critic in the foreground for this reason (§4.10 step 1, P32.F1); a verifier batch
  under a headless session has no such rule.

# Result — P24.S3 (CLI: honest write-timeout reporting on `knowledge save`)

## What changed

`knowledge save` no longer reports a lost reply as "cannot reach". The write path now
splits transport failures into two classes and treats only one of them as proof of
failure.

**`cli/src/knowledge_cli/client.py`**

- `WRITE_TIMEOUT = 30` — a per-call budget for the one mutating call
  (`document_create` passes `timeout=WRITE_TIMEOUT` through `_request`); reads keep the
  shared `DEFAULT_TIMEOUT = 15`. See the budget note below.
- `CONNECT_FAILURES` + `never_sent(exc)` — the classifier. `ConnectError`,
  `ConnectTimeout`, `PoolTimeout`, `ProxyError`, `UnsupportedProtocol` prove the request
  never left us; **every other** `TransportError` (`ReadTimeout` above all, plus
  `WriteTimeout`/`WriteError`/`RemoteProtocolError`) happened at or after the send.
  `ConnectTimeout` subclasses `TimeoutException` and `ConnectError` subclasses
  `NetworkError`, so the tuple has to be tested before either base — that ordering is
  the whole reason it is a named helper rather than an inline `except` clause.

**`cli/src/knowledge_cli/knowledge.py`**

- `default_slug()` mirrors `documents.slugify` (charset collapse, 80-char cap +
  re-trim, `"untitled"` fallback) and `save_rel_path()` mirrors `main.py:636-648`'s
  defaults (`date` = today, `slug` = slugify(title)), so the CLI can name the path a
  save is about to occupy without asking the server.
- `verify_save()` — after a lost reply, one `GET /api/documents/by-path/<rel_path>`,
  never a re-POST. Four outcomes:
  | outcome | report | exit |
  |---|---|---|
  | body at the path == what we sent | honest success + a `note:` explaining the lost reply | 0 |
  | 404 | "sent, may be saved, but nothing is at `<rel>` — most likely missed; check `knowledge list --project <p>`" | 1 |
  | a different body at the path | "that is not the document you saved — the 409 you never saw; re-run with `--overwrite` / `--slug` / `--date`" | 1 |
  | the verification itself fails (transport or non-404 status) | "state unknown, do not re-run blind; check with `knowledge read <rel>`" | 1 |
  The **body comparison** (not mere existence) is the load-bearing bit: a plain create
  over an existing document is a 409 the timed-out caller never saw, so "something is at
  that path" is not "my save is at that path". `.strip()` on both sides is the only
  normalization needed — the server stores `_normalize_body` (leading blank lines
  dropped, one trailing newline, `server/documents.py:419-426`) of exactly what we sent.
- `cmd_save` catches `httpx.TransportError` around the POST: `never_sent` → bare
  `raise` (so `main()`'s unchanged "cannot reach" message is what a genuine connect
  failure still prints), otherwise verify. On a recovered save it prints the same
  `saved:`/`id:`/`path:`/`read:` block, **omits the `url:` line** (the by-path read
  projection has no `url` — it is synthesized only on the write responses, S2's trap),
  and puts the whole explanation on stderr as a `note:`.
- Module docstring gained the rule as a fourth numbered fact: a transport failure on
  `save` is not evidence the save failed, and `save` is the only command where that
  distinction exists (everything else is an idempotent read).

**`cli/src/knowledge_cli/main.py`** — the global `except httpx.HTTPError` branch and its
message are byte-unchanged; it gained a comment recording *why* it is now only ever
reached for a call that provably changed nothing, so a future edit does not widen the
lie back over a mutating call.

**`cli/src/knowledge_cli/guide.py`** — the agent-readable contract (§4) gained the rule:
a timeout on `save` is not a failed save; the CLI verifies and says which; never re-run a
`save` on a timeout without checking; and `--json` after a lost reply carries the
read-back document (no `url`/`committed`/`push_pending`), with the `note:` on stderr
saying so. (`guide.py`'s own docstring requires this whenever `save` changes.)

**`cli/tests/test_knowledge.py`** — `FakeApi` gained `post_raises` (a transport error
raised *after* the call is recorded — the point being that it was sent) and `absent` (the
read-back 404s). Four terse tests, one per outcome: verified success (exit 0, exactly one
POST + one by-path GET, no `url:` line, no "cannot reach"), genuinely absent (exit 1,
names the path and `knowledge list --project myrepo`, still exactly one POST), a foreign
document at the path (exit 1, points at `--overwrite`), and a connect failure (exit 1,
unchanged "cannot reach", **no** verification round-trip).

## The write-timeout budget decision

Raised for the save POST only: **30 s**, as a per-call override, not a change to the
shared default.

- Post-S1 `POST /api/documents` makes no network round-trip before its 201, so the only
  variable left in a write is uploading the body plus the local metering write. 30 s is
  deep headroom over that and still fails well inside nginx's 120 s `proxy_read_timeout`.
- It is deliberately the same number, for the same reason, as S2's publish
  `curl --max-time 30` — the two shipped clients should not disagree about how long a
  write is allowed to take.
- Reads stay at 15: a slow read costs a retry, while a write that times out costs a
  verification round-trip and the user's confidence. Changing the shared default would
  have made every read wait longer for no gain.

## Validation

| command | outcome |
|---|---|
| `cli/.venv/bin/python -m pytest cli/tests -q` (the CLI suite; `cli/.venv` has `knowledge_cli` installed, and `cd cli && pytest` is equivalent) | **PASS — 44 passed** (40 baseline + 4 new) |
| `.venv/bin/python -m pytest -q` (repo root) | **PASS — 83 passed, 32 skipped** (unchanged; no `server/` or `tests/` file touched) |
| `python3 scripts/workflow.py validate` | **PASS** — "Workflow validation passed." |
| `python3 scripts/plugin_parity.py` | PASS (exit 0) — run for completeness; `cli/` is not in `shipped_dirs`, so nothing here can move it |
| `python3 scripts/skills_parity.py` | PASS (exit 0) — likewise untouched |

Manual prose check: all five branches (landed / absent / foreign document / verification
itself down / connect failure) were driven through `main.main()` against a mock transport
and their exact messages read back. Scratch script only — nothing written to the repo.
`git status` shows only `cli/` + `works/` state files.

## Deviations from `plan.md`

- **Also edited `guide.py` (+ a comment in `main.py`).** Not named in the plan's scope
  list, but `guide.py`'s module docstring makes it mandatory: "Anyone editing
  `save`/`init`/the config seam must update this string too", and the guide is what an
  agent reads to drive the CLI unattended — leaving it saying "a timeout means the API is
  unreachable, retry" would have shipped the fix and kept the lie in the contract.
- **Body comparison rather than mere presence** in the verification. The plan said
  "verify … whether the save landed"; presence alone would have reported a stale 409'd
  document as a successful save, which is the same class of dishonesty the slice removes.
- **`--json` after a recovered save prints the read-back document**, not a 201-shaped
  body. The lost 201 is unrecoverable; the read-back is the only server payload we have,
  the `--json`-is-verbatim contract still holds, and the stderr `note:` says exactly which
  payload it is and which fields are absent. The alternative (fail a save that demonstrably
  landed) is dishonest, and synthesizing a fake 201 would be worse.
- **No retry/backoff on the verification GET.** One verification, at most zero re-POSTs —
  matching S2's explicit "never loop" rule. A write still in flight can therefore read as
  absent; the message says so rather than claiming certainty.
- Nothing else in `save`'s output moved: the `saved:` / `id:` / `path:` / `read:` lines
  are unchanged on the normal path (`url:` too), so anything parsing them keeps working.

## Doc impact

Appended to `phase.md`'s running list (P24.REVIEW consolidates):

- `experience.md` — P24.S3: `knowledge save` no longer reports a lost reply as
  `cannot reach`; it verifies with `GET /api/documents/by-path/<rel_path>` and reports an
  honest success (exit 0, `note:` on stderr, no `url` line) or an honest "may or may not
  have landed" error naming `knowledge list`/`read`, never re-POSTs, and only a genuine
  connect failure still says `cannot reach`; the save POST now has a 30 s `WRITE_TIMEOUT`
  while reads stay at 15 s.

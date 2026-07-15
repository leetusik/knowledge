# Plan — P8.S4: secrets provisioning runbook + frozen consumer contract

Orchestrator plan (auto mode), per the operator-approved hosting proposal in `../../phase.md` §5 (+ §2/§3 for the semantics you freeze). Executor: `slice-executor-mid`.

## Job

Two deliverables, both authoring-only (no server code, no pending here — the operator executes the runbook at the gate before P8.S5):

### A. Secrets/DNS provisioning runbook → `deploy/SECRETS.md`

`deploy/README.md` (P8.S3) already defers to "P8.S4's runbook" for secret/DNS provisioning — create `deploy/SECRETS.md` and update README's pointer text to link it explicitly (read README first; keep the two coherent, no duplicated steps). Content — each item an explicit operator action with exact commands where possible, **names and placement paths only, never values**:

1. **`KB_API_TOKEN`** — generate (e.g. `openssl rand -hex 32`), place into the box's gitignored `.env`; note this same value is what hi2vi receives as `KNOWLEDGE_API_TOKEN`.
2. **SSH deploy key** — `ssh-keygen -t ed25519` (no passphrase, comment like `knowledge-api@oci`), private half to the box path `compose.prod.yml` mounts (read it and use the exact path), pinned `known_hosts` for github.com per the compose wiring, public half → GitHub `leetusik/knowledge` → Settings → Deploy keys → **allow write**. Box clone's `origin` must be `git@github.com:leetusik/knowledge.git` (cross-check README's clone step).
3. **Cloudflare DNS** — proxied record `knowledge` on the `hi2vi.com` zone pointing at the box (match how `hi2vi.com`'s own record is set up); plus the **cert-coverage check**: confirm the origin cert the edge serves for hi2vi.com covers `*.hi2vi.com` (then knowledge.hi2vi.com rides it) — if it's per-host, follow the variant comment in `deploy/knowledge.hi2vi.com.conf` (issue a knowledge.hi2vi.com origin cert and reference it).
4. **Optional `GOOGLE_API_KEY`** — recommended at launch (hybrid search for hi2vi's dedup/grounding); BM25-only fallback if skipped, zero code change either way.
5. A final **handoff checklist** ("all boxes ticked = ready for bring-up per README §…") the operator can walk before the P8.S5 gate.

### B. Frozen consumer contract → `works/phases/active/P8/contract.md`

The verbatim-ready draft of the "Hosted deployment + frozen contract" section that **P8.REVIEW** consolidates into `docs/current/api.md` (do NOT touch `docs/` yourself — versioning happens only at review). This is what hi2vi `P15.S4` codes against, so shapes must be **exact — read the code, don't guess**: verify field names against `server/main.py`'s response models / handlers and `docs/current/api.md`; if in doubt, exercise the endpoints with the existing pytest fixtures (`TestClient`) to confirm a live shape. Content:

1. **Config:** `KNOWLEDGE_API_URL=https://knowledge.hi2vi.com`, `KNOWLEDGE_API_TOKEN=<the box's KB_API_TOKEN>`; `Authorization: Bearer <token>` required on **all `/api/*` calls** (hosted runs `KB_REQUIRE_READ_AUTH=true`); `GET /healthz` open for liveness.
2. **Write:** `POST /api/documents` — request fields (required: `title`, `markdown`, `project: "hi2vi"`, `tags[]`, `source_repo`; optional: `date`, `slug`, `related[]`, `overwrite`, `commit`, `co_authored_by`), and the four responses: **201** full body (every field, incl. `pushed`/`push_error` and the `commit_sha` = final-published-HEAD-on-successful-push semantics, `url` = Pages URL of the doc, `landing_created`), **409** duplicate body, **422** convention error shape (what triggers it), **401**.
3. **Read/search:** `GET /api/search` (params incl. `mode`, pagination; response shape + the hybrid-vs-bm25 behavior), `GET /api/documents` (+ filters), `GET /api/documents/{doc_id}`, `GET /api/documents/by-path/{rel_path}`, `GET /api/tags`, `GET /api/projects` — request params and response shapes.
4. **Operational semantics the client needs:** publish flow (`pushed: true` → on `main`, Pages deploy makes it live within minutes; `pushed: false` + `push_error` → written+committed on the box, publishes with the next successful push — client should NOT retry the write); **retry/idempotency rule:** re-POSTing the same project/date/slug after an ambiguous failure yields **409** (`rel_path` exists) — treat 409-after-timeout as already-written, not an error; single-daily-writer assumption; embeddings hybrid when the box has a Gemini key, silent BM25 fallback otherwise.
5. A short "freeze" header: this contract is frozen as of P8; additive-only changes (new fields may appear; existing fields/status codes won't change meaning).

Link the contract from `phase.md` (Doc impact — mark it "consolidate verbatim into api.md at review").

## Validation (record in result.md)

- Shapes verified against code (say how — file/line or TestClient check).
- `.venv/bin/python -m pytest -q` → 65 passed (nothing behavioral changed).
- `python3 scripts/plugin_parity.py` → still green (you touch no shipped paths).
- `python3 scripts/workflow.py validate` → passes.

## Constraints

- Touch only: `deploy/SECRETS.md` (new), `deploy/README.md` (pointer wiring only), `works/phases/active/P8/contract.md` (new), `phase.md` (Findings S4 section + Doc impact lines), this slice's `result.md`.
- No secret values anywhere. No `docs/` edits. No server/test/template changes.
- Append Doc impact one-liners: api.md (frozen contract → consolidate from `contract.md`), operations.md (SECRETS.md provisioning runbook + handoff checklist), security.md (deploy-key registration + token provisioning as operator-only actions).
- Executor contract: never commit, never transition status; write `result.md`; return the structured verdict; `escalate` on anything deeper than expected.

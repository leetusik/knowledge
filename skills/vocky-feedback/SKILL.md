---
name: vocky-feedback
description: Use when the user wants a specific piece of product feedback captured and sent to vocky — a bug report, a reaction, or a feature request the user has explicitly asked to record. NOT for general note-taking, drafting tickets for another tracker, or capturing anything the user has not asked to send anywhere.
allowed-tools: Bash(curl:*), Read
---

# vocky-feedback

Capture one piece of end-user feedback into vocky, the shared feedback-ingest service. Vocky is now the Feedback part of `https://hi2vi.com`. Every command below is meant to be copied and run exactly as written, substituting only the bracketed values.

## 1. Set up the two-variable contract

Every capture path below — REST or MCP — needs exactly two environment variables:

```bash
export VOCKY_BASE_URL="https://hi2vi.com"
export VOCKY_API_TOKEN="vk_..."
```

Put these in `~/.zshenv`, never a repo `.env`:

- A repo `.env` is **never** auto-loaded by Claude Code or Codex, and a secret committed to a repo risks an accidental leak. `~/.zshenv` is sourced by every zsh invocation, so every Bash call, every Codex `exec`, and every repo you work in inherits it — the key never touches a repo.
- **Codex only**: the `workspace-write` sandbox denies outbound network by default, so the POST below would silently fail. Add `[sandbox_workspace_write] network_access = true` to `~/.codex/config.toml`. Claude Code needs no equivalent change.
- If `VOCKY_API_TOKEN` is not set yet, ask the operator for one. A key is minted in the web app at `https://hi2vi.com`, never with a CLI: the **Org API keys** panel on the **Dashboard** mints an org-level key, and the **API keys** panel on a project's page mints a key bound to that project. The form's **Access** choice sets what the key can do, and the key is shown only once — copy it then.
- **Know what the key can do.** **Capture only** can send feedback and its attachments (`POST /api/feedback`, `POST /api/feedback/attachments`, the MCP capture tool) and nothing else — it cannot even create a project (step 4); every other key route answers it `403`. **Full access** can also read, edit (PATCH) and delete feedback **and** read and write the org's Library. A key's reach is fixed when it is minted: a project's key lands every capture in exactly that project, while an org-level key reaches every project in the org. For anything running as an agent runtime, or on a machine the operator does not control, use a **Capture only** key, bound to one project where the caller is one product, and store it as you would any API secret.
- A key minted on the old `vocky.hi2vi.com` no longer works; mint a new one.

## 2. Verify before you capture anything

This makes no write — it only proves the two variables are correct, without submitting real feedback:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $VOCKY_API_TOKEN" "$VOCKY_BASE_URL/api/feedback"
```

- **`403`** — a **Capture only** key authenticated fine; it is only refused this read. You are ready to capture.
- **`400`** — a **Full access** key authenticated fine; the endpoint only rejected the bare `GET` for a missing filter. You are ready to capture.
- **`401`** — the key is wrong, revoked, or `VOCKY_API_TOKEN` is unset/blank. Stop; do not retry or fall back to another path. Tell the user the key needs fixing.
- Anything else (connection refused, timeout, DNS failure) — `VOCKY_BASE_URL` is wrong or the service is unreachable. Say so and stop.

## 3. What goes in which field (read this before you build a payload)

This applies to every path below. Vocky keeps **the user's voice** and **your note about it** in two different fields, both free text — there is no sentiment enum and vocky will not invent one:

| What you send | Field | Rule |
|---|---|---|
| The user's feedback or sentiment, in **their** words, verbatim where you can (`답답함`, `감사`, `긍정`, `부정`, `짜증`, or a whole sentence) | `message` | **Required, non-blank.** Do not paraphrase it into your own voice and do not compress it into a label. |
| Your own note about that feedback — what happened, what the user was doing, why you recorded it | `comment` | Optional in the schema, but **treat it as required whenever an agent is the one recording**: a marked capture with no note is one a human reviewer cannot act on. |
| `agent` when you (the agent runtime) decided to record this; `human` when you are relaying an explicit human action such as a like/dislike button or a submitted form | `recorded_by` | Optional, closed vocabulary — `agent` or `human`, nothing else. See below for what omitting it means. |
| Labels you want to slice the data by later | `tags` | Optional; omit entirely rather than sending an empty list. |
| Your runtime | `source.integration` (e.g. `"langchain-mcp"`, `"claude-code"`) | Free text, a hint only — it is **not** the marker. `recorded_by` is. |

`recorded_by` answers *who recorded this*, which is a different question from `trigger_type` (*why capture happened*) — send both when both are known. It is captured once and is not editable afterwards.

**Omitting `recorded_by` does not mean `human`.** It stores `null`, which means *unspecified*, and it is what every capture made before this marker existed reads back as. Two transport rules:

- On **MCP** (step 5) — the agent-runtime surface by construction — an omitted `recorded_by` is stored as `"agent"`.
- On **REST** (step 4) an omitted `recorded_by` stays `null`.
- An explicit value always wins, on every transport.

A value outside the vocabulary is rejected, never coerced: `recorded_by must be one of: agent, human`.

An agent-recorded body looks like this — the user's words verbatim in `message`, your note in `comment`, the marker explicit (step 4 below shows how to POST exactly this shape):

```json
{
  "message": "답답함",
  "comment": "User retried the export three times and said this while the job was still queued.",
  "recorded_by": "agent",
  "source": { "product": "<product>", "integration": "<your runtime>" },
  "tags": ["export"]
}
```

## 4. REST

`POST $VOCKY_BASE_URL/api/feedback` with the bearer key. **The nested `source` object is the single most important shape here** — a top-level `source_product` field is rejected outright.

Write the body to a temp file rather than inlining it as a shell argument — this keeps quotes, newlines, and non-ASCII text (e.g. Korean) out of argv entirely:

```bash
cat > /tmp/vocky-capture.json <<'JSON'
{
  "message": "<the user's words>",
  "source": { "product": "<product>", "integration": "claude-code" },
  "feedback_value": 2,
  "tags": ["<tag>"]
}
JSON

curl -sS -X POST "$VOCKY_BASE_URL/api/feedback" \
  -H "Authorization: Bearer $VOCKY_API_TOKEN" \
  --json @/tmp/vocky-capture.json
```

- `message` and `source.product` are the only required fields; every other field above (`feedback_value`, `comment`, `channel`, `recorded_by`, `target_type`, `tags`, `session_id`, `user_id`, …) is a legitimate **top-level** field — only `source` nests. REST also accepts `attachment_ids` (the ids of images uploaded first with `POST $VOCKY_BASE_URL/api/feedback/attachments`, a multipart `file` part with `user_id` and `source_product` in the query; attachments are REST-only) and `project` (destination project for an org-level key, `"default"` when omitted; a project-bound key ignores it). A **Full access** org-level key creates a project it names if the org lacks one; a **Capture only** key can name only a project that already exists in the org, or `"default"` — any other name is refused with a `400` and nothing is captured, so ask the operator to create the project in the web app first.
- When you are recording on the user's behalf, add `"recorded_by": "agent"` and the `comment` note — REST does **not** infer the marker (step 3).
- Success is **`202`** with exactly `{"request_id": "...", "accepted_at": "...", "status": "accepted"}`.
- Every failure body is a flat `{"detail": "<string>"}` — there is no error code and no `request_id` on failure. See the table in step 6 for how to react to each one.

## 5. MCP

`$VOCKY_BASE_URL/feedback/mcp` (exact path, no trailing slash) is a single POST-able FastMCP Streamable-HTTP endpoint (stateless as deployed; JSON or an SSE stream, which the client negotiates). The handshake (`initialize`) and the tool list need no key; only the tool call does, and it carries the same `vk_` bearer. A **Capture only** key is the right key here. The one tool is `capture_feedback` — write-only, no read or query tools — taking the same fields as REST including `recorded_by` (`attachment_ids` is REST-only), with `source` the only nested object. Add it to a client with:

```bash
claude mcp add --transport http vocky "$VOCKY_BASE_URL/feedback/mcp" --header "Authorization: Bearer $VOCKY_API_TOKEN"
```

This is the natural transport for an agent runtime, and it is the one place the marker is inferred: a `capture_feedback` call that omits `recorded_by` is stored as `"agent"`, so an agent that never learns the argument still produces correctly marked data. Pass `"human"` explicitly when you are relaying a human-recorded event. A rejected value comes back as a **tool error result** (`isError`) carrying the same message as REST, not as an HTTP status. The other tool errors are `unauthorized: missing/invalid bearer` (the key is wrong or revoked: stop, as for a `401`), `forbidden: this key may not capture feedback`, `rate limited: too many captures, retry later` (as for a `429`) and `capture failed: …` (the feedback was not captured).

Self-hosting gotcha: DNS-rebinding protection checks the request's **`Host` header** against an allowlist that by default contains only `127.0.0.1`, `localhost`, and `[::1]`. A self-hosted public hostname must be added to `MCP_ALLOWED_HOSTS`, or every MCP call answers **`421 Invalid Host header`** regardless of the key — the key is never even examined, so this is not an auth problem and retrying will not fix it. The parallel `MCP_ALLOWED_ORIGINS` guards the `Origin` header, which is only checked when it is present: non-browser MCP clients send none, so it normally needs no configuration.

## 6. Error handling — branch by branch

Every REST failure body is the server's `{"detail": "..."}` verbatim. React like this:

| Status | `detail` | What to do |
|---|---|---|
| `401` | `missing or invalid bearer token` | The key is wrong or revoked. Say so, name `VOCKY_API_TOKEN`, **stop** — never retry, never fall back to another path. |
| `403` | `this key's scope is capture: Library routes need a full key` | A **Capture only** key on a route that reads, edits or deletes. Capturing still works with it; anything else needs a **Full access** key. |
| `429` | `too many requests — please retry later` | The capture limiter (uploads have a tighter limit of their own). Wait for the `Retry-After` seconds and retry once; if it fails again, tell the user the feedback was **not** captured. |
| `413` | `request body must not exceed 262144 bytes` (the number is the server's cap) | The capture body is too big. Nothing was captured. Trim what you can drop (long `messages` or `used_context` first, never the user's words in `message`) and retry once; never retry the same body. On MCP the same string arrives as a tool error. |
| `413` | `attachment too large` | The image is over the upload size limit. Send the feedback without it, or a smaller image. |
| `503` | `uploads are paused while unlinked files are reclaimed — please retry later` | Attachment uploads only: too many uploaded images were never linked to a capture. Capture the feedback **without** the image (it still lands), tell the user the screenshot was not attached, and do not loop on the upload. |
| `400` | `request body must be valid JSON` / `request body must be a JSON object` | The payload you built is malformed. Fix it once and retry once. |
| `400` | `<dotted.loc>: <message>` (e.g. `source.product: Field required`) | A schema violation. **Only the first error is reported** — fixing one may reveal another underneath it. |
| `400` | `message must not be blank` / `source.product must not be blank` | Both are required and non-blank. |
| `400` | `recorded_by must be one of: agent, human` | The marker vocabulary is closed. Send `agent` or `human`, or omit the field — never guess a third value. On MCP the same string arrives as a tool error instead of a status. |
| `400` | `project does not exist in this org, and a capture-only key cannot create one` | A **Capture only** org-level key named a project the org does not have. Nothing was captured. Retry once without `project` (it lands in `"default"`) only if the user is fine with that; otherwise tell the user the project must be created in the web app first (or a **Full access** key used). On MCP the same string arrives as a tool error. |
| `400` | `channel must be one of: web, mobile, support`, `project must not exceed 200 characters`, … | A semantic normalization failure — the `detail` string is actionable verbatim. |
| `421` | `Invalid Host header` (MCP only, plain text) | The server's `MCP_ALLOWED_HOSTS` does not list the hostname you called. Not a key problem and not retryable — the operator must add the host. |
| `5xx` | e.g. `storage write failed` / `project resolution failed` | Server-side: the feedback was **not** captured. Report it verbatim; do not retry. |

## 7. Report back

Tell the user plainly whether the feedback was captured:

- **Captured**: quote the full `request_id`.
- **Not captured**: name the failure (from the table above) and what, if anything, they need to do (usually: fix `VOCKY_API_TOKEN`, or nothing — it was a transient server error and can be retried later).

Never claim a capture succeeded without a `202` response or an `Accepted feedback capture <request_id>` tool result to point to.

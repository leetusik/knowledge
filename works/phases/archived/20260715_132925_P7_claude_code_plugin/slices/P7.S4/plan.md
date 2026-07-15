# Plan — P7.S4: Shipped explain skill

Orchestrator plan (auto run). Executor: slice-executor-mid. Read `phase.md` (Decomposition P7.S4, Findings — config schema + S3's findings block — and Constraints) first. One deliverable file: `plugin/skills/explain/SKILL.md`. Source text to adapt: `.claude/skills/explain/SKILL.md` (the workspace skill — do NOT modify it; it stays for the operator until the bootstrap repo retires it). No commits, no status transitions.

## Goal

The plugin-shipped explain skill: same house style, same API-first write semantics, but config-driven instead of hardcoded to the operator's machine, with bearer support and a strict local-only fallback rule. Invoked as `/knowledge:explain` after install.

## What MUST be preserved from the source skill (verbatim in substance)

- The 8-step shape and the style contract (step 4 whole: structure choices, devices, length guide, mini-glossary).
- API-first discipline: POST once, branch on HTTP status — 201 / 409 (ask before overwrite) / 422 / 401 — and NEVER file-fallback on an HTTP error; fallback ONLY on transport failure (curl exit ≠ 0).
- The exact temp-dir build pattern (body.md + meta.json + the `python3 -c` merge one-liner + the single curl --json POST), the meta.json field set, and the co_authored_by convention.
- Fallback file-write conventions: frontmatter shape (title double-quoted, 2–5 lowercase-kebab tags, source.project/source.repo), the `<!-- explain:recent -->` marker insert ladder in docs/index.md, scoped commit, never push, never commit any other repo.
- Step 1 (topic/`here` resolution), step 3 (grounded research), step 7 (project copy), step 8 (report).

## What changes

### 1. Frontmatter

```yaml
---
name: explain
description: <rewrite generically — research a topic in the current repo/conversation and save a novice-friendly explainer document into YOUR knowledge base (the one /knowledge:setup created); same "use ONLY when the user wants it persisted" guard as the source>
argument-hint: <topic> [here]
allowed-tools: Read, Grep, Glob, Write, Bash(curl -sS --max-time 5:*), Bash(python3 -c:*)
---
```

Note the DELIBERATE drop of the source's `Bash(git -C ~/projects/personal/knowledge:*)` allowance: the KB path is no longer fixed, so the rare fallback-path git commands just take a normal permission prompt. Do not replace it with a broad `Bash(git:*)`.

### 2. Step 2 becomes "Resolve the knowledge base configuration"

Resolution order (per-key precedence, highest first) — spell it out in the skill AND give one concrete `python3 -c` snippet that prints the resolved values (kb_root, api_base_url, token-or-empty, site_base_url) so the model running the skill executes ONE command, not prose:

1. **Env overrides**: `KB_ROOT`, `KB_API_BASE_URL`, `KB_API_TOKEN` (each overrides just its key).
2. **Config file**: `$XDG_CONFIG_HOME/knowledge-kb/config.json` (default `~/.config/knowledge-kb/config.json`); keys `kb_root`, `api.base_url`, `api.token`, `site.base_url` (written by `/knowledge:setup`).
3. **Legacy convention** (keeps the plugin working on machines that predate setup): if `~/projects/personal/knowledge/mkdocs.yml` exists → `kb_root=~/projects/personal/knowledge`, `api.base_url=http://localhost:8766`, `site.base_url=http://localhost:8765`, no token.
4. **Nothing resolves** → STOP and tell the user: no knowledge base is configured — run `/knowledge:setup` (or set the env vars). Write no files anywhere.

Defaults when a config file resolves but omits a key: `api.base_url` → `http://localhost:8766`, `site.base_url` → `http://localhost:8765`, `token` → none. `kb_root` may legitimately be absent for a REMOTE-ONLY config (hosted api.base_url) — handle per the fallback rule below.

### 3. API call gains bearer support

The single curl POST goes to `{api_base_url}/api/documents` and adds `-H "Authorization: Bearer <token>"` ONLY when a token resolved. Status branches unchanged; update the 401 text to point at token config (config file / KB_API_TOKEN) rather than "the server has a token set".

### 4. Fallback becomes LOCAL-ONLY (SaaS-open rule)

The file+git fallback (source step 6) is permitted ONLY when the resolved `kb_root` is a local directory that exists and contains `mkdocs.yml`. If the API is unreachable and there is no such local kb_root (e.g. a hosted `api.base_url`), REPORT the transport failure and stop — never write files, never suggest scaffolding. Inside the fallback, every hardcoded `~/projects/personal/knowledge` becomes the resolved `<kb_root>` (file write, docs/index.md marker insert, `git -C <kb_root>` add/commit pair). Step 8's fallback report URL uses the resolved `site_base_url`.

### 5. Step 8 report

API path: use the response `url` as today. Fallback path: view URL built from resolved `site_base_url`. Keep the reindex-reconciliation note but phrase it against the resolved kb_root/compose.

## Validation (run all; record outcomes)

1. `claude plugin validate ./plugin` and `claude plugin validate ./plugin --strict` → both exit 0 (frontmatter parses; skill discovered).
2. Config-resolution snippet matrix — run the skill's OWN `python3 -c` snippet exactly as written in the SKILL.md, under controlled env (use `env -i HOME=<tmp> ...` or explicit vars), asserting each tier:
   a. env overrides win (set all three, plus a decoy config file → env values printed);
   b. config file resolves (temp `XDG_CONFIG_HOME` with a full config.json → its values);
   c. config file with omitted keys → documented defaults fill in;
   d. legacy convention fires on this machine when HOME is real and no config file/env are set — CAUTION: if the operator's real `~/.config/knowledge-kb/config.json` exists, point `XDG_CONFIG_HOME` at an empty temp dir to isolate;
   e. nothing resolves (empty temp HOME + empty XDG) → the snippet's "unconfigured" outcome (whatever sentinel the skill defines) is unambiguous.
3. Remote-config guard: with a temp config whose `api.base_url` is a non-routable host and NO `kb_root`, confirm the skill text's decision table yields "report, no fallback" (this is a text-logic check — verify the SKILL.md instructions are unambiguous on it; no network call needed).
4. Read-through diff vs the source skill: document in result.md the old→new mapping per step and confirm every MUST-preserve item above survived verbatim-in-substance (esp. the two spelled commands and the four status branches).
5. Do NOT POST to the operator's live API (no test documents in the real KB). A `curl -sS --max-time 5 http://localhost:8766/healthz` GET is allowed if you want liveness evidence, nothing more.
6. `python3 scripts/workflow.py validate`.

## Wrap-up

- Append to `phase.md` Findings: the resolved-config snippet's exact shape (S5 must write config.json in exactly the schema this skill reads — quote the key paths) and any decisions S5/S6 need.
- Append Doc impact lines: `api — shipped explain skill: config resolution order (env → config file → legacy → stop), bearer auth on POST, unchanged server API surface. [S4]` and `security — local-only fallback rule (no file writes for remote KBs), token via config file/env only, dropped path-scoped git allowed-tool in favor of prompted fallback. [S4]`.
- Keep `plugin.json` at 0.1.0.
- Write `result.md` from scratch; return the structured verdict.

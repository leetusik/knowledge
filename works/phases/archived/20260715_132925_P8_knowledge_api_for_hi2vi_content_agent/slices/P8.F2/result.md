# Result — P8.F2: reality-fix (`openssh-client` in the image + deploy artifacts retargeted to the live dedicated edge)

**Status: done.** Both defects the plan identified were real, are fixed, and the fixes are
empirically proven — not merely reasoned about. The new vhost passes a real `nginx -t`
against the **live** conf tree, and the rebuilt image really does contain `ssh`.

Nothing on the production box was modified (verified after the fact — see *Box left pristine*).

---

## Defect 1 — the image could not push over SSH

**Fixed in `Dockerfile`:** `openssh-client` added to the `apt-get install -y
--no-install-recommends git tzdata` line, and the comment above it extended in the file's
existing voice (why `ssh` is load-bearing: it is only a *Recommends* of git, which
`--no-install-recommends` drops; without it `KB_GIT_PUSH=true` fails on every push, and
because push is best-effort it fails **silently** — still 201, with `pushed:false` +
`push_error`). The "Both are load-bearing" note is now "All three are load-bearing".

**Proven, before and after:**

| Command | Outcome |
|---|---|
| `docker run --rm python:3.12-slim sh -c "command -v ssh \|\| echo IMAGE_HAS_NO_SSH"` | `IMAGE_HAS_NO_SSH` — the control: the base image (and therefore the pre-fix image) has no `ssh` |
| `COMPOSE_BAKE=false docker build -t kb-api-f2-check .` | **exit 0** — the fixed Dockerfile builds clean |
| `docker run --rm kb-api-f2-check sh -c 'command -v ssh && ssh -V && git --version'` | `/usr/bin/ssh` · `OpenSSH_10.0p2` · `git 2.47.3` — **push is now physically possible** |

(Test image removed afterwards.)

**Plugin parity:** the fixed `Dockerfile` was copied byte-identically to
`plugin/templates/kb/Dockerfile` (`diff` clean), and the plugin version bumped
**0.2.0 → 0.2.1** in both places — `plugin/.claude-plugin/plugin.json` and the
scaffold-marker `plugin_version` in `plugin/skills/setup/SKILL.md` (payload change ⇒ bump,
per the plugin README's release checklist).

## Defect 2 — deploy artifacts targeted an edge that no longer exists

The plan's topology was **verified live, in full** (`ssh oracle-cloud`, read-only): compose
project `edge` at `/home/opc/edge`, container `edge-nginx` (`nginx:1.27-alpine`, up 11 days),
sole owner of `:80`/`:443`, on `changple_shared_network` only; **`changple5-nginx-1` does not
exist**; `conf.d/` + `certs/` are **read-only host bind mounts**; `deploy.sh` (hard `nginx -t`
→ graceful reload, never recreates) and `validate.sh` are the apply path; **no
`apply-to-edge.sh` exists**; `hi2vi.crt` SANs are `DNS:*.hi2vi.com, DNS:hi2vi.com` (valid to
2041) so the **wildcard already covers `knowledge.hi2vi.com`**; DNS is live.

- **`deploy/knowledge.hi2vi.com.conf` → `deploy/knowledge.conf`** (`git mv`, matching the
  edge's short-name convention), body rewritten against `hi2vi.conf`, the proven house
  pattern: server-level `:80 → 301`; `:443 ssl` + `http2 on`; the **wildcard cert**
  (`/etc/nginx/certs/hi2vi.crt` + `.key` — the dead per-host-cert variant block is gone);
  Docker-DNS re-resolution (`resolver 127.0.0.11 valid=30s ipv6=off` + `set
  $knowledge_upstream knowledge-api` → `proxy_pass http://$knowledge_upstream:8000`);
  the Cloudflare real-IP restore block; `Strict-Transport-Security "max-age=300"`;
  `client_max_body_size 5m`; `proxy_read_timeout 120s`; standard proxy headers;
  **no `limit_req_zone`** (with the reason in-file).
- **Two hazards the house pattern encodes, both stated as in-file rules:** never
  `default_server` (`00-default.conf` owns the catch-alls → `444`), and **no IPv6 `listen
  [::]:…`** — no sibling conf listens on v6, so adding it here would silently make *this*
  vhost the default server for all v6 traffic.
- **`deploy/README.md`** rewritten: the real edge in §0; §3 is now a **host file drop +
  `./deploy.sh`** (with `./validate.sh` as the optional pre-gate), no `docker cp`, no
  recreate; the **"after any changple5 deploy assume knowledge.hi2vi.com is DOWN" rule and
  the cross-repo `apply-to-edge.sh` handoff are deleted** and replaced with the plain truth
  (declarative host state on read-only mounts ⇒ co-tenant deploys cannot wipe it; this is the
  D2 / Option-B end state, live); no cert step (wildcard covers it); DNS marked done; §1 now
  makes the clone `opc`-owned (compose reads `compose.prod.yml` + `.env` client-side as `opc`)
  with `.env` mode 600; §2 adds an **`ssh`-in-image assertion** so Defect 1 can never recur
  silently.
- **`deploy/SECRETS.md`** rewritten around one rule — **no secret value ever transits a
  laptop, chat, or transcript**: the deploy key is *generated on the box* into its final path
  (private half never leaves; the "scp it from your Mac, then delete the local copy" dance is
  gone), only the `.pub` half moves, registered via `gh repo deploy-key add … --allow-write`;
  `KB_API_TOKEN` is generated **in place** into `/opt/knowledge/.env` (unquoted heredoc, so
  `$(openssl rand -hex 32)` expands as the file is written) and read back only on demand;
  §3 records DNS ✅ and cert coverage ✅ **with the verification commands and their confirmed
  results**, keeping the per-host cert only as an "if this ever changes" note.

---

## Validation

| Command | Outcome |
|---|---|
| **`nginx -t` — full LIVE `conf.d/` tree + the new `knowledge.conf`, throwaway `nginx:1.27-alpine`, REAL certs mounted read-only** | **PASS** — `syntax is ok` / `test is successful`, exit 0 |
| **Negative control** — same harness, duplicate `hi2vi_contact` zone appended | **FAILS as it must**: `[emerg] limit_req_zone "hi2vi_contact" is already bound … in /etc/nginx/conf.d/knowledge.conf:141`, exit 1 |
| `python3 scripts/plugin_parity.py` | **PASS** — "plugin templates are in parity with the repo", exit 0 |
| `.venv/bin/python -m pytest -q` | **65 passed** (unchanged — nothing behavioral) |
| `python3 scripts/workflow.py validate` | **PASS** |
| `docker build` + `command -v ssh` in the image | **PASS** — `/usr/bin/ssh` (see Defect 1 table) |

The `nginx -t` was run non-destructively: the live `conf.d/*.conf` copied into a `mktemp -d`
on the box, the new conf piped in from this repo, tested in a throwaway container with
`/home/opc/edge/certs` mounted read-only, temp dir removed. **The negative control matters** —
it proves the harness actually *parses* `knowledge.conf` (the error is reported against that
file, at that line) rather than silently ignoring it, so the PASS is meaningful. It also
demonstrates the duplicate-zone hazard is real: one bad zone name fails the test for the
**whole tree**, which is exactly why the conf declares none.

## Box left pristine

Re-checked after all testing: `conf.d/` holds the original four confs with their original
Jul 2 mtimes and **no `knowledge.conf`**; no temp dirs remain; `edge-nginx` is **up 11 days
(healthy)** — never reloaded, exec'd, `docker cp`'d into, or recreated by me;
`/opt/knowledge` still does not exist. Reads only.

**Useful for the orchestrator's bring-up:** `/opt/knowledge-secrets/` **already contains**
`knowledge_deploy_key` (root, 600), `knowledge_deploy_key.pub` and `known_hosts` (created
today) — i.e. SECRETS.md §2a and README §1b's `known_hosts` pinning appear already done, and
they match the shape this slice documents. Only the **`.pub` registration on GitHub with write
access** still needs confirming (`gh repo deploy-key list -R leetusik/knowledge`). I listed
names/modes only; I did not read the key.

---

## 🔴 SECURITY FINDING — operator action needed (not created by this slice; found by it)

**A live, write-enabled GitHub deploy key has its private half sitting untracked and
unignored in this repo's working tree.**

`git status` surfaced two untracked files in the repo root that I did not create:
`knowledge_deploy_key` and `knowledge_deploy_key.pub`. They are the residue of the **old**
`SECRETS.md` flow this slice deletes — "`ssh-keygen … -f ./knowledge_deploy_key`" (which
writes into the current directory, i.e. the repo root) "…then scp it to the box and delete the
local copy". The copy was not deleted.

There are **two different keypairs**, and **both are registered on GitHub with write access**:

| Deploy key | Fingerprint | Private half | GitHub |
|---|---|---|---|
| `knowledge-api@oci` (id **157264706**, added 12:58) | `SHA256:+ldqLSFjpMx6GlnSljDTyOF5Kn4scUgMXmUc3F2CI4U` | **in this repo's working tree** (`./knowledge_deploy_key`) | registered, **read-write** |
| `knowledge-api@oci-box` (id **157267945**, added 13:31) | `SHA256:1uQQoANnNWacK1k0fZr2U3AxcasgSx8/mwq805UbKhg` | on the box only (`/opt/knowledge-secrets/`) | registered, **read-write** |

The box holds **`oci-box`** (fingerprints compared — public halves only; I never read a private
key). So **`oci` is an orphan**: unused by the box, still write-capable on GitHub, and its
private half is one `git add -A` away from being committed to a **public** repository.

**Mitigated now, in-repo:** I added a private-key backstop to `.gitignore`
(`knowledge_deploy_key*`, `*.pem`, `*.key`) — verified it now ignores both files and catches no
tracked file. That closes the accidental-commit path.

**What I did NOT do (operator/orchestrator call — revoking a credential and deleting the
operator's files are destructive and outside my remit):**

```bash
# 1. Revoke the orphan deploy key on GitHub (the box does not use it):
gh repo deploy-key delete 157264706 -R leetusik/knowledge
# 2. Delete the orphan private key from the working tree:
rm -f knowledge_deploy_key knowledge_deploy_key.pub
# 3. Confirm exactly one key remains — the box's:
gh repo deploy-key list -R leetusik/knowledge   # expect only knowledge-api@oci-box (157267945)
```

This also matters for the bring-up: with two write-capable keys registered it must be
unambiguous which one is authoritative. It is `oci-box` (the one the box actually holds, and
the one `compose.prod.yml` mounts).

---

## Deviations from `plan.md`

1. **`compose.prod.yml` — comment-only edit (plan said "do not touch").** Its header comment
   still named `changple5-nginx-1` and pointed at `deploy/knowledge.hi2vi.com.conf`, a path
   **this slice deletes** — a dangling reference of exactly the artifacts-vs-reality class the
   slice exists to remove. I changed **only that comment block** (dedicated edge + the new
   `deploy/knowledge.conf` path); **no service, env, volume, network or healthcheck line was
   touched**, so the plan's "it is already correct" holds. Flagged rather than left rotting.
2. **Added an `ssh`-in-image assertion to `README.md` §2** (not in the plan's list). Defect 1
   was invisible precisely because a missing `ssh` fails silently; a one-line
   `docker compose exec api command -v ssh` at bring-up makes the regression loud. Judged
   in-intent for a slice whose whole point is that this must never silently break.
3. **Added a private-key backstop to `.gitignore`** (`knowledge_deploy_key*`, `*.pem`, `*.key`)
   — not in the plan, but the plan's own constraint is "no secrets anywhere in the repo", and I
   found a live private key untracked in the working tree (see the security finding above).
   Verified no tracked file is caught by the new patterns.
4. **README §1a clones over HTTPS and then `git remote set-url origin git@github.com:…`**
   instead of cloning over SSH. Verified the repo is public (unauthenticated
   `api.github.com/repos/leetusik/knowledge` → HTTP 200), so *reading* needs no credential,
   while the *push* path is still the deploy key. This avoids a sudo-plus-`GIT_SSH_COMMAND`
   clone dance under a root-only key, and keeps the clone `opc`-owned in one step — which §1
   now requires. Same end state (`origin` is the SSH URL), fewer ways to get it wrong.

Also confirmed as a bonus prerequisite for publish-on-write: **the box can reach
github.com over SSH:22** (`Permission denied (publickey)` — TCP + host-key handshake
succeed, only auth is absent, as expected with no key offered). Wrote nothing
(`UserKnownHostsFile=/dev/null`).

## Not touched, deliberately

`docs/hi2vi_web/2026-07-02-shared-nginx-explained.md` still describes the **superseded**
shared-edge topology (it predates the Option-B cutover; the box carries a `.cutover-anchor`
dated 2026-07-02). Per the plan I only **flag** it — it is a knowledge-base content doc, and
it is not wrong as *history*, only as an operating manual. `deploy/README.md` now says so
explicitly. Left for the operator/review to decide (a follow-up doc, or a superseded-by note).

Also untouched: `server/*`, `tests/*`, `compose.yml`, everything under `docs/`.

# Production deploy runbook — knowledge.hi2vi.com

Operator-facing runbook for hosting the **whole knowledge site — the human web UI
*and* the machine API** — publicly at `https://knowledge.hi2vi.com`, as a co-tenant
on the OCI box (the same box + edge that serves hi2vi.com). As of **P9** the box
self-hosts the site (GitHub Pages retired) and a **manual-dispatch `Production Deploy`
GitHub Action** automates the box deploy — see **§6**. §0–§5 below are the one-time
bring-up / first-bootstrap steps that run **on the box**; §6 is the repeatable redeploy.

Artifacts this runbook applies:

- **`compose.prod.yml`** (repo root) — the box compose project. As of **P9** it ships
  **two** services: **`api`** (`knowledge-api`) and **`site`** (`knowledge-site`, a
  `mkdocs serve --livereload` viewer on `squidfunk/mkdocs-material:9.7.6`, off the same
  `/opt/knowledge` clone). Both are unpublished-port, edge-only.
- **`deploy/knowledge.conf`** — the nginx vhost (now **two-location**: `/` → the site,
  `/api/*` + `/healthz` → the api), dropped onto the box's edge.
- **`deploy/deploy.sh`** + **`deploy/oracle-production-deploy-remote.sh`** +
  **`deploy/github-actions-production-deploy.sh`** — the P9 three-script deploy chain the
  `Production Deploy` Action runs (§6).

Secret *values* live only on the box (never in this repo). Generating and
registering them + DNS — the token, the SSH deploy key (and its GitHub
registration), the DNS record, the optional Gemini key — is the
**[`SECRETS.md`](SECRETS.md)** provisioning runbook. Do that first; this runbook
then *places and brings up* what it produced, referencing secrets by name and
placement path only.

---

## 0. The box, as it actually is (confirm before you start)

- **A dedicated edge**, not a shared one. Compose project **`edge`** at
  **`/home/opc/edge`**, container **`edge-nginx`** (`nginx:1.27-alpine`), owner of
  `0.0.0.0:80` + `:443`, attached to the external Docker network
  **`changple_shared_network`**. (The old shared `changple5-nginx-1` edge is gone.)
- **The edge's config is declarative host state.** `/home/opc/edge/conf.d` and
  `/home/opc/edge/certs` are **read-only bind mounts** into the container, so a
  config change is a **file drop on the host + a reload** — and a co-tenant deploy
  can no longer wipe it. Current vhosts: `00-default.conf` (owns the
  `default_server` catch-all → `444`), `changple5.conf`, `changple-web.conf`,
  `hi2vi.conf`; we add `knowledge.conf`.
- **The edge ships its own tooling** — use it, don't improvise:
  - `./deploy.sh` — hard `nginx -t` gate inside the **running** container, then a
    graceful `nginx -s reload`. **Never recreates the container.** A failed test
    reloads nothing, so a bad edit cannot take the edge down.
  - `./validate.sh` — optional local pre-gate (dummy certs + `compose config` +
    throwaway-container `nginx -t` over the whole `conf.d/` tree).
- **TLS is already covered.** `/home/opc/edge/certs/hi2vi.crt` is a Cloudflare
  Origin CA cert whose SANs are `*.hi2vi.com, hi2vi.com` (valid to 2041) — the
  **wildcard already covers `knowledge.hi2vi.com`**. Nothing to provision.
- **DNS is already live.** `knowledge.hi2vi.com` resolves to the same Cloudflare
  proxy IPs as `hi2vi.com` (see §4).
- Secrets provisioned per **[`SECRETS.md`](SECRETS.md)**: a strong `KB_API_TOKEN`,
  an SSH **deploy key** registered on `leetusik/knowledge` **with write access**,
  and (optional) a `GOOGLE_API_KEY`.

---

## 1. Box prep — clone, secrets, .env

The clone must be **owned by `opc`**: `docker compose` reads `compose.prod.yml`
and `.env` *client-side*, as the invoking user (`opc`, which is in the `docker`
group). A root-owned `.env` at mode 600 would be unreadable and the bring-up
would fail with a missing-env-file error.

```bash
# 1a. Clone into /opt/knowledge, owned by opc.
sudo mkdir -p /opt/knowledge
sudo chown opc:opc /opt/knowledge
git clone https://github.com/leetusik/knowledge.git /opt/knowledge   # public repo — no credential needed to READ
cd /opt/knowledge

# The PUSH path must be SSH (that is what the deploy key authenticates), so point
# origin at the SSH form. The container pushes; the host user never needs the key.
git remote set-url origin git@github.com:leetusik/knowledge.git
git remote -v        # confirm: origin  git@github.com:leetusik/knowledge.git  (fetch AND push)
```

> The api container runs as **root** and commits/pushes into this clone through the
> `/repo` bind mount (the image bakes `git config --system safe.directory /repo`),
> so new git objects under `/opt/knowledge/.git` end up root-owned. That is
> expected and harmless — but host-side `git` commands in this clone may need
> `sudo`.

```bash
# 1b. The deploy key already lives at /opt/knowledge-secrets/knowledge_deploy_key —
#     it was GENERATED there (SECRETS.md §2), so the private half never transited a
#     laptop or a transcript. It is root-owned; the container reads it through the
#     read-only mount (the docker daemon is root), and `opc` never needs to.
sudo ls -l /opt/knowledge-secrets/knowledge_deploy_key    # expect: -rw------- root root
sudo chmod 600 /opt/knowledge-secrets/knowledge_deploy_key  # ssh refuses group/world-readable keys

# Pin github.com's host key (avoids blind trust-on-first-use on the first push).
ssh-keyscan -t ed25519,rsa github.com | sudo tee /opt/knowledge-secrets/known_hosts >/dev/null
# VERIFY the scanned key against GitHub's published SSH key fingerprints
# (https://docs.github.com/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)
# before trusting it. If you would rather not pin, edit compose.prod.yml's
# GIT_SSH_COMMAND to StrictHostKeyChecking=accept-new and drop UserKnownHostsFile.

# 1c. Create the gitignored .env — owned by opc, mode 600 (compose reads it AS opc).
#     NEVER committed (.env is in .gitignore). The bearer token is GENERATED IN
#     PLACE here: note the UNQUOTED heredoc — $(openssl ...) expands as the file is
#     written, so the secret value never appears in a terminal or chat transcript.
cat > /opt/knowledge/.env <<EOF
# Bearer token for writes + hosted reads (KB_REQUIRE_READ_AUTH=true). SECRETS.md §1.
KB_API_TOKEN=$(openssl rand -hex 32)
# Optional Gemini key for hybrid semantic search. Empty/absent = BM25-only. §4.
GOOGLE_API_KEY=
EOF
chmod 600 /opt/knowledge/.env
ls -l /opt/knowledge/.env     # expect: -rw------- 1 opc opc
```

Read the token back only when you actually need it (e.g. to hand it to the hi2vi
side as `KNOWLEDGE_API_TOKEN`): `sudo grep '^KB_API_TOKEN=' /opt/knowledge/.env`.

The non-secret box config (`KB_GIT_PUSH=true`, `KB_REQUIRE_READ_AUTH=true`,
`KB_PUBLIC_BASE_URL`, `TZ`, `KB_ROOT`, `KB_STARTUP_REINDEX=true`) is baked into
`compose.prod.yml` — do not duplicate it in `.env`.

---

## 2. Bring-up — build + start the api

```bash
cd /opt/knowledge
# COMPOSE_BAKE=false: this host hits a compose-v2 bake-path panic on --build
# (documented in docs/current/operations.md). Carry the flag.
COMPOSE_BAKE=false docker compose -f compose.prod.yml up -d --build

# P9: this brings up BOTH services. Expect both Up (healthy):
docker compose -f compose.prod.yml ps            # expect: knowledge-api + knowledge-site  Up (healthy)
docker compose -f compose.prod.yml logs -f api   # watch the startup reindex line
# knowledge-site's healthcheck has a start_period (~40s) for the first mkdocs serve boot.
```

The image must contain **`ssh`** — `git` alone cannot push over an SSH remote, so
publish-on-write depends on it. Assert it once after the build:

```bash
docker compose -f compose.prod.yml exec api sh -c 'command -v ssh && git --version'
# expect: /usr/bin/ssh   (an empty result = the image predates the openssh-client
#         fix; rebuild. Without it EVERY push fails silently — see below.)
```

Verify the api is reachable **on the shared network** (before wiring the edge) —
a throwaway curl container joined to the same network:

```bash
docker run --rm --network changple_shared_network curlimages/curl:latest \
  -s -o /dev/null -w '%{http_code}\n' http://knowledge-api:8000/healthz
# expect: 200
```

If `KB_GIT_PUSH=true` but the deploy key / origin / `ssh` binary are
misconfigured, **writes still succeed** (201) — push is best-effort; the 201 body
carries `pushed:false` + `push_error`. Fix it, and the next write (or a manual
`git push`) publishes the accumulated commits. A push failure is **not** a
bring-up blocker; it means "not yet publishing" — but it is silent, so check
`pushed:true` on the first write (P8.S5) rather than assuming.

---

## 3. Edge apply — drop the vhost, reload

The edge's `conf.d/` is a **read-only host bind mount**, so applying the vhost is
a file drop on the host plus the edge's own reload script. No `docker cp`, no
`exec`, no recreate.

```bash
# 3a. Drop the conf onto the host (from your Mac, in this repo):
scp deploy/knowledge.conf oracle-cloud:/home/opc/edge/conf.d/knowledge.conf

# 3b. (Optional pre-gate) validate the whole tree locally on the box:
ssh oracle-cloud 'cd /home/opc/edge && ./validate.sh'

# 3c. Apply: hard `nginx -t` gate inside the RUNNING edge, then graceful reload.
ssh oracle-cloud 'cd /home/opc/edge && ./deploy.sh'
# expect: "config OK — issuing graceful reload" -> "reload complete. New config is live."
```

`deploy.sh` **never** recreates `edge-nginx` — recreating drops the container's
runtime network attachment, the exact failure cascade the dedicated edge was built
to remove. Never run `docker compose up`/`restart` against the edge to apply a
config change.

If `nginx -t` fails, **nothing is reloaded** and the edge keeps serving its last
good config. Fix `deploy/knowledge.conf` in this repo, re-`scp`, re-run
`./deploy.sh`.

> **No cert step.** The vhost points at `/etc/nginx/certs/hi2vi.crt` + `.key` — the
> Cloudflare Origin CA cert whose SANs are `*.hi2vi.com, hi2vi.com`, so the
> wildcard already covers `knowledge.hi2vi.com`. Re-check any time with:
> `ssh oracle-cloud "openssl x509 -in /home/opc/edge/certs/hi2vi.crt -noout -text | grep -A1 'Subject Alternative Name'"`

### Durability — no re-apply rule anymore

The edge's conf + certs are **declarative host state on read-only bind mounts**, and
the edge project has no `depends_on` and no `build`. **A co-tenant (changple5)
deploy cannot wipe `knowledge.hi2vi.com`**, and a container restart or box reboot
re-reads the same files. This is the Option-B dedicated edge (deferred **D2**), now
live — it replaces the old shared-edge regime in which the vhost was undeclared
runtime state inside `changple5-nginx-1`, wiped by every changple5 deploy and
restored by a cross-repo `apply-to-edge.sh`. **Both that operational rule and that
handoff are obsolete; there is no `apply-to-edge.sh` and none is needed.**

(Note: `docs/hi2vi_web/2026-07-02-shared-nginx-explained.md` in this knowledge base
still *describes* the old shared edge — it predates the cutover and is now history,
not the operating manual.)

---

## 4. Cloudflare DNS — done

`knowledge.hi2vi.com` already resolves to the same Cloudflare proxy IPs as
`hi2vi.com` (proxied `knowledge` record on the `hi2vi.com` zone). Confirm any time:

```bash
dig +short knowledge.hi2vi.com    # expect: Cloudflare proxy IPs, same as hi2vi.com
```

---

## 5. Post-apply validation checklist (from anywhere)

```bash
# Health (open, no auth):
curl -s -o /dev/null -w '%{http_code}\n' https://knowledge.hi2vi.com/healthz
# expect: 200

# Authed read/search (KB_REQUIRE_READ_AUTH=true → bearer required):
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $KB_API_TOKEN" \
  'https://knowledge.hi2vi.com/api/search?q=test'
# expect: 200

# Un-authed read is REJECTED:
curl -s -o /dev/null -w '%{http_code}\n' 'https://knowledge.hi2vi.com/api/search?q=test'
# expect: 401
```

Retrieve the token when you need it, without ever pasting it into a transcript:

```bash
ssh oracle-cloud "sudo grep '^KB_API_TOKEN=' /opt/knowledge/.env"
```

**Do NOT run a write test here.** A `POST /api/documents` pushes to `main` and is
an **E2E acceptance** step (P8.S5 / P9.S5) — the first `project:"hi2vi"` write → 201
→ commit on `main` → **live on the self-hosted site (fresh-on-write, P9)**. Run it
there, not as a bring-up smoke step.

---

## 6. Automated redeploy — the `Production Deploy` GitHub Action (P9)

After the one-time bring-up (§0–§5), a **code/image/vhost** change reaches production
through a **manually dispatched** GitHub Action — you no longer SSH in and run
`docker compose … up --build` + the edge apply by hand. (A **doc** does not need this:
it goes live fresh-on-write the instant the api writes it.)

### Usage

- **Trigger:** GitHub → `leetusik/knowledge` → Actions → **Production Deploy** → **Run
  workflow** (on `main`). Or: `gh workflow run deploy-production.yml --ref main`.
- It is **`workflow_dispatch`-only** and **main-guarded** — the agent's constant
  publish-on-write pushes to `main` never trigger it — and serialized by
  `concurrency: knowledge-deploy`.
- **What it does** (three-script chain, all on the box):
  1. **`deploy/github-actions-production-deploy.sh`** (runner, transport only) SSHes into
     `opc@140.245.64.173` with the `ORACLE_SSH_*` secrets (§6.1) and `scp`s + invokes the
     on-box gate with `TARGET_SHA` / `REPO_PATH=/opt/knowledge`.
  2. **`deploy/oracle-production-deploy-remote.sh`** (on-box gate) asserts inputs, hands to
     `deploy/deploy.sh`, then re-applies the edge vhost, then collects artifacts. It runs
     **no authoritative git** (that is in-container — see below).
  3. **`deploy/deploy.sh`** reconciles the clone **on `main`** (fetch + fail-closed
     ancestor gate + ff/rebase; **never** detach/reset/force) inside a **one-shot root
     container reusing the `api` service** (so git authenticates over SSH against the
     root-owned `.git`), then `COMPOSE_BAKE=false docker compose -f compose.prod.yml up -d
     --build` brings up **both** services and **health-gates both**. On failure it captures
     `compose ps`/`logs` and exits non-zero — **fix-forward, no rollback** (the app runs
     from the bind mount, so an image flip can't revert `server/` code).
  4. Edge re-apply (in the gate, after a healthy deploy): `install` `knowledge.conf` into
     `/home/opc/edge/conf.d/` → the edge's own `./deploy.sh` (`nginx -t` gate → graceful
     reload; a failed test fails the deploy loudly, reloads nothing).
  5. **External smoke:** the workflow curls `https://knowledge.hi2vi.com/healthz` **and**
     `/` (both must 200) → uploads `production-deploy-artifacts` (14 d).
- **Watch it:** `gh run watch` or the Actions run page. On failure, download the
  artifact (`compose ps` + per-service logs) to diagnose, fix on `main`, and re-dispatch.

### 6.1 The runner secret set (one-time, on `leetusik/knowledge`)

The Action needs a **dedicated** SSH key to reach `opc@box` — provisioned per
**[`SECRETS.md`](SECRETS.md) §2b** as three repo Actions secrets:
`ORACLE_SSH_PRIVATE_KEY` (required), `ORACLE_SSH_KNOWN_HOSTS` (required),
`ORACLE_SSH_PASSPHRASE` (optional). This key is **distinct** from the container's
publish-on-write deploy key (§1b) — never conflate them.

### 6.2 One-time box-clone bootstrap (first deploy only)

If `/opt/knowledge` predates the P9 machinery (no `deploy.sh` / on-box scripts, an old
single-service compose+vhost), the box clone must be reconciled to `origin/main`
**once** before the Action's chain can run against it. Do it with the **same one-shot
api container** the deploy uses (so git authenticates as root over SSH):

```bash
ssh oracle-cloud
cd /opt/knowledge
# Reconcile the clone to origin/main via the one-shot root container (fetch + ff/rebase,
# never detach/reset/force). This is exactly what deploy.sh's reconcile step does.
COMPOSE_BAKE=false docker compose -f compose.prod.yml run --rm -T --no-deps \
  --name knowledge-bootstrap-$$ --entrypoint sh api -c \
  'set -e; cd /repo; git fetch --prune origin main; git merge --ff-only origin/main; git log -1 --oneline'
# Then a normal bring-up brings up BOTH services with the P9 compose:
COMPOSE_BAKE=false docker compose -f compose.prod.yml up -d --build
```

After this first bootstrap, every subsequent deploy is just the `Production Deploy`
Action (§6). (P9.S5 did exactly this: `383577e → c018571`, clean ff-merge, then the
first real dispatch.)

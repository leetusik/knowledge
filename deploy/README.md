# Production deploy runbook — hi2vi.com (formerly knowledge.hi2vi.com)

Operator-facing runbook for hosting the **whole knowledge product — the Next.js web
app *and* the machine API** — publicly at `https://hi2vi.com` (`knowledge.hi2vi.com` and
`vocky.hi2vi.com` redirect there, §3), as a co-tenant on the OCI box and its shared
edge. As of **P14** the box serves
the **Next.js app** at `/` (the public landing + the authenticated UI + the `/api/auth/*`
BFF); the old **mkdocs `site` viewer is RETIRED** (its content lives on as tenant #1's
knowledge in the app + api). A **manual-dispatch `Production Deploy` GitHub Action**
automates the box deploy — see **§6**. §0–§5 below are the one-time bring-up /
first-bootstrap steps that run **on the box**; §6 is the repeatable redeploy.

Artifacts this runbook applies:

- **`compose.prod.yml`** (repo root) — the box compose project. It ships
  **`api`** (`knowledge-api`), **`web`** (`knowledge-web`, the Next.js standalone app
  built from `web/Dockerfile`), **`mcp`** (`knowledge-mcp`, `/mcp` and `/feedback/mcp`)
  and **`postgres`** (`knowledge-postgres`, the P10 control-plane store), with two named
  volumes: `pgdata` (Postgres) and `knowledge-feedback-attachments` (Feedback's
  uploaded attachments, §2). The mkdocs `site` service was **removed** in P14.S3. All
  are unpublished-port, edge-only.
- **The three edge vhosts** (§3), landed through the edge repo by the operator:
  - **`deploy/hi2vi.conf`** — the serving vhost, on the apex `hi2vi.com`. Three
    upstreams: the control plane (`/api/*`, `/auth/*`, `/app/*`, `= /healthz` →
    `knowledge-api:8000`, Feedback's `/api/feedback*`, `/api/project/*` and
    `/app/feedback*` included), the Next app (`/api/auth/*`, the BFF relays, and
    everything else, incl. `/` and `/feedback` → `knowledge-web:3000`) and the MCP
    server (`/mcp` and `/feedback/mcp` → `knowledge-mcp:9000`). It replaces the edge's
    old `hi2vi.conf` (the retired hi2vi-web site).
  - **`deploy/knowledge.conf`** — `knowledge.hi2vi.com`, now **redirect-only**: every
    path → the same path and query on `https://hi2vi.com`, 308.
  - **`deploy/vocky.conf`** — `vocky.hi2vi.com`, **redirect-only**: Feedback's old
    host, mapped onto the apex (its header carries the map), 308; `/admin/*` 404;
    the retired `/install.sh` answers a script that says so and exits 1.
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
  can no longer wipe it. Vhosts: `00-default.conf` (owns the `default_server`
  catch-all → `444`), the other tenants' sites, and this repo's three:
  `hi2vi.conf`, `knowledge.conf` and `vocky.conf` (§3). The tree's canonical home is
  the **edge repo** (`leetusik/edge`, `edge/conf.d/`); it reaches the box through
  that repo's own loop.
- **The edge ships its own tooling** — use it, don't improvise:
  - `./deploy.sh` — hard `nginx -t` gate inside the **running** container, then a
    graceful `nginx -s reload`. **Never recreates the container.** A failed test
    reloads nothing, so a bad edit cannot take the edge down.
  - `./validate.sh` — optional local pre-gate (dummy certs + `compose config` +
    throwaway-container `nginx -t` over the whole `conf.d/` tree).
- **TLS is already covered.** `/home/opc/edge/certs/hi2vi.crt` is a Cloudflare
  Origin CA cert whose SANs are `*.hi2vi.com, hi2vi.com` (valid to 2041) — the apex
  SAN covers `hi2vi.com` and the **wildcard covers `knowledge.hi2vi.com` and
  `vocky.hi2vi.com`**. Nothing to provision.
- **DNS is already live.** `hi2vi.com`, `knowledge.hi2vi.com` and `vocky.hi2vi.com`
  resolve to the same Cloudflare proxy IPs (see §4).
- Secrets provisioned per **[`SECRETS.md`](SECRETS.md)**: a strong `KB_API_TOKEN`,
  an SSH **deploy key** registered on `leetusik/platform` **with write access**,
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
git clone https://github.com/leetusik/platform.git /opt/knowledge   # public repo — no credential needed to READ
cd /opt/knowledge

# The PUSH path must be SSH (that is what the deploy key authenticates), so point
# origin at the SSH form. The container pushes; the host user never needs the key.
git remote set-url origin git@github.com:leetusik/platform.git
git remote -v        # confirm: origin  git@github.com:leetusik/platform.git  (fetch AND push)
```

> The repository was renamed from `leetusik/knowledge` to `leetusik/platform` on
> 2026-11-13. The box's existing checkout still has the old SSH address, which
> GitHub redirects, so pushes and fetches keep working; re-point it with
> `git remote set-url origin git@github.com:leetusik/platform.git` at the next
> change to the deploy machinery.

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
# Web BFF session secret (P14): the AES-256-GCM session key derives from it, so the
# `web` service seals each user's bearer into an httpOnly cookie. A NEW secret,
# generated in place. Rotating it invalidates every live session (all users re-login).
SESSION_SECRET=$(openssl rand -base64 32)
EOF
chmod 600 /opt/knowledge/.env
ls -l /opt/knowledge/.env     # expect: -rw------- 1 opc opc
```

> The box `.env` also carries the **P10 control-plane secrets** — `POSTGRES_PASSWORD`,
> `KB_OPERATOR_EMAIL`, `KB_OPERATOR_PASSWORD` (see `SECRETS.md` + the `api`/`web`
> `environment:` comments in `compose.prod.yml`, the authoritative per-var list). The
> `web` service reads **only `SESSION_SECRET`** from `.env` (interpolated, not
> `env_file:`), so the api's `KB_API_TOKEN` never reaches the web container.

> **Optional: Feedback's owner alert mail.** The api reads five more names from `.env`
> (through `env_file:`, so `compose.prod.yml` lists them only in a comment):
> `KB_SMTP_HOST`, `KB_SMTP_PORT`, `KB_SMTP_USER`, `KB_SMTP_PASSWORD` and
> `KB_SMTP_FROM`. With no host, or no sender (`KB_SMTP_FROM`, else `KB_SMTP_USER`),
> no alert mail goes out and everything else works. `KB_SMTP_PASSWORD` is the secret (`SECRETS.md` §4b); add the lines on
> the box with an editor, never through the repo, then recreate the api.

Read the token back only when you actually need it (e.g. to hand it to the hi2vi
side as `KNOWLEDGE_API_TOKEN`): `sudo grep '^KB_API_TOKEN=' /opt/knowledge/.env`.

The non-secret box config (`KB_GIT_PUSH=true`, `KB_REQUIRE_READ_AUTH=true`,
`KB_PUBLIC_BASE_URL=https://hi2vi.com`, `TZ`, `KB_ROOT`, `KB_STARTUP_REINDEX=true`,
`KB_FEEDBACK_ATTACHMENTS_DIR=/data/feedback-attachments`) is baked into
`compose.prod.yml` — do not duplicate it in `.env`.

One more non-secret knob is **not** set there and defaults safely: **`KB_GIT_TIMEOUT_S`**
(default **60**, seconds) caps *every* git subprocess — fetch, rebase, push, add, commit
(P24). Since the after-response publish worker holds the write lock while it pushes, this
cap is what stops a hung SSH round-trip from stalling later writes; a hit surfaces as a
`[kb-api] publish: … FAILED` log line and the doc republishes on the next push. Leave it
alone unless the box's link to GitHub is genuinely slow; unparseable or non-positive
values fall back to 60, so the cap cannot be switched off.

---

## 2. Bring-up — build + start the api

```bash
cd /opt/knowledge
# COMPOSE_BAKE=false: this host hits a compose-v2 bake-path panic on --build
# (documented in archive/workspace/docs/current/operations.md). Carry the flag.
COMPOSE_BAKE=false docker compose -f compose.prod.yml up -d --build

# This builds + brings up the api, the web app and the MCP server (and postgres). Expect Up (healthy):
docker compose -f compose.prod.yml ps            # expect: knowledge-api + knowledge-web + knowledge-mcp + knowledge-postgres  Up (healthy)
docker compose -f compose.prod.yml logs -f api   # watch the startup reindex line
# knowledge-web builds the Next standalone image (web/Dockerfile) on first up; its
# healthcheck has a ~20s start_period for the server's cold boot. The web app depends
# on the api being healthy, so it starts after the api's ~60s reindex start_period.

# One-time on an EXISTING box that still runs the retired mkdocs viewer: drop it.
# (A fresh clone never had it; harmless if `site` is already gone.)
docker compose -f compose.prod.yml rm -sf site   # retire the mkdocs knowledge-site
```

> **`KB_PUBLIC_BASE_URL` caveat (P14).** The api's 201 `url` field is
> `https://hi2vi.com/<project>/<date>-<slug>/`, a path the retired mkdocs site used to
> render. The Next app has no such route, so that link does not resolve to a page —
> **cosmetic only** (docs are read by id via the api/app, never this link). Only its
> origin moved to the apex; repointing or degrading the path is left to a future docs
> effort.

**Feedback attachments live on a named volume.** The api mounts
`knowledge-feedback-attachments` (Docker names it `knowledge_knowledge-feedback-attachments`,
after the compose project) at `/data/feedback-attachments`, which
`KB_FEEDBACK_ATTACHMENTS_DIR` names. The first `up` creates it empty; it survives every
recreate and stays out of the git clone. It is user data: back it up with `pgdata`.
Assert it once after the first deploy that carries it:

```bash
docker compose -f compose.prod.yml exec api sh -c 'echo "$KB_FEEDBACK_ATTACHMENTS_DIR"; ls -ld /data/feedback-attachments'
# expect: /data/feedback-attachments, then a directory line
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
misconfigured, **writes still succeed** (201) — the push is best-effort and, as of
**P24**, runs on the after-response publish worker (`server/publish.py`), so it can
neither delay nor fail the request. Fix it, and the next write (or a manual push)
publishes the accumulated commits. A push failure is **not** a bring-up blocker; it
means "not yet publishing" — but it is **silent**, so *assert the capability* here
rather than assuming it (the P8.F2 rule: assert the capability at bring-up, never
infer it from a status code).

> **P24 changed the evidence.** The 201 body no longer says anything about the push:
> `pushed` is now always `false` (the push has not run yet when the response is
> written), `push_error` never appears, and `push_pending:true` only means "a push was
> queued". The surviving signals are **the api container log** and **the clone's own
> git state** — use both.

```bash
# 2a. Is the push credential usable at all? (SSH origin + deploy key + pinned host key.)
docker compose -f compose.prod.yml exec api git -C /repo ls-remote origin main
# expect: one "<sha>\trefs/heads/main" line. A permission-denied / host-key error here
# means every push WILL fail. Read-only, so it proves authentication, not WRITE access —
# only a real push proves that, which is what 2b asserts.

# 2b. After the FIRST real write (the E2E acceptance of §5 / P8.S5), assert the push
#     actually landed. There is no success log line — only failures are logged — so the
#     two checks below together are the assertion:
docker compose -f compose.prod.yml logs --since 30m api | grep 'publish:'
# expect: NO output (grep exits 1 — that is the healthy case). Any line is a failed
# background task: "[kb-api] publish: push <rel_path> FAILED: <err>" is the push;
# "embed <rel_path> FAILED" is only the semantic-search embed (search degrades to BM25,
# publishing is unaffected).

git -C /opt/knowledge rev-list --count origin/main..HEAD
# expect: 0 — every commit the box has made is published on origin/main.
# Non-zero = commits are stranded on the box. Fix the credential (2a), then the next
# write publishes all of them at once; or push them by hand through the container:
#   docker compose -f compose.prod.yml exec api git -C /repo push origin HEAD:main
```

> `origin/main` in that `rev-list` is the box clone's **remote-tracking ref**, which the
> container's own successful push updates. Do **not** `git fetch` from the host to
> "refresh" it — the SSH `origin` is the *container's* credential and the host user has
> no deploy key (§1b).

---

## 3. Edge — the three vhosts and the cutover to the apex

The platform moves from `knowledge.hi2vi.com` to the apex `hi2vi.com`, and Feedback
moves in from `vocky.hi2vi.com`. Three files in `deploy/` carry the edge side:

| File | Host | What it does |
|---|---|---|
| `hi2vi.conf` | `hi2vi.com` | **Serves the platform.** Every location, timeout and relay of the old `knowledge.conf`, plus `/feedback/mcp` → `knowledge-mcp:9000` (SSE-safe, like `/mcp`), the Feedback attachment relay `/api/app/feedback/<id>/attachments/<aid>` → `knowledge-web:3000`, and the reader's beacon `= /api/reader/position` → `knowledge-web:3000`. Replaces the edge's old `hi2vi.conf`, whose `hi2vi_contact` `limit_req_zone` leaves the tree with it. |
| `knowledge.conf` | `knowledge.hi2vi.com` | **Redirect-only.** Every path → `https://hi2vi.com<same path and query>`, 308, on `:443` and `:80` alike (one hop). |
| `vocky.conf` | `vocky.hi2vi.com` | **Redirect-only.** `/mcp` → `/feedback/mcp`; `/SKILL.md` → `/feedback/SKILL.md`; `/projects/<id>` → `/dashboard`; `/admin/*` → 404; `/` → `/feedback`; everything else → the same path on the apex. 308, query kept, `:80` the same map. One exception: the retired installer `/install.sh` answers `200 text/plain` with a tiny `sh` script that prints a retirement notice naming the skill on stderr and exits 1, never a redirect, since the documented `curl -fsSL … \| bash` would follow one into Markdown. |

308 keeps the method and the body, so a `POST` stays a `POST`. None of the three
declares `default_server`, an IPv6 `listen` or a `limit_req_zone` (the house rules in
each header); all three use the shared `hi2vi.{crt,key}` origin pair, so the edge's
cert contract does not change.

### 3a. Who lands them, and how

The edge's `conf.d/` is a **read-only host bind mount** on the box, and the tree's
canonical home is the **edge repo** (`leetusik/edge`, `edge/conf.d/`). The three files
land **through that repo, by the operator**, with its own loop; never by an `scp` from
here, never by editing the box copy:

```bash
# in the edge repo, on a clean tree:
cp <platform>/deploy/hi2vi.conf <platform>/deploy/knowledge.conf <platform>/deploy/vocky.conf edge/conf.d/
cd edge
./validate.sh            # local gate: dummy certs + compose config + nginx -t over the WHOLE tree
bash stage.sh            # rsync the tree to /home/opc/edge (no --delete), stage real certs, validate on the box
ssh oracle-cloud 'cd /home/opc/edge && ./deploy.sh'
# expect: "config OK — issuing graceful reload" -> "reload complete. New config is live."
```

`deploy.sh` **never** recreates `edge-nginx` — recreating drops the container's
runtime network attachment, the exact failure cascade the dedicated edge was built
to remove. Never run `docker compose up`/`restart` against the edge to apply a
config change. If `nginx -t` fails, **nothing is reloaded** and the edge keeps
serving its last good config.

Things to know before running the loop:

- **`stage.sh` ships the edge repo's working tree**, uncommitted files included,
  and overwrites the box's copy of every file in it (rsync, no `--delete`). Run it
  only from a tree whose every `conf.d/` file you mean to put live, and settle any
  unrelated work in progress there first (its cert steps also check every cert pair
  the tree names on the box).
- **The edge repo's old `knowledge.conf` is older than this repo's** (5m body cap; no
  versioned-raw, image or Listen relays). Running `stage.sh` with it still in place
  would downgrade the live Library vhost. Replace all three files in one change.

### 3b. Compare first

Before landing, read the box's **live** `knowledge.conf` and check that every
`location`, timeout and body-size rule in it is in `deploy/hi2vi.conf` (the live file
may differ from both repo copies):

```bash
ssh oracle-cloud 'cat /home/opc/edge/conf.d/knowledge.conf' > /tmp/live-knowledge.conf
diff <(sed -e 's/#.*//' -e '/^[[:space:]]*$/d' /tmp/live-knowledge.conf) \
     <(sed -e 's/#.*//' -e '/^[[:space:]]*$/d' deploy/hi2vi.conf) | grep '^<'
# expect: only the two `server_name knowledge.hi2vi.com;` lines. Anything else is a
# route the box has that the apex would lose: carry it into hi2vi.conf first.
```

### 3c. Order

1. **The app first.** The platform is deployed with its apex configuration and
   `knowledge-api`, `knowledge-web` and `knowledge-mcp` are healthy on
   `changple_shared_network`. This one Production Deploy runs before the apex vhost
   exists, so dispatch it with `smoke_host=knowledge.hi2vi.com` (§6): the old vhost
   still proxies that host to the same containers, and the MCP server still accepts it
   (`MCP_ALLOWED_HOSTS` keeps it until the redirect host is live).
2. **Then `hi2vi.conf` alone** (one loop run). Check the apex (§5) before going on:
   the old hi2vi-web site stops being served here.
3. **Then `knowledge.conf` and `vocky.conf`** (a second loop run). The redirect hosts
   go live **only once the apex serves**: before that they would send every Library
   and Feedback user to a site that is not there.
4. Retire the old containers (vocky's, hi2vi-web) only after the redirects are
   confirmed, so a rollback still has something to serve.

> **The Production Deploy installs no vhost.** It builds, migrates and health-gates
> the containers and stops there; it never writes under `/home/opc/edge` and never
> runs the edge's `deploy.sh`. A dispatch from a `main` that holds these three files
> leaves the live edge exactly as it was: each vhost goes live only when the operator
> lands it through the edge repo (§3a), in the order above.

### 3d. Rollback

Restore the three previous files in the edge repo (revert the landing commit, or
`git checkout <previous-commit> -- edge/conf.d/hi2vi.conf edge/conf.d/knowledge.conf
edge/conf.d/vocky.conf`), then the same loop (`./validate.sh` → `bash stage.sh` →
`./deploy.sh`). The restored `hi2vi.conf` brings its `hi2vi_contact` zone back, which
is safe: none of the new files declares one. The old vhosts proxy to `vocky-api`,
`vocky-web` and `hi2vi-web`, so a rollback serves only while those containers still
run (step 4 above).

> **No cert step.** All three vhosts point at `/etc/nginx/certs/hi2vi.crt` + `.key` — the
> Cloudflare Origin CA cert whose SANs are `*.hi2vi.com, hi2vi.com`, which covers the
> apex and both redirect hosts. Re-check any time with:
> `ssh oracle-cloud "openssl x509 -in /home/opc/edge/certs/hi2vi.crt -noout -text | grep -A1 'Subject Alternative Name'"`

### Durability — no re-apply rule anymore

The edge's conf + certs are **declarative host state on read-only bind mounts**, and
the edge project has no `depends_on` and no `build`. **A co-tenant (changple5)
deploy cannot wipe the platform's vhosts**, and a container restart or box reboot
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

The apex `hi2vi.com` and the proxied `knowledge` and `vocky` records on the
`hi2vi.com` zone all resolve to the same Cloudflare proxy IPs, and all three stay:
the two subdomains now answer with redirects (§3). Nothing changes in DNS for the
cutover. Confirm any time:

```bash
dig +short hi2vi.com knowledge.hi2vi.com vocky.hi2vi.com   # expect: the same Cloudflare proxy IPs
```

---

## 5. Post-apply validation checklist (from anywhere)

```bash
# Health (open, no auth):
curl -s -o /dev/null -w '%{http_code}\n' https://hi2vi.com/healthz
# expect: 200

# Authed read/search (KB_REQUIRE_READ_AUTH=true → bearer required):
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $KB_API_TOKEN" \
  'https://hi2vi.com/api/search?q=test'
# expect: 200

# Un-authed read is REJECTED:
curl -s -o /dev/null -w '%{http_code}\n' 'https://hi2vi.com/api/search?q=test'
# expect: 401

# The redirect hosts (after §3c step 3): a 308 to the apex, method and query kept.
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://knowledge.hi2vi.com/api/search?q=test'
# expect: 308 https://hi2vi.com/api/search?q=test
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' -X POST https://vocky.hi2vi.com/mcp
# expect: 308 https://hi2vi.com/feedback/mcp
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://vocky.hi2vi.com/
# expect: 308 https://hi2vi.com/feedback
# The retired installer: read it, never pipe it to a shell here.
curl -s -D - https://vocky.hi2vi.com/install.sh
# expect: 200, content-type: text/plain, no location header, and a body that starts
# with #!/bin/sh, echoes the retirement notice naming
# https://hi2vi.com/feedback/SKILL.md to stderr, and ends with exit 1.
```

Retrieve the token when you need it, without ever pasting it into a transcript:

```bash
ssh oracle-cloud "sudo grep '^KB_API_TOKEN=' /opt/knowledge/.env"
```

**Do NOT run a write test here.** A `POST /api/documents` pushes to `main` and is
an **E2E acceptance** step (P8.S5 / P9.S5) — the first `project:"hi2vi"` write → 201
→ commit on `main` → **readable via the api/app by id** (publish-on-write; the doc is
no longer rendered on a mkdocs page — see the `KB_PUBLIC_BASE_URL` caveat in §2). Run
it there, not as a bring-up smoke step.

---

## 6. Automated redeploy — the `Production Deploy` GitHub Action (P9)

After the one-time bring-up (§0–§5), a **code/image/compose** change reaches production
through a **manually dispatched** GitHub Action — you no longer SSH in and run
`docker compose … up --build` by hand. A **vhost** change does not ride it: the vhosts
land through the edge repo, by the operator (§3a). (A **doc** does not need this
either: it goes live fresh-on-write the instant the api writes it.)

### Usage

- **Trigger:** GitHub → `leetusik/platform` → Actions → **Production Deploy** → **Run
  workflow** (on `main`). Or: `gh workflow run deploy-production.yml --ref main`.
- **Input `smoke_host`** — the host the external smoke runs against: `hi2vi.com`
  (the default) or `knowledge.hi2vi.com`, nothing else (the preflight and the smoke
  step both refuse any other value). Leave it at the default, except for the
  cutover's first deploy (§3c step 1), which runs before the apex vhost lands:
  `gh workflow run deploy-production.yml --ref main -f smoke_host=knowledge.hi2vi.com`.
- It is **`workflow_dispatch`-only** and **main-guarded** — the agent's constant
  publish-on-write pushes to `main` never trigger it — and serialized by
  `concurrency: knowledge-deploy`.
- **What it does** (three-script chain, all on the box):
  1. **`deploy/github-actions-production-deploy.sh`** (runner, transport only) SSHes into
     `opc@140.245.64.173` with the `ORACLE_SSH_*` secrets (§6.1) and `scp`s + invokes the
     on-box gate with `TARGET_SHA` / `REPO_PATH=/opt/knowledge`.
  2. **`deploy/oracle-production-deploy-remote.sh`** (on-box gate) asserts inputs, hands to
     `deploy/deploy.sh`, then collects artifacts and reports. It runs **no authoritative
     git** (that is in-container — see below) and **never touches the edge** (no vhost
     install, no edge `deploy.sh`).
  3. **`deploy/deploy.sh`** reconciles the clone **on `main`** (fetch + fail-closed
     ancestor gate + ff/rebase; **never** detach/reset/force) inside a **one-shot root
     container reusing the `api` service** (so git authenticates over SSH against the
     root-owned `.git`), then builds the images, runs `alembic upgrade head`,
     force-recreates the api and brings up web + mcp, **health-gating all three**. On
     failure it captures `compose ps`/`logs` and exits non-zero — **fix-forward, no
     rollback** (the app runs from the bind mount, so an image flip can't revert
     `server/` code).
  4. **External smoke** on `https://<smoke_host>`: `/healthz` and `/` must answer 200,
     and `/mcp` must answer as a routed MCP server (a bare GET gets the server's own 406
     with a JSON-RPC body; a 421 means the host is missing from `MCP_ALLOWED_HOSTS`, a
     502/504 that the edge does not reach `knowledge-mcp`). On `hi2vi.com` it checks
     `/feedback/mcp` the same way (the old host's vhost does not route it). Then it
     uploads `production-deploy-artifacts` (14 d).
- **Watch it:** `gh run watch` or the Actions run page. On failure, download the
  artifact (`compose ps` + per-service logs) to diagnose, fix on `main`, and re-dispatch.

### 6.1 The runner secret set (one-time, on `leetusik/platform`)

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

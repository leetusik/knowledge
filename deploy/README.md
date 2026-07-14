# Production deploy runbook — knowledge.hi2vi.com

Operator-facing runbook for hosting the knowledge document API publicly at
`https://knowledge.hi2vi.com`, as a co-tenant on the shared OCI box (the same
box + edge that serves hi2vi.com). **All steps run on the box / edge as the
operator** — the agent has no SSH access; it produces these artifacts, you
apply them.

Artifacts this runbook applies:

- **`compose.prod.yml`** (repo root) — the api-only box compose project.
- **`deploy/knowledge.hi2vi.com.conf`** — the nginx vhost for the shared edge.

Secret *values* live only on the box (never in this repo). Generating and
registering those secrets + DNS — the token, the SSH deploy key (and its GitHub
registration), the Cloudflare record + cert-coverage check, and the optional
Gemini key — is the **[`SECRETS.md`](SECRETS.md)** provisioning runbook. Do that
first; this runbook then *places and brings up* what it produced, referencing
secrets by name and placement path only.

---

## 0. Prerequisites (confirm before you start)

- The box already runs the shared edge `changple5-nginx-1` + the external Docker
  network **`changple_shared_network`** (both exist for hi2vi.com today).
- You have the secrets provisioned per **[`SECRETS.md`](SECRETS.md)**: a strong
  `KB_API_TOKEN`, an SSH **deploy key** registered on `leetusik/knowledge` (allow
  write), and (optional) a `GOOGLE_API_KEY`. Cloudflare DNS + cert coverage: see
  steps 4–5 here and `SECRETS.md` §3.

---

## 1. Box prep — clone, secrets, .env

```bash
# 1a. Clone over SSH (NOT https) into /opt/knowledge — the origin MUST be the
#     SSH form so the container can push with the deploy key.
sudo git clone git@github.com:leetusik/knowledge.git /opt/knowledge
cd /opt/knowledge
git remote -v        # confirm: origin  git@github.com:leetusik/knowledge.git
# If you cloned as root but run compose as another user, mark the tree safe:
#   git config --global --add safe.directory /opt/knowledge

# 1b. Place the deploy key + pinned known_hosts (mounted read-only into the api).
sudo mkdir -p /opt/knowledge-secrets
sudo cp /path/to/knowledge_deploy_key /opt/knowledge-secrets/knowledge_deploy_key
sudo chmod 600 /opt/knowledge-secrets/knowledge_deploy_key   # ssh refuses group/world-readable keys

# Pin github.com's host key (avoids blind trust-on-first-use on the first push).
ssh-keyscan -t ed25519,rsa github.com | sudo tee /opt/knowledge-secrets/known_hosts
# VERIFY the scanned key against GitHub's published SSH key fingerprints
# (https://docs.github.com/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)
# before trusting it. If you would rather not pin, edit compose.prod.yml's
# GIT_SSH_COMMAND to StrictHostKeyChecking=accept-new and drop UserKnownHostsFile.

# 1c. Create the gitignored .env (box only — NEVER committed; .env is in .gitignore).
#     Values (names + generation pointers only here — provision per P8.S4):
sudo tee /opt/knowledge/.env >/dev/null <<'EOF'
# Bearer token for writes + (with KB_REQUIRE_READ_AUTH) reads. Generate a strong
# random token (e.g. `openssl rand -hex 32`) — see SECRETS.md §1.
KB_API_TOKEN=
# Optional Gemini key for hybrid semantic search. Empty/absent = BM25-only.
GOOGLE_API_KEY=
EOF
sudo chmod 600 /opt/knowledge/.env
```

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

docker compose -f compose.prod.yml ps        # expect: knowledge-api  Up (healthy)
docker compose -f compose.prod.yml logs -f api   # watch the startup reindex line
```

Verify the api is reachable **on the shared network** (before wiring the edge) —
run a throwaway curl container joined to the same network:

```bash
docker run --rm --network changple_shared_network curlimages/curl:latest \
  -s -o /dev/null -w '%{http_code}\n' http://knowledge-api:8000/healthz
# expect: 200
```

If `KB_GIT_PUSH=true` but the deploy key / origin are misconfigured, **writes
still succeed** (201) — push is best-effort; the 201 body carries
`pushed:false` + `push_error`. Fix the key/remote, then the next write (or a
manual `git push`) publishes the accumulated commits. Do **not** treat a push
failure as a bring-up blocker; treat it as "not yet publishing".

---

## 3. Edge apply — vhost conf + cert + network membership

The vhost + cert + network attachment are **undeclared runtime state** on
`changple5-nginx-1` (see
`docs/hi2vi_web/2026-07-02-shared-nginx-explained.md`). Apply all three:

```bash
# 3a. Confirm the cert paths BEFORE copying the conf. Open the live hi2vi vhost
#     and copy its exact ssl_certificate / ssl_certificate_key paths into
#     deploy/knowledge.hi2vi.com.conf (the assumption is a *.hi2vi.com WILDCARD
#     origin cert already covers knowledge.hi2vi.com — see the conf's TLS block).
docker exec changple5-nginx-1 cat /etc/nginx/conf.d/hi2vi.com.conf | grep ssl_certificate

# 3b. Copy the (cert-confirmed) conf into the running nginx container.
docker cp deploy/knowledge.hi2vi.com.conf changple5-nginx-1:/etc/nginx/conf.d/knowledge.hi2vi.com.conf

# 3c. Ensure the edge is on the shared network (already true for hi2vi; harmless
#     if repeated).
docker network connect changple_shared_network changple5-nginx-1 2>/dev/null || true

# 3d. Config-test then GRACEFUL reload (never recreate the shared nginx).
docker exec changple5-nginx-1 nginx -t
docker exec changple5-nginx-1 nginx -s reload
```

### Cross-repo handoff — make the edge config declarative-ish (REQUIRED follow-up)

`deploy/edge/apply-to-edge.sh` lives in the **hi2vi / changple5 repos, not
here**. **Extend it to also restore knowledge's conf + cert** (steps 3b–3d
above) alongside hi2vi's. Until that is done:

> **Operational rule (same as hi2vi.com): after any changple5 deploy, assume
> `knowledge.hi2vi.com` is DOWN** until the (extended) `apply-to-edge.sh` re-runs
> (the `depends_on` recreation cascade wipes the conf + cert + network
> attachment on every changple5 deploy). Probe `https://knowledge.hi2vi.com/healthz`
> after every changple5 deploy; if it errors, re-apply.

Long-term this folds cleanly into the Option-B dedicated edge (deferred **D2**)
as a fourth conf drop-in.

---

## 4. Cloudflare DNS

Add a **proxied** `knowledge` record for `hi2vi.com` (orange cloud on) pointing
at the box, and confirm the `*.hi2vi.com` origin cert covers it. This is an
operator action — the record + cert-coverage provisioning is
**[`SECRETS.md`](SECRETS.md) §3** (do it there; step 3a above copies the
confirmed cert paths into the vhost).

---

## 5. Post-apply validation checklist (edge-side, from anywhere)

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

**Do NOT run a write test here.** A `POST /api/documents` pushes to `main` and
is the phase's **E2E acceptance (P8.S5)** — the first `project:"hi2vi"` write →
201 `pushed:true` → commit on `main` → Pages deploy → doc live. Run it there,
not as a bring-up smoke step.

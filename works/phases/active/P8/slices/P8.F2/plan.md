# Plan — P8.F2: reality-fix — `openssh-client` in the image + deploy artifacts retargeted to the live dedicated edge

Orchestrator plan (auto mode). Executor: `slice-executor-high` (touches the shipped Dockerfile **and** a config artifact destined for a shared production edge that fronts three live sites).

## Why this slice exists

The orchestrator was granted SSH access to the production box (`ssh oracle-cloud`) to perform the operator's bring-up, and reconnaissance found **two artifacts-vs-reality defects** that would have made the go-live fail. Both are repo-side and must land (and be pushed) **before** the box clones/builds — the box builds its image from `main`.

### Defect 1 — the image cannot push over SSH (publish-on-write would silently never publish)

`Dockerfile` installs git with `--no-install-recommends`, and `openssh-client` is only a *Recommends* of `git`. **Verified empirically on the box:**

```
$ docker run --rm python:3.12-slim sh -c "which ssh || echo IMAGE_HAS_NO_SSH"
IMAGE_HAS_NO_SSH
```

So `git push` to an SSH remote (`git@github.com:...`, which is what `GIT_SSH_COMMAND` + the deploy key in `compose.prod.yml` assume) would fail inside the container with a "cannot run ssh / could not read from remote repository" error. Because P8.S1 made push **best-effort**, this failure would NOT be loud: every write would return `201 pushed:false` + `push_error` and nothing would ever reach Pages. This is the phase's core capability, silently dead.

### Defect 2 — the deploy artifacts target an edge that no longer exists

`deploy/knowledge.hi2vi.com.conf`, `deploy/README.md` and `deploy/SECRETS.md` were authored against `docs/hi2vi_web/2026-07-02-shared-nginx-explained.md`, which describes the **old** shared edge (`changple5-nginx-1` owning 80/443, conf `docker cp`'d into a container's writable layer, wiped by every changple5 deploy). **That is superseded.** The box now runs the **dedicated "Option B" edge** the explainer proposed (deferred job D2's end state) — verified live:

- Compose project **`edge`** at **`/home/opc/edge`**, container **`edge-nginx`**, image `nginx:1.27-alpine`, owns `0.0.0.0:80` + `:443`, attached to **`changple_shared_network`** only. **`changple5-nginx-1` does not exist.**
- **Read-only host bind mounts** — `/home/opc/edge/conf.d` → `/etc/nginx/conf.d`, `/home/opc/edge/certs` → `/etc/nginx/certs`. Config is therefore **declarative host state**: a conf change is a file drop on the host + a reload. **A changple5 deploy can no longer wipe it.**
- Existing vhosts: `00-default.conf` (owns the `default_server` catch-all), `changple5.conf`, `changple-web.conf`, `hi2vi.conf`.
- The edge ships its own tooling: **`./deploy.sh`** = hard `nginx -t` gate inside the running container → graceful `nginx -s reload`, **never** recreates the container (recreation is the failure cascade the project removed). **`./validate.sh`** = local gate (dummy certs + `compose config` + throwaway-container `nginx -t` over the whole `conf.d/` tree). There is **no `apply-to-edge.sh`** and none is needed.
- **Certs:** `/home/opc/edge/certs/hi2vi.crt` is a Cloudflare Origin CA cert whose SANs are **`DNS:*.hi2vi.com, DNS:hi2vi.com`** (valid to 2041) — the **wildcard already covers `knowledge.hi2vi.com`**. No new cert, no per-host variant.
- **DNS is live:** `knowledge.hi2vi.com` resolves to the same Cloudflare proxy IPs as `hi2vi.com` (operator completed it).

`hi2vi.conf` is the proven house pattern to model on — read it in full on the box if you want (`ssh oracle-cloud 'cat /home/opc/edge/conf.d/hi2vi.conf'`; the executor has Bash). Its load-bearing bits: server-level `:80 → return 301 https://$host$request_uri`; `:443 ssl` + `http2 on`; `ssl_certificate /etc/nginx/certs/hi2vi.crt` + `.key`; **Docker-DNS re-resolution** (`resolver 127.0.0.11 valid=30s ipv6=off; resolver_timeout 5s; set $hi2vi_upstream hi2vi-web;` then `proxy_pass http://$hi2vi_upstream:3000;`) so upstream container restarts self-heal; the Cloudflare **real-IP restore** block (`set_real_ip_from` × the published CF ranges + `real_ip_header CF-Connecting-IP`); `add_header Strict-Transport-Security "max-age=300" always;`; and a **uniquely named** `limit_req_zone` (`hi2vi_contact`) — *the tree's only one; a duplicate zone name fails `nginx -t` and would block reloads for every site.*

## Deliverables

### 1. `Dockerfile` — add `openssh-client`

Add it to the existing `apt-get install -y --no-install-recommends git tzdata` line, and extend the comment above it in the file's existing voice: git alone cannot push over an SSH remote (`--no-install-recommends` drops git's Recommends), so `openssh-client` is load-bearing for `KB_GIT_PUSH=true` (P8.S1) — the container's push credential is an SSH deploy key. Keep the "Both are load-bearing" note accurate (now three).

### 2. Plugin parity (the Dockerfile is a shipped, `identical`-class file)

- Copy the fixed `Dockerfile` byte-identically to `plugin/templates/kb/Dockerfile`.
- Bump the plugin version **0.2.0 → 0.2.1** (payload change ⇒ bump, per `plugin/README.md`'s release checklist) in **both** places F1 found: `plugin/.claude-plugin/plugin.json` and the scaffold-marker `plugin_version` in `plugin/skills/setup/SKILL.md`.
- `python3 scripts/plugin_parity.py` must exit 0.

### 3. Replace `deploy/knowledge.hi2vi.com.conf` → `deploy/knowledge.conf`

`git mv` it (the edge's own files are short-named: `hi2vi.conf`, `changple5.conf`), and rewrite the body for the real edge. Header comment: what it is, that it lands at **`/home/opc/edge/conf.d/knowledge.conf`**, and that it is applied by a host file drop + `cd /home/opc/edge && ./deploy.sh`. Content, modeled on `hi2vi.conf`:

- `:80` server, `server_name knowledge.hi2vi.com`, **never `default_server`** (`00-default.conf` owns the catch-all) → `return 301 https://$host$request_uri;`
- `:443 ssl` + `http2 on`, `server_name knowledge.hi2vi.com`
- **Cert: `/etc/nginx/certs/hi2vi.crt` + `/etc/nginx/certs/hi2vi.key`** — the wildcard SAN covers this host (verified). Drop the old per-host-cert variant block entirely (dead branch).
- **Docker-DNS re-resolution**: `resolver 127.0.0.11 valid=30s ipv6=off; resolver_timeout 5s; set $knowledge_upstream knowledge-api;` → `proxy_pass http://$knowledge_upstream:8000;` (the api container is `container_name: knowledge-api`, port 8000, no published host port).
- Cloudflare **real-IP restore** block, copied from `hi2vi.conf` (same published ranges) so access logs carry real client IPs.
- `add_header Strict-Transport-Security "max-age=300" always;` (house style).
- `client_max_body_size 5m` — research markdown docs; hi2vi's 64k would 413 a long doc.
- `proxy_read_timeout 120s` — a write does git fetch+rebase+push and (when a Gemini key is present) a best-effort embed. Comment that Cloudflare itself times out at ~100s (524), so this is the origin-side ceiling, not a promise.
- Standard proxy headers + `proxy_http_version 1.1;` + `proxy_set_header Connection "";`, single `location /`.
- **Declare NO `limit_req_zone`** — and say why in a comment: zone names are global across the edge's `conf.d/` tree, a duplicate would fail `nginx -t` for *every* site, and this API needs none (bearer-gated on every `/api/*` call, Cloudflare-fronted, single known consumer).

### 4. Rewrite the edge sections of `deploy/README.md`

- Replace every `changple5-nginx-1` / `docker cp` / "conf lives in the container's writable layer" instruction with the real procedure: **copy the conf to `/home/opc/edge/conf.d/knowledge.conf` on the host**, then `cd /home/opc/edge && ./deploy.sh` (mention `./validate.sh` as the optional pre-gate). Never `docker compose up`/`restart`/recreate the edge.
- **Delete the "after any changple5 deploy, assume knowledge.hi2vi.com is DOWN" operational rule and the cross-repo `apply-to-edge.sh` handoff** — both were artifacts of the old shared edge. State the new truth plainly: the dedicated edge's conf + certs are declarative host bind mounts, so co-tenant deploys cannot wipe them; this is the D2 / Option-B end state, now live.
- Cert step: no provisioning — the wildcard `hi2vi.crt` covers `knowledge.hi2vi.com`; the vhost already points at it (record the verification command for future re-checks).
- Keep the rest of the shape (clone, `.env`, `COMPOSE_BAKE=false … up -d --build`, shared-network healthz probe, the three post-apply curls, "no write test here — that's P8.S5"). **Add:** the clone dir must be readable by the `opc` user (compose reads `compose.prod.yml` + `.env` client-side as `opc`), so `/opt/knowledge` is `chown opc:opc`; `.env` is `chmod 600` owned by `opc`.

### 5. Fix `deploy/SECRETS.md`

- §2 deploy key: the private half is **generated on the box and never leaves it** (`ssh-keygen` on the box → `/opt/knowledge-secrets/knowledge_deploy_key`, `chmod 600`); the **public** half is registered with `gh repo deploy-key add <pub> -R leetusik/knowledge --title knowledge-api-box --allow-write` (or the web UI). Drop the "scp the private key from your Mac / delete the local copy" dance.
- §3 cert-coverage check: replace the `docker exec changple5-nginx-1 …` command with the real one (`openssl x509 -in /home/opc/edge/certs/hi2vi.crt -noout -text | grep -A1 'Subject Alternative Name'`) and record the **confirmed result** (`*.hi2vi.com, hi2vi.com` → covered, nothing to provision). Keep the per-host fallback only as a one-line "if this ever changes" note.
- §1 token: note it is generated **on the box** straight into `/opt/knowledge/.env` (never pasted through a chat/terminal transcript), and retrieved when needed with `ssh oracle-cloud "sudo grep ^KB_API_TOKEN= /opt/knowledge/.env"`.
- Keep the DNS step but mark it **done** (record: `knowledge` A-record, proxied, resolves to the CF IPs).

## Validation (record commands + outcomes in `result.md`)

- `python3 scripts/plugin_parity.py` → exit 0.
- `.venv/bin/python -m pytest -q` → 65 passed (nothing behavioral changes).
- **The new vhost must pass a real `nginx -t` against the live tree.** Do it non-destructively, without touching the box's config: copy the tree into a temp dir *on the box* and test in a throwaway container, e.g.
  `ssh oracle-cloud 'set -e; T=$(mktemp -d); cp -r /home/opc/edge/conf.d/* $T/; cat > $T/knowledge.conf' < deploy/knowledge.conf` … then
  `docker run --rm -v $T:/etc/nginx/conf.d:ro -v /home/opc/edge/certs:/etc/nginx/certs:ro nginx:1.27-alpine nginx -t; rm -rf $T`
  (adapt as needed — the requirement is: **the full conf.d tree + the new conf, tested together, in a throwaway container, with the real certs mounted read-only. Never `docker cp` into `edge-nginx`, never reload it, never touch `/home/opc/edge/`.**) Expect `syntax is ok / test is successful`. If it fails, fix the conf and re-test — do not hand back a conf that fails `nginx -t`.
- `python3 scripts/workflow.py validate`.

## Constraints

- **You may read the box over SSH (`ssh oracle-cloud`) and run throwaway containers, but you must not change anything on it**: no writes under `/home/opc/edge/`, no `docker cp`/`exec` into `edge-nginx`, no reload, no `/opt/knowledge*` creation, no compose up. The orchestrator performs the bring-up itself after this slice lands.
- No secrets anywhere in the repo (names/paths only).
- Do not touch `server/*`, `tests/*`, `compose.yml`, `compose.prod.yml` (it is already correct: `container_name: knowledge-api`, `/opt/knowledge-secrets:/run/secrets:ro`, `changple_shared_network` external), or anything under `docs/`.
- Append to `phase.md`: a `### P8.F2` **Findings** section (the two defects + the real edge topology + the wildcard-cert and DNS confirmations — later slices and the review depend on this), and **Doc impact** lines: `operations.md` (the real dedicated-edge topology and its file-drop + `deploy.sh` apply path; `openssh-client` is load-bearing for publish-on-write; the old "wiped by every changple5 deploy" fragility rule no longer applies to knowledge), `security.md` (deploy key generated on-box, never transits; public half registered as a write deploy key).
- Also note in `phase.md` Findings, for the operator/review: the knowledge base's own explainer `docs/hi2vi_web/2026-07-02-shared-nginx-explained.md` now describes a **superseded** topology (it predates the Option-B cutover; the box has a `.cutover-anchor` dated 2026-07-02). Do **not** edit that content doc in this slice — flag it only.
- Executor contract: never commit, never transition slice/phase status, never run `doc-new-version`. Write `result.md`; return the structured verdict.

# Secrets & DNS provisioning runbook — knowledge.hi2vi.com

Operator runbook for the secrets + DNS that `https://knowledge.hi2vi.com` needs.
This is the "**produce the credentials and register them**" half;
[`README.md`](README.md) is the "**place them and bring the box up**" half.

> **No secret values ever live in this repo**, and — the rule this runbook is built
> around — **no secret value ever transits a laptop, a chat, or a terminal
> transcript.** Both the bearer token and the git push key are **generated on the
> box**, straight into their final location. Only *public* halves and *names/paths*
> ever leave it. Placement paths below are the exact ones `compose.prod.yml` mounts
> — don't change them without editing that file.

Work top to bottom; tick the **handoff checklist** (§5) when done.

---

## 1. `KB_API_TOKEN` — the bearer token (writes + hosted reads)

The box runs `KB_REQUIRE_READ_AUTH=true`, so this one token guards **every**
`/api/*` call (writes and reads/search alike); `GET /healthz` stays open.

**It is generated on the box, directly into `/opt/knowledge/.env`** — see
[`README.md`](README.md) §1c, which writes the file with an *unquoted* heredoc so
`$(openssl rand -hex 32)` expands in place. The value is never echoed, never
pasted, never copied anywhere. Don't generate it here and carry it over.

Retrieve it only when something actually needs it:

```bash
ssh oracle-cloud "sudo grep '^KB_API_TOKEN=' /opt/knowledge/.env"
```

- **Cross-repo:** that exact value is what the hi2vi content agent uses as its
  `KNOWLEDGE_API_TOKEN` (per the frozen consumer contract in the published
  `api.md`). It is the single shared secret between the two repos — hand it over a
  secure channel, and rotate both sides together (edit the box `.env`, then
  `docker compose -f compose.prod.yml up -d` to restart the api).

---

## 2. SSH deploy key — the publish-on-write push credential

The box's api container commits **and pushes** each write to `origin/main`
(`KB_GIT_PUSH=true`), so it needs a write-capable git credential. We use a
**repo-scoped SSH deploy key**: smaller blast radius than a personal PAT, and no
expiry to babysit.

**2a. Generate the keypair ON THE BOX**, in its final location. The private half is
born there and never leaves:

```bash
# On the box (ssh oracle-cloud). No passphrase — the container runs unattended.
sudo mkdir -p /opt/knowledge-secrets
sudo ssh-keygen -t ed25519 -N '' -C 'knowledge-api@oci' \
  -f /opt/knowledge-secrets/knowledge_deploy_key
sudo chmod 600 /opt/knowledge-secrets/knowledge_deploy_key
#  -> /opt/knowledge-secrets/knowledge_deploy_key      PRIVATE — stays on the box, forever
#  -> /opt/knowledge-secrets/knowledge_deploy_key.pub  PUBLIC  — safe to copy anywhere
```

That path is exactly what `compose.prod.yml` bind-mounts read-only into the
container as `/run/secrets/knowledge_deploy_key`. There is no "copy the key to the
box" step and no local copy to delete — there was never a local copy.

**2b. Register the PUBLIC half on GitHub, with write access:**

```bash
# From your Mac, with `gh` authenticated. Only the .pub half moves.
ssh oracle-cloud 'sudo cat /opt/knowledge-secrets/knowledge_deploy_key.pub' > /tmp/knowledge_deploy_key.pub
gh repo deploy-key add /tmp/knowledge_deploy_key.pub \
  -R leetusik/knowledge --title 'knowledge-api-box' --allow-write
rm /tmp/knowledge_deploy_key.pub
gh repo deploy-key list -R leetusik/knowledge     # confirm it is listed
```

Or the web UI: `https://github.com/leetusik/knowledge` → **Settings** → **Deploy
keys** → **Add deploy key**, paste the `.pub` contents, **check "Allow write
access"** (the push fails without it).

**2c. Box clone origin must be SSH.** The container pushes to `origin`, so the box
clone's remote must be `git@github.com:leetusik/knowledge.git`, not the `https://`
form. `README.md` §1a clones over HTTPS (the repo is public — reading needs no
credential) and then `git remote set-url origin git@github.com:…`, so the *push*
path is the deploy key.

Host-key pinning (`ssh-keyscan` → `/opt/knowledge-secrets/known_hosts`) is
`README.md` §1b — do it there.

---

## 3. Cloudflare DNS + origin TLS — **both already done, nothing to provision**

**3a. DNS — done.** The proxied `knowledge` record exists on the `hi2vi.com` zone;
`knowledge.hi2vi.com` resolves to the same Cloudflare proxy IPs as `hi2vi.com`.
Confirm any time:

```bash
dig +short knowledge.hi2vi.com     # Cloudflare proxy IPs, same as hi2vi.com
```

**3b. Origin cert — already covered by the wildcard.** The edge's Cloudflare Origin
CA cert at `/home/opc/edge/certs/hi2vi.crt` carries SANs
**`DNS:*.hi2vi.com, DNS:hi2vi.com`** (valid to 2041), so it **already covers
`knowledge.hi2vi.com`**. `deploy/knowledge.conf` points straight at it. **No cert to
issue, no per-host variant, no edge cert step.** Verified with:

```bash
ssh oracle-cloud "openssl x509 -in /home/opc/edge/certs/hi2vi.crt -noout -text \
  | grep -A1 'Subject Alternative Name'"
# confirmed: DNS:*.hi2vi.com, DNS:hi2vi.com   -> knowledge.hi2vi.com is covered
```

> If that cert is ever replaced by a per-host (non-wildcard) one, this assumption
> breaks: issue a `knowledge.hi2vi.com` Origin CA cert, drop it at
> `/home/opc/edge/certs/knowledge.crt` + `.key`, and repoint the two
> `ssl_certificate*` lines in `deploy/knowledge.conf`. (Cloudflare's public-facing
> TLS is handled by the proxied record either way; this is only the **origin** cert
> nginx serves to Cloudflare.)

---

## 4. Optional `GOOGLE_API_KEY` — Gemini for hybrid search

Recommended at launch. hi2vi's read/search use case (topic dedup, research
grounding) is exactly what hybrid semantic search improves, and it is **one env var
with graceful degradation**: absent or quota-limited → search silently falls back to
BM25-only (`mode:"bm25"`), **zero code change** either way.

- Obtain a key from Google AI Studio (`https://aistudio.google.com/apikey`).
- Placement: `/opt/knowledge/.env` as `GOOGLE_API_KEY=<value>` on the box
  (`README.md` §1c leaves the line empty for you to fill in-place on the box, e.g.
  with `sudo vi`). Leaving it empty is a supported launch choice — add the key later
  and restart the api with no other change.

---

## 5. Handoff checklist — all boxes ticked = ready for bring-up

- [ ] **SSH deploy key** generated **on the box** at
      `/opt/knowledge-secrets/knowledge_deploy_key` (ed25519, no passphrase, chmod
      600); **public** half registered on `leetusik/knowledge` **with write access**.
- [ ] **`KB_API_TOKEN`** — will be generated in place at `README.md` §1c (nothing to
      do in advance); afterwards, hand the value to the hi2vi side as
      `KNOWLEDGE_API_TOKEN`.
- [ ] **Box clone origin** set to the SSH form `git@github.com:leetusik/knowledge.git`
      (`README.md` §1a).
- [ ] **Cloudflare `knowledge` record** — ✅ already live, proxied.
- [ ] **Origin cert coverage** — ✅ already covered by the `*.hi2vi.com` wildcard
      (`hi2vi.crt`); nothing to issue.
- [ ] **`GOOGLE_API_KEY`** obtained (recommended) — or a deliberate BM25-only launch.

Next: `README.md` §1 (clone, place `known_hosts`, write `.env`) → §2 (bring-up, incl.
the `ssh`-in-image assertion) → §3 (drop the vhost + `./deploy.sh`) → §5 (validation).

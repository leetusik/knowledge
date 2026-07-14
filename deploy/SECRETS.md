# Secrets & DNS provisioning runbook — knowledge.hi2vi.com

Operator runbook for **generating and registering** the secrets + DNS that
`https://knowledge.hi2vi.com` needs, *before* the box bring-up in
[`README.md`](README.md). This is the "produce the credentials and register them
with GitHub / Cloudflare / Google" half; `README.md` §1–2 then *places* what you
produced on the box and starts the api.

> **No secret values ever live in this repo.** Everything below produces values
> that go **only** into the box's gitignored `.env` (`/opt/knowledge/.env`) or
> the box's read-only secrets mount (`/opt/knowledge-secrets/`), or into an
> external provider (GitHub deploy keys, Cloudflare DNS). Names and placement
> paths only are ever committed. The placement paths below are the exact ones
> `compose.prod.yml` mounts — do not change them without editing that file.

Work top to bottom; tick the **handoff checklist** (§5) when done, then proceed
to `README.md` §1.

---

## 1. `KB_API_TOKEN` — the bearer token (writes + hosted reads)

The box runs `KB_REQUIRE_READ_AUTH=true`, so this one token guards **every**
`/api/*` call (both writes and reads/search); `GET /healthz` stays open.

```bash
# Generate a strong random token (32 bytes hex = 64 chars). Run anywhere.
openssl rand -hex 32
```

- Placement: the value goes into `/opt/knowledge/.env` as `KB_API_TOKEN=<value>`
  on the box — see `README.md` §1c. Never commit it.
- **Cross-repo:** this *exact same value* is what the hi2vi content agent uses as
  its `KNOWLEDGE_API_TOKEN` (per the frozen consumer contract in the published
  `api.md`). Hand it to the hi2vi side over a secure channel — it is the single
  shared secret between the two repos. Rotating it means updating both the box
  `.env` and hi2vi's config together.

---

## 2. SSH deploy key — the publish-on-write push credential

The box's api container commits **and pushes** each write to `origin/main`
(`KB_GIT_PUSH=true`), so it needs a write-capable git credential. Use a
**repo-scoped SSH deploy key** (smaller blast radius than a personal PAT, no
expiry to babysit).

```bash
# Generate an ed25519 keypair with NO passphrase (the container runs
# unattended) and a recognizable comment. Write it somewhere temporary first;
# you move the private half onto the box in README.md §1b.
ssh-keygen -t ed25519 -N '' -C 'knowledge-api@oci' -f ./knowledge_deploy_key
#   -> ./knowledge_deploy_key       (PRIVATE half — goes on the box)
#   -> ./knowledge_deploy_key.pub   (PUBLIC half — goes on GitHub)
```

**Register the public half on GitHub (allow write):**

1. Open `https://github.com/leetusik/knowledge` → **Settings** → **Deploy keys**
   → **Add deploy key**.
2. Title: `knowledge-api@oci` (or similar). Key: paste the contents of
   `knowledge_deploy_key.pub`.
3. **Check "Allow write access"** — the push fails without it.

**Place the private half on the box:** copy `knowledge_deploy_key` to
`/opt/knowledge-secrets/knowledge_deploy_key`, `chmod 600` — this is the exact
path/mode `compose.prod.yml` mounts read-only into the container as
`/run/secrets/knowledge_deploy_key`. The known-hosts pinning (`ssh-keyscan`
github.com → `/opt/knowledge-secrets/known_hosts`) and the placement commands are
in `README.md` §1b — do them there, don't duplicate here. After placing the key,
**delete the local `knowledge_deploy_key*` pair** so the private half survives
only on the box.

**Box clone origin must be SSH.** The push targets `origin`, so the box clone's
remote must be `git@github.com:leetusik/knowledge.git` (not the `https://…` form)
— `README.md` §1a clones over SSH and verifies this.

---

## 3. Cloudflare DNS record + cert-coverage check

`knowledge.hi2vi.com` is a new subdomain on the existing `hi2vi.com` Cloudflare
zone, riding the shared edge exactly like `hi2vi.com`.

**3a. Add the proxied DNS record.** In the Cloudflare dashboard for the
`hi2vi.com` zone → **DNS** → **Add record**, matching however `hi2vi.com`'s own
apex/root record points at the OCI box:

- Type `A` (or `CNAME`) named **`knowledge`**, value = the box's public IP (or the
  same target `hi2vi.com` uses).
- **Proxy status: Proxied** (orange cloud on) — same as `hi2vi.com`, so Cloudflare
  terminates TLS at the edge and talks HTTPS to the origin.

**3b. Cert-coverage check (decides which TLS branch the vhost uses).** The vhost
`deploy/knowledge.hi2vi.com.conf` **assumes** `hi2vi.com` serves a single
`*.hi2vi.com` **wildcard** Cloudflare Origin CA cert — if so, it already covers
`knowledge.hi2vi.com` and you reference the same cert files. Confirm which case
you're in:

```bash
# Read the Subject Alternative Names of the cert the origin currently serves for
# hi2vi.com (run from the box, or anywhere that can reach the origin directly):
docker exec changple5-nginx-1 sh -c \
  'openssl x509 -in /etc/nginx/certs/hi2vi.com.pem -noout -text' \
  | grep -A1 'Subject Alternative Name'
# WILDCARD case: SANs include `*.hi2vi.com`  -> knowledge.hi2vi.com is covered.
# PER-HOST case:  only `hi2vi.com` (+ maybe www) -> knowledge is NOT covered.
```

- **Wildcard (`*.hi2vi.com`) — the assumed path:** nothing more to provision.
  `README.md` §3a copies the confirmed `ssl_certificate` / `ssl_certificate_key`
  paths into the vhost.
- **Per-host cert — the assumption is wrong:** issue a **dedicated
  `knowledge.hi2vi.com` Cloudflare Origin CA cert** (Cloudflare dashboard → SSL/TLS
  → Origin Server → Create Certificate, hostname `knowledge.hi2vi.com`), place its
  PEM + key on the edge (e.g. `/etc/nginx/certs/knowledge.hi2vi.com.pem` + `.key`),
  and follow the **PER-HOST-CERT VARIANT** comment block in
  `deploy/knowledge.hi2vi.com.conf` (point the two `ssl_certificate*` lines at the
  new files instead of the wildcard).

Cloudflare's edge-facing (public) TLS is handled automatically by the proxied
record; this check is only about the **origin** cert nginx serves to Cloudflare.

---

## 4. Optional `GOOGLE_API_KEY` — Gemini for hybrid search

Recommended at launch. hi2vi's read/search use case (topic dedup, research
grounding) is exactly what hybrid semantic search improves, and it is **one env
var with graceful degradation**: absent or quota-limited → search silently falls
back to BM25-only, `mode:"bm25"`, **zero code change** either way.

- Obtain a key from Google AI Studio (`https://aistudio.google.com/apikey`).
- Placement: `/opt/knowledge/.env` as `GOOGLE_API_KEY=<value>` on the box
  (`README.md` §1c). Leaving it empty/absent is a supported launch choice — you can
  add the key later and restart the api with **no other change**.

---

## 5. Handoff checklist — all boxes ticked = ready for bring-up

Walk this before `README.md` §1. When every box is ticked, the box has (or can
be given) everything it needs; proceed to the bring-up runbook.

- [ ] **`KB_API_TOKEN`** generated (`openssl rand -hex 32`) and recorded securely
      for both the box `.env` and the hi2vi side (same value).
- [ ] **SSH deploy key** generated (`ed25519`, no passphrase); **public** half
      added to `leetusik/knowledge` → Settings → Deploy keys **with write access**;
      **private** half ready to place at
      `/opt/knowledge-secrets/knowledge_deploy_key` (chmod 600); local copies to be
      deleted after placement.
- [ ] **Box clone origin** will be the SSH form
      `git@github.com:leetusik/knowledge.git` (verified at `README.md` §1a).
- [ ] **Cloudflare `knowledge` record** added on the `hi2vi.com` zone, **proxied**
      (orange cloud), pointing at the box.
- [ ] **Cert coverage** confirmed: either `*.hi2vi.com` wildcard covers
      `knowledge.hi2vi.com` (reuse hi2vi's cert), **or** a dedicated
      `knowledge.hi2vi.com` origin cert issued + the vhost's per-host variant
      applied.
- [ ] **`GOOGLE_API_KEY`** obtained (recommended) — or a deliberate BM25-only
      launch chosen.

Next: `README.md` §1 (box clone, place the deploy key + `known_hosts`, write
`.env`) → §2 (bring-up) → §3 (edge apply) → §5 (post-apply validation).

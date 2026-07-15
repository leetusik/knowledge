# Secrets & DNS provisioning runbook — knowledge.hi2vi.com

Operator runbook for the secrets + DNS that `https://knowledge.hi2vi.com` needs.
This is the "**produce the credentials and register them**" half;
[`README.md`](README.md) is the "**place them and bring the box up**" half.

> **No secret values ever live in this repo.** For the bearer token (§1) and the git
> push key (§2), the stronger rule also holds: **no value ever transits a laptop, a
> chat, or a terminal transcript** — both are **generated on the box**, straight into
> their final location, and only *public* halves and *names/paths* ever leave it.
> **One deliberate exception — the GHA runner key (§2b)**, which *cannot* be box-born
> because its *private* half must reach a GitHub Actions secret. It is minted in a
> `umask 077` tempdir on the operator's trusted machine, piped **once** into
> `gh secret set` (which encrypts it client-side, in flight), its `.pub` pushed to the
> box, and the tempdir then shredded — a minimal, controlled transit, never a paste or
> a transcript. Placement paths below are the exact ones `compose.prod.yml` mounts —
> don't change them without editing that file.

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

## 2b. GHA runner → `opc@box` SSH key — the production-deploy credential (P9)

The automated **Production Deploy** GitHub Action (`.github/workflows/deploy-production.yml`) SSHes
from the runner into `opc@140.245.64.173` to run the on-box deploy. Its driver,
[`github-actions-production-deploy.sh`](github-actions-production-deploy.sh), reads **three repo
secrets** on `leetusik/knowledge`:

- **`ORACLE_SSH_PRIVATE_KEY`** — **required**. The full OpenSSH **private** key (the entire
  `BEGIN…END` block). Written to a `umask 077` tempfile and used with `-i … -o IdentitiesOnly=yes`.
- **`ORACLE_SSH_KNOWN_HOSTS`** — **required**. The box's real host-key line(s), keyed on
  `140.245.64.173` (port 22 → bare-host form). Consumed under
  `-o StrictHostKeyChecking=yes -o UserKnownHostsFile=<pinned>`, so a wrong or empty value makes
  **every** SSH fail closed.
- **`ORACLE_SSH_PASSPHRASE`** — **optional**. Used only if non-empty (then the driver spins up
  `ssh-agent` + askpass). A passphrase-less key leaves this **unset**.

> **This is NOT the §2 key.** They are two different credentials pointing in opposite directions;
> conflating them is the classic footgun here (and P8 already saw a key leak). Side by side:
>
> | | §2 container deploy key | §2b runner key (this section) |
> |---|---|---|
> | direction | box container → GitHub (git push) | GHA runner → `opc@box` (SSH login) |
> | stored as | GitHub **deploy key** + box file `/opt/knowledge-secrets/knowledge_deploy_key` | GitHub **Actions secrets** (`ORACLE_SSH_*`) + a line in `opc`'s `authorized_keys` |
> | born | on the box, never leaves | in a locked tempdir on the operator's machine (must reach a GH secret) |
> | comment tag | `knowledge-api@oci` | `knowledge-gha-runner@box` |
>
> **P9 provisions §2b only.** It never mints, moves, reads, or re-registers the §2 key — the box's
> root-owned `/opt/knowledge-secrets/knowledge_deploy_key` (and its GitHub deploy-key registration)
> is left completely untouched.

**2b-i. Mint a dedicated, passphrase-less key** (least-privilege; a dedicated key can be
rotated/revoked without disturbing hi2vi's deploy). Do this **on the operator's machine** — the one
that already has `gh` authenticated to `leetusik/knowledge` **and** SSH access to the box:

```bash
umask 077
tmp="$(mktemp -d)"                       # 0700 dir; holds the PRIVATE half only transiently
ssh-keygen -t ed25519 -N '' -C 'knowledge-gha-runner@box' -f "$tmp/knowledge_gha_runner"
#  -> $tmp/knowledge_gha_runner       PRIVATE — becomes the ORACLE_SSH_PRIVATE_KEY secret, then shredded
#  -> $tmp/knowledge_gha_runner.pub   PUBLIC  — appended to opc's authorized_keys (2b-iii)
```

`-N ''` mints it **passphrase-less** — the recommended default for an unattended runner, since the
private half is already an access-controlled GitHub secret. To use a passphrase instead, replace
`-N ''` with `-N '<passphrase>'` and also set `ORACLE_SSH_PASSPHRASE` in 2b-ii.

**2b-ii. Set the three secrets on `leetusik/knowledge`**, piping the private half **straight in** — it
is never displayed, pasted, or written outside the tempdir:

```bash
gh secret set ORACLE_SSH_PRIVATE_KEY -R leetusik/knowledge < "$tmp/knowledge_gha_runner"

# Pin the box's host key. VERIFY it out-of-band before trusting it (2b-iv).
ssh-keyscan -p 22 140.245.64.173 | tee "$tmp/known_hosts"
gh secret set ORACLE_SSH_KNOWN_HOSTS -R leetusik/knowledge < "$tmp/known_hosts"

# ORACLE_SSH_PASSPHRASE — set ONLY if you minted the key WITH a passphrase; otherwise leave it
# unset (the driver treats empty/absent as passphrase-less):
# gh secret set ORACLE_SSH_PASSPHRASE -R leetusik/knowledge     # then type the passphrase at the prompt
```

Or the web UI: `leetusik/knowledge` → **Settings** → **Secrets and variables** → **Actions** → **New
repository secret**. The driver `require_env`s the first two, so **both must exist** or the deploy dies
before it connects; the passphrase secret may be absent.

**2b-iii. Authorize the PUBLIC half on the box — append, never overwrite.** hi2vi's runner key lives on
this same `opc` account and must survive:

```bash
ssh-copy-id -i "$tmp/knowledge_gha_runner.pub" opc@140.245.64.173
#   ssh-copy-id APPENDS and fixes perms; it never clobbers existing keys. Equivalent manual form,
#   run ON the box, is strictly append (note the >>):
#     cat >> ~/.ssh/authorized_keys      # paste the single knowledge_gha_runner.pub line, then Ctrl-D
#     chmod 600 ~/.ssh/authorized_keys
```

> A **dedicated line** is the whole point of "dedicated": this key can later be rotated or revoked by
> deleting **just its line** from `~opc/.ssh/authorized_keys` and rotating the `ORACLE_SSH_*` secrets —
> hi2vi's deploy on the same account is never touched (blast-radius isolation). It is isolation, **not**
> command restriction: the driver `scp`s a script and then runs it, so an `authorized_keys`
> forced-command lock isn't applicable here.

**2b-iv. Verify the pinned host key out-of-band.** `ssh-keyscan` trusts whatever answers at scan time,
so confirm its fingerprint against the box's real host key from an **already-trusted** session before
relying on it — otherwise a scan-time MITM could pin an attacker's key:

```bash
ssh-keygen -lf "$tmp/known_hosts"                                          # what you just scanned
ssh opc@140.245.64.173 'ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub'  # ground truth on the box
# The fingerprints MUST match. This is exactly what makes StrictHostKeyChecking=yes safe in the driver.
```

**2b-v. Shred the tempdir.** The private half exists only transiently — destroy it as soon as the
secret is set and the `.pub` is authorized:

```bash
shred -u "$tmp"/knowledge_gha_runner* 2>/dev/null || true   # (rm -P on macOS)
rm -rf "$tmp"
```

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
- [ ] **GHA runner key** (§2b) minted (dedicated, ed25519), `.pub` appended to
      `~opc/.ssh/authorized_keys` (hi2vi's key left intact), and the three
      `ORACLE_SSH_*` secrets set on `leetusik/knowledge` — gates the automated
      **Production Deploy** action (P9), not the initial hand bring-up.
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

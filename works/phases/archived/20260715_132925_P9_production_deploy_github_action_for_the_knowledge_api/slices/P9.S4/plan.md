# P9.S4 — Runner SSH-key provisioning runbook + operator `pending` gate

**You are `slice-executor-mid`.** Author the provisioning runbook for the net-new GHA runner → `opc@box`
SSH key (the three `ORACLE_SSH_*` repo secrets on `leetusik/knowledge`), then hand off to the operator.
**Author + operator-handoff ONLY** — no box SSH, no `gh`, no dispatch, no docker. You write docs and
return `needs_operator`; the operator (not you) creates the secrets and authorizes the key.

## Context

S3 shipped `.github/workflows/deploy-production.yml`, whose `deploy` job feeds the runner driver
(`deploy/github-actions-production-deploy.sh`) three secrets — `ORACLE_SSH_PRIVATE_KEY`,
`ORACLE_SSH_KNOWN_HOSTS`, `ORACLE_SSH_PASSPHRASE` — that do not yet exist on `leetusik/knowledge`. Until
they do, the workflow cannot SSH to the box, so **S5's real dispatch is blocked on this credential**.

The operator chose a **dedicated** knowledge runner key (§G option b), not a reuse of hi2vi's — so unlike
hi2vi (which reused changple's existing secret values, per the archived `hi2vi_web` P8.F3), you must author
a **from-scratch mint-and-register discipline**. This key must never be conflated with P8's
container→GitHub git deploy key (`knowledge-api@oci-box`, born on the box, root-owned at
`/opt/knowledge-secrets/knowledge_deploy_key`) — a hard phase constraint (phase.md §G + Constraints), and
doubly load-bearing given P8's leaked-key history.

## Read first

`deploy/SECRETS.md` (the file you extend — mirror its voice, structure, and callout style),
`deploy/github-actions-production-deploy.sh` (the consumer — its secret contract, verified below),
`phase.md` §G + the two-credentials Constraint.

## Grounded facts the runbook must encode (verified — do not re-derive, but confirm by reading)

- **Driver secret contract** (`deploy/github-actions-production-deploy.sh`):
  - `ORACLE_SSH_PRIVATE_KEY` — **required** (`require_env`, l.65); written to a `umask 077` tempfile and
    used with `-i … -o IdentitiesOnly=yes`. Must be the **full OpenSSH private key** (BEGIN/END block).
  - `ORACLE_SSH_KNOWN_HOSTS` — **required** (`require_env`, l.66); consumed under
    `-o StrictHostKeyChecking=yes -o UserKnownHostsFile=<pinned>` (l.84-85). Must carry the box's **real
    host key line(s)** or *every* SSH fails closed. Keyed on `140.245.64.173` (port 22 → bare-host form).
  - `ORACLE_SSH_PASSPHRASE` — **optional** (defaults empty, l.23); only if non-empty does the driver spin
    up `ssh-agent` + askpass (l.89-99). Empty ⇒ passphrase-less key path.
- **Box coordinates:** host `140.245.64.173`, user `opc`, port `22` (driver defaults, l.17-19).
- **`deploy/SECRETS.md`** is the home — its stated job is "produce the credentials and register them." It
  already has §1 `KB_API_TOKEN`, §2 the container deploy key, §3 DNS/TLS, §4 `GOOGLE_API_KEY`, §5 handoff
  checklist. It is a **repo doc**, not a `docs/current/*` durable doc → edit it directly, **no
  `doc-new-version`** (same treatment S1-S3 gave `deploy/README.md`). It is **not** in
  `plugin/templates/manifest.json` → zero plugin-parity impact.

## What to author — one file: `deploy/SECRETS.md`

A new section documenting the runner key, plus a handoff-checklist bullet, plus one honest correction to
the intro invariant. Concretely:

1. **New section "## 2b. GHA runner → `opc@box` SSH key — the production-deploy credential (P9)"**
   (placed right after §2, so the two SSH credentials sit adjacently and the contrast is unmissable). It
   must contain:
   - **A prominent "Not the §2 key" contrast callout.** The two credentials, side by side:
     | | §2 container deploy key | §2b runner key (this section) |
     |---|---|---|
     | direction | box container → GitHub (git push) | GHA runner → `opc@box` (SSH login) |
     | stored as | GitHub **deploy key** + box file `/opt/knowledge-secrets/knowledge_deploy_key` | GitHub **Actions secrets** (`ORACLE_SSH_*`) + a line in `opc`'s `authorized_keys` |
     | born | on the box, never leaves | in a locked tempdir on the operator's machine (must reach a GH secret) |
     | comment tag | `knowledge-api@oci` | `knowledge-gha-runner@box` |
     - State plainly: **P9 provisions §2b only and never touches §2.**
   - **Mint (dedicated, passphrase-less recommended):** `ssh-keygen -t ed25519 -C
     'knowledge-gha-runner@box'` into a `umask 077` tempdir on the operator's machine (the one with `gh`
     auth + SSH to the box). No passphrase for the unattended runner is the recommended default (the
     private half is already an access-controlled GH secret); document the passphrase path as optional.
   - **Set the three secrets** on `leetusik/knowledge`, piping the private half straight in (never
     displayed/pasted):
     ```
     gh secret set ORACLE_SSH_PRIVATE_KEY -R leetusik/knowledge < <tmp>/knowledge_gha_runner
     ssh-keyscan -p 22 140.245.64.173 | tee <tmp>/known_hosts     # then verify fingerprint OOB (below)
     gh secret set ORACLE_SSH_KNOWN_HOSTS -R leetusik/knowledge < <tmp>/known_hosts
     # ORACLE_SSH_PASSPHRASE: set ONLY if the key has a passphrase; otherwise leave it unset (empty is fine)
     ```
     Or the web UI equivalent (Settings → Secrets and variables → Actions). Note the driver `require_env`s
     the first two, so both must exist; the passphrase secret may be absent.
   - **Authorize the public half on the box — append, never overwrite:** `ssh-copy-id`-style append of
     `knowledge_gha_runner.pub` to `~opc/.ssh/authorized_keys` (`>> `, mode 600) — **hi2vi's existing
     runner key on the same `opc` account must survive.** A dedicated line means this key can later be
     revoked/rotated (delete just its line + rotate the secret) without touching hi2vi's deploy — the whole
     point of "dedicated" (blast-radius isolation, not command restriction: the driver scp's + runs a
     script, so a forced-command lock isn't applicable; note this).
   - **Host-key pinning integrity:** the operator must verify the `ssh-keyscan` output against the box's
     real host key **out-of-band** before trusting it — compare `ssh-keygen -lf <tmp>/known_hosts` against
     the box's own `/etc/ssh/ssh_host_ed25519_key.pub` fingerprint (from an already-trusted session), so a
     scan-time MITM can't pin an attacker's key. This is why `StrictHostKeyChecking=yes` is safe.
   - **Cleanup:** `shred -u` / `rm -rf` the tempdir — the private half exists only transiently.
2. **§5 handoff-checklist bullet:** add "[ ] **GHA runner key** minted (dedicated, ed25519), `.pub`
   appended to `~opc/.ssh/authorized_keys` (hi2vi's key intact), and the three `ORACLE_SSH_*` secrets set
   on `leetusik/knowledge` (§2b)."
3. **Honest fix to the intro invariant (l.7-12):** today it claims "**no secret value ever transits a
   laptop…** both … are generated on the box." The runner key's private half *must* reach a GitHub secret,
   so it cannot be purely box-born. Refine the wording precisely (don't silently contradict it): the token
   + push key stay box-born-and-never-leave; the runner key is minted in a `umask 077` tempdir on the
   operator's trusted machine, piped **once** into `gh secret set` (encrypted client-side by `gh` in
   flight), its `.pub` pushed to the box, and the tempdir shredded — a minimal, controlled transit, not a
   free-for-all. Keep the invariant's spirit; state the one deliberate exception.

## Operator handoff — return `needs_operator`

Do **not** create secrets, SSH to the box, or run `gh` — those are the operator's. After authoring, return
`needs_operator` with a crisp bulleted operator to-do list in your verdict (so the orchestrator can relay
it verbatim): the actions only the operator can perform — (1) mint the dedicated key, (2) set
`ORACLE_SSH_PRIVATE_KEY` + `ORACLE_SSH_KNOWN_HOSTS` (+ optional `ORACLE_SSH_PASSPHRASE`) on
`leetusik/knowledge`, (3) append the `.pub` to `~opc/.ssh/authorized_keys` (append-only), (4) verify the
host-key fingerprint OOB, (5) shred the tempdir. The orchestrator will then commit the runbook and set S4
`pending`.

## Constraints

- **Author + handoff only** — no box SSH, no `gh` invocation, no dispatch, no docker. You write
  `deploy/SECRETS.md` + `result.md` + append S4 findings to `phase.md`, then return `needs_operator`.
- Never commit / transition status (orchestrator's job). `SECRETS.md` is a repo doc → **no
  `doc-new-version`**; append a **Doc-impact** note to `phase.md` (`security.md` gains the
  runner→`opc@box` SSH-key credential per §G, kept distinct from the `knowledge-api@oci-box` deploy key —
  for REVIEW).
- **Two-credentials constraint is the crux:** the runbook must make the §2 vs §2b distinction impossible
  to miss, and must **not** modify anything about §2 or the box's `/opt/knowledge-secrets/` key.
- Secret discipline: no key material in the repo or in any command that would echo it; private half only
  ever via `gh secret set < file` from a `umask 077` tempdir that is then shredded.

## Static validation (no box, no `gh`)

- `python3 scripts/plugin_parity.py` — expect PASS (`SECRETS.md` not in the manifest; confirm no impact).
- `python3 scripts/workflow.py validate` — expect PASS (state integrity).
- Markdown internal-consistency read-through: the §2 vs §2b contrast is unambiguous; the three secret
  names match the driver exactly; the intro-invariant edit reads honestly (no self-contradiction); the §5
  checklist bullet is present.

## Verdict

`needs_operator` — the runbook (`deploy/SECRETS.md` §2b + §5 bullet + intro fix), `result.md`, and the
`phase.md` S4 findings + Doc-impact note written; the operator to-do list carried in the verdict.
(`escalate` only if the mint/register discipline proves to need a decision this plan didn't settle.)

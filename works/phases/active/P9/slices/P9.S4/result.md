# P9.S4 result — Runner SSH-key provisioning runbook + operator handoff

**Verdict: `needs_operator`.** Author + operator-handoff slice. One file authored
(`deploy/SECRETS.md`); no box SSH, no `gh`, no dispatch, no docker. The operator — not this slice —
mints the key and creates the secrets. Static-validated only; the real mint/register is the operator's
to-do list carried in the verdict.

## What I authored — `deploy/SECRETS.md` (three edits)

1. **New `## 2b. GHA runner → `opc@box` SSH key — the production-deploy credential (P9)`**, placed
   immediately after §2 so the two SSH credentials sit adjacently. Contents:
   - **A prominent "This is NOT the §2 key" contrast callout** — a side-by-side table (direction /
     stored as / born / comment tag) plus a plain statement that **P9 provisions §2b only and never
     touches the §2 container deploy key** (`/opt/knowledge-secrets/knowledge_deploy_key`, its GitHub
     deploy-key registration).
   - **2b-i Mint** a dedicated, passphrase-less ed25519 (`ssh-keygen -t ed25519 -N '' -C
     'knowledge-gha-runner@box'`) into a `umask 077` `mktemp -d` on the operator's machine; passphrase
     path documented as optional.
   - **2b-ii Set the three secrets** on `leetusik/knowledge` by piping the private half straight into
     `gh secret set … < "$tmp/knowledge_gha_runner"` (never displayed/pasted), the `ssh-keyscan` →
     `gh secret set ORACLE_SSH_KNOWN_HOSTS`, and the optional-only `ORACLE_SSH_PASSPHRASE`; web-UI
     equivalent noted; states the driver `require_env`s the first two.
   - **2b-iii Authorize the `.pub` on the box — append, never overwrite** (`ssh-copy-id` / explicit
     `>>`), with a callout on why a **dedicated line** = blast-radius isolation (rotate/revoke without
     touching hi2vi's key on the same `opc` account) and why a forced-command lock isn't applicable
     (the driver `scp`s + runs a script).
   - **2b-iv Verify the pinned host key out-of-band** — compare `ssh-keygen -lf "$tmp/known_hosts"`
     against the box's `/etc/ssh/ssh_host_ed25519_key.pub` fingerprint from an already-trusted session
     (defeats a scan-time MITM; this is what makes `StrictHostKeyChecking=yes` safe).
   - **2b-v Shred the tempdir** (`shred -u` / `rm -rf`).
2. **§5 handoff-checklist bullet** for the GHA runner key (dedicated ed25519, `.pub` appended with
   hi2vi's key intact, three `ORACLE_SSH_*` secrets set) — noting it gates the automated **Production
   Deploy** action (P9), not the initial hand bring-up.
3. **Honest fix to the intro invariant** (l.7-17): the old wording claimed *no secret value ever
   transits a laptop* and *both … generated on the box*. That is now false for the runner key, whose
   private half must reach a GitHub secret. Refined it to keep the invariant's spirit for §1/§2 and
   state the **one deliberate exception** — the runner key is minted in a `umask 077` tempdir on the
   operator's trusted machine, piped **once** into `gh secret set` (client-side-encrypted in flight),
   `.pub` pushed to the box, tempdir shredded — a minimal controlled transit, not a paste/transcript.

## Grounded facts confirmed against the driver (`deploy/github-actions-production-deploy.sh`)

- `ORACLE_SSH_PRIVATE_KEY` **required** (`require_env`, l.65); written to a `umask 077` tempfile
  (l.78-79) and used `-i … -o IdentitiesOnly=yes` (l.101) → must be the full OpenSSH private key.
- `ORACLE_SSH_KNOWN_HOSTS` **required** (`require_env`, l.66); consumed under
  `-o StrictHostKeyChecking=yes -o UserKnownHostsFile=<pinned>` (l.84-85) → must carry the box's real
  host-key line(s) or every SSH fails closed.
- `ORACLE_SSH_PASSPHRASE` **optional** (default empty, l.23); `ssh-agent`+askpass only if non-empty
  (l.89-99).
- Box coordinates: host `140.245.64.173`, user `opc`, port `22` (driver defaults l.17-19). Runbook
  encodes these verbatim.
- The three secret names in the runbook match the driver **exactly**.

## Static validation (no box, no `gh`)

| command | result |
|---|---|
| `python3 scripts/plugin_parity.py` | **PASS** — "plugin templates are in parity with the repo." `SECRETS.md` is not in `plugin/templates/manifest.json`, so zero parity impact (as expected). |
| `python3 scripts/workflow.py validate` | **PASS** — "Workflow validation passed." |
| Markdown internal-consistency read-through | **PASS** — §2-vs-§2b credential contrast unambiguous; three secret names match the driver; intro-invariant edit reads honestly (no self-contradiction); §5 checklist bullet present. |

## Deviations / observations

- **No functional deviation from the plan.** Authored exactly the §2b section + §5 bullet + intro fix
  the plan specified; ran exactly the two static validations; returned `needs_operator`.
- **Observation (label echo, not a deviation):** §2 already uses inline bold sub-step labels
  `2a. / 2b. / 2c.` (e.g. `**2b. Register the PUBLIC half on GitHub**`). The plan explicitly mandates a
  top-level `## 2b.` heading for the new section, so a minor visual echo now exists between §2's inline
  `2b.` step and the `## 2b` heading. It is **not** a cross-reference ambiguity — the file never
  cross-references §2's inline steps as "§2b", and every "§2b" reference I added (table, intro, §5
  bullet) points unambiguously to the new heading. I followed the plan's explicit naming rather than
  rename §2's sub-steps (the plan forbids touching §2). Flagged for REVIEW in case the inline labels
  are later renamed to `2·i/ii/iii`.
- No key material anywhere in the repo; the private half only ever moves via `gh secret set < file`
  from a `umask 077` tempdir that is then shredded. `doc-new-version` **not** run (`SECRETS.md` is a
  repo doc, not a `docs/current/*` durable doc); a Doc-impact note was appended to `phase.md` for
  REVIEW instead.

## Operator to-do (only the operator can do these — carried in the verdict)

1. Mint the dedicated ed25519 runner key (§2b-i).
2. Set `ORACLE_SSH_PRIVATE_KEY` + `ORACLE_SSH_KNOWN_HOSTS` (+ optional `ORACLE_SSH_PASSPHRASE`) on
   `leetusik/knowledge` (§2b-ii).
3. Append the `.pub` to `~opc/.ssh/authorized_keys` — append-only, hi2vi's key intact (§2b-iii).
4. Verify the host-key fingerprint out-of-band (§2b-iv).
5. Shred the tempdir (§2b-v).

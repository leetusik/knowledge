# P34-n0.S3 result: Deploy the gate and verify a private write live (first pass)

## Verdict

- status: needs_operator
- route: mid
- model: opus
- effort: medium
- summary: First pass. Ran the read-only checks: local `main` is 4 commits ahead of origin, origin is at `90671db`, and the last three Production Deploys succeeded. Wrote the operator runbook below (OQ3, server pre-steps, hygiene grep, push and deploy, deploy checks, the private probe write, probe cleanup). Nothing was pushed, dispatched or run on the server.
- operator_need: (A) settle OQ3: if the session label in `intent.md`'s `## Notes` matches a private project's name, give the replacement wording; the main thread edits that line and commits it before anything is pushed. Then run B, C, E, F and G yourself, and either run D or tell the main thread "push and deploy" when you are ready. Paste back: B4's status output, C's grep output (it must be empty), E's three outputs, F's response block and its four checks, and G's response and status. Toggle no project's visibility and make no other KB write until S4.
- files_changed: works/phases/active/P34-n0/slices/P34-n0.S3/result.md; works/phases/active/P34-n0/phase.md (`## Now` only, through `phase-section`)
- validation: `git log --oneline origin/main..main` (4 commits, passed); `git status --short` (clean apart from the orchestrator's slice-start files and this slice's own, passed); `gh run list --workflow deploy-production.yml -L 3` (3 successes, passed); `gh api repos/leetusik/knowledge/commits/main --jq .sha` (= local `origin/main`, passed); `python3 scripts/workflow.py validate` (passed, pre-existing warnings only)
- deviations: (1) F and G call the API with Python's `urllib` inside `knowledge-api`, not `curl`: the image installs only git, openssh-client and tzdata (Dockerfile L18-19), so it has no `curl`, and the API port is not published on the host (compose.prod.yml L126). The compose healthcheck already calls the API this way. (2) The SSH alias is the README's `oracle-cloud`, not the plan's `h`: use your own alias if it differs. (3) The block lines are listed in the order `server/gitops.py` `_render` writes them (`/docs/<p>/`, `/docs/.versions/<p>/`, `/docs/.books/<p>/`, one project per group), which is the plan's order. They are sorted by project name, not alphabetically within a group.
- doc_impact: none

## Read-only checks (2026-10-28)

| Check | Output |
|---|---|
| `git log --oneline origin/main..main` | 4 commits: `e771bef` (S2), `a158bd8` (S1), `14fdf42` (DECOMP), `16d92a8` (phase creation) |
| `git status --short` | `M works/backlog.md`, `M works/events.jsonl`, `M works/phases/active/P34-n0/phase.md`, `M .../P34-n0.S3/slice.json`, `?? .../P34-n0.S3/plan.md`: only the orchestrator's slice-start writes, plus this `result.md` now. No product file is dirty |
| `gh run list --workflow deploy-production.yml -L 3` | `40516419243` success 2026-10-27; `40329706423` success 2026-10-26; `39717847318` success 2026-10-22; all `workflow_dispatch` on `main` |
| `gh api repos/leetusik/knowledge/commits/main --jq .sha` | `90671db1496d146e540d335d2fc01111b9b1d33a`, which equals local `origin/main` |

The push in D will also carry the S3 first-pass commit and any OQ3 commit. So run C **after** the main thread's last commit and right before D.

## Facts the runbook relies on (with sources)

- Server checkout: `/opt/knowledge`, owned by `opc`. The API container runs as root and writes into it through the `/repo` bind mount, so some objects under `.git` are root-owned. If host-side git reports a permission error, run it with `sudo` (`deploy/README.md` §1, L73-90).
- SSH alias in the README: `oracle-cloud` (§3, §6.2).
- API container: `knowledge-api`, `KB_ROOT=/repo`, port 8000 inside the compose network only. The master bearer is `KB_API_TOKEN` in the container's environment, loaded from `/opt/knowledge/.env` (`compose.prod.yml` L23-46, L126).
- The deploy's on-box gate captures `git status --short --branch` before and after as artifacts (`deploy/oracle-production-deploy-remote.sh` L110, L144). `deploy.sh` refuses a dirty tracked tree and prints `git status --short` into the run log (`deploy/deploy.sh` L226-231). The deploy workflow uploads `production-deploy-artifacts` (README §6).
- Block markers: `server/gitops.py` L91-92.
- Write route: `POST /api/documents` (title, markdown, project, 2 to 5 tags, source_repo, `commit`). Delete route: `DELETE /api/documents/{id}?commit=true` (`server/main.py` L575-607, L1318, L1997).

## Operator runbook

Placeholders: `<p>` is the stray private document's project name (the one whose bullet B2 drops). `<list>` is your private-name file, one name per line, kept **outside every repo** (for example `~/private-kb-names.txt`). Never paste a real name, title or token into chat, a commit or this file. Paste back only the outputs marked **Paste back**.

### A. OQ3 (before anything is pushed)

Open `intent.md` locally, `works/phases/active/P34-n0/intent.md`, section `## Notes`. If the session label there matches a private project's name, tell the main thread the replacement wording. It edits that one line and commits it. If it does not match, say "OQ3: no change".

### B. Server pre-steps (on the box, in `/opt/knowledge`)

```bash
ssh oracle-cloud
cd /opt/knowledge
```

**B1. Back up `docs/` outside the checkout.**

```bash
sudo tar czf /home/opc/kb-docs-backup-$(date +%Y%m%d-%H%M%S).tgz -C /opt/knowledge docs
ls -l /home/opc/kb-docs-backup-*.tgz
```

Expected: one new tarball of non-zero size in `/home/opc`. The tarball holds private content: it stays on the box, and you can delete it after S4.

**B2. Drop the stray private bullet from the index.**

```bash
sudo git checkout -- docs/index.md
git diff --stat -- docs/index.md
```

Expected: the second command prints nothing.

**B3. Exclude the stray document's project footprint, in the managed-block format.**

```bash
EX="$(git rev-parse --git-path info/exclude)"; echo "$EX"
grep -c 'knowledge server: private projects' "$EX"      # expect 0: no block yet
P='<p>'                                                  # fill in the project name, on the box only
printf '\n%s\n/docs/%s/\n/docs/.versions/%s/\n/docs/.books/%s/\n%s\n' \
  '# >>> knowledge server: private projects (managed; rewritten whole) >>>' \
  "$P" "$P" "$P" \
  '# <<< knowledge server: private projects <<<' | sudo tee -a "$EX" >/dev/null
tail -n 5 "$EX"
```

Expected: `$EX` prints `.git/info/exclude`. The `grep -c` prints `0`. If it prints anything else, stop and report. The `tail` shows exactly these five lines, with your name in place of `<p>`:

```
# >>> knowledge server: private projects (managed; rewritten whole) >>>
/docs/<p>/
/docs/.versions/<p>/
/docs/.books/<p>/
# <<< knowledge server: private projects <<<
```

The marker lines must match byte for byte (`server/gitops.py` L91-92), because the server's code reads the block by those exact lines and later rewrites it whole. Do not paste the `tail` output back: it contains the name.

**B4. The clean check.**

```bash
git status --short --branch
```

Expected: exactly one line, `## main...origin/main`, with no `[ahead N]` or `[behind N]` and no other lines. **Paste back** that line.

Why it must be clean: the deploy writes `git status --short --branch` into a downloadable Actions artifact before and after it runs. If the tracked tree is dirty, `deploy.sh` refuses and prints `git status --short` into the run log. This repo is public. A modified `docs/index.md` or an unexcluded private file would put a private path in a public log. An ahead count means an unpushed local commit, which the deploy would rebase and push. If you see `[behind N]`, that is expected only after D's push, so run B4 before D.

### C. Hygiene grep (on the laptop, in the knowledge repo, after the main thread's last commit, right before D)

```bash
cd ~/projects/personal/knowledge
git log --oneline origin/main..main          # the commits about to be pushed
git log -p --format='%H%n%s%n%b' origin/main..main | grep -niwF -f <list>
```

Expected: the second command prints **nothing** (exit status 1). It scans every unpushed commit's message and full diff, including the `works/` records (plans, results, the notebook, events), not just product code. **Paste back** "C: empty" and the commit count. If it prints anything, do not push: report the line number only, not the line itself.

Optional stricter pass, which may print false positives: the same command with `-niF` instead of `-niwF` also catches a name inside a longer word.

### D. Push and deploy (on your word at that moment; the main thread may run these when you say "push and deploy")

```bash
git push origin main
gh workflow run deploy-production.yml --ref main
sleep 5; gh run watch "$(gh run list --workflow deploy-production.yml -L 1 --json databaseId --jq '.[0].databaseId')"
```

Expected: the push fast-forwards origin from `90671db` to local `main`. The run ends `completed success`, with the external smoke (`/healthz` and `/`, both 200) green. If the run fails, do not re-dispatch blindly: paste the failing step's name. The artifact can contain `git status` output, so check it before you share it anywhere.

### E. Verify the deploy

```bash
# on the box
docker exec knowledge-api python -m server.reconcile --help
git -C /opt/knowledge log -1 --format=%H
git -C /opt/knowledge status --short
```

```bash
# on the laptop
gh api repos/leetusik/knowledge/commits/main --jq .sha
```

Expected:
1. `--help` prints the usage for `[--dry-run] [--push] [--verbose]` and names no project. Do **not** run `--dry-run`: its output names private projects (that is S4's job).
2. The box's `log -1` SHA equals the laptop's `gh api` SHA, which is local `main`'s tip.
3. `status --short` prints nothing.

**Paste back** all three outputs and the origin SHA.

### F. The probe write (the only write during the pause, on the box)

It uses an invented project name, `p34-probe`. The token is read from the container's own environment and is never printed.

```bash
docker exec -i knowledge-api python - <<'PY'
import json, os, urllib.request, urllib.error
body = {"title": "P34 probe", "markdown": "# P34 probe\n\nA throwaway private-write probe.\n",
        "project": "p34-probe", "tags": ["probe", "p34"], "source_repo": "knowledge", "commit": True}
req = urllib.request.Request("http://127.0.0.1:8000/api/documents", data=json.dumps(body).encode(),
        method="POST", headers={"Authorization": "Bearer " + os.environ["KB_API_TOKEN"],
                                "Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=60) as r:
        status, d = r.status, json.load(r)
except urllib.error.HTTPError as e:
    status, d = e.code, {"error": e.read().decode()[:500]}
keys = ["id", "rel_path", "project", "committed", "commit_sha", "pushed", "push_pending",
        "recent_updated", "landing_created", "commit_error", "error"]
print(status); print(json.dumps({k: d.get(k, "<absent>") for k in keys}, indent=1))
PY
```

Expected (from S1's note): `201`, then `committed: false`, `commit_sha: null`, `pushed: false`, `push_pending: false`, `recent_updated: false`, `landing_created: false`, `commit_error: "<absent>"`, `rel_path` under `docs/p34-probe/`. Note the `id`: G needs it. A `commit_error` starting `publishing skipped:` means the visibility lookup failed. One starting `refused:` is the gitops guard. Either way, stop and paste it back.

Then the four checks:

```bash
# on the box
git -C /opt/knowledge status --short                     # F1: expect nothing
git -C /opt/knowledge log -1 --format=%H                 # F2: expect E's SHA
git -C /opt/knowledge diff --stat HEAD -- docs/index.md  # F2: expect nothing
grep -n 'p34-probe' "$(git -C /opt/knowledge rev-parse --absolute-git-dir)/info/exclude"   # F4
```

```bash
# on the laptop
gh api repos/leetusik/knowledge/commits/main --jq .sha  # F3: expect E's origin SHA
```

Expected for F4: three lines, `/docs/p34-probe/`, `/docs/.versions/p34-probe/` and `/docs/.books/p34-probe/`, inside the block. The server rewrote the block whole, so your `<p>` lines are still there too: grep only for the probe. **Paste back** the 201 block and F1 to F4.

### G. Probe cleanup (on the box)

Put F's `id` in place of `<id>`.

```bash
docker exec -i knowledge-api python - <<'PY'
import json, os, urllib.request, urllib.error
DOC_ID = <id>
req = urllib.request.Request(f"http://127.0.0.1:8000/api/documents/{DOC_ID}?commit=true", method="DELETE",
        headers={"Authorization": "Bearer " + os.environ["KB_API_TOKEN"]})
try:
    with urllib.request.urlopen(req, timeout=60) as r:
        status, d = r.status, json.load(r)
except urllib.error.HTTPError as e:
    status, d = e.code, {"error": e.read().decode()[:500]}
print(status); print(json.dumps({k: d.get(k, "<absent>") for k in ["committed", "commit_sha", "push_pending", "commit_error", "error"]}, indent=1))
PY
git -C /opt/knowledge status --short
git -C /opt/knowledge log -1 --format=%H
```

Expected: `200`, `committed: false`, `commit_sha: null`, no `commit_error`. The status prints nothing, and `log -1` is still E's SHA. A private delete makes no commit. **Paste back** the response and both outputs.

What stays behind is harmless: the `p34-probe` registry row (private, holding no documents) and its three lines in the exclude block. You may delete the project from the app later. Toggle no project's visibility before S4: after this deploy, a toggle commits and pushes at once.

## Validation

- Read-only git and gh checks: see the table above.
- `python3 scripts/workflow.py validate`: passed (warnings only, all pre-existing and from other phases: P26.S5 kind, consolidation owed, stale docs, oversized doc sections).

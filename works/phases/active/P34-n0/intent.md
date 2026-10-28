# Intent — P34-n0

- Captured at: 2026-10-28T12:23:01+09:00
- Origin: operator

## Original Input (verbatim)

> why don't we just stop automatic push to public github. stopping that would big? if not, create phase on the ssh h knowledge dir, I'll handle the problem in there.

## Confirmed Intent (refined + clarified)

Stop the knowledge server from committing and pushing private projects' documents to the public GitHub repo. Today the server decides by owner account, not by project visibility. Deal with what is already exposed there, and keep private titles out of the published home index. The operator runs this phase.

## Clarifications Resolved

- Q: Create this phase with the name "Keep private documents off the public repo" and the objective above, record the facts found, commit it locally (no push) and stop? A: "Create as proposed".

## Notes

These records are tracked and pushed with this repo, so keep the names of private projects, their document titles, tenant ids and server secrets out of this phase's files.

- **The mechanism.** It was read in the server code and verified on the running server on 2026-10-28.
  - A write commits only when `body.commit and config.git_commit_enabled() and ctx.is_public` (`server/main.py`: the save path around L1566, and the paths around L1859 and L2120).
  - `ctx.is_public` is true for the owner's tenant (tenant #1, `server/api_auth.py`), whatever the project's visibility.
  - Tenant #1's documents land in `docs/` (`_tenant_root`), and with `KB_GIT_PUSH: "true"` (`compose.prod.yml`) every such commit is pushed to the public GitHub origin.
  - So a private project of the owner account is hidden in the reader (an anonymous visitor gets a 404), but its documents are committed and pushed.
- **The home index.** `docs/index.md` lists every document's title and is staged on every commit. A private document written with `commit: false` (which skips the git step) still gets its title into the next pushed index.
- **Already pushed.** The documents of several private projects of the owner account are already in the repo and its history.
  - To list them, compare `git ls-files docs` with the registry's project visibility; the operator has the list from an earlier session of 2026-10-28.
  - Deleting the files from the tree leaves them in history.
  - This repo is also the knowledge plugin's marketplace (installs come from GitHub), so making it private affects plugin installs.
- **The server as of 2026-10-28.** One private document was published with `commit: false`. It sits uncommitted in the server checkout's `docs/`, with `docs/index.md` modified. Nothing was pushed: head equals `origin/main` at `90671db`.
- **A stopgap, not decided.** Setting `KB_GIT_PUSH` to false and recreating the API container stops every push, including the public projects' documents (publish-on-write is a deliberate feature). The server would still commit private documents locally, and nothing already pushed would be removed.

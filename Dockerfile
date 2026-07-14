# kb-api — DB-backed document API for the knowledge base (Track 2).
# Packaging only: no server logic lives here. The repo is bind-mounted at /repo
# at runtime (see compose.yml), so this image ships only the interpreter, git,
# tzdata, and the pinned Python deps — never the application code or docs/.
FROM python:3.12-slim

# git: the API commits doc writes itself (server/gitops.py runs `git -C /repo`).
# openssh-client: git ALONE CANNOT PUSH over an SSH remote — the `ssh` binary is
# only a *Recommends* of git, and --no-install-recommends drops it (verified: the
# python:3.12-slim base ships no `ssh`). The hosted deployment's push credential
# is an SSH deploy key (origin git@github.com:…, driven by GIT_SSH_COMMAND), so
# without this package KB_GIT_PUSH=true (publish-on-write) fails on every push —
# and because push is best-effort, it fails SILENTLY (still 201, with
# pushed:false + push_error) and nothing ever reaches Pages.
# tzdata: NOT present in python:*-slim; without it TZ=Asia/Seoul silently falls
# back to UTC and datetime.date.today() computes UTC dates — wrong file dates
# around midnight KST. All three are load-bearing.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git openssh-client tzdata \
    && rm -rf /var/lib/apt/lists/*

# uv binary (used only to resolve+install the locked deps into the system env).
# Pinned (P7.S1) to the locally-proven uv version — the host uv that produced
# uv.lock — so the build is reproducible and this Dockerfile can ship byte-identical
# in the plugin template class. Bumps are deliberate and diff-visible.
COPY --from=ghcr.io/astral-sh/uv:0.8.14 /uv /usr/local/bin/uv

# Install runtime deps from the frozen lock into the system interpreter. A /repo
# venv would be shadowed by the runtime bind mount, so deps go system-wide.
# Copy only the dependency manifests — the app arrives via the bind mount.
COPY pyproject.toml uv.lock ./
RUN uv export --frozen --no-dev --no-emit-project -o /tmp/req.txt \
    && uv pip install --system -r /tmp/req.txt \
    && rm -f /tmp/req.txt

# System-level git config so the /repo bind mount cannot shadow it:
#  - safe.directory: the container root differs from the mounted repo's owner.
#  - identity: gitops.commit() needs a name/email or every commit fails.
RUN git config --system safe.directory /repo \
    && git config --system user.name "kb-api" \
    && git config --system user.email "kb-api@localhost"

WORKDIR /repo

# Single worker: the write path serializes on an in-process threading.Lock
# (server/main.py WRITE_LOCK). Never add --workers — multiple workers would
# break the single-writer invariant. WAL still gives read concurrency.
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]

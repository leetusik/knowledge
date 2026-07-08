---
title: "The Shared nginx Problem — Explained for Beginners"
date: 2026-07-02
tags:
  - docker
  - nginx
  - reverse-proxy
  - deployment
source:
  project: hi2vi_web
  repo: hi2vi_web
---

# The Shared nginx Problem — Explained for Beginners

> An educational write-up of a real production issue in this project: what the
> setup looks like today, why it is fragile, and how we plan to fix it.
> Written for a novice programmer — every piece of jargon is explained as it
> appears. (Operational source of truth: `docs/current/operations.md` and
> deferred job D2; this file is a teaching companion, not the runbook.)

---

## 1. The current situation

### One server, three websites

We run three websites on a **single cloud server** (an Oracle Cloud VM):

| Website | App | Docker Compose project |
|---|---|---|
| miracle.changple.ai | changple5 (Django + FastAPI + Next.js) | `changple5` |
| changple.ai | changple_web (Next.js) | `changple_web` |
| hi2vi.com | hi2vi (Next.js) — this repo | `hi2vi` |

Each app runs in **Docker containers**. A container is an isolated, disposable
box that runs one program. **Docker Compose** is a tool that starts a whole
group of containers from one config file (`compose.prod.yml`).

### The port problem, and the reverse proxy

When a browser opens `https://hi2vi.com`, the request arrives at the server on
**port 443** (the standard HTTPS port). Here is the catch: **only one program
on a machine can listen on a given port.** Three websites, one port 443 — so
they cannot each have their own front door.

The standard solution is a **reverse proxy**: one program owns ports 80/443,
looks at *which domain* the request asks for (the `Host` header), and forwards
it to the right app internally. We use **nginx** for this.

### What our traffic actually looks like

```
                         Internet
                            │
                       Cloudflare  (TLS, caching, hides our server IP)
                            │
        ┌───────────────────┴──────────────────────┐
        │              our one server              │
        │                                          │
        │  changple5-nginx-1  ◄── owns ports 80/443│
        │   ├─ Host: miracle.changple.ai ─► changple5 app containers
        │   └─ Host: hi2vi.com ──────────► hi2vi-web container  ★
        │                                          │
        │  changple_web-nginx-1 ◄── ports 8080/8443│
        │   └─ Host: changple.ai ────────► changple_web container
        └──────────────────────────────────────────┘
```

The important line is the one marked ★: **hi2vi has no nginx of its own.** To
go live quickly, we added hi2vi as a "co-tenant" behind **changple5's** nginx
container (named `changple5-nginx-1`). That nginx belongs to the changple5
project — hi2vi is a guest in someone else's house.

And it works! hi2vi.com is live. So what's the problem?

---

## 2. The cause: state that lives in the wrong place

### Containers are disposable — that's the whole point

A Docker **image** is a frozen template (like a class). A **container** is a
running instance made from it (like an object). When you "redeploy" an app,
Docker throws the old container away and creates a fresh one from the new
image. Anything you changed *inside* the old container — files you copied in,
settings you tweaked at runtime — is **gone**. This layer of in-container
changes is called the **writable layer**, and it dies with the container.

That disposability is a feature: it forces all real configuration to live in
files *outside* the container (the compose file, mounted config files), so any
container can be rebuilt from scratch identically. Configuration written down
in files like this is called **declarative** — the files declare the desired
state, and the tool makes reality match.

### How hi2vi was wired in — three undeclared changes

At launch time, changple5's nginx was already running and we did not want to
disturb it. So hi2vi was attached to the *running* container with three
runtime commands:

1. `docker cp hi2vi.conf changple5-nginx-1:/etc/nginx/conf.d/` — copied our
   nginx config **into the writable layer**.
2. `docker cp` the hi2vi.com TLS certificate + key — also **writable layer**.
3. `docker network connect changple_shared_network changple5-nginx-1` —
   attached the nginx container to the private Docker network where the
   `hi2vi-web` container lives. This is **runtime state**, not in any file.

None of these three changes exist in changple5's `compose.prod.yml`. Docker
Compose doesn't know they happened. So the moment that nginx container is
**recreated**, Compose rebuilds it from what the file says — and the file says
nothing about hi2vi. All three changes silently vanish.

When that happens: changple keeps working perfectly (its own config and certs
are properly declared in its compose file), but hi2vi.com starts returning an
error (Cloudflare error 526) until someone runs our repair script,
`deploy/edge/apply-to-edge.sh`, which re-does the three steps.

### "But who would recreate that container?" — the deploy does, automatically

This is the part that surprised us. In changple5's `compose.prod.yml`, the
nginx service declares:

```yaml
nginx:
  depends_on:
    nextjs_frontend:  { condition: service_healthy }
    django_backend:   { condition: service_healthy }
    fastapi_agent:    { condition: service_healthy }
```

`depends_on` means "start me after these are healthy". But it has a side
effect: **when Docker Compose recreates a service, it also recreates the
services that depend on it.** Every real changple5 deploy rebuilds the app
images → the app containers get recreated → the cascade reaches nginx → the
shared nginx is recreated → hi2vi's three undeclared changes are wiped.

So it is not "some rare maintenance event" that breaks hi2vi. It is **every
ordinary changple5 deploy**.

### The lesson in one sentence

> If configuration only exists inside a running container (or only in a
> command someone once typed), it *will* eventually be lost. Everything must
> be written down in files that the tooling reads when it rebuilds the world.

---

## 3. The proposed fix

### The principle

Two things need to change, and they are separate:

1. **Make hi2vi's edge config declarative** — conf, certs, and network
   membership must live in config files, not in a container's writable layer.
2. **Decouple the shared nginx from any one app's lifecycle** — deploying an
   app should not be *able* to touch the front door, by construction.

### Option A — the minimal patch (declarative, still coupled)

Edit changple5's `compose.prod.yml`: bind-mount hi2vi's conf and certs into
the nginx service (a **bind mount** maps a file on the host into the
container, so it survives recreation) and add `changple_shared_network` to its
`networks:` list. One file changed, one planned restart.

This fixes problem 1 — a recreated nginx now comes back with hi2vi intact.
But problem 2 remains: hi2vi's front door still gets restarted whenever
changple5 deploys, and the edge config for *our* site lives in *their* repo.

### Option B — a dedicated edge stack (the chosen fix)

Pull nginx out into its own tiny Compose project that serves **all three
sites** and belongs to **no app**:

```
edge/
  compose.yml          # one pinned nginx image, ports 80:80 / 443:443
  conf.d/
    00-default.conf    # catch-all: unknown domains get closed (444)
    changple5.conf     # miracle.changple.ai
    changple-web.conf  # changple.ai
    hi2vi.conf         # hi2vi.com
  certs/               # TLS certs, on the server only (never in git)
  deploy.sh            # config-test (nginx -t) then graceful reload
```

The design rules, and why each exists:

- **No `depends_on` at all.** The edge must not care whether any app is up.
  This deletes the recreation cascade — an app deploy *cannot* touch the edge.
- **Every site's config uses Docker's internal DNS with re-resolution**
  (`resolver 127.0.0.11 valid=30s` + a variable in `proxy_pass`). Without
  this, nginx looks up an app container's IP address once at startup and
  caches it forever — so after the app redeploys (new container, new IP),
  nginx would forward traffic to a dead address. With it, nginx re-checks the
  name every 30 seconds and follows the app wherever it goes.
- **Config and certs are bind-mounted, read-only.** Recreating the edge
  container is now always safe — it self-heals from the files.
- **The image version is pinned.** The edge changes only when we decide.
  Routine config edits are applied with a config test (`nginx -t`) and a
  **graceful reload** (nginx re-reads config without dropping connections) —
  never by recreating the container.
- Side benefits: changple_web's odd "second nginx on ports 8080/8443"
  workaround (which only existed because changple5's nginx hogged 80/443) can
  be retired, and adding a fourth site someday = drop in one conf file + one
  cert, reload. No app is redeployed.

After this:

```
Cloudflare ──► edge nginx (its own project, ports 80/443)
                 ├─ miracle.changple.ai ─► changple5 containers
                 ├─ changple.ai ─────────► changple_web container
                 └─ hi2vi.com ───────────► hi2vi-web container

  each app deploys independently; none of them can touch the edge
```

### Migration, briefly

All the risky work is prepared off the server first (write the configs,
validate them). Then one short maintenance window: remove the nginx service
from changple5's project (frees ports 80/443), start the edge project
(seconds of downtime), verify all three domains. changple_web's extra nginx
is folded in afterwards at leisure. The repair script
`deploy/edge/apply-to-edge.sh` is kept as a historical break-glass tool.

### Until the fix lands

The operational rule of thumb: **after any changple5 deploy, assume hi2vi.com
is down** — probe it, and if it errors, run
`bash deploy/edge/apply-to-edge.sh` on the server. Recovery takes seconds;
the point of the fix is that nobody should have to remember this.

---

## Mini-glossary

- **Container / image** — a running instance / the frozen template it's made from.
- **Writable layer** — a container's in-place file changes; destroyed with the container.
- **Bind mount** — a host file/folder mapped into a container; survives recreation.
- **Declarative config** — desired state written in files the tooling replays; the opposite of hand-typed runtime commands.
- **Reverse proxy** — the single front-door process that routes requests to apps by domain name.
- **`depends_on` cascade** — Compose recreates dependents when their dependencies are recreated.
- **Graceful reload** — nginx re-reads config without dropping in-flight connections (`nginx -s reload`), as opposed to a restart.
- **Cloudflare 526** — Cloudflare reached our server but got an invalid TLS certificate — exactly what a wiped hi2vi cert looks like from outside.

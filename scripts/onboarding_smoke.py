#!/usr/bin/env python3
"""End-to-end onboarding + cross-tenant isolation smoke for the SaaS API (P10.S6).

Committed operational smoke — the post-deploy verifier for the two-plane app. It
drives the whole SaaS onboarding flow over HTTP against a running instance and
asserts a fresh tenant is fully isolated from tenant #1's corpus:

  1. Onboard a brand-new tenant B (unique email):
       POST /auth/signup            -> 201, session token
       POST /app/projects           -> 201, project id
       POST …/{id}/credentials      -> 201, a `vk_` ingest key (once)
       POST /api/documents (vk_)    -> 201, the frozen consumer-contract shape
       GET  /api/search  (vk_)      -> B finds its own doc
       GET  /api/documents (vk_)    -> B lists only its own doc
  2. Isolation — with B's `vk_`, B can see NONE of tenant #1's corpus:
       GET /api/documents            -> never contains a tenant-#1 rel_path
       GET /api/search?q=<T1 word>   -> never returns the tenant-#1 doc
       GET /api/documents/by-path/{T1 rel_path} -> 404
     and, when --master-token is given, the SAME by-path GET with the master
     bearer (the KB_API_TOKEN legacy tenant-#1 bearer) -> 200 (tenant #1 sees
     its own corpus). The tenant-#1 fixtures (a real rel_path + a title word)
     are auto-derived from the master bearer's own listing, so nothing about
     tenant #1's content is hardcoded; without --master-token the tenant-#1-
     specific checks are skipped (B-only isolation still runs).
  3. Usage — with B's session token, GET /app/usage + /app/projects/{id}/usage
     assert B's one write + search(es) are metered (documents_created == 1,
     searches >= 1, 30 zero-filled daily buckets), the vk_ key's last_used_at is
     set, and a foreign project id -> 404 (usage is tenant-scoped).
  4. Org-model journey (P18) — in its OWN fresh tenant C (so the tenant-B checks
     above stay pristine): signup auto-provisions a "default" org + "default"
     project (the additive `project` field on the signup response, also visible
     via GET /app/projects); ONE org-level key (POST /app/credentials, project_id
     NULL) writes docs to TWO never-pre-created project names — proving get-or-create
     registers both (they appear in /app/projects) and that usage meters per NAMED
     project (documents_created == 1 each); DELETE /app/credentials/{id} revokes the
     org key and a subsequent write with it -> 401; and a project-bound key
     (POST /app/projects/{id}/credentials) still mints + writes (regression).
  5. Public-link leg (P19) — inside the section-4 tenant, with the org key still
     live: ONE org-key write of an html-format doc to a fresh project (asserts the
     201 `url` ends `/documents/{id}` — the S4 mode-aware save URL); the doc is
     private by default, so an anonymous GET /app/documents/{id} -> 404. A session
     PATCH /app/projects/{id} {"visibility":"public"} then flips it, and anonymously
     (no bearer): GET /app/documents/{id} -> 200 JSON with NO tenant_id key; its /raw
     -> 200 + the P16 sandbox CSP header byte-for-byte; GET /app/graph?org={tenant}
     -> 200 with the doc's rel_path among the nodes; GET /app/graph?org={random} ->
     404 (no existence leak). With web pages in scope (default; --skip-web-pages
     opts out when the Next app is not up), the same-origin public pages answer too:
     anonymous GET {the 201 url} -> 200 HTML and GET /graph/{tenant} -> 200 HTML.
     A PATCH back to private then restores the 404 (anonymous doc read) and, with web
     pages in scope, a /login redirect on the doc page — an instant-toggle round-trip
     that leaves the throwaway tenant private.

Style mirrors scripts/site_smoke.py: argparse, collect ALL failures, exit
non-zero with the list or print PASS. Requires the app in TENANT mode
(DATABASE_URL set) so `vk_`/master-bearer resolution is live; section 4 also
requires the P18 schema (alembic 0003 — org-level credentials + get-or-create
projects) and the additive /app/credentials endpoints; section 5 requires the P19
schema (alembic 0004 — projects.visibility) and the anonymous read surface.

Usage:
    python scripts/onboarding_smoke.py --base-url http://127.0.0.1:8765
    python scripts/onboarding_smoke.py --base-url … --master-token "$KB_API_TOKEN"
    # local: the Next web app is usually not up — skip the same-origin page checks
    python scripts/onboarding_smoke.py --base-url … --skip-web-pages
"""

from __future__ import annotations

import argparse
import datetime
import secrets
import sys
import uuid

import httpx

# Keys the frozen POST /api/documents 201 guarantees (see docs/current/api.md
# §"Frozen consumer contract (P8)"). commit_error/push_error are optional.
FROZEN_201_KEYS = {
    "id", "rel_path", "url", "title", "project", "slug", "date", "tags",
    "related", "recent_updated", "landing_created", "committed", "commit_sha",
    "pushed",
}


def _word_from_title(title: str) -> str | None:
    """Pick a distinctive lowercase alphanumeric token (>3 chars) from a title,
    for the cross-tenant search-isolation probe. None if the title has none."""
    words = sorted(
        (w for w in "".join(c if c.isalnum() else " " for c in title).split() if len(w) > 3),
        key=len,
        reverse=True,
    )
    return words[0].lower() if words else None


def _run_public_link_leg(
    client: httpx.Client,
    base_url: str,
    session: dict[str, str],
    org_auth: dict[str, str],
    tenant_uuid: str | None,
    hexid: str,
    today: str,
    failures: list[str],
    skip_web_pages: bool,
) -> str:
    """P19 public-link leg: write an html doc, flip visibility, verify the anonymous
    read surface, toggle back. Runs inside the section-4 tenant with the org key still
    live (BEFORE the revoke). Appends failures; returns a one-line note.

    A fresh project keeps the per-project usage assertions (proj_a/proj_b == 1) pristine.
    """
    proj = f"org-smoke-public-{hexid}"
    html = (
        "<!DOCTYPE html>\n<html><head><title>Public link smoke</title></head>"
        "<body><h1>Public link smoke</h1><p>Anonymous read probe.</p></body></html>\n"
    )

    # --- 1. org-key html write -> get-or-creates a fresh project ---------------
    r = client.post(
        f"{base_url}/api/documents",
        headers=org_auth,
        json={
            "title": "Public link smoke",
            "markdown": html,
            "project": proj,
            "tags": ["smoke", "public"],
            "source_repo": "onboarding-smoke",
            "slug": f"public-link-{hexid}",
            "date": today,
            "format": "html",
        },
    )
    if r.status_code != 201:
        failures.append(
            f"[public] POST /api/documents (html, org key): expected 201, got {r.status_code} {r.text}"
        )
        return "public-link leg aborted at html write"
    doc = r.json()
    doc_id = doc.get("id")
    rel_path = doc.get("rel_path")
    url = doc.get("url")
    # S4 mode-aware save URL — value assertion on the frozen `url` key.
    if not isinstance(url, str) or not url.endswith(f"/documents/{doc_id}"):
        failures.append(f"[public] 201 url must end '/documents/{doc_id}', got {url!r}")

    # --- 2. anonymous read BEFORE public -> 404 (private default; negative first)
    r = client.get(f"{base_url}/app/documents/{doc_id}")
    if r.status_code != 404:
        failures.append(
            f"[public] anon GET /app/documents/{doc_id} (still private): expected 404, "
            f"got {r.status_code} {r.text}"
        )

    # --- 3. find the project + flip it public ----------------------------------
    r = client.get(f"{base_url}/app/projects", headers=session)
    proj_id = None
    if r.status_code == 200:
        proj_id = next(
            (p.get("id") for p in r.json().get("projects", []) if p.get("name") == proj), None
        )
    if not proj_id:
        failures.append(f"[public] project {proj!r} not found in /app/projects; cannot toggle")
        return "public-link leg aborted (no project id)"
    r = client.patch(
        f"{base_url}/app/projects/{proj_id}", headers=session, json={"visibility": "public"}
    )
    if r.status_code != 200:
        failures.append(
            f"[public] PATCH /app/projects/{{id}} visibility=public: expected 200, got "
            f"{r.status_code} {r.text}"
        )
        return "public-link leg aborted at PATCH public"
    if r.json().get("project", {}).get("visibility") != "public":
        failures.append(f"[public] PATCH did not echo visibility=public: {r.text}")

    # --- 4. anonymous reads now succeed (no bearer at all) ---------------------
    r = client.get(f"{base_url}/app/documents/{doc_id}")
    if r.status_code != 200:
        failures.append(
            f"[public] anon GET /app/documents/{doc_id} (public): expected 200, got "
            f"{r.status_code} {r.text}"
        )
    elif "tenant_id" in r.json():
        failures.append(f"[public] anon doc JSON leaked tenant_id: {sorted(r.json().keys())}")

    r = client.get(f"{base_url}/app/documents/{doc_id}/raw")
    if r.status_code != 200:
        failures.append(
            f"[public] anon GET /app/documents/{doc_id}/raw (public): expected 200, got "
            f"{r.status_code} {r.text}"
        )
    else:
        csp = r.headers.get("content-security-policy")
        if csp != "sandbox allow-scripts; frame-ancestors 'self'":
            failures.append(f"[public] /raw CSP sandbox header wrong/absent: {csp!r}")

    if tenant_uuid:
        r = client.get(f"{base_url}/app/graph", params={"org": tenant_uuid})
        if r.status_code != 200:
            failures.append(
                f"[public] anon GET /app/graph?org={{tenant}}: expected 200, got "
                f"{r.status_code} {r.text}"
            )
        else:
            node_ids = {n.get("id") for n in r.json().get("nodes", [])}
            if rel_path not in node_ids:
                failures.append(
                    f"[public] public graph missing the public doc node {rel_path!r}: {sorted(node_ids)}"
                )
    else:
        failures.append("[public] no tenant uuid from signup payload; cannot probe the public graph")

    r = client.get(f"{base_url}/app/graph", params={"org": str(uuid.uuid4())})
    if r.status_code != 404:
        failures.append(
            f"[public] anon GET /app/graph?org={{random}}: expected 404, got {r.status_code} {r.text}"
        )

    # --- 5. same-origin public web pages (skippable when the Next app is down) --
    if not skip_web_pages and isinstance(url, str):
        r = client.get(url)
        if r.status_code != 200 or "text/html" not in r.headers.get("content-type", ""):
            failures.append(
                f"[public] anon GET {url} (public doc page): expected 200 HTML, got "
                f"{r.status_code} {r.headers.get('content-type')!r}"
            )
        if tenant_uuid:
            r = client.get(f"{base_url}/graph/{tenant_uuid}")
            if r.status_code != 200 or "text/html" not in r.headers.get("content-type", ""):
                failures.append(
                    f"[public] anon GET /graph/{{tenant}} (public graph page): expected 200 HTML, "
                    f"got {r.status_code} {r.headers.get('content-type')!r}"
                )

    # --- 6. toggle back to private -> the anonymous surface closes again -------
    r = client.patch(
        f"{base_url}/app/projects/{proj_id}", headers=session, json={"visibility": "private"}
    )
    if r.status_code != 200:
        failures.append(
            f"[public] PATCH /app/projects/{{id}} visibility=private (toggle back): expected 200, "
            f"got {r.status_code} {r.text}"
        )
    if not skip_web_pages and isinstance(url, str):
        r = client.get(url)
        loc = r.headers.get("location", "")
        if r.status_code not in (302, 303, 307, 308) or "/login" not in loc:
            failures.append(
                f"[public] anon GET {url} (now private): expected a /login redirect, got "
                f"{r.status_code} location={loc!r}"
            )
    r = client.get(f"{base_url}/app/documents/{doc_id}")
    if r.status_code != 404:
        failures.append(
            f"[public] anon GET /app/documents/{doc_id} (private again): expected 404, got "
            f"{r.status_code} {r.text}"
        )

    web = "skipped" if skip_web_pages else "pages OK"
    return f"public-link (private->public->private, web {web})"


def _run_org_journey(
    client: httpx.Client, base_url: str, failures: list[str], skip_web_pages: bool
) -> str:
    """P18 org-model journey in its OWN fresh tenant (keeps the tenant-B checks
    above pristine). Appends failures; returns a one-line note.

    Signup auto-provisions a default org + default project; ONE org key writes to
    TWO never-pre-created project names (get-or-create); usage meters per named
    project; the org key revokes -> a later write 401s; a project-bound key still
    works. Bails out of just this section (returns) on a hard failure.
    """
    hexid = secrets.token_hex(6)
    email = f"onboard-smoke-org+{hexid}@example.com"
    proj_a = f"org-smoke-alpha-{hexid}"
    proj_b = f"org-smoke-beta-{hexid}"
    today = datetime.date.today().isoformat()

    def _write(auth: dict[str, str], project: str, slug: str, title: str):
        return client.post(
            f"{base_url}/api/documents",
            headers=auth,
            json={
                "title": title,
                "markdown": f"# {title}\n\nProbe for {project}.\n",
                "project": project,
                "tags": ["smoke", "org"],
                "source_repo": "onboarding-smoke",
                "slug": slug,
                "date": today,
            },
        )

    # --- signup: additive `project` field + auto default project ---------------
    r = client.post(
        f"{base_url}/auth/signup",
        json={"email": email, "password": f"smoke-pw-{hexid}"},
    )
    if r.status_code != 201:
        failures.append(f"[org] POST /auth/signup: expected 201, got {r.status_code} {r.text}")
        return "org journey aborted at signup"
    body = r.json()
    session = {"Authorization": f"Bearer {body.get('token')}"}
    tenant_uuid = (body.get("tenant") or {}).get("id")  # for the P19 public-graph probe
    default_project = body.get("project")
    if not isinstance(default_project, dict) or default_project.get("name") != "default":
        failures.append(
            f"[org] POST /auth/signup: expected additive project.name=='default', "
            f"got {default_project!r}"
        )

    r = client.get(f"{base_url}/app/projects", headers=session)
    if r.status_code != 200:
        failures.append(
            f"[org] GET /app/projects (initial): expected 200, got {r.status_code} {r.text}"
        )
    else:
        names = {p.get("name") for p in r.json().get("projects", [])}
        if "default" not in names:
            failures.append(
                f"[org] auto 'default' project missing from /app/projects: {sorted(names)}"
            )

    # --- mint ONE org-level key (project_id NULL) ------------------------------
    r = client.post(
        f"{base_url}/app/credentials", headers=session, json={"name": "org smoke key"}
    )
    if r.status_code != 201:
        failures.append(f"[org] POST /app/credentials: expected 201, got {r.status_code} {r.text}")
        return "org journey aborted at org-key mint"
    org_cred = r.json().get("credential", {})
    org_cred_id = org_cred.get("id")
    org_key = r.json().get("key")
    if org_cred.get("project_id") is not None:
        failures.append(
            f"[org] org key must serialize project_id=null, got {org_cred.get('project_id')!r}"
        )
    if not isinstance(org_key, str) or not org_key.startswith("vk_"):
        failures.append(f"[org] org key missing or not vk_-prefixed: {r.text}")
        return "org journey aborted (bad org vk_)"
    org_auth = {"Authorization": f"Bearer {org_key}"}

    # --- ONE org key writes to TWO project names (get-or-create) ---------------
    for name in (proj_a, proj_b):
        r = _write(org_auth, name, f"org-{name}", f"Org smoke {name}")
        if r.status_code != 201:
            failures.append(
                f"[org] POST /api/documents (org key -> {name}): expected 201, got "
                f"{r.status_code} {r.text}"
            )
            continue
        missing = FROZEN_201_KEYS - r.json().keys()
        if missing:
            failures.append(
                f"[org] POST /api/documents ({name}) 201 missing frozen keys: {sorted(missing)}"
            )

    # --- both names appear via get-or-create; capture their ids ----------------
    r = client.get(f"{base_url}/app/projects", headers=session)
    project_ids: dict[str, str] = {}
    if r.status_code != 200:
        failures.append(
            f"[org] GET /app/projects (post-write): expected 200, got {r.status_code} {r.text}"
        )
    else:
        project_ids = {p.get("name"): p.get("id") for p in r.json().get("projects", [])}
        for name in (proj_a, proj_b):
            if name not in project_ids:
                failures.append(
                    f"[org] get-or-create FAILED: {name!r} not in /app/projects after an org-key "
                    f"write (it was never explicitly created): {sorted(project_ids)}"
                )

    # --- usage metered per NAMED project (documents_created == 1 each) ---------
    for name in (proj_a, proj_b):
        pid = project_ids.get(name)
        if not pid:
            continue
        r = client.get(f"{base_url}/app/projects/{pid}/usage", headers=session)
        if r.status_code != 200:
            failures.append(
                f"[org] GET /app/projects/{{{name}}}/usage: expected 200, got {r.status_code} {r.text}"
            )
            continue
        created = r.json().get("totals", {}).get("documents_created")
        if created != 1:
            failures.append(
                f"[org] per-project usage for {name!r}: expected documents_created==1 "
                f"(one org-key write), got {created!r}"
            )

    # --- P19 public-link leg (org key still live; BEFORE the revoke) -----------
    public_note = _run_public_link_leg(
        client, base_url, session, org_auth, tenant_uuid, hexid, today, failures, skip_web_pages
    )

    # --- revoke the org key -> a subsequent write 401s -------------------------
    if org_cred_id:
        r = client.delete(f"{base_url}/app/credentials/{org_cred_id}", headers=session)
        if r.status_code != 204:
            failures.append(
                f"[org] DELETE /app/credentials/{{id}}: expected 204, got {r.status_code} {r.text}"
            )
        r = _write(org_auth, proj_a, "org-revoked", "Org smoke revoked")
        if r.status_code != 401:
            failures.append(
                f"[org] write with REVOKED org key: expected 401, got {r.status_code} {r.text}"
            )

    # --- regression: a project-bound key still mints + writes ------------------
    pid_a = project_ids.get(proj_a)
    if pid_a:
        r = client.post(
            f"{base_url}/app/projects/{pid_a}/credentials",
            headers=session,
            json={"name": "project-bound regression key"},
        )
        if r.status_code != 201:
            failures.append(
                f"[org] POST /app/projects/{{id}}/credentials (regression): expected 201, got "
                f"{r.status_code} {r.text}"
            )
        else:
            bound_cred = r.json().get("credential", {})
            bound_key = r.json().get("key")
            if bound_cred.get("project_id") != pid_a:
                failures.append(
                    f"[org] project-bound key must carry project_id=={pid_a!r}, got "
                    f"{bound_cred.get('project_id')!r}"
                )
            if isinstance(bound_key, str) and bound_key.startswith("vk_"):
                r = _write(
                    {"Authorization": f"Bearer {bound_key}"},
                    proj_a,
                    "bound-regression",
                    "Project-bound regression",
                )
                if r.status_code != 201:
                    failures.append(
                        f"[org] project-bound key write (regression): expected 201, got "
                        f"{r.status_code} {r.text}"
                    )
            else:
                failures.append(f"[org] project-bound regression key missing/not vk_: {r.text}")

    return (
        f"org journey OK ({email}): 1 org key -> 2 get-or-create projects, "
        f"per-project usage, revoke->401, project-bound regression; {public_note}"
    )


def run(
    base_url: str, master_token: str | None, failures: list[str], skip_web_pages: bool = False
) -> str:
    """Run the smoke; append failures. Returns a one-line summary."""
    base_url = base_url.rstrip("/")
    token_hex = secrets.token_hex(6)
    email = f"onboard-smoke+{token_hex}@example.com"
    unique_word = f"smoketoken{token_hex}"  # single FTS token, unique to B's doc
    project_name = "onboarding-smoke"

    with httpx.Client(timeout=15, follow_redirects=False) as client:
        # --- 1. Onboard tenant B ------------------------------------------
        r = client.post(
            f"{base_url}/auth/signup",
            json={"email": email, "password": f"smoke-pw-{token_hex}"},
        )
        if r.status_code != 201:
            failures.append(f"POST /auth/signup: expected 201, got {r.status_code} {r.text}")
            return "onboarding aborted at signup"
        session_token = r.json().get("token")
        if not isinstance(session_token, str) or not session_token:
            failures.append(f"POST /auth/signup: no session token in {r.text}")
            return "onboarding aborted (no session token)"
        session_auth = {"Authorization": f"Bearer {session_token}"}

        r = client.post(
            f"{base_url}/app/projects", headers=session_auth, json={"name": project_name}
        )
        if r.status_code != 201:
            failures.append(f"POST /app/projects: expected 201, got {r.status_code} {r.text}")
            return "onboarding aborted at project create"
        project_id = r.json().get("project", {}).get("id")
        if not project_id:
            failures.append(f"POST /app/projects: no project id in {r.text}")
            return "onboarding aborted (no project id)"

        r = client.post(
            f"{base_url}/app/projects/{project_id}/credentials",
            headers=session_auth,
            json={"name": "onboarding-smoke key"},
        )
        if r.status_code != 201:
            failures.append(
                f"POST /app/projects/{{id}}/credentials: expected 201, got {r.status_code} {r.text}"
            )
            return "onboarding aborted at credential mint"
        vk_key = r.json().get("key")
        if not isinstance(vk_key, str) or not vk_key.startswith("vk_"):
            failures.append(f"credential key missing or not vk_-prefixed: {r.text}")
            return "onboarding aborted (bad vk_ key)"
        vk_auth = {"Authorization": f"Bearer {vk_key}"}

        # --- Write B's doc (frozen POST /api/documents) -------------------
        today = datetime.date.today().isoformat()
        b_slug = f"smoke-{token_hex}"
        r = client.post(
            f"{base_url}/api/documents",
            headers=vk_auth,
            json={
                "title": f"Onboarding smoke {unique_word}",
                "markdown": f"# Onboarding smoke\n\nIsolation probe doc {unique_word}.\n",
                "project": project_name,
                "tags": ["smoke", "onboarding"],
                "source_repo": "onboarding-smoke",
                "slug": b_slug,
                "date": today,
            },
        )
        if r.status_code != 201:
            failures.append(f"POST /api/documents (vk_): expected 201, got {r.status_code} {r.text}")
            return "onboarding aborted at document write"
        b_doc = r.json()
        b_rel_path = b_doc.get("rel_path")
        missing_keys = FROZEN_201_KEYS - b_doc.keys()
        if missing_keys:
            failures.append(f"POST /api/documents 201 missing frozen keys: {sorted(missing_keys)}")

        # --- B finds its own doc ------------------------------------------
        r = client.get(f"{base_url}/api/search", headers=vk_auth, params={"q": unique_word})
        if r.status_code != 200:
            failures.append(f"GET /api/search (vk_): expected 200, got {r.status_code} {r.text}")
        else:
            hits = [d.get("rel_path") for d in r.json().get("results", [])]
            if b_rel_path not in hits:
                failures.append(
                    f"GET /api/search q={unique_word!r}: B does not find its own doc "
                    f"{b_rel_path!r} (results: {hits})"
                )

        r = client.get(f"{base_url}/api/documents", headers=vk_auth)
        b_list_paths: list[str] = []
        if r.status_code != 200:
            failures.append(f"GET /api/documents (vk_): expected 200, got {r.status_code} {r.text}")
        else:
            b_list_paths = [d.get("rel_path") for d in r.json().get("items", [])]
            if b_rel_path not in b_list_paths:
                failures.append(
                    f"GET /api/documents (vk_): B does not list its own doc {b_rel_path!r}"
                )

        # --- 2. Isolation from tenant #1 ----------------------------------
        # Derive tenant-#1 fixtures (a real rel_path + a title word) from the
        # master bearer's own listing — nothing about tenant #1 is hardcoded.
        t1_rel_path: str | None = None
        t1_word: str | None = None
        if master_token:
            master_auth = {"Authorization": f"Bearer {master_token}"}
            r = client.get(f"{base_url}/api/documents", headers=master_auth)
            if r.status_code != 200:
                failures.append(
                    f"GET /api/documents (master): expected 200, got {r.status_code} {r.text}"
                )
            else:
                t1_items = r.json().get("items", [])
                if t1_items:
                    t1_rel_path = t1_items[0].get("rel_path")
                    t1_word = _word_from_title(t1_items[0].get("title", ""))
                else:
                    failures.append(
                        "GET /api/documents (master): tenant #1 corpus is empty — "
                        "cannot verify cross-tenant isolation against real data "
                        "(seed + reindex tenant #1 first)"
                    )

        # B's own listing must never leak a tenant-#1 path.
        if t1_rel_path and t1_rel_path in b_list_paths:
            failures.append(
                f"ISOLATION LEAK: B's GET /api/documents contains tenant-#1 path {t1_rel_path!r}"
            )

        # B's search for a tenant-#1 word must not surface the tenant-#1 doc.
        if t1_word:
            r = client.get(f"{base_url}/api/search", headers=vk_auth, params={"q": t1_word})
            if r.status_code != 200:
                failures.append(
                    f"GET /api/search (vk_, T1 word): expected 200, got {r.status_code} {r.text}"
                )
            elif t1_rel_path in [d.get("rel_path") for d in r.json().get("results", [])]:
                failures.append(
                    f"ISOLATION LEAK: B's search q={t1_word!r} returned tenant-#1 doc {t1_rel_path!r}"
                )

        # B cannot fetch a tenant-#1 doc by its real path -> 404.
        if t1_rel_path:
            r = client.get(f"{base_url}/api/documents/by-path/{t1_rel_path}", headers=vk_auth)
            if r.status_code != 404:
                failures.append(
                    f"ISOLATION LEAK: B's GET by-path {t1_rel_path!r} expected 404, got "
                    f"{r.status_code} {r.text}"
                )
            # The master bearer (tenant #1) DOES see its own corpus by that path.
            r = client.get(
                f"{base_url}/api/documents/by-path/{t1_rel_path}",
                headers={"Authorization": f"Bearer {master_token}"},
            )
            if r.status_code != 200:
                failures.append(
                    f"GET by-path {t1_rel_path!r} (master): expected 200, got "
                    f"{r.status_code} {r.text}"
                )

        # --- 3. Usage metering: B's activity is metered + tenant-scoped ----
        # B wrote exactly one doc and searched >= 1 time via the metered /api/*
        # path. Metering is synchronous (recorded before each write/search
        # response returns), so /app/usage reflects it immediately.
        r = client.get(f"{base_url}/app/usage", headers=session_auth)
        if r.status_code != 200:
            failures.append(f"GET /app/usage: expected 200, got {r.status_code} {r.text}")
        else:
            usage = r.json()
            totals = usage.get("totals", {})
            # Fresh tenant B wrote exactly one doc. == 1 (not >= 1) also proves
            # cross-tenant isolation: tenant #1's writes must NOT leak into B's usage.
            if totals.get("documents_created") != 1:
                failures.append(
                    "GET /app/usage: expected totals.documents_created == 1 for fresh "
                    f"tenant B, got {totals.get('documents_created')!r} "
                    f"(metering or tenant isolation broken): {usage}"
                )
            if not isinstance(totals.get("searches"), int) or totals["searches"] < 1:
                failures.append(
                    "GET /app/usage: expected totals.searches >= 1, got "
                    f"{totals.get('searches')!r}: {usage}"
                )
            # Default 30-day window -> a contiguous, zero-filled 30-day series.
            if len(usage.get("daily_counts", [])) != 30:
                failures.append(
                    "GET /app/usage: expected 30 zero-filled daily_counts, got "
                    f"{len(usage.get('daily_counts', []))}"
                )
            # B's own project appears in the tenant's project list.
            if not any(p.get("id") == project_id for p in usage.get("projects", [])):
                failures.append(
                    f"GET /app/usage: B's project {project_id!r} missing from projects list"
                )

        # Per-project drill-down: B's project shows the write + its credential's recency.
        r = client.get(f"{base_url}/app/projects/{project_id}/usage", headers=session_auth)
        if r.status_code != 200:
            failures.append(
                f"GET /app/projects/{{id}}/usage: expected 200, got {r.status_code} {r.text}"
            )
        else:
            proj_usage = r.json()
            if proj_usage.get("totals", {}).get("documents_created") != 1:
                failures.append(
                    "GET /app/projects/{id}/usage: expected totals.documents_created == 1, got "
                    f"{proj_usage.get('totals', {}).get('documents_created')!r}: {proj_usage}"
                )
            # The vk_ key did metered work (write + search) -> last_used_at is set.
            creds = proj_usage.get("credentials", [])
            if not creds or not any(c.get("last_used_at") for c in creds):
                failures.append(
                    "GET /app/projects/{id}/usage: expected a credential with a non-null "
                    f"last_used_at (the vk_ key did metered work), got {creds}"
                )

        # Cross-tenant/missing project usage is scoped: a foreign project id -> 404, no leak.
        r = client.get(
            f"{base_url}/app/projects/{uuid.uuid4()}/usage", headers=session_auth
        )
        if r.status_code != 404:
            failures.append(
                f"GET /app/projects/<random>/usage: expected 404 (scoped), got "
                f"{r.status_code} {r.text}"
            )

        # --- 4. Org-model journey (P18) + P19 public-link leg, own tenant --
        org_note = _run_org_journey(client, base_url, failures, skip_web_pages)

    isolation = "isolation vs tenant #1 verified" if master_token else "B-only isolation (no --master-token)"
    return (
        f"tenant B onboarded ({email}), doc {b_rel_path}; {isolation}; usage metered; "
        f"{org_note}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8765", help="running app base URL")
    parser.add_argument(
        "--master-token",
        default=None,
        help="the KB_API_TOKEN legacy tenant-#1 bearer (enables the cross-tenant isolation checks)",
    )
    parser.add_argument(
        "--skip-web-pages",
        action="store_true",
        help="skip the P19 same-origin public web-page checks (use when the Next app is not up, "
        "e.g. a bare local uvicorn); the anonymous API surface is still exercised",
    )
    args = parser.parse_args()

    failures: list[str] = []
    try:
        summary = run(args.base_url, args.master_token, failures, args.skip_web_pages)
    except httpx.HTTPError as exc:
        failures.append(f"HTTP transport error against {args.base_url}: {exc}")
        summary = "aborted (transport error)"

    if failures:
        print(f"FAIL — {len(failures)} onboarding/isolation invariant(s) violated ({args.base_url}):")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print(f"PASS — {summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

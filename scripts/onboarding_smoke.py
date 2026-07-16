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

Style mirrors scripts/site_smoke.py: argparse, collect ALL failures, exit
non-zero with the list or print PASS. Requires the app in TENANT mode
(DATABASE_URL set) so `vk_`/master-bearer resolution is live.

Usage:
    python scripts/onboarding_smoke.py --base-url http://127.0.0.1:8765
    python scripts/onboarding_smoke.py --base-url … --master-token "$KB_API_TOKEN"
"""

from __future__ import annotations

import argparse
import datetime
import secrets
import sys

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


def run(base_url: str, master_token: str | None, failures: list[str]) -> str:
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

    isolation = "isolation vs tenant #1 verified" if master_token else "B-only isolation (no --master-token)"
    return f"tenant B onboarded ({email}), doc {b_rel_path}; {isolation}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8765", help="running app base URL")
    parser.add_argument(
        "--master-token",
        default=None,
        help="the KB_API_TOKEN legacy tenant-#1 bearer (enables the cross-tenant isolation checks)",
    )
    args = parser.parse_args()

    failures: list[str] = []
    try:
        summary = run(args.base_url, args.master_token, failures)
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

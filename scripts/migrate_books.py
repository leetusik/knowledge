#!/usr/bin/env python3
"""Bind the existing library into books (P30.S6): an idempotent, link-preserving migration.

Reads a checked-in binding map (default ``scripts/migrations/p30_books.json``, made from
P29.S1's book map and reconciled against ``origin/main``) and drives the one write the
book model has for existing documents: ``PUT /api/books/{project}/{book}`` (P30.S2).

**What it never does:** it never calls the document publish endpoint and never sends a
document body, so no document file is rewritten — binding only writes the book's
manifest (``docs/.books/<project>/<book>.json``). It never binds a document the map lists
as loose. It never drops a chapter that already exists on the server: a mapped book that
already exists is *merged* (the server's chapters, fields and order are kept; the map's
missing chapters and variants are added), and any disagreement (a key bound to another
document, a document bound elsewhere) refuses the whole run before any write.

**Idempotent:** a book whose server state already equals the merged target is skipped
(no ``PUT`` at all), so a second ``--apply`` makes no call and no commit.

**Link preservation:** before and after, it records for every document on the server
(not only the mapped ones):

* ``GET /api/documents/{id}`` (bearer) — the content hash;
* ``GET /app/documents/{id}`` (operator session) — the backend of ``/documents/{id}``:
  content hash and ``canonical_path``;
* ``GET /app/orgs/{org}/{project}/{slug}`` — the backend of the pretty
  ``/@{org}/{project}/{slug}`` URL: the id it resolves to and the content hash;
* ``GET /app/documents/{id}/raw`` for an html document — the hash of the bytes the
  reader's iframe renders.

Every one must answer 200 before (else ``--apply`` refuses) and must be identical after.
The content hash covers the document's own fields (id, rel_path, project, slug, date,
title, version, format, markdown, source), never the additive book fields.

Modes::

    # dry run (the default): the plan, every PUT body, the diff, and the pre-flight
    uv run python scripts/migrate_books.py --api-base https://knowledge.hi2vi.com

    # apply: make the PUTs, then verify books and every URL
    uv run python scripts/migrate_books.py --api-base ... --apply --report out.json

Credentials come from the environment only (never hard-code a key):

* ``KB_API_TOKEN`` — the bearer for ``/api`` (the master token, tenant #1's library);
* ``KB_SESSION_TOKEN`` — an operator session token for the ``/app`` checks; or
  ``KB_LOGIN_EMAIL`` + ``KB_LOGIN_PASSWORD``, with which the tool logs in and out itself.

Without a session the ``/app`` checks cannot run; ``--apply`` then refuses unless
``--skip-app-checks`` is given explicitly. Exit codes: 0 ok, 1 a verification or write
failure, 2 refused before any write (bad map, conflict, failed pre-flight, missing creds).
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
import sys
from pathlib import Path, PurePosixPath
from typing import Any, Optional

import httpx

DEFAULT_MAP = Path(__file__).resolve().parent / "migrations" / "p30_books.json"
USER_AGENT = "kb-migrate-books/1 (P30.S6)"
CONTENT_FIELDS = (
    "id", "rel_path", "project", "slug", "date", "title", "version", "format",
    "markdown", "source",
)
_KEY_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
_DOC_FIELDS = ("title", "kind", "subject", "description")
_PAGE = 200


class Refused(Exception):
    """A reason to stop before any write (exit 2)."""


# --- the map ------------------------------------------------------------------


def load_map(path: Path) -> dict:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    errors = check_map(data)
    if errors:
        raise Refused("the binding map is invalid:\n  " + "\n  ".join(errors))
    return data


def check_map(data: Any) -> list[str]:
    """Structural checks on the map, so a typo fails in the dry run, not at PUT."""
    errors: list[str] = []
    if not isinstance(data, dict) or not isinstance(data.get("books"), dict):
        return ["the map needs a 'books' object"]
    seen: dict[str, str] = {}
    for project, books in data["books"].items():
        for slug, book in books.items():
            where = f"{project}/{slug}"
            if not _KEY_RE.match(slug):
                errors.append(f"{where}: invalid book slug")
            if not book.get("title") or book.get("kind") not in ("codebase", "subject"):
                errors.append(f"{where}: needs a title and kind codebase|subject")
            keys: set[str] = set()
            for ch in book.get("chapters", []):
                key = ch.get("key", "")
                if not _KEY_RE.match(key) or len(key) > 80 or key in keys:
                    errors.append(f"{where}: bad or duplicate chapter key {key!r}")
                keys.add(key)
                if not isinstance(ch.get("position"), (int, float)):
                    errors.append(f"{where}/{key}: position is required")
                variants = ch.get("variants") or {}
                if not variants:
                    errors.append(f"{where}/{key}: no variants")
                for lang, rel in variants.items():
                    p = PurePosixPath(rel)
                    if p.parts[:1] != (project,) or p.suffix not in (".md", ".html"):
                        errors.append(f"{where}/{key}: {rel} is not a document of {project}")
                    if rel in seen:
                        errors.append(f"{rel} is mapped twice ({seen[rel]} and {where}/{key})")
                    seen[rel] = f"{where}/{key}"
    for item in data.get("loose", []):
        rel = item.get("rel_path")
        if rel in seen:
            errors.append(f"{rel} is listed loose but mapped to {seen[rel]}")
    return errors


def map_chapter(ch: dict) -> dict:
    """A map chapter as a manifest chapter: documentation fields stripped."""
    out = {"key": ch["key"], "position": _num(ch["position"])}
    if ch.get("title"):
        out["title"] = ch["title"]
    out["variants"] = dict(sorted(ch["variants"].items()))
    if ch.get("source"):
        out["source"] = dict(ch["source"])
    return out


def _num(value):
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def canonical(manifest: dict) -> dict:
    """A manifest in comparable form: fields fixed, chapters sorted, nulls omitted."""
    chapters = []
    for ch in manifest.get("chapters", []):
        c = {"key": ch["key"], "position": _num(ch["position"])}
        if ch.get("title"):
            c["title"] = ch["title"]
        c["variants"] = dict(sorted(ch.get("variants", {}).items()))
        if ch.get("source"):
            c["source"] = dict(sorted(ch["source"].items()))
        chapters.append(c)
    chapters.sort(key=lambda c: (c["position"], c["key"]))
    out = {k: manifest.get(k) for k in _DOC_FIELDS}
    out["chapters"] = chapters
    return out


# --- the server ----------------------------------------------------------------


class Api:
    """The only calls the tool makes: GETs, ``PUT /api/books``, and login/logout."""

    def __init__(self, client: httpx.Client, *, token: Optional[str], session: Optional[str]):
        self.client = client
        self.token = token
        self.session = session
        self.puts: list[str] = []

    def _headers(self, auth: Optional[str]) -> dict[str, str]:
        tok = {"bearer": self.token, "session": self.session}.get(auth) if auth else None
        return {"Authorization": f"Bearer {tok}"} if tok else {}

    def get(self, path: str, auth: Optional[str] = "bearer") -> httpx.Response:
        return self.client.get(path, headers=self._headers(auth))

    def get_json(self, path: str, auth: Optional[str] = "bearer") -> Any:
        r = self.get(path, auth)
        if r.status_code != 200:
            raise Refused(f"GET {path} answered {r.status_code}: {r.text[:300]}")
        return r.json()

    def put_book(self, project: str, book: str, body: dict) -> httpx.Response:
        path = f"/api/books/{project}/{book}"
        self.puts.append(path)
        return self.client.put(path, json=body, headers=self._headers("bearer"))


def list_documents(api: Api) -> list[dict]:
    items: list[dict] = []
    offset = 0
    while True:
        page = api.get_json(f"/api/documents?limit={_PAGE}&offset={offset}")
        items.extend(page["items"])
        offset += _PAGE
        if not page["items"] or offset >= page["total"]:
            return items


def server_books(api: Api) -> dict[tuple[str, str], dict]:
    """Every book of the caller, in manifest form, plus each chapter's live variants."""
    out = {}
    for item in api.get_json("/api/books")["items"]:
        book = api.get_json(f"/api/books/{item['project']}/{item['slug']}")
        out[(book["project"], book["slug"])] = {
            **{k: book.get(k) for k in _DOC_FIELDS},
            "chapters": [
                {
                    "key": ch["key"],
                    "position": _num(ch["position"]),
                    "title": ch.get("title"),
                    "source": ch.get("source"),
                    "variants": {v["lang"]: v["rel_path"] for v in ch.get("variants", [])},
                }
                for ch in book.get("chapters", [])
            ],
        }
    return out


# --- planning ------------------------------------------------------------------


def plan(data: dict, docs: list[dict], books: dict[tuple[str, str], dict]) -> dict:
    """The merged target per mapped book, its action and diff, and every conflict."""
    doc_paths = {d["rel_path"] for d in docs}
    bound_at: dict[str, tuple[str, str, str]] = {}
    for (project, slug), book in books.items():
        for ch in book["chapters"]:
            for rel in ch["variants"].values():
                bound_at[rel] = (project, slug, ch["key"])

    conflicts: list[str] = []
    entries = []
    mapped: set[str] = set()
    for project, mbooks in data["books"].items():
        for slug, mbook in mbooks.items():
            current = books.get((project, slug))
            diff: list[str] = []
            if current is None:
                target = {
                    **{k: mbook.get(k) for k in _DOC_FIELDS},
                    "chapters": [map_chapter(c) for c in mbook["chapters"]],
                }
                diff.append(f"+ book {project}/{slug} {mbook['title']!r} ({mbook['kind']})")
                for c in target["chapters"]:
                    diff.append(f"  + chapter {c['key']} @{c['position']} {c['variants']}")
            else:
                target = copy.deepcopy(current)
                for k in _DOC_FIELDS:
                    if mbook.get(k) is not None and mbook.get(k) != current.get(k):
                        diff.append(f"  = keep server {k} {current.get(k)!r} (map says {mbook.get(k)!r})")
                by_key = {c["key"]: c for c in target["chapters"]}
                for mc in (map_chapter(c) for c in mbook["chapters"]):
                    sc = by_key.get(mc["key"])
                    if sc is None:
                        target["chapters"].append(mc)
                        diff.append(f"  + chapter {mc['key']} @{mc['position']} {mc['variants']}")
                        continue
                    for lang, rel in mc["variants"].items():
                        have = sc["variants"].get(lang)
                        if have is None:
                            sc["variants"][lang] = rel
                            diff.append(f"  + variant {mc['key']}/{lang} = {rel}")
                        elif have != rel:
                            conflicts.append(
                                f"{project}/{slug} chapter {mc['key']!r} {lang} is {have} on the "
                                f"server, the map says {rel}"
                            )
                mapped_keys = {c["key"] for c in mbook["chapters"]}
                for c in current["chapters"]:
                    if c["key"] not in mapped_keys:
                        diff.append(f"  = keep server chapter {c['key']} (not in the map)")
            for ch in mbook["chapters"]:
                for lang, rel in ch["variants"].items():
                    mapped.add(rel)
                    if rel not in doc_paths:
                        conflicts.append(f"{rel} (mapped to {project}/{slug}) is not a document on the server")
                    elsewhere = bound_at.get(rel)
                    if elsewhere and elsewhere != (project, slug, ch["key"]):
                        conflicts.append(
                            f"{rel} is already chapter {elsewhere[2]!r} of {elsewhere[0]}/{elsewhere[1]}"
                        )
            for c in target["chapters"]:
                if not c["variants"]:
                    conflicts.append(f"{project}/{slug} chapter {c['key']!r} has no live variant")
            same = current is not None and canonical(current) == canonical(target)
            action = "unchanged" if same else ("create" if current is None else "update")
            entries.append({
                "project": project, "book": slug, "action": action,
                "target": canonical(target), "diff": [] if same else diff,
            })

    loose = [item["rel_path"] for item in data.get("loose", [])]
    for rel in loose:
        if rel not in doc_paths:
            conflicts.append(f"{rel} (listed loose) is not a document on the server")
        if rel in bound_at:
            conflicts.append(f"{rel} is listed loose but the server binds it in {bound_at[rel][:2]}")
    unmapped = sorted(doc_paths - mapped - set(loose))
    return {"books": entries, "conflicts": conflicts, "loose": loose, "unmapped": unmapped}


def put_body(target: dict) -> dict:
    return {**{k: target[k] for k in _DOC_FIELDS}, "chapters": target["chapters"]}


# --- the link snapshot ---------------------------------------------------------


def content_hash(doc: dict) -> str:
    picked = {k: doc.get(k) for k in CONTENT_FIELDS}
    raw = json.dumps(picked, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def snapshot(api: Api, docs: list[dict], *, app_checks: bool) -> dict[str, dict]:
    """``{check: {status, doc_id, hash[, canonical_path]}}`` for every document."""
    snap: dict[str, dict] = {}

    def record(name: str, r: httpx.Response, *, is_json: bool = True, extra=None):
        entry: dict[str, Any] = {"status": r.status_code, "doc_id": None, "hash": None}
        if r.status_code == 200:
            if is_json:
                body = r.json()
                entry["doc_id"] = body.get("id")
                entry["hash"] = content_hash(body)
                if extra:
                    entry.update({k: body.get(k) for k in extra})
            else:
                entry["hash"] = hashlib.sha256(r.content).hexdigest()
        snap[name] = entry
        return entry

    for d in sorted(docs, key=lambda x: x["id"]):
        did = d["id"]
        record(f"api /api/documents/{did}", api.get(f"/api/documents/{did}"))
        if not app_checks:
            continue
        e = record(
            f"url /documents/{did}", api.get(f"/app/documents/{did}", "session"),
            extra=("canonical_path",),
        )
        pretty = e.get("canonical_path")
        if pretty:
            record(f"url {pretty}", api.get("/app/orgs/" + pretty.removeprefix("/@"), "session"))
        if d.get("format") == "html":
            record(
                f"url /documents/{did} (raw)",
                api.get(f"/app/documents/{did}/raw", "session"), is_json=False,
            )
    return snap


def unresolved(snap: dict[str, dict]) -> list[str]:
    return [f"{name} answered {e['status']}" for name, e in snap.items() if e["status"] != 200]


def compare(before: dict[str, dict], after: dict[str, dict]) -> list[str]:
    failures = []
    for name, e in before.items():
        a = after.get(name)
        if a is None:
            failures.append(f"{name}: no longer checked (its canonical path changed?)")
        elif a != e:
            failures.append(f"{name}: was {e}, now {a}")
    for name in sorted(set(after) - set(before)):
        failures.append(f"{name}: new check after the run (a canonical path changed)")
    return failures


# --- the run -------------------------------------------------------------------


def run(api: Api, data: dict, *, apply: bool, app_checks: bool, out=print) -> dict:
    """Plan, pre-flight, optionally apply, verify. Returns the report (``ok`` key)."""
    errors = check_map(data)
    if errors:
        raise Refused("the binding map is invalid:\n  " + "\n  ".join(errors))
    docs = list_documents(api)
    books = server_books(api)
    p = plan(data, docs, books)
    report: dict[str, Any] = {
        "mode": "apply" if apply else "dry-run",
        "documents": len(docs),
        "app_checks": app_checks,
        "books": [{k: e[k] for k in ("project", "book", "action", "diff")} for e in p["books"]],
        "unmapped": p["unmapped"],
        "conflicts": p["conflicts"],
        "puts": [],
        "failures": [],
    }
    out(f"documents on the server: {len(docs)}; books on the server: {len(books)}")
    for e in p["books"]:
        out(f"[{e['action']}] {e['project']}/{e['book']} ({len(e['target']['chapters'])} chapters)")
        for line in e["diff"]:
            out(line)
        if e["action"] != "unchanged":
            out(f"  PUT /api/books/{e['project']}/{e['book']} "
                + json.dumps(put_body(e["target"]), ensure_ascii=False))
    out(f"loose (never bound): {len(p['loose'])}")
    for rel in p["unmapped"]:
        out(f"unmapped (stays loose; not in the map): {rel}")
    if p["conflicts"]:
        report["ok"] = False
        report["refused"] = "conflicts"
        for c in p["conflicts"]:
            out(f"CONFLICT: {c}")
        return report

    before = snapshot(api, docs, app_checks=app_checks)
    report["checks"] = len(before)
    pre = unresolved(before)
    out(f"pre-flight: {len(before)} URL checks, {len(pre)} not resolving")
    for line in pre:
        out(f"  NOT RESOLVING: {line}")
    if pre:
        report["ok"] = False
        report["refused"] = "pre-flight"
        report["failures"] = pre
        return report
    if not apply:
        pending = [e for e in p["books"] if e["action"] != "unchanged"]
        out(f"dry run: {len(pending)} PUT(s) would be made; nothing was written")
        report["ok"] = True
        return report

    for e in p["books"]:
        if e["action"] == "unchanged":
            continue
        r = api.put_book(e["project"], e["book"], put_body(e["target"]))
        body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        rec = {
            "book": f"{e['project']}/{e['book']}", "status": r.status_code,
            "created": body.get("created"), "committed": body.get("committed"),
            "commit_sha": body.get("commit_sha"), "commit_error": body.get("commit_error"),
        }
        report["puts"].append(rec)
        out(f"PUT {rec['book']}: {r.status_code} created={rec['created']} committed={rec['committed']}"
            + (f" commit_error={rec['commit_error']}" if rec["commit_error"] else ""))
        if r.status_code != 200:
            report["failures"].append(f"PUT {rec['book']} answered {r.status_code}: {r.text[:300]}")
            break

    after_books = server_books(api)
    for e in p["books"]:
        got = after_books.get((e["project"], e["book"]))
        if got is None or canonical(got) != e["target"]:
            report["failures"].append(f"book {e['project']}/{e['book']} is not as planned after the run")
    for rel in p["loose"]:
        for (project, slug), book in after_books.items():
            if any(rel in ch["variants"].values() for ch in book["chapters"]):
                report["failures"].append(f"loose {rel} is bound in {project}/{slug}")
    after = snapshot(api, list_documents(api), app_checks=app_checks)
    report["failures"] += compare(before, after)
    report["ok"] = not report["failures"]
    out(f"verify: {len(after)} URL checks after; {len(report['failures'])} failure(s)")
    for f in report["failures"]:
        out(f"  FAIL: {f}")
    return report


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--api-base", default=os.environ.get("KB_API_BASE_URL"),
                    help="API origin (default $KB_API_BASE_URL), e.g. https://knowledge.hi2vi.com")
    ap.add_argument("--map", type=Path, default=DEFAULT_MAP, help="the binding map")
    ap.add_argument("--apply", action="store_true", help="make the PUTs (default: dry run)")
    ap.add_argument("--skip-app-checks", action="store_true",
                    help="run without the /app (reader URL) checks; refused otherwise without a session")
    ap.add_argument("--report", type=Path, help="write the JSON report here")
    args = ap.parse_args(argv)
    if not args.api_base:
        print("error: --api-base or KB_API_BASE_URL is required", file=sys.stderr)
        return 2
    token = os.environ.get("KB_API_TOKEN") or None
    if not token:
        print("error: KB_API_TOKEN is required (the bearer for /api)", file=sys.stderr)
        return 2
    try:
        data = load_map(args.map)
    except Refused as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    with httpx.Client(base_url=args.api_base.rstrip("/"), timeout=60,
                      headers={"User-Agent": USER_AGENT}) as client:
        session = os.environ.get("KB_SESSION_TOKEN") or None
        logged_in = False
        email, password = os.environ.get("KB_LOGIN_EMAIL"), os.environ.get("KB_LOGIN_PASSWORD")
        if not session and email and password:
            r = client.post("/auth/login", json={"email": email, "password": password})
            if r.status_code != 200:
                print(f"error: login answered {r.status_code}", file=sys.stderr)
                return 2
            session, logged_in = r.json()["token"], True
        app_checks = bool(session) and not args.skip_app_checks
        if not session and not args.skip_app_checks:
            if args.apply:
                print("error: --apply needs an operator session for the reader-URL checks "
                      "(KB_SESSION_TOKEN, or KB_LOGIN_EMAIL + KB_LOGIN_PASSWORD); "
                      "pass --skip-app-checks only to run without them", file=sys.stderr)
                return 2
            print("warning: no operator session; the /app reader-URL checks are skipped")
        api = Api(client, token=token, session=session)
        try:
            report = run(api, data, apply=args.apply, app_checks=app_checks)
        except Refused as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 2
        finally:
            if logged_in:
                client.post("/auth/logout", headers={"Authorization": f"Bearer {session}"})

    if args.report:
        args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if report.get("refused"):
        return 2
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())

import json, sys, urllib.request, subprocess, os
A = "http://127.0.0.1:8911"
SP = os.path.dirname(os.path.abspath(__file__))
acc = json.load(open(f"{SP}/accts.json"))
VK = acc["a"]["cred"]["key"]; TOK = acc["a"]["session"]
VKB = None
def call(method, path, body=None, tok=VK):
    req = urllib.request.Request(A + path, method=method, data=json.dumps(body).encode() if body is not None else None,
        headers={"authorization": f"Bearer {tok}", "content-type": "application/json"})
    try:
        r = urllib.request.urlopen(req); return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        print("ERR", e.code, e.read()[:300], path); raise
def pub(project, slug, title, date, book=None, chapter=None, lang="en", body=None, tf=None, tok=VK):
    p = {"title": title, "markdown": body or f"# {title}\n\n## First part\n\nBody of {slug}. Water moves with the moon and with the wind, and a gauge records both.\n\n## Second part\n\nMore.\n", "project": project, "tags": ["live", "seed"],
         "source_repo": "live", "date": date, "slug": slug, "lang": lang}
    if book: p["book"] = book; p["chapter"] = chapter
    if tf: p["translated_from"] = tf
    return call("POST", "/api/documents", p, tok=tok)
G = {"slug": "guide", "title": "The knowledge maintainer guide", "kind": "codebase"}
pub("knowledge", "overview", "How the library is laid out", "2026-08-08", G, {"key": "overview", "position": 1})
pub("knowledge", "internals", "Inside the knowledge system: the content plane, the write path, and the contract", "2026-08-12", G, {"key": "internals", "position": 2})
pub("knowledge", "internals", "Inside the knowledge system: the content plane, the write path, and the contract", "2026-09-02", G, {"key": "internals", "position": 2})
pub("knowledge", "internals-ko", "지식 시스템의 내부: 콘텐츠 평면, 쓰기 경로, 그리고 계약", "2026-08-12", G, {"key": "internals", "position": 2}, lang="ko", tf={"lang": "en", "version": 1})
pub("knowledge", "contracts", "The contracts between the planes", "2026-08-15", G, {"key": "contracts", "position": 3})
for d in ("2026-08-08", "2026-09-02", "2026-10-14"):
    pub("knowledge", "release", "Releasing a change", d, G, {"key": "release", "position": 5})
TW = {"slug": "tidewater", "title": "Tidewater: how the sea keeps time", "kind": "subject", "subject": "Oceanography",
      "description": "A plain-language walk through tides, datums and the instruments that measure them."}
titles = ["Why the sea moves", "Gauges and floats", "The tide table", "Spring and neap", "Harmonic constituents", "Surge and seiches", "Reading a tide curve", "Reading guide"]
for i, t in enumerate(titles, 1):
    pub("tidewater", f"tw-{i}", t, "2026-07-%02d" % i, TW, {"key": f"c{i:02d}", "position": i})
LP = {"slug": "phases", "title": "lantern, phase by phase", "kind": "codebase"}
for key, pos, t, ph, d in (("p8", 8, "P8: Alerting on a missed heartbeat", "P8", "2026-06-01"), ("p9", 9, "P9: Incident timelines", "P9", "2026-07-18")):
    pub("lantern", f"lp-{key}", t, d, LP, {"key": key, "position": pos, "source": {"phase": ph}})
# a loose md document (plain Markdown) in a public project and one in a private project
pub("fixtures", "loose-md", "A loose Markdown note", "2026-09-10", body="# A loose Markdown note\n\n## Why\n\nA plain Markdown document that is not in any book. It has a [link](https://example.com/) and `code`.\n\n## What\n\n- one\n- two\n\n```python\nprint('hi')\n```\n")
pub("lantern", "private-md", "A private Markdown note", "2026-09-11", body="# A private Markdown note\n\n## Secret\n\nOnly the org member should read this.\n")
for p in call("GET", "/app/projects", tok=TOK)["projects"]:
    print(p["name"], p["visibility"], p["id"])
    if p["name"] in ("fixtures", "knowledge", "tidewater"):
        call("PATCH", f"/app/projects/{p['id']}", {"visibility": "public"}, tok=TOK)

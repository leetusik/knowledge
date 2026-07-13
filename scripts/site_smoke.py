#!/usr/bin/env python3
"""CI-parity smoke guard for the MkDocs Pages site (P5.S4). Stdlib-only.

Asserts source invariants (mkdocs.yml / docs/index.md / docs/tags.md — the
load-bearing shapes P5 relies on: auto-nav, the ``explain:recent``
marker/bullet contract, CJK search config, pin parity) and built-site
invariants (the ``site/`` output of ``mkdocs build`` actually ships them:
CJK lunr packs, the hero search toggle, the Recent-list DOM adjacency, no
leaked local paths or CDN scripts). All failures are collected and reported
together; exits non-zero if any invariant is violated, else prints PASS.

Custom-JS invariant (P6.S2): the site ships EXACTLY one vendored, no-CDN
script. ``mkdocs.yml`` must declare ``extra_javascript`` with its entries ==
``["javascripts/graph.js"]`` and nothing else (this flipped the pre-P6.S2
"extra_javascript must be absent" guard, in the same slice that added the
entry); ``docs/javascripts/graph.js`` + ``docs/graph.md`` (with ``hide:``
frontmatter) must exist; and the built ``site/`` must ship
``site/javascripts/graph.js`` and a ``site/graph/index.html`` that mounts
``.kb-graph`` with a ``data-graph-src`` and references ``javascripts/graph.js``.
The pre-existing all-pages CDN scan still fails on any external
``<script src="http…">`` (so the graph page cannot reintroduce Iconify), and
``site/graph.json`` still cannot leak a local path — the no-CDN /
no-``/Users/`` invariants are preserved.

Usage:
    python3 scripts/site_smoke.py                  # check the repo root
    python3 scripts/site_smoke.py --root /some/dir  # check a doctored copy
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

MARKER = "<!-- explain:recent -->"
TAGS_MARKER = "<!-- material/tags -->"
BULLET_RE = re.compile(r"^- \d{4}-\d{2}-\d{2} · \[[^\]]+\]\([^)]+\) — .+$")
BUILT_BULLET_RE = re.compile(r'<li>\d{4}-\d{2}-\d{2} · <a href="[^"]+">[^<]+</a> — [^<]+</li>')
CDN_SCRIPT_RE = re.compile(r'<script[^>]+src="https?://')
PROJECTS = ["changple5", "hi2vi_web", "bootstrap_agentic_workspace.sh"]


def check_source(root: Path, failures: list[str]) -> None:
    """Assert invariants in tracked source files (docs/*, mkdocs.yml)."""
    index_md = root / "docs" / "index.md"
    if not index_md.is_file():
        failures.append("docs/index.md missing")
    else:
        lines = index_md.read_text(encoding="utf-8").splitlines()
        if MARKER not in lines:
            failures.append(f"docs/index.md: missing marker line {MARKER!r}")
        else:
            following = lines[lines.index(MARKER) + 1:]
            contiguous = []
            for line in following:
                if not BULLET_RE.match(line):
                    break
                contiguous.append(line)
            if not contiguous:
                failures.append("docs/index.md: no bullet line directly under the marker")

    tags_md = root / "docs" / "tags.md"
    if not tags_md.is_file():
        failures.append("docs/tags.md missing")
    elif TAGS_MARKER not in tags_md.read_text(encoding="utf-8"):
        failures.append(f"docs/tags.md: missing marker {TAGS_MARKER!r}")

    mkdocs_yml = root / "mkdocs.yml"
    if not mkdocs_yml.is_file():
        failures.append("mkdocs.yml missing")
        return
    text = mkdocs_yml.read_text(encoding="utf-8")

    if re.search(r"(?m)^nav:", text):
        failures.append("mkdocs.yml: forbidden top-level 'nav:' key present")
    if re.search(r"(?m)^strict:", text):
        failures.append("mkdocs.yml: forbidden top-level 'strict:' key present")
    if not re.search(r"(?m)^\s*font:\s*false\s*$", text):
        failures.append("mkdocs.yml: theme.font: false is missing")

    # P6.S2: extra_javascript must be present and list EXACTLY the vendored,
    # no-CDN renderer — nothing else. (Flipped the pre-P6.S2 "must be absent"
    # guard, in the same slice that adds the entry.)
    ejs_match = re.search(r"(?ms)^extra_javascript:\n((?:\s*-\s*\S+\s*\n?)+)", text)
    if not ejs_match:
        failures.append("mkdocs.yml: extra_javascript: missing (must list exactly javascripts/graph.js)")
    else:
        ejs_entries = re.findall(r"-\s*(\S+)", ejs_match.group(1))
        if ejs_entries != ["javascripts/graph.js"]:
            failures.append(
                f"mkdocs.yml: extra_javascript entries must be exactly ['javascripts/graph.js'], found {ejs_entries}"
            )
    if not (root / "docs" / "javascripts" / "graph.js").is_file():
        failures.append("docs/javascripts/graph.js missing (referenced by mkdocs.yml extra_javascript:)")
    graph_md = root / "docs" / "graph.md"
    if not graph_md.is_file():
        failures.append("docs/graph.md missing")
    elif not re.search(r"(?m)^hide:", graph_md.read_text(encoding="utf-8")):
        failures.append("docs/graph.md: missing 'hide:' frontmatter (full-bleed map needs hide: [navigation, toc])")

    # P6.S1: the graph-data hooks module must be wired in and present on disk.
    if not re.search(r"(?m)^hooks:", text):
        failures.append("mkdocs.yml: missing top-level 'hooks:' key (must list scripts/graph_hook.py)")
    elif "scripts/graph_hook.py" not in text:
        failures.append("mkdocs.yml: hooks: must reference scripts/graph_hook.py")
    if not (root / "scripts" / "graph_hook.py").is_file():
        failures.append("scripts/graph_hook.py missing (referenced by mkdocs.yml hooks:)")

    plugins_match = re.search(r"(?ms)^plugins:\n(.*?)(?=^\S|\Z)", text)
    plugins_block = plugins_match.group(1) if plugins_match else ""
    lang_match = re.search(r"lang:\s*\n((?:\s*-\s*\w+\s*\n?)+)", plugins_block)
    langs = re.findall(r"-\s*(\w+)", lang_match.group(1)) if lang_match else []
    if "en" not in langs or "ko" not in langs:
        failures.append(f"mkdocs.yml: plugins.search.lang must contain 'en' and 'ko', found {langs}")

    pages_yml = root / ".github" / "workflows" / "pages.yml"
    compose_yml = root / "compose.yml"
    if not pages_yml.is_file() or not compose_yml.is_file():
        failures.append("pin-parity check skipped: pages.yml or compose.yml missing")
    else:
        pages_pin = re.search(r"mkdocs-material==([\d.]+)", pages_yml.read_text(encoding="utf-8"))
        compose_pin = re.search(r"squidfunk/mkdocs-material:([\d.]+)", compose_yml.read_text(encoding="utf-8"))
        if not pages_pin or not compose_pin:
            failures.append("pin-parity check: could not find pin in pages.yml and/or compose.yml")
        elif pages_pin.group(1) != compose_pin.group(1):
            failures.append(
                f"pin parity broken: pages.yml pins mkdocs-material=={pages_pin.group(1)}, "
                f"compose.yml pins {compose_pin.group(1)}"
            )


def check_built(root: Path, failures: list[str]) -> None:
    """Assert invariants in the mkdocs-built site/ output."""
    site_dir = root / "site"
    if not site_dir.is_dir():
        failures.append("site/ is missing — run mkdocs build first (e.g. `docker compose run --rm kb build`)")
        return

    search_index = site_dir / "search" / "search_index.json"
    if not search_index.is_file():
        failures.append("site/search/search_index.json missing")
    else:
        try:
            config = json.loads(search_index.read_text(encoding="utf-8")).get("config", {})
        except json.JSONDecodeError as exc:
            failures.append(f"site/search/search_index.json: invalid JSON ({exc})")
            config = {}
        lang = config.get("lang", [])
        if "ko" not in lang or "en" not in lang:
            failures.append(f"site/search/search_index.json: config.lang must include 'en'/'ko', found {lang}")

    lunr_dir = site_dir / "assets" / "javascripts" / "lunr" / "min"
    for fname in ("lunr.ko.min.js", "lunr.multi.min.js"):
        if not (lunr_dir / fname).is_file():
            failures.append(f"site/assets/javascripts/lunr/min/{fname} missing")

    index_html_path = site_dir / "index.html"
    if not index_html_path.is_file():
        failures.append("site/index.html missing")
    else:
        html = index_html_path.read_text(encoding="utf-8")
        if "kb-hero" not in html:
            failures.append("site/index.html: missing 'kb-hero'")
        if "kb-grid" not in html:
            failures.append("site/index.html: missing 'kb-grid'")
        search_id_count = len(re.findall(r'id="__search"', html))
        if search_id_count != 1:
            failures.append(f'site/index.html: expected exactly one id="__search", found {search_id_count}')
        if not re.search(r'for="__search"', html):
            failures.append('site/index.html: missing a for="__search" label')
        if not re.search(r'<div[^>]*id="recent"[^>]*>.*?</div>\s*(?:<!--.*?-->\s*)*<ul>', html, re.S):
            failures.append(
                'site/index.html: <ul> is not element-adjacent to <div ... id="recent"> '
                "(the #recent + ul CSS selector would stop matching)"
            )
        if MARKER not in html:
            failures.append(f"site/index.html: missing marker comment {MARKER!r}")
        if not BUILT_BULLET_RE.search(html):
            failures.append("site/index.html: no rendered Recent <li> bullet found")

    for project in PROJECTS:
        if not (site_dir / project / "index.html").is_file():
            failures.append(f"site/{project}/index.html missing")

    # P6.S2: the vendored renderer must ship, and the graph page must mount it.
    if not (site_dir / "javascripts" / "graph.js").is_file():
        failures.append("site/javascripts/graph.js missing (extra_javascript entry not shipped)")
    graph_page = site_dir / "graph" / "index.html"
    if not graph_page.is_file():
        failures.append("site/graph/index.html missing (docs/graph.md not built)")
    else:
        gh = graph_page.read_text(encoding="utf-8")
        if "kb-graph" not in gh:
            failures.append("site/graph/index.html: missing '.kb-graph' mount")
        if "data-graph-src" not in gh:
            failures.append("site/graph/index.html: missing 'data-graph-src' mount attribute")
        if "javascripts/graph.js" not in gh:
            failures.append("site/graph/index.html: does not reference 'javascripts/graph.js'")

    if (site_dir / "versions").exists():
        failures.append("site/versions/ present (exclude_docs regression)")

    users_leak: list[str] = []
    cdn_scripts: list[str] = []
    for html_path in site_dir.rglob("*.html"):
        content = html_path.read_text(encoding="utf-8", errors="replace")
        if "/Users/" in content:
            users_leak.append(str(html_path.relative_to(site_dir)))
        if CDN_SCRIPT_RE.search(content):
            cdn_scripts.append(str(html_path.relative_to(site_dir)))
    if users_leak:
        failures.append(f"local path leak ('/Users/') in {len(users_leak)} built page(s): {', '.join(users_leak[:5])}")
    if cdn_scripts:
        failures.append(f'CDN <script src="http…"> found in {len(cdn_scripts)} built page(s): {", ".join(cdn_scripts[:5])}')


def check_graph(root: Path, failures: list[str]) -> None:
    """Assert the P6.S1 graph.json data contract in the built site/ output."""
    graph_path = root / "site" / "graph.json"
    if not graph_path.is_file():
        failures.append("site/graph.json missing (graph_hook.py did not emit it)")
        return

    raw = graph_path.read_text(encoding="utf-8")
    if "/Users/" in raw:
        failures.append("site/graph.json: local path leak ('/Users/') — must be repo-relative")
    try:
        graph = json.loads(raw)
    except json.JSONDecodeError as exc:
        failures.append(f"site/graph.json: invalid JSON ({exc})")
        return

    if graph.get("version") != 1:
        failures.append(f"site/graph.json: version must be 1, found {graph.get('version')!r}")

    projects, nodes, edges = graph.get("projects"), graph.get("nodes"), graph.get("edges")
    for name, value in (("projects", projects), ("nodes", nodes), ("edges", edges)):
        if not isinstance(value, list):
            failures.append(f"site/graph.json: '{name}' must be a list")
    projects = projects if isinstance(projects, list) else []
    nodes = nodes if isinstance(nodes, list) else []
    edges = edges if isinstance(edges, list) else []

    node_ids: set = set()
    doc_count = 0
    for n in nodes:
        nid = n.get("id")
        if nid in node_ids:
            failures.append(f"site/graph.json: duplicate node id {nid!r}")
        node_ids.add(nid)
        if not all(k in n for k in ("id", "type", "title")):
            failures.append(f"site/graph.json: node {nid!r} missing one of id/type/title")
        ntype = n.get("type")
        if ntype not in ("doc", "tag", "missing"):
            failures.append(f"site/graph.json: node {nid!r} has invalid type {ntype!r}")
        if ntype == "doc":
            doc_count += 1
            for key in ("url", "date", "project", "tags", "degree"):
                if key not in n:
                    failures.append(f"site/graph.json: doc node {nid!r} missing '{key}'")

    for e in edges:
        if e.get("kind") not in ("related", "tag"):
            failures.append(f"site/graph.json: edge {e!r} has invalid kind {e.get('kind')!r}")
        for endpoint in ("source", "target"):
            if e.get(endpoint) not in node_ids:
                failures.append(
                    f"site/graph.json: edge endpoint {e.get(endpoint)!r} does not resolve to a node id"
                )

    proj_sum = sum(p.get("docs", 0) for p in projects if isinstance(p, dict))
    if proj_sum != doc_count:
        failures.append(
            f"site/graph.json: projects doc counts sum ({proj_sum}) != doc-node count ({doc_count})"
        )

    # Doc-node count must equal the filesystem count of docs/*/*.md at depth 2,
    # excluding index.md and reserved dirs — self-adapts to new docs/projects.
    reserved = {"current", "versions", "stylesheets", "assets", "javascripts"}
    docs_dir = root / "docs"
    fs_count = 0
    if docs_dir.is_dir():
        for sub in docs_dir.iterdir():
            if sub.is_dir() and sub.name not in reserved:
                fs_count += sum(1 for f in sub.glob("*.md") if f.name != "index.md")
    if doc_count != fs_count:
        failures.append(
            f"site/graph.json: doc-node count ({doc_count}) != filesystem docs count ({fs_count})"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=None, help="repo/tree root to check (default: this script's repo root)")
    args = parser.parse_args()
    root = Path(args.root).resolve() if args.root else Path(__file__).resolve().parent.parent

    failures: list[str] = []
    check_source(root, failures)
    check_built(root, failures)
    check_graph(root, failures)

    if failures:
        print(f"FAIL — {len(failures)} site invariant(s) violated (root: {root}):")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print(f"PASS — all site invariants hold (root: {root}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())

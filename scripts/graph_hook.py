"""MkDocs hook: emit the knowledge-graph data contract as a build-time static asset (P6.S1).

This module is wired into ``mkdocs.yml`` via ``hooks: [scripts/graph_hook.py]`` and
runs inside both ``mkdocs build`` (CI + deploy) and ``mkdocs serve`` (local dev). It
parses the explainer-doc frontmatter, computes nodes + edges, and writes a single
deterministic ``graph.json`` into the built ``site/`` directory — the same way
mkdocs-material's search rides ``site/search/search_index.json``. The browser-only
GitHub Pages site fetches ``<site>/graph.json`` at runtime; there is no server/API at
publish time (CI installs only ``mkdocs-material``), so the graph data MUST be static.

What it emits (contract asserted by ``scripts/site_smoke.py`` → ``check_graph``):
    {
      "version": 1,
      "projects": [{"name", "docs"}, ...],   # ordered (doc-count desc, name asc)
      "nodes":    [{"id", "type", "title", "degree", ...}, ...],
      "edges":    [{"kind", "source", "target"[, "broken"]}, ...]
    }

Node selection (the /explain contract, discriminator — no hard-coded project list):
a doc node is any ``docs/**/*.md`` whose YAML frontmatter carries ``source`` as a
mapping containing ``project``. (``docs/current/*`` and ``docs/versions/*`` carry
``source`` as a plain string, so they are excluded naturally; reserved dirs and
``index.md``/``tags.md``/``README.md`` are skipped belt-and-braces.)

Node types:
    doc     — {id, type, title, url, date, project, tags, degree}
    tag     — {id: "tag:<t>", type, title: <t>, degree}          (no url; hub, not a link)
    missing — {id: <raw path>, type, title: <raw path>, degree}  (ghost for a dead related: target)

Edges: ``related`` (directed as authored; ``broken: true`` + a ghost node when the
target doesn't resolve) and ``tag`` (doc ↔ ``tag:<t>``). Self-references and duplicate
``related:`` entries are dropped. ``degree`` counts incident edges over the emitted list.

Determinism & publish-safety: nodes sorted by (type, id), edges by (kind, source,
target), projects by (-docs, name); serialized with ``sort_keys=True`` + a trailing
newline; NO timestamps → two consecutive builds are byte-identical. Every id/url is
repo-relative (``/Users/`` must never appear).

Implementation note: this module parses frontmatter itself with PyYAML (bundled with
mkdocs). It must NOT import ``server/*`` — doing so would drag the FastAPI/SQLite
package into the mkdocs build.
"""

from __future__ import annotations

import json
from pathlib import Path

import yaml

# Reserved top-level dirs under docs/ that never contribute graph nodes, and file
# names that are section landings / meta pages rather than explainer docs.
_RESERVED_DIRS = {"current", "versions", "stylesheets", "assets", "javascripts"}
_SKIP_NAMES = {"index.md", "tags.md", "README.md"}

# mkdocs-computed {src_uri: File.url} map, collected in on_files. Module-level so
# on_post_build can read it; REASSIGNED (never mutated in place) on every on_files so
# serve rebuilds never see stale URLs.
_URL_MAP: dict[str, str] = {}


def on_files(files, config):
    """Capture the mkdocs-computed URL for every markdown page (reassign, never append)."""
    global _URL_MAP
    _URL_MAP = {f.src_uri: f.url for f in files if f.src_uri.endswith(".md")}
    return files


def on_post_build(config, **kwargs):
    """Build graph.json from the docs tree and write it into the built site."""
    docs_dir = Path(config["docs_dir"])
    site_dir = Path(config["site_dir"])
    graph = build_graph(docs_dir, _URL_MAP)
    out = site_dir / "graph.json"
    out.write_text(
        json.dumps(graph, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _parse_frontmatter(text: str):
    """Return the YAML mapping between the leading ``---`` fences, or None."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            try:
                data = yaml.safe_load("\n".join(lines[1:i]))
            except yaml.YAMLError:
                return None
            return data if isinstance(data, dict) else None
    return None


def build_graph(docs_dir: Path, url_map: dict[str, str]) -> dict:
    """Compute the {version, projects, nodes, edges} contract from the docs tree."""
    docs = []
    for path in sorted(docs_dir.rglob("*.md")):
        rel = path.relative_to(docs_dir).as_posix()
        if rel.split("/")[0] in _RESERVED_DIRS or path.name in _SKIP_NAMES:
            continue
        fm = _parse_frontmatter(path.read_text(encoding="utf-8"))
        if not fm:
            continue
        source = fm.get("source")
        if not (isinstance(source, dict) and "project" in source):
            continue
        docs.append(
            {
                "id": rel,
                "title": str(fm.get("title", rel)),
                "url": url_map.get(rel, ""),
                "date": str(fm.get("date", "")),
                "project": str(source["project"]),
                "tags": [str(t) for t in (fm.get("tags") or [])],
                "related": [str(r) for r in (fm.get("related") or [])],
            }
        )

    doc_ids = {d["id"] for d in docs}

    # Edges (deduped; self-references dropped).
    edges: list[dict] = []
    seen: set[tuple] = set()
    for d in docs:  # related: directed as authored
        for target in d["related"]:
            key = ("related", d["id"], target)
            if target == d["id"] or key in seen:
                continue
            seen.add(key)
            edge = {"source": d["id"], "target": target, "kind": "related"}
            if target not in doc_ids:
                edge["broken"] = True
            edges.append(edge)
    for d in docs:  # doc ↔ tag
        for tag in d["tags"]:
            tag_id = f"tag:{tag}"
            key = ("tag", d["id"], tag_id)
            if key in seen:
                continue
            seen.add(key)
            edges.append({"source": d["id"], "target": tag_id, "kind": "tag"})

    # Nodes: docs, then tags, then ghost (missing) nodes for unresolved related targets.
    nodes: list[dict] = []
    for d in docs:
        nodes.append(
            {
                "id": d["id"],
                "type": "doc",
                "title": d["title"],
                "url": d["url"],
                "date": d["date"],
                "project": d["project"],
                "tags": d["tags"],
            }
        )
    for tag in sorted({t for d in docs for t in d["tags"]}):
        nodes.append({"id": f"tag:{tag}", "type": "tag", "title": tag})
    for mid in sorted({e["target"] for e in edges if e.get("broken")} - doc_ids):
        nodes.append({"id": mid, "type": "missing", "title": mid})

    # Degree = incident edge count over the emitted edge list.
    degree: dict[str, int] = {}
    for e in edges:
        degree[e["source"]] = degree.get(e["source"], 0) + 1
        degree[e["target"]] = degree.get(e["target"], 0) + 1
    for n in nodes:
        n["degree"] = degree.get(n["id"], 0)

    # Projects: (doc-count desc, name asc); the S2 renderer assigns ink i % 3 in order.
    proj_counts: dict[str, int] = {}
    for d in docs:
        proj_counts[d["project"]] = proj_counts.get(d["project"], 0) + 1
    projects = sorted(
        ({"name": name, "docs": count} for name, count in proj_counts.items()),
        key=lambda p: (-p["docs"], p["name"]),
    )

    nodes.sort(key=lambda n: (n["type"], n["id"]))
    edges.sort(key=lambda e: (e["kind"], e["source"], e["target"]))
    return {"version": 1, "projects": projects, "nodes": nodes, "edges": edges}

#!/usr/bin/env python3
"""Plugin template drift guard (P7.S3) — ROOT-ONLY; never shipped in the payload.

Proves that ``plugin/templates/kb/`` and the live repo cannot silently diverge.
It reuses the SAME manifest and the SAME renderer the setup skill uses
(``plugin/setup/render.py``), so a scaffold rendered for a new user is exactly
the code this repo runs.

Three checks, from the manifest file classes:

  * ``identical``     — byte-compare ``plugin/templates/kb/<path>`` against
    ``<repo>/<path>`` directly (no render needed).
  * ``parameterized`` — render the whole tree with ``params.operator.json`` (the
    operator's real values) into a temp dir, then byte-compare the rendered
    ``<path>`` against ``<repo>/<path>``. The operator values must round-trip
    byte-exactly.
  * ``template_only`` — skipped (the root counterparts are operator-specific or
    do not exist).

Plus a COMPLETENESS check that closes the silent-drift hole: for every directory
the manifest declares fully-shipped (``shipped_dirs``), glob both sides and fail
on any file present in root but missing from the template, or vice versa — so a
new ``server/foo.py`` (or a stale template copy) cannot slip past the identical
list. ``__pycache__`` and ``*.pyc`` are excluded.

Exit 0 only when every check is green; otherwise it prints a per-file drift list
and exits 1. Run in CI via ``.github/workflows/plugin-ci.yml``.
"""

from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = REPO_ROOT / "plugin" / "templates"
KB_DIR = TEMPLATES_DIR / "kb"
MANIFEST_PATH = TEMPLATES_DIR / "manifest.json"
RENDER_PY = REPO_ROOT / "plugin" / "setup" / "render.py"
OPERATOR_PARAMS = TEMPLATES_DIR / "params.operator.json"

_PYCACHE_EXCLUDE = {"__pycache__"}


def _load_render():
    """Import ``plugin/setup/render.py`` as a module (it is not on sys.path)."""
    spec = importlib.util.spec_from_file_location("kb_render", RENDER_PY)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _dir_files(root: Path) -> set[str]:
    """Relative posix paths of real files under ``root``, minus caches."""
    if not root.is_dir():
        return set()
    out: set[str] = set()
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix == ".pyc" or _PYCACHE_EXCLUDE & set(path.relative_to(root).parts):
            continue
        out.add(path.relative_to(root).as_posix())
    return out


def main() -> int:
    drift: list[str] = []

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    files = manifest.get("files", {})
    render_mod = _load_render()

    # --- Render the whole tree once with the operator's real values ---
    params = json.loads(OPERATOR_PARAMS.read_text(encoding="utf-8"))
    params = {k: str(v) for k, v in params.items()}
    tmp = Path(tempfile.mkdtemp(prefix="kb_parity_"))
    try:
        try:
            render_mod.render(tmp, params, force=True)
        except render_mod.RenderError as exc:
            print(f"plugin_parity: render with operator params FAILED: {exc}", file=sys.stderr)
            return 1

        # --- identical: template source vs repo root ---
        for rel in files.get("identical", []):
            tmpl, root = KB_DIR / rel, REPO_ROOT / rel
            if not tmpl.is_file():
                drift.append(f"[identical] template missing: plugin/templates/kb/{rel}")
                continue
            if not root.is_file():
                drift.append(f"[identical] repo file missing: {rel}")
                continue
            if tmpl.read_bytes() != root.read_bytes():
                drift.append(f"[identical] byte drift: {rel}")

        # --- parameterized: rendered-with-operator-params vs repo root ---
        for rel in files.get("parameterized", []):
            rendered, root = tmp / rel, REPO_ROOT / rel
            if not rendered.is_file():
                drift.append(f"[parameterized] not rendered: {rel}")
                continue
            if not root.is_file():
                drift.append(f"[parameterized] repo file missing: {rel}")
                continue
            if rendered.read_bytes() != root.read_bytes():
                drift.append(
                    f"[parameterized] byte drift after render with operator params: {rel}"
                )

        # --- completeness: fully-shipped dirs must match set-for-set ---
        for rel_dir in manifest.get("shipped_dirs", []):
            tmpl_set = _dir_files(KB_DIR / rel_dir)
            root_set = _dir_files(REPO_ROOT / rel_dir)
            for name in sorted(root_set - tmpl_set):
                drift.append(f"[completeness] in repo but not shipped: {rel_dir}/{name}")
            for name in sorted(tmpl_set - root_set):
                drift.append(f"[completeness] shipped but not in repo: {rel_dir}/{name}")
    finally:
        import shutil

        shutil.rmtree(tmp, ignore_errors=True)

    if drift:
        print(f"FAIL — plugin template drift detected ({len(drift)} issue(s)):")
        for line in drift:
            print(f"  - {line}")
        return 1

    print("PASS — plugin templates are in parity with the repo.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

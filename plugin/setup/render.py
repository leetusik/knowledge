#!/usr/bin/env python3
"""Scaffold a knowledge-base repo from the checked-in template tree (P7.S3).

ONE stdlib-only renderer, shared by two callers that must agree byte-for-byte:

  * ``/knowledge:setup`` — writes a new user's KB into a target directory.
  * ``scripts/plugin_parity.py`` — the root-only drift guard imports this module,
    renders with the operator's real values, and byte-compares against repo root.

The template lives next to this script under ``../templates/``:
  * ``manifest.json``  — the ONE declaration of file classes (identical /
    parameterized / template_only), the placeholder catalogue, and the
    fully-shipped directories the parity guard cross-checks.
  * ``kb/``            — the scaffold tree, mirroring the target repo layout
    path-for-path. Byte-identical files are stored verbatim; parameterized and
    template-only files carry ``{{KB_*}}`` tokens (in their contents and, for the
    dated seed explainer, in their path).

File classes:
  * ``identical``      — copied byte-for-byte; never substituted.
  * ``parameterized``  — token-substituted; the parity guard renders these with
    the operator's params and requires a byte-exact match against repo root.
  * ``template_only``  — token-substituted and shipped, but NOT parity-compared
    (the root counterparts are operator-specific or do not exist).

Hard failures (non-zero exit + a clear message), before anything is written:
  * a param key that matches no ``{{KB_*}}`` token anywhere (typo guard);
  * a ``{{KB_*}}`` token referenced by a template but missing from the params;
  * a manifest path with no file under ``templates/kb/``;
  * (post-write) a leftover ``{{KB_`` anywhere in the rendered tree.

CLI:
    python3 render.py --dest <dir> (--params <file.json> | --set KEY=VALUE ...) [--force]

``--set`` overrides values loaded from ``--params``. ``--force`` allows writing
into an existing non-empty directory. Paths resolve from this script's own
location, so it runs from any working directory. Stdlib only.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = SCRIPT_DIR.parent / "templates"
MANIFEST_PATH = TEMPLATES_DIR / "manifest.json"
KB_DIR = TEMPLATES_DIR / "kb"

TOKEN_RE = re.compile(r"\{\{(KB_[A-Z0-9_]+)\}\}")


class RenderError(Exception):
    """Raised for any user-correctable failure (bad params, missing template)."""


def load_manifest() -> dict:
    """Parse ``templates/manifest.json``."""
    try:
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise RenderError(f"manifest not found: {MANIFEST_PATH}") from exc
    except json.JSONDecodeError as exc:
        raise RenderError(f"manifest is not valid JSON: {exc}") from exc


def manifest_files(manifest: dict) -> list[tuple[str, str]]:
    """Return ``[(klass, rel_path), ...]`` across all three file classes."""
    files = manifest.get("files", {})
    out: list[tuple[str, str]] = []
    for klass in ("identical", "parameterized", "template_only"):
        for rel in files.get(klass, []):
            out.append((klass, rel))
    return out


def _substitute(text: str, params: dict) -> str:
    return TOKEN_RE.sub(lambda m: params[m.group(1)], text)


def referenced_tokens(manifest: dict) -> set[str]:
    """Every ``{{KB_*}}`` token used by a parameterized/template-only template —
    in file CONTENTS and in template-only PATHS. Identical files are never
    substituted, so tokens found in them do not count."""
    tokens: set[str] = set()
    files = manifest.get("files", {})
    for klass in ("parameterized", "template_only"):
        for rel in files.get(klass, []):
            tokens.update(TOKEN_RE.findall(rel))  # path tokens (e.g. the dated seed doc)
            src = KB_DIR / rel
            if src.is_file():
                tokens.update(TOKEN_RE.findall(src.read_text(encoding="utf-8", errors="replace")))
    return tokens


def render(dest: Path, params: dict, force: bool = False) -> list[str]:
    """Render the template tree into ``dest``. Validates first (raising
    RenderError before any write), then writes. Returns the sorted list of
    rendered destination-relative paths."""
    manifest = load_manifest()
    files = manifest_files(manifest)

    # --- Validate params against the tokens actually used ---
    referenced = referenced_tokens(manifest)
    provided = set(params)
    missing = sorted(referenced - provided)
    if missing:
        raise RenderError(
            "missing value(s) for template token(s): "
            + ", ".join(missing)
            + " — provide via --params or --set KEY=VALUE"
        )
    unused = sorted(provided - referenced)
    if unused:
        raise RenderError(
            "param key(s) match no template token (typo?): "
            + ", ".join(unused)
            + f" — known tokens: {', '.join(sorted(referenced))}"
        )

    # --- Every declared template must exist on disk ---
    missing_src = [rel for _klass, rel in files if not (KB_DIR / rel).is_file()]
    if missing_src:
        raise RenderError(
            "manifest path(s) missing under templates/kb/: " + ", ".join(missing_src)
        )

    # --- Refuse to clobber a non-empty destination unless forced ---
    dest = dest.resolve()
    if dest.exists() and any(dest.iterdir()) and not force:
        raise RenderError(
            f"destination is not empty: {dest} — pass --force to render into it anyway"
        )

    # --- Write ---
    written: list[str] = []
    for klass, rel in files:
        src = KB_DIR / rel
        dest_rel = _substitute(rel, params)  # path tokens (e.g. the dated seed doc)
        out_path = dest / dest_rel
        out_path.parent.mkdir(parents=True, exist_ok=True)
        if klass == "identical":
            shutil.copyfile(src, out_path)
        else:
            rendered = _substitute(src.read_text(encoding="utf-8"), params)
            out_path.write_text(rendered, encoding="utf-8")
        written.append(dest_rel)

    # --- Post-write safety: no token may survive anywhere in the tree ---
    leftovers: list[str] = []
    for rel in written:
        text = (dest / rel).read_text(encoding="utf-8", errors="replace")
        if "{{KB_" in text or TOKEN_RE.search(rel):
            leftovers.append(rel)
    if leftovers:
        raise RenderError(
            "unsubstituted {{KB_...}} token(s) survived rendering in: "
            + ", ".join(sorted(leftovers))
        )

    return sorted(written)


def _parse_set(pairs: list[str]) -> dict:
    out: dict = {}
    for pair in pairs:
        if "=" not in pair:
            raise RenderError(f"--set expects KEY=VALUE, got: {pair!r}")
        key, value = pair.split("=", 1)
        out[key] = value
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Render the knowledge-base scaffold.")
    parser.add_argument("--dest", required=True, help="target directory for the scaffold")
    parser.add_argument("--params", help="JSON file of KB_* values")
    parser.add_argument(
        "--set",
        action="append",
        default=[],
        metavar="KEY=VALUE",
        help="override/add a single param (repeatable); overrides --params",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="render into an existing non-empty directory",
    )
    args = parser.parse_args(argv)

    try:
        params: dict = {}
        if args.params:
            params.update(json.loads(Path(args.params).read_text(encoding="utf-8")))
        params.update(_parse_set(args.set))
        # Everything is substituted as text; coerce values to str.
        params = {k: str(v) for k, v in params.items()}
        written = render(Path(args.dest), params, force=args.force)
    except RenderError as exc:
        print(f"render.py: error: {exc}", file=sys.stderr)
        return 2
    except (OSError, json.JSONDecodeError) as exc:
        print(f"render.py: error: {exc}", file=sys.stderr)
        return 2

    print(f"render.py: wrote {len(written)} file(s) to {Path(args.dest).resolve()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

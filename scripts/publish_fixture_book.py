#!/usr/bin/env python3
"""Publish the dev fixture book to a LOCAL knowledge API (P30.S7).

The web slices (S8 onwards) verify their surfaces against real native chapters. This
script publishes the one shared fixture book from ``tests/fixtures/book/`` through the
``knowledge`` CLI, exactly the way ``/explain`` does:

* book ``fixture-guide`` (project ``fixtures``, kind ``subject``) with three chapters:
  - ``all-blocks``: every block type, callout type, diagram kind and quiz type, two
    images in a figure row, an svg; published twice, so it has a version 2;
  - ``write-lock``: an English chapter and its Korean translation (same ids);
  - ``legacy``: one legacy html chapter;
* one loose native document carrying ``subject`` (project ``fixture-finance``).

Everything is invented text (P29's canvas content rule). The images are tiny PNG tiles
the script draws itself, so nothing binary is checked in.

    python3 scripts/publish_fixture_book.py                       # http://127.0.0.1:8766
    python3 scripts/publish_fixture_book.py --base-url http://127.0.0.1:8799 --token T

**Local only.** A base URL whose host is not localhost, 127.0.0.1 or ::1 is refused, and
the CLI is given a throwaway token (never your configured key). Run it against FRESH
local state: a second run on the same state publishes versions 2, 3, ... of every chapter,
so it stops early when the book already exists unless you pass ``--force``.

Needs ``uv`` (it runs the CLI from ``cli/``) or a ``knowledge`` on PATH.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import zlib
from pathlib import Path
from urllib.parse import urlparse

REPO = Path(__file__).resolve().parent.parent
FIXTURES = REPO / "tests" / "fixtures" / "book"
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "[::1]"}

BOOK = "fixture-guide"
PROJECT = "fixtures"
LOOSE_PROJECT = "fixture-finance"


def png(width: int, height: int, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> bytes:
    """A vertical-gradient PNG, from the standard library alone."""

    rows = []
    for y in range(height):
        t = y / max(height - 1, 1)
        pixel = bytes(round(a + (b - a) * t) for a, b in zip(top, bottom))
        rows.append(b"\x00" + pixel * width)

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(b"".join(rows), 9))
        + chunk(b"IEND", b"")
    )


IMAGES = {
    "tile-blue": png(320, 200, (70, 110, 200), (20, 40, 110)),
    "tile-green": png(320, 200, (90, 190, 120), (20, 90, 50)),
    "tile-wide": png(960, 360, (240, 190, 90), (150, 70, 40)),
    "lock-tile": png(320, 200, (60, 170, 170), (15, 70, 90)),
}


def assert_local(base_url: str) -> None:
    host = (urlparse(base_url).hostname or "").lower()
    if host not in LOCAL_HOSTS:
        sys.exit(
            f"refusing to publish to {base_url!r}: this script is for a LOCAL API only "
            "(localhost, 127.0.0.1 or ::1). Never publish fixtures to the hosted knowledge base."
        )


def book_exists(base_url: str, token: str) -> bool:
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/books/{PROJECT}/{BOOK}",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=10):
            return True
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return False
        sys.exit(f"cannot check the local API ({exc.code}): {exc}")
    except OSError as exc:
        sys.exit(f"cannot reach the local API at {base_url}: {exc}")


def cli_command() -> list[str]:
    if shutil.which("uv"):
        return ["uv", "run", "--quiet", "--project", str(REPO / "cli"), "knowledge"]
    if shutil.which("knowledge"):
        return ["knowledge"]
    sys.exit("need `uv` (to run cli/) or a `knowledge` executable on PATH")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--base-url", default="http://127.0.0.1:8766", help="a LOCAL API (default: %(default)s)")
    parser.add_argument(
        "--token",
        default=os.environ.get("FIXTURE_API_TOKEN", "local-fixture-token"),
        help="bearer for the local API (default: $FIXTURE_API_TOKEN, else a throwaway)",
    )
    parser.add_argument("--force", action="store_true", help="publish even if the book already exists (adds versions)")
    args = parser.parse_args()
    assert_local(args.base_url)

    if book_exists(args.base_url, args.token) and not args.force:
        print(f"{PROJECT}/{BOOK} already exists at {args.base_url}; use fresh local state or --force")
        return 0

    summary: list[dict] = []

    with tempfile.TemporaryDirectory(prefix="fixture-book-") as tmp:
        # An empty config home: the CLI must never read (or send) your own hosted key.
        env = {**os.environ, "KB_API_TOKEN": args.token, "XDG_CONFIG_HOME": str(Path(tmp) / "config")}
        assets = {}
        for name, data in IMAGES.items():
            path = Path(tmp) / f"{name}.png"
            path.write_bytes(data)
            assets[name] = f"{name}={path}"

        def save(label: str, file: str, *flags: str, images: tuple[str, ...] = (), project: str = PROJECT) -> None:
            cmd = [
                *cli_command(), "--base-url", args.base_url, "save", str(FIXTURES / file),
                "--project", project, "--source-repo", "fixtures", "--json", *flags,
            ]
            for name in images:
                cmd += ["--asset", assets[name]]
            done = subprocess.run(cmd, env=env, capture_output=True, text=True)
            if done.returncode != 0:
                sys.exit(f"{label}: publish failed\n{done.stderr.strip()}")
            payload = json.loads(done.stdout)
            note = f" (warnings: {len(payload['warnings'])})" if payload.get("warnings") else ""
            summary.append({
                "step": label, "id": payload.get("id"), "rel_path": payload.get("rel_path"),
                "version": payload.get("version"),
            })
            print(f"  {label:<28} id {payload.get('id')}  v{payload.get('version')}  {payload.get('rel_path')}{note}", file=sys.stderr)
            for line in done.stderr.strip().splitlines():
                if line.startswith("note:"):
                    print(f"      {line}", file=sys.stderr)

        book = ["--book", BOOK, "--book-kind", "subject", "--book-subject", "Fixtures", "--book-title", "Fixture guide"]
        print(f"publishing the fixture book to {args.base_url}", file=sys.stderr)
        # The chapter that is published twice: v1 is a short draft, v2 the full chapter.
        save("all-blocks v1", "all-blocks.v1.md", "--slug", "every-block-once", *book, "--chapter", "all-blocks", "--position", "1",
             "--chapter-title", "Every block, once")
        save("all-blocks v2", "all-blocks.md", "--slug", "every-block-once", *book, "--chapter", "all-blocks",
             images=("tile-blue", "tile-green", "tile-wide"))
        # One chapter in two languages: the Korean variant keeps every id of English v1.
        save("write-lock en", "write-lock.en.md", "--slug", "write-lock", *book, "--chapter", "write-lock", "--position", "2",
             "--chapter-title", "The write lock", images=("lock-tile",))
        save("write-lock ko", "write-lock.ko.md", "--slug", "write-lock-ko", *book, "--chapter", "write-lock",
             "--chapter-title", "쓰기 잠금", images=("lock-tile",))
        # A legacy html chapter: it stays html until a native version replaces it.
        save("legacy html", "legacy-explainer.html", "--slug", "legacy-explainer", *book, "--format", "html", "--lang", "en",
             "--tag", "fixture,legacy", "--chapter", "legacy", "--position", "3",
             "--chapter-title", "A legacy explainer")
        # A loose native document with a subject, in its own project (general mode).
        save("loose note", "loose-note.md", "--slug", "compound-growth", "--subject", "Fixture finance",
             project=LOOSE_PROJECT)

    print(json.dumps({"base_url": args.base_url, "project": PROJECT, "book": BOOK, "published": summary}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

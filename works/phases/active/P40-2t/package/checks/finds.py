"""Check that every `**Find** in <file>` string of the package's patch files occurs exactly once in its file
at a bootstrap commit. The patch files are read in ../PATCHES.md's index order.

Read-only: it runs `git -C <bootstrap> show <rev>:<path>` and writes nothing.

Usage: python3 finds.py <bootstrap repo> [<rev>]     (rev defaults to the pinned fdb1151, workspace v95)
"""
import re
import subprocess
import sys
from pathlib import Path

PKG = Path(__file__).resolve().parent.parent
FIND = re.compile(r"\*\*Find\*\* in `([^`]+)`[^\n]*\n\n```text\n(.*?)\n```\n", re.S)


def patch_files():
    """The patch files, in the order ../PATCHES.md lists them (`1. [`patches/<name>.md`](...)`)."""
    index = (PKG / "PATCHES.md").read_text(encoding="utf-8")
    names = re.findall(r"^\d+\. \[`(patches/[\w.-]+\.md)`\]", index, re.M)
    on_disk = sorted(str(p.relative_to(PKG)) for p in (PKG / "patches").glob("*.md"))
    assert sorted(names) == on_disk, ("PATCHES.md index and patches/ differ", names, on_disk)
    return [PKG / n for n in names]


if __name__ == "__main__":
    repo = sys.argv[1]
    rev = sys.argv[2] if len(sys.argv) > 2 else "fdb1151"
    cache, bad, total = {}, 0, 0
    for pf in patch_files():
        for path, text in FIND.findall(pf.read_text(encoding="utf-8")):
            if path not in cache:
                cache[path] = subprocess.run(["git", "-C", repo, "show", f"{rev}:{path}"], check=True,
                                             capture_output=True, text=True).stdout
            body = cache[path]
            n = body.count(text)
            line = body[: body.find(text)].count("\n") + 1 if n else 0
            print(f"{n}  {pf.name}  {path}  L{line}  {text[:50]!r}")
            bad += n != 1
            total += 1
    print(f"finds checked={total} not-exactly-once={bad} at {rev}")
    sys.exit(1 if bad else 0)

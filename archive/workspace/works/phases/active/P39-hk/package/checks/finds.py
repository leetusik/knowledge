"""Check that every `**Find** in <file>` string of ../PATCHES.md occurs exactly once in its file at a bootstrap commit.

Read-only: it runs `git -C <bootstrap> show <rev>:<path>` and writes nothing.

Usage: python3 finds.py <bootstrap repo> [<rev>]     (rev defaults to the pinned bb525b9)
"""
import re
import subprocess
import sys
from pathlib import Path

repo = sys.argv[1]
rev = sys.argv[2] if len(sys.argv) > 2 else "bb525b9"
patches = (Path(__file__).resolve().parent.parent / "PATCHES.md").read_text(encoding="utf-8")
finds = re.findall(r"\*\*Find\*\* in `([^`]+)`[^\n]*\n\n```text\n(.*?)\n```\n", patches, re.S)
cache, bad = {}, 0
for path, text in finds:
    if path not in cache:
        cache[path] = subprocess.run(["git", "-C", repo, "show", f"{rev}:{path}"], check=True,
                                     capture_output=True, text=True).stdout
    body = cache[path]
    n = body.count(text)
    line = body[: body.find(text)].count("\n") + 1 if n else 0
    print(f"{n}  {path}  L{line}  {text[:60]!r}")
    bad += n != 1
print(f"finds checked={len(finds)} not-exactly-once={bad} at {rev}")
sys.exit(1 if bad else 0)

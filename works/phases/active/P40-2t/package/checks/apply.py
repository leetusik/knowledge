"""Apply the P40-2t package to a scratch copy of the bootstrap, then run the patched smoke suite's explain
block and the other pins this package touches.

Usage: python3 apply.py <scratch copy>
  <scratch copy> is the whole bootstrap tree at `fdb1151` (workspace v95), for example
  `git -C <bootstrap> archive -o <tmp>/p40.tar fdb1151` and `tar -xf` into an empty folder. It is edited in
  place, so use a fresh copy each run. Afterwards, in that copy: `python3 installer/build.py` (workflow.py and
  the references are under payload/, so the root artifact must be rebuilt), `python3 installer/build.py
  --check`, then `bash tests/retrofit_smoke.sh` alone, the whole patched suite.

What it does, in order:
  0. copies the three whole explain references over payload/claude/skills/do-whole-phase/reference/;
  1. applies every patch file in ../PATCHES.md's index order (create-phase, workflow, engine, release):
     each `**Find**` must occur exactly once in the file as it stands, and is replaced by the fenced block
     that follows it; create-phase 1e (`## The explain route`) replaces the heading to the end of the file
     with the two route texts; release.md's changelog fragment is written as a new file;
  2. runs the patched suite's explain block (from its "# Explain phases: the route lives in create-phase"
     comment to the title pins) and the pins outside it that read the same files.
"""
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from finds import FIND, PKG, patch_files  # noqa: E402

root = Path(sys.argv[1])
BLOCK = re.compile(r"^```(\w*)\n(.*?)\n```$", re.M | re.S)


def sub(path, old, new):
    p = root / path
    t = p.read_text(encoding="utf-8")
    assert t.count(old) == 1, (path, t.count(old), old[:60])
    p.write_text(t.replace(old, new), encoding="utf-8")


# 0. The three whole files (never into do-next-slice/reference/: the build's SHARED_SKILL_FILES copies them).
REF = "claude/skills/do-whole-phase/reference"
for name in ("explain-decomposition.md", "explain-chapter.md", "explain-review.md"):
    shutil.copy(PKG / REF / name, root / "payload" / REF / name)

# 1. The patch files, in index order.
applied = 0
for pf in patch_files():
    text = pf.read_text(encoding="utf-8")
    blocks = [b for _, b in BLOCK.findall(text)]
    for path, find in FIND.findall(text):
        if path == "payload/claude/skills/create-phase/SKILL.md" and find == "## The explain route":
            p = root / path  # create-phase 1e: the heading to the end of the file becomes the two route texts
            t = p.read_text(encoding="utf-8")
            assert t.count("\n## The explain route\n") == 1
            i = t.index("\n## The explain route\n") + 1
            route = (PKG / "claude/skills/create-phase/explain-route.md").read_text(encoding="utf-8")
            research = (PKG / "claude/skills/create-phase/research-route.md").read_text(encoding="utf-8")
            p.write_text(t[:i] + route + "\n" + research, encoding="utf-8")
        else:
            k = blocks.index(find)  # the replacement is the next fenced block
            sub(path, find, blocks[k + 1])
        applied += 1
    for slug, body in re.findall(r"^\*\*New file\*\* `(changelog\.d/[\w.-]+\.md)`[^\n]*\n\n```markdown\n(.*?)\n```$",
                                 text, re.M | re.S):
        (root / slug).write_text(body + "\n", encoding="utf-8")
        print(f"wrote {slug}")
print(f"applied finds={applied}")

# 2. The patched suite's explain block, with the names it uses defined as the suite defines them.
smoke = (root / "tests/retrofit_smoke.sh").read_text(encoding="utf-8").split("\n")
start = next(i for i, l in enumerate(smoke) if l.startswith("# Explain phases: the route lives in create-phase"))
end = next(i for i, l in enumerate(smoke) if l.startswith('assert "titled `P<N>: <phase name>`" not in create_phase'))
sys.path.insert(0, str(root / "installer"))
from build import SHARED_SKILL_FILES  # noqa: E402

create_phase = (root / "payload/claude/skills/create-phase/SKILL.md").read_text(encoding="utf-8")
ns = {"root": root, "create_phase": create_phase, "SHARED_SKILL_FILES": SHARED_SKILL_FILES}
exec(compile("\n".join(smoke[start:end + 1]), "smoke-explain-block", "exec"), ns)
print(f"smoke explain block: lines {start + 1}-{end + 1} passed")

# The P42 pin, flipped by release.md: both installed copies are built from this one file.
_decomp = (root / "payload" / REF / "explain-decomposition.md").read_text(encoding="utf-8")
assert "--depends-on none" in _decomp and "[--depends-on" not in _decomp
# The `## Explain` hazard: the research route quotes the proposal, and no shipped intent text would carry it bare.
assert "`> ` opening every line" in create_phase
skills = {p.parent.name for p in (root / "payload/claude/skills").glob("*/SKILL.md")}
assert len(skills) == 21, len(skills)  # v95 (fdb1151): no skill added or removed
assert not list((root / "payload/claude/skills/create-phase").glob("*route*")), "a route text was shipped as a file"
assert not (root / "payload/claude/skills/do-next-slice/reference/explain-chapter.md").exists(), "a shared copy was shipped"
for rel, cap in (("payload/contract.md", 12288), ("payload/claude/skills/do-whole-phase/SKILL.md", 8192),
                 ("payload/claude/skills/do-next-slice/SKILL.md", 8192)):
    n = len((root / rel).read_bytes())
    assert n <= cap, (rel, n)
    print(f"{rel}: {n} of {cap} B")
print("other pins on these files: passed; skill count", len(skills))
print("create-phase core bytes:", len(create_phase.encode()))

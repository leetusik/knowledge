"""Apply the P39-hk package to a scratch copy of the bootstrap (payload/, installer/, README.en.md, tests/),
then run the patched smoke suite's explain pins and the unchanged ones that read the same files.

Usage: python3 apply.py <scratch copy>   (a copy of the bootstrap's payload/, installer/, README.en.md and
tests/retrofit_smoke.sh at v93, `f72fb9f`, the commit the package landed on; it is edited in place, so use a fresh copy each run)
"""
import re
import shutil
import sys
from pathlib import Path

root = Path(sys.argv[1])
pkg = Path(__file__).resolve().parent.parent
patches = (pkg / "PATCHES.md").read_text(encoding="utf-8")

# Every fenced block in PATCHES.md, in order, with its fence label.
blocks = re.findall(r"```(\w*)\n(.*?)\n```\n", patches, re.S)
finds = re.findall(r"\*\*Find\*\* in `([^`]+)`[^\n]*\n\n```text\n(.*?)\n```\n", patches, re.S)


def after(find_text):
    """The fenced block that follows a find block (its replacement)."""
    for i, (_, body) in enumerate(blocks):
        if body == find_text:
            return blocks[i + 1][1]
    raise SystemExit(f"no block after {find_text[:40]!r}")


def sub(path, old, new):
    p = root / path
    t = p.read_text(encoding="utf-8")
    assert t.count(old) == 1, (path, old[:60])
    p.write_text(t.replace(old, new), encoding="utf-8")


# 0. The three whole files.
for name in ("explain-decomposition.md", "explain-chapter.md", "explain-review.md"):
    shutil.copy(pkg / "claude/skills/do-whole-phase/reference" / name,
                root / "payload/claude/skills/do-whole-phase/reference" / name)

for path, text in finds:
    if path == "payload/claude/skills/create-phase/SKILL.md" and text.startswith("A request that arrives"):
        para = after(text)  # 1a: the sentence stays, the paragraph follows after a blank line
        sub(path, text, text + "\n\n" + para)
    elif path == "payload/claude/skills/create-phase/SKILL.md" and text == "## The explain route":
        p = root / path  # 1b: delete from the heading to the end of the file, insert the two route texts
        t = p.read_text(encoding="utf-8")
        i = t.index("\n## The explain route\n") + 1
        route = (pkg / "claude/skills/create-phase/explain-route.md").read_text(encoding="utf-8")
        research = (pkg / "claude/skills/create-phase/research-route.md").read_text(encoding="utf-8")
        p.write_text(t[:i] + route + "\n" + research, encoding="utf-8")
    elif text == "(plugin 0.6.0+)":
        sub(path, text, "(plugin 0.10.0+)")  # 7a: given inline
    else:
        sub(path, text, after(text))

# Run the explain block of the patched smoke suite: from the explain comment after create_phase's pins
# to the title pins, with the names it uses defined as the suite defines them.
smoke = (root / "tests/retrofit_smoke.sh").read_text(encoding="utf-8").split("\n")
start = next(i for i, l in enumerate(smoke) if l.startswith("# Explain phases: the route lives in create-phase"))
end = next(i for i, l in enumerate(smoke) if l.startswith('assert "titled `P<N>: <phase name>`" not in create_phase'))
code = "\n".join(smoke[start:end + 1])
sys.path.insert(0, str(root / "installer"))
from build import SHARED_SKILL_FILES  # noqa: E402

create_phase = (root / "payload/claude/skills/create-phase/SKILL.md").read_text()
ns = {"root": root, "create_phase": create_phase, "SHARED_SKILL_FILES": SHARED_SKILL_FILES}
exec(compile(code, "smoke-explain-block", "exec"), ns)
print(f"smoke explain block: lines {start + 1}-{end + 1} passed")

# The other pins that read these files (unchanged in the suite).
_er = (root / "payload/claude/skills/do-whole-phase/reference/explain-review.md").read_text(encoding="utf-8")
assert "`select_browser` on the recorded `Agent's Chrome deviceId:`, never a `name` label" in _er
assert "no recorded id or no browser with it, return `needs_operator`" in _er
assert "[--depends-on" not in (root / "payload/claude/skills/do-whole-phase/reference/explain-decomposition.md").read_text()
parallel = " ".join((root / "payload/claude/skills/parallel-phase/SKILL.md").read_text().split())  # as the suite's L779
for required in ("**One exception: an explain phase (v86).**", "### An explain phase merges back by itself",
                 "**An explain phase needs no host branch (v86).**", "`exemption=phase-folder-only (<n> paths)`",
                 "`merge_ready=<P>:<branch>`", "`parallel-teardown <P> --discard-ignored`",
                 "**A phase with no debt settles itself (v86):**", "the main checkout's `.claude/settings.local.json`",
                 "(an explain phase's confirmation is the asking)"):
    assert required in parallel, required
_ww = " ".join((root / "payload/claude/skills/do-whole-phase/reference/worktree.md").read_text(encoding="utf-8").split())
for required in ("**One exception: an explain phase (v86).**", "**An explain phase merges back by itself, with no stop.**",
                 "**When the automatic merge cannot run**", "**The closing report** of an explain run comes last",
                 "`parallel-teardown <P> --discard-ignored`"):
    assert required in _ww, required
for required in ("the agent when instructed", "Never on the agent's own initiative",
                 "Invocation is not the gate; confirmation is.", "## Design Style", "Mockup: on request",
                 "Say nothing about worktrees", "Relay that hint; never act on it",
                 "never ask for a worktree on a docs phase"):
    assert required in create_phase, required
skills = {p.parent.name for p in (root / "payload/claude/skills").glob("*/SKILL.md")}
assert len(skills) == 20, len(skills)  # v93 (f72fb9f), the tree the package was applied to; S5 pinned v91's 19
assert not list((root / "payload/claude/skills/create-phase").glob("*route*")), "a route text was shipped as a file"
print("other pins on these files: passed; skill count", len(skills))
print("create-phase core bytes:", len(create_phase.encode()))

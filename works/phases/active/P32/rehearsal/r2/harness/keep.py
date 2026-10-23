#!/usr/bin/env python3
"""P32.S9: copy the rehearsal's keep-list into the phase folder's rehearsal/r2/ (never pages/, never resolver output)."""
import os, shutil
S9 = "/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s9"
P = S9 + "/ws/works/phases/active/P90"
R = "/Users/sugang/projects/personal/knowledge/works/phases/active/P32/rehearsal/r2"
def cp(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy2(src, dst)
cp(P + "/intent.md", R + "/intent.md")
cp(P + "/phase.md", R + "/phase-P90.md")
cp(P + "/engine-log.md", R + "/engine-log.md")
for s in ("P90.DECOMP", "P90.S1"):
    for f in ("plan.md", "result.md"):
        cp(f"{P}/slices/{s}/{f}", f"{R}/slices/{s}/{f}")
for root, dirs, files in os.walk(P + "/book"):
    dirs[:] = [d for d in dirs if d != "pages"]
    for f in files:
        src = os.path.join(root, f)
        cp(src, R + "/book/" + os.path.relpath(src, P + "/book"))
cp(S9 + "/runs/decomp-a1/result-attempt1.md", R + "/decomp-attempt1-result.md")
for f in sorted(os.listdir(S9 + "/harness")):
    cp(S9 + "/harness/" + f, R + "/harness/" + f)
cp(S9 + "/anchor/count.py", R + "/harness/anchor-count.py")
cp(S9 + "/keep.py", R + "/harness/keep.py")
cp(S9 + "/ws/CLAUDE.md", R + "/harness/ws/CLAUDE.md")
cp(S9 + "/ws/.claude/agents/slice-executor.md", R + "/harness/ws/slice-executor.md")
for run in ("decomp", "gate", "chapter"):
    cp(f"{S9}/runs/{run}/prompt.txt", f"{R}/harness/prompt-{run}.txt")
    cp(f"{S9}/runs/{run}/cmd.sh", f"{R}/harness/cmd-{run}.sh")
gate = open(S9 + "/runs/gate/report.md").read()
open(R + "/gate.md", "w").write("# The outline gate (P90, rehearsal 2)\n\n**Signed** by P32.S9, acting as the operator (plan: \"sign it as the operator would and write that down\"): "
    "the literal word **\"accept\"**, 2026-10-23 about 14:12 KST, on the report below as the gate run returned it. "
    "The scratch notebook records it as `## Decisions`' \"Outline signed, attempt 2\" line (`phase-P90.md`).\n\n## The gate report, verbatim\n\n" + gate)
n = sum(len(f) for _, _, f in os.walk(R))
print("files in r2:", n)

#!/usr/bin/env python3
"""P32.F1: reset a copied dossier so `resume` starts at D6 (no new research). usage: reset.py <c|g> [run dir name, default the subject]
Removes the writing stage's outputs, rewrites run.md's state, and prints what it did (kept as rehearsal/r1b/reset-<s>.md).
"""
import os, re, shutil, sys

F1 = os.path.dirname(os.path.abspath(__file__))
RUNS = {"c": "20261023-0350-post-api-documents-write-path", "g": "20261023-0350-free-threaded-cpython"}
SKILL = "/Users/sugang/projects/personal/knowledge/plugin/skills/explain/SKILL.md"
R1B = "/Users/sugang/projects/personal/knowledge/works/phases/active/P32/rehearsal/r1b"

s = sys.argv[1]
rd = sys.argv[2] if len(sys.argv) > 2 else s
run_id = RUNS[s]
root = os.path.join(F1, "runs", rd, "state", "knowledge-kb", "explain")
d = os.path.join(root, run_id)
log = [f"# Reset: subject {s.upper()} ({rd}), run {run_id}", "",
       f"Copied dossier: `{d}`", ""]

removed = []
for name in sorted(os.listdir(d)):
    p = os.path.join(d, name)
    if name in ("body.md", "trace.md", "report.md", "check.json", "meta.json", "payload.json", "response.json") \
            or name.startswith("critique"):
        os.remove(p); removed.append(name)
crit = os.path.join(d, "critic")
if os.path.isdir(crit):
    inner = sorted(os.listdir(crit))
    shutil.rmtree(crit); os.makedirs(crit)
    removed.append(f"critic/ emptied (held: {', '.join(inner) or 'nothing'})")
log.append("**Removed** (the writing stage's outputs, D6 onward): " + "; ".join(removed) + ".")
log.append("")

run_path = os.path.join(d, "run.md")
run = open(run_path).read()
before = run
lines = run.split("\n")
out, dropped, in_critique = [], [], False
for ln in lines:
    if ln.startswith("## Critique"):
        in_critique = True; dropped.append(ln); continue
    if in_critique:
        if ln.startswith("## "):
            in_critique = False
        else:
            dropped.append(ln); continue
    if re.match(r"^- (D6|D7|D8|D9|§4\.9)\b", ln) or ln.startswith("- D6:") or ln.startswith("- D7:") \
            or ln.startswith("- D8:") or ln.startswith("- §4.9"):
        dropped.append(ln); continue
    if ln.startswith("- stage:"):
        new = "- stage: D6 final outline · state: stopped: reset to D6 for a rewrite (P32.F1)"
        dropped.append(ln); out.append(new); continue
    if ln.startswith("- dossier:"):
        new = f"- dossier: {d} · tools: {os.path.join(root, 'tools')} · skill: {SKILL}"
        dropped.append(ln); out.append(new); continue
    out.append(ln)
run = "\n".join(out).rstrip("\n") + "\n"
note = ("- 2026-10-23: reset by the operator (P32.F1) to rewrite the chapter from D6 with the current "
        "skill; the research (D0–D5g, gate passed) stands unchanged. Removed: " + ", ".join(removed) +
        ". outline.md is the earlier D6 map: rewrite it at D6.")
if "## Resume" in run:
    run = run.replace("## Resume\n", "## Resume\n" + note + "\n", 1)
else:
    run += "## Resume\n" + note + "\n"
open(run_path, "w").write(run)
log.append("**run.md:** lines replaced or removed:")
log.append("")
log += ["    " + x for x in dropped]
log.append("")
log.append("Added under `## Resume`:")
log.append("")
log.append("    " + note)
log.append("")
log.append("Kept as they were: `brief.md`, `plan.md`, `library.md`, `ledger.md`, `outline.md`, `findings/`, "
           "`verify/`, `gaps/`" + (", `pages/`" if os.path.isdir(os.path.join(d, "pages")) else " (no `pages/`)") +
           "; the mode block (`critic:`, `searches`) left as the earlier run wrote it, so the run shows whether "
           "the lead brings it up to date.")
os.makedirs(R1B, exist_ok=True)
open(os.path.join(R1B, f"reset-{rd}.md"), "w").write("\n".join(log) + "\n")
print("\n".join(log))

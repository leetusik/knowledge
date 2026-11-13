#!/usr/bin/env python3
"""P32.S7 fix 3: the gap reviewer runs out of turns before it writes (both subjects): 30 turns, Bash for B6's
plain-grep fallback on a host with no Grep/Glob, and a write-by line in B3."""
import sys
from pathlib import Path
root = Path(sys.argv[1]); canon = root / "plugin/skills/explain/SKILL.md"; s = canon.read_text()
old = "**Write `gaps/r<n>.md`**, once:"
new = ("**Write `gaps/r<n>.md`**, once, by your 20th tool call at the latest (a file written from\n"
       "what you have read beats none):")
assert s.count(old) == 1, s.count(old)
s = s.replace(old, new); canon.write_text(s)
(root / "web/public/SKILL.md").write_text(s)
port = root / ".agents/skills/explain/SKILL.md"; p = port.read_text()
port.write_text(p[:p.index("\n---\n", 4) + 5] + s[s.index("\n---\n", 4) + 5:])
ag = root / "plugin/agents/gap-reviewer.md"; a = ag.read_text()
for o, n in (("tools: Read, Grep, Glob, Write\n", "tools: Read, Grep, Glob, Bash, Write\n"), ("maxTurns: 15\n", "maxTurns: 30\n")):
    assert a.count(o) == 1, o
    a = a.replace(o, n)
ag.write_text(a)
print("fix3 applied")

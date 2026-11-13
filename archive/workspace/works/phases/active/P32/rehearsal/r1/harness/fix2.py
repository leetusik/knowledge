#!/usr/bin/env python3
"""P32.S7 fix 2: the unfinished-run lookup stays inside <KB_EXPLAIN_STATE>, on a host with no Glob too."""
import sys
from pathlib import Path
root = Path(sys.argv[1]); canon = root / "plugin/skills/explain/SKILL.md"; s = canon.read_text()
old = ("Then look for an **unfinished run** of the same subject: a `run.md` under\n"
       "`<KB_EXPLAIN_STATE>` whose `state:` is not `done`.")
new = ("Then look for an **unfinished run** of the same subject: a `run.md` under\n"
       "`<KB_EXPLAIN_STATE>` whose `state:` is not `done` (Glob `<KB_EXPLAIN_STATE>/*/run.md`; with no\n"
       "Glob, `find <KB_EXPLAIN_STATE> -maxdepth 2 -name run.md`, never a folder above it).")
assert s.count(old) == 1, s.count(old)
s = s.replace(old, new); canon.write_text(s)
(root / "web/public/SKILL.md").write_text(s)
port = root / ".agents/skills/explain/SKILL.md"; p = port.read_text()
fm = p[:p.index("\n---\n", 4) + 5]; body = s[s.index("\n---\n", 4) + 5:]
port.write_text(fm + body)
print("fix2 applied")

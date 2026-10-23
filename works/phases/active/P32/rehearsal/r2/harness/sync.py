"""Copy the canonical explain SKILL.md body into the portable copy (keeping its frontmatter) and the web copy (whole file)."""
import re
R = "/Users/sugang/projects/personal/knowledge/"
canon = open(R + "plugin/skills/explain/SKILL.md").read()
body = re.match(r"^---\n.*?\n---\n(.*)$", canon, re.S).group(1)
port = open(R + ".agents/skills/explain/SKILL.md").read()
head = re.match(r"^(---\n.*?\n---\n)", port, re.S).group(1)
open(R + ".agents/skills/explain/SKILL.md", "w").write(head + body)
open(R + "web/public/SKILL.md", "w").write(canon)
print("synced", len(canon), len(head + body))

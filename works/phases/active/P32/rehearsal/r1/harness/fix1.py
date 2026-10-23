#!/usr/bin/env python3
"""P32.S7 fix 1: the shell forms the research agents use, and the quick verifier's model.
usage: fix1.py <root>   (edits <root>/plugin/skills/explain/SKILL.md, then syncs the web and .agents copies)
"""
import sys
from pathlib import Path

root = Path(sys.argv[1])
canon = root / "plugin/skills/explain/SKILL.md"
s = canon.read_text()

EDITS = [
    # §3.2: a permissions return stops the run only for a call in its given form
    ("A role that returns `failed: permissions` later in the run stops it with the same block.",
     "A role that returns `failed: permissions` later in the run stops it with the same block,\n"
     "when the call it names is in a form its brief gives. A call it wrote in another form (a\n"
     "`git -C`, a `$`, a brace) is its own error, not the session's: dispatch it once more with\n"
     "the call named, like any other failure (§3.5)."),
    # §3.5 item 1: the repository and commit a code researcher gets
    ("A code researcher gets the repository and `commit`: the full sha of\n"
     "   `HEAD`, or `WORKTREE` for uncommitted work.",
     "A code researcher gets the repository, which is the session's working folder (its\n"
     "   `git` runs there, never with `-C`), and `commit`: the full sha of `HEAD` written\n"
     "   `<sha> (HEAD)`, or `WORKTREE` for uncommitted work."),
    # §3.5 item 4
    ("   - `failed: permissions` → stop with §3.2's block.\n",
     "   - `failed: permissions` on a call in its brief's form → stop with §3.2's block; on a\n"
     "     call outside them, it is the role's error: treat it as the next line says.\n"),
    # §3.9 quick: the verifier runs on the other model from the lead
    ("(a verifier agent where you can dispatch one; otherwise `verifier: lead (degraded)`).",
     "(a verifier agent where you can dispatch one, on a model other than yours, since here you\n"
     "are the researcher: `knowledge:verifier` as it is when you run on Opus, with `model: opus`\n"
     "otherwise; generic: a subagent on that model; with none, `verifier: lead (degraded)`)."),
    # B2 dispatch
    ("    repo: <absolute path> · commit: <full sha> | WORKTREE\n",
     "    repo: <absolute path> · commit: <full sha> (HEAD) | <full sha> | WORKTREE\n"),
    # B2 step 2
    ("2. **Read at the commit.** When `commit` is the checked-out `HEAD` and\n"
     "   `git status --porcelain -- <path>` prints nothing, read the file itself: its line\n"
     "   numbers are the commit's.",
     "2. **Read at the commit.** When `commit` says `(HEAD)` (the dispatch tells you; never\n"
     "   look it up) and `git status --porcelain -- <path>` prints nothing, read the file\n"
     "   itself: its line numbers are the commit's."),
    # B2 boundaries
    ("**Boundaries.** Bash runs read-only `git` and the excerpt hash only: never `checkout`,",
     "**Boundaries.** Bash runs read-only `git` and the excerpt hash only, in the session's\n"
     "working folder (the repository) with repo-relative paths, never with `-C` or a `cd`;\n"
     "never `checkout`,"),
    # B4 verifier: how to find a claim's entry
    ("**Read only this.** For each claim, its entry in the file named (`Grep` for\n"
     "`### <claim id>`, then `Read` to the next `### `):",
     "**Read only this.** For each claim, its entry in the file named (find the line\n"
     "`### <claim id>` with Grep, or with no Grep tool `grep -n -x -F -e '### <id>' -e '### <id>'\n"
     "<absolute file>`, one call per file; then `Read` from that line to the next `### `):"),
    # B1 known-already lookup
    ("1. Before searching, look up every id in `known already` (`Grep` the dossier's `findings/`\n"
     "   for `### <id>`).",
     "1. Before searching, look up every id in `known already` (the line `### <id>` in the\n"
     "   dossier's `findings/`, found as B6 says)."),
    # B6 Bash forms
    ("  converter and `pdftotext`, read-only `git`, the excerpt hash, and `mktemp -d`, each as\n"
     "  written there, with absolute paths, and nothing chained to it (`;`, `&&`), wrapped around\n"
     "  it (`cd`, a variable, a loop, a function) or redirected. Read files with Read; list and\n"
     "  search them with Glob and Grep where your host has them, otherwise with one plain\n"
     "  `ls`, `find` or `grep -n` on absolute paths, under the same rule. No `$` anywhere in a\n"
     "  command: it needs approval, which an unattended session denies (`grep -x` matches a whole\n"
     "  line, never `^…$`). Never install, build,",
     "  converter and `pdftotext`, read-only `git`, the excerpt hash, and `mktemp -d`, each as\n"
     "  written there, and nothing chained to it (`;`, `&&`), wrapped around it (`cd`, a\n"
     "  variable, a loop, a function) or redirected. Paths are absolute, except in `git`: it runs\n"
     "  in the session's working folder, the repository, with repo-relative paths, and never\n"
     "  takes `-C` (a session that allows `git show` denies `git -C <path> show`). Read files\n"
     "  with Read; list and search them with Glob and Grep where your host has them (some hosts\n"
     "  have neither), otherwise with one plain `ls`, `find` or `grep -n` on absolute paths,\n"
     "  under the same rule: `-F` for literal text, `-x` for a whole line, one `-e` per pattern.\n"
     "  No `$` anywhere in a command and no braces holding a comma (`.{0,80}`, `{a,b}`): both\n"
     "  need approval, which an unattended session denies (`grep -x` matches a whole line, never\n"
     "  `^…$`; for a passage's context, `grep -n` its words, then Read those lines). Never\n"
     "  install, build,"),
    # B6 failed: permissions
    ("  - `failed: permissions`: a call your brief gives, in its given form, is denied. Do not\n"
     "    retry it or route around it with another tool; write what you have and name the call.",
     "  - `failed: permissions`: a call your brief gives, in its given form, is denied. Do not\n"
     "    retry it or route around it with another tool; write what you have and name the call.\n"
     "    A denied call in any other form is your own error, never this status: write it again\n"
     "    once in a form your brief gives, and go on."),
]

for old, new in EDITS:
    n = s.count(old)
    if n != 1:
        sys.exit(f"edit anchor found {n} times: {old[:80]!r}")
    s = s.replace(old, new)
canon.write_text(s)

# sync: web is a byte copy; .agents keeps its own frontmatter and takes the canonical body
(root / "web/public/SKILL.md").write_text(s)
port = root / ".agents/skills/explain/SKILL.md"
p = port.read_text()


def split_fm(t):
    assert t.startswith("---\n")
    i = t.index("\n---\n", 4) + 5
    return t[:i], t[i:]


port.write_text(split_fm(p)[0] + split_fm(s)[1])
print("fix1 applied:", len(EDITS), "edits")

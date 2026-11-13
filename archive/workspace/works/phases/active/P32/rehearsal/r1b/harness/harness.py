#!/usr/bin/env python3
"""P32.F1 rehearsal harness (copied from P32.S7's; token f1-token): build an isolated `claude -p` run, check its env with §2's resolver,
run it, report cost, and leak-scan. Usage:
  harness.py make <spec.json>      -> writes runs/<name>/cmd.sh and prints the resolver check
  harness.py cost <name>           -> cost / duration / turns from runs/<name>/out.jsonl
"""
import json, os, shlex, subprocess, sys

S7 = os.path.dirname(os.path.abspath(__file__))
REPO = "/Users/sugang/projects/personal/knowledge"
CLAUDE = "/Users/sugang/.local/share/claude/versions/2.1.308"
UNSET = ["CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT", "CLAUDE_CODE_MESSAGING_SOCKET",
         "CLAUDE_CODE_MESSAGING_TOKEN", "CLAUDE_CODE_EXECPATH", "CLAUDE_CODE_SESSION_ID",
         "CLAUDE_CODE_CHILD_SESSION", "CLAUDE_CODE_SESSION_ATTENDED", "CLAUDE_PID", "CLAUDE_EFFORT",
         "KB_ROOT", "KB_API_BASE_URL", "KB_API_TOKEN", "DATABASE_URL", "GEMINI_API_KEY", "GOOGLE_API_KEY"]
DENY = [
    "Read(//Users/sugang/.config/knowledge-kb/**)",
    "Edit(//Users/sugang/.config/knowledge-kb/**)",
    "Read(~/.config/knowledge-kb/**)",
    "Edit(~/.config/knowledge-kb/**)",
    "Bash(*.config/knowledge-kb*)",
]


def allow_rules(state, skill_dir):
    root = os.path.join(state, "knowledge-kb", "explain")
    tools = os.path.join(root, "tools")
    return [
        "WebSearch", "WebFetch",
        "Bash(curl -sS --max-time 30 *)", "Bash(curl -sS --max-time 5 *)",
        f"Bash(python3 -I {tools}/pagetext.py *)", "Bash(pdftotext *)",
        "Bash(git show *)", "Bash(git log *)", "Bash(git grep *)", "Bash(git blame *)",
        "Bash(git diff *)", "Bash(git status *)", "Bash(shasum -a 256 *)", "Bash(mktemp -d *)",
        "Bash(knowledge --base-url *)", "Bash(knowledge --version)",
        f"Read(/{root}/**)", f"Edit(/{root}/**)", f"Read(/{skill_dir}/**)",
    ]


def make(spec):
    name = spec["name"]
    rd = os.path.join(S7, "runs", name)
    os.makedirs(rd, exist_ok=True)
    cfg = spec.get("config") or os.path.join(rd, "config"); state = spec.get("state") or os.path.join(rd, "state")
    os.makedirs(cfg, exist_ok=True); os.makedirs(state, exist_ok=True)
    cwd = spec.get("cwd") or os.path.join(rd, "work")
    os.makedirs(cwd, exist_ok=True)
    plugin = spec["plugin"]
    skill_dir = os.path.join(plugin, "skills", "explain")
    env = {
        "XDG_CONFIG_HOME": cfg, "XDG_STATE_HOME": state,
        "KB_ROOT": spec["kb_root"], "KB_API_BASE_URL": spec["api"],
        "KB_API_TOKEN": spec.get("token", "f1-token"),
        "CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION": str(spec.get("searches", 300)),
    }
    env.update(spec.get("env", {}))
    flags = ["-p", "--model", spec["model"]] + (["--plugin-dir", plugin] if spec.get("load_plugin", True) else []) + ["--setting-sources", "project",
             "--permission-mode", spec.get("mode", "manual"), "--no-session-persistence",
             "--output-format", "stream-json", "--verbose"]
    if spec.get("budget"):
        flags += ["--max-budget-usd", str(spec["budget"])]
    flags += spec.get("extra_flags", [])
    rules = allow_rules(state, skill_dir) if spec.get("rules", True) else []
    rules += spec.get("extra_allow", [])
    if rules:
        flags += ["--allowedTools", *rules]
    flags += ["--disallowedTools", *DENY, *spec.get("extra_deny", [])]
    prompt_file = os.path.join(rd, "prompt.txt")
    with open(prompt_file, "w") as f:
        f.write(spec["prompt"].rstrip("\n") + "\n")
    envs = " ".join(f"-u {u}" for u in UNSET) + " " + " ".join(f"{k}={shlex.quote(v)}" for k, v in env.items())
    out = os.path.join(rd, "out.jsonl"); err = os.path.join(rd, "err.txt")
    cmd = (f"#!/bin/bash\ncd {shlex.quote(cwd)}\n"
           f"date +%s > {shlex.quote(os.path.join(rd, 'start'))}\n"
           f"env {envs} {CLAUDE} {' '.join(shlex.quote(x) for x in flags)} "
           f"< {shlex.quote(prompt_file)} > {shlex.quote(out)} 2> {shlex.quote(err)} &\n"
           f"echo $! > {shlex.quote(os.path.join(rd, 'claude.pid'))}\n"
           f"wait $!\n"
           f"echo \"exit $?\" >> {shlex.quote(err)}\n"
           f"date +%s > {shlex.quote(os.path.join(rd, 'end'))}\n")
    path = os.path.join(rd, "cmd.sh")
    with open(path, "w") as f:
        f.write(cmd)
    os.chmod(path, 0o755)
    # resolver check with the same env (the skill's §2 resolver, extracted from the plugin under test)
    skill = open(os.path.join(skill_dir, "SKILL.md")).read()
    start = skill.index("    python3 -c '\n    import json, os")
    end = skill.index("    '\n", start) + 6
    code = "\n".join(l[4:] for l in skill[start:end].split("\n"))
    full_env = {k: v for k, v in os.environ.items() if k not in UNSET}
    full_env.update(env)
    res = subprocess.run(["bash", "-c", code], cwd=cwd, env=full_env, capture_output=True, text=True)
    outp = res.stdout
    bad = "hi2vi" in outp or "knowledge.hi2vi.com" in outp
    print(f"[{name}] resolver ({'FAIL: production value' if bad else 'ok'}):")
    for line in outp.splitlines():
        print("   ", line)
    with open(os.path.join(rd, "resolver.txt"), "w") as f:
        f.write(outp)
    if bad:
        sys.exit(2)
    print(f"[{name}] cmd: {path}")


def cost(name):
    rd = os.path.join(S7, "runs", name)
    last = None; n = 0
    for line in open(os.path.join(rd, "out.jsonl")):
        try:
            e = json.loads(line)
        except Exception:
            continue
        if e.get("type") == "result":
            last = e; n += 1
    if not last:
        print(f"[{name}] no result event"); return
    try:
        wall = int(open(os.path.join(rd, "end")).read()) - int(open(os.path.join(rd, "start")).read())
    except Exception:
        wall = None
    print(json.dumps({"name": name, "results": n, "subtype": last.get("subtype"),
                      "cost": last.get("total_cost_usd"), "turns": last.get("num_turns"),
                      "duration_ms": last.get("duration_ms"), "wall_s": wall,
                      "is_error": last.get("is_error")}))


if __name__ == "__main__":
    if sys.argv[1] == "make":
        make(json.load(open(sys.argv[2])))
    elif sys.argv[1] == "cost":
        for nm in sys.argv[2:]:
            cost(nm)

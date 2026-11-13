#!/usr/bin/env python3
"""Kill a nested rehearsal run whose estimated cost passes a threshold. P32.S9: under `claude -p` the stream
carries the main thread's and depth-1 agents' messages (with usage) but not depth-2 agents' messages, so
watchdog2's estimate is blind to depth 2. This adds a flat assumed cost per depth-2 dispatch (an Agent tool_use
whose parent_tool_use_id is set), by its subagent_type.  usage: watchdog3.py <name> <usd>"""
import json, os, signal, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from estcost import est
RUNS = "/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s9/runs"
PER = {"knowledge:web-researcher": 2.0, "knowledge:code-researcher": 2.0, "knowledge:gap-reviewer": 1.5,
       "knowledge:verifier": 0.6, "general-purpose": 0.3}


def depth2(path):
    n = {}; tot = 0.0
    for l in open(path):
        try:
            e = json.loads(l)
        except Exception:
            continue
        if e.get("type") != "assistant" or not e.get("parent_tool_use_id"):
            continue
        for c in e["message"].get("content", []):
            if c.get("type") == "tool_use" and c.get("name") in ("Agent", "Task"):
                st = (c.get("input") or {}).get("subagent_type", "?")
                n[st] = n.get(st, 0) + 1
                tot += PER.get(st, 1.0)
    return tot, n


if __name__ == "__main__":
    name, cap = sys.argv[1], float(sys.argv[2])
    rd = os.path.join(RUNS, name)
    pidf = os.path.join(rd, "claude.pid")
    while not os.path.exists(pidf):
        time.sleep(2)
    pid = int(open(pidf).read())

    def alive():
        try:
            os.kill(pid, 0); return True
        except OSError:
            return False
    while alive():
        out = os.path.join(rd, "out.jsonl")
        try:
            c1, _ = est(out); c2, n = depth2(out)
        except FileNotFoundError:
            c1, c2, n = 0.0, 0.0, {}
        cost = c1 + c2
        open(os.path.join(rd, "watch.txt"), "w").write(f"{time.time():.0f} {cost:.2f} (stream {c1:.2f} + depth-2 {c2:.2f} {json.dumps(n)})\n")
        if cost > cap:
            os.kill(pid, signal.SIGTERM)
            open(os.path.join(rd, "watchdog.txt"), "w").write(f"killed at estimated cost {cost:.2f} > {cap}\n")
            break
        time.sleep(15)

#!/usr/bin/env python3
"""Kill a rehearsal run whose estimated running cost (streamed usage, subagents included) passes a threshold.
usage: watchdog2.py <name> <usd>   (P32.S9: runs under <S9>/runs/<name>/)"""
import os, signal, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from estcost import est
RUNS = "/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s9/runs"
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
    try:
        cost, _ = est(os.path.join(rd, "out.jsonl"))
    except FileNotFoundError:
        cost = 0.0
    open(os.path.join(rd, "watch.txt"), "w").write(f"{time.time():.0f} {cost:.2f}\n")
    if cost > cap:
        os.kill(pid, signal.SIGTERM)
        open(os.path.join(rd, "watchdog.txt"), "w").write(f"killed at estimated cost {cost:.2f} > {cap}\n")
        break
    time.sleep(15)

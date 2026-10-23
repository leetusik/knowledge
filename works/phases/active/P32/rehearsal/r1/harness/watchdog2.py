#!/usr/bin/env python3
"""Kill a rehearsal run whose estimated running cost (streamed usage) passes a threshold. usage: watchdog2.py <name> <usd>"""
import os, signal, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from estcost import est
S7 = os.path.dirname(os.path.abspath(__file__))
name, cap = sys.argv[1], float(sys.argv[2])
rd = os.path.join(S7, "runs", name)
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
    cost, _ = est(os.path.join(rd, "out.jsonl"))
    open(os.path.join(rd, "watch.txt"), "w").write(f"{time.time():.0f} {cost:.2f}\n")
    if cost > cap:
        os.kill(pid, signal.SIGTERM)
        open(os.path.join(rd, "watchdog.txt"), "w").write(f"killed at estimated cost {cost:.2f} > {cap}\n")
        break
    time.sleep(15)

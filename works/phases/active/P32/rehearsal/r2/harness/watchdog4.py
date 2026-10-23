#!/usr/bin/env python3
"""Kill a persisted rehearsal run whose cost, read from its own session transcripts (main thread plus every
span under subagents/, any depth), passes a threshold. P32.S9: watchdog2/3 estimate from the stream, which
misses depth-2 messages and prices 1 h cache writes as 5 m (it read 0.87x the real cost on the DECOMP).
A fixed $1.5 covers what the transcripts do not show (the web search tool's own calls and fees).
usage: watchdog4.py <run name> <session dir of the cwd> <usd>"""
import glob, os, signal, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spans import scan
RUNS = "/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s9/runs"
name, sdir, cap = sys.argv[1], sys.argv[2], float(sys.argv[3])
rd = os.path.join(RUNS, name)
pid = int(open(os.path.join(rd, "claude.pid")).read())
start = os.path.getmtime(os.path.join(rd, "claude.pid")) - 5


def alive():
    try:
        os.kill(pid, 0); return True
    except OSError:
        return False


while alive():
    total = 1.5
    for main in glob.glob(os.path.join(sdir, "*.jsonl")):
        if os.path.getmtime(main) < start:
            continue
        total += scan(main)[0]
        for jl in glob.glob(os.path.join(main[:-len(".jsonl")], "subagents", "agent-*.jsonl")):
            total += scan(jl)[0]
    open(os.path.join(rd, "watch4.txt"), "w").write(f"{time.time():.0f} {total:.2f}\n")
    if total > cap:
        os.kill(pid, signal.SIGTERM)
        open(os.path.join(rd, "watchdog.txt"), "w").write(f"killed at transcript cost {total:.2f} > {cap}\n")
        break
    time.sleep(20)

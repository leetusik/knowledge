#!/usr/bin/env python3
"""Web searches per span of a persisted session (P32.S9): usage.server_tool_use.web_search_requests, one count per
message id (largest kept), and WebSearch tool_use blocks as a cross-check. usage: searches.py <session.jsonl>"""
import glob, json, os, sys
def count(path):
    reqs = {}; uses = set()
    for l in open(path):
        try:
            e = json.loads(l)
        except Exception:
            continue
        if e.get("type") != "assistant":
            continue
        m = e.get("message") or {}
        for c in m.get("content") or []:
            if isinstance(c, dict) and c.get("type") == "tool_use" and c.get("name") == "WebSearch":
                uses.add(c.get("id"))
        s = ((m.get("usage") or {}).get("server_tool_use") or {}).get("web_search_requests", 0) or 0
        mid = m.get("id")
        reqs[mid] = max(reqs.get(mid, 0), s)
    return sum(reqs.values()), len(uses)
main = sys.argv[1]
tot = [0, 0]
a, b = count(main); tot[0] += a; tot[1] += b
print("main", a, b)
for jl in sorted(glob.glob(os.path.join(main[:-6], "subagents", "agent-*.jsonl"))):
    meta = json.load(open(jl[:-6] + ".meta.json")) if os.path.exists(jl[:-6] + ".meta.json") else {}
    a, b = count(jl); tot[0] += a; tot[1] += b
    print(meta.get("spawnDepth"), meta.get("agentType"), "server:", a, "WebSearch tool_use:", b)
print("total server:", tot[0], "tool_use:", tot[1])

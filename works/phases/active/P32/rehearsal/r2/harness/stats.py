#!/usr/bin/env python3
"""Counts for a stream-json rehearsal run (P32.S9): Agent dispatches by type, depth, model and background,
whether each prompt opens `slice: <id>`, web searches and fetches by depth, and the result's cost.
Depth: 1 = dispatched by the main thread; 2 = dispatched by a subagent (its tool_use has a parent).
Searches made by depth-2 agents are not in the stream (their messages are not streamed): see `hidden`.
usage: stats.py <out.jsonl>"""
import collections, json, re, sys

path = sys.argv[1]
agents = []          # (depth, type, model, bg, first line, tool_use id)
calls = collections.Counter()
owner = {}           # tool_use id of an Agent call -> its depth
res = None
for l in open(path):
    try:
        e = json.loads(l)
    except Exception:
        continue
    if e.get("type") == "result":
        res = e
    if e.get("type") != "assistant":
        continue
    par = e.get("parent_tool_use_id")
    d_here = 0 if not par else owner.get(par, 1)
    for c in e["message"].get("content", []):
        if c.get("type") != "tool_use":
            continue
        name = c["name"]
        calls[(d_here, name)] += 1
        if name in ("Agent", "Task"):
            i = c.get("input") or {}
            first = (i.get("prompt") or "").split("\n", 1)[0][:80]
            owner[c["id"]] = d_here + 1
            agents.append((d_here + 1, i.get("subagent_type"), i.get("model"), i.get("run_in_background"), first, c["id"][-6:]))

print("dispatches:", len(agents))
by = collections.Counter((a[0], a[1], a[2], a[3]) for a in agents)
for k, v in sorted(by.items(), key=lambda x: (x[0][0], str(x[0][1]))):
    print(f"  depth {k[0]} {k[1]} model={k[2]} bg={k[3]}: {v}")
bad = [a for a in agents if not re.match(r"^slice:\s*P\d+\.[A-Za-z0-9]+", a[4])]
print("prompts not opening `slice: <id>`:", len(bad))
for a in bad[:10]:
    print("   ", a)
print("tool calls by the depth of the caller (0 = main thread):")
for (d, n), v in sorted(calls.items()):
    print(f"  {d} {n}: {v}")
if res:
    print("result:", json.dumps({k: res.get(k) for k in ("subtype", "total_cost_usd", "num_turns", "duration_ms", "is_error")}))
    mu = res.get("modelUsage") or {}
    for m, u in mu.items():
        print(f"  {m}: cost {u.get('costUSD')} web_search {u.get('webSearchRequests')}")

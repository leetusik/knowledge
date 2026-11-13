#!/usr/bin/env python3
"""Print a compact timeline of a stream-json run: tool uses (with parent), tool results (short), system events."""
import json, sys
path = sys.argv[1]; width = int(sys.argv[2]) if len(sys.argv) > 2 else 160
for i, l in enumerate(open(path)):
    try: e = json.loads(l)
    except Exception: continue
    t = e.get("type"); st = e.get("subtype")
    par = e.get("parent_tool_use_id")
    tag = f"[{i}] {t}{'/'+st if st else ''}" + (f" par={par[-6:]}" if par else "")
    if t == "assistant":
        for c in e["message"].get("content", []):
            if c.get("type") == "tool_use":
                print(tag, "TOOL_USE", c.get("id","")[-6:], c["name"], json.dumps(c.get("input"))[:width])
            elif c.get("type") == "text":
                print(tag, "TEXT", c["text"][:width].replace("\n", " | "))
    elif t == "user":
        cont = e["message"].get("content")
        if isinstance(cont, str):
            print(tag, "USER", cont[:width].replace("\n", " | "))
        else:
            for c in cont or []:
                if c.get("type") == "tool_result":
                    r = c.get("content")
                    if isinstance(r, list):
                        r = " ".join(x.get("text", "") for x in r if isinstance(x, dict))
                    print(tag, "RESULT", c.get("tool_use_id","")[-6:], ("ERR " if c.get("is_error") else "") + str(r)[:width].replace("\n", " | "))
                elif c.get("type") == "text":
                    print(tag, "USERTEXT", c["text"][:width].replace("\n", " | "))
    elif t == "system":
        keys = {k: v for k, v in e.items() if k not in ("type", "subtype", "session_id", "uuid", "tools", "mcp_servers", "slash_commands", "agents", "skills", "plugins")}
        print(tag, json.dumps(keys)[:width])
    elif t == "result":
        print(tag, "cost", e.get("total_cost_usd"), "turns", e.get("num_turns"))
    else:
        print(tag, json.dumps(e)[:width])

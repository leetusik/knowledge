import json,sys
for name in sys.argv[1:]:
    uses={}; den=[]
    for l in open(f"runs/{name}/out.jsonl"):
        try: e=json.loads(l)
        except: continue
        if e.get("type")=="assistant":
            for c in e["message"].get("content",[]):
                if c.get("type")=="tool_use": uses[c["id"]]=(e.get("parent_tool_use_id"), c["name"], c.get("input"))
        if e.get("type")=="system" and e.get("subtype")=="permission_denied": den.append(e)
    print("==",name,len(den))
    for d in den:
        u=uses.get(d.get("tool_use_id"))
        who="lead" if (u and not u[0]) else ("sub" if u else "?")
        inp=u[2] if u else {}
        s=inp.get("command") or inp.get("file_path") or inp.get("pattern") or inp.get("url") or json.dumps(inp)[:200]
        print(f"  [{who}] {d.get('tool_name')}: {str(s)[:300]!r}")
        print(f"        reason={d.get('decision_reason_type')}")

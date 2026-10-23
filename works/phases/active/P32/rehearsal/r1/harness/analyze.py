#!/usr/bin/env python3
"""Summarize a rehearsal run's stream-json: cost, tools, dispatches, denials, searches, models."""
import collections, json, os, sys

S7 = os.path.dirname(os.path.abspath(__file__))


def analyze(name, verbose=False):
    p = os.path.join(S7, "runs", name, "out.jsonl")
    lead_tools = collections.Counter(); sub_tools = collections.Counter()
    dispatch = []; denials = []; models = collections.Counter(); results = []
    task_types = {}; task_status = collections.Counter(); notif = []
    lead_bash = []
    for line in open(p):
        try:
            e = json.loads(line)
        except Exception:
            continue
        t = e.get("type"); st = e.get("subtype")
        if t == "assistant":
            par = e.get("parent_tool_use_id")
            m = e["message"].get("model")
            models[("sub" if par else "lead", m)] += 1
            for c in e["message"].get("content", []):
                if c.get("type") == "tool_use":
                    (sub_tools if par else lead_tools)[c["name"]] += 1
                    if not par and c["name"] in ("Task", "Agent"):
                        inp = c.get("input", {})
                        dispatch.append((inp.get("subagent_type"), inp.get("model"), inp.get("run_in_background"),
                                         (inp.get("description") or "")[:60]))
                    if not par and c["name"] == "Bash":
                        lead_bash.append(c["input"].get("command", "")[:160].replace("\n", " "))
        elif t == "system" and st == "permission_denied":
            denials.append((e.get("tool_name"), (e.get("message") or "")[:260].replace("\n", " ")))
        elif t == "system" and st == "task_started":
            task_types[e.get("task_id")] = e.get("subagent_type") or e.get("description")
        elif t == "system" and st == "task_notification":
            notif.append((e.get("status"), (e.get("summary") or "")[:100]))
            task_status[e.get("status")] += 1
        elif t == "result":
            results.append(e)
    last = results[-1] if results else {}
    print(f"== {name}")
    print("  results:", len(results), "cost:", last.get("total_cost_usd"), "turns:", last.get("num_turns"),
          "dur_s:", round((last.get("duration_ms") or 0) / 1000), "subtype:", last.get("subtype"))
    print("  models:", dict(models))
    print("  lead tools:", dict(lead_tools))
    print("  sub tools (streamed):", dict(sub_tools))
    dc = collections.Counter((d[0], d[1]) for d in dispatch)
    print("  dispatches:", len(dispatch), dict(dc))
    print("  task notifications:", dict(task_status))
    print("  denials:", len(denials))
    for d in denials:
        print("    -", d[0], d[1])
    if verbose:
        for d in dispatch:
            print("    D", d)
        for b in lead_bash:
            print("    $", b)
    if last.get("result"):
        print("  final result (first 1500 chars):")
        print("   ", last["result"][:1500].replace("\n", "\n    "))


if __name__ == "__main__":
    v = "-v" in sys.argv
    for n in [a for a in sys.argv[1:] if a != "-v"]:
        analyze(n, v)

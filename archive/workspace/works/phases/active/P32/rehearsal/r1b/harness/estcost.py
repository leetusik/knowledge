#!/usr/bin/env python3
"""Rough running cost of a run from the streamed assistant messages' usage (deduped by message id)."""
import json, sys
P = {"opus": (5, 25, 0.5, 6.25), "sonnet": (3, 15, 0.3, 3.75), "haiku": (1, 5, 0.1, 1.25)}
def est(path):
    seen = {}; 
    for l in open(path):
        try: e = json.loads(l)
        except Exception: continue
        if e.get("type") != "assistant": continue
        m = e["message"]; u = m.get("usage") or {}
        seen[m.get("id")] = (m.get("model") or "", u)
    tot = 0.0
    for mid, (model, u) in seen.items():
        k = next((k for k in P if k in model), None)
        if not k: continue
        a, b, c, d = P[k]
        tot += (u.get("input_tokens", 0) * a + u.get("output_tokens", 0) * b + u.get("cache_read_input_tokens", 0) * c + u.get("cache_creation_input_tokens", 0) * d) / 1e6
    return tot, len(seen)
if __name__ == "__main__":
    for n in sys.argv[1:]:
        print(n, est(f"runs/{n}/out.jsonl"))

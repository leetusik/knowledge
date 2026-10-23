#!/usr/bin/env python3
"""Per-span cost and attribution from a persisted Claude Code session (P32.S9): the main thread's
`<session>.jsonl` and every `<session>/subagents/agent-*.jsonl` with its `.meta.json`. A request is counted
once per message id, keeping its largest output (as the bootstrap's meter does); cache writes are split
5 m / 1 h by `usage.cache_creation` when present (no split counts as 5 m). The slice is read from the
span's first user prompt by the bootstrap's `slice:` line pattern. List prices, $/MTok.
usage: spans.py <session.jsonl>"""
import glob, json, os, re, sys

P = {"opus": (5, 6.25, 10, 0.5, 25), "sonnet": (3, 3.75, 6, 0.3, 15), "haiku": (1, 1.25, 2, 0.1, 5)}
LINE = re.compile(r"(?im)^[\s>*`-]*slice[`*]*\s*:\s*[`*]*(P(?:[0-9]+|-[0-9a-hjkmnp-tv-z]{4})\.[A-Za-z][A-Za-z0-9]*)")


def scan(path):
    reqs = {}; prompt = None; first = last = None; models = {}
    for l in open(path):
        try:
            e = json.loads(l)
        except Exception:
            continue
        ts = e.get("timestamp")
        if ts:
            first = first or ts; last = ts
        if e.get("type") == "user" and prompt is None:
            c = (e.get("message") or {}).get("content")
            if isinstance(c, str):
                prompt = c
            elif isinstance(c, list):
                t = [x.get("text", "") for x in c if isinstance(x, dict) and x.get("type") == "text"]
                if t:
                    prompt = "\n".join(t)
        if e.get("type") != "assistant":
            continue
        m = e.get("message") or {}
        mid = m.get("id") or e.get("requestId")
        u = m.get("usage") or {}
        model = m.get("model") or ""
        if model == "<synthetic>":
            continue
        old = reqs.get(mid)
        if old is None or (u.get("output_tokens") or 0) >= (old[1].get("output_tokens") or 0):
            reqs[mid] = (model, u)
    cost = 0.0
    for model, u in reqs.values():
        k = next((k for k in P if k in model), None)
        if not k:
            continue
        i, w5, w1, r, o = P[k]
        cc = u.get("cache_creation") or {}
        c1 = cc.get("ephemeral_1h_input_tokens", 0) or 0
        c5 = cc.get("ephemeral_5m_input_tokens", None)
        if c5 is None:
            c5 = (u.get("cache_creation_input_tokens", 0) or 0) - c1
        cost += ((u.get("input_tokens", 0) or 0) * i + c5 * w5 + c1 * w1 + (u.get("cache_read_input_tokens", 0) or 0) * r + (u.get("output_tokens", 0) or 0) * o) / 1e6
        models[model] = models.get(model, 0) + 1
    return cost, len(reqs), prompt or "", first, last, models


if __name__ == "__main__":
    main = sys.argv[1]
    c, n, p, f, l, m = scan(main)
    print(f"main thread: ${c:.2f} over {n} requests {m}")
    total = c
    rows = []
    for jl in sorted(glob.glob(os.path.join(main[:-len('.jsonl')], "subagents", "agent-*.jsonl"))):
        meta = {}
        mp = jl[:-len(".jsonl")] + ".meta.json"
        if os.path.exists(mp):
            meta = json.load(open(mp))
        c, n, p, f, l, m = scan(jl)
        total += c
        s = LINE.search(p)
        rows.append((meta.get("spawnDepth"), meta.get("agentType"), meta.get("model") or ",".join(m), meta.get("requestShape"),
                     meta.get("finished"), s.group(1) if s else "-", round(c, 2), n, p.split("\n", 1)[0][:70]))
    for r in rows:
        print("  depth {} {} model={} shape={} finished={} slice={} ${} req={} | {}".format(*r))
    by = {}
    for r in rows:
        by[r[0]] = by.get(r[0], 0) + r[6]
    print("by depth:", {k: round(v, 2) for k, v in by.items()}, "total:", round(total, 2))

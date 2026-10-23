#!/usr/bin/env python3
"""Where in a transcript the configured token appears, masked: line no, event type, timestamp, cwd, tool name. Never prints the token."""
import json, os, sys
cfg = json.load(open(os.path.expanduser("~/.config/knowledge-kb/config.json")))
tok = cfg["api"]["token"]
for fp in sys.argv[1:]:
    for n, line in enumerate(open(fp, encoding="utf-8", errors="replace"), 1):
        if tok in line:
            try:
                e = json.loads(line)
            except Exception:
                print(fp.split("/")[-1], n, "unparsable"); continue
            tool = ""
            msg = e.get("message") or {}
            if isinstance(msg, dict) and isinstance(msg.get("content"), list):
                tool = ",".join(c.get("name", c.get("type", "")) for c in msg["content"] if isinstance(c, dict))
            print(fp.split("/")[-1][:8], "line", n, e.get("type"), e.get("timestamp"), "cwd=", e.get("cwd"), "content:", tool)

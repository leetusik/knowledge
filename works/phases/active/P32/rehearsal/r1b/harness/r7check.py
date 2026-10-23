#!/usr/bin/env python3
"""R7's `knowledge check` on every chapter against one fresh scratch API.
usage: r7check.py <api> <name>=<source api>,<rel> ...
Prints one line per chapter: name, exit code, the CLI's line.
"""
import json, os, re, subprocess, sys, urllib.request

S7 = os.path.dirname(os.path.abspath(__file__))


def fetch(api, rel):
    req = urllib.request.Request(f"{api}/api/documents/by-path/{rel}", headers={"Authorization": "Bearer f1-token"})
    return json.load(urllib.request.urlopen(req))


def main():
    api = sys.argv[1]
    os.makedirs(os.path.join(S7, "r7"), exist_ok=True)
    for arg in sys.argv[2:]:
        name, rest = arg.split("=", 1)
        src_api, rel = rest.split(",", 1)
        doc = fetch(src_api, rel)
        m = re.match(r"^---\n(.*?)\n---\n(.*)$", doc["source"], re.S)
        body = m.group(2).lstrip("\n")
        head = m.group(1)
        summary = re.search(r'^summary: "?(.*?)"?$', head, re.M)
        subject = re.search(r'^subject: "?(.*?)"?$', head, re.M)
        lang = re.search(r'^lang: (.*)$', head, re.M)
        path = os.path.join(S7, "r7", f"{name}.md")
        open(path, "w").write(body)
        cmd = ["knowledge", "--base-url", api, "check", path, "--format", "native", "--title", doc["title"],
               "--project", doc["project"]]
        for t in doc["tags"]:
            cmd += ["--tag", t]
        if summary:
            cmd += ["--summary", summary.group(1).replace('\\"', '"')]
        if subject:
            cmd += ["--subject", subject.group(1)]
        if lang:
            cmd += ["--lang", lang.group(1).strip()]
        env = {k: v for k, v in os.environ.items() if not k.startswith("KB_")}
        env.update({"KB_API_TOKEN": "f1-token", "XDG_CONFIG_HOME": os.path.join(S7, "clitest", "cfg")})
        r = subprocess.run(cmd, capture_output=True, text=True, env=env)
        out = (r.stdout + r.stderr).strip().replace("\n", " | ")
        print(f"{name}\texit={r.returncode}\t{out[:300]}")


if __name__ == "__main__":
    main()

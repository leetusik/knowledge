#!/usr/bin/env python3
"""Per findings file: queries listed under ## Queries; duplicates across researchers (normalized)."""
import glob, os, re, sys, collections
def norm(q):
    q = q.lower(); q = re.sub(r'\(domains?:.*?\)', '', q); q = re.sub(r'[^a-z0-9 ]+', ' ', q)
    return ' '.join(sorted(set(q.split())))
for d in sys.argv[1:]:
    allq = []; per = {}
    for f in sorted(glob.glob(os.path.join(d, "findings", "*.md"))):
        t = open(f).read(); m = re.search(r'^## Queries\n(.*?)(?=^## |\Z)', t, re.S | re.M)
        qs = []
        if m:
            for line in m.group(1).splitlines():
                mm = re.match(r'^- "(.*?)"', line.strip()) or re.match(r'^- `(.*?)`', line.strip())
                if mm: qs.append(mm.group(1))
        per[os.path.basename(f)] = qs; allq += [(os.path.basename(f), q) for q in qs]
    c = collections.Counter(norm(q) for _, q in allq)
    owners = collections.defaultdict(set)
    for f, q in allq: owners[norm(q)].add(f)
    dup_exact = sum(n - 1 for n in c.values() if n > 1)
    cross = sum(1 for k, v in owners.items() if len(v) > 1)
    print(os.path.basename(d.rstrip('/')), {k: len(v) for k, v in per.items()}, "total", len(allq), "dup(normalized)", dup_exact, "cross-researcher dup", cross)

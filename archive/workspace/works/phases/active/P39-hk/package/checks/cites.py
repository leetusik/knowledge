"""P33-n3's citation check (works/phases/active/P33-n3/topics/citations.md), pointed at given files.

Every `§N *Heading*`, `B<n> *Heading*` and `Part B *Heading*` in the files must be a heading of the
skill with that number and text. Added here: an unnumbered heading the files cite by name
(*The run, in one card*, *The front door, step by step*) must exist, and a bold part cited right after a
numbered heading (`§1 *Resolve …*, *The reader*`) must open a bold run (`**The reader`) in the skill.

Usage: cites.py <SKILL.md> <file> [<file> …]
"""
import re
import sys

skill = open(sys.argv[1], encoding="utf-8").read()
heads = set()
for l in skill.splitlines():
    m = re.match(r'^#{2,4} (?:(\d+(?:\.\d+)*)\.? |(B\d+)\. |(Part B)\. )?(.*)$', l)
    if m:
        heads.add(((m.group(1) or m.group(2) or m.group(3) or ''), m.group(4).strip()))
bad = n = nb = 0
for f in sys.argv[2:]:
    for i, l in enumerate(open(f, encoding="utf-8"), 1):
        for m in re.finditer(r'(§(\d+(?:\.\d+)*)|(B\d{1,2})|(Part B)) \*([^*]+)\*((?:, (?:its )?\*[^*]+\*)*)', l):
            num = m.group(2) or m.group(3) or m.group(4)
            h = m.group(5).strip()
            if num == '5' and 'merges back' in h:
                continue  # parallel-phase's own §5
            n += 1
            if not any(hn == num and (hh == h or hh.startswith(h)) for hn, hh in heads):
                bad += 1
                print(f"MISSING {f}:{i}: {num} *{h}*")
            for b in re.findall(r'\*([^*]+)\*', m.group(6) or ''):
                nb += 1
                if f"**{b}" not in skill and not any(hh == b for _, hh in heads):
                    bad += 1
                    print(f"MISSING bold {f}:{i}: {num} *{h}*, *{b}*")
for name in ('The run, in one card', 'The front door, step by step'):
    if not any(hh == name for _, hh in heads):
        bad += 1
        print(f"MISSING heading {name}")
print(f"citations checked={n} bold parts checked={nb} missing={bad}")
sys.exit(1 if bad else 0)

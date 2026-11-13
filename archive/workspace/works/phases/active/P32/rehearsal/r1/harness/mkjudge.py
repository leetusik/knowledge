#!/usr/bin/env python3
"""Build the blind judge folders for one subject.
usage: mkjudge.py <G|C> <old_api> <old_rel> <new_api> <new_rel>
Writes judge/<subj>-o1 (chapter-1 = old) and judge/<subj>-o2 (chapter-1 = new), plus judge/key-<subj>.json.
"""
import json, os, re, shutil, sys, urllib.request

S7 = os.path.dirname(os.path.abspath(__file__))
REH = "/Users/sugang/projects/personal/knowledge/works/phases/active/P32/rehearsal/r1"


def fetch(api, rel):
    req = urllib.request.Request(f"{api}/api/documents/by-path/{rel}",
                                 headers={"Authorization": "Bearer s7-token"})
    return json.load(urllib.request.urlopen(req))


def split(source):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", source, re.S)
    head, body = m.group(1), m.group(2)
    meta = {}
    for line in head.splitlines():
        if ":" in line and not line.startswith(" "):
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip().strip('"')
    return meta, body.lstrip("\n")


def chapter_text(doc):
    meta, body = split(doc["source"])
    title = doc.get("title") or meta.get("title", "")
    summary = meta.get("summary", "")
    out = f"# {title}\n\n"
    if summary:
        out += f"_Summary: {summary}_\n\n"
    return out + body, body


def words(text):
    return len(re.findall(r"\b\w[\w'-]*\b", text))


def section(subj):
    s = open(os.path.join(REH, "subjects.md")).read()
    start = s.index("## G." if subj == "G" else "## C.")
    end = s.index("\n---\n", start) if subj == "G" else len(s)
    return s[start:end]


def main():
    subj, old_api, old_rel, new_api, new_rel = sys.argv[1:6]
    old_doc, new_doc = fetch(old_api, old_rel), fetch(new_api, new_rel)
    old_txt, old_body = chapter_text(old_doc)
    new_txt, new_body = chapter_text(new_doc)
    brief = open(os.path.join(S7, f"brief-{subj}.txt")).read()
    sec = section(subj)
    pts = sec[sec.index("**Must-cover"):]
    key = {}
    for order, first, second in (("o1", "old", "new"), ("o2", "new", "old")):
        d = os.path.join(S7, "judge", f"{subj}-{order}")
        if os.path.exists(d):
            shutil.rmtree(d)
        os.makedirs(d)
        texts = {"old": (old_txt, old_body), "new": (new_txt, new_body)}
        open(os.path.join(d, "chapter-1.md"), "w").write(texts[first][0])
        open(os.path.join(d, "chapter-2.md"), "w").write(texts[second][0])
        open(os.path.join(d, "brief.md"), "w").write("# The request both chapters answer\n\n" + brief)
        open(os.path.join(d, "points.md"), "w").write(f"# Hidden checklist, subject {subj}\n\n" + pts)
        shutil.copy(os.path.join(S7, "judge-rubric.md"), os.path.join(d, "rubric.md"))
        open(os.path.join(d, "wordcounts.txt"), "w").write(
            f"chapter-1.md: {words(texts[first][1])} words (body)\nchapter-2.md: {words(texts[second][1])} words (body)\n")
        key[order] = {"chapter-1": first, "chapter-2": second}
    key["rel"] = {"old": old_rel, "new": new_rel}
    key["words"] = {"old": words(old_body), "new": words(new_body)}
    json.dump(key, open(os.path.join(S7, "judge", f"key-{subj}.json"), "w"), indent=1)
    # keep the chapters themselves (body as stored, header stripped) for the rehearsal record
    os.makedirs(os.path.join(REH, "chapters"), exist_ok=True)
    open(os.path.join(REH, "chapters", f"{subj.lower()}-old.md"), "w").write(old_doc["source"])
    open(os.path.join(REH, "chapters", f"{subj.lower()}-new.md"), "w").write(new_doc["source"])
    print(json.dumps(key))


if __name__ == "__main__":
    main()

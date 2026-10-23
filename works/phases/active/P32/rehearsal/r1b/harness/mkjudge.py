#!/usr/bin/env python3
"""P32.F1: build the blind judge folders for one subject (S7's mkjudge.py, re-rooted).
usage: mkjudge.py <G|C> <new_api|file> <new_rel|path to a stored source> [tag]
The OLD chapter is rehearsal 1's kept file (rehearsal/r1/chapters/<subj>-old.md: the stored source,
header included, exactly what S7's stack-old served). The NEW chapter is fetched from the F1 scratch API.
Writes judge/<subj>-o1[tag] (chapter-1 = old) and judge/<subj>-o2[tag] (chapter-1 = new), plus
judge/key-<subj>[tag].json, and keeps the new chapter's stored source in rehearsal/r1b/chapters/.
"""
import json, os, re, shutil, sys, urllib.request

F1 = os.path.dirname(os.path.abspath(__file__))
R1 = "/Users/sugang/projects/personal/knowledge/works/phases/active/P32/rehearsal/r1"
R1B = "/Users/sugang/projects/personal/knowledge/works/phases/active/P32/rehearsal/r1b"


def fetch(api, rel):
    req = urllib.request.Request(f"{api}/api/documents/by-path/{rel}",
                                 headers={"Authorization": "Bearer f1-token"})
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


def chapter_text(source, title=None):
    meta, body = split(source)
    title = title or meta.get("title", "")
    summary = meta.get("summary", "")
    out = f"# {title}\n\n"
    if summary:
        out += f"_Summary: {summary}_\n\n"
    return out + body, body


def words(text):
    return len(re.findall(r"\b\w[\w'-]*\b", text))


def section(subj):
    s = open(os.path.join(R1, "subjects.md")).read()
    start = s.index("## G." if subj == "G" else "## C.")
    end = s.index("\n---\n", start) if subj == "G" else len(s)
    return s[start:end]


def main():
    subj, new_api, new_rel = sys.argv[1:4]
    tag = sys.argv[4] if len(sys.argv) > 4 else ""
    old_src = open(os.path.join(R1, "chapters", f"{subj.lower()}-old.md")).read()
    new_doc = {"source": open(new_rel).read()} if new_api == "file" else fetch(new_api, new_rel)
    old_txt, old_body = chapter_text(old_src)
    new_txt, new_body = chapter_text(new_doc["source"], new_doc.get("title"))
    brief = open(os.path.join(F1, f"brief-{subj}.txt")).read()
    sec = section(subj)
    pts = sec[sec.index("**Must-cover"):]
    key = {}
    for order, first, second in (("o1", "old", "new"), ("o2", "new", "old")):
        d = os.path.join(F1, "judge", f"{subj}-{order}{tag}")
        if os.path.exists(d):
            shutil.rmtree(d)
        os.makedirs(d)
        texts = {"old": (old_txt, old_body), "new": (new_txt, new_body)}
        open(os.path.join(d, "chapter-1.md"), "w").write(texts[first][0])
        open(os.path.join(d, "chapter-2.md"), "w").write(texts[second][0])
        open(os.path.join(d, "brief.md"), "w").write("# The request both chapters answer\n\n" + brief)
        open(os.path.join(d, "points.md"), "w").write(f"# Hidden checklist, subject {subj}\n\n" + pts)
        shutil.copy(os.path.join(F1, "judge-rubric.md"), os.path.join(d, "rubric.md"))
        open(os.path.join(d, "wordcounts.txt"), "w").write(
            f"chapter-1.md: {words(texts[first][1])} words (body)\nchapter-2.md: {words(texts[second][1])} words (body)\n")
        key[order + tag] = {"chapter-1": first, "chapter-2": second}
    key["rel"] = {"old": f"rehearsal/r1/chapters/{subj.lower()}-old.md", "new": new_rel}
    key["words"] = {"old": words(old_body), "new": words(new_body)}
    json.dump(key, open(os.path.join(F1, "judge", f"key-{subj}{tag}.json"), "w"), indent=1)
    os.makedirs(os.path.join(R1B, "chapters"), exist_ok=True)
    if new_api != "file":
        open(os.path.join(R1B, "chapters", f"{subj.lower()}-new{tag}.md"), "w").write(new_doc["source"])
    print(json.dumps(key))


if __name__ == "__main__":
    main()

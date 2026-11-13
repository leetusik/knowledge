import json, sys, uuid, urllib.request, subprocess
A = "http://127.0.0.1:8911"
SP = "/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/e7ea5b44-3c7d-4e6d-8ebc-268a3e5a2b8a/scratchpad/s27"
import json as _j
TOK = _j.load(open(f"{SP}/accts.json"))["a"]["session"]
ORG = "s27org"

def call(method, path, body=None):
    req = urllib.request.Request(A + path, method=method, data=json.dumps(body).encode() if body is not None else None,
        headers={"authorization": f"Bearer {TOK}", "content-type": "application/json"})
    try:
        r = urllib.request.urlopen(req); return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        print("ERR", e.code, e.read()[:300], path); raise

def attempt(project, doc, block, item, itype, response, correct, version=None):
    b = {"org": ORG, "project": project, "doc": doc, "id": str(uuid.uuid4()), "block_id": block, "item_id": item,
         "item_type": itype, "response": response, "correct": correct}
    if version: b["version"] = version
    return call("POST", "/app/reader/quiz-attempts", b)

def hl(project, doc, block, exact, prefix="", suffix="", note=None, title="", ch=""):
    b = {"org": ORG, "project": project, "doc": doc, "id": str(uuid.uuid4()), "block_id": block,
         "quote": {"exact": exact, "prefix": prefix, "suffix": suffix}, "snapshot": {"text": exact, "block_title": title, "chapter_title": ch}}
    if note: b["note"] = note
    a = call("POST", "/app/reader/annotations", b)["annotation"]
    call("PATCH", f"/app/reader/annotations/{a['id']}", {"review": True})
    return a

F = "fixtures"
D1, D2, D3, D5 = "2026-10-21-every-block-once", "2026-10-21-write-lock", "2026-10-21-write-lock-ko", "2026-10-21-compound-growth"
if len(sys.argv) > 1 and sys.argv[1] == "reset":
    call("DELETE", "/app/reader/state?scope=all")
    sys.exit()
attempt(F, D1, "quiz", "q-choice", "choice", {"selected": ["b"]}, True)
attempt(F, D1, "quiz", "q-multi", "choice", {"selected": ["a", "b", "d"]}, True)
attempt(F, D1, "quiz", "q-recall", "recall", {"self_grade": "missed"}, False)
attempt(F, D1, "quiz", "q-cloze", "cloze", {"blanks": ["nope", "fills"]}, False)
attempt(F, D2, "lock-quiz", "lock-choice", "choice", {"selected": ["one"]}, True)
attempt(F, D3, "lock-quiz", "lock-recall", "recall", {"self_grade": "got"}, True)
attempt(F, D2, "lock-quiz", "lock-cloze", "cloze", {"blanks": ["waits"]}, True)
attempt("fixture-finance", D5, "check", "q-double", "cloze", {"blanks": ["12"]}, True)
hl(F, D1, "background", "invented fixture", "This chapter is an ", ". Every sentence", note="Keep this in mind when reading the rest.\nSecond line of the note.", title="Background", ch="Every block, once")
hl(F, D1, "background", "A cache keeps a copy of an answer close to the place that asks for it", "", ", so the next ask is cheap.", title="Background", ch="Every block, once")
hl(F, D1, "quiz-section", "hidden", "", "", title="Quiz", ch="Every block, once") if False else None
hl(F, D3, "background", "한 번에 한 명의 작성자만 들어오게 합니다", "", "", note="작성자가 한 명씩만 들어오는 이유를 기억하자.", title="배경", ch="쓰기 잠금")
hl(F, D1, "background", "Every sentence in it is made up", "", ", so that the reader", note=("A long note that goes on and on about why this sentence matters, so the card shows how a five hundred character note sets in its measure. " * 4)[:500], title="Background", ch="Every block, once")
hl("fixture-finance", D5, "idea", "grows by *more* each year" if False else "a fixed share each year", "A balance that grows by ", " grows by", title="The idea", ch="Compound growth in one page")
print(json.dumps(call("GET", "/app/reader/review/queue?limit=50")["counts"]))

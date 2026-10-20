"""Review on FSRS (P30.S10) — the core guarantees only.

1. **Seeding:** only a quiz item's FIRST attempt seeds its card, rated from it.
2. **Scheduling:** Again and Good move the due date per FSRS with the one 10-minute
   step, and a preview is exactly what the rating then gets.
3. **Idempotence:** a repeated ``review_id`` is a no-op returning the same result.
4. **Review this:** off suspends the card and keeps its history; on resumes it;
   deleting the highlight deletes the card.
5. **Visibility** (core test 2's review payload): an unreadable card is in no list
   or count, and every write to it is the constant 404.
6. **The day and the limits:** the local-day boundary at ``day_starts_at_hour`` in
   the profile's zone, and ``limit_reached`` with held cards kept in the counts.
7. **Item drift:** a changed type resets the card; a retired id retires it.

Postgres-gated, on ``tests/test_documents_api``'s harness (skips without
``KB_TEST_DATABASE_URL``).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import text

from server import db

from tests.test_documents_api import _project, _signup, documents_client  # noqa: F401

_QUIZ = """---
format: native
syntax: 1
---

## Intro {#intro}

The lantern burns oil all night long.

```quiz #quiz-1
title: Check
items:
  - id: q1
    type: recall
    prompt: "Why?"
    answer: Because.
  - id: q2
    type: recall
    prompt: "How?"
    answer: Slowly.
```
"""

T0 = datetime(2026, 3, 10, 9, 0, tzinfo=UTC)


@pytest.fixture
def rv(documents_client, tmp_path, monkeypatch):
    """The documents harness, a throwaway content root and a settable review clock."""

    import server.api_auth as api_auth
    import server.review as review

    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    monkeypatch.delenv("KB_OPERATOR_EMAIL", raising=False)
    monkeypatch.setattr(api_auth, "_tenant_one_cache", None)
    clock = {"now": T0}
    monkeypatch.setattr(review, "now", lambda: clock["now"])
    client, engine = documents_client
    return client, engine, clock


def _doc(tenant, project, slug, source=_QUIZ, version=1) -> tuple[int, str]:
    date = "2026-01-01"
    conn = db.connect()
    try:
        doc_id = db.upsert_document(
            conn, project=project, slug=slug, date=date, title=f"Doc {slug}", tags=[],
            source_repo=None, rel_path=f"{project}/{date}-{slug}.md", markdown="Body.",
            format="native", version=version, tenant_id=tenant, source=source,
        )
    finally:
        conn.close()
    return doc_id, f"{date}-{slug}"


def _key(org, project, doc):
    return {"org": org, "project": project, "doc": doc}


def _answer(client, h, key, item="q1", got=True, attempt_id=None):
    body = {"id": attempt_id or str(uuid4()), **key, "block_id": "quiz-1", "item_id": item,
            "item_type": "recall", "response": {"self_grade": "got" if got else "missed"},
            "correct": got}
    r = client.post("/app/reader/quiz-attempts", headers=h, json=body)
    assert r.status_code in (200, 201), r.text
    return r.json()


def _highlight(client, h, key):
    body = {"id": str(uuid4()), **key, "block_id": "intro",
            "quote": {"exact": "burns oil", "prefix": "The lantern ", "suffix": " all night"},
            "note": "remember", "snapshot": {"block_title": "Intro"}}
    r = client.post("/app/reader/annotations", headers=h, json=body)
    assert r.status_code == 201, r.text
    return r.json()["annotation"]["id"]


def _queue(client, h):
    r = client.get("/app/reader/review/queue", headers=h)
    assert r.status_code == 200, r.text
    return r.json()


def _rate(client, h, card_id, rating, review_id=None):
    return client.post(f"/app/reader/review/cards/{card_id}/review", headers=h,
                       json={"rating": rating, "review_id": review_id or str(uuid4())})


def _member(client, prefix):
    h, tenant = _signup(client, f"{prefix}-{uuid4()}@example.com")
    pid = _project(client, h, "lab")
    return h, tenant, pid


def test_first_attempt_seeds_and_ratings_follow_fsrs(rv):
    client, _, clock = rv
    h, tenant, _ = _member(client, "seed")
    _, doc = _doc(tenant, "lab", "lantern")
    key = _key(tenant, "lab", doc)

    # A right first answer is a Good first review: straight to review, days out.
    first = _answer(client, h, key, "q1", got=True)
    card = first["card"]
    assert first["attempt"] == 1 and card["state"] == "review" and card["reps"] == 1
    assert card["interval"] >= 24 * 60
    # A retried first attempt returns the same card; later attempts never touch it.
    retry = _answer(client, h, key, "q1", got=True, attempt_id=first["result"]["id"])
    assert retry["attempt"] == 1 and retry["card"] == card
    again = _answer(client, h, key, "q1", got=False)
    assert again["attempt"] == 2 and again["card"] == card
    # A wrong first answer is Again: the one 10-minute learning step.
    missed = _answer(client, h, key, "q2", got=False)["card"]
    assert (missed["state"], missed["interval"]) == ("learning", 10)

    # The queue: q2 is due today (10 min); q1 is days out (next_due_at).
    q = _queue(client, h)
    assert [c["where"]["item_index"] for c in q["cards"]] == [2]
    assert q["counts"]["due"] == 1 and q["next_due_at"] == card["due"]
    c = q["cards"][0]
    assert c["front"] == {"prompt": [{"type": "text", "text": "How?"}]}
    assert c["where"]["quiz_title"] == "Check" and c["where"]["item_count"] == 2
    assert c["previews"]["again"]["interval"] == 10

    # Good from learning graduates per FSRS, and the preview is exactly the outcome.
    clock["now"] = T0 + timedelta(minutes=15)
    preview = _queue(client, h)["cards"][0]["previews"]["good"]
    r = _rate(client, h, c["card_id"], "good")
    assert r.status_code == 200, r.text
    got = r.json()["card"]
    assert got["state"] == "review" and got["interval"] == preview["interval"]
    assert got["due"] == preview["due"] and got["interval"] >= 24 * 60
    # Again on a review card is a lapse, back in 10 minutes.
    clock["now"] = datetime.fromisoformat(got["due"])
    lapsed = _rate(client, h, c["card_id"], "again").json()["card"]
    assert (lapsed["state"], lapsed["interval"], lapsed["lapses"]) == ("relearning", 10, 1)
    assert lapsed["due_today"] is True


def test_review_is_idempotent_and_review_this_suspends(rv):
    client, engine, _ = rv
    h, tenant, _ = _member(client, "idem")
    _, doc = _doc(tenant, "lab", "lantern")
    key = _key(tenant, "lab", doc)
    ann = _highlight(client, h, key)

    on = client.patch(f"/app/reader/annotations/{ann}", headers=h, json={"review": True})
    assert on.status_code == 200, on.text
    assert on.json()["annotation"]["review"] is True and on.json()["card"]["state"] == "new"
    q = _queue(client, h)
    assert q["counts"]["new_highlights"] == 1
    card = q["cards"][0]
    assert card["front"]["quote"] == "burns oil" and card["front"]["note"] == "remember"
    assert card["front"]["context"]["before"].endswith("The lantern ")
    assert card["back"] is None and card["where"]["block_title"] == "Intro"

    rid = str(uuid4())
    first = _rate(client, h, card["card_id"], "good", rid)
    repeat = _rate(client, h, card["card_id"], "good", rid)
    assert first.status_code == repeat.status_code == 200
    a, b = first.json()["card"], repeat.json()["card"]
    assert (a["due"], a["interval"], a["state"]) == (b["due"], b["interval"], b["state"])
    assert b["replayed"] is True and first.json()["counts"] == repeat.json()["counts"]
    with engine.connect() as conn:
        reps, logs = conn.execute(text(
            "SELECT reps, (SELECT count(*) FROM review_logs WHERE card_id = c.id) "
            "FROM review_cards c WHERE id = :i"), {"i": card["card_id"]}).one()
    assert (reps, logs) == (1, 1)

    # Review this off: suspended, history kept; on again resumes the same card.
    off = client.patch(f"/app/reader/annotations/{ann}", headers=h, json={"review": False})
    assert off.json()["annotation"]["review"] is False and off.json()["card"]["status"] == "suspended"
    assert _queue(client, h)["counts"]["due"] == 0
    assert _rate(client, h, card["card_id"], "good").status_code == 409
    back = client.patch(f"/app/reader/annotations/{ann}", headers=h, json={"review": True})
    assert back.json()["card"]["card_id"] == card["card_id"] and back.json()["card"]["reps"] == 1
    # Suspend from the review surface is the same switch, and its undo.
    s = client.patch(f"/app/reader/review/cards/{card['card_id']}", headers=h,
                     json={"status": "suspended"})
    assert s.status_code == 200 and s.json()["card"]["status"] == "suspended"
    reads = client.get(f"/app/reader/docs/{tenant}/lab/{doc}", headers=h).json()
    assert reads["annotations"][0]["review"] is False

    # Deleting the highlight deletes its card (and its logs).
    assert client.delete(f"/app/reader/annotations/{ann}", headers=h).status_code == 204
    with engine.connect() as conn:
        left = conn.execute(text("SELECT count(*) FROM review_cards WHERE id = :i"),
                            {"i": card["card_id"]}).scalar_one()
    assert left == 0


def test_unreadable_cards_are_hidden_and_writes_404(rv):
    client, _, _ = rv
    a, a_tenant, pid = _member(client, "ua")
    b, _ = _signup(client, f"ub-{uuid4()}@example.com")
    assert client.patch(f"/app/projects/{pid}", json={"visibility": "public"}, headers=a).status_code == 200
    doc_id, doc = _doc(a_tenant, "lab", "lantern")
    key = _key(a_tenant, "lab", doc)
    _answer(client, b, key, "q1", got=False)
    ann = _highlight(client, b, key)
    client.patch(f"/app/reader/annotations/{ann}", headers=b, json={"review": True})
    q = _queue(client, b)
    assert (q["counts"]["due"], q["counts"]["new_highlights"], len(q["cards"])) == (1, 1, 2)
    ids = [c["card_id"] for c in q["cards"]]
    # Another user's card ids are the constant 404.
    assert _rate(client, a, ids[0], "good").status_code == 404

    # Private: nothing in the queue, the counts or by book; every write is a 404.
    assert client.patch(f"/app/projects/{pid}", json={"visibility": "private"}, headers=a).status_code == 200
    q = _queue(client, b)
    assert q["cards"] == [] and q["next_due_at"] is None and q["limit_reached"] is None
    assert (q["counts"]["due"], q["counts"]["new_highlights"], q["counts"]["by_book"]) == (0, 0, [])
    for cid in ids:
        assert _rate(client, b, cid, "good").status_code == 404
        assert client.patch(f"/app/reader/review/cards/{cid}", headers=b,
                            json={"status": "suspended"}).status_code == 404

    # Access returns: the cards come back unchanged.
    assert client.patch(f"/app/projects/{pid}", json={"visibility": "public"}, headers=a).status_code == 200
    assert len(_queue(client, b)["cards"]) == 2

    # The document is deleted: its cards go with it.
    assert client.delete(f"/app/documents/{doc_id}", headers=a).status_code == 204
    q = _queue(client, b)
    assert q["cards"] == [] and q["counts"]["due"] == 0


def test_local_day_and_limit_reached(rv):
    client, _, clock = rv
    h, tenant, _ = _member(client, "day")
    _, doc = _doc(tenant, "lab", "lantern")
    key = _key(tenant, "lab", doc)
    p = client.patch("/app/reader/profile", headers=h,
                     json={"time_zone": "Asia/Seoul", "max_reviews_per_day": 1})
    assert p.status_code == 200, p.text

    # 03:30 in Seoul on 11 March still belongs to the review day of 10 March.
    clock["now"] = datetime(2026, 3, 10, 18, 30, tzinfo=UTC)
    _answer(client, h, key, "q1", got=False)
    _answer(client, h, key, "q2", got=False)
    q = _queue(client, h)
    assert q["day"]["start"] == "2026-03-10T04:00:00+09:00"
    assert q["day"]["end"] == "2026-03-11T04:00:00+09:00"
    assert len(q["cards"]) == 1 and q["counts"]["due"] == 2  # the limit holds one back

    _rate(client, h, q["cards"][0]["card_id"], "good")
    q = _queue(client, h)
    assert q["limit_reached"] == "reviews" and q["cards"] == []
    assert q["counts"]["due"] == 1 and q["counts"]["done_today"] == 1
    assert q["counts"]["by_book"] == [
        {"org": tenant, "project": "lab", "book": None, "book_title": None, "due": 1, "new": 0}]

    # 04:00 in Seoul starts a new day: the count resets and the held card is served.
    clock["now"] = datetime(2026, 3, 10, 19, 0, tzinfo=UTC)
    q = _queue(client, h)
    assert q["day"]["start"] == "2026-03-11T04:00:00+09:00"
    assert q["counts"]["done_today"] == 0 and q["limit_reached"] is None
    assert len(q["cards"]) == 1

    # New highlights: at 0 a day they wait, and the queue says which limit holds them.
    h2, tenant2, _ = _member(client, "new")
    _, doc2 = _doc(tenant2, "lab", "lantern")
    client.patch("/app/reader/profile", headers=h2, json={"new_highlights_per_day": 0})
    ann = _highlight(client, h2, _key(tenant2, "lab", doc2))
    client.patch(f"/app/reader/annotations/{ann}", headers=h2, json={"review": True})
    q = _queue(client, h2)
    assert q["cards"] == [] and q["limit_reached"] == "new_highlights"
    assert (q["counts"]["due"], q["counts"]["new_highlights"]) == (0, 1)


def test_item_drift_resets_or_retires(rv):
    client, engine, _ = rv
    h, tenant, _ = _member(client, "drift")
    _, doc = _doc(tenant, "lab", "lantern")
    key = _key(tenant, "lab", doc)
    _answer(client, h, key, "q1", got=False)
    _answer(client, h, key, "q2", got=False)

    # v2: q1 becomes a choice (reset), q2 is retired.
    items = _QUIZ[_QUIZ.index("  - id: q1"):_QUIZ.index("```\n", _QUIZ.index("  - id: q1"))]
    v2 = _QUIZ.replace(items, (
        "  - id: q1\n    type: choice\n    prompt: Which one\n"
        "    options: [{id: a, text: A}, {id: b, text: B}]\n    answer: [a]\n    explain: A.\n"
    ))
    _doc(tenant, "lab", "lantern", source=v2, version=2)
    q = _queue(client, h)
    assert len(q["cards"]) == 1
    c = q["cards"][0]
    assert c["reset"] is True and c["item_type"] == "choice" and c["reps"] == 0
    assert c["front"]["multi"] is False and c["back"]["answer"] == ["a"]
    with engine.connect() as conn:
        rows = dict(conn.execute(text(
            "SELECT item_id, status FROM review_cards WHERE tenant_id = :t"), {"t": tenant}).all())
        logs = conn.execute(text(
            "SELECT count(*) FROM review_logs l JOIN review_cards c ON c.id = l.card_id "
            "WHERE c.tenant_id = :t"), {"t": tenant}).scalar_one()
    assert rows == {"q1": "active", "q2": "retired"} and logs == 2  # logs kept


def test_chapter_card_renders_in_a_readable_variant(rv):
    client, _, _ = rv
    h, tenant, _ = _member(client, "chap")
    key = client.post("/app/credentials", headers=h).json()["key"]
    _, en = _doc(tenant, "lab", "one")
    _, ko = _doc(tenant, "lab", "one-ko")
    manifest = {"title": "Guide", "kind": "codebase", "commit": False, "chapters": [
        {"key": "ch1", "position": 1, "variants": {"en": f"lab/{en}.md", "ko": f"lab/{ko}.md"}}]}
    put = client.put("/api/books/lab/guide", json=manifest, headers={"Authorization": f"Bearer {key}"})
    assert put.status_code in (200, 201), put.text
    _answer(client, h, _key(tenant, "lab", ko), "q1", got=False)
    q = _queue(client, h)
    (card,) = q["cards"]
    w = card["where"]
    assert (w["book"], w["book_title"], w["chapter_key"], w["lang"]) == ("guide", "Guide", "ch1", "ko")
    assert (w["chapter_index"], w["chapter_count"]) == (1, 1)
    assert q["counts"]["by_book"][0]["book_title"] == "Guide"

"""FTS5 query layer: quoted-token MATCH builder + weighted, recency-aware BM25 search.

Each whitespace token is individually double-quoted before MATCH, so raw FTS5
operator syntax (``NEAR/AND(``, ``*``, unbalanced parens, ...) collapses to
harmless quoted phrases and can never 500 the endpoint. ``raw=True`` opts into
verbatim FTS5 syntax deliberately, and maps a syntax error to HTTP 400.

CJK/Hangul tokens are emitted as prefix queries (``"검색"*``) so a stem matches its
inflected forms — Korean particles are suffixes, so a prefix match neutralizes them
(검색 -> 검색을 / 검색이란) without a tokenizer/schema change. Pure-ASCII tokens keep the
exact porter-stemmed behavior. Accepted limitations: mid-word substrings (라클) do not
match, and a pure-ASCII query will not match inside a mixed token (changple5 vs
changple5의).

FUTURE EXTENSION POINT (not this phase): fuse the bm25 + recency signals here with a
sqlite-vec vector signal via RRF — the higher-is-better ``score`` and the ``signals``
block are already shaped for fusion, so a second signal slots in cleanly.
"""
from __future__ import annotations

import datetime
import json
import math
import sqlite3
from typing import Any, Optional


class SearchQueryError(ValueError):
    """A raw=True MATCH expression was rejected by FTS5 (main.py maps to HTTP 400)."""


# bm25 column weights: title 8x, tags 4x, body 1x. The FTS columns are ordered
# (title, tags_text, markdown), so these weights map to those fields respectively.
_RANK = "bm25(documents_fts, 8.0, 4.0, 1.0)"
# snippet over column 2 (markdown), hits wrapped in <mark>, ellipsis, up to 12 tokens.
_SNIPPET = "snippet(documents_fts, 2, '<mark>', '</mark>', '…', 12)"

# Recency signal: a document's freshness contribution decays exponentially with age.
# recency = exp(-age_days * ln2 / HALF_LIFE_DAYS) — 0 days -> 1.0, HALF_LIFE_DAYS -> 0.5.
# The final score adds RECENCY_WEIGHT * recency to the higher-is-better bm25 signal.
# BM25 IDF collapses to 0.0 on tiny corpora, so recency is the effective tiebreak there.
HALF_LIFE_DAYS = 90
RECENCY_WEIGHT = 0.5
_LN2 = math.log(2)


def _has_cjk(text: str) -> bool:
    """True if any char is Hangul / CJK ideograph / Kana (word-splitless scripts)."""
    for ch in text:
        o = ord(ch)
        if (
            0xAC00 <= o <= 0xD7AF  # Hangul syllables
            or 0x1100 <= o <= 0x11FF  # Hangul Jamo
            or 0x3130 <= o <= 0x318F  # Hangul Compatibility Jamo
            or 0x3040 <= o <= 0x30FF  # Hiragana + Katakana
            or 0x4E00 <= o <= 0x9FFF  # CJK Unified Ideographs
        ):
            return True
    return False


def _recency(date_str: Optional[str], today: datetime.date) -> float:
    """Exponential-decay freshness in [0, 1] from a 'YYYY-MM-DD' date (age clamped >= 0)."""
    try:
        doc_date = datetime.date.fromisoformat(str(date_str))
    except (TypeError, ValueError):
        return 0.0
    age_days = max((today - doc_date).days, 0)
    return math.exp(-age_days * _LN2 / HALF_LIFE_DAYS)


def build_match_query(q: str) -> str:
    """Wrap each whitespace token in FTS5 double quotes (internal ``"`` doubled).

    Tokens joined by spaces are ANDed implicitly. Quoting neutralizes every FTS5
    operator, so the produced expression is always a valid MATCH string. A token that
    contains CJK/Hangul/Kana characters is emitted as a prefix query (``"tok"*``) so it
    matches inflected forms; pure-ASCII tokens keep exact porter-stemmed matching.
    """
    parts: list[str] = []
    for tok in q.split():
        quoted = '"' + tok.replace('"', '""') + '"'
        if _has_cjk(tok):
            quoted += "*"
        parts.append(quoted)
    return " ".join(parts)


def search(
    conn: sqlite3.Connection,
    q: str,
    *,
    project: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
    raw: bool = False,
) -> dict[str, Any]:
    """Weighted, recency-aware BM25 search over documents_fts, best-and-newest first.

    Returns ``{"results": [...], "total": N}`` where ``total`` is the full match count
    for the MATCH + project/tag filters (so callers can paginate) and ``results`` is the
    ``offset``..``offset+limit`` window of the final ranking.

    Blank ``q`` -> ``{"results": [], "total": 0}``. ``raw=True`` passes ``q`` verbatim as
    the MATCH expression (raising SearchQueryError on FTS5 syntax errors); otherwise
    tokens are quoted (and CJK tokens prefix-expanded). Each result carries the document
    fields (minus ``markdown``) plus ``score`` (bm25 + recency, higher-is-better), a
    ``<mark>``-wrapped ``snippet``, and a ``signals`` block ``{bm25, recency}``.

    Ranking fuses two higher-is-better signals — ``bm25`` (= ``-bm25()`` distance) and an
    exponential-decay ``recency`` — as ``score = bm25 + RECENCY_WEIGHT * recency``, ordered
    score DESC with a date DESC (then id DESC) tiebreak. The re-rank happens in Python over
    the full match set so ``offset`` applies to the final composed ordering, not raw bm25
    rank; this is also the RRF fusion seam a future vector signal slots into.
    """
    empty = {"results": [], "total": 0}
    if not q or not q.strip():
        return empty
    match = q if raw else build_match_query(q)
    if not match.strip():
        return empty

    base = """
        FROM documents_fts
        JOIN documents d ON d.id = documents_fts.rowid
        WHERE documents_fts MATCH ?
    """
    filters = ""
    fparams: list[Any] = []
    if project is not None:
        filters += " AND d.project = ?"
        fparams.append(project)
    if tag is not None:
        filters += " AND EXISTS (SELECT 1 FROM json_each(d.tags) WHERE value = ?)"
        fparams.append(tag)

    # total = full match count for MATCH + filters, independent of the paged window.
    count_sql = "SELECT COUNT(*) AS n " + base + filters
    # Fetch every matching row (no SQL LIMIT): recency re-ranking is a Python-side signal
    # fusion, so the correct page can only be sliced after the full set is re-ordered.
    rows_sql = (
        f"SELECT d.id, d.project, d.slug, d.date, d.title, d.tags, d.rel_path, "
        f"d.source_repo, d.created_at, d.updated_at, {_RANK} AS rank, {_SNIPPET} AS snippet "
        + base
        + filters
    )
    params = [match, *fparams]

    try:
        total = int(conn.execute(count_sql, params).fetchone()["n"])
        rows = conn.execute(rows_sql, params).fetchall()
    except sqlite3.OperationalError as exc:
        # Only reachable with raw=True; quoted tokens never yield operator syntax.
        raise SearchQueryError(str(exc)) from exc

    today = datetime.date.today()
    results: list[dict[str, Any]] = []
    for row in rows:
        d = dict(row)
        try:
            tags = json.loads(d.get("tags") or "[]")
        except (TypeError, json.JSONDecodeError):
            tags = []
        # bm25() returns a negative distance (more negative = better); flip to a
        # higher-is-better score so it fuses cleanly with recency (and a future vector).
        bm25 = round(-float(d["rank"]), 4)
        recency = round(_recency(d["date"], today), 4)
        score = round(bm25 + RECENCY_WEIGHT * recency, 4)
        results.append(
            {
                "id": d["id"],
                "project": d["project"],
                "slug": d["slug"],
                "date": d["date"],
                "title": d["title"],
                "tags": tags,
                "rel_path": d["rel_path"],
                "source_repo": d["source_repo"],
                "created_at": d["created_at"],
                "updated_at": d["updated_at"],
                "score": score,
                "snippet": d["snippet"],
                # FUTURE: add vector/RRF signals alongside bm25 + recency here.
                "signals": {"bm25": bm25, "recency": recency},
            }
        )

    # Final ordering: composed score DESC, date DESC, id DESC (deterministic tiebreak).
    results.sort(key=lambda r: (r["score"], r["date"], r["id"]), reverse=True)
    return {"results": results[offset : offset + limit], "total": total}

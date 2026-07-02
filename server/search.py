"""FTS5 query layer: quoted-token MATCH builder + weighted BM25 search.

Each whitespace token is individually double-quoted before MATCH, so raw FTS5
operator syntax (``NEAR/AND(``, ``*``, unbalanced parens, ...) collapses to
harmless quoted phrases and can never 500 the endpoint. ``raw=True`` opts into
verbatim FTS5 syntax deliberately, and maps a syntax error to HTTP 400.

FUTURE EXTENSION POINT (not this phase): fuse this bm25 signal with a sqlite-vec
vector signal via RRF here — the higher-is-better ``score`` and the ``signals``
block are already shaped for fusion, so a second signal slots in cleanly.
"""
from __future__ import annotations

import json
import sqlite3
from typing import Any, Optional


class SearchQueryError(ValueError):
    """A raw=True MATCH expression was rejected by FTS5 (main.py maps to HTTP 400)."""


# bm25 column weights: title 8x, tags 4x, body 1x. The FTS columns are ordered
# (title, tags_text, markdown), so these weights map to those fields respectively.
_RANK = "bm25(documents_fts, 8.0, 4.0, 1.0)"
# snippet over column 2 (markdown), hits wrapped in <mark>, ellipsis, up to 12 tokens.
_SNIPPET = "snippet(documents_fts, 2, '<mark>', '</mark>', '…', 12)"


def build_match_query(q: str) -> str:
    """Wrap each whitespace token in FTS5 double quotes (internal ``"`` doubled).

    Tokens joined by spaces are ANDed implicitly. Quoting neutralizes every FTS5
    operator, so the produced expression is always a valid MATCH string.
    """
    return " ".join('"' + tok.replace('"', '""') + '"' for tok in q.split())


def search(
    conn: sqlite3.Connection,
    q: str,
    *,
    project: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 10,
    raw: bool = False,
) -> list[dict[str, Any]]:
    """Weighted BM25 search over documents_fts, newest-relevant first.

    Blank ``q`` -> []. ``raw=True`` passes ``q`` verbatim as the MATCH expression
    (raising SearchQueryError on FTS5 syntax errors); otherwise tokens are quoted.
    Each result carries the document fields (minus ``markdown``) plus ``score``
    (higher-is-better = ``-bm25``), a ``<mark>``-wrapped ``snippet``, and a
    ``signals`` block seeded with bm25.
    """
    if not q or not q.strip():
        return []
    match = q if raw else build_match_query(q)
    if not match.strip():
        return []

    sql = f"""
        SELECT d.id, d.project, d.slug, d.date, d.title, d.tags, d.rel_path,
               d.source_repo, d.created_at, d.updated_at,
               {_RANK} AS rank, {_SNIPPET} AS snippet
        FROM documents_fts
        JOIN documents d ON d.id = documents_fts.rowid
        WHERE documents_fts MATCH ?
    """
    params: list[Any] = [match]
    if project is not None:
        sql += " AND d.project = ?"
        params.append(project)
    if tag is not None:
        sql += " AND EXISTS (SELECT 1 FROM json_each(d.tags) WHERE value = ?)"
        params.append(tag)
    sql += " ORDER BY rank ASC LIMIT ?"
    params.append(limit)

    try:
        rows = conn.execute(sql, params).fetchall()
    except sqlite3.OperationalError as exc:
        # Only reachable with raw=True; quoted tokens never yield operator syntax.
        raise SearchQueryError(str(exc)) from exc

    results: list[dict[str, Any]] = []
    for row in rows:
        d = dict(row)
        try:
            tags = json.loads(d.get("tags") or "[]")
        except (TypeError, json.JSONDecodeError):
            tags = []
        # bm25() returns a negative distance (more negative = better); flip to a
        # higher-is-better score so a future vector signal can be RRF-fused with it.
        score = round(-float(d["rank"]), 4)
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
                # FUTURE: add vector/RRF signals alongside bm25 here.
                "signals": {"bm25": score},
            }
        )
    return results

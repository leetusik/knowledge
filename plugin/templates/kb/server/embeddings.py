"""Gemini embeddings — the only module that talks to the embedding API.

Reuses changple5's convention: library ``google-genai``, model
``gemini-embedding-2-preview`` (env ``GEMINI_EMBEDDING_MODEL``), credential
``GOOGLE_API_KEY`` preferred / ``GEMINI_API_KEY`` fallback (resolved in
``server.config``). This module is deliberately storage-agnostic: it produces and
packs float vectors; ``server.db`` owns the ``document_embeddings`` cache and
``server.search`` owns the RRF fusion.

Embedding-text composition (documents): ``title + "\\n\\n" + markdown`` (both
stripped), truncated to ``MAX_INPUT_CHARS`` before hashing/embedding. The
content hash covers exactly that composed text plus the model name, so an edit
that changes the embedded text (or a model change) invalidates the cache while an
edit beyond the truncation point — which cannot change the embedding — correctly
does not force a re-embed. ``MAX_INPUT_CHARS`` bounds the request (the Gemini API has
no server-side ``auto_truncate``); the current corpus embeds in full well within it,
and a doc long enough to exceed the model's token limit fails non-fatally.

Vectors are L2-normalized here, so cosine similarity reduces to a dot product and
fuses cleanly with the keyword signal. Failures raise the narrow ``EmbeddingError``
(with a sanitized message — never the raw provider text, which could echo request
details); every caller treats it as non-fatal (reindex reports it, POST ignores it,
search degrades to BM25-only).
"""
from __future__ import annotations

import hashlib
import math
import time
from array import array
from typing import Iterable

from server import config

# Retrieval task types (Gemini): asymmetric document/query embeddings.
_TASK_DOCUMENT = "RETRIEVAL_DOCUMENT"
_TASK_QUERY = "RETRIEVAL_QUERY"

# Compose-and-truncate bound for the embedded text (also what content_hash covers).
# Covers the current explainer corpus in full.
MAX_INPUT_CHARS = 20000

# Rate-limit backoff (documents only): the gemini-embedding preview enforces a low
# per-minute quota, so a batch reindex may 429 mid-run. Bounded exponential backoff
# (capped) lets the minute reset. Callers on the request path (search query, POST)
# pass retries=0 and fail fast -> degrade, never blocking the response.
_BACKOFF_BASE = 2.0
_BACKOFF_CAP = 30.0


class EmbeddingError(RuntimeError):
    """Embeddings could not be produced. Narrow + non-fatal for every caller."""


def document_input(title: str | None, markdown: str | None) -> str:
    """Compose the exact text embedded for a document: ``title\\n\\nbody``, truncated."""
    t = (title or "").strip()
    body = (markdown or "").strip()
    text = f"{t}\n\n{body}" if body else t
    return text[:MAX_INPUT_CHARS]


def content_hash(model: str, title: str | None, markdown: str | None) -> str:
    """sha256 over ``model + NUL + document_input(...)`` — the embedding cache key."""
    payload = f"{model}\x00{document_input(title, markdown)}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _l2_normalize(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(x * x for x in vec))
    if norm == 0.0:
        return list(vec)
    return [x / norm for x in vec]


def pack_vector(vec: Iterable[float]) -> bytes:
    """Pack a float vector as a contiguous float32 BLOB (no numpy)."""
    return array("f", (float(x) for x in vec)).tobytes()


def unpack_vector(blob: bytes) -> list[float]:
    """Inverse of ``pack_vector``: float32 BLOB -> Python float list."""
    a = array("f")
    a.frombytes(blob)
    return list(a)


def cosine(a: list[float], b: list[float]) -> float:
    """Cosine similarity; 0.0 on dim mismatch or a zero vector (safe, never raises)."""
    if len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


def _is_rate_limit(exc: Exception) -> bool:
    """True for a Gemini 429 / RESOURCE_EXHAUSTED (retry-worthy quota error)."""
    if getattr(exc, "code", None) == 429:
        return True
    s = str(exc)
    return "RESOURCE_EXHAUSTED" in s or "429" in s


def embed_texts(texts: Iterable[str], *, kind: str, retries: int = 0) -> list[list[float]]:
    """Embed texts via Gemini, L2-normalized, in input order.

    ``kind`` is ``"document"`` or ``"query"`` (maps to the retrieval task type).
    Embeds one text per request — the Gemini ``embed_content`` returns a single
    embedding regardless of list length, so a list would silently collapse; the
    corpus is tiny (6 docs + the query) so per-text calls are fine. ``retries`` gives
    each request up to N bounded-backoff retries on a 429 rate limit (0 = fail fast,
    for the request path). Raises ``EmbeddingError`` on missing key, unknown kind, an
    empty response, or any provider failure (message sanitized — no raw provider text,
    which could echo request detail). No network happens at import; the client is
    built at call time.
    """
    if kind == "document":
        task = _TASK_DOCUMENT
    elif kind == "query":
        task = _TASK_QUERY
    else:
        raise EmbeddingError(f"unknown embedding kind: {kind!r}")

    items = list(texts)
    if not items:
        return []

    api_key = config.gemini_api_key()
    if not api_key:
        raise EmbeddingError("no Gemini API key configured")
    model = config.embedding_model()

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    cfg = types.EmbedContentConfig(task_type=task)
    out: list[list[float]] = []
    for text in items:
        attempt = 0
        while True:
            try:
                resp = client.models.embed_content(model=model, contents=text, config=cfg)
                embs = list(resp.embeddings or [])
                if not embs or not embs[0].values:
                    raise EmbeddingError("gemini returned no embedding")
                out.append(_l2_normalize([float(v) for v in embs[0].values]))
                break
            except EmbeddingError:
                raise
            except Exception as exc:  # provider/transport -> sanitized, non-fatal
                if _is_rate_limit(exc) and attempt < retries:
                    time.sleep(min(_BACKOFF_BASE * (2 ** attempt), _BACKOFF_CAP))
                    attempt += 1
                    continue
                raise EmbeddingError(
                    f"gemini embed_content failed: {type(exc).__name__}"
                ) from exc
    return out

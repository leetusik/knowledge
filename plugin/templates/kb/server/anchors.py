"""Server-side re-anchoring (P30.S9; P29.S3 *Anchors*): pure and deterministic.

A stored annotation anchor is ``{block_id, quote: {exact, prefix, suffix, start?,
end?}}`` (a block note has no quote), captured in the browser against one
version's **section projection** (``server.native.project.sections``: offsets count
code points of a section's passage text, nothing collapsed). This module re-finds
it in another version's sections. It never touches storage, reads no clock and
uses no randomness: the same anchor and the same sections always give the same
:class:`Resolution`.

**The ladder** (P29 *Anchors*), first rung that holds wins:

1. **exact** - the section ``block_id`` still exists and contains ``exact``. Two or
   more hits are told apart by how much of the stored prefix/suffix the text
   around each one repeats, then by nearness to the stored ``start``, then by
   position.
2. **fuzzy** - the section exists and holds an approximate occurrence of the quote.
   Similarity is ``1 - levenshtein(a, b) / max(len(a), len(b))``. A hit needs
   :data:`THRESHOLD` (0.8) on **both** the quote alone and the quote **with its
   context** (``prefix + quote + suffix`` against the same span of the new text
   widened by the prefix's and suffix's lengths). The quote-alone bar stops a
   short quote from being carried by unchanged context onto different words.
3. **moved** - ``exact`` occurs, exactly, in another section of the chapter (the
   same tie-break as rung 1, then document order).
4. **block** - the section exists but the quote is not found: the annotation is
   kept on its section, never painted (the signed "Text changed").
5. **orphan** - the section id is gone and the quote is nowhere: listed in the
   Unanchored group (the original text struck through), never dropped.

A block note (no quote) resolves to its section when the id exists, else
``orphan`` (P29: the id is gone, a retired section).

**Nothing here deletes or rewrites an anchor.** The caller writes back only the
status and ``anchored_version`` (P29: "written back when they change"); the
captured ``block_id``/``quote`` stay exactly as the reader made them, so every
later version is resolved from the original evidence and a bad match can never
compound (P30.S9's decision, recorded as OQ31).

**Language mapping** (:func:`map_id`): ids are shared across a chapter's
translations, so a place maps by id; an id missing in the target falls back to the
nearest preceding id of the source's order that the target has, else ``None``
(the caller then uses the fraction).
"""

from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
from typing import Any, Iterable, Sequence

# P29 *Anchors*: "a fuzzy match in the block (similarity >= 0.8 over the quote with its context)".
THRESHOLD = Fraction(4, 5)

ANCHORED = "anchored"
BLOCK = "block"
ORPHAN = "orphan"


@dataclass(frozen=True, slots=True)
class Resolution:
    """Where an anchor lands in one version.

    ``status`` is what P29 stores (``anchored`` | ``block`` | ``orphan``);
    ``method`` names the rung (``exact`` | ``fuzzy`` | ``moved`` | ``section`` for a
    block note | ``block`` | ``orphan``). ``block_id`` is the section it lands in
    (the original for ``block``, ``None`` for ``orphan``); ``start``/``end`` are
    code-point offsets into that section's text, set only when painted.
    ``similarity`` is the fuzzy rung's context similarity (1.0 for exact/moved).
    """

    status: str
    method: str
    block_id: str | None
    start: int | None = None
    end: int | None = None
    similarity: float | None = None

    @property
    def found(self) -> bool:
        return self.status == ANCHORED

    def public(self, order: dict[str, int] | None = None) -> dict[str, Any]:
        out: dict[str, Any] = {
            "status": self.status,
            "method": self.method,
            "block_id": self.block_id,
            "start": self.start,
            "end": self.end,
        }
        if order is not None:
            out["section_index"] = order.get(self.block_id) if self.block_id else None
        return out


# -- edit distance (Myers / Hyyro bit-parallel; Python ints are any width) ------------


def _myers(pattern: str, text: str, *, search: bool) -> list[int]:
    """Per text position ``j``, an edit distance for ``pattern`` vs text ending at ``j``.

    ``search=True``: the best distance of ``pattern`` against ANY substring of
    ``text`` ending at ``j`` (Sellers: the first row is all zeros).
    ``search=False``: the distance of ``pattern`` against ``text[:j + 1]`` (global).
    """

    m = len(pattern)
    if m == 0:
        return [0 if search else j + 1 for j in range(len(text))]
    peq: dict[str, int] = {}
    for i, ch in enumerate(pattern):
        peq[ch] = peq.get(ch, 0) | (1 << i)
    mask = (1 << m) - 1
    high = 1 << (m - 1)
    pv, mv, score = mask, 0, m
    out: list[int] = []
    for ch in text:
        eq = peq.get(ch, 0)
        xv = eq | mv
        xh = ((((eq & pv) + pv) & mask) ^ pv) | eq
        ph = mv | (~(xh | pv) & mask)
        mh = pv & xh
        if ph & high:
            score += 1
        elif mh & high:
            score -= 1
        ph = (ph << 1) & mask
        if not search:
            ph |= 1
        mh = (mh << 1) & mask
        pv = mh | (~(xv | ph) & mask)
        mv = ph & xv
        out.append(score)
    return out


def levenshtein(a: str, b: str) -> int:
    if not a:
        return len(b)
    if not b:
        return len(a)
    return _myers(a, b, search=False)[-1]


def similarity(a: str, b: str) -> Fraction:
    """``1 - levenshtein / max(len)``, exact as a fraction (1 for two empty strings)."""

    longest = max(len(a), len(b))
    if longest == 0:
        return Fraction(1)
    return 1 - Fraction(levenshtein(a, b), longest)


# -- the ladder -------------------------------------------------------------------------


def _common_suffix(a: str, b: str) -> int:
    n = 0
    for x, y in zip(reversed(a), reversed(b)):
        if x != y:
            break
        n += 1
    return n


def _common_prefix(a: str, b: str) -> int:
    n = 0
    for x, y in zip(a, b):
        if x != y:
            break
        n += 1
    return n


def _context_hit(text: str, s: int, e: int, prefix: str, suffix: str) -> int:
    """How many characters of the stored prefix/suffix the text around ``[s, e)`` repeats."""

    return _common_suffix(text[:s], prefix) + _common_prefix(text[e:], suffix)


def _occurrences(text: str, needle: str) -> list[int]:
    out, at = [], text.find(needle)
    while at != -1:
        out.append(at)
        at = text.find(needle, at + 1)
    return out


def _best_exact(text: str, exact: str, prefix: str, suffix: str, start: int | None):
    """``(context_hit, -distance_to_start, -s)`` ranked best occurrence, or ``None``."""

    best = None
    for s in _occurrences(text, exact):
        key = (
            _context_hit(text, s, s + len(exact), prefix, suffix),
            -abs(s - start) if start is not None else 0,
            -s,
        )
        if best is None or key > best[0]:
            best = (key, s)
    return best


def _fuzzy(text: str, exact: str, prefix: str, suffix: str, start: int | None):
    """The best approximate occurrence passing both 0.8 bars: ``(s, e, similarity)``."""

    m = len(exact)
    if m == 0 or not text:
        return None
    # A substring within similarity 0.8 of the quote is at most m/4 edits away
    # (d <= 0.2 * max(m, n) and n <= m + d), so that bounds the candidates.
    kmax = m // 4
    if kmax == 0:
        return None
    ends = _myers(exact, text, search=True)
    # One candidate per run of consecutive end positions within kmax: its minimum.
    candidates: list[tuple[int, int]] = []  # (end exclusive, distance)
    run: tuple[int, int] | None = None
    for j, d in enumerate(ends):
        if d <= kmax:
            if run is None or d < run[1]:
                run = (j + 1, d)
        elif run is not None:
            candidates.append(run)
            run = None
    if run is not None:
        candidates.append(run)

    context = prefix + exact + suffix
    best = None
    for e, d in candidates:
        lo = max(0, e - m - kmax)
        window = text[lo:e][::-1]
        lengths = _myers(exact[::-1], window, search=False)
        # The start: the shortest-distance span ending at e, the length nearest m.
        length = min(
            range(1, len(lengths) + 1),
            key=lambda n: (lengths[n - 1], abs(n - m), n),
        )
        s = e - length
        quote_sim = similarity(exact, text[s:e])
        if quote_sim < THRESHOLD:
            continue
        around = text[max(0, s - len(prefix)):s] + text[s:e] + text[e:e + len(suffix)]
        ctx_sim = similarity(context, around)
        if ctx_sim < THRESHOLD:
            continue
        key = (ctx_sim, quote_sim, -abs(s - start) if start is not None else 0, -s)
        if best is None or key > best[0]:
            best = (key, s, e, ctx_sim)
    if best is None:
        return None
    return best[1], best[2], best[3]


def resolve(
    block_id: str, quote: dict | None, sections: Sequence[dict]
) -> Resolution:
    """Re-anchor one annotation in a version's ``sections`` (``[{"id", "text"}]``)."""

    texts = {s["id"]: s["text"] for s in sections}
    present = block_id in texts
    if not quote or not quote.get("exact"):
        if present:
            return Resolution(ANCHORED, "section", block_id)
        return Resolution(ORPHAN, ORPHAN, None)

    exact = quote["exact"]
    prefix = quote.get("prefix") or ""
    suffix = quote.get("suffix") or ""
    start = quote.get("start")

    if present:
        text = texts[block_id]
        hit = _best_exact(text, exact, prefix, suffix, start)
        if hit is not None:
            s = hit[1]
            return Resolution(ANCHORED, "exact", block_id, s, s + len(exact), 1.0)
        fuzzy = _fuzzy(text, exact, prefix, suffix, start)
        if fuzzy is not None:
            s, e, sim = fuzzy
            return Resolution(ANCHORED, "fuzzy", block_id, s, e, float(sim))

    best = None
    for index, section in enumerate(sections):
        if section["id"] == block_id:
            continue  # rung 1 already looked here
        hit = _best_exact(section["text"], exact, prefix, suffix, None)
        if hit is not None:
            key = (hit[0][0], -index, hit[0][2])
            if best is None or key > best[0]:
                best = (key, section["id"], hit[1])
    if best is not None:
        _, sid, s = best
        return Resolution(ANCHORED, "moved", sid, s, s + len(exact), 1.0)

    if present:
        return Resolution(BLOCK, BLOCK, block_id)
    return Resolution(ORPHAN, ORPHAN, None)


# -- language and version mapping by id --------------------------------------------------


def map_id(
    block_id: str | None, source_order: Sequence[str], target_ids: Iterable[str]
) -> tuple[str | None, bool]:
    """Map a section id into a target variant: ``(id, exact)``.

    ``exact`` is True when the target carries the same id. Otherwise the nearest
    id preceding ``block_id`` in ``source_order`` that the target carries, or
    ``None`` when there is none (or ``block_id`` is unknown to the source): the
    caller falls back to the fraction (P29 *Language switch*).
    """

    if not block_id:
        return None, False
    targets = set(target_ids)
    if block_id in targets:
        return block_id, True
    try:
        at = list(source_order).index(block_id)
    except ValueError:
        return None, False
    for prev in reversed(list(source_order)[:at]):
        if prev in targets:
            return prev, False
    return None, False

"""Text shaping before the voice: Korean sentence packs and the section heuristic.

mlx-audio 0.6.5 splits Ming-3.0 input into fragments of 24 "semantic units", but it
counts only Chinese characters and Latin words: Hangul counts as zero. A Korean
paragraph therefore stays one fragment, fills the model's 512-position cache and stops
after about 15 s (P41-sr.R5). The runner pre-splits any segment holding Hangul into
sentence packs of at most ``KO_PACK_CHARS`` characters and renders each pack in its
own call. Text without Hangul passes through whole; mlx-audio splits it correctly.
"""
from __future__ import annotations

import re

KO_PACK_CHARS = 100

_HANGUL = re.compile(r"[가-힣ᄀ-ᇿ㄰-㆏]")
# A sentence ends at . ? ! 。 … (one or more), optionally followed by closing quotes or
# brackets, and then whitespace or the end. "3.14" and "U.S." mid-word do not end one.
_SENTENCE = re.compile(r".*?(?:[.?!。…]+[\"'”’」』)\]]*(?=\s|$)|$)", re.S)
_CLAUSE = re.compile(r".*?(?:[,;，、](?=\s)|$)", re.S)
_TERMINAL = re.compile(r"[.?!。…:;,\"'”’」』)\]]$")


def has_hangul(text: str) -> bool:
    return bool(_HANGUL.search(text))


def sentences(text: str) -> list[str]:
    """Split into sentences at . ? ! 。 … followed by whitespace (``다.``, ``요.``, ``?``, ``!``)."""
    text = " ".join(text.split())
    out = [m.group(0).strip() for m in _SENTENCE.finditer(text)]
    return [s for s in out if s]


def _hard_split(text: str, max_chars: int) -> list[str]:
    """A sentence longer than ``max_chars``: break at commas, then at spaces, then anywhere."""
    pieces: list[str] = []
    for clause in (m.group(0).strip() for m in _CLAUSE.finditer(text)):
        if not clause:
            continue
        if len(clause) <= max_chars:
            pieces.append(clause)
            continue
        for word in clause.split(" "):
            while len(word) > max_chars:
                pieces.append(word[:max_chars])
                word = word[max_chars:]
            if word:
                pieces.append(word)
    return _pack(pieces, max_chars)


def _pack(pieces: list[str], max_chars: int) -> list[str]:
    out: list[str] = []
    cur = ""
    for p in pieces:
        if cur and len(cur) + 1 + len(p) > max_chars:
            out.append(cur)
            cur = p
        else:
            cur = f"{cur} {p}" if cur else p
    if cur:
        out.append(cur)
    return out


def packs(text: str, max_chars: int = KO_PACK_CHARS) -> list[str]:
    """Sentences packed up to ``max_chars``; an over-long sentence is broken first."""
    pieces: list[str] = []
    for s in sentences(text):
        pieces.extend([s] if len(s) <= max_chars else _hard_split(s, max_chars))
    return _pack(pieces, max_chars)


def voice_inputs(text: str, max_chars: int = KO_PACK_CHARS) -> list[str]:
    """What one segment becomes before the voice: packs if it holds Hangul, else itself."""
    text = " ".join(text.split())
    if not text:
        return []
    return packs(text, max_chars) if has_hangul(text) else [text]


def looks_like_heading(text: str) -> bool:
    """The claim carries only each segment's text, so a section change is inferred: a
    short line with no closing punctuation reads as a heading (a title or a section
    heading), and the pause before it is the longer one."""
    text = text.strip()
    return 0 < len(text) <= 80 and len(text.split()) <= 12 and not _TERMINAL.search(text)

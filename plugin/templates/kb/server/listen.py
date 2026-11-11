"""Listen (P41-sr.B1): the manifest and the audio store, with no database.

**The manifest.** A unit is one document version in one language, voice and
engine profile. Its spoken script (``server/spoken.py``) is a list of segments;
each segment's hash is ``sha256(text + "\\n" + lang + "\\n" + voice + "\\n" +
profile)``. Consecutive segments are grouped by their ``section`` (S1's field), and
neighbouring sections merge into one **part** while the part's estimated speech
stays within the cap (``config.listen_part_cap_s``, about 10 min), estimated from
characters at the measured rates (``config.listen_chars_per_second``). A section
longer than the cap is split at segment boundaries and its pieces stand alone. A
part's key is ``sha256`` over its ordered segment hashes plus the profile: it names
the part's audio file, so a part whose text did not change keeps its key, and its
audio, across versions and documents.

The grouping is greedy from the start of the document: an edit that keeps every
part within its cap changes only the key of the part holding it; an edit that moves
a part across the cap re-groups the parts after it in that document.

**The store.** ``<content root>/.audio/<part key>.<ext>``, beside ``.assets/``:
gitignored by its own ``.gitignore`` (``*``) and dropped by ``gitops.add`` /
``remove`` (``_NEVER_STAGED_DIRS``). A part is written once: a temp file in the same
directory, then ``os.replace``, behind this module's own lock, so the check for an
existing key and the publish are one step. Same key and same bytes is a success;
any other existing file for the key is a :class:`StoreConflict` (the route's 409).
``WRITE_LOCK`` is not taken: it serializes the document write path (file, index,
database, git), and ``.audio/`` is in none of those. The extension comes from the
upload's media type: ``audio/mp4`` stores ``.m4a`` (or ``.mp4`` when asked),
``audio/aac`` stores ``.aac``.
"""
from __future__ import annotations

import hashlib
import os
import re
import tempfile
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Optional, Union

from server import config

AUDIO_DIR = ".audio"

# A part key: 64 lowercase hex digits. A stored file: the key and one extension.
KEY_RE = re.compile(r"^[0-9a-f]{64}$")
FILE_RE = re.compile(r"^([0-9a-f]{64})\.(m4a|mp4|aac)$")
EXTENSIONS = ("m4a", "mp4", "aac")

# media type -> the extensions it may be stored under (the first is the default)
EXTENSIONS_BY_TYPE: dict[str, tuple[str, ...]] = {
    "audio/mp4": ("m4a", "mp4"),
    "audio/aac": ("aac",),
}
MEDIA_TYPE_BY_EXT = {"m4a": "audio/mp4", "mp4": "audio/mp4", "aac": "audio/aac"}


# --- the manifest -----------------------------------------------------------------


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def segment_hash(text: str, lang: str, voice: str, profile: str) -> str:
    """One spoken segment's cache key."""

    return _sha256(f"{text}\n{lang}\n{voice}\n{profile}")


def part_key(seg_hashes: Iterable[str], profile: str) -> str:
    """A part's key: its ordered segment hashes, then the profile."""

    return _sha256("\n".join(seg_hashes) + "\n" + profile)


@dataclass
class Part:
    """One part of a unit: segments ``first..last`` (inclusive, 0-based)."""

    index: int
    first: int
    last: int
    hashes: list[str]
    segments: list[dict[str, Any]]  # {text, section, block, kind}
    chars: int
    est_seconds: float
    key: str


@dataclass
class Manifest:
    lang: str
    voice: str
    profile: str
    segments: list[dict[str, Any]]
    parts: list[Part] = field(default_factory=list)

    @property
    def chars(self) -> int:
        return sum(p.chars for p in self.parts)

    @property
    def est_seconds(self) -> float:
        return sum(p.est_seconds for p in self.parts)

    @property
    def keys(self) -> list[str]:
        return [p.key for p in self.parts]


def _pieces(indexes: list[int], est: list[float], cap: float) -> list[list[int]]:
    """Split one over-long section at segment boundaries, each piece within the cap
    (a single segment longer than the cap is a piece of its own)."""

    out: list[list[int]] = []
    current: list[int] = []
    total = 0.0
    for i in indexes:
        if current and total + est[i] > cap:
            out.append(current)
            current, total = [], 0.0
        current.append(i)
        total += est[i]
    if current:
        out.append(current)
    return out


def build_manifest(
    segments: list[dict[str, Any]],
    *,
    lang: str,
    voice: Optional[str] = None,
    profile: Optional[str] = None,
    cap_seconds: Optional[float] = None,
    chars_per_second: Optional[float] = None,
) -> Manifest:
    """Group spoken segments into parts (see the module docstring)."""

    voice = voice or config.listen_voice()
    profile = profile or config.listen_profile()
    cap = cap_seconds if cap_seconds is not None else config.listen_part_cap_s()
    cps = chars_per_second or config.listen_chars_per_second(lang)

    texts = [s["text"] for s in segments]
    hashes = [segment_hash(t, lang, voice, profile) for t in texts]
    est = [len(t) / cps for t in texts]

    # Consecutive segments of one section (S1's ``section`` only changes forward).
    groups: list[list[int]] = []
    for i, seg in enumerate(segments):
        if groups and segments[groups[-1][0]].get("section") == seg.get("section"):
            groups[-1].append(i)
        else:
            groups.append([i])

    # Atoms: a section within the cap may merge with its neighbours; the pieces of a
    # split section stand alone.
    atoms: list[tuple[list[int], bool]] = []
    for g in groups:
        if sum(est[i] for i in g) <= cap:
            atoms.append((g, True))
        else:
            atoms.extend((piece, False) for piece in _pieces(g, est, cap))

    runs: list[list[int]] = []
    current: list[int] = []
    current_mergeable = False
    for idxs, mergeable in atoms:
        size = sum(est[i] for i in idxs)
        if (
            current
            and mergeable
            and current_mergeable
            and sum(est[i] for i in current) + size <= cap
        ):
            current.extend(idxs)
            continue
        if current:
            runs.append(current)
        current, current_mergeable = list(idxs), mergeable
    if current:
        runs.append(current)

    parts: list[Part] = []
    for n, idxs in enumerate(runs):
        part_hashes = [hashes[i] for i in idxs]
        parts.append(
            Part(
                index=n,
                first=idxs[0],
                last=idxs[-1],
                hashes=part_hashes,
                segments=[
                    {
                        "text": segments[i]["text"],
                        "section": segments[i].get("section"),
                        "block": segments[i].get("block"),
                        "kind": segments[i].get("kind"),
                    }
                    for i in idxs
                ],
                chars=sum(len(texts[i]) for i in idxs),
                est_seconds=round(sum(est[i] for i in idxs), 3),
                key=part_key(part_hashes, profile),
            )
        )
    return Manifest(lang=lang, voice=voice, profile=profile, segments=segments, parts=parts)


def manifest_for_source(
    source: str,
    *,
    title: Optional[str],
    lang: str,
    voice: Optional[str] = None,
    profile: Optional[str] = None,
    cap_seconds: Optional[float] = None,
) -> Optional[Manifest]:
    """A native source's manifest, or ``None`` when it cannot be read aloud: it does
    not parse, or it has nothing to say beyond its title (F17's "Can't be read
    aloud")."""

    from server.native import NativeFormatError, parse_chapter
    from server.spoken import spoken_script

    try:
        tree = parse_chapter(source).tree
    except NativeFormatError:
        return None
    segments = spoken_script(tree, lang=lang, title=title)
    if not any(s.get("kind") != "title" for s in segments):
        return None
    return build_manifest(
        segments, lang=lang, voice=voice, profile=profile, cap_seconds=cap_seconds
    )


# --- the store --------------------------------------------------------------------


class StoreConflict(Exception):
    """A different file already holds this part key (write-once)."""

    def __init__(self, existing: str):
        super().__init__(f"part already stored as {existing} with other bytes")
        self.existing = existing


_STORE_LOCK = threading.Lock()


def media_ext(content_type: Optional[str], requested: Optional[str] = None) -> Optional[str]:
    """The extension an upload is stored under, or ``None`` when not allowed."""

    base = (content_type or "").split(";", 1)[0].strip().lower()
    allowed = EXTENSIONS_BY_TYPE.get(base)
    if not allowed:
        return None
    if requested is None:
        return allowed[0]
    return requested if requested in allowed else None


def audio_dir(root: Union[str, Path]) -> Path:
    return Path(root) / AUDIO_DIR


def audio_path(root: Union[str, Path], file: str) -> Optional[Path]:
    """The on-disk path of one stored part, or ``None`` for a malformed name."""

    if not FILE_RE.fullmatch(file or ""):
        return None
    return audio_dir(root) / file


def find_part_file(root: Union[str, Path], key: str) -> Optional[str]:
    """The stored file name for a part key (any allowed extension), or ``None``."""

    if not KEY_RE.fullmatch(key or ""):
        return None
    base = audio_dir(root)
    for ext in EXTENSIONS:
        if (base / f"{key}.{ext}").is_file():
            return f"{key}.{ext}"
    return None


def _ensure_ignored(root: Path) -> None:
    """Write ``<root>/.audio/.gitignore`` (``*``) once: the tree never enters git."""

    base = audio_dir(root)
    base.mkdir(parents=True, exist_ok=True)
    marker = base / ".gitignore"
    if not marker.exists():
        marker.write_text("# Listen audio is never committed (P41-sr.B1).\n*\n", encoding="utf-8")


def _file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def store_part(root: Union[str, Path], key: str, ext: str, data: bytes) -> tuple[str, bool]:
    """Store one part's bytes write-once; returns ``(file, created)``.

    Same key, extension and bytes already stored: ``created`` is ``False``. Any
    other file already stored for the key raises :class:`StoreConflict`.
    """

    if not KEY_RE.fullmatch(key or "") or ext not in EXTENSIONS:
        raise ValueError("malformed part key or extension")
    root = Path(root)
    _ensure_ignored(root)
    base = audio_dir(root)
    file = f"{key}.{ext}"
    fd, tmp = tempfile.mkstemp(dir=str(base), prefix=".tmp-")
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
            fh.flush()
            os.fsync(fh.fileno())
        with _STORE_LOCK:
            existing = find_part_file(root, key)
            if existing is None:
                os.replace(tmp, base / file)
                tmp = None
                return file, True
        if existing == file and _file_sha256(base / file) == hashlib.sha256(data).hexdigest():
            return file, False
        raise StoreConflict(existing)
    finally:
        if tmp is not None:
            try:
                os.unlink(tmp)
            except OSError:
                pass

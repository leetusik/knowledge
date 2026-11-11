"""Listen's part packaging (P41-sr.B2): the pinned fragmented MP4, read in pure Python.

**The pin** (B3 encodes to it; ``slices/P41-sr.B2/result.md`` § Packaging has the
exact ffmpeg command and the evidence). A part is **one fragmented MP4 file**:
``ftyp``, one ``moov`` (one audio track, AAC-LC, mono, with ``mvex``/``trex`` and an
empty sample table), then ``moof`` + ``mdat`` pairs of about six seconds each. The
playlist names the file once per fragment with a byte range, and the init section
(``ftyp`` + ``moov``) with ``EXT-X-MAP``, so one stored file serves a whole part.

The encoder's priming is **not** trimmed by an edit list: it plays, as a few dozen
milliseconds of silence at the head of each part. An edit list that skips media
(a non-zero ``media_time``) is refused, so every player plays the same samples and
the playlist's ``EXTINF`` durations are the media's own durations, exactly.

**The index** (:func:`index_part`, :func:`index_file`) is derived from the stored
bytes, never from anything a client declares: the init section's length, then each
fragment's byte range (from the boxes before its ``moof`` through the end of its
``mdat``) and its duration, the sum of its samples' durations (``trun``, else
``tfhd``, else ``trex``) over the track's ``mdhd`` timescale. Durations are kept in
whole microseconds, so the playlist and the timeline add the same integers.

**Validation** is the same walk: anything that is not the pin raises
:class:`PackagingError` with a reason (the upload's 422). Checked: the top-level box
order; one ``soun`` track whose sample entry is ``mp4a`` with an AAC-LC, mono
``AudioSpecificConfig``; ``mvex``/``trex``; per fragment one ``traf`` of that track
with a ``tfdt``, no absolute ``base_data_offset``, ``trun`` data offsets that land
inside the fragment's own ``mdat``, a positive duration of at most
:data:`MAX_FRAGMENT_SECONDS`; and fragments that follow each other on the decode
timeline with no gap or overlap.

Nothing here touches a database or the network; :func:`index_file` is memoized on
the path, size and mtime, since a stored part is written once and never changes.
"""

from __future__ import annotations

import functools
import os
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional, Union

# The playlist's EXT-X-TARGETDURATION. A client re-reads an unchanged live playlist
# every half of it, so "the next chapter landed" reaches a waiting player in a few
# seconds; it may never change for a playlist URL, so it is a constant.
TARGET_DURATION = 6
# A fragment longer than this would round past the target duration (RFC 8216
# §4.3.3.1), so the upload refuses it.
MAX_FRAGMENT_SECONDS = 6.5
MAX_FRAGMENTS = 4000  # a part is at most ~10 min: ~100 fragments of 6 s
MAX_SAMPLES = 1 << 20  # per trun; an AAC fragment of 6 s holds a few hundred
MAX_PART_SECONDS = 4 * 3600.0

# AudioSpecificConfig sampling_frequency_index -> Hz (ISO/IEC 14496-3, Table 1.18).
_AAC_RATES = (96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000,
              11025, 8000, 7350)
_AAC_LC = 2

# Boxes that may lead a fragment (before its moof) and belong to its byte range.
_FRAGMENT_LEAD = {b"styp", b"sidx", b"prft", b"emsg", b"free", b"skip"}
# Boxes allowed after the last fragment (ffmpeg's random-access index, padding).
_TRAILING = {b"mfra", b"free", b"skip"}


class PackagingError(ValueError):
    """The bytes are not the pinned packaging; ``str()`` is the reason."""


@dataclass(frozen=True, slots=True)
class Fragment:
    offset: int  # the fragment's first byte in the file
    size: int  # bytes, through the end of its mdat
    duration_us: int  # its samples' total duration, in whole microseconds
    samples: int


@dataclass(frozen=True, slots=True)
class PartIndex:
    size: int  # the file's length in bytes
    init: int  # bytes of the init section (ftyp + moov), at offset 0
    timescale: int
    sample_rate: int
    channels: int
    fragments: tuple[Fragment, ...]

    @property
    def duration_us(self) -> int:
        return sum(f.duration_us for f in self.fragments)

    @property
    def seconds(self) -> float:
        return self.duration_us / 1_000_000


# -- reading -----------------------------------------------------------------------

Reader = Callable[[int, int], bytes]


@dataclass(slots=True)
class _Box:
    type: bytes
    offset: int  # the box's first byte
    header: int  # 8, or 16 with a 64-bit size
    size: int

    @property
    def end(self) -> int:
        return self.offset + self.size

    @property
    def body(self) -> int:
        return self.offset + self.header


def _boxes(read: Reader, start: int, end: int, where: str):
    """The boxes laid end to end in ``[start, end)``; a box that overruns is an error."""

    pos = start
    while pos < end:
        if end - pos < 8:
            raise PackagingError(f"{where}: {end - pos} trailing bytes are not a box")
        head = read(pos, 16 if end - pos >= 16 else 8)
        size, kind = struct.unpack(">I4s", head[:8])
        header = 8
        if size == 1:
            if len(head) < 16:
                raise PackagingError(f"{where}: a truncated 64-bit box size")
            size = struct.unpack(">Q", head[8:16])[0]
            header = 16
        elif size == 0:
            size = end - pos
        if size < header or pos + size > end:
            raise PackagingError(f"{where}: box {kind!r} overruns its container")
        yield _Box(kind, pos, header, size)
        pos += size


def _children(read: Reader, box: _Box, skip: int = 0) -> dict[bytes, list[_Box]]:
    out: dict[bytes, list[_Box]] = {}
    for child in _boxes(read, box.body + skip, box.end, box.type.decode("latin-1")):
        out.setdefault(child.type, []).append(child)
    return out


def _one(children: dict[bytes, list[_Box]], kind: bytes, where: str) -> _Box:
    found = children.get(kind) or []
    if len(found) != 1:
        raise PackagingError(f"{where}: expected one {kind.decode()} box, found {len(found)}")
    return found[0]


def _payload(read: Reader, box: _Box, limit: int = 1 << 20) -> bytes:
    length = box.size - box.header
    if length > limit:
        raise PackagingError(f"{box.type.decode('latin-1')}: an implausibly large box")
    data = read(box.body, length)
    if len(data) != length:
        raise PackagingError(f"{box.type.decode('latin-1')}: truncated")
    return data


def _u32(data: bytes, at: int) -> int:
    if at + 4 > len(data):
        raise PackagingError("a box ends inside a field")
    return struct.unpack_from(">I", data, at)[0]


def _u64(data: bytes, at: int) -> int:
    if at + 8 > len(data):
        raise PackagingError("a box ends inside a field")
    return struct.unpack_from(">Q", data, at)[0]


# -- the init section ----------------------------------------------------------------


@dataclass(slots=True)
class _Track:
    track_id: int
    timescale: int
    sample_rate: int
    channels: int
    default_duration: int
    default_size: int


def _descriptor(data: bytes, at: int) -> tuple[int, int, int]:
    """``(tag, payload start, payload length)`` of an MPEG-4 descriptor at ``at``."""

    if at >= len(data):
        raise PackagingError("esds: a truncated descriptor")
    tag = data[at]
    length = 0
    pos = at + 1
    for _ in range(4):
        if pos >= len(data):
            raise PackagingError("esds: a truncated descriptor length")
        byte = data[pos]
        pos += 1
        length = (length << 7) | (byte & 0x7F)
        if not byte & 0x80:
            break
    if pos + length > len(data):
        raise PackagingError("esds: a descriptor overruns its box")
    return tag, pos, length


def _audio_config(esds: bytes) -> tuple[int, int, int]:
    """``(audio object type, sample rate, channel configuration)`` from an esds body."""

    tag, pos, length = _descriptor(esds, 4)  # after version + flags
    if tag != 0x03:
        raise PackagingError("esds: no ES descriptor")
    end = pos + length
    flags = esds[pos + 2] if pos + 2 < end else 0
    pos += 3
    if flags & 0x80:
        pos += 2  # dependsOn_ES_ID
    if flags & 0x40:
        pos += 1 + (esds[pos] if pos < end else 0)  # URL
    if flags & 0x20:
        pos += 2  # OCR_ES_Id
    tag, pos, length = _descriptor(esds, pos)
    if tag != 0x04 or length < 13:
        raise PackagingError("esds: no decoder config")
    if esds[pos] != 0x40:
        raise PackagingError("the audio is not MPEG-4 audio (AAC)")
    tag, pos, length = _descriptor(esds, pos + 13)
    if tag != 0x05 or length < 2:
        raise PackagingError("esds: no AudioSpecificConfig")
    bits = int.from_bytes(esds[pos:pos + min(length, 8)], "big")
    total = 8 * min(length, 8)
    taken = 0

    def take(n: int) -> int:
        nonlocal taken
        if taken + n > total:
            raise PackagingError("esds: a truncated AudioSpecificConfig")
        taken += n
        return (bits >> (total - taken)) & ((1 << n) - 1)

    aot = take(5)
    if aot == 31:
        aot = 32 + take(6)
    index = take(4)
    rate = take(24) if index == 15 else (_AAC_RATES[index] if index < len(_AAC_RATES) else 0)
    channels = take(4)
    return aot, rate, channels


def _moov(read: Reader, moov: _Box) -> _Track:
    kids = _children(read, moov)
    traks = kids.get(b"trak") or []
    if len(traks) != 1:
        raise PackagingError(f"a part has exactly one track; this file has {len(traks)}")
    mvex = (kids.get(b"mvex") or [None])[0]
    if mvex is None:
        raise PackagingError("not a fragmented MP4 (no mvex): encode with -movflags +empty_moov+default_base_moof")
    trak = _children(read, traks[0])
    tkhd = _payload(read, _one(trak, b"tkhd", "trak"))
    track_id = _u32(tkhd, 20 if tkhd[0] == 1 else 12)
    for edts in trak.get(b"edts") or []:
        for elst in _children(read, edts).get(b"elst") or []:
            body = _payload(read, elst)
            version, count = body[0], _u32(body, 4)
            step = 20 if version == 1 else 12
            for n in range(count):
                at = 8 + n * step
                media_time = (
                    struct.unpack_from(">q", body, at + 8)[0] if version == 1
                    else struct.unpack_from(">i", body, at + 4)[0]
                ) if at + step <= len(body) else -2
                if media_time != 0:
                    raise PackagingError(
                        "an edit list that skips media is not the pinned packaging "
                        "(the priming plays; encode without one)"
                    )
    mdia = _children(read, _one(trak, b"mdia", "trak"))
    mdhd = _payload(read, _one(mdia, b"mdhd", "mdia"))
    timescale = _u32(mdhd, 20 if mdhd[0] == 1 else 12)
    if timescale <= 0:
        raise PackagingError("mdhd: a zero timescale")
    hdlr = _payload(read, _one(mdia, b"hdlr", "mdia"))
    if hdlr[8:12] != b"soun":
        raise PackagingError("the track is not audio")
    minf = _children(read, _one(mdia, b"minf", "mdia"))
    stbl = _children(read, _one(minf, b"stbl", "minf"))
    stsd = _one(stbl, b"stsd", "stbl")
    entries = list(_boxes(read, stsd.body + 8, stsd.end, "stsd"))
    if len(entries) != 1 or entries[0].type != b"mp4a":
        raise PackagingError("the sample entry is not mp4a (AAC in MP4)")
    entry = entries[0]
    esds = _children(read, entry, skip=28).get(b"esds") or []
    if len(esds) != 1:
        raise PackagingError("mp4a: no esds")
    aot, rate, channels = _audio_config(_payload(read, esds[0]))
    if aot != _AAC_LC:
        raise PackagingError(f"the audio is not AAC-LC (audio object type {aot})")
    if channels != 1:
        raise PackagingError(f"the audio is not mono ({channels} channels)")
    if rate <= 0:
        raise PackagingError("the AAC sample rate is unknown")
    trex_boxes = [t for t in _children(read, mvex).get(b"trex") or []]
    default_duration = default_size = 0
    for trex in trex_boxes:
        body = _payload(read, trex)
        if _u32(body, 4) == track_id:
            default_duration, default_size = _u32(body, 12), _u32(body, 16)
            break
    else:
        raise PackagingError("mvex: no trex for the audio track")
    return _Track(track_id, timescale, rate, channels, default_duration, default_size)


# -- the fragments -------------------------------------------------------------------


def _moof(read: Reader, moof: _Box, track: _Track) -> tuple[int, int, int, int, int]:
    """``(decode time, duration in ticks, samples, data start, data length)``."""

    kids = _children(read, moof)
    trafs = kids.get(b"traf") or []
    if len(trafs) != 1:
        raise PackagingError(f"a fragment has exactly one traf; found {len(trafs)}")
    traf = _children(read, trafs[0])
    tfhd = _payload(read, _one(traf, b"tfhd", "traf"))
    flags = int.from_bytes(tfhd[1:4], "big")
    if _u32(tfhd, 4) != track.track_id:
        raise PackagingError("a fragment names another track")
    if flags & 0x01:
        raise PackagingError("tfhd: an absolute base_data_offset (encode with +default_base_moof)")
    if flags & 0x010000:
        raise PackagingError("tfhd: an empty fragment")
    at = 8
    if flags & 0x02:
        at += 4
    default_duration, default_size = track.default_duration, track.default_size
    if flags & 0x08:
        default_duration = _u32(tfhd, at)
        at += 4
    if flags & 0x10:
        default_size = _u32(tfhd, at)
        at += 4
    tfdt_box = (traf.get(b"tfdt") or [None])[0]
    if tfdt_box is None:
        raise PackagingError("a fragment has no tfdt")
    tfdt = _payload(read, tfdt_box)
    decode_time = _u64(tfdt, 4) if tfdt[0] == 1 else _u32(tfdt, 4)
    truns = traf.get(b"trun") or []
    if not truns:
        raise PackagingError("a fragment has no trun")
    ticks = samples = 0
    data_start: Optional[int] = None
    data_end = 0
    for trun_box in truns:
        trun = _payload(read, trun_box, limit=4 << 20)
        tflags = int.from_bytes(trun[1:4], "big")
        count = _u32(trun, 4)
        pos = 8
        if not tflags & 0x01:
            raise PackagingError("trun: no data offset")
        offset = struct.unpack_from(">i", trun, pos)[0]
        pos += 4
        if tflags & 0x04:
            pos += 4
        fields = [bit for bit in (0x100, 0x200, 0x400, 0x800) if tflags & bit]
        width = len(fields)
        if count > MAX_SAMPLES or pos + count * 4 * width > len(trun):
            raise PackagingError("trun: fewer samples than it declares")
        values = struct.unpack_from(f">{count * width}I", trun, pos) if width else ()
        if 0x100 in fields:
            run_ticks = sum(values[fields.index(0x100)::width])
        else:
            run_ticks = count * default_duration
        if 0x200 in fields:
            run_bytes = sum(values[fields.index(0x200)::width])
        else:
            run_bytes = count * default_size
        start = moof.offset + offset
        if data_start is not None and start != data_end:
            raise PackagingError("trun: runs that are not back to back")
        data_start = start if data_start is None else data_start
        data_end = start + run_bytes
        ticks += run_ticks
        samples += count
    if samples == 0 or ticks <= 0:
        raise PackagingError("a fragment with no duration")
    return decode_time, ticks, samples, data_start or 0, data_end - (data_start or 0)


def _index(read: Reader, size: int) -> PartIndex:
    if size < 16 or read(4, 4) != b"ftyp":
        raise PackagingError("not an MP4: the file does not start with ftyp")
    boxes = _boxes(read, 0, size, "file")
    first = next(boxes, None)
    if first is None or first.type != b"ftyp":
        raise PackagingError("not an MP4: the file does not start with ftyp")
    moov = next(boxes, None)
    if moov is None or moov.type != b"moov":
        raise PackagingError("the moov box must follow ftyp (encode with +empty_moov)")
    track = _moov(read, moov)

    fragments: list[Fragment] = []
    lead: Optional[int] = None  # where the pending fragment's byte range starts
    pending: Optional[tuple[_Box, tuple[int, int, int, int, int]]] = None
    next_time: Optional[int] = None
    trailing = False
    for box in boxes:
        if trailing and box.type not in _TRAILING:
            raise PackagingError(f"box {box.type!r} after the trailing index")
        if box.type == b"moof":
            if pending is not None:
                raise PackagingError("a moof without its mdat")
            pending = (box, _moof(read, box, track))
            lead = box.offset if lead is None else lead
        elif box.type == b"mdat":
            if pending is None:
                raise PackagingError("an mdat outside a fragment")
            moof, (decode_time, ticks, samples, data_start, data_len) = pending
            if data_start < box.body or data_start + data_len > box.end:
                raise PackagingError("a fragment's samples are not inside its own mdat")
            if next_time is not None and decode_time != next_time:
                raise PackagingError("the fragments do not follow each other on the timeline")
            seconds = ticks / track.timescale
            if seconds > MAX_FRAGMENT_SECONDS:
                raise PackagingError(
                    f"a fragment of {seconds:.3f} s is longer than {MAX_FRAGMENT_SECONDS} s "
                    "(encode with -frag_duration 6000000)"
                )
            next_time = decode_time + ticks
            start = lead if lead is not None else moof.offset
            fragments.append(Fragment(
                offset=start, size=box.end - start,
                duration_us=round(ticks * 1_000_000 / track.timescale), samples=samples,
            ))
            if len(fragments) > MAX_FRAGMENTS:
                raise PackagingError(f"more than {MAX_FRAGMENTS} fragments")
            pending, lead = None, None
        elif box.type in _FRAGMENT_LEAD and pending is None:
            lead = box.offset if lead is None else lead
        elif box.type in _TRAILING and pending is None and fragments:
            trailing = True
        else:
            raise PackagingError(f"an unexpected {box.type!r} box")
    if pending is not None:
        raise PackagingError("the last moof has no mdat")
    if not fragments:
        raise PackagingError("no fragments: encode with -movflags +empty_moov+default_base_moof")
    index = PartIndex(
        size=size, init=moov.end, timescale=track.timescale, sample_rate=track.sample_rate,
        channels=track.channels, fragments=tuple(fragments),
    )
    if index.seconds > MAX_PART_SECONDS:
        raise PackagingError("a part longer than four hours")
    return index


def _checked(read: Reader, size: int) -> PartIndex:
    """:func:`_index`, with any malformed field reported as a :class:`PackagingError`."""

    try:
        return _index(read, size)
    except PackagingError:
        raise
    except (IndexError, struct.error, ValueError, OverflowError) as exc:
        raise PackagingError(f"a malformed MP4 ({type(exc).__name__})") from None


def index_part(data: Union[bytes, bytearray, memoryview]) -> PartIndex:
    """The index of one part's bytes; :class:`PackagingError` when not the pin."""

    view = memoryview(data)

    def read(offset: int, length: int) -> bytes:
        return bytes(view[offset:offset + length])

    return _checked(read, len(view))


@functools.lru_cache(maxsize=4096)
def _index_cached(path: str, size: int, mtime_ns: int) -> PartIndex:
    with open(path, "rb") as fh:

        def read(offset: int, length: int) -> bytes:
            fh.seek(offset)
            return fh.read(length)

        index = _checked(read, size)
    return index


def index_file(path: Union[str, Path]) -> PartIndex:
    """The index of a stored part (memoized: a stored part never changes)."""

    stat = os.stat(path)
    return _index_cached(str(path), stat.st_size, stat.st_mtime_ns)

"""Chapter image assets (P30.S4; P29.S1 *Images* + `02-figures` *Contract changes*).

A publish may carry ``assets: [{name, media_type, content_base64}]``. This module
owns everything about them that is not HTTP:

* **Validation** (``prepare_assets``) — the name rule (``refs.ASSET_NAME_RE``, S3),
  the four raster formats with their magic bytes, the limits (2 MB per image, 20 per
  publish, 12 MB in total), a decode with Pillow, and the pixel size. Every failure
  is collected, never short-circuited, into ONE ``AssetError`` whose ``to_detail()``
  is a list in the same shape as the native parser's (``line``/``col``/``code``/
  ``message``, plus the ``asset`` it concerns), so S5 can put both in one 422.
* **Metadata stripping** — done at the CONTAINER level, never by re-encoding, so the
  pixels are byte-for-byte the uploaded ones (re-encoding a JPEG or a lossy WebP
  would silently degrade it). JPEG drops every APPn/COM segment but JFIF, ICC and
  Adobe; PNG keeps only rendering chunks; WebP drops EXIF/XMP and unknown chunks;
  GIF drops comments and every application extension but the loop ones. When the
  image carried an EXIF orientation other than 1, an orientation-ONLY EXIF block is
  written back, so a phone photo still displays upright while its GPS, camera and
  time tags are gone. The stripped bytes are decoded again and compared with the
  original's pixels; a mismatch rejects the asset rather than storing something
  else.
* **Animated images** — a GIF with more than one frame records ``animated: true``
  and gets a still frame (its first frame, as PNG) stored by hash beside it. An
  animated PNG or WebP is rejected: P29's contract only draws the GIF still.
* **Storage** — ``<root>/.assets/<project>/<date>-<slug>/<sha256>.<ext>`` (P29's
  exact layout), content-addressed and immutable, one directory per document, so
  bytes are shared across that document's versions and the delete path removes the
  directory whole. ``<root>/.assets/.gitignore`` (``*``) keeps the tree out of git
  whatever the repo's own ignore file says (A2); ``gitops.add`` refuses the
  path too.
* **The asset map** — ``{name: {file, media_type, width, height, animated[,
  still]}}`` — is recorded in the version's header (``assets:``), mirrored into the
  disposable SQLite rows, and re-derived by reindex.
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import io
import json
import os
import re
import shutil
import struct
import tempfile
import warnings
import zlib
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Optional, Union

from PIL import Image

from server.native.refs import ASSET_NAME_RE

ASSETS_DIR = ".assets"

MAX_IMAGE_BYTES = 2 * 1024 * 1024
MAX_IMAGES = 20
MAX_TOTAL_BYTES = 12 * 1024 * 1024
# Decompression-bomb guard: a 2 MB file can still declare a vast canvas. 40 MP
# covers an 8K screenshot (33 MP) with room to spare.
MAX_PIXELS = 40_000_000

# media type -> (file extension, Pillow format name)
FORMATS: dict[str, tuple[str, str]] = {
    "image/png": ("png", "PNG"),
    "image/jpeg": ("jpg", "JPEG"),
    "image/webp": ("webp", "WEBP"),
    "image/gif": ("gif", "GIF"),
}
MEDIA_TYPE_BY_EXT = {ext: mt for mt, (ext, _fmt) in FORMATS.items()}

# A stored file's name: 64 lowercase hex digits and one of the four extensions.
FILE_RE = re.compile(r"^([0-9a-f]{64})\.(png|jpg|webp|gif)$")

_ORIENTATION_TAG = 0x0112


# --- errors ------------------------------------------------------------------


class AssetError(ValueError):
    """One or more assets were rejected. ``to_detail()`` is the 422 list."""

    def __init__(self, violations: list[dict]):
        if not violations:
            raise ValueError("AssetError needs at least one violation")
        self.violations = violations
        first = violations[0]
        more = len(violations) - 1
        suffix = f" (and {more} more)" if more else ""
        super().__init__(f"{first['code']}: {first['message']}{suffix}")

    def to_detail(self) -> list[dict]:
        return [dict(v) for v in self.violations]


def _violation(code: str, message: str, asset: Optional[str]) -> dict:
    # line/col are 0: an asset is not a line of the chapter source. The keys match
    # server/native/errors.Violation.to_dict so the two lists can be merged.
    out: dict[str, Any] = {"line": 0, "col": 0, "code": code, "message": message}
    if asset is not None:
        out["asset"] = asset
    return out


# --- magic bytes ---------------------------------------------------------------


def sniff_media_type(data: bytes) -> Optional[str]:
    """The media type the leading bytes declare, or ``None`` for anything else."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    return None


# --- container-level metadata stripping --------------------------------------


class _StripError(Exception):
    """The container is malformed in a way the stripper will not guess past."""


def _orientation_tiff(orientation: int) -> bytes:
    """A minimal big-endian TIFF/EXIF payload carrying only the orientation tag."""
    exif = Image.Exif()
    exif[_ORIENTATION_TAG] = orientation
    raw = exif.tobytes()
    return raw[6:] if raw.startswith(b"Exif\x00\x00") else raw


# JPEG markers kept verbatim. APP0 (JFIF) and APP14 (Adobe: the colour transform a
# decoder needs) carry no personal data; APP2 is kept only for an ICC profile.
def _strip_jpeg(data: bytes, orientation: Optional[int]) -> bytes:
    if not data.startswith(b"\xff\xd8"):
        raise _StripError("no SOI")
    out = bytearray(b"\xff\xd8")
    exif_segment = b""
    if orientation:
        payload = b"Exif\x00\x00" + _orientation_tiff(orientation)
        exif_segment = b"\xff\xe1" + struct.pack(">H", len(payload) + 2) + payload
    # The orientation block goes right after a leading JFIF APP0 (JFIF wants APP0
    # first), else right after SOI.
    pending = bool(exif_segment)
    i = 2
    n = len(data)
    while i < n:
        if data[i] != 0xFF:
            raise _StripError("expected a marker")
        # Fill bytes (0xFF runs) are legal before a marker.
        while i < n and data[i] == 0xFF:
            i += 1
        if i >= n:
            raise _StripError("truncated marker")
        marker = data[i]
        i += 1
        if marker == 0xD9:  # EOI
            out += b"\xff\xd9"
            return bytes(out)
        if marker == 0x01 or 0xD0 <= marker <= 0xD7:  # TEM / RSTn: no length
            out += bytes((0xFF, marker))
            continue
        if i + 2 > n:
            raise _StripError("truncated segment length")
        (seg_len,) = struct.unpack(">H", data[i:i + 2])
        if seg_len < 2 or i + seg_len > n:
            raise _StripError("bad segment length")
        segment = data[i - 2:i + seg_len]
        body = data[i + 2:i + seg_len]
        i += seg_len
        if marker == 0xDA:  # SOS: copy the header and the entropy-coded data verbatim
            if pending:
                out += exif_segment
                pending = False
            out += segment
            j = i
            while j < n:
                if data[j] == 0xFF and j + 1 < n:
                    nxt = data[j + 1]
                    if nxt == 0x00 or 0xD0 <= nxt <= 0xD7 or nxt == 0xFF:
                        j += 2 if nxt != 0xFF else 1
                        continue
                    break
                j += 1
            out += data[i:j]
            i = j
            continue
        keep = True
        if 0xE0 <= marker <= 0xEF:  # APPn
            if marker == 0xE0:
                keep = body.startswith(b"JFIF\x00") or body.startswith(b"JFXX\x00")
            elif marker == 0xE2:
                keep = body.startswith(b"ICC_PROFILE\x00")
            elif marker == 0xEE:
                keep = body.startswith(b"Adobe")
            else:
                keep = False
        elif marker == 0xFE:  # COM
            keep = False
        if keep:
            if pending and marker != 0xE0:
                out += exif_segment
                pending = False
            out += segment
            if pending and marker == 0xE0:
                out += exif_segment
                pending = False
    raise _StripError("no EOI")


# PNG chunks kept: the critical ones, colour/rendering ancillaries, and the APNG
# trio (an animated PNG is rejected before storing; a one-frame APNG keeps its
# chunks so its pixels are untouched). Text, time, eXIf and every private chunk go.
_PNG_KEEP = {
    b"IHDR", b"PLTE", b"IDAT", b"IEND", b"tRNS", b"gAMA", b"cHRM", b"sRGB", b"iCCP",
    b"sBIT", b"pHYs", b"bKGD", b"cICP", b"mDCV", b"cLLI", b"acTL", b"fcTL", b"fdAT",
}


def _png_chunk(kind: bytes, payload: bytes) -> bytes:
    crc = zlib.crc32(kind + payload) & 0xFFFFFFFF
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", crc)


def _strip_png(data: bytes, orientation: Optional[int]) -> bytes:
    sig = b"\x89PNG\r\n\x1a\n"
    if not data.startswith(sig):
        raise _StripError("no PNG signature")
    out = bytearray(sig)
    i = len(sig)
    n = len(data)
    while i < n:
        if i + 8 > n:
            raise _StripError("truncated chunk header")
        (length,) = struct.unpack(">I", data[i:i + 4])
        kind = data[i + 4:i + 8]
        end = i + 12 + length
        if end > n:
            raise _StripError("truncated chunk")
        if kind in _PNG_KEEP:
            out += data[i:end]
            if kind == b"IHDR" and orientation:
                out += _png_chunk(b"eXIf", _orientation_tiff(orientation))
        i = end
        if kind == b"IEND":
            return bytes(out)
    raise _StripError("no IEND")


_WEBP_KEEP = {b"VP8 ", b"VP8L", b"VP8X", b"ALPH", b"ICCP", b"ANIM", b"ANMF"}


def _strip_webp(data: bytes, orientation: Optional[int]) -> bytes:
    if len(data) < 12 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise _StripError("no RIFF/WEBP header")
    (riff_size,) = struct.unpack("<I", data[4:8])
    n = min(len(data), 8 + riff_size)
    chunks: list[tuple[bytes, bytes]] = []
    i = 12
    while i < n:
        if i + 8 > n:
            raise _StripError("truncated chunk header")
        kind = data[i:i + 4]
        (size,) = struct.unpack("<I", data[i + 4:i + 8])
        end = i + 8 + size
        if end > n:
            raise _StripError("truncated chunk")
        if kind in _WEBP_KEEP:
            chunks.append((kind, data[i + 8:end]))
        i = end + (size & 1)  # chunks are padded to an even size
    has_vp8x = any(kind == b"VP8X" for kind, _ in chunks)
    if orientation and has_vp8x:
        chunks.append((b"EXIF", _orientation_tiff(orientation)))
    body = bytearray(b"WEBP")
    for kind, payload in chunks:
        if kind == b"VP8X":
            flags = payload[0] & ~0x0C  # clear the EXIF (0x08) and XMP (0x04) bits
            if orientation and has_vp8x:
                flags |= 0x08
            payload = bytes((flags,)) + payload[1:]
        body += kind + struct.pack("<I", len(payload)) + payload
        if len(payload) & 1:
            body += b"\x00"
    return b"RIFF" + struct.pack("<I", len(body)) + bytes(body)


_GIF_KEEP_APPS = {b"NETSCAPE2.0", b"ANIMEXTS1.0"}


def _gif_sub_blocks_end(data: bytes, i: int) -> int:
    n = len(data)
    while True:
        if i >= n:
            raise _StripError("truncated sub-blocks")
        size = data[i]
        i += 1
        if size == 0:
            return i
        i += size


def _strip_gif(data: bytes) -> bytes:
    if data[:6] not in (b"GIF87a", b"GIF89a") or len(data) < 13:
        raise _StripError("no GIF header")
    packed = data[10]
    i = 13
    if packed & 0x80:
        i += 3 * (2 ** ((packed & 0x07) + 1))
    out = bytearray(data[:i])
    n = len(data)
    while i < n:
        block = data[i]
        if block == 0x3B:  # trailer
            out += b"\x3b"
            return bytes(out)
        if block == 0x2C:  # image descriptor (+ local colour table) + image data
            if i + 10 > n:
                raise _StripError("truncated image descriptor")
            lpacked = data[i + 9]
            j = i + 10
            if lpacked & 0x80:
                j += 3 * (2 ** ((lpacked & 0x07) + 1))
            j += 1  # LZW minimum code size
            end = _gif_sub_blocks_end(data, j)
            out += data[i:end]
            i = end
            continue
        if block == 0x21:  # extension
            if i + 2 > n:
                raise _StripError("truncated extension")
            label = data[i + 1]
            end = _gif_sub_blocks_end(data, i + 2)
            keep = label in (0xF9, 0x01)  # graphic control, plain text (renders)
            if label == 0xFF:  # application: keep only the loop extensions
                size = data[i + 2] if i + 2 < n else 0
                ident = data[i + 3:i + 3 + size]
                keep = ident in _GIF_KEEP_APPS
            if keep:
                out += data[i:end]
            i = end
            continue
        raise _StripError(f"unknown GIF block 0x{block:02x}")
    raise _StripError("no trailer")


def strip_metadata(data: bytes, media_type: str, orientation: Optional[int]) -> bytes:
    """Return ``data`` without its metadata; raises ``_StripError`` on a bad container."""
    if media_type == "image/jpeg":
        return _strip_jpeg(data, orientation)
    if media_type == "image/png":
        return _strip_png(data, orientation)
    if media_type == "image/webp":
        return _strip_webp(data, orientation)
    if media_type == "image/gif":
        return _strip_gif(data)
    raise _StripError(f"unsupported media type {media_type}")


# --- decode helpers ------------------------------------------------------------


@dataclass
class _Decoded:
    fmt: str
    width: int
    height: int
    frames: int
    animated: bool
    orientation: Optional[int]
    mode: str
    first_frame: bytes


def _decode(data: bytes) -> _Decoded:
    """Open, verify and load frame 0. Raises on anything Pillow will not decode."""
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(io.BytesIO(data)) as probe:
            probe.verify()
        with Image.open(io.BytesIO(data)) as im:
            width, height = im.size
            if width < 1 or height < 1 or width * height > MAX_PIXELS:
                raise _TooLarge(width, height)
            frames = int(getattr(im, "n_frames", 1) or 1)
            animated = bool(getattr(im, "is_animated", False)) or frames > 1
            orientation = None
            try:
                value = im.getexif().get(_ORIENTATION_TAG)
                if isinstance(value, int) and 2 <= value <= 8:
                    orientation = value
            except Exception:  # pragma: no cover - a broken EXIF block is dropped anyway
                orientation = None
            im.seek(0)
            im.load()
            return _Decoded(
                fmt=im.format or "",
                width=width,
                height=height,
                frames=frames,
                animated=animated,
                orientation=orientation,
                mode=im.mode,
                first_frame=im.tobytes(),
            )


class _TooLarge(Exception):
    def __init__(self, width: int, height: int):
        super().__init__(f"{width}x{height}")
        self.width = width
        self.height = height


def _still_png(data: bytes) -> bytes:
    """The first frame of an animated image as a metadata-free PNG."""
    with Image.open(io.BytesIO(data)) as im:
        im.seek(0)
        frame = im.convert("RGBA")
        buf = io.BytesIO()
        frame.save(buf, format="PNG", optimize=False)
        return buf.getvalue()


# --- preparation (validation + strip, no I/O) --------------------------------


@dataclass
class PreparedAsset:
    name: str
    media_type: str
    file: str  # <sha256>.<ext>
    data: bytes
    width: int
    height: int
    animated: bool
    still_file: Optional[str] = None
    still_data: Optional[bytes] = None

    def map_entry(self) -> dict:
        entry: dict[str, Any] = {
            "file": self.file,
            "media_type": self.media_type,
            "width": self.width,
            "height": self.height,
            "animated": self.animated,
        }
        if self.still_file:
            entry["still"] = self.still_file
        return entry


def _file_name(data: bytes, ext: str) -> str:
    return f"{hashlib.sha256(data).hexdigest()}.{ext}"


def prepare_assets(items: Optional[list]) -> list[PreparedAsset]:
    """Validate, strip and hash every asset of one publish, or raise ``AssetError``.

    ``items`` is a list of ``{name, media_type, content_base64}`` mappings (the
    request's shape). Pure: nothing touches disk, so it runs before the write lock.
    """
    if not items:
        return []
    violations: list[dict] = []
    if len(items) > MAX_IMAGES:
        violations.append(_violation(
            "asset-count", f"{len(items)} images; at most {MAX_IMAGES} per publish", None
        ))
    seen: set[str] = set()
    total = 0
    prepared: list[PreparedAsset] = []
    for idx, item in enumerate(items):
        name = item.get("name") if isinstance(item, dict) else None
        label = name if isinstance(name, str) and name else f"#{idx}"
        if not isinstance(name, str) or not ASSET_NAME_RE.fullmatch(name):
            violations.append(_violation(
                "asset-name",
                "an asset name is [A-Za-z0-9][A-Za-z0-9._-]{0,127}",
                label,
            ))
        elif name in seen:
            violations.append(_violation("asset-duplicate", f"duplicate asset name {name!r}", label))
        else:
            seen.add(name)
        media_type = item.get("media_type") if isinstance(item, dict) else None
        if media_type not in FORMATS:
            violations.append(_violation(
                "asset-type",
                f"media_type {media_type!r} is not one of {', '.join(FORMATS)}",
                label,
            ))
            continue
        raw = item.get("content_base64") if isinstance(item, dict) else None
        try:
            if not isinstance(raw, str):
                raise binascii.Error("not a string")
            data = base64.b64decode(raw, validate=True)
        except (binascii.Error, ValueError):
            violations.append(_violation("asset-base64", "content_base64 is not valid base64", label))
            continue
        total += len(data)
        if not data:
            violations.append(_violation("asset-empty", "the image is empty", label))
            continue
        if len(data) > MAX_IMAGE_BYTES:
            violations.append(_violation(
                "asset-size",
                f"{len(data)} bytes; at most {MAX_IMAGE_BYTES} per image",
                label,
            ))
            continue
        sniffed = sniff_media_type(data)
        if sniffed != media_type:
            violations.append(_violation(
                "asset-magic",
                f"the bytes are {sniffed or 'not a supported image'}, not {media_type}",
                label,
            ))
            continue
        ext, pil_fmt = FORMATS[media_type]
        try:
            original = _decode(data)
        except _TooLarge as exc:
            violations.append(_violation(
                "asset-dimensions",
                f"{exc.width}x{exc.height} px; at most {MAX_PIXELS} pixels",
                label,
            ))
            continue
        except Exception:
            violations.append(_violation("asset-decode", f"the {ext} image does not decode", label))
            continue
        if original.fmt != pil_fmt:
            violations.append(_violation(
                "asset-magic", f"the image decodes as {original.fmt}, not {media_type}", label
            ))
            continue
        if original.animated and media_type != "image/gif":
            violations.append(_violation(
                "asset-animated",
                "an animated image must be a GIF (only a GIF gets a still frame)",
                label,
            ))
            continue
        try:
            stripped = strip_metadata(data, media_type, original.orientation)
            after = _decode(stripped)
        except Exception:
            violations.append(_violation(
                "asset-decode", f"the {ext} container could not be stripped losslessly", label
            ))
            continue
        if (
            after.mode != original.mode
            or (after.width, after.height) != (original.width, original.height)
            or after.frames != original.frames
            or after.first_frame != original.first_frame
        ):
            violations.append(_violation(
                "asset-decode", "stripping the metadata would change the pixels", label
            ))
            continue
        # The displayed size: an EXIF rotation of 90 or 270 degrees swaps the axes.
        width, height = original.width, original.height
        if original.orientation in (5, 6, 7, 8):
            width, height = height, width
        asset = PreparedAsset(
            name=name if isinstance(name, str) else label,
            media_type=media_type,
            file=_file_name(stripped, ext),
            data=stripped,
            width=width,
            height=height,
            animated=original.animated,
        )
        if original.animated:
            still = _still_png(stripped)
            asset.still_file = _file_name(still, "png")
            asset.still_data = still
        prepared.append(asset)
    if total > MAX_TOTAL_BYTES:
        violations.append(_violation(
            "asset-total", f"{total} bytes of images; at most {MAX_TOTAL_BYTES} per publish", None
        ))
    if violations:
        raise AssetError(violations)
    return prepared


def asset_map(prepared: list[PreparedAsset]) -> Optional[dict]:
    """The version's asset map, or ``None`` when the publish carried no assets."""
    if not prepared:
        return None
    return {a.name: a.map_entry() for a in prepared}


# --- the asset map in a header / a DB row --------------------------------------


def parse_asset_map(raw: Any) -> Optional[dict]:
    """Re-derive an asset map from a header value or stored JSON, leniently.

    Entries that are malformed (a bad name, an unknown file name, a non-positive
    size) are dropped rather than failing the document: a dropped entry only means
    that image renders as missing, never that another file becomes reachable.
    """
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (TypeError, json.JSONDecodeError):
            return None
    if not isinstance(raw, dict):
        return None
    out: dict[str, dict] = {}
    for name, entry in raw.items():
        if not isinstance(name, str) or not ASSET_NAME_RE.fullmatch(name):
            continue
        if not isinstance(entry, dict):
            continue
        file = entry.get("file")
        m = FILE_RE.fullmatch(file) if isinstance(file, str) else None
        if not m:
            continue
        media_type = MEDIA_TYPE_BY_EXT[m.group(2)]
        width, height = entry.get("width"), entry.get("height")
        if not (isinstance(width, int) and isinstance(height, int) and width > 0 and height > 0):
            continue
        clean: dict[str, Any] = {
            "file": file,
            "media_type": media_type,
            "width": width,
            "height": height,
            "animated": bool(entry.get("animated", False)),
        }
        still = entry.get("still")
        if isinstance(still, str) and FILE_RE.fullmatch(still) and still.endswith(".png"):
            clean["still"] = still
        out[name] = clean
    return out or None


def referenced_files(amap: Optional[dict]) -> dict[str, str]:
    """``{file: media_type}`` for every stored file an asset map references."""
    out: dict[str, str] = {}
    for entry in (amap or {}).values():
        if not isinstance(entry, dict):
            continue
        file = entry.get("file")
        if isinstance(file, str):
            m = FILE_RE.fullmatch(file)
            if m:
                out[file] = MEDIA_TYPE_BY_EXT[m.group(2)]
        still = entry.get("still")
        if isinstance(still, str) and FILE_RE.fullmatch(still):
            out[still] = "image/png"
    return out


# --- storage --------------------------------------------------------------------


def asset_dir_rel_path(rel_path: str) -> str:
    """``.assets/<project>/<date>-<slug>`` — one directory per document."""
    p = PurePosixPath(rel_path)
    return f"{ASSETS_DIR}/{p.parent.as_posix()}/{p.stem}"


def asset_file_path(root: Union[str, Path], rel_path: str, file: str) -> Optional[Path]:
    """The on-disk path of one stored file, or ``None`` for a malformed file name."""
    if not FILE_RE.fullmatch(file or ""):
        return None
    return Path(root) / asset_dir_rel_path(rel_path) / file


def _ensure_ignored(root: Path) -> None:
    """Write ``<root>/.assets/.gitignore`` (``*``) once: the tree never enters git."""
    base = root / ASSETS_DIR
    base.mkdir(parents=True, exist_ok=True)
    marker = base / ".gitignore"
    if not marker.exists():
        marker.write_text("# Chapter images are never committed (P30 A2).\n*\n", encoding="utf-8")


def _write_once(path: Path, data: bytes) -> bool:
    """Write ``data`` atomically unless the content-addressed file already exists."""
    if path.is_file():
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=".tmp-")
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
    return True


def store_assets(root: Union[str, Path], rel_path: str, prepared: list[PreparedAsset]) -> int:
    """Store every prepared asset (and still) under the document's directory.

    Call inside ``WRITE_LOCK``. Identical bytes are stored once (the file name is
    their hash). Returns how many files were newly written.
    """
    if not prepared:
        return 0
    root = Path(root)
    _ensure_ignored(root)
    written = 0
    for asset in prepared:
        path = asset_file_path(root, rel_path, asset.file)
        assert path is not None
        written += _write_once(path, asset.data)
        if asset.still_file and asset.still_data is not None:
            still_path = asset_file_path(root, rel_path, asset.still_file)
            assert still_path is not None
            written += _write_once(still_path, asset.still_data)
    return written


def remove_asset_dir(root: Union[str, Path], rel_path: str) -> bool:
    """Delete a document's whole asset directory (the delete path). Returns whether
    it existed. Every version of the document goes with it, so nothing that is
    still referenced is lost; empty ``<project>/`` parents are pruned."""
    target = Path(root) / asset_dir_rel_path(rel_path)
    if not target.is_dir():
        return False
    shutil.rmtree(target)
    try:
        target.parent.rmdir()
    except OSError:
        pass
    return True


def is_assets_path(path: str) -> bool:
    """Whether a repo-relative path points into an ``.assets`` tree (never staged)."""
    return ASSETS_DIR in PurePosixPath(path).parts

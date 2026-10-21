"""Native chapters for `knowledge save` (P30.S7).

Everything a native (or placed, or imaged) publish needs that a plain markdown save
does not, kept apart from `knowledge.py` so the md and html paths stay exactly what
they were. Four jobs:

* **Read the file's header.** A native chapter file starts with the `---` YAML
  header the server stores (`format: native`, `syntax: 1`, title, tags, lang, ...).
  `POST /api/documents` takes the body WITHOUT a header and writes its own, so the
  header is read first, its fields become request fields (a flag beats the header),
  and it is stripped from the body. There is no YAML dependency in this package, so
  `split_header` reads only the shapes the server itself writes: scalars, a block
  list, one level of nested mapping, and an inline `[a, b]` list.
* **Build the additive request fields**: `format`, `summary`, `book`, `chapter`,
  `lang`, `translated_from`, `subject`, `new_version`, `rel_path` and `assets`.
* **Encode images** for `--asset NAME=PATH`: base64, with the media type sniffed from
  the file's magic bytes (the server's `assets.sniff_media_type` is the authority;
  this only has to name the same four formats).
* **Say what the 422 list says**, one line per violation with its line number, and
  surface the 201's warnings.
"""

from __future__ import annotations

import base64
import json
import re
from typing import Any

from .errors import CliError

# server/books.py BOOK_KINDS.
BOOK_KINDS = ("codebase", "subject")

_KEY_LINE = re.compile(r"^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$")
_NESTED_LINE = re.compile(r'^\s+(?:"((?:[^"\\]|\\.)*)"|([A-Za-z0-9_.-]+)):\s*(.*)$')
_ITEM_LINE = re.compile(r"^\s+-\s+(.*)$")
_TRANSLATED = re.compile(r"^([a-z]{2,3})@(\d+)$")


# --- the header ---------------------------------------------------------------


def _scalar(value: str) -> Any:
    value = value.strip()
    if not value:
        return ""
    if value[0] in '"[{':
        try:
            return json.loads(value)
        except ValueError:
            pass
        if value[0] == "[" and value.endswith("]"):
            return [_scalar(part) for part in value[1:-1].split(",") if part.strip()]
        return value
    if value.isdigit():
        return int(value)
    return value


def split_header(text: str) -> tuple[dict[str, Any], str]:
    """`(fields, body)` for a file with a leading `---` header; `({}, text)` without.

    Only the shapes the server writes are understood; any key this does not need is
    harmless to get slightly wrong, because only the request fields below are read.
    """

    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, text
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if end is None:
        return {}, text

    fields: dict[str, Any] = {}
    key: str | None = None
    for line in lines[1:end]:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        top = _KEY_LINE.match(line) if not line[0].isspace() else None
        if top:
            key, rest = top.group(1), top.group(2)
            fields[key] = _scalar(rest) if rest.strip() else None
            continue
        if key is None:
            continue
        item = _ITEM_LINE.match(line)
        if item:
            if not isinstance(fields[key], list):
                fields[key] = []
            fields[key].append(_scalar(item.group(1)))
            continue
        nested = _NESTED_LINE.match(line)
        if nested:
            if not isinstance(fields[key], dict):
                fields[key] = {}
            name = json.loads(f'"{nested.group(1)}"') if nested.group(1) is not None else nested.group(2)
            fields[key][name] = _scalar(nested.group(3))
    body = "\n".join(lines[end + 1 :]).lstrip("\n")
    if text.endswith("\n") and not body.endswith("\n"):
        body += "\n"
    return fields, body


# --- the flags ----------------------------------------------------------------


def parse_translated_from(value: str) -> dict[str, Any]:
    """`ko@2` -> `{"lang": "ko", "version": 2}`."""

    match = _TRANSLATED.match(value.strip())
    if not match:
        raise CliError(
            f"invalid --translated-from {value!r}: write LANG@VERSION, e.g. `ko@2` "
            "(the source language and the source version this was translated from)"
        )
    return {"lang": match.group(1), "version": int(match.group(2))}


def parse_chapter_source(values: list[str] | None) -> dict[str, str] | None:
    """`--chapter-source phase=P8 --chapter-source slice=P8.S2` -> a string map."""

    if not values:
        return None
    source: dict[str, str] = {}
    for value in values:
        key, sep, val = value.partition("=")
        if not sep or not key.strip() or not val.strip():
            raise CliError(
                f"invalid --chapter-source {value!r}: write KEY=VALUE, e.g. `phase=P8`"
            )
        source[key.strip()] = val.strip()
    return source


def sniff_media_type(data: bytes) -> str | None:
    """The image's media type from its magic bytes, or None for anything else."""

    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def encode_assets(values: list[str] | None) -> list[dict[str, str]] | None:
    """`--asset NAME=PATH` (repeatable) -> `[{name, media_type, content_base64}]`."""

    if not values:
        return None
    seen: set[str] = set()
    assets: list[dict[str, str]] = []
    for value in values:
        name, sep, path = value.partition("=")
        if not sep or not name.strip() or not path.strip():
            raise CliError(
                f"invalid --asset {value!r}: write NAME=PATH, where NAME is what the "
                "chapter's `asset:NAME` (or a figure's `src`) says"
            )
        name = name.strip()
        if name in seen:
            raise CliError(f"--asset {name!r} is given twice")
        seen.add(name)
        try:
            with open(path, "rb") as handle:
                data = handle.read()
        except OSError as exc:
            raise CliError(f"cannot read asset {path}: {exc.strerror or exc}") from None
        media_type = sniff_media_type(data)
        if media_type is None:
            raise CliError(
                f"{path} is not a png, jpeg, webp or gif (checked by its first bytes, "
                "not its extension)"
            )
        assets.append(
            {
                "name": name,
                "media_type": media_type,
                "content_base64": base64.b64encode(data).decode("ascii"),
            }
        )
    return assets


def build_fields(args: Any, fmt: str, header: dict[str, Any]) -> dict[str, Any]:
    """The additive `POST /api/documents` fields this publish adds, header + flags.

    A flag beats the header. Only what was given is returned, so a plain md save
    returns `{}` and its request is byte-for-byte what it always was.
    """

    fields: dict[str, Any] = {}
    if fmt != "md":
        fields["format"] = fmt

    summary = args.summary or header.get("summary")
    if summary and fmt == "native":
        fields["summary"] = str(summary)

    lang = args.lang or header.get("lang")
    if lang:
        fields["lang"] = str(lang)

    if args.translated_from:
        fields["translated_from"] = parse_translated_from(args.translated_from)
    elif isinstance(header.get("translated_from"), dict):
        fields["translated_from"] = header["translated_from"]

    subject = args.subject or header.get("subject")
    if subject:
        fields["subject"] = str(subject)

    if args.book or args.chapter:
        if not (args.book and args.chapter):
            raise CliError(
                "--book and --chapter go together: give both to place a chapter in a "
                "book, or neither for a loose document"
            )
        if args.book_kind is not None and args.book_kind not in BOOK_KINDS:
            raise CliError(f"--book-kind is one of: {', '.join(BOOK_KINDS)}")
        book: dict[str, Any] = {"slug": args.book}
        for flag, key in (
            (args.book_kind, "kind"),
            (args.book_title, "title"),
            (args.book_subject, "subject"),
        ):
            if flag:
                book[key] = flag
        chapter: dict[str, Any] = {"key": args.chapter}
        if args.position is not None:
            chapter["position"] = args.position
        if args.chapter_title:
            chapter["title"] = args.chapter_title
        source = parse_chapter_source(args.chapter_source)
        if source:
            chapter["source"] = source
        fields["book"] = book
        fields["chapter"] = chapter
    elif args.position is not None or args.chapter_title or args.chapter_source:
        raise CliError("--position, --chapter-title and --chapter-source need --book and --chapter")

    if args.new_version:
        fields["new_version"] = True
    if args.rel_path:
        fields["rel_path"] = args.rel_path

    assets = encode_assets(args.asset)
    if assets:
        fields["assets"] = assets
    return fields


# --- what the server answered -------------------------------------------------


def violation_lines(detail: str) -> list[str] | None:
    """One readable line per violation in a 422 `detail` (a JSON list), else None.

    The native/asset 422 is a list of `{line, col, code, message, block?, ...}`;
    FastAPI's own request-validation 422 is `{loc, msg, type}`. Anything else is not
    ours to reformat.
    """

    try:
        data = json.loads(detail)
    except (TypeError, ValueError):
        return None
    if not isinstance(data, list) or not data or not all(isinstance(v, dict) for v in data):
        return None
    lines: list[str] = []
    for item in data:
        if "code" in item and "message" in item:
            line = item.get("line")
            where = f"line {line}" if line else "document"
            if line and item.get("col") and item.get("col") != 1:
                where += f":{item['col']}"
            extra = [
                f"{label} {item[key]}"
                for key, label in (("block", "in block"), ("element", "element"),
                                   ("attribute", "attribute"), ("asset", "asset"))
                if item.get(key)
            ]
            suffix = f" ({', '.join(extra)})" if extra else ""
            lines.append(f"  {where}: [{item['code']}] {item['message']}{suffix}")
        elif "msg" in item:
            loc = ".".join(str(p) for p in item.get("loc", []) if p != "body")
            lines.append(f"  {loc or 'request'}: {item['msg']}")
        else:
            return None
    return lines


def rejected_message(detail: str, *, dry_run: bool = False) -> str | None:
    """The sentence for a 422 the server rejected a chapter with, or None.

    `dry_run` (`knowledge check`, P31.S1) words it as what a publish *would* meet:
    nothing was sent to be published, so nothing "was rejected".
    """

    lines = violation_lines(detail)
    if lines is None:
        return None
    noun = "problem" if len(lines) == 1 else "problems"
    verb = "would reject" if dry_run else "rejected"
    return f"the server {verb} this publish ({len(lines)} {noun}):\n" + "\n".join(lines)


def warning_lines(payload: dict[str, Any]) -> list[str]:
    """The 201's `warnings`, one line each (same shape as a violation)."""

    out: list[str] = []
    for item in payload.get("warnings") or []:
        if isinstance(item, dict):
            line = item.get("line")
            where = f"line {line}: " if line else ""
            out.append(f"{where}[{item.get('code', 'warning')}] {item.get('message', '')}")
        else:
            out.append(str(item))
    return out

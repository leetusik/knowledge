"""Violations and the one error the native parser raises.

P29 *Ingest*: every failure is ONE 422 that lists EVERY violation. The parser
therefore collects violations as it goes and raises a single
``NativeFormatError`` at the end; ``.line/.col/.code/.message`` mirror the first
violation, and ``.violations`` holds them all (sorted by line, then column).
``to_detail()`` is the JSON shape the ingest route (S5) puts in the 422.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class Violation:
    line: int  # 1-based line in the whole chapter source (header included)
    col: int  # 1-based column; best effort (1 when only the line is known)
    code: str  # a stable machine code, listed in server/native/README.md
    message: str
    block: Optional[str] = None  # the typed block's id, when inside one
    element: Optional[str] = None  # svg: the offending element
    attribute: Optional[str] = None  # svg: the offending attribute

    def to_dict(self) -> dict:
        out = {"line": self.line, "col": self.col, "code": self.code, "message": self.message}
        for key in ("block", "element", "attribute"):
            value = getattr(self, key)
            if value is not None:
                out[key] = value
        return out


class NativeFormatError(ValueError):
    """The chapter violates the native format. Never stripped: rejected."""

    def __init__(self, violations: list[Violation]):
        if not violations:
            raise ValueError("NativeFormatError needs at least one violation")
        self.violations = sorted(violations, key=lambda v: (v.line, v.col, v.code))
        first = self.violations[0]
        self.line, self.col, self.code, self.message = first.line, first.col, first.code, first.message
        more = len(self.violations) - 1
        suffix = f" (and {more} more)" if more else ""
        super().__init__(f"line {first.line}:{first.col} {first.code}: {first.message}{suffix}")

    def to_detail(self) -> list[dict]:
        return [v.to_dict() for v in self.violations]


@dataclass
class Collector:
    """Accumulates violations; ``line_base`` maps a 0-based body line to the file."""

    violations: list[Violation] = field(default_factory=list)

    def add(self, line: int, code: str, message: str, col: int = 1, **extra) -> None:
        self.violations.append(Violation(line=line, col=col, code=code, message=message, **extra))

    def raise_if_any(self) -> None:
        if self.violations:
            raise NativeFormatError(self.violations)

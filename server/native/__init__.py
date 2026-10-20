"""The native chapter format (P29.S2's contract): a pure parser, validator and
plain-text projection. Not wired to a route here (S5 wires ingest; S12 builds
the TS renderer from the same fixtures). See ``README.md`` beside this file."""
from .errors import NativeFormatError, Violation
from .parse import SYNTAX_VERSION, ParseResult, parse_chapter
from .project import format_sections, search_text, section_map, sections
from .svg import validate_svg

__all__ = [
    "NativeFormatError",
    "ParseResult",
    "SYNTAX_VERSION",
    "Violation",
    "format_sections",
    "parse_chapter",
    "search_text",
    "section_map",
    "sections",
    "validate_svg",
]

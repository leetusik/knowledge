"""Core test 4 (Python half): the native format's shared conformance fixtures.

Every ``tests/fixtures/native/<case>.md`` either parses to exactly
``<case>.json`` with the section projection ``<case>.txt``, or fails with
exactly the violations in ``<case>.err``. S12 runs the same directory from TS.
Plus direct tests for the SVG allowlist's rejection cases.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from server.native import NativeFormatError, format_sections, parse_chapter, sections, validate_svg
from server.native.fixtures_util import format_errors

FIXTURES = Path(__file__).parent / "fixtures" / "native"
CASES = sorted(FIXTURES.glob("*.md"))


@pytest.mark.parametrize("src", CASES, ids=lambda p: p.stem)
def test_conformance_fixture(src: Path):
    text = src.read_text(encoding="utf-8")
    err = src.with_suffix(".err")
    if err.exists():
        with pytest.raises(NativeFormatError) as exc:
            parse_chapter(text)
        assert format_errors(exc.value) == err.read_text(encoding="utf-8")
        return
    result = parse_chapter(text)
    assert result.tree == json.loads(src.with_suffix(".json").read_text(encoding="utf-8"))
    assert format_sections(sections(result.tree)) == src.with_suffix(".txt").read_text(encoding="utf-8")
    # The stored file carries every assigned id, so it re-parses to the same tree
    # with nothing left to assign.
    again = parse_chapter(result.source)
    assert again.tree == result.tree
    assert again.assigned_ids == []


def test_fixture_directory_is_complete():
    assert CASES, "no fixtures found"
    for src in CASES:
        has_err = src.with_suffix(".err").exists()
        has_ok = src.with_suffix(".json").exists() and src.with_suffix(".txt").exists()
        assert has_err != has_ok, f"{src.name} needs either .err or both .json and .txt"


def test_body_limit():
    head = "---\nformat: native\nsyntax: 1\n---\n"
    at = head + "a" * (512 * 1024 - len(head) - 1) + "\n"
    assert len(at.encode()) == 512 * 1024
    parse_chapter(at)
    with pytest.raises(NativeFormatError) as exc:
        parse_chapter(at + "b")
    assert exc.value.code == "body-too-large"


# --- the SVG allowlist: reject, never strip --------------------------------

def _svg(inner: str, root_attrs: str = 'viewBox="0 0 10 10"') -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" {root_attrs}>{inner}</svg>'


def _codes(source: str) -> set[tuple]:
    tree, violations = validate_svg(source)
    assert tree is None, "a rejected svg must not yield a tree"
    return {(code, element, attribute) for _line, code, _msg, element, attribute in violations}


@pytest.mark.parametrize(
    "element",
    ["script", "foreignObject", "style", "image", "a", "animate", "set", "animateTransform", "filter", "iframe"],
)
def test_svg_rejects_disallowed_element(element):
    assert ("svg-element", element, None) in _codes(_svg(f"<{element}/>"))


@pytest.mark.parametrize(
    "attr, value, code",
    [
        ("onclick", "alert(1)", "svg-attribute"),
        ("onload", "x", "svg-attribute"),
        ("style", "fill:red", "svg-attribute"),
        ("filter", "url(#f)", "svg-attribute"),
        ("fill", "#ff0000", "svg-value"),
        ("stroke", "rgb(1,2,3)", "svg-value"),
        ("fill", "red", "svg-value"),
        ("fill", "url(#grad)", "svg-ref"),
        ("class", "fixed inset-0", "svg-value"),
        ("marker-end", "url(https://evil.example/m.svg#m)", "svg-ref"),
    ],
)
def test_svg_rejects_disallowed_attribute(attr, value, code):
    assert (code, "rect", attr) in _codes(_svg(f'<rect {attr}="{value}"/>'))


@pytest.mark.parametrize(
    "inner, attribute",
    [
        ('<use href="https://evil.example/s.svg#i"/>', "href"),
        ('<use xlink:href="data:image/svg+xml;base64,AA" xmlns:xlink="http://www.w3.org/1999/xlink"/>', "xlink:href"),
        ('<use href="#missing"/>', "href"),
        ('<rect href="#r" id="r"/>', "href"),
    ],
)
def test_svg_rejects_external_reference(inner, attribute):
    codes = _codes(_svg(inner))
    assert any(attr == attribute and code in ("svg-ref", "svg-attribute") for code, _el, attr in codes)


def test_svg_rejects_doctype_entities_and_foreign_namespaces():
    assert ("svg-xml", None, None) in _codes('<!DOCTYPE svg [<!ENTITY x "y">]><svg viewBox="0 0 1 1"/>')
    assert ("svg-xml", None, None) in _codes(_svg("<!-- hidden -->"))
    assert ("svg-namespace", "div", None) in _codes(
        _svg('<x:div xmlns:x="http://www.w3.org/1999/xhtml"/>'))
    assert ("svg-root", "svg", "viewBox") in _codes('<svg xmlns="http://www.w3.org/2000/svg"/>')


def test_svg_limits():
    at = _svg("<g/>" * 1999)  # 1999 + the root = 2000 elements
    tree, violations = validate_svg(at)
    assert violations == [] and tree is not None
    assert ("svg-limit", None, None) in _codes(_svg("<g/>" * 2000))
    big = _svg("<g>" + "<desc>" + "x" * (64 * 1024) + "</desc></g>")
    assert ("svg-limit", None, None) in _codes(big)


def test_svg_reports_every_violation():
    source = _svg('<script/><rect onclick="x" fill="red"/><use href="https://e.example/a#b"/>')
    codes = _codes(source)
    assert {c for c, _e, _a in codes} >= {"svg-element", "svg-attribute", "svg-value", "svg-ref"}

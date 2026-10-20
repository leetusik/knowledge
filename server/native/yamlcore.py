"""A YAML 1.2 *core schema* loader on top of PyYAML.

PyYAML implements YAML 1.1, whose implicit typing differs from 1.2 core
(``yes``/``on`` are booleans, ``2026-10-21`` is a date, ``1_000`` an int, ``<<``
a merge key, sexagesimal numbers ...). This module uses PyYAML only for the
scanner/parser/composer and resolves plain scalars itself, by the 1.2 core
regexes. It refuses what the native format forbids instead of ignoring it:

* anchors, aliases and explicit tags (``!!str``, ``!foo``), ``%YAML``/``%TAG``
  directives and multiple documents;
* duplicate keys, non-string keys and the merge key ``<<``;
* ``.inf``/``.nan`` (not JSON).

JSON is valid YAML 1.2 flow syntax, so JSON bodies load too.

``load(text)`` returns ``(data, lines)`` where ``lines`` maps a path tuple
(``("items", 0, "id")``) to the 0-based line of that node inside ``text``.
Errors raise ``YamlError(line, code, message)`` (0-based line).
"""
from __future__ import annotations

import re
from typing import Any

import yaml
from yaml.nodes import MappingNode, ScalarNode, SequenceNode


MAX_DEPTH = 32


class YamlError(Exception):
    def __init__(self, line: int, code: str, message: str):
        super().__init__(message)
        self.line = line
        self.code = code
        self.message = message


class _NoResolve(yaml.resolver.BaseResolver):
    """Tags every node with its kind only; resolution happens in ``_resolve``."""


class _Loader(
    yaml.reader.Reader,
    yaml.scanner.Scanner,
    yaml.parser.Parser,
    yaml.composer.Composer,
    yaml.constructor.BaseConstructor,
    _NoResolve,
):
    def __init__(self, stream):
        yaml.reader.Reader.__init__(self, stream)
        yaml.scanner.Scanner.__init__(self)
        yaml.parser.Parser.__init__(self)
        yaml.composer.Composer.__init__(self)
        yaml.constructor.BaseConstructor.__init__(self)
        _NoResolve.__init__(self)


_NULL = re.compile(r"^(?:~|null|Null|NULL|)$")
_TRUE = re.compile(r"^(?:true|True|TRUE)$")
_FALSE = re.compile(r"^(?:false|False|FALSE)$")
_INT10 = re.compile(r"^[-+]?[0-9]+$")
_INT8 = re.compile(r"^0o[0-7]+$")
_INT16 = re.compile(r"^0x[0-9a-fA-F]+$")
_FLOAT = re.compile(r"^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)(?:[eE][-+]?[0-9]+)?$")
_SPECIAL_FLOAT = re.compile(r"^(?:[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$")


def _resolve(node: ScalarNode) -> Any:
    value = node.value
    if node.style is not None:  # quoted or block scalar: always a string
        return value
    if _NULL.match(value):
        return None
    if _TRUE.match(value):
        return True
    if _FALSE.match(value):
        return False
    if _INT10.match(value):
        return int(value, 10)
    if _INT8.match(value):
        return int(value[2:], 8)
    if _INT16.match(value):
        return int(value[2:], 16)
    if _FLOAT.match(value):
        return float(value)
    if _SPECIAL_FLOAT.match(value):
        raise YamlError(node.start_mark.line, "yaml-value", f"{value!r} is not a JSON number")
    return value


def _check_events(text: str) -> None:
    depth = 0
    for event in yaml.parse(text, Loader=_Loader):
        line = event.start_mark.line
        if isinstance(event, (yaml.SequenceStartEvent, yaml.MappingStartEvent)):
            depth += 1
            if depth > MAX_DEPTH:  # the event parser is iterative; stop before compose recurses
                raise YamlError(line, "limit", f"YAML nests deeper than {MAX_DEPTH} levels")
        elif isinstance(event, (yaml.SequenceEndEvent, yaml.MappingEndEvent)):
            depth -= 1
        if isinstance(event, yaml.DocumentStartEvent) and (event.version or event.tags):
            raise YamlError(line, "yaml-tag", "YAML directives (%YAML, %TAG) are not allowed")
        if isinstance(event, yaml.AliasEvent):
            raise YamlError(line, "yaml-anchor", "YAML aliases (*name) are not allowed")
        anchor = getattr(event, "anchor", None)
        if anchor is not None:
            raise YamlError(line, "yaml-anchor", "YAML anchors (&name) are not allowed")
        tag = getattr(event, "tag", None)
        if tag is not None and tag != "!":
            raise YamlError(line, "yaml-tag", f"YAML tags are not allowed ({tag})")


def _convert(node, path: tuple, lines: dict) -> Any:
    lines[path] = node.start_mark.line
    if len(path) > MAX_DEPTH:
        raise YamlError(node.start_mark.line, "limit", f"YAML nests deeper than {MAX_DEPTH} levels")
    if isinstance(node, ScalarNode):
        return _resolve(node)
    if isinstance(node, SequenceNode):
        return [_convert(child, path + (i,), lines) for i, child in enumerate(node.value)]
    if isinstance(node, MappingNode):
        out: dict = {}
        for key_node, value_node in node.value:
            line = key_node.start_mark.line
            if not isinstance(key_node, ScalarNode):
                raise YamlError(line, "yaml-key", "mapping keys must be strings")
            key = _resolve(key_node)
            if not isinstance(key, str):
                raise YamlError(line, "yaml-key", f"mapping key {key_node.value!r} must be a string")
            if key == "<<" and key_node.style is None:
                raise YamlError(line, "yaml-merge", "YAML merge keys (<<) are not allowed")
            if key in out:
                raise YamlError(line, "yaml-duplicate-key", f"duplicate key {key!r}")
            out[key] = _convert(value_node, path + (key,), lines)
            lines[path + (key,)] = line  # a field's line is its key's line
        return out
    raise YamlError(node.start_mark.line, "yaml", "unsupported YAML node")  # pragma: no cover


def load(text: str) -> tuple[Any, dict]:
    try:
        _check_events(text)
        node = yaml.compose(text, Loader=_Loader)
    except YamlError:
        raise
    except RecursionError:
        raise YamlError(0, "limit", f"YAML nests deeper than {MAX_DEPTH} levels")
    except yaml.MarkedYAMLError as exc:
        mark = exc.problem_mark or exc.context_mark
        line = mark.line if mark is not None else 0
        raise YamlError(line, "yaml", f"invalid YAML: {exc.problem or exc}")
    except yaml.YAMLError as exc:
        raise YamlError(0, "yaml", f"invalid YAML: {exc}")
    lines: dict = {}
    if node is None:
        return None, lines
    try:
        return _convert(node, (), lines), lines
    except RecursionError:  # pragma: no cover - MAX_DEPTH stops it first
        raise YamlError(0, "limit", f"YAML nests deeper than {MAX_DEPTH} levels")

"""P30.S7: what `knowledge save` sends for a native, placed or imaged publish.

Only the hazards: the file's header must be stripped (the server writes its own, so
a body that kept it would fail to parse), a flag must beat the header, an image's
type comes from its bytes, `--book` without `--chapter` must not leave the machine,
and a 422 list must read as lines, not as a JSON blob. Same idiom as
`test_knowledge.py`: `httpx.MockTransport`, no live server.
"""

import base64
import functools
import json

import httpx
import pytest

from knowledge_cli import config, knowledge, main, native
from knowledge_cli.client import KnowledgeClient

VK = "vk_" + "n" * 40
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16

CHAPTER = """---
title: "Why caches work"
date: 2026-10-01
format: native
syntax: 1
lang: ko
translated_from:
  lang: en
  version: 2
subject: "Systems"
summary: "A short lede"
tags:
  - caching
  - basics
source:
  project: demo
  repo: demo
---
## Background

Text. ![fig](asset:arch)
"""


class Fake:
    def __init__(self, status=201, payload=None):
        self.status = status
        self.payload = payload or {"id": 7, "rel_path": "demo/2026-10-21-x.md", "title": "T"}
        self.bodies = []

    def handler(self, request):
        self.bodies.append(json.loads(request.content))
        return httpx.Response(self.status, json=self.payload)


@pytest.fixture
def fake(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / ".config"))
    for key in (config.ENV_KB_ROOT, config.ENV_API_BASE_URL, config.ENV_API_TOKEN):
        monkeypatch.delenv(key, raising=False)
    config.save({"api": {"base_url": "http://api.test", "token": VK, "project": "demo"}})
    monkeypatch.chdir(tmp_path)
    api = Fake()
    monkeypatch.setattr(
        knowledge,
        "KnowledgeClient",
        functools.partial(KnowledgeClient, transport=httpx.MockTransport(api.handler)),
    )
    return api


def run(*argv):
    return main.main(["--base-url", "http://api.test", *argv])


def test_header_is_read_then_stripped_and_a_flag_beats_it(fake, tmp_path):
    path = tmp_path / "c.md"
    path.write_text(CHAPTER)
    assert run("save", str(path), "--lang", "en") == 0
    body = fake.bodies[0]
    assert body["format"] == "native"  # detected from the header
    assert body["markdown"].startswith("## Background")  # header stripped
    assert body["title"] == "Why caches work"
    assert body["tags"] == ["caching", "basics"]
    assert body["summary"] == "A short lede"
    assert body["subject"] == "Systems"
    assert body["translated_from"] == {"lang": "en", "version": 2}
    assert body["lang"] == "en"  # the flag, not the header's `ko`


def test_placement_assets_and_new_version(fake, tmp_path):
    image = tmp_path / "arch.png"
    image.write_bytes(PNG)
    path = tmp_path / "c.md"
    path.write_text("## Intro\n\n![x](asset:arch)\n")
    assert run(
        "save", str(path), "--format", "native", "--title", "T", "--tag", "a,b",
        "--book", "phases", "--book-kind", "codebase", "--book-title", "Demo",
        "--chapter", "p8", "--position", "8", "--chapter-title", "P8: X",
        "--chapter-source", "phase=P8", "--asset", f"arch={image}",
        "--new-version", "--translated-from", "en@3", "--lang", "ko",
    ) == 0
    body = fake.bodies[0]
    assert body["book"] == {"slug": "phases", "kind": "codebase", "title": "Demo"}
    assert body["chapter"] == {
        "key": "p8", "position": 8.0, "title": "P8: X", "source": {"phase": "P8"},
    }
    assert body["translated_from"] == {"lang": "en", "version": 3}
    assert body["new_version"] is True
    [asset] = body["assets"]
    assert asset["name"] == "arch" and asset["media_type"] == "image/png"
    assert base64.b64decode(asset["content_base64"]) == PNG


def test_a_plain_md_save_adds_no_new_field(fake, tmp_path):
    path = tmp_path / "n.md"
    path.write_text("# A note\n\nbody\n")
    assert run("save", str(path), "--tag", "a,b") == 0
    assert set(fake.bodies[0]) == {
        "title", "markdown", "project", "tags", "source_repo", "overwrite", "commit",
    }


@pytest.mark.parametrize(
    "extra, message",
    [
        (["--book", "b"], "--book and --chapter go together"),
        (["--position", "2"], "need --book and --chapter"),
        (["--translated-from", "english"], "LANG@VERSION"),
        (["--asset", "nope"], "NAME=PATH"),
    ],
)
def test_bad_flags_never_reach_the_server(fake, tmp_path, capsys, extra, message):
    path = tmp_path / "c.md"
    path.write_text("## Intro\n\ntext\n")
    assert run("save", str(path), "--format", "native", "--title", "T", "--tag", "a,b", *extra) == 1
    assert message in capsys.readouterr().err
    assert fake.bodies == []


def test_an_asset_that_is_not_an_image_is_refused_by_its_bytes(fake, tmp_path, capsys):
    fake_png = tmp_path / "a.png"
    fake_png.write_text("<html>not an image</html>")
    path = tmp_path / "c.md"
    path.write_text("## Intro\n\ntext\n")
    assert run("save", str(path), "--format", "native", "--title", "T", "--tag", "a,b",
               "--asset", f"a={fake_png}") == 1
    assert "not a png, jpeg, webp or gif" in capsys.readouterr().err
    assert fake.bodies == []


def test_a_422_list_prints_every_violation_with_its_line(tmp_path, monkeypatch, capsys, fake):
    fake.status = 422
    fake.payload = {"detail": [
        {"line": 4, "col": 1, "code": "ref-unknown-asset", "message": "no asset 'arch'"},
        {"line": 9, "col": 3, "code": "quiz-answer", "message": "bad answer", "block": "q1"},
        {"line": 0, "col": 0, "code": "asset-format", "message": "assets need native", "asset": "arch"},
    ]}
    path = tmp_path / "c.md"
    path.write_text("## Intro\n\ntext\n")
    assert run("save", str(path), "--format", "native", "--title", "T", "--tag", "a,b") == 1
    err = capsys.readouterr().err
    assert "3 problems" in err
    assert "line 4: [ref-unknown-asset] no asset 'arch'" in err
    assert "line 9:3: [quiz-answer] bad answer (in block q1)" in err
    assert "document: [asset-format]" in err
    assert "{" not in err


def test_warnings_from_the_201_are_printed(fake, tmp_path, capsys):
    fake.payload = {
        "id": 7, "rel_path": "demo/x.md", "title": "T",
        "warnings": [{"line": 12, "code": "ref-unresolved", "message": "no chapter:x"}],
    }
    path = tmp_path / "c.md"
    path.write_text("## Intro\n\ntext\n")
    assert run("save", str(path), "--format", "native", "--title", "T", "--tag", "a,b") == 0
    assert "warning: line 12: [ref-unresolved] no chapter:x" in capsys.readouterr().err


def test_sniff_and_header_parser():
    assert native.sniff_media_type(b"GIF89a....") == "image/gif"
    assert native.sniff_media_type(b"RIFF\x00\x00\x00\x00WEBPVP8 ") == "image/webp"
    assert native.sniff_media_type(b"\xff\xd8\xff\xe0") == "image/jpeg"
    assert native.sniff_media_type(b"plain") is None
    fields, body = native.split_header('---\ntags: [a, b]\nassets:\n  "x": {"width": 3}\n---\nBody\n')
    assert fields["tags"] == ["a", "b"] and fields["assets"] == {"x": {"width": 3}}
    assert body == "Body\n"
    assert native.split_header("# no header\n") == ({}, "# no header\n")

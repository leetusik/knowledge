"""Pins the S3 behaviors that would actually hurt if they broke.

Not a coverage exercise — each test is a hazard: a write filed under the wrong
project (so the plugin and the CLI split one repo's notes in two), a raw 422 where
a sentence belongs, a 409 rendered as a JSON blob, `read` guessing wrong between an
id and a path, a `vk_` reaching a terminal — and, above all,
`test_kb_api_token_wins_and_warns`, which is the only thing standing between a
mis-resolved bearer and a document published to the live public website.

Same idiom as `test_auth.py`: `httpx.MockTransport`, no live server, an isolated
HOME + XDG_CONFIG_HOME.
"""

import functools
import io
import json

import httpx
import pytest

from knowledge_cli import auth, config, knowledge, main
from knowledge_cli.client import KnowledgeClient

VK = "vk_" + "k" * 40
DOC = {
    "id": 42,
    "rel_path": "myrepo/2026-07-17-a-note.md",
    "title": "A note",
    "date": "2026-07-17",
    "project": "myrepo",
    "tags": ["python", "testing"],
    "markdown": "# A note\n\nbody\n",
}


class FakeApi:
    """The /api routes S3 touches. `calls` records (method, path, bearer, body)."""

    def __init__(self, conflict=False):
        self.conflict = conflict
        self.calls = []

    def handler(self, request):
        path, method = request.url.path, request.method
        body = json.loads(request.content) if request.content else {}
        self.calls.append((method, path, request.headers.get("authorization"), body))

        if (method, path) == ("POST", "/api/documents"):
            if self.conflict and not body.get("overwrite"):
                # main.py:426-430 — the detail is a DICT, not prose.
                return httpx.Response(409, json={"detail": {
                    "message": f"document already exists at {DOC['rel_path']}",
                    "rel_path": DOC["rel_path"],
                    "id": DOC["id"],
                    "existing_title": DOC["title"],
                }})
            return httpx.Response(201, json={**DOC, "url": "http://site.test/x/", "committed": False})
        if method == "GET" and path.startswith("/api/documents/"):
            return httpx.Response(200, json=DOC)
        return httpx.Response(404, text="<html>mkdocs</html>")

    @property
    def paths(self):
        return [(method, path) for method, path, _, _ in self.calls]


@pytest.fixture
def home(tmp_path, monkeypatch):
    """Isolated HOME/XDG_CONFIG_HOME with a configured `vk_`, and no KB_* env."""

    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / ".config"))
    for key in (config.ENV_KB_ROOT, config.ENV_API_BASE_URL, config.ENV_API_TOKEN):
        monkeypatch.delenv(key, raising=False)
    config.save({"api": {"base_url": "http://api.test", "token": VK, "project": "cfgproj"}})
    return tmp_path


@pytest.fixture
def api(monkeypatch):
    fake = FakeApi()
    monkeypatch.setattr(
        knowledge,
        "KnowledgeClient",
        functools.partial(KnowledgeClient, transport=httpx.MockTransport(fake.handler)),
    )
    return fake


@pytest.fixture
def repo(tmp_path, monkeypatch):
    """A git working tree called `myrepo`, cwd inside a subdirectory of it."""

    root = tmp_path / "myrepo"
    (root / "src").mkdir(parents=True)
    (root / ".git").mkdir()
    monkeypatch.chdir(root / "src")
    return root


def run(*argv):
    return main.main(["--base-url", "http://api.test", *argv])


# --- T1: the write lands where /knowledge:explain would put it -----------------


def test_save_uses_the_repo_name_and_a_frontmatter_free_body(home, api, repo, tmp_path):
    """project = the repo root's basename, verbatim (explain/SKILL.md:160).

    The CLI and the plugin write the same corpus with the same key; if they
    partition it differently, one repo's notes end up split across two projects.
    """

    doc = tmp_path / "note.md"
    doc.write_text('---\ntitle: "stale"\ntags:\n  - old\n---\n\n# A note\n\nbody\n')
    assert run("save", str(doc), "--tag", "python,testing") == 0

    _, _, bearer, body = api.calls[0]
    assert body["project"] == "myrepo"  # the repo, not the config's `cfgproj`
    assert body["source_repo"] == "myrepo"
    assert body["markdown"].startswith("# A note")  # frontmatter stripped
    assert "stale" not in body["markdown"]
    assert body["title"] == "A note"  # derived from the H1
    assert body["tags"] == ["python", "testing"]  # --tag comma-split
    assert bearer == f"Bearer {VK}"


def test_save_falls_back_to_the_configured_project_outside_a_repo(home, api, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    doc = tmp_path / "note.md"
    doc.write_text("# A note\n\nbody\n")
    assert run("save", str(doc), "--tag", "a", "--tag", "b") == 0
    assert api.calls[0][3]["project"] == "cfgproj"


# --- T2: the rules the server would 422 about ---------------------------------


@pytest.mark.parametrize(
    "tags, expected",
    [
        (["only-one"], "2-5 tags"),  # documents.py:61-62
        (["a", "b", "c", "d", "e", "f"], "2-5 tags"),
        (["python", "Auth"], "invalid tag 'Auth'"),  # documents.py:33 — the likelier slip
        (["python", "web api"], "invalid tag 'web api'"),
    ],
)
def test_bad_tags_never_reach_the_server(home, api, repo, tmp_path, capsys, tags, expected):
    doc = tmp_path / "note.md"
    doc.write_text("# A note\n\nbody\n")
    argv = [arg for tag in tags for arg in ("--tag", tag)]
    assert run("save", str(doc), *argv) == 1
    assert expected in capsys.readouterr().err
    assert api.calls == []  # not a round trip, and not a raw 422


def test_an_unusable_repo_name_is_a_sentence_not_a_422(home, api, tmp_path, monkeypatch, capsys):
    """The name was auto-derived — the user never typed it, so name the source."""

    root = tmp_path / "my repo"
    (root / ".git").mkdir(parents=True)
    monkeypatch.chdir(root)
    doc = tmp_path / "note.md"
    doc.write_text("# A note\n\nbody\n")
    assert run("save", str(doc), "--tag", "a", "--tag", "b") == 1
    err = capsys.readouterr().err
    assert "this repo's directory name ('my repo')" in err
    assert "--project my-repo" in err
    assert api.calls == []


# --- T3: the 409 detail is a dict ---------------------------------------------


def test_conflict_names_the_path_and_the_fix(home, api, repo, tmp_path, capsys):
    """`client._detail` json.dumps a non-string detail; parse it back or blob at the user."""

    api.conflict = True
    doc = tmp_path / "note.md"
    doc.write_text("# A note\n\nbody\n")
    assert run("save", str(doc), "--tag", "a", "--tag", "b") == 1
    err = capsys.readouterr().err
    assert DOC["rel_path"] in err
    assert "--overwrite" in err
    assert "{" not in err  # the dict was read, not dumped

    assert run("save", str(doc), "--tag", "a", "--tag", "b", "--overwrite") == 0


# --- T4: read's id-vs-path split ----------------------------------------------


def test_read_routes_digits_to_the_id_route_and_anything_else_by_path(home, api, repo):
    """A rel_path can never be all digits, so the heuristic is total, not a guess."""

    assert run("read", "42") == 0
    assert run("read", "a/b.md") == 0
    assert api.paths == [
        ("GET", "/api/documents/42"),
        ("GET", "/api/documents/by-path/a/b.md"),
    ]


# --- T5: the one that matters -------------------------------------------------


def test_kb_api_token_wins_and_warns(home, api, repo, tmp_path, monkeypatch, capsys):
    """$KB_API_TOKEN keeps the seam's precedence — and must say so.

    An exact match short-circuits to **tenant #1** (`api_auth.py:142-149`), whose
    writes are `is_public`: the canonical docs/ tree, the public Recent index, a
    commit, and a push to the live website. Whichever bearer this test asserts is
    the one that publishes.
    """

    monkeypatch.setenv(config.ENV_API_TOKEN, "master-token-not-mine")
    doc = tmp_path / "note.md"
    doc.write_text("# A note\n\nbody\n")
    assert run("save", str(doc), "--tag", "a", "--tag", "b") == 0

    assert api.calls[0][2] == "Bearer master-token-not-mine"  # env > config, on the wire
    err = capsys.readouterr().err
    assert "$KB_API_TOKEN overrides" in err
    assert "tenant #1" in err
    assert VK not in err  # the displaced key is redacted, even while being displaced


def test_no_warning_when_the_env_var_is_absent(home, api, repo, tmp_path, capsys):
    doc = tmp_path / "note.md"
    doc.write_text("# A note\n\nbody\n")
    assert run("save", str(doc), "--tag", "a", "--tag", "b") == 0
    assert api.calls[0][2] == f"Bearer {VK}"
    assert "KB_API_TOKEN" not in capsys.readouterr().err


# --- T6: the key never reaches a terminal -------------------------------------


def test_no_command_ever_prints_the_key(home, api, repo, tmp_path, capsys, monkeypatch):
    doc = tmp_path / "note.md"
    doc.write_text("# A note\n\nbody\n")
    monkeypatch.setattr("sys.stdin", io.StringIO(""))
    run("save", str(doc), "--tag", "a", "--tag", "b")
    run("save", str(doc), "--tag", "a", "--tag", "b", "--json")
    run("read", "42")
    run("read", "42", "--json")
    run("search", "note")  # 404s off the fake -> the error path prints too
    run("list")
    run("projects")
    run("usage")
    out = capsys.readouterr()
    assert VK not in out.out + out.err


# --- the empty state that reads as a bug --------------------------------------


def test_projects_explains_why_a_just_created_project_is_missing(home, monkeypatch, capsys):
    """/api/projects is a GROUP BY over documents (db.py:344-355), not a registry."""

    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={"projects": []}))
    monkeypatch.setattr(
        knowledge, "KnowledgeClient", functools.partial(KnowledgeClient, transport=transport)
    )
    assert run("projects") == 0
    assert "projects appear here once you save one" in capsys.readouterr().out


def test_usage_without_a_session_says_save_and_search_still_work(home, capsys):
    """The two-token model, visible: only `usage` needs the session."""

    assert run("usage") == 1
    assert "not logged in" in capsys.readouterr().err

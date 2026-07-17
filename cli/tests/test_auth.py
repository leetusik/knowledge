"""Pins the S2 behaviors that would actually hurt if they broke.

Not a coverage exercise — each test is a hazard: a password reaching argv, a
show-once `vk_` being re-minted or lost, `init` littering a tenant with duplicate
projects, `logout` taking the user's API key down with it, or the generic 401
growing a hint about *which* half was wrong.

Everything runs against `httpx.MockTransport` (no live server, no new dep) under
an isolated HOME + XDG_CONFIG_HOME: the operator's real
~/.config/knowledge-kb/config.json is never read or written.
"""

import functools
import io
import json
import stat
import sys

import httpx
import pytest

from knowledge_cli import auth, config, main
from knowledge_cli.client import KnowledgeClient

TENANT = {"id": "t1", "name": "ada's workspace", "created_at": "2026-07-17T00:00:00"}
USER = {"id": "u1", "email": "ada@example.com", "created_at": "2026-07-17T00:00:00"}
PW = "correct-horse"
VK = "vk_" + "k" * 40


class FakeApi:
    """The /auth + /app routes S2 touches, in the server's real response shapes."""

    def __init__(self, users=None, projects=None):
        self.users = dict(users or {})
        self.projects = list(projects or [])
        self.minted = 0
        self.calls = []

    def handler(self, request):
        path, method = request.url.path, request.method
        self.calls.append((method, path))
        body = json.loads(request.content) if request.content else {}

        if (method, path) == ("POST", "/auth/signup"):
            if body["email"] in self.users:  # auth_api.py:118 — duplicate email
                return httpx.Response(409, json={"detail": "a user with this email already exists"})
            self.users[body["email"]] = body["password"]
            return httpx.Response(201, json={"token": "sess1", "user": USER, "tenant": TENANT})
        if (method, path) == ("POST", "/auth/login"):
            if self.users.get(body["email"]) != body["password"]:
                # auth_api.py:144-145 — identical for unknown email and bad password
                return httpx.Response(401, json={"detail": "invalid email or password"})
            return httpx.Response(200, json={"token": "sess2", "user": USER, "tenants": [TENANT]})
        if (method, path) == ("POST", "/auth/logout"):
            return httpx.Response(204)
        if (method, path) == ("GET", "/auth/me"):
            return httpx.Response(200, json={"user": USER, "tenants": [TENANT]})
        if (method, path) == ("GET", "/app/projects"):
            return httpx.Response(200, json={"projects": self.projects})
        if (method, path) == ("POST", "/app/projects"):
            project = {"id": f"p{len(self.projects) + 1}", "name": body["name"], "tenant_id": "t1"}
            self.projects.append(project)
            return httpx.Response(201, json={"project": project})
        if method == "POST" and path.endswith("/credentials"):
            self.minted += 1
            return httpx.Response(201, json={"credential": {"id": "c1"}, "key": VK})
        return httpx.Response(404, text="<html>mkdocs</html>")


@pytest.fixture
def home(tmp_path, monkeypatch):
    """Isolated HOME/XDG_CONFIG_HOME, no KB_*/KNOWLEDGE_* env, stdin not a TTY."""

    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / ".config"))
    for key in (config.ENV_KB_ROOT, config.ENV_API_BASE_URL, config.ENV_API_TOKEN, auth.ENV_PASSWORD):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setattr("sys.stdin", io.StringIO(""))
    return tmp_path


@pytest.fixture
def api(monkeypatch):
    """A FakeApi wired into every KnowledgeClient the commands build."""

    fake = FakeApi()
    transport = httpx.MockTransport(fake.handler)
    monkeypatch.setattr(auth, "KnowledgeClient", functools.partial(KnowledgeClient, transport=transport))
    return fake


def _run_pw(argv, password):
    """Drive the real CLI end to end, feeding the password the only safe way in."""

    sys.stdin = io.StringIO(f"{password}\n")
    return main.main(["--base-url", "http://api.test", *argv, "--password-stdin"])


def cfg(home):
    return json.loads((home / ".config" / "knowledge-kb" / "config.json").read_text())


# --- the password never reaches argv ------------------------------------------


def test_there_is_no_password_flag():
    """argv is world-readable via `ps` and lands in shell history. No flag, ever."""

    for cmd in ("signup", "login", "init"):
        with pytest.raises(SystemExit):
            main.build_parser().parse_args([cmd, "--email", "a@b.c", "--password", PW])


def test_password_stdin_beats_the_env_var(home, monkeypatch):
    """Env is visible in /proc/<pid>/environ, so the piped one must win."""

    monkeypatch.setenv(auth.ENV_PASSWORD, "from-the-env")
    monkeypatch.setattr("sys.stdin", io.StringIO("from-stdin-x\n"))
    args = main.build_parser().parse_args(["login", "--email", "a@b.c", "--password-stdin"])
    assert auth.read_password(args) == "from-stdin-x"


def test_no_password_and_no_tty_fails_instead_of_hanging(home):
    """An unattended agent must never block on a prompt no one can answer."""

    args = main.build_parser().parse_args(["login", "--email", "a@b.c"])
    with pytest.raises(auth.CliError, match="no password available"):
        auth.read_password(args)


# --- init: the show-once key and the two footguns ------------------------------


def test_init_writes_a_remote_only_0600_config_that_resolves(home, api):
    assert _run_pw(("init", "--email", "ada@example.com"), PW) == 0
    data = cfg(home)
    assert data["api"] == {"base_url": "http://api.test", "token": VK}
    assert "kb_root" not in data  # remote-only: the no-local-fallback safety property
    assert data["auth"]["session_token"] == "sess1"
    assert stat.S_IMODE((home / ".config" / "knowledge-kb" / "config.json").stat().st_mode) == 0o600
    resolved = config.resolve()
    assert (resolved.status, resolved.api_token, resolved.local_fallback) == ("configured", VK, False)


def test_init_never_prints_the_key(home, api, capsys):
    """Show-once: the plaintext exists nowhere but the config file."""

    _run_pw(("init", "--email", "ada@example.com"), PW)
    out = capsys.readouterr()
    assert VK not in out.out + out.err
    assert config.redact_token(VK) in out.out


def test_init_falls_back_to_login_when_the_email_already_exists(home, api, capsys):
    api.users["ada@example.com"] = PW  # signup will 409 (auth_api.py:118)
    assert _run_pw(("init", "--email", "ada@example.com"), PW) == 0
    assert ("POST", "/auth/login") in api.calls
    assert "logged in" in capsys.readouterr().out
    assert cfg(home)["auth"]["session_token"] == "sess2"


def test_init_is_idempotent(home, api):
    """POST /app/projects has no uniqueness check, so a re-run must not duplicate."""

    _run_pw(("init", "--email", "ada@example.com"), PW)
    _run_pw(("init", "--email", "ada@example.com"), PW)
    assert len(api.projects) == 1  # reused by name, not created twice
    assert api.minted == 1  # the existing api.token was kept, not re-minted
    assert api.calls.count(("POST", "/app/projects")) == 1


def test_init_new_key_mints_again(home, api):
    _run_pw(("init", "--email", "ada@example.com"), PW)
    _run_pw(("init", "--email", "ada@example.com", "--new-key"), PW)
    assert api.minted == 2
    assert len(api.projects) == 1


# --- logout must not take the vk_ down with it ---------------------------------


def test_logout_nulls_the_session_and_preserves_the_api_token(home, api):
    _run_pw(("init", "--email", "ada@example.com"), PW)
    assert main.main(["--base-url", "http://api.test", "logout"]) == 0
    data = cfg(home)
    assert data["auth"]["session_token"] is None  # deep-merge has no delete; null == absent
    assert data["api"]["token"] == VK  # the non-expiring key /knowledge:explain reads
    assert config.resolve().api_token == VK


# --- the errors a user actually meets ------------------------------------------


def test_login_401_stays_generic(home, api, capsys):
    """Never distinguish a bad email from a bad password — that is enumeration-safety."""

    api.users["ada@example.com"] = PW
    assert _run_pw(("login", "--email", "ada@example.com"), "wrong-password") == 1
    err = capsys.readouterr().err
    assert "invalid email or password" in err
    assert "email" not in err.replace("invalid email or password", "")


def test_unrouted_control_plane_is_explained_not_a_bare_404(home, monkeypatch, capsys):
    """The pre-S5 symptom: /auth/* 404s into a static site with an HTML body."""

    transport = httpx.MockTransport(lambda request: httpx.Response(404, text="<html>mkdocs</html>"))
    monkeypatch.setattr(auth, "KnowledgeClient", functools.partial(KnowledgeClient, transport=transport))
    assert _run_pw(("init", "--email", "ada@example.com"), PW) == 1
    err = capsys.readouterr().err
    assert "not serving the auth API" in err
    assert "<html>" not in err  # the page never sprays through the error


def test_whoami_without_a_session_says_so(home):
    assert main.main(["--base-url", "http://api.test", "whoami"]) == 1

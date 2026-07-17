"""Pins the config-seam contract documented at plugin/skills/explain/SKILL.md:31-78.

`config.py` is a *second* implementation of a contract whose first implementation
is an inline heredoc inside a SKILL.md the CLI must never edit. They cannot be
merged (the skill must work with the CLI uninstalled) and so they can drift.
These tests are the thing that catches the drift: each one restates a rule the
skill's resolver already obeys. If a rule changes, change both sides.

Every test runs under an isolated HOME + XDG_CONFIG_HOME: the operator's real
~/.config/knowledge-kb/config.json is never read or written.
"""

import json
import os
import stat

import pytest

from knowledge_cli import config


@pytest.fixture
def home(tmp_path, monkeypatch):
    """An isolated HOME/XDG_CONFIG_HOME with no KB_* env vars set."""

    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / ".config"))
    for key in (config.ENV_KB_ROOT, config.ENV_API_BASE_URL, config.ENV_API_TOKEN):
        monkeypatch.delenv(key, raising=False)
    return tmp_path


def write_cfg(home, payload):
    path = home / ".config" / "knowledge-kb" / "config.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload if isinstance(payload, str) else json.dumps(payload))
    return path


def make_legacy(home):
    """The pre-/knowledge:setup convention: ~/projects/personal/knowledge/mkdocs.yml."""

    root = home / "projects" / "personal" / "knowledge"
    root.mkdir(parents=True)
    (root / "mkdocs.yml").write_text("site_name: kb\n")
    return root


def test_unconfigured_when_no_file_no_legacy_no_env(home):
    assert config.resolve().status == "unconfigured"


def test_legacy_checkout_used_only_when_no_config_file(home):
    legacy = make_legacy(home)
    resolved = config.resolve()
    assert resolved.status == "configured"
    assert resolved.kb_root == str(legacy)
    assert resolved.api_base_url == "http://localhost:8766"
    assert resolved.site_base_url == "http://localhost:8765"
    assert resolved.api_token == ""
    assert resolved.local_fallback is True


def test_config_file_is_authoritative_and_never_falls_through_to_legacy(home):
    """A remote-only config omits kb_root — and must NOT inherit the legacy one.

    This is what stops a remote KB from silently degrading into a stray local
    write: no kb_root -> no local_fallback -> the skill's STOP rule holds.
    """

    make_legacy(home)  # exists, and must be ignored entirely
    write_cfg(home, {"api": {"base_url": "https://knowledge.hi2vi.com", "token": None}})
    resolved = config.resolve()
    assert resolved.kb_root == ""
    assert resolved.api_base_url == "https://knowledge.hi2vi.com"
    assert resolved.api_token == ""  # JSON null -> "", never None
    assert resolved.site_base_url == "http://localhost:8765"  # default, not legacy
    assert resolved.local_fallback is False


def test_env_overrides_are_per_key_and_site_base_url_has_none(home, monkeypatch):
    write_cfg(
        home,
        {
            "kb_root": "/from/cfg",
            "api": {"base_url": "http://cfg:1", "token": "cfg-token"},
            "site": {"base_url": "http://cfg-site:2"},
        },
    )
    monkeypatch.setenv(config.ENV_API_TOKEN, "vk_from_env")
    monkeypatch.setenv("KB_SITE_BASE_URL", "http://env-site:3")  # not a real override
    resolved = config.resolve()
    assert resolved.api_token == "vk_from_env"  # overridden
    assert resolved.api_base_url == "http://cfg:1"  # its neighbour is untouched
    assert resolved.kb_root == "/from/cfg"
    assert resolved.site_base_url == "http://cfg-site:2"  # SKILL.md:69: no env override


def test_empty_env_var_is_treated_as_unset(home, monkeypatch):
    write_cfg(home, {"api": {"base_url": "http://cfg:1", "token": "cfg-token"}})
    monkeypatch.setenv(config.ENV_API_TOKEN, "")
    assert config.resolve().api_token == "cfg-token"


def test_unparseable_config_is_an_error_and_never_falls_back(home):
    make_legacy(home)  # a fallback exists — and must not be used
    path = write_cfg(home, "{not json")
    resolved = config.resolve()
    assert resolved.status == "error"
    assert str(path) in resolved.error


def test_save_preserves_unknown_keys_deep_merges_and_is_0600(home):
    path = write_cfg(
        home,
        {
            "kb_root": "/kb",
            "api": {"base_url": "http://localhost:8766", "token": None},
            "site": {"base_url": "http://localhost:8765"},
            "unknown": {"kept": True},
        },
    )
    path.chmod(0o644)  # a pre-existing world-readable config gets locked down
    config.save({"api": {"token": "vk_secret"}})
    data = json.loads(path.read_text())
    assert data["unknown"] == {"kept": True}  # a key the CLI does not own
    assert data["api"] == {"base_url": "http://localhost:8766", "token": "vk_secret"}
    assert data["kb_root"] == "/kb"
    assert stat.S_IMODE(path.stat().st_mode) == 0o600


def test_save_creates_a_0600_file_when_absent(home):
    config.save({"api": {"base_url": "https://knowledge.hi2vi.com", "token": "vk_new"}})
    resolved = config.resolve()
    assert stat.S_IMODE(os.stat(resolved.path).st_mode) == 0o600
    assert resolved.api_token == "vk_new"  # round-trips through the resolver
    assert resolved.api_base_url == "https://knowledge.hi2vi.com"


def test_save_refuses_to_clobber_an_unreadable_config(home):
    write_cfg(home, "{not json")
    with pytest.raises(config.ConfigError):
        config.save({"api": {"token": "vk_x"}})


def test_redact_token_reveals_only_prefix_and_last4():
    assert config.redact_token("vk_" + "a" * 40 + "9f2c") == "vk_…9f2c"
    assert config.redact_token("sess" + "b" * 39) == "…bbbb"
    assert config.redact_token("short") == "…"
    assert config.redact_token("") == ""

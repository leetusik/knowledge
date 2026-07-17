"""The `knowledge-kb` config seam — the first *code* implementation of it.

`$XDG_CONFIG_HOME/knowledge-kb/config.json` (default
`~/.config/knowledge-kb/config.json`) is the file the `/knowledge:explain` plugin
skill reads to find a knowledge base. Until this module, that seam existed
**only as prose**: an inline `python3 -c` heredoc in
`plugin/skills/explain/SKILL.md:31-78` (the resolver) and hand-written JSON in
`plugin/skills/setup/SKILL.md:185-224` (the writer).

`resolve()` is a faithful port of that heredoc — same precedence, same defaults,
same statuses, same vocabulary.

**Two implementations of one contract.** The skill must keep working with this
CLI uninstalled (it is the self-host, open-core path), and the CLI must work
without the plugin — so these cannot be merged, and they can drift. The only
thing holding them in agreement is `tests/test_config.py`, which pins the
documented behavior. **Change neither side without the other.**

The schema is **nested** and must match the skill exactly — a flat shape will not
be read (`setup/SKILL.md:189-201`)::

    {
      "kb_root": "<absolute path>",          # may be absent: a remote-only config
      "api": {"base_url": "...", "token": null},
      "site": {"base_url": "..."}
    }

`save()` has no counterpart in the skill: `/knowledge:setup` writes this file by
hand and "never writes a bearer token" (`setup/SKILL.md:203`), leaving
`api.token` as JSON `null`. Writing a real `vk_` key there is what lights up the
hosted SaaS for `/knowledge:explain` with zero code change — so `save()` is also
the first place `chmod 600` is *enforced* rather than merely instructed
(`setup/SKILL.md:223` is prose nothing checks).
"""

from __future__ import annotations

import contextlib
import json
import os
import tempfile
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

# Defaults, straight from the resolver (explain/SKILL.md:67,69).
DEFAULT_API_BASE_URL = "http://localhost:8766"
DEFAULT_SITE_BASE_URL = "http://localhost:8765"

# The pre-/knowledge:setup convention (explain/SKILL.md:50-51,105-108): keeps
# machines that predate the config file working.
LEGACY_ROOT_PARTS = ("projects", "personal", "knowledge")

# Env overrides. Each overrides ONLY its own key. There is deliberately no
# KB_SITE_BASE_URL: site.base_url has no env override (explain/SKILL.md:69).
ENV_KB_ROOT = "KB_ROOT"
ENV_API_BASE_URL = "KB_API_BASE_URL"
ENV_API_TOKEN = "KB_API_TOKEN"


class ConfigError(Exception):
    """The config file exists but cannot be read as a JSON object.

    Raised by `load_raw()`/`save()` so a write never clobbers a file we failed to
    understand. `resolve()` reports the same condition as `status="error"`
    instead, mirroring the skill's `KB_STATUS=error` STOP branch.
    """


@dataclass(frozen=True)
class ResolvedConfig:
    """What the resolver answers — the six values the skill prints.

    `status` is `configured` | `unconfigured` | `error`, matching `KB_STATUS`.
    `api_token` is `""` (never `None`) when absent, matching `KB_API_TOKEN`.
    """

    status: str
    path: str
    kb_root: str = ""
    api_base_url: str = ""
    api_token: str = ""
    site_base_url: str = ""
    local_fallback: bool = False
    error: str = ""


def config_path() -> str:
    """`$XDG_CONFIG_HOME/knowledge-kb/config.json`, else `~/.config/...`.

    An empty `XDG_CONFIG_HOME` falls back to `~/.config` (the skill's `or`).
    """

    home = os.path.expanduser("~")
    xdg = os.environ.get("XDG_CONFIG_HOME") or os.path.join(home, ".config")
    return os.path.join(xdg, "knowledge-kb", "config.json")


def _env(key: str) -> str | None:
    """An env var's value, treating the empty string as unset (SKILL.md:34-36)."""

    value = os.environ.get(key)
    return value if value else None


def _section(cfg: Mapping[str, Any], key: str) -> Mapping[str, Any]:
    """`cfg["api"]`/`cfg["site"]` as a mapping — `{}` when absent or malformed.

    Mirrors the skill's `cfg.get("api") or {}`, but also tolerates a non-object
    value there (the skill would raise AttributeError; a traceback is not a
    contract worth porting).
    """

    value = cfg.get(key)
    return value if isinstance(value, Mapping) else {}


def _parse(path: str) -> Mapping[str, Any] | None:
    """Parse the config file. `None` = "no usable config here" (not an error).

    Raises `ConfigError` when the file exists but is not readable as a JSON
    object. JSON `null` parses to `None`, which the skill treats exactly like a
    missing file (its `cfg is None` branch) — reproduced here.
    """

    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as handle:
            parsed = json.load(handle)
    except Exception as exc:  # unreadable OR unparseable -> the skill's error branch
        raise ConfigError(f"cannot parse {path}: {exc}") from exc
    if parsed is None:
        return None
    if not isinstance(parsed, dict):
        raise ConfigError(f"cannot parse {path}: not a JSON object")
    return parsed


def resolve() -> ResolvedConfig:
    """Resolve the knowledge base — a faithful port of explain/SKILL.md:31-78.

    Per-key precedence, highest first: env override -> config file -> legacy
    convention -> default. The config file is **authoritative when present**: it
    never falls through to the legacy convention for keys it omits, which is what
    stops a remote-only config from silently acquiring a local `kb_root` (and so
    from ever degrading into a stray local write).
    """

    home = os.path.expanduser("~")
    path = config_path()
    env_root = _env(ENV_KB_ROOT)
    env_api = _env(ENV_API_BASE_URL)
    env_token = _env(ENV_API_TOKEN)

    try:
        cfg = _parse(path)
    except ConfigError as exc:
        # STOP: the file exists but is unreadable. Never fall back to another
        # source (SKILL.md:46-49,85-86) — a typo must not silently repoint a
        # knowledge base somewhere else.
        return ResolvedConfig(status="error", path=path, error=str(exc))

    legacy_root = os.path.join(home, *LEGACY_ROOT_PARTS)
    legacy = os.path.isfile(os.path.join(legacy_root, "mkdocs.yml"))

    if cfg is None and not legacy and not (env_root or env_api or env_token):
        return ResolvedConfig(status="unconfigured", path=path)

    if cfg is not None:
        base_root = cfg.get("kb_root")
        base_api = _section(cfg, "api").get("base_url")
        base_token = _section(cfg, "api").get("token")
        base_site = _section(cfg, "site").get("base_url")
    elif legacy:
        base_root = legacy_root
        base_api = DEFAULT_API_BASE_URL
        base_token = None
        base_site = DEFAULT_SITE_BASE_URL
    else:
        # No file, no legacy checkout — but at least one KB_* env var is set.
        base_root = base_api = base_token = base_site = None

    kb_root = env_root or base_root or ""
    api_base = env_api or base_api or DEFAULT_API_BASE_URL
    token = env_token or base_token or ""
    site_base = base_site or DEFAULT_SITE_BASE_URL  # no env override, deliberately
    kb_root = os.path.expanduser(kb_root) if kb_root else ""

    # The one value that decides whether a local file write is ever permitted.
    local_fallback = bool(kb_root) and os.path.isfile(os.path.join(kb_root, "mkdocs.yml"))

    return ResolvedConfig(
        status="configured",
        path=path,
        kb_root=kb_root,
        api_base_url=api_base,
        api_token=token,
        site_base_url=site_base,
        local_fallback=local_fallback,
    )


def load_raw(path: str | None = None) -> dict[str, Any]:
    """The config file's literal contents, `{}` when absent.

    Unresolved: no env overrides, no defaults, no legacy. This is what `save()`
    merges into, so the user's own keys survive. Raises `ConfigError` if the file
    exists but is not a JSON object.
    """

    target = path or config_path()
    parsed = _parse(target)
    return dict(parsed) if parsed is not None else {}


def _deep_merge(base: Mapping[str, Any], updates: Mapping[str, Any]) -> dict[str, Any]:
    """Recursive merge — `{"api": {"token": x}}` must not drop `api.base_url`."""

    merged = dict(base)
    for key, value in updates.items():
        current = merged.get(key)
        if isinstance(value, Mapping) and isinstance(current, Mapping):
            merged[key] = _deep_merge(current, value)
        else:
            merged[key] = value
    return merged


def _write_atomic(path: str, payload: Mapping[str, Any]) -> None:
    """Write `payload` as JSON to `path`, atomically, mode 0600.

    The mode is set on the temp file **before** `os.replace`, never chmod'd
    afterwards: this file holds a `vk_` key, and a chmod-after leaves a window in
    which it is world-readable. `os.replace` is atomic within a directory and
    carries the temp file's mode across, so the config is never observable in a
    half-written or over-permissive state.
    """

    directory = os.path.dirname(path)
    os.makedirs(directory, mode=0o700, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=directory, prefix=".config.json.", suffix=".tmp")
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
            handle.write("\n")
        os.replace(tmp, path)
    except BaseException:
        with contextlib.suppress(OSError):
            os.close(fd)  # already closed if fdopen took ownership; harmless
        with contextlib.suppress(OSError):
            os.unlink(tmp)
        raise


def save(updates: Mapping[str, Any], path: str | None = None) -> str:
    """Merge `updates` into the config file and write it back. Returns the path.

    Read-modify-write, deep-merged: keys this CLI does not own are preserved. A
    user may have a `/knowledge:setup`-written config (or hand-added fields), and
    clobbering them would break the very skill this seam exists to serve.

    `updates` uses the nested schema — a flat shape will not be read::

        save({"api": {"base_url": "https://knowledge.hi2vi.com", "token": "vk_..."}})

    Raises `ConfigError` rather than overwrite a config file that exists but
    cannot be parsed: refusing to destroy an unreadable file the user may want to
    repair is the safer failure.
    """

    target = path or config_path()
    merged = _deep_merge(load_raw(target), updates)
    _write_atomic(target, merged)
    return target


def redact_token(token: str) -> str:
    """A token safe to print: `vk_…9f2c`. Never returns enough to authenticate.

    Real tokens are `secrets.token_urlsafe(32)` (43 chars), so the last 4 are
    enough to tell two keys apart. Anything short enough for the tail to matter
    is redacted whole.
    """

    if not token:
        return ""
    if len(token) < 8:
        return "…"
    prefix = "vk_" if token.startswith("vk_") else ""
    return f"{prefix}…{token[-4:]}"

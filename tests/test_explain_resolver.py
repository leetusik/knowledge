"""The explain skill's §2 resolver never prints the KB key (P38-e1.S1) — a core test.

The resolver block is lifted verbatim from ``plugin/skills/explain/SKILL.md`` and run
with ``HOME`` and the XDG folders in a tmp dir, so it reads only a fake config:

* with a token, stdout never carries it, and ``KB_AUTH_HEADER`` names a ``0600``
  file holding the bearer line;
* with no token, ``KB_AUTH_HEADER=`` is empty and a stale header file is removed.

No network, no server.
"""
from __future__ import annotations

import json
import os
import stat
import subprocess
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1] / "plugin" / "skills" / "explain" / "SKILL.md"
TOKEN = "vk_test_not_a_secret"


def _resolver_source() -> str:
    """The indented ``python3 -c '…'`` block under §2, dedented to plain Python."""

    lines = SKILL.read_text().splitlines()
    start = next(i for i, l in enumerate(lines) if l == "    python3 -c '")
    end = next(i for i in range(start + 1, len(lines)) if lines[i] == "    '")
    return "\n".join(l[4:] for l in lines[start + 1 : end]) + "\n"


def _run(tmp_path: Path, token: str | None) -> dict[str, str]:
    home = tmp_path / "home"
    cfg_dir = tmp_path / "config" / "knowledge-kb"
    cfg_dir.mkdir(parents=True)
    api = {"base_url": "http://localhost:8766"}
    if token:
        api["token"] = token
    (cfg_dir / "config.json").write_text(json.dumps({"api": api}))
    env = {
        k: v for k, v in os.environ.items()
        if k not in ("KB_ROOT", "KB_API_BASE_URL", "KB_API_TOKEN")
    }
    env.update(
        HOME=str(home),
        XDG_CONFIG_HOME=str(tmp_path / "config"),
        XDG_STATE_HOME=str(tmp_path / "state"),
    )
    out = subprocess.run(
        [sys.executable, "-c", _resolver_source()],
        env=env, capture_output=True, text=True, check=True,
    )
    assert TOKEN not in out.stdout and TOKEN not in out.stderr
    return dict(line.split("=", 1) for line in out.stdout.splitlines())


def test_token_goes_to_a_0600_header_file_never_stdout(tmp_path):
    vals = _run(tmp_path, TOKEN)
    assert vals["KB_STATUS"] == "configured"
    assert vals["KB_API_TOKEN_SET"] == "yes"
    assert "KB_API_TOKEN" not in vals and "KB_AUTH_ERROR" not in vals
    header = Path(vals["KB_AUTH_HEADER"])
    assert header == Path(vals["KB_EXPLAIN_STATE"]) / "auth.header"
    assert stat.S_IMODE(header.stat().st_mode) == 0o600
    assert header.read_text() == f"Authorization: Bearer {TOKEN}\n"


def test_no_token_leaves_no_header_file(tmp_path):
    stale = tmp_path / "state" / "knowledge-kb" / "explain" / "auth.header"
    stale.parent.mkdir(parents=True)
    stale.write_text("Authorization: Bearer old\n")
    vals = _run(tmp_path, None)
    assert vals["KB_API_TOKEN_SET"] == "no"
    assert vals["KB_AUTH_HEADER"] == ""
    assert not stale.exists()

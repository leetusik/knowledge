"""Anti-rot guard for `knowledge guide`.

The guide is the one thing a coding agent reads to drive this CLI unattended, and
its risk is silent decay: a future edit to `save`/`init`/the config seam that
quietly drops a constraint the agent depends on. So this asserts the guide still
*names* each load-bearing fact — not its prose, just that the fact is present — plus
that the command runs clean and leaks no secret. One test is enough; it is a
tripwire, not a coverage exercise.
"""

import re

from knowledge_cli import guide, main


def test_guide_covers_the_load_bearing_constraints(capsys):
    assert main.main(["guide"]) == 0
    out = capsys.readouterr().out

    # Exit clean, non-trivial markdown with headings.
    assert out.strip()
    assert out.count("#") >= 5

    # Each constraint an agent cannot guess and must never silently lose.
    assert "2-5 tags" in out or "2-5 tag" in out          # documents.py:61-62
    assert "shown once" in out                            # show-once vk_
    assert "never print" in out.lower()                   # …and the CLI never prints it
    assert "auth.session_token" in out and "api.token" in out  # the two-token split
    assert "--json" in out and "exit code" in out.lower()      # the agent protocol
    assert guide.INSTALL_COMMAND in out                   # the git install form (D-P13-1)

    # Nothing that looks like a real minted secret ever ships in the bundled string.
    assert not re.search(r"vk_[A-Za-z0-9_-]{20,}", out)

"""The TeX allowlist (P39-hk R1 §4), core: ``server/native/tex.py``'s constant is
the shared fixture ``tests/fixtures/native/tex-allowlist.tsv`` row for row (the TS
twin asserts the same in ``web/tests/native-tex.test.ts``), and every row's sample
passes the validator in its own context. That Temml renders every sample is the
web suite's to prove; the refusal codes are the conformance fixtures'
(``err-math``, ``err-formula``).
"""
from __future__ import annotations

from pathlib import Path

from server.native.tex import ALLOWLIST, validate

TSV = Path(__file__).parent / "fixtures" / "native" / "tex-allowlist.tsv"


def _rows() -> list[tuple[str, ...]]:
    lines = TSV.read_text(encoding="utf-8").split("\n")
    assert lines[0] == "command\tcontext\tarity\tsample"
    assert lines[-1] == "", "the file ends with one newline"
    rows = [tuple(line.split("\t")) for line in lines[1:-1]]
    assert all(len(row) == 4 for row in rows)
    return rows


def test_allowlist_equals_the_shared_fixture():
    assert [row[:3] for row in _rows()] == [tuple(row) for row in ALLOWLIST]


def test_every_sample_passes_in_its_context():
    for command, context, _arity, sample in _rows():
        assert validate(sample, display=context == "display") is None, (command, sample)

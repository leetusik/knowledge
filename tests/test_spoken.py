"""P41-sr.S1: the spoken script Listen reads. One fixture with one of each block
shows the reading order, the read rules (alt texts, captions, table rows, a
formula's legend, inline math's linear text) and the skips (code, quiz, sources,
glossary)."""
from __future__ import annotations

from pathlib import Path

from server.native import parse_chapter
from server.spoken import spoken_script

FIXTURE = Path(__file__).parent / "fixtures" / "spoken" / "chapter.md"


def test_spoken_script():
    result = parse_chapter(FIXTURE.read_text(encoding="utf-8"))
    assert result.assigned_ids == []
    script = spoken_script(result.tree, lang="en", title="Means")
    assert {s["lang"] for s in script} == {"en"}
    got = [(s["section"], s["block"], s["kind"], s["text"]) for s in script]
    assert got == [
        (None, None, "title", "Means"),
        (None, None, "summary", "How a sample's mean is read aloud."),
        (None, None, "text", "Before any section."),
        ("mean", "mean", "heading", "The mean"),
        ("mean", None, "text", "The error shrinks as s / √n, see a falling curve here."),
        ("mean", None, "list-item", "First item."),
        ("mean", None, "list-item", "Second item with a second paragraph."),
        ("mean", None, "list-item", "A nested item."),
        ("mean", None, "callout", "Keep in mind"),
        ("mean", None, "callout", "A callout body."),
        ("mean", None, "table-row", "Quantity: mean; Formula: x̄"),
        ("mean", None, "table-row", "Quantity: spread"),
        # the code block and the quiz say nothing
        ("fig", "fig", "figure", "A bar chart of means"),
        ("fig", "fig", "figure", "Means by group."),
        ("row", "row", "figure", "The first view"),
        ("row", "row", "figure", "A card"),
        ("row", "row", "figure", "The card body."),
        ("row", "row", "figure", "Layers"),
        ("row", "row", "figure", "The stack."),
        ("row", "row", "figure", "Two views."),
        ("flow", "flow", "diagram", "The stack diagram"),
        ("flow", "flow", "diagram", "Read the title, not the layers."),
        ("art", "art", "svg", "An arrow"),
        ("tstat", "tstat", "formula", "t equals x bar minus mu, over s over root n."),
        ("tstat", "tstat", "formula", "How many standard errors the mean sits away."),
        ("tstat", "tstat", "formula", "x̄: the sample mean"),
        ("tstat", "tstat", "formula", "n: the sample size"),
        # the sources and the glossary say nothing
        ("sources-list", "sources-list", "heading", "Sources"),
    ]

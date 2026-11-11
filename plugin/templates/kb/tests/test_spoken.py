"""P41-sr.S1: the spoken script Listen reads. One fixture with one of each block
shows the reading order, the read rules (alt texts, captions, table rows, a
formula's legend, inline math's linear text) and the skips (code, quiz, sources,
glossary). P41-sr.F1: the ``sources-list`` section is skipped whole, and a heading
whose section says nothing is dropped."""
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
        # the typed sources block, the code and the quiz say nothing, nor do the
        # headings over only them ("In code", "Check yourself")
        ("origins", "origins", "heading", "Sources"),
        ("where", "where", "heading", "Where the numbers come from"),
        ("where", None, "text", "Two sources feed every mean here: a survey and a census."),
        # the source list says nothing, and "Terms" holds only the glossary
        ("after", "after", "heading", "After the sources"),
        ("after", None, "text", "Read again after the source list."),
    ]


def _texts(source: str) -> list[str]:
    return [s["text"] for s in spoken_script(parse_chapter(source).tree, lang="en")]


def test_the_source_list_is_skipped_whole():
    """F1 cases b-e and g: the ``sources-list`` section goes, heading, paragraphs,
    lists and subheadings, up to the next heading of its level; its id decides, so
    an assigned id and a translated heading go too, while a ``## Sources`` with
    another id and the word in prose are read."""
    source = FIXTURE.read_text(encoding="utf-8")
    texts = _texts(source)
    assert texts.count("Sources") == 1  # the guard's heading, {#origins}
    assert "Two sources feed every mean here: a survey and a census." in texts
    for gone in ("The code, at commit 88d2e95:", "server/spoken.py: the read and skip table",
                 "What the work recorded:", "Listen (P41): the spoken script",
                 "Outside works", "A source title: read by the research"):
        assert gone not in texts
    assert texts[-2:] == ["After the sources", "Read again after the source list."]

    assigned = source.replace("## Sources {#sources-list}", "## Sources")
    assert [a["id"] for a in parse_chapter(assigned).assigned_ids] == ["sources-list"]
    translated = source.replace("## Sources {#sources-list}", "## 출처 {#sources-list}")
    assert _texts(assigned) == _texts(translated) == texts


def test_a_heading_that_says_nothing_is_dropped():
    """F1 case f: a heading over only code, a quiz or a glossary is not said; one
    over a subheading that says something is, and one over a silent subheading is
    not."""
    source = FIXTURE.read_text(encoding="utf-8")
    texts = _texts(source)
    for gone in ("In code", "Check yourself", "Terms"):
        assert gone not in texts
    assert texts.index("Sources") + 1 == texts.index("Where the numbers come from")

    silent = source.replace("Two sources feed every mean here: a survey and a census.\n", "")
    assert "Sources" not in _texts(silent) and "Where the numbers come from" not in _texts(silent)

"""Conventions library: byte-exact frontmatter, round-trip, slug/validators, marker ladder."""
import pytest

from server import documents as d


def test_serialize_frontmatter_byte_exact():
    block = d.serialize_frontmatter(
        title='Ports: the "front door" — explained',
        date="2026-07-02",
        tags=["docker", "nginx"],
        project="hi2vi_web",
        source_repo="/Users/sugang/projects/personal/hi2vi_web",
    )
    expected = (
        "---\n"
        'title: "Ports: the \\"front door\\" — explained"\n'
        "date: 2026-07-02\n"
        "tags:\n"
        "  - docker\n"
        "  - nginx\n"
        "source:\n"
        "  project: hi2vi_web\n"
        "  repo: /Users/sugang/projects/personal/hi2vi_web\n"
        "---\n"
    )
    assert block == expected


def test_frontmatter_round_trip():
    title = 'Colons: and "quotes" — ok'
    block = d.serialize_frontmatter(
        title=title, date="2026-07-02", tags=["a", "b"],
        project="proj", source_repo="/tmp/proj",
    )
    meta, body = d.parse_frontmatter(block)
    assert meta["title"] == title
    assert str(meta["date"]) == "2026-07-02"
    assert meta["tags"] == ["a", "b"]
    assert meta["source"] == {"project": "proj", "repo": "/tmp/proj"}
    assert body.strip() == ""


def test_slugify():
    assert d.slugify("The Shared nginx Problem — Explained!") == "the-shared-nginx-problem-explained"
    assert d.slugify("   ") == "untitled"
    assert len(d.slugify("x" * 200)) <= 80


def test_validators_accept():
    assert d.validate_project("hi2vi_web") == "hi2vi_web"
    assert d.validate_tags(["docker", "nginx"]) == ["docker", "nginx"]
    assert d.validate_slug("shared-nginx-explained") == "shared-nginx-explained"
    assert d.validate_date("2026-07-02") == "2026-07-02"


@pytest.mark.parametrize("call", [
    lambda: d.validate_project("../etc"),
    lambda: d.validate_project("bad/name"),
    lambda: d.validate_tags(["only-one"]),
    lambda: d.validate_tags(["a", "b", "c", "d", "e", "f"]),
    lambda: d.validate_tags(["Bad Tag", "x"]),
    lambda: d.validate_slug("Bad_Slug"),
    lambda: d.validate_date("2026-13-45"),
    lambda: d.validate_date("20260702"),
])
def test_validators_reject(call):
    with pytest.raises(d.ConventionError):
        call()


def test_serialize_frontmatter_related_roundtrip_and_omission():
    # related non-empty -> emitted between tags and source, round-trips.
    block = d.serialize_frontmatter(
        title="T", date="2026-07-08", tags=["a", "b"],
        project="proj", source_repo="/tmp/proj",
        related=["proj/2026-07-01-other.md", "proj2/2026-07-02-third.md"],
    )
    meta, _ = d.parse_frontmatter(block)
    assert meta["related"] == ["proj/2026-07-01-other.md", "proj2/2026-07-02-third.md"]
    assert block.index("related:") < block.index("source:")
    assert block.index("tags:") < block.index("related:")

    # related None/empty -> byte-identical to today's output (no related: block).
    without = d.serialize_frontmatter(
        title="T", date="2026-07-08", tags=["a", "b"],
        project="proj", source_repo="/tmp/proj",
    )
    empty = d.serialize_frontmatter(
        title="T", date="2026-07-08", tags=["a", "b"],
        project="proj", source_repo="/tmp/proj", related=[],
    )
    assert "related:" not in without
    assert without == empty


def test_validate_related_accept():
    assert d.validate_related([]) == []
    assert d.validate_related(
        ["proj/2026-07-01-a.md", "proj/2026-07-01-a.md", "proj/2026-07-02-b.md"]
    ) == ["proj/2026-07-01-a.md", "proj/2026-07-02-b.md"]  # dedup, order-preserving


@pytest.mark.parametrize("call", [
    lambda: d.validate_related("not-a-list"),
    lambda: d.validate_related(["/abs/path.md"]),
    lambda: d.validate_related(["proj/../evil.md"]),
    lambda: d.validate_related(["onlyfile.md"]),
    lambda: d.validate_related(["proj/no-extension"]),
])
def test_validate_related_reject(call):
    with pytest.raises(d.ConventionError):
        call()


def test_sanitize_source_repo():
    # Absolute paths → basename (publish-safe, no filesystem leakage).
    assert d.sanitize_source_repo("/Users/sugang/projects/personal/changple5") == "changple5"
    assert d.sanitize_source_repo("/home/user/repo-name") == "repo-name"
    # Trailing slash stripped before basename extraction.
    assert d.sanitize_source_repo("/Users/sugang/projects/personal/changple5/") == "changple5"
    # Home-directory expansion → basename.
    assert d.sanitize_source_repo("~/projects/myrepo") == "myrepo"
    # URLs pass through unchanged (forward-compat for P7 plugin).
    assert d.sanitize_source_repo("https://github.com/org/repo") == "https://github.com/org/repo"
    assert d.sanitize_source_repo("git@github.com:org/repo") == "git@github.com:org/repo"
    assert d.sanitize_source_repo("ssh://git.example.com/repo") == "ssh://git.example.com/repo"
    # Plain names (no path, no URL) pass through.
    assert d.sanitize_source_repo("myrepo") == "myrepo"
    # Empty/None → empty string.
    assert d.sanitize_source_repo(None) == ""
    assert d.sanitize_source_repo("") == ""
    assert d.sanitize_source_repo("   ") == ""
    # Known quirk: bare org/repo shorthand → basename only.
    assert d.sanitize_source_repo("org/repo") == "repo"


def test_recent_marker_ladder():
    fields = dict(date="2026-07-02", title="T", rel_path="p/2026-07-02-t.md", project="p")
    expected_bullet = "- 2026-07-02 · [T](p/2026-07-02-t.md) — p"

    out, mech = d.insert_recent_bullet("## Recent\n\n<!-- explain:recent -->\n- old\n", **fields)
    assert mech == "marker"
    assert out.split("<!-- explain:recent -->\n", 1)[1].startswith(expected_bullet)

    out2, mech2 = d.insert_recent_bullet("# Index\n\n## Recent\n\n- old\n", **fields)
    assert mech2 == "heading"
    assert expected_bullet in out2

    out3, mech3 = d.insert_recent_bullet("# Index\n\njust text\n", **fields)
    assert mech3 == "appended"
    assert "<!-- explain:recent -->" in out3 and "## Recent" in out3 and expected_bullet in out3

"""The vocky merge tool (``scripts/merge_vocky.py``) — a core test.

On a small invented fixture (an operator on both sides, one project to move to a new org,
one to rename, a Feedback project with events, a comment and an attachment), the tool:

* changes nothing on ``--dry-run`` and on any refusal (databases and disk compared);
* applies the mapping: tenant #1 renamed in place and still the operator's first org, the
  new org newer, the project rows, reader rows, SQLite rows and folders moved, the renamed
  book's manifest rewritten, every event copied column for column with only
  ``project_id`` remapped (a NULL ``event_at`` stays NULL), the attachment file copied;
* keeps every moved document's id through the next reindex;
* changes nothing on a second ``--apply`` and copies exactly the events added since;
* finishes on a re-run a run interrupted after the Postgres commit;
* on a git checkout, refuses a project whose files are tracked and leaves ``git status``
  clean, the private-projects block naming the renamed project;
* resolves a ``feedback`` target by its post-run name, the same in the dry run and the
  apply, and refuses a pre-run or ambiguous name;
* journals every moved document's id before writing, so a renumbering fails verify;
* lists references to a renamed project's old name and never rewrites a document.

Postgres-gated like every accounts test (``KB_TEST_DATABASE_URL``). Vocky's tables live in
a throwaway schema of the same database, in vocky's own physical column order.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import sqlite3
import subprocess
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from sqlalchemy import create_engine, make_url, text

_SPEC = importlib.util.spec_from_file_location(
    "merge_vocky", Path(__file__).resolve().parents[1] / "scripts" / "merge_vocky.py"
)
merge_vocky = importlib.util.module_from_spec(_SPEC)
sys.modules["merge_vocky"] = merge_vocky  # its dataclasses resolve their module by name
_SPEC.loader.exec_module(merge_vocky)

_RAW_DSN = os.environ.get("KB_TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")
UTC = timezone.utc

VOCKY_DDL = """
CREATE TABLE users (id uuid PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE tenants (id uuid PRIMARY KEY, name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE tenant_members (id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id),
  user_id uuid NOT NULL REFERENCES users(id), role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE projects (id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL, created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE feedback_events (id uuid PRIMARY KEY, message text NOT NULL,
  source_product text NOT NULL, source_integration text, conversation_id text, session_id text,
  event_at timestamptz, ingested_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tags text[] NOT NULL DEFAULT '{}'::text[], source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb, feedback_value integer, comment text,
  channel text, messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  used_context jsonb NOT NULL DEFAULT '[]'::jsonb, target_type text, target_id text,
  target_role text, target_text text, user_id text, trigger_type text, trigger_message text,
  trigger_metadata jsonb NOT NULL DEFAULT '{}'::jsonb, project_id uuid REFERENCES projects(id),
  recorded_by text);
CREATE TABLE feedback_comments (id uuid PRIMARY KEY,
  feedback_id uuid NOT NULL REFERENCES feedback_events(id), author text, body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE feedback_attachments (id uuid PRIMARY KEY,
  feedback_id uuid REFERENCES feedback_events(id), storage_key text NOT NULL,
  content_type text NOT NULL, byte_size integer NOT NULL, filename text, claimed_user_id text,
  claimed_source_product text NOT NULL, created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
"""

ATTACHMENT = b"\x89PNG\r\n\x1a\nfixture"


def _doc(title: str, version: int = 1) -> str:
    v = f"version: {version}\n" if version > 1 else ""
    return f'---\ntitle: "{title}"\ndate: 2026-10-01\n{v}tags:\n  - t\n---\n\n# {title}\n\nbody\n'


@pytest.fixture
def world(tmp_path, monkeypatch):
    """An operator on both sides plus a content root; skips without a test Postgres."""
    if not _RAW_DSN:
        pytest.skip("set KB_TEST_DATABASE_URL to a disposable Postgres to run the merge tests")
    url = make_url(_RAW_DSN).set(drivername="postgresql+psycopg")
    kb_url = url.render_as_string(hide_password=False)
    engine = create_engine(kb_url)
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - environment dependent
        pytest.skip(f"Postgres at the test DSN is unreachable: {exc}")
    from server.persistence import models  # noqa: F401 - registers the tables
    from server.persistence.base import Base

    Base.metadata.create_all(engine, checkfirst=True)
    tag = uuid.uuid4().hex[:10]
    schema = f"vocky_{tag}"
    email = f"op-{tag}@example.test"
    root = tmp_path / "root"
    sqlite_path = root / "data" / "kb.sqlite3"
    att_dir, att_src = tmp_path / "attachments", tmp_path / "vocky-attachments"
    monkeypatch.setenv("KB_ROOT", str(root))
    monkeypatch.setenv("KB_DB_PATH", str(sqlite_path))
    monkeypatch.setenv("DATABASE_URL", kb_url)

    t0 = datetime(2026, 1, 1, tzinfo=UTC)
    ids = {"op": uuid.uuid4(), "t1": uuid.uuid4(), "alpha": uuid.uuid4(), "oldname": uuid.uuid4(),
           "fb": uuid.uuid4(), "v_op": uuid.uuid4(), "v_t": uuid.uuid4(), "v_src": uuid.uuid4(),
           "v_empty": uuid.uuid4(), "ann": uuid.uuid4()}
    with engine.begin() as c:
        c.execute(text("INSERT INTO users (id, email, password_hash, created_at) "
                       "VALUES (:i, :e, 'x', :t)"), {"i": ids["op"], "e": email, "t": t0})
        c.execute(text("INSERT INTO tenants (id, name, created_at) VALUES (:i, 'Old name', :t)"),
                  {"i": ids["t1"], "t": t0})
        c.execute(text("INSERT INTO tenant_members (id, tenant_id, user_id, role, created_at) "
                       "VALUES (:i, :t1, :u, 'owner', :t)"),
                  {"i": uuid.uuid4(), "t1": ids["t1"], "u": ids["op"], "t": t0})
        for key, name in (("alpha", "alpha"), ("oldname", "oldname"), ("fb", "fbtarget")):
            c.execute(text("INSERT INTO projects (id, tenant_id, name) VALUES (:i, :t, :n)"),
                      {"i": ids[key], "t": ids["t1"], "n": name})
        c.execute(text(
            "INSERT INTO reader_positions (user_id, tenant_id, project, doc, unit, lang, version,"
            " format, fraction, max_fraction, state) VALUES (:u, :t, 'alpha', '2026-10-01-a',"
            " 'd:2026-10-01-a', 'en', 1, 'md', 0.5, 0.5, 'started')"),
            {"u": ids["op"], "t": ids["t1"]})
        c.execute(text(
            "INSERT INTO reader_annotations (id, user_id, tenant_id, project, doc, unit, lang,"
            " version, block_id, note, snapshot, anchor_status, anchored_version) VALUES (:i, :u,"
            " :t, 'oldname', '2026-10-01-o', 'd:2026-10-01-o', 'en', 1, 'b', 'n', '{}',"
            " 'anchored', 1)"), {"i": ids["ann"], "u": ids["op"], "t": ids["t1"]})
        c.execute(text(f"CREATE SCHEMA {schema}"))
        c.execute(text(f"SET LOCAL search_path TO {schema}"))
        for statement in VOCKY_DDL.split(";"):
            if statement.strip():
                c.execute(text(statement))
        c.execute(text("INSERT INTO users (id, email, password_hash) VALUES (:i, :e, 'x')"),
                  {"i": ids["v_op"], "e": email.upper()})
        c.execute(text("INSERT INTO tenants (id, name) VALUES (:i, 'ws')"), {"i": ids["v_t"]})
        c.execute(text("INSERT INTO tenant_members (id, tenant_id, user_id, role) VALUES "
                       "(:i, :t, :u, 'owner')"),
                  {"i": uuid.uuid4(), "t": ids["v_t"], "u": ids["v_op"]})
        for key, name in (("v_src", "src"), ("v_empty", "empty")):
            c.execute(text("INSERT INTO projects (id, tenant_id, name) VALUES (:i, :t, :n)"),
                      {"i": ids[key], "t": ids["v_t"], "n": name})
        events = [uuid.uuid4() for _ in range(3)]
        for n, eid in enumerate(events):
            c.execute(text(
                "INSERT INTO feedback_events (id, message, source_product, event_at, tags,"
                " source_metadata, messages, project_id, recorded_by, user_id) VALUES (:i, :m,"
                " 'prod', :at, :tags, CAST(:meta AS jsonb), CAST(:msgs AS jsonb), :p, :rb, 'u1')"),
                {"i": eid, "m": f"msg {n} — 한글", "at": None if n == 0 else t0 + timedelta(
                    microseconds=123457 * n), "tags": ["a", "b c"], "meta": json.dumps(
                    {"n": n, "x": [1.5, None]}), "msgs": json.dumps([{"r": "u"}]),
                 "p": ids["v_src"], "rb": None if n == 2 else "agent"})
        c.execute(text("INSERT INTO feedback_comments (id, feedback_id, body) VALUES "
                       "(:i, :f, 'a comment')"), {"i": uuid.uuid4(), "f": events[1]})
        c.execute(text(
            "INSERT INTO feedback_attachments (id, feedback_id, storage_key, content_type,"
            " byte_size, claimed_source_product) VALUES (:i, :f, :k, 'image/png', :n, 'prod')"),
            {"i": uuid.uuid4(), "f": events[1], "k": f"k/{tag}.png", "n": len(ATTACHMENT)})

    docs = root / "docs"
    (docs / "alpha").mkdir(parents=True)
    (docs / "alpha" / "2026-10-01-a.md").write_text(_doc("A", version=2))
    (docs / ".versions" / "alpha" / "2026-10-01-a").mkdir(parents=True)
    (docs / ".versions" / "alpha" / "2026-10-01-a" / "v0001.md").write_text(_doc("A old"))
    (docs / ".assets" / "alpha" / "2026-10-01-a").mkdir(parents=True)
    (docs / ".assets" / "alpha" / "2026-10-01-a" / "f.png").write_bytes(b"png")
    (docs / "oldname").mkdir()
    (docs / "oldname" / "2026-10-01-o.md").write_text(_doc("O"))
    (docs / ".books" / "oldname").mkdir(parents=True)
    (docs / ".books" / "oldname" / "bk.json").write_text(json.dumps({
        "slug": "bk", "title": "Bk", "kind": "codebase", "chapters": [
            {"key": "c1", "position": 1, "variants": {"en": "oldname/2026-10-01-o.md"}}]}))
    (att_src / "k").mkdir(parents=True)
    (att_src / "k" / f"{tag}.png").write_bytes(ATTACHMENT)
    _reindex(ids["t1"])

    mapping = tmp_path / "map.json"
    mapping.write_text(json.dumps({
        "operator_email": email, "tenant_one": {"name": "Home", "id": str(ids["t1"])},
        "new_org": {"name": f"Org {tag}", "projects": ["alpha"]},
        "renames": {"oldname": "newname"}, "feedback": {"src": "fbtarget"}}))
    vocky_dsn = make_url(_RAW_DSN).set(
        drivername="postgresql", query={"options": f"-csearch_path={schema}"}
    ).render_as_string(hide_password=False)
    args = ["--mapping", str(mapping), "--vocky-dsn", vocky_dsn, "--kb-root", str(root),
            "--sqlite", str(sqlite_path), "--attachments-dir", str(att_dir),
            "--attachments-source", str(att_src)]
    w = {"engine": engine, "schema": schema, "ids": ids, "events": events, "root": root,
         "sqlite": sqlite_path, "att_dir": att_dir, "args": args, "mapping": mapping,
         "tag": tag, "tmp": tmp_path}
    yield w
    with engine.begin() as c:
        c.execute(text(f"DROP SCHEMA {schema} CASCADE"))
    engine.dispose()


def _reindex(t1) -> dict:
    from server import reindex

    return reindex.reindex(tenant_one_id=str(t1))


def _state(w) -> str:
    """A fingerprint of every table both sides hold, every file and the SQLite rows."""
    h = hashlib.sha256()
    with w["engine"].connect() as c:
        for schema in ("public", w["schema"]):
            tables = c.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = :s "
                                    "ORDER BY 1"), {"s": schema}).scalars().all()
            for t in tables:
                rows = c.execute(text(f'SELECT md5(x::text) FROM {schema}."{t}" x ORDER BY 1'))
                h.update(f"{schema}.{t}:{','.join(r[0] for r in rows)}".encode())
    for base in (w["root"], w["att_dir"]):
        for p in sorted(base.rglob("*")) if base.exists() else []:
            if p.is_file() and not p.name.startswith("kb.sqlite3"):
                h.update(f"{p.relative_to(w['tmp'])}:{p.read_bytes().hex()}".encode())
    conn = sqlite3.connect(w["sqlite"])
    for t in merge_vocky.SQLITE_TABLES:
        h.update(repr(conn.execute(f"SELECT * FROM {t} ORDER BY 1, 2, 3").fetchall()).encode())
    conn.close()
    return h.hexdigest()


def _run(w, *extra) -> int:
    return merge_vocky.main([*extra, *w["args"]])


def _doc_ids(w) -> dict[str, tuple[int, str]]:
    conn = sqlite3.connect(w["sqlite"])
    rows = conn.execute("SELECT rel_path, id, tenant_id FROM documents").fetchall()
    conn.close()
    return {r: (i, t) for r, i, t in rows}


def test_merge_applies_once_and_copies_only_the_delta(world):
    w, ids = world, world["ids"]
    before = _state(w)
    assert _run(w, "--dry-run") == 0
    assert _state(w) == before  # a dry run never writes
    old_ids = _doc_ids(w)

    assert _run(w, "--apply") == 0
    with w["engine"].connect() as c:
        t1 = c.execute(text("SELECT name, created_at FROM tenants WHERE id = :i"),
                       {"i": ids["t1"]}).one()
        org = c.execute(text("SELECT id, created_at FROM tenants WHERE name = :n"),
                        {"n": f"Org {w['tag']}"}).one()
        first = c.execute(text(
            "SELECT tenant_id FROM tenant_members WHERE user_id = :u "
            "ORDER BY created_at LIMIT 1"), {"u": ids["op"]}).scalar_one()
        moved = c.execute(text("SELECT tenant_id FROM projects WHERE id = :p"),
                          {"p": ids["alpha"]}).scalar_one()
        renamed = c.execute(text("SELECT name FROM projects WHERE id = :p"),
                            {"p": ids["oldname"]}).scalar_one()
        reader = c.execute(text("SELECT tenant_id FROM reader_positions WHERE user_id = :u"),
                           {"u": ids["op"]}).scalar_one()
        note = c.execute(text("SELECT project FROM reader_annotations WHERE id = :i"),
                         {"i": ids["ann"]}).scalar_one()
        cols = [r[0] for r in c.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' "
            "AND table_name = 'feedback_events' AND column_name <> 'project_id'"))]
        sel = ", ".join(f'"{x}"::text' for x in cols)
        ours = c.execute(text(f"SELECT {sel}, project_id FROM public.feedback_events "
                              "WHERE id = ANY(:e) ORDER BY 1"), {"e": w["events"]}).all()
        theirs = c.execute(text(f"SELECT {sel} FROM {w['schema']}.feedback_events "
                                "ORDER BY 1")).all()
    assert t1.name == "Home" and org.created_at > t1.created_at and first == ids["t1"]
    assert moved == org.id and reader == org.id and renamed == "newname" and note == "newname"
    assert [tuple(r[:-1]) for r in ours] == [tuple(r) for r in theirs]  # column by column
    assert {r[-1] for r in ours} == {ids["fb"]}
    assert len(ours) == 3 and sum(r[cols.index("event_at")] is None for r in ours) == 1
    root, org_root = w["root"], w["root"] / "tenants" / str(org.id)
    assert not (root / "docs" / "alpha").exists() and not (root / "docs" / ".versions" / "alpha").exists()
    assert (org_root / "alpha" / "2026-10-01-a.md").is_file()
    assert (org_root / ".versions" / "alpha" / "2026-10-01-a" / "v0001.md").is_file()
    assert (org_root / ".assets" / "alpha" / "2026-10-01-a" / "f.png").read_bytes() == b"png"
    book = json.loads((root / "docs" / ".books" / "newname" / "bk.json").read_text())
    assert book["chapters"][0]["variants"]["en"] == "newname/2026-10-01-o.md"
    assert (w["att_dir"] / "k" / f"{w['tag']}.png").read_bytes() == ATTACHMENT

    report = _reindex(ids["t1"])
    assert report["removed"] == 0 and report["books_indexed"] == 1
    new_ids = _doc_ids(w)
    assert new_ids["alpha/2026-10-01-a.md"] == (old_ids["alpha/2026-10-01-a.md"][0], str(org.id))
    assert new_ids["newname/2026-10-01-o.md"][0] == old_ids["oldname/2026-10-01-o.md"][0]

    settled = _state(w)
    assert _run(w, "--apply") == 0
    assert _state(w) == settled  # a second apply changes nothing
    assert _run(w, "--verify") == 0

    with w["engine"].begin() as c:
        late = uuid.uuid4()
        c.execute(text(f"INSERT INTO {w['schema']}.feedback_events (id, message, source_product,"
                       " project_id) VALUES (:i, 'late', 'prod', :p)"),
                  {"i": late, "p": ids["v_src"]})
        n0 = c.execute(text("SELECT count(*) FROM public.feedback_events")).scalar_one()
    assert _run(w, "--apply") == 0
    with w["engine"].connect() as c:
        n1 = c.execute(text("SELECT count(*) FROM public.feedback_events")).scalar_one()
        got = c.execute(text("SELECT project_id FROM public.feedback_events WHERE id = :i"),
                        {"i": late}).scalar_one()
    assert n1 == n0 + 1 and got == ids["fb"]  # exactly the event added since


def _taken(w):
    with w["engine"].begin() as c:
        c.execute(text("INSERT INTO projects (id, tenant_id, name) VALUES (:i, :t, 'newname')"),
                  {"i": uuid.uuid4(), "t": w["ids"]["t1"]})


def _no_vocky_operator(w):
    with w["engine"].begin() as c:
        c.execute(text(f"UPDATE {w['schema']}.users SET email = 'someone@example.test'"))


def _no_attachment_source(w):
    w["args"] = [a for a in w["args"] if a != "--attachments-source"][:-1]


def _older_org(w):
    with w["engine"].begin() as c:
        org = uuid.uuid4()
        c.execute(text("INSERT INTO tenants (id, name, created_at) VALUES (:i, :n, :t)"),
                  {"i": org, "n": f"Org {w['tag']}", "t": datetime(2025, 1, 1, tzinfo=UTC)})
        c.execute(text("INSERT INTO tenant_members (id, tenant_id, user_id, role) VALUES "
                       "(:i, :t, :u, 'owner')"),
                  {"i": uuid.uuid4(), "t": org, "u": w["ids"]["op"]})


@pytest.mark.parametrize("arrange", [_taken, _no_vocky_operator, _no_attachment_source, _older_org])
def test_each_refusal_changes_nothing(world, arrange):
    arrange(world)
    before = _state(world)
    assert _run(world, "--apply") == merge_vocky.EXIT_REFUSED
    assert _state(world) == before


def test_a_run_interrupted_after_the_commit_finishes_on_the_next(world, monkeypatch):
    def boom(ctx, plan):
        raise RuntimeError("interrupted before the folders moved")

    real = merge_vocky.apply_disk
    monkeypatch.setattr(merge_vocky, "apply_disk", boom)
    with pytest.raises(RuntimeError):
        _run(world, "--apply")
    assert _run(world, "--verify") == merge_vocky.EXIT_FAILED  # folders still to move
    monkeypatch.setattr(merge_vocky, "apply_disk", real)
    assert _run(world, "--apply") == 0
    assert _run(world, "--verify") == 0


# --- git checkouts, feedback target names, the id journal, old-name references ---------

JOURNAL = Path("data") / "merge_vocky_journal.json"


def _git(root, *args) -> str:
    return subprocess.run(["git", "-C", str(root), *args], check=True, capture_output=True,
                          text=True).stdout


def _git_checkout(w, *, track: tuple[str, ...] = (), private: tuple[str, ...] = ()) -> Path:
    """Make the content root a checkout like the box's: the repo's ignore lines, the given
    projects in the private-projects block, the given paths committed; status clean."""
    from server import gitops

    root = w["root"]
    _git(root, "init", "-q")
    _git(root, "config", "user.email", "fixture@example.test")
    _git(root, "config", "user.name", "fixture")
    (root / ".gitignore").write_text("/data/\n/tenants/\n.assets/\n")
    for name in private:
        gitops.mark_private(name, root=root)
    _git(root, "add", ".gitignore", *track)
    _git(root, "commit", "-q", "-m", "fixture")
    assert _git(root, "status", "--porcelain", "--untracked-files=all") == ""
    return root


def test_a_project_with_tracked_files_is_refused_and_nothing_changes(world, capsys):
    w = world
    _git_checkout(w, track=("docs/oldname", "docs/.books/oldname"), private=("alpha",))
    before = _state(w)
    assert _run(w, "--apply") == merge_vocky.EXIT_REFUSED
    assert _state(w) == before
    out = capsys.readouterr().out
    assert "rename oldname" in out and "tracked by git" in out and "private in the app" in out


def test_after_a_run_on_a_checkout_git_status_is_clean_and_the_block_names_the_new_name(world):
    from server import gitops

    w = world
    root = _git_checkout(w, private=("alpha", "oldname"))  # both private: nothing tracked
    assert _run(w, "--apply") == 0
    assert _git(root, "status", "--porcelain", "--untracked-files=all") == ""
    assert "newname" in gitops.private_projects(root)
    assert _run(w, "--verify") == 0


def _feedback_to(w, target: str) -> None:
    m = json.loads(w["mapping"].read_text())
    m["feedback"] = {"src": target}
    w["mapping"].write_text(json.dumps(m))


@pytest.mark.parametrize("target, project", [("newname", "oldname"), ("alpha", "alpha")])
def test_a_feedback_target_by_its_post_run_name_resolves_once(world, capsys, target, project):
    w, ids = world, world["ids"]
    _feedback_to(w, target)
    assert _run(w, "--dry-run") == 0
    line = next(x for x in capsys.readouterr().out.splitlines() if x.strip().startswith("src ->"))
    assert str(ids[project]) in line  # the dry run shows the project the apply will use
    assert _run(w, "--apply") == 0
    with w["engine"].connect() as c:
        got = c.execute(text("SELECT DISTINCT project_id FROM public.feedback_events "
                             "WHERE id = ANY(:e)"), {"e": w["events"]}).scalars().all()
        stray = c.execute(text("SELECT count(*) FROM projects WHERE tenant_id = :t AND name IN "
                               "('oldname', 'alpha')"), {"t": ids["t1"]}).scalar_one()
    assert got == [ids[project]] and stray == 0


def _org_with_fbtarget(w) -> None:
    now = datetime.now(UTC)
    with w["engine"].begin() as c:
        org = uuid.uuid4()
        c.execute(text("INSERT INTO tenants (id, name, created_at) VALUES (:i, :n, :t)"),
                  {"i": org, "n": f"Org {w['tag']}", "t": now})
        c.execute(text("INSERT INTO tenant_members (id, tenant_id, user_id, role, created_at) "
                       "VALUES (:i, :t, :u, 'owner', :c)"),
                  {"i": uuid.uuid4(), "t": org, "u": w["ids"]["op"], "c": now})
        c.execute(text("INSERT INTO projects (id, tenant_id, name) VALUES (:i, :t, 'fbtarget')"),
                  {"i": uuid.uuid4(), "t": org})


@pytest.mark.parametrize("target, hint, arrange", [
    ("oldname", "'newname'", None),  # renamed by this run: its post-run name is newname
    ("Home/alpha", "/alpha'", None),  # moved by this run: it is no longer in Home
    ("fbtarget", "Home/fbtarget", _org_with_fbtarget),  # in both orgs after the run
])
def test_a_feedback_target_by_a_pre_run_or_ambiguous_name_is_refused(world, capsys, target,
                                                                     hint, arrange):
    w = world
    _feedback_to(w, target)
    if arrange:
        arrange(w)
    before = _state(w)
    assert _run(w, "--apply") == merge_vocky.EXIT_REFUSED
    assert _state(w) == before
    assert hint in capsys.readouterr().out


def _interrupt(w, monkeypatch) -> None:
    def boom(ctx, plan):
        raise RuntimeError("interrupted before the folders moved")

    real = merge_vocky.apply_disk
    monkeypatch.setattr(merge_vocky, "apply_disk", boom)
    with pytest.raises(RuntimeError):
        _run(w, "--apply")
    monkeypatch.setattr(merge_vocky, "apply_disk", real)


def test_a_reindex_mid_run_renumbers_and_verify_fails_naming_the_documents(world, monkeypatch,
                                                                           capsys):
    w = world
    _interrupt(w, monkeypatch)
    _reindex(w["ids"]["t1"])  # the API restarted between the SQLite re-key and the folders
    capsys.readouterr()
    assert _run(w, "--apply") == merge_vocky.EXIT_FAILED
    out = capsys.readouterr().out
    assert "VERIFY OK" not in out and "renumbered" in out
    assert "oldname/2026-10-01-o.md" in out and "alpha/2026-10-01-a.md" in out
    assert _run(w, "--verify") == merge_vocky.EXIT_FAILED


def test_an_interrupted_run_finishes_from_the_journal_with_every_id_kept(world, monkeypatch):
    w = world
    old_ids = _doc_ids(w)
    _interrupt(w, monkeypatch)
    journal = json.loads((w["root"] / JOURNAL).read_text())
    journalled = {e["pre"][1]: e["id"] for e in journal["documents"]}
    assert journalled == {r: old_ids[r][0] for r in ("alpha/2026-10-01-a.md",
                                                     "oldname/2026-10-01-o.md")}
    assert _run(w, "--apply") == 0
    new_ids = _doc_ids(w)
    assert new_ids["alpha/2026-10-01-a.md"][0] == journalled["alpha/2026-10-01-a.md"]
    assert new_ids["newname/2026-10-01-o.md"][0] == journalled["oldname/2026-10-01-o.md"]
    assert _run(w, "--verify") == 0


def test_references_to_a_renamed_projects_old_name_are_listed_never_rewritten(world, capsys):
    w = world
    docs = w["root"] / "docs"
    (docs / "oldname" / "2026-10-02-p.md").write_text(
        '---\ntitle: "P"\ndate: 2026-10-02\nrelated:\n  - oldname/2026-10-01-o.md\n---\n\n'
        "# P\n\nsee [o](doc:oldname/2026-10-01-o) and [c](chapter:oldname/bk/c1)\n")
    (docs / "alpha" / "2026-10-02-q.md").write_text(
        '---\ntitle: "Q"\ndate: 2026-10-02\nrelated:\n  - alpha/2026-10-01-a.md\n---\n\n'
        "# Q\n\n[x](doc:other/slug) [y](chapter:oldname/c1)\n")  # no old-name reference
    body = (docs / "oldname" / "2026-10-02-p.md").read_bytes()
    assert _run(w, "--dry-run") == 0
    out = capsys.readouterr().out
    assert "docs/oldname/2026-10-02-p.md: related 1, doc/chapter refs 2" in out
    assert "2026-10-02-q.md" not in out
    assert _run(w, "--apply") == 0
    out = capsys.readouterr().out
    assert "docs/newname/2026-10-02-p.md: related 1, doc/chapter refs 2" in out  # verify too
    assert (docs / "newname" / "2026-10-02-p.md").read_bytes() == body

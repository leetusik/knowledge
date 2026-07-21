"""The day-to-day commands — `save`, `search`, `list`, `read`, `projects`, `usage`.

What a user does *after* `init`. Five of the six ride the non-expiring `vk_` key
on `/api/*`, which is the whole point of the two-token model (D-P13-3): they keep
working after the 30-day session lapses. Only `usage` needs `/app/*`, and so only
`usage` breaks when the session expires — that contrast **is** the model, visible
from the terminal.

Two output contracts, and they are not the same thing:

* **stdout is the answer.** With `--json` it is the server's payload *verbatim* —
  every field, nothing opinionated, so an agent (or `jq`) never has to guess what
  was dropped. Without it, stdout is an opinionated human rendering that
  deliberately hides some fields (see `save`'s `url`).
* **Errors are never JSON.** They go to stderr as `error: …` with exit 1
  (`main()`'s boundary). So stdout is always "valid JSON or nothing" under
  `--json`, and an agent branches on the **exit code**, never on parsing.

The server contract is frozen; the work here is mapping it to honest ergonomics.
Three of its edges shape this module and are easy to get backwards:

1. **Two shapes for two list-ish routes.** `GET /api/documents` answers
   `{total, items}`; `GET /api/search` answers `{total, results}`
   (`main.py:255` vs `:329-338`). A shared formatter gets one of them wrong.
2. **Two different "projects".** `/api/projects` is a `GROUP BY` over documents,
   not a registry — a project has no row until its first save. `/app/projects` is
   the tenant's project records. `client.corpus_projects` vs
   `client.projects_list` keep them apart.
3. **Validate what the server would 422 about, but only where the user could not
   have known.** Tags (2-5 *and* lowercase-kebab) and the project name are checked
   here, because the tag rule is a workflow constraint an agent cannot guess and
   the project name is **auto-derived** — a repo called `my app` must produce a
   sentence, not a raw 422 about a value the user never typed. A bad `--limit` or
   `--slug` is a typo, and FastAPI's own 422 already reads fine; those are left to
   the server on purpose.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from typing import Any

from . import auth, config
from .client import ApiError, KnowledgeClient
from .errors import CliError

# server/documents.py:33 — the tag charset (which is also the slug charset).
# Uppercase is the likelier agent mistake: `--tag Auth` 422s.
_TAG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
# server/documents.py:32 — the project charset. Stricter than it looks: the
# server also rejects '/' and '..' inside it (`validate_project`), which this
# pattern already forbids.
_PROJECT_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")

# server/documents.py:61-62 — `2 <= len(tags) <= 5`, on every write.
MIN_TAGS = 2
MAX_TAGS = 5

# `snippet()` wraps hits in these (`server/search.py:50`). Useful in HTML, noise
# in a terminal.
_MARK_RE = re.compile(r"</?mark>")


# --- where am I ---------------------------------------------------------------


def repo_root(start: str | None = None) -> str | None:
    """The git working tree's root, or None if we are not in one.

    Walks up looking for `.git` and accepts a **file** as well as a directory: a
    worktree or submodule has `.git` as a file pointing elsewhere, and rejecting
    those would silently change the project name for anyone using one.

    Deliberately no `git` subprocess — this runs on every `save`, the answer is a
    directory name, and shelling out would make the CLI depend on a git binary it
    otherwise never needs.
    """

    path = os.path.abspath(start or os.getcwd())
    while True:
        if os.path.exists(os.path.join(path, ".git")):
            return path
        parent = os.path.dirname(path)
        if parent == path:  # hit '/'
            return None
        path = parent


def default_project() -> str:
    """The project a `save` lands in when `--project` is not given.

    **The repo's root directory name, verbatim** — which is what
    `plugin/skills/explain/SKILL.md:160` tells `/knowledge:explain` to use. The CLI
    and the plugin write the same corpus with the same key, so they must partition
    it the same way; a CLI that defaulted to something else would scatter one
    repo's notes across two project names depending on which tool wrote them.

    Outside a git repo there is no repo name to use, so fall back to the project
    `init` configured (`api.project`), then to the literal `"default"` project
    (`auth.DEFAULT_PROJECT`) — the org's signup-provisioned default project (P18).
    Any name resolves regardless: the write path get-or-creates a project on first
    save, so `"default"` is always a real registry row.
    """

    root = repo_root()
    if root:
        return os.path.basename(root)
    return auth.stored_project() or auth.DEFAULT_PROJECT


def default_source_repo() -> str:
    """`source_repo` for a `save`: the same basename, by a different road.

    The plugin sends an absolute path and the server's `sanitize_source_repo`
    (`documents.py:123-137`) collapses it to the basename — so sending the basename
    outright produces the identical stored value. Outside a repo, the cwd's name is
    the honest answer to "where did this come from".
    """

    return os.path.basename(repo_root() or os.getcwd())


# --- the key ------------------------------------------------------------------


def api_token() -> str:
    """The bearer for `/api/*`: `$KB_API_TOKEN` first, then the config's `api.token`.

    That precedence is the **seam's**, not this CLI's invention
    (`explain/SKILL.md:96-109`), and `knowledge config` already reports the env var
    as the effective token — ignoring it here would make the CLI contradict its own
    debug command.

    But `$KB_API_TOKEN` is **not** a generic token override, and that is worth a
    warning: `server/api_auth.py:142-149` short-circuits an *exact* match to
    **tenant #1**, and a tenant-#1 write is `is_public` — it writes the canonical
    git-published `docs/` tree, updates the public Recent index, commits, and
    pushes to the live website (`main.py:448-459,486-515`). Someone who exported it
    for the plugin and forgot has a shell where every `knowledge save` publishes.
    So: honor it, and say so when it is displacing a key of your own.
    """

    env = os.environ.get(config.ENV_API_TOKEN)
    stored = auth.stored_api_token()
    if env:
        if stored and env != stored:
            auth.note(
                f"$KB_API_TOKEN overrides the api.token in your config "
                f"({config.redact_token(stored)}) for this command. If it is the "
                "server's master bearer, you are writing to tenant #1's public, "
                "git-published corpus — unset it to use your own key."
            )
        return env
    if not stored:
        raise CliError(
            "no API key configured — run `knowledge init --email you@example.com` "
            "(or set $KB_API_TOKEN)"
        )
    return stored


def api_call(fn, *args: Any, **kwargs: Any) -> Any:
    """Call an `/api/*` wrapper, translating the one status a user can act on.

    Only 401. A 404 here is **real** (`read` on a document that does not exist), and
    every other status is mapped by the command that knows what it was asking for.
    """

    try:
        return fn(*args, **kwargs)
    except ApiError as exc:
        if exc.status == 401:
            raise CliError(
                "your API key was rejected — it may have been revoked, or belong to "
                "another service. Run `knowledge init --email you@example.com` to "
                "mint a new one."
            ) from None
        raise


# --- input --------------------------------------------------------------------


def _kebab(value: str) -> str:
    """`documents.slugify`'s charset collapse, for *suggestions only*.

    Never applied silently: it exists so `--tag Auth` can be answered with "try
    `auth`" instead of a regex. Auto-correcting the user's tags would be a guess
    about meaning, and tags are how they will find the document again.
    """

    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def parse_tags(values: list[str] | None) -> list[str]:
    """`--tag a --tag b` and `--tag a,b` both mean `["a", "b"]`.

    Comma-splitting is not sugar: agents write tag lists as one comma-separated
    string constantly, and the alternative is a 422 about a tag named `a,b`.
    """

    tags: list[str] = []
    for value in values or []:
        tags.extend(part.strip() for part in value.split(",") if part.strip())
    return tags


def validate_tags(tags: list[str]) -> list[str]:
    """The server's two tag rules, checked here so neither arrives as a raw 422.

    Count **and** charset (`documents.py:33,61-62`). The count is the famous one,
    but the charset is the likelier trip: `Auth`, `web api` and `c++` all 422, and
    the server's message quotes a regex at someone who wrote a word.
    """

    if not MIN_TAGS <= len(tags) <= MAX_TAGS:
        got = ", ".join(repr(t) for t in tags) if tags else "none"
        raise CliError(
            f"a document needs {MIN_TAGS}-{MAX_TAGS} tags; you gave {len(tags)} "
            f"({got}). Tags are how you find it again — pass them with "
            "`--tag python --tag testing` or `--tag python,testing`."
        )
    for tag in tags:
        if not _TAG_RE.match(tag):
            suggestion = _kebab(tag)
            hint = f" — try `--tag {suggestion}`" if suggestion else ""
            raise CliError(
                f"invalid tag {tag!r}: tags are lowercase letters, digits and single "
                f"dashes (a-z, 0-9, `-`){hint}"
            )
    return tags


def validate_project(name: str, *, derived: bool) -> str:
    """The project name, checked before it can 422.

    `derived` matters to the message and nothing else: when the name came from the
    directory the user happens to be standing in, telling them their input is
    invalid is a lie — they never typed it. Name the source, then offer the fix.
    """

    if _PROJECT_RE.match(name):
        return name
    suggestion = _kebab(name)
    fix = f" — pass `--project {suggestion}`" if suggestion else ""
    if derived:
        raise CliError(
            f"this repo's directory name ({name!r}) is not a usable project name: "
            f"it must start with a letter or digit and hold only letters, digits, "
            f"`.`, `_` and `-`{fix}"
        )
    raise CliError(
        f"invalid project {name!r}: it must start with a letter or digit and hold "
        f"only letters, digits, `.`, `_` and `-`{fix}"
    )


def read_body(source: str) -> str:
    """The document body, from a file or stdin (`-`).

    Never from an argument: a document is long and would blow past the shell's argv
    limit; `explain/SKILL.md:164-166` builds a temp file for exactly this reason.
    """

    if source == "-":
        return sys.stdin.read()
    try:
        with open(source, encoding="utf-8") as handle:
            return handle.read()
    except OSError as exc:
        raise CliError(f"cannot read {source}: {exc.strerror or exc}") from None


def strip_frontmatter(text: str, source: str) -> str:
    """Drop a leading `---` fenced header, loudly.

    `POST /api/documents` takes the body **without** frontmatter, starting at the
    H1, and writes convention-exact frontmatter itself (`main.py:366-368`) — so a
    document that carries its own would end up with two headers, the outer one
    silently wrong. Warn rather than fail: the fix is unambiguous and the user's
    intent is obvious.

    This never fires on a `read` -> `save` round-trip: the API stores the body
    *without* frontmatter (`db.py:33`) and hands that back, so `read` returns a
    bare H1-first body. It fires only on genuinely hand-written frontmatter, which
    is exactly who it is for.
    """

    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return text
    for index in range(1, len(lines)):
        if lines[index].strip() == "---":
            auth.note(
                f"stripped the YAML frontmatter from {source} — the API writes its "
                "own, so the body must start at the H1"
            )
            return "\n".join(lines[index + 1 :]).lstrip("\n")
    # An opening fence with no closing one is not frontmatter; it is a horizontal
    # rule, or a truncated file. Either way, not ours to remove.
    return text


def derive_title(markdown: str, explicit: str | None) -> str:
    """`--title`, else the body's first H1 — the title *is* the H1, by convention."""

    if explicit:
        return explicit
    for line in markdown.splitlines():
        match = re.match(r"^#\s+(.+?)\s*$", line)
        if match:
            return match.group(1)
        if line.strip():
            break  # content before any H1: there is no title to find
    raise CliError(
        "no title: the document has no `# H1` on its first content line — add one, "
        "or pass --title"
    )


# --- output -------------------------------------------------------------------


def emit(payload: Any, as_json: bool) -> bool:
    """Print the server's payload verbatim when `--json`. Returns True if it did.

    Verbatim is the contract: `--json` is the escape hatch from every opinionated
    choice the text rendering makes, so it must not make any of its own.
    """

    if as_json:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    return as_json


def _one_line(text: str, width: int = 100) -> str:
    """A snippet as one line: fold whitespace, drop `<mark>`, cap the length."""

    flat = " ".join(_MARK_RE.sub("", text or "").split())
    return flat if len(flat) <= width else flat[: width - 1] + "…"


def _doc_line(doc: dict[str, Any]) -> str:
    """One document, one line: id, date, rel_path, title.

    `rel_path` is here because `read` accepts it and the help text promises this is
    where you find it; `id` because it is the shorter thing to type.
    """

    return (
        f"{str(doc.get('id', '?')):>5}  {doc.get('date', '?'):<10}  "
        f"{doc.get('rel_path', '?')}  {doc.get('title', '')}"
    )


# --- commands -----------------------------------------------------------------


def cmd_save(args: argparse.Namespace) -> int:
    """Save a document to your knowledge base.

    The body comes from a file (or `-` for stdin) and must start at its `# H1` —
    the API writes the frontmatter itself. Tags are required, 2-5 of them, in
    lowercase-kebab.

    The project defaults to this git repo's directory name, which is exactly what
    `/knowledge:explain` uses — so both tools file a repo's notes together.
    """

    markdown = strip_frontmatter(read_body(args.file), args.file)
    if not markdown.strip():
        raise CliError(f"{args.file} is empty — nothing to save")

    title = derive_title(markdown, args.title)
    tags = validate_tags(parse_tags(args.tag))
    project = validate_project(
        args.project or default_project(), derived=not args.project
    )

    with KnowledgeClient(args.base_url, token=api_token()) as client:
        try:
            payload = api_call(
                client.document_create,
                title=title,
                markdown=markdown,
                project=project,
                tags=tags,
                source_repo=args.source_repo or default_source_repo(),
                date=args.date,
                slug=args.slug,
                overwrite=args.overwrite,
            )
        except ApiError as exc:
            if exc.status == 409:
                raise CliError(_conflict(exc.detail)) from None
            raise

    if emit(payload, args.json):
        return 0
    # The 201's `url` is deliberately not printed. It is built from
    # KB_PUBLIC_BASE_URL — the mkdocs origin (`config.py:39-41`) — so for any tenant
    # but #1 it is a link to a page that does not exist. `--json` still carries it.
    print(f"saved: {payload.get('title')}")
    print(f"  id:   {payload.get('id')}")
    print(f"  path: {payload.get('rel_path')}")
    print(f"  read: knowledge read {payload.get('id')}")
    return 0


def _conflict(detail: str) -> str:
    """Turn `POST /api/documents`' 409 into a sentence.

    Its `detail` is a **dict**, not prose (`main.py:426-430`), and `client._detail`
    only passes strings through — so it arrives here `json.dumps`'d. Parse it back,
    or the user reads a JSON blob and has to work out that `--overwrite` exists.
    """

    try:
        data = json.loads(detail)
    except (TypeError, ValueError):
        data = None
    if not isinstance(data, dict) or "rel_path" not in data:
        return f"that document already exists — pass --overwrite to replace it ({detail})"
    where = data["rel_path"]
    doc_id = data.get("id")
    known = f" (id {doc_id}, {data.get('existing_title')!r})" if doc_id is not None else ""
    return (
        f"a document already exists at {where}{known} — pass --overwrite to replace "
        "it, or --slug/--date to save alongside it"
    )


def cmd_search(args: argparse.Namespace) -> int:
    """Full-text + semantic search across your knowledge base.

    Any query is safe to type. `GET /api/search` does answer **400** on a malformed
    FTS expression (`main.py:318-319`), but that is unreachable from here: the
    server double-quotes every whitespace token before `MATCH`, so operator syntax
    never forms, and `SearchQueryError` is raised "only … with raw=True"
    (`search.py:264-265`) — a parameter this CLI deliberately does not expose. S3
    verified it live: `"unclosed`, `NEAR(`, `a OR`, `*`, `^` and an empty query all
    return 200, while the same `"unclosed` with `raw=true` returns 400. So there is
    no 400 branch below; adding one would be handling an error we cannot produce.
    """

    with KnowledgeClient(args.base_url, token=api_token()) as client:
        payload = api_call(
            client.search,
            args.query,
            project=args.project,
            tag=args.tag,
            limit=args.limit,
        )

    if emit(payload, args.json):
        return 0
    results = payload.get("results") or []  # `results`, not `items` — search's shape
    if not results:
        print(f"no results for {args.query!r}")
        return 0
    print(f"{payload.get('total', len(results))} result(s) for {args.query!r} "
          f"({payload.get('mode', 'bm25')}):")
    for result in results:
        print(_doc_line(result))
        snippet = _one_line(result.get("snippet", ""))
        if snippet:
            print(f"       {snippet}")
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    """List documents, newest first."""

    with KnowledgeClient(args.base_url, token=api_token()) as client:
        payload = api_call(
            client.document_list,
            project=args.project,
            tag=args.tag,
            limit=args.limit,
            offset=args.offset,
        )

    if emit(payload, args.json):
        return 0
    items = payload.get("items") or []  # `items`, not `results` — list's shape
    total = payload.get("total", len(items))
    if not items:
        print("no documents" + (" match that filter" if args.project or args.tag else " yet"))
        return 0
    for doc in items:
        print(_doc_line(doc))
    if len(items) < total:
        print(f"\n{len(items)} of {total} — pass --offset {args.offset + len(items)} for more")
    return 0


def cmd_read(args: argparse.Namespace) -> int:
    """Print a document's markdown, exactly as saved.

    Takes an id or a rel_path. The output is the body the API stored — frontmatter
    excluded, starting at the H1 — so `knowledge read 42 > doc.md` and
    `knowledge save doc.md` round-trip.
    """

    target = args.id_or_path
    with KnowledgeClient(args.base_url, token=api_token()) as client:
        # A rel_path is `project/YYYY-MM-DD-slug.md` and can never be all digits, so
        # this heuristic is total rather than a guess. It matches the server's own
        # split: `/api/documents/{doc_id}` is typed `int`, by-path takes the rest.
        fetch = (
            client.document_get if target.isdigit() else client.document_get_by_path
        )
        try:
            payload = api_call(fetch, target)
        except ApiError as exc:
            if exc.status == 404:
                raise CliError(
                    f"{exc.detail or f'no document {target!r}'} — `knowledge list` "
                    "shows the ids and rel_paths you can read"
                ) from None
            raise

    if emit(payload, args.json):
        return 0
    # The stored body verbatim — no header, no metadata. `read > file` must produce
    # a file `save` accepts, and anything printed around it would end up inside the
    # document on the way back. `--json` carries the fields this drops.
    markdown = payload.get("markdown") or ""
    print(markdown, end="" if markdown.endswith("\n") else "\n")
    return 0


def cmd_projects(args: argparse.Namespace) -> int:
    """List the projects you have saved documents under, with counts."""

    with KnowledgeClient(args.base_url, token=api_token()) as client:
        payload = api_call(client.corpus_projects)

    if emit(payload, args.json):
        return 0
    projects = payload.get("projects") or []
    if not projects:
        # This is NOT the same list as `init`'s project. /api/projects is a GROUP BY
        # over documents (`db.py:344-355`), so a project created seconds ago is
        # absent until its first save — which reads as a bug unless it is said out
        # loud right here.
        print("no documents yet — projects appear here once you save one")
        return 0
    width = max(len(str(p.get("project", ""))) for p in projects)
    for project in projects:
        print(
            f"{str(project.get('project', '?')):<{width}}  "
            f"{project.get('count', 0):>4} document(s)  "
            f"latest {project.get('latest_date', '-')}"
        )
    return 0


def cmd_usage(args: argparse.Namespace) -> int:
    """Show how much of your knowledge base you have used.

    The one command here on the `/app` plane, so the one that needs a live session:
    everything else rides the non-expiring API key and keeps working after it
    lapses.
    """

    token = auth.stored_session_token()
    if not token:
        raise CliError(
            "not logged in — run `knowledge login --email you@example.com` "
            "(usage is the one command that needs a session; save and search do not)"
        )
    with KnowledgeClient(args.base_url) as client:
        try:
            payload = auth.plane_call(
                args.base_url, client.usage, days=args.days, token=token, plane="app"
            )
        except ApiError as exc:
            if exc.status == 401:
                raise CliError(
                    "your session has expired — run `knowledge login --email "
                    "you@example.com`. Your API key is unaffected: save and search "
                    "keep working."
                ) from None
            raise

    if emit(payload, args.json):
        return 0
    # Totals only. `daily_counts` is a 30-entry zero-filled series built for the web
    # dashboard's chart; in a terminal it is a wall of zeroes. `--json` has it.
    totals = payload.get("totals") or {}
    print(f"usage, last {args.days} day(s):")
    print(f"  documents saved:   {totals.get('documents_created', 0)}")
    print(f"  documents deleted: {totals.get('documents_deleted', 0)}")
    print(f"  searches:          {totals.get('searches', 0)}")
    print(f"  total events:      {totals.get('total', 0)}")
    return 0


# --- wiring -------------------------------------------------------------------


def _add_json(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--json",
        action="store_true",
        help="print the server's response verbatim as JSON (errors stay on stderr)",
    )


def register(sub: argparse._SubParsersAction) -> None:
    """Add the knowledge subcommands to the top-level parser."""

    p = sub.add_parser(
        "save",
        help="Save a document (2-5 tags required)",
        description=cmd_save.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("file", metavar="FILE", help="markdown file to save, or - for stdin")
    p.add_argument("--title", help="document title (default: the body's first # H1)")
    p.add_argument(
        "--tag",
        action="append",
        metavar="TAG",
        help=(
            f"a tag, lowercase-kebab. {MIN_TAGS}-{MAX_TAGS} required. Repeatable, and "
            "comma-separated values are split (--tag python,testing)"
        ),
    )
    p.add_argument(
        "--project",
        help="project to file it under (default: this git repo's directory name)",
    )
    p.add_argument(
        "--source-repo",
        help="where it came from (default: this git repo's directory name)",
    )
    p.add_argument("--slug", help="url slug, lowercase-kebab (default: from the title)")
    p.add_argument("--date", metavar="YYYY-MM-DD", help="document date (default: today)")
    p.add_argument(
        "--overwrite", action="store_true", help="replace an existing document at the same path"
    )
    _add_json(p)
    p.set_defaults(func=cmd_save)

    p = sub.add_parser(
        "search",
        help="Search your knowledge base",
        description=cmd_search.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("query", metavar="QUERY", help="what to look for")
    p.add_argument("--project", help="only this project")
    p.add_argument("--tag", help="only documents with this tag")
    p.add_argument("--limit", type=int, help="how many results (1-50, default 10)")
    _add_json(p)
    p.set_defaults(func=cmd_search)

    p = sub.add_parser(
        "list",
        help="List documents, newest first",
        description=cmd_list.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--project", help="only this project")
    p.add_argument("--tag", help="only documents with this tag")
    p.add_argument("--limit", type=int, help="how many (1-200, default 50)")
    p.add_argument("--offset", type=int, default=0, help="skip this many")
    _add_json(p)
    p.set_defaults(func=cmd_list)

    p = sub.add_parser(
        "read",
        help="Print a document's markdown",
        description=cmd_read.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument(
        "id_or_path",
        metavar="ID_OR_PATH",
        help=(
            "a document id, or the rel_path that `knowledge list` prints "
            "(project/YYYY-MM-DD-slug.md — the full path, not a bare slug)"
        ),
    )
    _add_json(p)
    p.set_defaults(func=cmd_read)

    p = sub.add_parser(
        "projects",
        help="List projects you have saved under, with document counts",
        description=cmd_projects.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    _add_json(p)
    p.set_defaults(func=cmd_projects)

    p = sub.add_parser(
        "usage",
        help="Show your usage totals (needs a session — see `login`)",
        description=cmd_usage.__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--days", type=int, default=30, help="window in days (1-365, default 30)")
    _add_json(p)
    p.set_defaults(func=cmd_usage)

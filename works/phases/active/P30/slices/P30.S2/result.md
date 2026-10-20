# P30.S2 — Books and chapters (server): result

## Verdict

- status: done
- tier: high
- model: opus
- effort: high
- summary: Shipped the server's book and chapter model. It adds on-disk manifests at `<root>/.books/<project>/<book>.json`, and the derived SQLite tables `books`, `chapters` and `chapter_variants`, which reindex's third walk rebuilds exactly. It adds the optional header fields `lang:`, `translated_from:` and `subject:`, and publish placement on `POST /api/documents`: the manifest goes in the same commit as the chapter, and a re-publish of `(book, key, lang)` becomes that variant's next version. The new routes are `GET /api/books`, `GET`/`PUT /api/books/{project}/{book}`, `/app/books…` and the project-gated `/app/orgs/{org}/{project}/books/{book}`. Search hits gain `book`, `chapter_key` and `lang`. All of it is additive: a loose publish that sends no new field is unchanged.
- files_changed: server/books.py (new), server/books_api.py (new), server/db.py, server/documents.py, server/main.py, server/reindex.py, server/search.py, tests/test_books.py (new), tests/test_documents_api.py
- validation:
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`: **133 passed** (baseline 128, plus 5 new), with every Postgres-gated suite exercised;
  - `uv run pytest -q` (no Postgres): 87 passed, 46 skipped;
  - `python3 scripts/skills_parity.py`: **FAILS as known** ("explain skill copy missing: .agents/skills/explain/SKILL.md", A3, fixed in S7). Not this slice's;
  - `python3 scripts/workflow.py validate`: passed (only the existing warnings);
  - `git diff --stat -- web/`: empty, no web change.
- deviations: one, additive. `tests/test_documents_api.py` `_LIST_KEYS` gains `lang`, `subject` and `translated_from`. The test's own comment asks to keep that pinned projection in step with the `documents` table, as `format` and `version` were. Search's new fields are asserted inside the placement test rather than in a test of their own.

  No MCP change: MCP projects five fields from each hit, so the new fields flow past it unchanged. MCP output additions are S5's.
- doc_impact: four lines appended to `phase.md` → `## Doc impact`: `api.md`, `data.md`, `backend.md` and the `decisions.md` ADR line. They are quoted below.

## What was built

- **`server/books.py`** (new) holds the manifest module:
  - the validators: `validate_book_slug`, `validate_chapter_key`, `validate_lang`, `validate_kind`, `validate_subject`, `validate_text`, `validate_position`, `validate_source`, `validate_variant_rel_path` and `validate_translated_from`;
  - `normalize_manifest(raw, project=)` returns the canonical form or raises `ConventionError`;
  - the helpers `sort_chapters`, `next_position`, `manifest_rel_path`, `serialize_manifest`, `read_manifest`, `write_manifest` (atomic, using a temp file and `os.replace`), `iter_manifest_files`, `find_chapter` and `find_binding`;
  - the constants `BOOKS_DIR = ".books"` and `DEFAULT_LANG = "en"`.
- **`server/db.py`** changes:
  - `_SCHEMA` gains `books`, `chapters` and `chapter_variants`. They have composite primary keys and **no surrogate ids**, so a rebuild reproduces every row exactly. A unique index on `chapter_variants(tenant_id, rel_path)` keeps a document in at most one chapter;
  - `documents` gains the nullable `lang`, `subject` and `translated_from` (JSON) columns, through the existing idempotent `ALTER TABLE ADD COLUMN` migration;
  - `upsert_document` takes the three new fields;
  - `_row_to_dict` decodes `translated_from`;
  - the new helpers are `replace_book`, `delete_book`, `find_chapter_binding`, `list_books`, `get_book` and `chapter_bindings_for_docs`. `get_book` joins `documents` and leaves out a variant whose document is gone.
- **`server/documents.py`**: the frontmatter serializers emit `lang:`, then `translated_from:` (a `{lang, version}` block), then `subject:` (a JSON string). They come after `date`/`version`, **and only when given**, so an older file's bytes are unchanged.
- **`server/reindex.py`** changes:
  - `.books` joins `RESERVED_DIRS`;
  - `_header_extras` re-derives the three header fields leniently: a bad value reads back as absent and never skips the document;
  - `_rebuild_books` is the third walk. It runs as one transaction: it clears the chapter and variant rows, refills every root's manifests with one savepoint per book, and drops the book rows whose manifest is gone. A malformed manifest, or one that double-binds a document, is reported in `skipped[]`;
  - the report gains `books_indexed` and `books_removed`.
- **`server/main.py`** changes:
  - `DocumentIn` gains `book` (`BookRefIn`), `chapter` (`ChapterRefIn`), `lang`, `translated_from` and `subject`;
  - the placement helpers are `_validated_placement`, `_read_manifest_or_409` and `_place_variant`, with `_uses_book_fields` deciding when the 201 carries the new keys;
  - `create_document` resolves a bound `(book, key, lang)` as the version target. Under the lock it settles the manifest **before** any file is touched, then writes the manifest and the derived rows after the document, and stages `docs/.books/<project>/<book>.json` in the same commit;
  - the new routes are `GET /api/books`, `GET /api/books/{project}/{book}` and `PUT /api/books/{project}/{book}`.
- **`server/books_api.py`** (new) holds `GET /app/books?project=<uuid>`, `GET /app/books/{project}/{book}` (both member-only) and `GET /app/orgs/{org}/{project}/books/{book}` (optional identity, project-gated, one constant 404).
- **`server/search.py`**: `_attach_chapters` adds `book`, `chapter_key` and `lang` to each hit on the returned page, with one query per page. A loose document carries nulls.

## Contracts as shipped (for S3–S7, S11 and S13)

- **The manifest** is the P29 shape, with a canonical field order:
  - top-level fields: `{slug, title, kind, subject|null, description|null, chapters:[...]}`;
  - each chapter: `{key, position, title?, variants:{<lang>: <rel_path>}, source?}`;
  - chapters are sorted by `(position, key)` and variants by lang;
  - the file is JSON with a 2-space indent, `ensure_ascii=False` and a trailing newline.
- **POST placement:**
  - `book: {slug, title?, kind?, subject?, description?}` and `chapter: {key, position?, title?, source?: {str: str}}` go together; one without the other is a 422;
  - creating a new book needs `book.kind` (422 otherwise), and `title` defaults to the slug;
  - a missing `lang` places the document as `en`, and writes no header line;
  - when `(book, key, lang)` is already bound, the publish is that document's next version. A `rel_path` that names a different document is a 422;
  - a document already bound elsewhere is a 409;
  - a live variant is never silently re-pointed (409). A variant whose document is gone is re-pointed.
  - The 201 gains `book`, `chapter_key`, `lang`, `translated_from`, `subject`, `book_created`, `chapter_created` and `manifest_path`, but **only when a new field was sent**.
- **GET book shape:**
  - top-level fields: `{project, slug, title, kind, subject, description, chapters:[...]}`;
  - each chapter: `{key, position, title, source, variants:[...]}`;
  - each variant: `{lang, rel_path, doc_id, title, slug, version, format, updated_at, translated_from}`;
  - the `/app` routes add `canonical_path` (`/@{org}/{project}/books/{book}`, or null).
- **PUT body:**
  - the fields: `{slug?, title, kind, subject?, description?, chapters:[manifest chapters], commit?, co_authored_by?}`;
  - an invalid manifest, or a variant that is not an existing document of this tenant in this project, is a 422 (`detail.missing`);
  - a document that another book binds is a 409;
  - a no-op PUT makes no commit;
  - the commit message is `docs(<project>): update book <slug>`.

## Decided by the plan's rule (recorded on `## Operator Questions` as OQ1–OQ3)

1. Variants store the `rel_path` (P29 *Chapter*), not a bare stem. The plan's word "stems" paraphrases P29. S5's html → native migration re-points the variant, as P29 says.
2. On POST, an existing book or chapter keeps its manifest fields: the request seeds only a new book or chapter. `PUT` is how a book's fields change. This is the most conservative option, since a re-explain cannot silently retitle a book.
3. Deleting a bound document leaves its manifest binding in place. The reads omit the dead variant, a re-publish re-points it, and a `GET`→`PUT` round trip drops it. The delete path stays untouched, which is the conservative option for an existing write path. S8 (the delete purge) or S6 may revisit this.

## Tests added (`tests/test_books.py`, very core only)

1. A chapter publish places the variant, and the manifest, the derived tables (through the route) and search agree. The second language joins the same chapter, the re-publish is v2 at the same rel_path, and the manifest is in the chapter's commit.
2. Reindex from a deleted DB reproduces the three tables exactly, and a removed manifest drops its rows.
3. `PUT` refuses a missing document and another project's document (422), refuses a document that another book binds (409), and accepts a valid one.
4. A loose publish with no new fields keeps the exact pre-P30 response key set, the byte-exact file and the exact commit path set, and creates no `.books/`.
5. On the public book route (Postgres-gated), a private project's book and a nonexistent book give the identical 404. A public one is 200, and a member reads their private book.

## Probes (a throwaway script, deleted)

An ad-hoc TestClient run over a temp git repo confirmed each of these:
- `book` without `chapter` is a 422;
- a new book without `kind` is a 422, and no file is written;
- `lang: "EN"` is a 422;
- a subject book without a subject is a 422;
- binding a bound document to a second chapter is a 409, and the file is untouched;
- binding it into a second book is a 409, and no manifest is written;
- a `rel_path` conflicting with the binding is a 422;
- a loose document with `subject` and `lang` has its header written and its read columns filled;
- `translated_from.lang` equal to the document's own lang is a 422;
- a no-op PUT returns 200 with `committed:false` and no error, and a changed PUT commits `docs(kp): update book b`;
- `/api/reindex` reports `books_indexed: 1`.

## Not done, by scope

- No web changes.
- No migration and no binding of real documents (S6).
- No images (S4) and no native format (S3/S5).
- No MCP change.
- No chapter-level route: a chapter's documents are read through the existing `/app/documents/{id}` routes using the variant's `doc_id`.
- No org-wide public library listing (`/@{org}`): that is S11's to add if it needs it.

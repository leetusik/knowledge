# Findings: 20261023-0350-post-api-documents-write-path · round 2 · angle code-validate
- researcher: claude-opus-5-5 · status: complete · tool calls: 40

## Questions
- Q18: answered — claims: C-r2-code-validate-01, -02, -03, -04, -05, -06, -07, -08, -09, -10, -11 — note: only the manifest is re-checked inside the lock (step 3-, `_place_variant`, or the migration re-point). Every HTTPException inside the lock comes from that step, before the first write. The exists/stem/version-target checks and the version numbers are computed before the lock and never re-checked. `UNIQUE(tenant_id, rel_path)` does not catch a second create, because `upsert_document` turns the conflict into an UPDATE. The code therefore permits a silent overwrite (same new rel_path) or a mis-archived version (same version target). Nothing in the code, the docs or the P31.S1 notes acknowledges this window for documents. The pre-lock order dates from the first write path (207f2ff), not from P31.S1. The race behaviour (C-07, C-08, C-09) is traced from the code, not observed: no test or run exercised it.

## Sources

### S-r2-code-validate-01
- repo: /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s7/runs/new-c/knowledge
- commit: 9978d8447ed2c5aaf4a7de2e7e6ed7efc0fae32e (short 9978d84) · date: the checked-out HEAD, tree clean
- accessed: 2026-10-23 · read-via: Read on the clean HEAD tree and `git show 9978d84:<path>` · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: the repository's owner (git user leetusik) · upstream: none
- lateral: n/a (a local repository)
- passages: the ranges cited in the claims (server/main.py, server/db.py, server/documents.py, Dockerfile)

### S-r2-code-validate-02
- repo: same repository · commit: 207f2ff (`feat(api): add API-owned write path with scoped git commits`, 2026-07-02; the first commit that adds the `document already exists at` 409, per `git log -S`)
- accessed: 2026-10-23 · read-via: `git grep` at 207f2ff · quote-match: exact · archive: none
- kind: code · peer-review: n/a · owner: as above · upstream: none · lateral: n/a
- passages: server/main.py:L183-L190@207f2ff

### S-r2-code-validate-03
- repo: same repository · commit: 7c275197f97904e25d726bf0ecee4e1de58b43f8 (short 7c27519, `feat(api): P31.S1 knowledge check, a dry-run validation endpoint and CLI`, 2026-10-21)
- accessed: 2026-10-23 · read-via: `git show --stat`, `git grep` at 7c27519 · quote-match: exact · archive: none
- kind: code (the slice's result note, versioned in the repository) · peer-review: n/a · owner: as above · upstream: none · lateral: n/a
- passages: works/phases/active/P31/slices/P31.S1/result.md:L28@7c27519

## Claims

### C-r2-code-validate-01
- claim: At commit 9978d84, the first step inside `create_document`'s `with WRITE_LOCK:` is step "3-". For a placed chapter it calls `_place_variant`. For an html→native migration with no placement, it re-reads the bound book's manifest with `_read_manifest_or_409` and re-points the binding. The code comment says this settles the manifest "FIRST, before any file is touched" and re-reads it "under the lock" because "it is the authoritative copy".
- kind: behaviour
- questions: Q18 · load-bearing: yes (the only re-check inside the lock)
- support: S-r2-code-validate-01 · server/main.py:L1371-L1407@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1374–L1385, L1386, L1391–L1393, L1406–L1407):
        with WRITE_LOCK:
            # 3-. Chapter placement (P30.S2): settle the manifest FIRST, before any file
            #     is touched, so a binding conflict (409) or a book that cannot be created
            #     (422) leaves nothing behind. Re-read under the lock: it is the
            #     authoritative copy.
            new_manifest = None
            book_created = chapter_created = False
            if placement is not None:
                new_manifest, book_created, chapter_created = _place_variant(
                    conn, root=root, project=project, tid=tid, placement=placement, rel=rel,
                    replaces=migrated_from,
                )
            elif migrated_from is not None:
    …
                binding = db.find_chapter_binding(conn, migrated_from, tid)
                if binding is not None:
                    bound_manifest = _read_manifest_or_409(root, binding["project"], binding["book"])
    …
                    except documents_mod.ConventionError as exc:  # pragma: no cover - defensive
                        raise HTTPException(status_code=409, detail=str(exc))
  excerpt-sha256 (L1371–L1407, first 16 hex): d3c01e9a45c8c4b7
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r2-code-validate-02
- claim: At commit 9978d84, `_place_variant` (run inside `WRITE_LOCK`) can raise these errors, all before any file is written. A 409 for a malformed manifest (through `_read_manifest_or_409`). A 422 when the book does not exist and `book.kind` is missing. A 409 when `rel` (or the migration's old path) is already bound to a different chapter of this book's manifest. A 409 when the SQLite index binds `rel` to a chapter of another book. A 409 when the chapter's `(lang)` variant is bound to a different document whose row still exists. A 422 when the resulting manifest fails `normalize_manifest`.
- kind: behaviour
- questions: Q18 · load-bearing: yes (which 409/422 can fire inside the lock)
- support: S-r2-code-validate-01 · server/main.py:L699-L812@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L711–L716, L723, L726–L730, L743–L748, L757–L762, L792–L798, L808–L811):
        Runs INSIDE ``WRITE_LOCK``, before any file is touched, so every refusal leaves
        nothing behind: it re-reads the manifest (the authoritative copy) and 409s when
        this ``(chapter, lang)`` is already bound to a different document, or when ``rel``
        already belongs to a different chapter — in this book or, through the index, in
        another (P29: a document is in at most one chapter). A new book needs
        ``book.kind`` (422). Returns ``(manifest, book_created, chapter_created)``.
    …
        manifest = _read_manifest_or_409(root, project, book["slug"])
    …
            if book["kind"] is None:
                raise HTTPException(
                    status_code=422,
                    detail=f"book {book['slug']!r} does not exist yet: book.kind is required to create it",
                )
    …
        bound_here = books_mod.find_binding(manifest, rel)
        if bound_here is None and replaces is not None:
            bound_here = books_mod.find_binding(manifest, replaces)
        if bound_here is not None and bound_here != (chapter["key"], lang):
            raise HTTPException(
                status_code=409,
    …
        elsewhere = db.find_chapter_binding(conn, rel, tid)
        if elsewhere is None and replaces is not None:
            elsewhere = db.find_chapter_binding(conn, replaces, tid)
        if elsewhere is not None and (elsewhere["project"], elsewhere["book"]) != (project, book["slug"]):
            raise HTTPException(
                status_code=409,
    …
        if (
            current is not None
            and current not in (rel, replaces)
            and db.get_document_by_path(conn, current, tenant_id=tid) is not None
        ):
            raise HTTPException(
                status_code=409,
    …
        ch["variants"][lang] = rel
        try:
            manifest = books_mod.normalize_manifest(manifest, project=project)
        except documents_mod.ConventionError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
  excerpt-sha256 (L699–L812, first 16 hex): fafd99cfed638de9
- scope: commit 9978d84; placed chapters only (`book` and `chapter` sent)
- confidence: high · flags: none
- conflicts: none

### C-r2-code-validate-03
- claim: At commit 9978d84, the only `raise` statements reachable inside `create_document`'s `WRITE_LOCK` block are the step-3- ones (`_place_variant`'s, `_read_manifest_or_409`'s and the defensive 409 at L1407). From the archive step (L1408) to the end of the block, no HTTPException is raised. The commit step catches `gitops.GitError` and reports it as `commit_error` instead of raising.
- kind: behaviour
- questions: Q18 · load-bearing: yes (at what point in the write order a 409/422 can still fire)
- support: S-r2-code-validate-01 · server/main.py:L1371-L1407@9978d84 · rung 1 · fit direct · upstream self (as quoted in C-r2-code-validate-01)
  excerpt-sha256 (L1371–L1407, first 16 hex): d3c01e9a45c8c4b7
- support: S-r2-code-validate-01 · server/main.py:L1408-L1535@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1408, L1416–L1417, L1452, L1471, L1515):
        # 3a. Archive the body about to be replaced, BEFORE it is overwritten, to
    …
            db.rekey_document(
                conn, tenant_id=tid, old_rel_path=migrated_from, new_rel_path=rel
    …
        assets_mod.store_assets(root, rel, prepared_assets)
    …
            stored_body = documents_mod.write_document_file(
    …
        doc_id = db.upsert_document(
  excerpt-sha256 (L1408–L1535, first 16 hex): 4d57f853a35f1f98
- scope: commit 9978d84. The evidence is `git grep -n 'raise ' 9978d84 -- server/main.py`, which lists L1407 as the last `raise` before L1829 (another handler); the L1536–L1597 tail was read and holds only `except gitops.GitError as exc: commit_error = …` (L1595–L1596, not hashed). Non-HTTP exceptions (OSError, sqlite errors) are code-write's angle.
- confidence: high · flags: none
- conflicts: none

### C-r2-code-validate-04
- claim: At commit 9978d84, for a loose document (no `book`/`chapter`) that is not an html→native migration, nothing inside `WRITE_LOCK` re-runs the exists 409, the stem 409 or the version-target resolution. The locked section uses `prev_version`, `doc_version`, `superseded` and `rel` exactly as `_check_document` computed them before the lock. `prev_version` decides whether anything is archived (`if prev_version is not None`), and `doc_version` is the version written to the file and the row.
- kind: behaviour
- questions: Q18 · load-bearing: yes (the pre-lock decisions the write trusts)
- support: S-r2-code-validate-01 · server/main.py:L1371-L1407@9978d84 · rung 1 · fit direct · upstream self (step 3- does nothing when `placement is None` and `migrated_from is None`; quoted in C-r2-code-validate-01)
  excerpt-sha256 (L1371–L1407, first 16 hex): d3c01e9a45c8c4b7
- support: S-r2-code-validate-01 · server/main.py:L1408-L1535@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1419, L1422–L1423, L1471–L1473, L1482, L1515, L1523, L1528):
        if prev_version is not None:
    …
            archive_path = documents_mod.archive_document_file(
                docs_root=root, rel_path=migrated_from or rel, version=prev_version
    …
            stored_body = documents_mod.write_document_file(
                docs_root=root,
                rel_path=rel,
    …
                version=doc_version,
    …
        doc_id = db.upsert_document(
    …
            rel_path=rel,
    …
            version=doc_version,
  excerpt-sha256 (L1408–L1535, first 16 hex): 4d57f853a35f1f98
- scope: commit 9978d84; the pre-lock computation is C-r1-code-validate-19, -20, -21 (exists 409, stem 409, version numbering) and C-r1-code-validate-08 (`_check_document` runs before `with WRITE_LOCK`)
- confidence: high · flags: none
- conflicts: none

### C-r2-code-validate-05
- claim: At commit 9978d84, the `documents` table's only uniqueness constraint is `UNIQUE (tenant_id, rel_path)`. `db.upsert_document` inserts with `ON CONFLICT(tenant_id, rel_path) DO UPDATE SET …`, so a second write at the same `(tenant_id, rel_path)` updates the existing row in place (title, body, version and so on) and keeps its id. The constraint never rejects that write.
- kind: behaviour
- questions: Q18 · load-bearing: yes (the DB does not stop a second create)
- support: S-r2-code-validate-01 · server/db.py:L45-L45@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L45):
      UNIQUE (tenant_id, rel_path)
  excerpt-sha256 (L45–L45, first 16 hex): 859ca133369e42ed
- support: S-r2-code-validate-01 · server/db.py:L289-L381@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L312, L345–L353, L364, L370, L376):
        """Insert or update by ``(tenant_id, rel_path)``. Preserves created_at, refreshes updated_at.
    …
        conn.execute(
            """
            INSERT INTO documents
              (tenant_id, project, slug, date, title, tags, tags_text, source_repo, rel_path,
               markdown, related, format, raw_html, version, lang, subject, translated_from,
               assets, source, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(tenant_id, rel_path) DO UPDATE SET
              project     = excluded.project,
    …
              version     = excluded.version,
    …
              updated_at  = excluded.updated_at
    …
        conn.commit()
  excerpt-sha256 (L289–L381, first 16 hex): 3539202d0b101267
- scope: commit 9978d84; `documents` table (the `CREATE TABLE documents` block ending at L46)
- confidence: high · flags: none
- conflicts: none

### C-r2-code-validate-06
- claim: At commit 9978d84, `write_document_file` writes the target file with `Path.write_text`, without first checking whether the file exists. A second write at the same `rel_path` replaces the file's content.
- kind: behaviour
- questions: Q18 · load-bearing: yes (the file plane does not stop a second create either)
- support: S-r2-code-validate-01 · server/documents.py:L548-L551@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L548–L551):
        content = header + "\n" + _normalize_body(body)
        target = Path(docs_root) / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
  excerpt-sha256 (L548–L551, first 16 hex): 6f761dbbdbc50988
- scope: commit 9978d84; md and html (native uses `write_raw_document_file`, L608–L613, which was not opened beyond its `mkdir` line)
- confidence: high · flags: none
- conflicts: none

### C-r2-code-validate-07
- claim: At commit 9978d84, two concurrent `POST /api/documents` for the same new loose document (same tenant, project, date and slug, `overwrite` false, neither yet written) can both pass `_check_document`'s exists 409. The second to take `WRITE_LOCK` then archives nothing (its `prev_version` is `None`), rewrites the file and updates the same row in place, both still at version 1. The first publish's body is lost from the version history without any 409.
- kind: behaviour
- questions: Q18 · load-bearing: yes (the race the question asks about)
- support: S-r2-code-validate-01 · server/main.py:L1408-L1535@9978d84 · rung 1 · fit direct · upstream self (as quoted in C-r2-code-validate-04: archive only `if prev_version is not None`; file and row written at `rel` with `doc_version`)
  excerpt-sha256 (L1408–L1535, first 16 hex): 4d57f853a35f1f98
- support: S-r2-code-validate-01 · server/db.py:L289-L381@9978d84 · rung 1 · fit direct · upstream self (ON CONFLICT DO UPDATE, C-r2-code-validate-05)
  excerpt-sha256 (L289–L381, first 16 hex): 3539202d0b101267
- support: S-r2-code-validate-01 · server/documents.py:L548-L551@9978d84 · rung 1 · fit direct · upstream self (C-r2-code-validate-06)
  excerpt-sha256 (L548–L551, first 16 hex): 6f761dbbdbc50988
- scope: commit 9978d84; a code trace, not an observed run. It holds only while both requests are inside `_check_document` before either commits its row and file. The pre-lock check is C-r1-code-validate-19, and it reads the file and the row on each request's own SQLite connection. On the public root, each request still makes its own `docs(<project>): add <slug>` commit (L1584–L1593), so git keeps the first body there; a tenant root is never committed. For a placed chapter at the same rel the outcome is the same, because `_place_variant` does not 409 when the bound variant equals `rel` (`current not in (rel, replaces)`, C-r2-code-validate-02).
- confidence: medium (derived from the code path; no test exercises it) · flags: none
- conflicts: none

### C-r2-code-validate-08
- claim: At commit 9978d84, two concurrent re-publishes of the same version target (both resolving the row at version N before the lock) both compute `prev_version = N` and `doc_version = N+1`. The second to take `WRITE_LOCK` then copies the current file, which is the first publish's N+1 body, to the vN archive path, overwriting the true vN archive file and stamping it `version: N`. It upserts the vN `document_versions` row from its stale pre-lock `superseded` row (the original vN's title and markdown), and writes its own body as N+1. The vN archive file and the vN DB row then disagree, and the original vN body is gone from the archive.
- kind: behaviour
- questions: Q18 · load-bearing: yes (the version-target half of the race)
- support: S-r2-code-validate-01 · server/main.py:L1408-L1535@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1419, L1422–L1425, L1431–L1439):
        if prev_version is not None:
    …
            archive_path = documents_mod.archive_document_file(
                docs_root=root, rel_path=migrated_from or rel, version=prev_version
            )
            if archive_path is not None and superseded is not None:
    …
                db.upsert_document_version(
                    conn,
                    rel_path=rel,
                    version=prev_version,
                    archive_path=archive_path,
                    title=superseded["title"],
                    date=superseded["date"],
                    tags=superseded.get("tags") or [],
                    markdown=superseded.get("markdown") or "",
  excerpt-sha256 (L1408–L1535, first 16 hex): 4d57f853a35f1f98
- support: S-r2-code-validate-01 · server/documents.py:L894-L913@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L897, L901–L903, L908–L912):
        """Copy the CURRENT on-disk body to its version archive. Returns the archive
    …
        Call this immediately before ``write_document_file`` replaces the body, inside
        the write lock. An existing archive file at the same version is overwritten —
        re-archiving the same version is idempotent by construction.
    …
        text = src.read_text(encoding="utf-8")
        arch_rel = archive_rel_path(rel_path, version)
        target = Path(docs_root) / arch_rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(set_frontmatter_version(text, version), encoding="utf-8")
  excerpt-sha256 (L894–L913, first 16 hex): 0e91d55b0d7ec297
- support: S-r2-code-validate-01 · server/db.py:L700-L749@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L717, L732–L738):
        """Record one archived version. Idempotent on ``(tenant_id, rel_path, version)``.
    …
            ON CONFLICT(tenant_id, rel_path, version) DO UPDATE SET
              archive_path = excluded.archive_path,
              title        = excluded.title,
              date         = excluded.date,
              tags         = excluded.tags,
              format       = excluded.format,
              markdown     = excluded.markdown,
  excerpt-sha256 (L700–L749, first 16 hex): 8e528f5dc34be124
- scope: commit 9978d84; a code trace, not an observed run. The pre-lock numbering is C-r1-code-validate-16, -21. The same applies to `overwrite: true` on an existing row (`superseded` is that row). The archive's "idempotent by construction" assumption holds only when the on-disk body still is vN, which is exactly what the race breaks. A later reindex re-derives the vN row from the (overwritten) archive file (`upsert_document_version` docstring, L719–L724).
- confidence: medium (derived from the code path; no test exercises it) · flags: none
- conflicts: none

### C-r2-code-validate-09
- claim: At commit 9978d84, the stem 409 ("a document's stem is its identity across formats") is enforced only by `_check_document`'s pre-lock query. Two concurrent publishes of `<stem>.md` and `<stem>.html` can therefore both land as two rows, because the only `documents` uniqueness key is `(tenant_id, rel_path)`.
- kind: behaviour
- questions: Q18 · load-bearing: no (a side case of the same window)
- support: S-r2-code-validate-01 · server/db.py:L45-L45@9978d84 · rung 1 · fit direct · upstream self (C-r2-code-validate-05)
  excerpt-sha256 (L45–L45, first 16 hex): 859ca133369e42ed
- support: S-r2-code-validate-01 · server/main.py:L1371-L1407@9978d84 · rung 1 · fit direct · upstream self (no stem check in step 3-)
  excerpt-sha256 (L1371–L1407, first 16 hex): d3c01e9a45c8c4b7
- scope: commit 9978d84; the pre-lock stem check is C-r1-code-validate-20. A code trace, not an observed run. `db.get_document_by_path_or_alias` (L439–L457) treats two documents sharing a stem as "ambiguous" and returns a miss.
- confidence: medium · flags: none
- conflicts: none

### C-r2-code-validate-10
- claim: At commit 9978d84, `WRITE_LOCK` is an in-process `threading.Lock`, and the Dockerfile runs a single uvicorn worker on purpose ("Never add --workers — multiple workers would break the single-writer invariant"). Concurrency between publishes is therefore between request threads of one process. The lock serializes the critical sections but not `_check_document`.
- kind: behaviour
- questions: Q18 · load-bearing: yes (where concurrency comes from)
- support: S-r2-code-validate-01 · Dockerfile:L45-L48@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L45–L48):
    # Single worker: the write path serializes on an in-process threading.Lock
    # (server/main.py WRITE_LOCK). Never add --workers — multiple workers would
    # break the single-writer invariant. WAL still gives read concurrency.
    CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
  excerpt-sha256 (L45–L48, first 16 hex): f1c7d646e3560bdd
- scope: commit 9978d84; `WRITE_LOCK = threading.Lock()` is server/main.py L183. That `create_document` (a sync `def`) runs on a threadpool thread, so two can run at once, is FastAPI's behaviour and is not shown in this repository (see Unused leads).
- confidence: high · flags: none
- conflicts: none

### C-r2-code-validate-11
- claim: The validate-then-lock order dates from the first API write path, commit 207f2ff (2026-07-02), whose `create_document` raises the `document already exists at` 409 at L183 and takes `WRITE_LOCK` at L190. P31.S1 (7c27519) moved the pre-lock code verbatim into `_check_document`. Its result note says "everything from the lock onward is byte-for-byte the old code", so P31.S1 moved no check out of the lock.
- kind: fact
- questions: Q18 · load-bearing: yes (corrects any reading that P31.S1 opened the window)
- support: S-r2-code-validate-02 · server/main.py:L183-L190@207f2ff · rung 1 · fit direct · upstream self
  excerpt (L183, L190):
                detail = {"message": f"document already exists at {rel}", "rel_path": rel}
    …
        with WRITE_LOCK:
  excerpt-sha256 (L183–L190, first 16 hex): fc9c61353c7c497b
- support: S-r2-code-validate-03 · works/phases/active/P31/slices/P31.S1/result.md:L28@7c27519 · rung 1 · fit direct · upstream self
  excerpt (L28):
    **Server (`server/main.py`).** I moved everything in `create_document` before `with WRITE_LOCK` verbatim into `_check_document(body, ctx, conn) -> _CheckedWrite`, using a scripted cut so nothing was retyped. This covers the string 422s, the body-limit/asset list, placement/version target, format/project 422s, the migration 409, the exists/stem 409s and the native-parse list 422. `create_document` calls it and unpacks the same 23 locals, so everything from the lock onward is byte-for-byte the old code. `create_document`'s dependencies (`ensure_registry_project`, `resolve_org_slug`) and its usage hint are unchanged.
  excerpt-sha256 (L28–L28, first 16 hex): b6ebf856fc491633
- scope: the 409 and the lock also sit in that order at 7c27519^ (409 at L1107, lock at L1252, per `git grep`)
- confidence: high · flags: none
- conflicts: none

## Conflicts
- none

## Speculation and flags
- C-r2-code-validate-07, -08, -09: race outcomes traced through the code, not observed. No test in the repository was found that runs two publishes concurrently (not searched beyond the race/TOCTOU greps below). Confidence is medium. The chapter should present these as "the code permits", not as an observed failure.
- Absence of acknowledgement: no comment or note found that names the check-then-lock window for `create_document`. The greps (below) over server/, docs/current/, tests/, the P30/P31 phase folders and works/deferred found race wording only for neighbouring cases: the push worker re-taking the lock (docs/current/backend.md L117), the race-safe registry get-or-create (main.py L831; backend.md L71), and the 201 URL read after the upsert, outside the lock (backend.md L132: "a race that inserts a newer duplicate in between can only downgrade the answer to the id URL — the safe direction"). The delete path's documented pattern is the same unlocked-lookup-then-lock (backend.md L91: "It mirrors the `/api` handlers exactly: unlocked lookup, helper takes the lock"). These lines were read via grep output and not hashed.

## Unused leads
- FastAPI docs, "Concurrency and async / await" (path operations declared with plain `def` run in an external threadpool) — a web researcher can confirm that two sync `create_document` calls run concurrently on different threads, which C-r2-code-validate-10 needs for the race to be reachable.
- server/documents.py `insert_recent_bullet` / `update_recent_index` (L446 on) — whether the second racer adds a duplicate Recent bullet was not checked.
- server/documents.py `write_raw_document_file` (L608) — native write path, assumed unconditional like `write_document_file`, not read in full.

## Queries
- `git grep -n -e 'def create_document' -e 'WRITE_LOCK' -e 'def _place_variant' … 9978d84 -- server/main.py` → useful
- `git grep -n -e 'def upsert_document' -e 'UNIQUE' -e 'ON CONFLICT' … 9978d84 -- server/db.py` → useful
- `git grep -n -e '--workers' -e 'workers' -e 'uvicorn' 9978d84 -- Dockerfile …` → useful
- `git show --stat 7c27519` → useful
- `git grep -n -e 'with WRITE_LOCK' -e 'document already exists at' … 7c27519^ -- server/main.py` → useful
- `git grep -n -i -e 'race' -e 'lock' -e 'toctou' -e 'concurren' 7c27519 -- …/P31.S1/plan.md …/result.md` → useful (no race note)
- `git log --reverse -S 'document already exists at' 9978d84 -- server/main.py` → useful (207f2ff)
- `git grep -n -i -E 'toctou|check-then|time-of-check|race-safe|races? (with|against)|concurrent (publish|write)|two (concurrent|simultaneous)' 9978d84 -- server docs/current tests works/phases/active/P31 works/phases/active/P30 works/deferred` → nothing on the documents window
- `git grep -n -e 'with WRITE_LOCK' … 207f2ff -- server/main.py` → useful
- `git grep -n -i -E 'lock' 9978d84 -- docs/current/backend.md` → useful (context, no acknowledgement)
- `git grep -n -e 'raise ' 9978d84 -- server/main.py` → useful (bounds the raises in the lock)
- `git grep -n -e 'def rekey_document' -e 'def find_documents_by_stem' … 9978d84 -- server/db.py` → useful

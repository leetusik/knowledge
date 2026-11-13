# Findings: 20261023-0350-post-api-documents-write-path · round 1 · angle code-write
- researcher: claude-opus-5-5 · status: complete · tool calls: 45

## Questions
- Q4: answered — claims: C-r1-code-write-01, -02, -03, -04, -05, -06, -07, -08, -09, -10, -11 — note: order inside WRITE_LOCK is manifest settle → rekey (migration) → archive + version row → assets → file write → landing/Recent index (public root only) → DB upsert (commits) → manifest write + book rows → scoped git add/commit. "index" in the code's comments means docs/index.md (the Recent list), not a DB index.
- Q5: answered — claims: C-r1-code-write-12, -13, -14, -15, -16, -17 — note: commit only when body.commit AND KB_GIT_COMMIT AND public root; stages an explicit path list, never -A; .assets/ filtered out; message `docs(<project>): add <slug>` or `update <slug> to v<n>`; Co-Authored-By as a second -m; any GitError → committed:false + commit_error, nothing rolled back.
- Q6: answered — claims: C-r1-code-write-18, -19, -20, -21, -22, -23, -24, -25 — note: push queued only when committed AND KB_GIT_PUSH (default false); one lazy daemon worker, FIFO; push task re-takes WRITE_LOCK; fetch → rebase → push, never --force, rebase --abort on failure; every git subprocess capped by KB_GIT_TIMEOUT_S (default 60s); lifespan drains up to 10s on shutdown.
- Q7: answered — claims: C-r1-code-write-26, -27, -28, -20, -18 — note: everything durable (file, DB commit, local git commit) happens before the response; push and Gemini embed are queue appends; the docstring's stated reason is a 5-second client deadline (/explain's curl --max-time 5). See the flag on the "outside the lock" rationale.
- Q8: answered — claims: C-r1-code-write-29, -30, -31, -32 — note: `pushed` is always false in this handler; `push_pending` is the real signal; `commit_error` only present on failure; `assigned_ids`/`warnings`/`migrated_from` only for format native.

## Sources

### S-r1-code-write-01
- repo: /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s7/runs/new-c/knowledge
- commit: 9978d8447ed2c5aaf4a7de2e7e6ed7efc0fae32e · date: 2026-10-23T03:38:43+09:00 · version: n/a
- accessed: 2026-10-23 · read-via: file at HEAD (git status --porcelain -- server printed nothing; HEAD = dispatch commit) · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: the repository's owner (git user leetusik) · upstream: none
- lateral: n/a (local repository)
- passages (each range's excerpt is quoted verbatim in the claim that cites it):
  - P1 · server/main.py:L179-L183 (WRITE_LOCK) · sha 8e309890affad41c
  - P2 · server/main.py:L1302-L1318 (route + docstring) · sha 897a846932a3ab9e
  - P3 · server/main.py:L1371-L1385 (lock entry, manifest settle) · sha 5371877eee1afe37
  - P4 · server/main.py:L1408-L1447 (rekey, archive, version row) · sha 436219d842dfd525
  - P5 · server/main.py:L1448-L1493 (assets, file write) · sha dcc1196d27e59f1a
  - P6 · server/main.py:L1497-L1535 (landing, Recent index, DB upsert) · sha 9db3e2ceaa88869d
  - P7 · server/main.py:L1537-L1557 (manifest write, replace_book) · sha ae5d3fb739d96287
  - P8 · server/main.py:L1559-L1596 (scoped git commit) · sha 02b2255a1298e611
  - P9 · server/main.py:L1598-L1632 (reader sync, after-response submits) · sha dbec68747b9b9e60
  - P10 · server/main.py:L186-L202 (_push_task) · sha cd20b9420b1a6f86
  - P11 · server/main.py:L205-L233 (_embed_task) · sha 0680d552ee4746cd
  - P12 · server/main.py:L88-L97 (lifespan drain) · sha 11e1b90c6f13f860
  - P13 · server/main.py:L1656-L1700 (url, response dict) · sha dbd1a833fd904178
  - P14 · server/main.py:L1701-L1737 (additive keys, metering hint, return) · sha 49bd6577767a4c2f
  - P15 · server/gitops.py:L37-L51 (_run, timeout) · sha 9d9620e9521883b1
  - P16 · server/gitops.py:L59-L69 (add) · sha 75a0b0a9219d88e3
  - P17 · server/gitops.py:L86-L97 (commit) · sha 8e3029570b7365ee
  - P18 · server/gitops.py:L124-L143 (push body) · sha 203fd94cb2e1894e
  - P19 · server/publish.py:L58-L96 (_loop, _ensure_worker, submit) · sha badf7b2e021f886d
  - P20 · server/publish.py:L105-L113 (drain) · sha c8f848fa64bce9a1
  - P21 · server/publish.py:L3-L31 (module docstring: why and shape) · sha 20e43dc2f4c64419
  - P22 · server/config.py:L88-L122 (git_commit_enabled, git_push_enabled, git_timeout_s) · sha 0e555fc55bb33ad0
  - P23 · server/config.py:L193-L195 (embeddings_enabled) · sha 94e9d893a278423a
  - P24 · server/db.py:L345-L376 (upsert_document INSERT … ON CONFLICT, conn.commit) · sha 304924b0f48dfb85
  - P25 · server/documents.py:L894-L913 (archive_document_file) · sha 0e91d55b0d7ec297

## Claims

### C-r1-code-write-01
- claim: In server/main.py at 9978d84, WRITE_LOCK is a single process-wide threading.Lock that serializes the write critical section, and the code's comment states it is sufficient only because the API runs a single uvicorn worker.
- kind: behaviour
- questions: Q4, Q7 · load-bearing: yes (the invariant a developer changing the write path must keep)
- support: S-r1-code-write-01 · server/main.py:L179-L183@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L179–L183):
    # One process-wide lock serializes the whole write critical section (file → index
    # → DB → git). Load-bearing invariant: the API runs a SINGLE uvicorn worker, so an
    # in-process lock is sufficient; never scale to multiple workers. WAL gives reads
    # concurrency regardless.
    WRITE_LOCK = threading.Lock()
  excerpt-sha256 (L179–L183, first 16 hex): 8e309890affad41c
- scope: commit 9978d84; the single-worker claim is the comment's statement about deployment, not checked in deployment config
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-02
- claim: In create_document at 9978d84, the whole locked section begins with `with WRITE_LOCK:` after `_check_document` has returned, and when the request carries a chapter placement the new book manifest is computed first (via `_place_variant`), before any file is touched, so a 409/422 from the manifest leaves nothing written.
- kind: behaviour
- questions: Q4 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1371-L1385@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1371–L1385):
    # 3. Locked critical section: archive -> file write -> index update -> DB upsert
    #    -> LOCAL git add/commit. (WRITE_LOCK is NOT reentrant — nothing called in
    #    here may retake it, which is why the push is queued outside it in 4b.)
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
  excerpt-sha256 (L1371–L1385, first 16 hex): 5371877eee1afe37
- scope: 9978d84; "leaves nothing behind" is the comment's statement; _place_variant itself was not read (owned by neither angle's questions)
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-03
- claim: Inside WRITE_LOCK at 9978d84, a migrated document (migrated_from set) first has its DB row re-keyed to the new rel_path, and then, when a previous version exists, the body about to be replaced is copied to its version archive before being overwritten, and a version row for that superseded body is upserted.
- kind: behaviour
- questions: Q4 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1408-L1447@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1408–L1425, L1431–L1435):
        # 3a. Archive the body about to be replaced, BEFORE it is overwritten, to
        #     <root>/.versions/<project>/<date>-<slug>/vNNNN.<ext>. `None` when
        #     there is nothing on disk to keep (a fresh create, or a DB row whose
        #     file vanished).
        archive_path = None
        if migrated_from is not None:
            # P30.S5: the document's row (and its archived versions) take the new
            # rel_path in place, so its id, URL and version chain carry over.
            db.rekey_document(
                conn, tenant_id=tid, old_rel_path=migrated_from, new_rel_path=rel
            )
        if prev_version is not None:
            # The body being replaced still sits at its own path: the old `.html` on
            # a migration, archived as vNNNN.html in the same stem-keyed directory.
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
  excerpt-sha256 (L1408–L1447, first 16 hex): 436219d842dfd525
- scope: 9978d84; a plain create has prev_version None, so no archive
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-04
- claim: At 9978d84, documents.archive_document_file copies the current on-disk body (with its frontmatter version set) to the archive path and returns that path relative to the content root, or returns None when no file exists at the document's path.
- kind: behaviour
- questions: Q4 · load-bearing: no (detail of the archive step)
- support: S-r1-code-write-01 · server/documents.py:L894-L913@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L905–L913):
    src = Path(docs_root) / rel_path
    if not src.is_file():
        return None
    text = src.read_text(encoding="utf-8")
    arch_rel = archive_rel_path(rel_path, version)
    target = Path(docs_root) / arch_rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(set_frontmatter_version(text, version), encoding="utf-8")
    return arch_rel
  excerpt-sha256 (L894–L913, first 16 hex): 0e91d55b0d7ec297
- scope: 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-05
- claim: Inside WRITE_LOCK at 9978d84, the write's images are stored with assets_mod.store_assets after the archive step and before the document body is written.
- kind: behaviour
- questions: Q4 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1448-L1493@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1448–L1452):
        # 3a+. Store this version's images (P30.S4) under
        #      <root>/.assets/<project>/<date>-<slug>/, before the body that names
        #      them. Content-addressed: identical bytes are stored once, and files an
        #      older version references are never touched. Never staged in git.
        assets_mod.store_assets(root, rel, prepared_assets)
  excerpt-sha256 (L1448–L1493, first 16 hex): dcc1196d27e59f1a
- scope: 9978d84; "content-addressed" is the comment's statement, store_assets not read
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-06
- claim: Inside WRITE_LOCK at 9978d84, a native-format document is written with write_raw_document_file from the parser's normalized source (and the old file at migrated_from is unlinked on a migration), while an md or html document is written with write_document_file, which returns the stored body; for html the DB markdown column gets the extracted text and raw_html the HTML.
- kind: behaviour
- questions: Q4 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1448-L1493@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1458–L1471, L1488–L1493):
        if native is not None:
        …
            documents_mod.write_raw_document_file(
                docs_root=root, rel_path=rel, content=native.source
            )
            native_source = native.source
            raw_html = None
            stored_markdown = search_text(native.tree)
            if migrated_from is not None:
                (root / migrated_from).unlink(missing_ok=True)
        else:
            stored_body = documents_mod.write_document_file(
        …
            if body.format == "html":
                raw_html = stored_body
                stored_markdown = documents_mod.extract_html_text(stored_body)
            else:
                raw_html = None
                stored_markdown = stored_body
  excerpt-sha256 (L1448–L1493, first 16 hex): dcc1196d27e59f1a
- scope: 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-07
- claim: Inside WRITE_LOCK at 9978d84, only when the caller's context is the public root (ctx.is_public) does the write create the project landing page if missing and add or update the document's bullet in the Recent index (docs/index.md); other tenants report landing_created and recent_updated as False.
- kind: behaviour
- questions: Q4, Q8 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1497-L1535@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1497–L1514):
        if ctx.is_public:
            # Auto-create the project landing on a project's first document, so
            # mkdocs builds site/<project>/index.html and the deploy gate stays
            # green. Never overwrites an existing (hand-written or auto) landing.
            landing_created = documents_mod.ensure_project_landing(root, project)
            if migrated_from is not None:
                # The migrated document keeps its Recent bullet; only its link moves.
                documents_mod.replace_recent_link(root, migrated_from, rel)
            recent_updated = documents_mod.update_recent_index(
                root,
                date=date,
                title=body.title,
                rel_path=rel,
                project=project,
            )
        else:
            landing_created = False
            recent_updated = False
  excerpt-sha256 (L1497–L1535, first 16 hex): 9db3e2ceaa88869d
- scope: 9978d84; that update_recent_index writes docs/index.md is inferred from the staged path "docs/index.md" in C-r1-code-write-12, not read in documents.py
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-08
- claim: Inside WRITE_LOCK at 9978d84, after the file and the Recent index are written, db.upsert_document inserts or updates the documents row keyed by (tenant_id, rel_path) and commits the SQLite transaction immediately, returning the row id used as doc_id.
- kind: behaviour
- questions: Q4, Q7 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1497-L1535@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1515–L1519, L1523–L1524):
        doc_id = db.upsert_document(
            conn,
            project=project,
            slug=slug,
            date=date,
        …
            rel_path=rel,
            markdown=stored_markdown,
  excerpt-sha256 (L1497–L1535, first 16 hex): 9db3e2ceaa88869d
- support: S-r1-code-write-01 · server/db.py:L345-L376@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L345–L352, L375–L376):
    conn.execute(
        """
        INSERT INTO documents
          (tenant_id, project, slug, date, title, tags, tags_text, source_repo, rel_path,
           markdown, related, format, raw_html, version, lang, subject, translated_from,
           assets, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(tenant_id, rel_path) DO UPDATE SET
    …
    )
    conn.commit()
  excerpt-sha256 (L345–L376, first 16 hex): 304924b0f48dfb85
- scope: 9978d84; db.py commits per call, so the write path is not one DB transaction spanning all steps (other db helpers' commits seen by grep at db.py L629, L750, not read)
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-09
- claim: Inside WRITE_LOCK at 9978d84, when a book manifest was settled, the manifest file is written (books_mod.write_manifest) and the book's derived DB rows rebuilt (db.replace_book) after the document's DB upsert and before the git commit.
- kind: behaviour
- questions: Q4 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1537-L1557@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1537–L1552):
        # 3b. Bind the variant (P30.S2): write the manifest, then rebuild the book's
        #     derived rows from it — the same replace_book reindex runs.
        manifest_rel = None
        reader_rebound = None  # P30.S8: (project, rel_paths) whose reader unit may change
        if new_manifest is not None:
            manifest_project = project
            if placement is None and migrated_from is not None:
                manifest_project = binding["project"]
            bound_before = reader_state.book_rel_paths(
                conn, tid, manifest_project, new_manifest["slug"]
            )
            manifest_rel = books_mod.write_manifest(root, manifest_project, new_manifest)
            db.replace_book(
                conn, tenant_id=tid, project=manifest_project, manifest=new_manifest,
                manifest_path=manifest_rel,
            )
  excerpt-sha256 (L1537–L1557, first 16 hex): ae5d3fb739d96287
- scope: 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-10
- claim: At 9978d84, the code comment heading the locked section lists its order as archive, file write, index update, DB upsert, then local git add/commit, and the code inside the lock follows that order, with the manifest settle before it and the asset store and manifest write added between.
- kind: behaviour
- questions: Q4 · load-bearing: yes (the order a chapter diagram will draw)
- support: S-r1-code-write-01 · server/main.py:L1371-L1385@9978d84 · rung 1 · fit direct · upstream self (excerpt in C-r1-code-write-02, sha 5371877eee1afe37)
- support: S-r1-code-write-01 · server/main.py:L1408-L1447@9978d84 · rung 1 · fit direct · upstream self (excerpt in C-r1-code-write-03, sha 436219d842dfd525)
- support: S-r1-code-write-01 · server/main.py:L1448-L1493@9978d84 · rung 1 · fit direct · upstream self (excerpt in C-r1-code-write-05/-06, sha dcc1196d27e59f1a)
- support: S-r1-code-write-01 · server/main.py:L1497-L1535@9978d84 · rung 1 · fit direct · upstream self (excerpt in C-r1-code-write-07/-08, sha 9db3e2ceaa88869d)
- support: S-r1-code-write-01 · server/main.py:L1537-L1557@9978d84 · rung 1 · fit direct · upstream self (excerpt in C-r1-code-write-09, sha ae5d3fb739d96287)
- support: S-r1-code-write-01 · server/main.py:L1559-L1596@9978d84 · rung 1 · fit direct · upstream self (excerpt in C-r1-code-write-12, sha 02b2255a1298e611)
- scope: 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-11
- claim: At 9978d84, the reader-unit sync for a book binding (reader_state.sync_units_after_manifest) runs after WRITE_LOCK is released and before the after-response tasks are submitted, and the code comment calls it best-effort.
- kind: behaviour
- questions: Q4, Q7 · load-bearing: no (side step outside the lock)
- support: S-r1-code-write-01 · server/main.py:L1598-L1632@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1598–L1602):
    # 4a. P30.S8: a binding this write made (placement, or the html -> native
    #     re-point) re-writes the readers' `unit` on the documents it touched —
    #     best-effort, outside WRITE_LOCK; reads derive the unit afresh anyway.
    if reader_rebound is not None:
        reader_state.sync_units_after_manifest(conn, tid, *reader_rebound)
  excerpt-sha256 (L1598–L1632, first 16 hex): dbec68747b9b9e60
- scope: 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-12
- claim: At 9978d84, create_document makes a git commit only when the request's `commit` field is true, KB_GIT_COMMIT is enabled and the caller writes to the public root; it stages an explicit list of paths (the document, docs/index.md, the project landing only if this write created it, the archive file if any, the manifest if any), stages the removal of the old file on a migration, and commits with the message `docs(<project>): add <slug>` for version 1 or `docs(<project>): update <slug> to v<version>` otherwise, passing body.co_authored_by.
- kind: behaviour
- questions: Q5 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1559-L1596@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1561–L1596):
        committed = False
        commit_sha = None
        commit_error = None
        # Git publish is a public-root concern only: non-#1 tenants' content lives
        # under the gitignored tenants/ tree and is never committed/pushed.
        if body.commit and config.git_commit_enabled() and ctx.is_public:
            try:
                staged = [f"docs/{rel}", "docs/index.md"]
                if landing_created:
                    # Only staged when this write created it — keeps the scoped
                    # commit to exactly the paths this write touched.
                    staged.append(f"docs/{project}/index.md")
                if archive_path is not None:
                    # The superseded body travels with the repo (public root only),
                    # so tenant #1's version history is in git too.
                    staged.append(f"docs/{archive_path}")
                if manifest_rel is not None:
                    # The book manifest rides in the chapter's own scoped commit.
                    staged.append(f"docs/{manifest_rel}")
                gitops.add(staged, root=config.kb_root())
                if migrated_from is not None:
                    # The old .html file is gone from the work tree (P30.S5).
                    gitops.remove([f"docs/{migrated_from}"], root=config.kb_root())
                message = (
                    f"docs({project}): add {slug}"
                    if doc_version == 1
                    else f"docs({project}): update {slug} to v{doc_version}"
                )
                commit_sha = gitops.commit(
                    message,
                    root=config.kb_root(),
                    co_authored_by=body.co_authored_by,
                )
                committed = True
            except gitops.GitError as exc:
                commit_error = exc.stderr or str(exc)
  excerpt-sha256 (L1559–L1596, first 16 hex): 02b2255a1298e611
- scope: 9978d84; the commit runs in the repository at config.kb_root(), with document paths under docs/
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-13
- claim: At 9978d84, KB_GIT_COMMIT defaults to true (only 0/false/no/off disable it), while KB_GIT_PUSH defaults to false (only 1/true/yes/on enable it), and the docstring says only the hosted box opts into pushing.
- kind: behaviour
- questions: Q5, Q6 · load-bearing: yes
- support: S-r1-code-write-01 · server/config.py:L88-L122@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L88–L103):
    def git_commit_enabled() -> bool:
        """Whether the write path makes a git commit. KB_GIT_COMMIT defaults to true."""
        val = _env("KB_GIT_COMMIT", "true")
        return str(val).strip().lower() not in {"0", "false", "no", "off"}


    def git_push_enabled() -> bool:
        """Whether the write path pushes to origin/main after its scoped commit.

        KB_GIT_PUSH defaults to **false** — local/plugin deployments never push
        (preserves the "agent never pushes locally" convention); only the hosted box
        opts in. Note the inverted default vs git_commit_enabled: truthy-parse, so
        enabled only for an explicit {1, true, yes, on}.
        """
        val = _env("KB_GIT_PUSH", "false")
        return str(val).strip().lower() in {"1", "true", "yes", "on"}
  excerpt-sha256 (L88–L122, first 16 hex): 0e555fc55bb33ad0
- scope: 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-14
- claim: At 9978d84, gitops.add runs `git -C <root> add -- <paths>` on only the given paths and drops any path inside an `.assets` directory before git sees it, so chapter images are never staged.
- kind: behaviour
- questions: Q5 · load-bearing: yes
- support: S-r1-code-write-01 · server/gitops.py:L59-L69@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L59–L69):
    def add(paths: Iterable[str], *, root) -> None:
        """``git -C <root> add -- <paths...>`` — only the given paths, never ``-A``.

        A path inside an ``.assets/`` tree is dropped before git sees it (P30.S4): the
        images live on the box disk only, whatever a caller passes. ``.assets/`` is also
        gitignored, so this is the second of two guards.
        """
        kept = [p for p in paths if _NEVER_STAGED_DIR not in Path(str(p)).parts]
        if not kept:
            return
        _run(["add", "--", *kept], root=root)
  excerpt-sha256 (L59–L69, first 16 hex): 75a0b0a9219d88e3
- scope: 9978d84; the .gitignore guard is the docstring's statement, not checked
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-15
- claim: At 9978d84, gitops.commit runs `git commit -m <message>`, adds a second `-m "Co-Authored-By: <value>"` when co_authored_by is given, and returns the HEAD sha from `git rev-parse HEAD`; it never pushes.
- kind: behaviour
- questions: Q5 · load-bearing: yes
- support: S-r1-code-write-01 · server/gitops.py:L86-L97@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L86–L97):
    def commit(message: str, *, root, co_authored_by: Optional[str] = None) -> str:
        """Commit the staged changes and return the resulting HEAD sha.

        Adds a second ``-m "Co-Authored-By: <value>"`` when ``co_authored_by`` is
        given. "Nothing to commit" surfaces as ``GitError`` (with that reason), not a
        crash. Never pushes.
        """
        args = ["commit", "-m", message]
        if co_authored_by:
            args += ["-m", f"Co-Authored-By: {co_authored_by}"]
        _run(args, root=root)
        return _run(["rev-parse", "HEAD"], root=root).stdout.strip()
  excerpt-sha256 (L86–L97, first 16 hex): 8e3029570b7365ee
- scope: 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-16
- claim: At 9978d84, every git subprocess in gitops runs through _run with a timeout of config.git_timeout_s() (KB_GIT_TIMEOUT_S, default 60 seconds; an unparseable or non-positive value falls back to 60), and both a timeout and a non-zero exit raise GitError carrying the command and stderr.
- kind: behaviour
- questions: Q5, Q6 · load-bearing: yes
- support: S-r1-code-write-01 · server/gitops.py:L37-L51@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L37–L51):
    def _run(args: list[str], *, root, timeout: Optional[float] = None) -> subprocess.CompletedProcess:
        cmd = ["git", "-C", str(root), *args]
        limit = config.git_timeout_s() if timeout is None else timeout
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=limit)
        except subprocess.TimeoutExpired as exc:
            # subprocess.run kills the child before re-raising, so nothing is left
            # running. Same GitError channel as a non-zero exit: callers already
            # treat that as "not published, keep the write".
            raise GitError(cmd, f"timed out after {limit:g}s") from exc
        if proc.returncode != 0:
            # "nothing to commit" and identity/safe.directory failures all land here
            # as a GitError with the reason, never an unhandled crash.
            raise GitError(cmd, proc.stderr or proc.stdout)
        return proc
  excerpt-sha256 (L37–L51, first 16 hex): 9d9620e9521883b1
- support: S-r1-code-write-01 · server/config.py:L88-L122@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L117–L122):
        raw = _env("KB_GIT_TIMEOUT_S", "60")
        try:
            value = float(str(raw))
        except (TypeError, ValueError):
            return 60.0
        return value if value > 0 else 60.0
  excerpt-sha256 (L88–L122, first 16 hex): 0e555fc55bb33ad0
- scope: 9978d84; no call site in create_document passes an explicit timeout
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-17
- claim: At 9978d84, a GitError from the staging, removal or commit step in create_document is caught and recorded as commit_error (the error's stderr, else its message) with committed left False, and the already-written file, DB row and index are not rolled back, so the request still returns 201.
- kind: behaviour
- questions: Q5, Q8 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1559-L1596@9978d84 · rung 1 · fit direct · upstream self (excerpt in C-r1-code-write-12, sha 02b2255a1298e611)
- support: S-r1-code-write-01 · server/main.py:L1302-L1318@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1302, L1311–L1313):
    @app.post("/api/documents", status_code=201)
    …
        """Own the whole write path: convention-exact docs/ file + Recent bullet + DB
        upsert + scoped LOCAL git commit, all under WRITE_LOCK. docs/ stays canonical — a
        failed commit never rolls back the file/DB (responds 201, committed:false).
  excerpt-sha256 (L1302–L1318, first 16 hex): 897a846932a3ab9e
- scope: 9978d84; only gitops.GitError is caught; any other exception type in the block would propagate (not observed to be raised by gitops)
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-18
- claim: At 9978d84, after WRITE_LOCK is released, create_document queues a push task on the publish worker only when the commit succeeded and KB_GIT_PUSH is enabled (setting push_pending True), and queues an embed task whenever embeddings are enabled (a Gemini key is configured), the push submitted before the embed.
- kind: behaviour
- questions: Q6, Q7, Q8 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1598-L1632@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1618–L1632):
    pushed = False
    push_pending = False
    if committed and config.git_push_enabled():
        push_pending = True
        publish.submit(f"push {rel}", _push_task(config.kb_root()))
    if config.embeddings_enabled():
        publish.submit(
            f"embed {rel}",
            _embed_task(
                db_file=config.db_path(),
                doc_id=doc_id,
                title=body.title,
                markdown=stored_markdown,
            ),
        )
  excerpt-sha256 (L1598–L1632, first 16 hex): dbec68747b9b9e60
- support: S-r1-code-write-01 · server/config.py:L193-L195@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L193–L195):
    def embeddings_enabled() -> bool:
        """True when a Gemini key is configured (semantic search participates)."""
        return gemini_api_key() is not None
  excerpt-sha256 (L193–L195, first 16 hex): 94e9d893a278423a
- scope: 9978d84; the embed is queued for every tenant, the push only for a committed (public-root) write
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-19
- claim: At 9978d84, publish.submit lazily starts one daemon worker thread named kb-publish (if none is alive), increments a pending counter and appends (name, task) to a FIFO queue.Queue, returning without waiting; the worker loop takes tasks one at a time, runs each, logs and records any exception without dying, and decrements the counter.
- kind: behaviour
- questions: Q6, Q7 · load-bearing: yes
- support: S-r1-code-write-01 · server/publish.py:L58-L96@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L58–L71, L74–L83, L92–L96):
    def _loop() -> None:
        global _PENDING, _LAST_ERROR
        while True:
            name, task = _QUEUE.get()
            try:
                task()
            except BaseException as exc:  # noqa: BLE001 — the worker must never die
                _LAST_ERROR = f"{name}: {exc}"
                _log(f"{name} FAILED: {exc}")
                traceback.print_exc()
            finally:
                with _COND:
                    _PENDING -= 1
                    _COND.notify_all()
    …
    def _ensure_worker() -> None:
        global _WORKER
        if _WORKER is not None and _WORKER.is_alive():
            return
        with _WORKER_START_LOCK:
            if _WORKER is None or not _WORKER.is_alive():
                _WORKER = threading.Thread(
                    target=_loop, name="kb-publish", daemon=True
                )
                _WORKER.start()
    …
        global _PENDING
        _ensure_worker()
        with _COND:
            _PENDING += 1
        _QUEUE.put((name, task))
  excerpt-sha256 (L58–L96, first 16 hex): badf7b2e021f886d
- scope: 9978d84; the queue (`_QUEUE = queue.Queue()`, L43) is unbounded, so put does not block
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-20
- claim: At 9978d84, the push task built by _push_task captures the KB root at submit time and, when the worker runs it, acquires WRITE_LOCK and calls gitops.push while holding it, so a push and any write's locked section never overlap.
- kind: behaviour
- questions: Q6, Q7 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L186-L202@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L186–L202):
    def _push_task(root: Path):
        """Build the after-response publish task for one write (P24.S1).

        ``root`` is captured at submit time (never re-read from the env in the
        worker). The task re-takes ``WRITE_LOCK`` — the rebase mutates the work tree
        and must not race another write's file write — which is exactly why it is
        submitted from OUTSIDE the lock (``WRITE_LOCK`` is not reentrant) and why
        every git subprocess is bounded by ``KB_GIT_TIMEOUT_S``: a wedged network
        must never hold the process's write lock. A ``GitError`` propagates to the
        worker, which logs it; the local commit stays and publishes on the next push.
        """

        def _task() -> None:
            with WRITE_LOCK:
                gitops.push(root=root)

        return _task
  excerpt-sha256 (L186–L202, first 16 hex): cd20b9420b1a6f86
- scope: 9978d84
- confidence: high · flags: none (see the flag on the "outside the lock" rationale under Speculation and flags)
- conflicts: none

### C-r1-code-write-21
- claim: At 9978d84, gitops.push runs `git fetch origin main`, then `git rebase origin/main`, then `git push origin HEAD:main` (no --force), and returns the post-rebase HEAD sha.
- kind: behaviour
- questions: Q6 · load-bearing: yes
- support: S-r1-code-write-01 · server/gitops.py:L124-L143@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L124–L127, L143):
        try:
            _run(["fetch", remote, branch], root=root)
            _run(["rebase", f"{remote}/{branch}"], root=root)
            _run(["push", remote, f"HEAD:{branch}"], root=root)
    …
        return _run(["rev-parse", "HEAD"], root=root).stdout.strip()
  excerpt-sha256 (L124–L143, first 16 hex): 203fd94cb2e1894e
- scope: 9978d84; remote and branch default to "origin" and "main" (signature at gitops.py L100) and _push_task passes neither
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-22
- claim: At 9978d84, when any of the fetch, rebase or push steps raises GitError (including a timeout), gitops.push runs `git rebase --abort` (itself bounded by the git timeout, its own failure or timeout ignored) and re-raises the original GitError, leaving the local commit in place.
- kind: behaviour
- questions: Q6 · load-bearing: yes
- support: S-r1-code-write-01 · server/gitops.py:L124-L143@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L128–L142):
        except GitError:
            # Best-effort: leave no rebase-in-progress behind. When there is nothing
            # to abort (e.g. fetch failed before any rebase), this is a harmless no-op
            # — swallow its own non-zero exit (and its own timeout) rather than mask
            # the real GitError.
            try:
                subprocess.run(
                    ["git", "-C", str(root), "rebase", "--abort"],
                    capture_output=True,
                    text=True,
                    timeout=config.git_timeout_s(),
                )
            except subprocess.TimeoutExpired:
                pass
            raise
  excerpt-sha256 (L124–L143, first 16 hex): 203fd94cb2e1894e
- scope: 9978d84; "local commit preserved" rests on the absence of any reset or force in the code
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-23
- claim: At 9978d84, a failed background push is not reported to the caller: the GitError propagates out of the push task to the publish worker, which prints `[kb-api] publish: push <rel> FAILED: <error>` with a traceback to stdout and stores it as last_error().
- kind: behaviour
- questions: Q6, Q8 · load-bearing: yes
- support: S-r1-code-write-01 · server/publish.py:L58-L96@9978d84 · rung 1 · fit direct · upstream self (excerpt `_loop` in C-r1-code-write-19, sha badf7b2e021f886d)
- support: S-r1-code-write-01 · server/main.py:L1598-L1632@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1616–L1617):
    #     background push is logged (container log), not reported here: the
    #     response is long gone by then, so `push_error` no longer appears.
  excerpt-sha256 (L1598–L1632, first 16 hex): dbec68747b9b9e60
- scope: 9978d84; the `[kb-api] publish:` prefix comes from _log at publish.py L54-L55 (read, range not hashed separately)
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-24
- claim: At 9978d84, the embed task opens its own SQLite connection from the db path captured at submit time (not the request's connection), embeds the document's title and stored markdown, and upserts the embedding row with a content hash.
- kind: behaviour
- questions: Q7 · load-bearing: no (after-response detail)
- support: S-r1-code-write-01 · server/main.py:L205-L233@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L215–L231):
        def _task() -> None:
            model = config.embedding_model()
            vec = embeddings_mod.embed_texts(
                [embeddings_mod.document_input(title, markdown)], kind="document"
            )[0]
            conn = db.connect(db_file)
            try:
                db.upsert_embedding(
                    conn,
                    doc_id=doc_id,
                    model=model,
                    content_hash=embeddings_mod.content_hash(model, title, markdown),
                    dims=len(vec),
                    vector=embeddings_mod.pack_vector(vec),
                )
            finally:
                conn.close()
  excerpt-sha256 (L205–L233, first 16 hex): 0680d552ee4746cd
- scope: 9978d84; the embed task does not take WRITE_LOCK
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-25
- claim: At 9978d84, on application shutdown the lifespan hook calls publish.drain(timeout=10.0), which waits up to 10 seconds for the pending count to reach zero, and prints how many publish tasks are still pending if it times out; the code comment says anything still pending is dropped and publishes on the next successful push.
- kind: behaviour
- questions: Q6 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L88-L97@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L88–L97):
        yield
        # Give the after-response publish worker a bounded chance to finish its
        # queued push/embed work before the process goes away (P24.S1). Best-effort:
        # anything still pending is dropped, and the doc publishes on the next
        # successful push — docs/ on disk is canonical either way.
        if not publish.drain(timeout=10.0):
            print(
                f"[kb-api] shutdown: {publish.pending()} publish task(s) still pending",
                flush=True,
            )
  excerpt-sha256 (L88–L97, first 16 hex): 11e1b90c6f13f860
- support: S-r1-code-write-01 · server/publish.py:L105-L113@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L105–L113):
    def drain(timeout: float = 30.0) -> bool:
        """Block until every submitted task has finished. ``False`` on timeout.

        For tests (deterministic assertions on the side effect) and the app's
        shutdown hook. Never call this from a request path, and never while holding
        ``WRITE_LOCK`` — a queued push takes that lock.
        """
        with _COND:
            return _COND.wait_for(lambda: _PENDING == 0, timeout=timeout)
  excerpt-sha256 (L105–L113, first 16 hex): c8f848fa64bce9a1
- scope: 9978d84; "dropped" follows from the worker being a daemon thread (C-r1-code-write-19); the dropped work's later publication is the comment's statement
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-26
- claim: At 9978d84, everything create_document does before returning is local: the file write, the committed DB row and the local git commit all complete inside WRITE_LOCK, and the only network work of the write path (the push to origin/main and the Gemini embed) is handed to the publish worker as queue appends, so the 201 does not wait on the network.
- kind: behaviour
- questions: Q7 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1302-L1318@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1315–L1318):
        Nothing in the pre-response path makes a network round-trip (P24.S1): the push
        to origin/main and the Gemini embed are queued on the publish worker and run
        after the 201 is written, so a caller's timeout budget only ever covers local
        work (see step 4b)."""
  excerpt-sha256 (L1302–L1318, first 16 hex): 897a846932a3ab9e
- support: S-r1-code-write-01 · server/main.py:L1559-L1596@9978d84 · rung 1 · fit direct · upstream self (local commit only; sha 02b2255a1298e611)
- support: S-r1-code-write-01 · server/main.py:L1598-L1632@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1604–L1612):
    # 4b. AFTER-RESPONSE publish work (P24.S1). Everything above is durable: the
    #     file is on disk, the DB transaction is committed, the local commit is
    #     made. What remains — the push to origin/main (fetch + rebase + push:
    #     two SSH round-trips) and the Gemini embed — is publish/side-effect work
    #     whose result never appears in the response, so it must not spend the
    #     caller's timeout budget. Both are queued on the single publish worker
    #     (FIFO, serialized) and run after this handler returns; submitting is a
    #     queue append, and it happens OUTSIDE WRITE_LOCK because the push task
    #     re-takes that lock (it is not reentrant).
  excerpt-sha256 (L1598–L1632, first 16 hex): dbec68747b9b9e60
- support: S-r1-code-write-01 · server/publish.py:L58-L96@9978d84 · rung 1 · fit direct · upstream self (submit returns after a put; sha badf7b2e021f886d)
- scope: 9978d84; "no network in the pre-response path" holds for the code read here (lock section, gitops add/commit are local git). The pre-lock validation (_check_document) and the auth dependencies belong to the code-validate angle and were not checked by this angle; the usage-metering middleware awaits a Postgres write after call_next (main.py L122–L129, read, not hashed), which is outside this angle
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-27
- claim: The publish module's docstring at 9978d84 states that before P24 the push (fetch, rebase, push, with no subprocess timeout) and the Gemini embed ran before the 201, so a client with a short deadline, such as /explain posting with `curl --max-time 5`, saw a transport failure for a write that had already landed, and that the module moves that work behind the response.
- kind: fact
- questions: Q7 · load-bearing: yes (the "why" behind the design; attributed to the docstring)
- support: S-r1-code-write-01 · server/publish.py:L3-L31@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L3–L10):
    Why this exists. ``POST /api/documents`` used to do two *network* stages between
    the durable save (file + DB commit) and the 201 it writes: ``gitops.push``
    (``git fetch`` → ``git rebase`` → ``git push`` — two SSH round-trips to GitHub,
    and until P24 with no subprocess timeout at all) and the Gemini embed. Both are
    publish/side-effect work whose result never appears in the response, yet both
    spent the caller's timeout budget — so a client with a short deadline (``/explain``
    posts with ``curl --max-time 5``) saw a transport failure for a write that had
    already landed. This module moves that work behind the response.
  excerpt-sha256 (L3–L31, first 16 hex): 20e43dc2f4c64419
- scope: the docstring's own account at 9978d84; the history angle owns confirming it against P24's commits and notes
- confidence: medium (a docstring's history claim, not checked against git history by this angle) · flags: none
- conflicts: none

### C-r1-code-write-28
- claim: The publish module's docstring at 9978d84 gives the reasons for a single worker with a FIFO queue rather than Starlette BackgroundTasks: the request thread never waits, pushes stay serialized (never two concurrent rebases, one push per write in submit order), and making "the response never waits" a property of the code rather than of the ASGI middleware ordering.
- kind: fact
- questions: Q7, Q6 · load-bearing: no (design rationale, attributed)
- support: S-r1-code-write-01 · server/publish.py:L3-L31@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L12–L22):
    Shape: **one process-wide daemon worker thread + a FIFO queue**, started lazily on
    the first submit. Deliberate properties:

    * **The request thread never waits on it.** ``submit`` only appends to a queue;
      the handler returns its 201 immediately. (Starlette ``BackgroundTasks`` would
      also run after the handler, but ordering against the ``BaseHTTPMiddleware``
      metering in the stack is subtle — a queue makes "the response never waits" a
      property of the code, not of the ASGI stack.)
    * **Pushes stay serialized.** One worker, FIFO — never two concurrent rebases,
      and one push per write in submit order (coalescing is a possible future
      optimization, not needed for correctness).
  excerpt-sha256 (L3–L31, first 16 hex): 20e43dc2f4c64419
- scope: the docstring's account at 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-29
- claim: At 9978d84, the 201 response of POST /api/documents always contains id, rel_path, url, title, project, slug, date, tags, related, format, version, previous_version, archived_path, recent_updated, landing_created, committed, commit_sha, pushed and push_pending, and contains commit_error only when the git commit step failed.
- kind: behaviour
- questions: Q8 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1656-L1700@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1667–L1700):
    resp = {
        "id": doc_id,
        "rel_path": rel,
        "url": url,
        "title": body.title,
        "project": project,
        "slug": slug,
        "date": date,
        "tags": tags,
        "related": related,
        "format": body.format,
        # Versioning (P23, additive). `version` is what this write published;
        # `previous_version`/`archived_path` describe the body it superseded (both
        # null on a plain create). `date`/`slug` above are the TARGET's on a version
        # bump, not the request's — the rel_path never moves.
        "version": doc_version,
        "previous_version": prev_version,
        "archived_path": archive_path,
        "recent_updated": recent_updated,
        "landing_created": landing_created,
        "committed": committed,
        # The LOCAL commit this request made. Since P24 the rebase happens after
        # the response, so this is no longer necessarily the published (post-
        # rebase) head — see `push_pending`.
        "commit_sha": commit_sha,
        # Unchanged meaning ("saved; publishes on the next successful push"), and
        # now always false when a push was deferred rather than skipped.
        "pushed": pushed,
        # Additive (P24): a push to origin/main was QUEUED and runs right after
        # this response. The document is already durably saved either way.
        "push_pending": push_pending,
    }
    if commit_error is not None:
        resp["commit_error"] = commit_error
  excerpt-sha256 (L1656–L1700, first 16 hex): dbd1a833fd904178
- scope: 9978d84; status code 201 from the decorator at L1302 (C-r1-code-write-17)
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-30
- claim: At 9978d84, create_document initialises `pushed` to False and never reassigns it, so the response's `pushed` is always false; whether a push was queued is reported by `push_pending`, and commit_sha is the local, pre-rebase commit, which the background rebase may rewrite.
- kind: behaviour
- questions: Q8, Q7 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1598-L1632@9978d84 · rung 1 · fit direct · upstream self (L1618 `pushed = False`; excerpt in C-r1-code-write-18, sha dbec68747b9b9e60)
- support: S-r1-code-write-01 · server/main.py:L1656-L1700@9978d84 · rung 1 · fit direct · upstream self (excerpt in C-r1-code-write-29, sha dbd1a833fd904178)
- support: S-r1-code-write-01 · server/gitops.py:L124-L143@9978d84 · rung 1 · fit direct · upstream self (rebase before push; sha 203fd94cb2e1894e)
- scope: 9978d84; "never reassigns" checked by reading the whole handler L1302–L1737
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-31
- claim: At 9978d84, the response url is, in tenant mode, the pretty `<public base>/@<org>/<project>/<slug>` when the tenant has an org slug and the newest document under that slug is the row just written, otherwise `<public base>/documents/<id>`; in legacy single-tenant mode it is the mkdocs URL `<public base>/<project>/<date>-<slug>/`.
- kind: behaviour
- questions: Q8 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1656-L1700@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1656–L1666):
    if ctx.tenant_id is not None:
        canonical = None
        if org_slug:
            latest = db.find_latest_document_by_slug(
                conn, project, slug, tenant_id=_tenant_filter(ctx)
            )
            if latest is not None and latest["id"] == doc_id:
                canonical = f"{config.public_base_url()}/@{org_slug}/{project}/{slug}"
        url = canonical or f"{config.public_base_url()}/documents/{doc_id}"
    else:
        url = f"{config.public_base_url()}/{project}/{date}-{slug}/"
  excerpt-sha256 (L1656–L1700, first 16 hex): dbd1a833fd904178
- scope: 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-32
- claim: At 9978d84, only a native-format publish adds assigned_ids (the ids the server wrote into the stored file), warnings (non-fatal findings) and migrated_from (the old rel_path of an html-to-native migration, else null) to the response; a write that sent assets adds the stored asset map, and a write that used a book field adds book, chapter_key, lang, translated_from, subject, book_created, chapter_created and manifest_path.
- kind: behaviour
- questions: Q8 · load-bearing: yes
- support: S-r1-code-write-01 · server/main.py:L1701-L1737@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1701–L1723):
    # P30.S5, additive: only a native publish gets these keys. `assigned_ids` lists the
    # ids the server wrote into the stored file and `warnings` the non-fatal findings
    # (an unresolved chapter:/doc: link, a translation's id drift), both with lines
    # in the body as sent; `migrated_from` is the old rel_path of an html -> native
    # migration (null otherwise).
    if body.format == "native":
        resp["assigned_ids"] = native_assigned
        resp["warnings"] = native_warnings
        resp["migrated_from"] = migrated_from
    # P30.S4, additive: only a write that sent assets gets the stored map back.
    if body.assets:
        resp["assets"] = asset_map
    # P30.S2, additive: only a write that sent a book field gets these keys, so a
    # plain loose publish answers exactly the pre-P30 shape.
    if _uses_book_fields(body):
        resp["book"] = placement["book"]["slug"] if placement else None
        resp["chapter_key"] = placement["chapter"]["key"] if placement else None
        resp["lang"] = placement["lang"] if placement else header_lang
        resp["translated_from"] = translated_from
        resp["subject"] = subject
        resp["book_created"] = book_created
        resp["chapter_created"] = chapter_created
        resp["manifest_path"] = manifest_rel
  excerpt-sha256 (L1701–L1737, first 16 hex): 49bd6577767a4c2f
- scope: 9978d84; how native_assigned/native_warnings are computed belongs to _check_document (code-validate angle)
- confidence: high · flags: none
- conflicts: none

### C-r1-code-write-33
- claim: At 9978d84, just before returning the response, create_document stores a UsageHint for a document-created event on request.state.usage, which the usage-metering middleware records after the handler has produced the response.
- kind: behaviour
- questions: Q7 · load-bearing: no (after-response side effect outside the publish worker)
- support: S-r1-code-write-01 · server/main.py:L1701-L1737@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1727–L1737):
    request.state.usage = UsageHint(
        tenant_id=ctx.tenant_id,
        event_type=EVENT_DOCUMENT_CREATED,
        project_name=project,
    …
        credential_id=ctx.credential_id,
    )
    return resp
  excerpt-sha256 (L1701–L1737, first 16 hex): 49bd6577767a4c2f
- scope: 9978d84; the middleware (main.py L107–L130) awaits record_usage after call_next and only for 2xx with a tenant id; that range was read but not hashed
- confidence: medium · flags: none
- conflicts: none

## Conflicts
- none

## Speculation and flags
- C-r1-code-write-20 / C-r1-code-write-26: the code's stated reason for submitting the push "OUTSIDE WRITE_LOCK because the push task re-takes that lock (it is not reentrant)" (main.py L1611–L1612; also L192, L1372–L1373, publish.py L25). On reading, the task runs on the separate kb-publish thread, and submit only appends to a queue, so a submit made inside the lock would make the worker wait for the lock rather than deadlock the request thread; the non-reentrancy hazard bites if the task (or `publish.drain`, per publish.py L109–L110) ran on the request thread while it holds the lock. This is the researcher's reading, not a source's statement; not settled. A verifier or the writer should not restate the rationale beyond what the comments say without checking.
- Interpretation, not a claim: since every git subprocess (fetch, rebase, push, then rebase --abort on failure) is bounded by KB_GIT_TIMEOUT_S separately, a wedged push could hold WRITE_LOCK for several multiples of the timeout (each step up to 60 s by default), during which new writes block in `with WRITE_LOCK:`; no source states this bound.
- C-r1-code-write-27: a history claim inside a docstring ("until P24 with no subprocess timeout at all", "curl --max-time 5"); the history angle should confirm against P24's commits.
- C-r1-code-write-08: db.upsert_document commits on its own call; the locked section is therefore a sequence of individually committed steps, not one transaction. A failure midway (e.g. in replace_book) would leave earlier steps committed; not traced further.

## Unused leads
- server/main.py `_place_variant` and `_read_manifest_or_409` — the manifest settle step inside the lock (409/422 paths); not read.
- server/assets.py `store_assets` — content addressing of images; not read.
- server/documents.py `update_recent_index`, `ensure_project_landing`, `write_raw_document_file` (L608, L643, L687) — the Recent index and landing writes; not read.
- server/main.py L107–L130 usage_metering middleware — after-response Postgres write; awaits inside the request's ASGI cycle.
- P24.S1 phase/slice notes (works/phases archive) — the origin of the publish worker; for the history angle.

## Queries
- Read server/main.py L1–L240, L1300–L1743 → useful
- Read server/publish.py, server/gitops.py (whole) → useful
- grep config.py "def git_push_enabled|git_commit_enabled|git_timeout_s|embeddings_enabled" → useful
- grep db.py "def upsert_document|conn.commit()|upsert_document_version|rekey_document" → useful
- grep documents.py "def archive_document_file|write_document_file|…" → useful
- Read db.py L289–L378, documents.py L488–L527 and L894–L943, config.py L117–L126 → useful
- git show 9978d84:<path> | sed -n 'a,bp' | shasum -a 256 for 25 ranges → hashes

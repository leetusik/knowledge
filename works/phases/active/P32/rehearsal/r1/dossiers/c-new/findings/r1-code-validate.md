# Findings: 20261023-0350-post-api-documents-write-path · round 1 · angle code-validate
- researcher: claude-opus-5-5 · status: failed: permissions (every Bash call was denied, so `git rev-parse`, `git status --porcelain -- server` and the excerpt hash could not run; the code was read with Read from the working tree, see the caveat below) · tool calls: 18

**Caveat for the lead and the verifier.** Bash was denied on its first two calls (`git -C <repo> rev-parse HEAD`, `git -C <repo> status --porcelain -- server`). I did not retry them or route around them. The ranges below were read with Read from the checked-out working tree. The session-start snapshot the host supplied says the branch is a detached `HEAD` whose latest commit is `9978d84`, with a clean status. That matches the dispatch commit, but git never confirmed it during this run. For that reason every `excerpt-sha256` below reads `not computed (Bash denied)`. A verifier must check each range against `git show 9978d84:<path>` and compute the hashes.

## Questions
- Q1: answered — claims: C-r1-code-validate-01, -02, -03, -04, -05, -06, -07, -08, -09, -10, -11, -12, -13, -14, -15, -16, -17, -18, -19, -20, -21, -22, -23, -24, -30 — note: auth runs as FastAPI dependencies (`resolve_api_write`, not `require_bearer`). After that, `_check_document` runs every check in a fixed order before the handler takes `WRITE_LOCK`.
- Q2: answered — claims: C-r1-code-validate-03, -06, -09, -12, -15, -17, -18, -19, -20, -22, -25, -27, -28, -29, -30, -31 — note: 401 comes from auth. Validation raises string 422s, list 422s and 409s, plus a malformed-manifest 409. `_check_document` writes nothing. One exception: in tenant mode the `ensure_registry_project` dependency may get-or-create a Postgres registry project row before the handler runs, even when the handler then 409s or 422s.
- Q3: answered — claims: C-r1-code-validate-25, -26, -27, -28 — note: `/api/documents/check` calls the same `_check_document` and then `_place_variant` (which only builds the manifest) without `WRITE_LOCK`. It also drops the `ensure_registry_project` and `resolve_org_slug` dependencies and the usage hint, and answers 200 `{ok: true, rel_path, version, …}`.

## Sources

### S-r1-code-validate-01
- repo: /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s7/runs/new-c/knowledge
- commit: 9978d8447ed2c5aaf4a7de2e7e6ed7efc0fae32e (short 9978d84) · date: not read (git denied); latest commit per the session snapshot
- accessed: 2026-10-23 · read-via: Read on the working tree (HEAD and a clean status per the session-start snapshot; not re-verified with git, which was denied) · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: the repository's owner (git user leetusik) · upstream: none
- lateral: n/a (a local repository)
- passages: the ranges cited in the claims below (server/main.py, server/api_auth.py, server/documents.py, server/books.py, server/assets.py, server/native_ingest.py, server/native/errors.py, server/native/parse.py)

## Claims

### C-r1-code-validate-01
- claim: At commit 9978d84, `POST /api/documents` is the sync handler `create_document`, status 201. Its parameters are a `DocumentIn` body, a `Request`, and four dependencies: `resolve_api_write` (auth context), `ensure_registry_project`, `resolve_org_slug` and `get_conn` (a per-request SQLite connection).
- kind: behaviour
- questions: Q1 · load-bearing: yes (the entry point and what runs before the handler body)
- support: S-r1-code-validate-01 · server/main.py:L1302-L1310@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1302–L1310):
    @app.post("/api/documents", status_code=201)
    def create_document(
        body: DocumentIn,
        request: Request,
        ctx: ApiAuthContext = Depends(resolve_api_write),
        registry_project_id: UUID | None = Depends(ensure_registry_project),
        org_slug: str | None = Depends(resolve_org_slug),
        conn=Depends(get_conn),
    ):
  excerpt-sha256 (L1302–L1310, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L236-L242@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L236–L242):
    def get_conn():
        """Per-request SQLite connection (closed after the response)."""
        conn = db.connect()
        try:
            yield conn
        finally:
            conn.close()
  excerpt-sha256 (L236–L242, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-02
- claim: At commit 9978d84, `resolve_api_write` (server/api_auth.py) has two modes. In legacy mode (no `DATABASE_URL`) it returns the shared legacy context with no check when `KB_API_TOKEN` is unset. When the token is set, it requires the exact header `Authorization: Bearer <token>` and raises a 401 otherwise.
- kind: behaviour
- questions: Q1, Q2 · load-bearing: yes (the auth step and its 401)
- support: S-r1-code-validate-01 · server/api_auth.py:L190-L204@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L190, L197–L204):
    async def resolve_api_write(request: Request) -> ApiAuthContext:
    …
        if not _tenant_mode():
            # LEGACY: identical semantics to require_bearer.
            token = config.api_token()
            if token is None:
                return _LEGACY
            if request.headers.get("Authorization") != f"Bearer {token}":
                raise _unauth()
            return _LEGACY
  excerpt-sha256 (L190–L204, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/api_auth.py:L83-L85@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L83–L85):
    def _tenant_mode() -> bool:
        """Tenant mode is on iff the accounts plane is configured (DATABASE_URL set)."""
        return config.database_url() is not None
  excerpt-sha256 (L83–L85, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/api_auth.py:L118-L130@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L126–L130):
        return HTTPException(
            status_code=401,
            detail="missing or invalid bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
  excerpt-sha256 (L118–L130, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84; legacy mode = `DATABASE_URL` unset
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-03
- claim: At commit 9978d84, `resolve_api_write` in tenant mode (`DATABASE_URL` set) takes the bearer token and resolves it in order. The pinned master `KB_API_TOKEN` maps to tenant #1, a `vk_` credential maps to its own tenant (and its bound project, if any), and a session token maps to the user's first tenant. A missing or unresolvable bearer is a 401. The resolver then sets `is_public` to true only for tenant #1 (or no tenant).
- kind: behaviour
- questions: Q1, Q2 · load-bearing: yes (the tenant that scopes every later lookup)
- support: S-r1-code-validate-01 · server/api_auth.py:L206-L214@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L206–L214):
        # TENANT: any resolvable credential (master / vk_ / session) authorizes a write.
        token = extract_bearer_token(request)
        if token is None:
            raise _unauth()
        ctx = await _resolve_tenant_bearer(token)
        if ctx is None:
            raise _unauth()
        ctx.is_public = (ctx.tenant_id is None) or (ctx.tenant_id == await get_tenant_one_id())
        return ctx
  excerpt-sha256 (L206–L214, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/api_auth.py:L133-L187@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L142–L149, L156–L159, L178–L185, L187):
        # 1. Pinned master: an exact KB_API_TOKEN -> tenant #1, the tenant owned by
        #    the operator (looked up by KB_OPERATOR_EMAIL). This is the un-revokable
        #    legacy bearer, NOT a DB credential — so the live hi2vi agent is unchanged.
        api_token = config.api_token()
        if api_token is not None and token == api_token:
            tenant_one = await get_tenant_one_id()
            if tenant_one is not None:
                return ApiAuthContext(tenant_id=tenant_one)
    …
        # 2. vk_ credential -> its own tenant (org-scoped authorization). The
        #    credential's tenant_id is always set (S18.S1 schema); the project binding
        #    only carries project_id for attribution and is NULL for an org-level key.
        cred = await service.get_active_credential_by_token_hash(token_hash)
    …
        # 3. Session token -> the user's first tenant (own-corpus reads/writes).
        auth_token = await service.get_active_auth_token_by_hash(token_hash)
        if auth_token is not None:
            user = await service.get_user_by_id(auth_token.user_id)
            if user is not None:
                tenants = await service.list_tenants_for_user(user.id)
                if tenants:
                    return ApiAuthContext(tenant_id=tenants[0].id)
    …
        return None
  excerpt-sha256 (L133–L187, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84; tenant mode
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-04
- claim: At commit 9978d84, `create_document` does not depend on `require_bearer` (server/main.py), which guards only `POST /api/reindex`. The write path's auth is `resolve_api_write`, whose module docstring says its legacy mode reproduces `require_bearer` byte-for-byte.
- kind: fact
- questions: Q1 · load-bearing: no (corrects the dispatch's naming; the auth behaviour is in -02/-03)
- support: S-r1-code-validate-01 · server/main.py:L245-L255@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L245, L251–L255):
    def require_bearer(authorization: Optional[str] = Header(default=None)) -> None:
    …
        token = config.api_token()
        if token is None:
            return
        if authorization != f"Bearer {token}":
            raise HTTPException(status_code=401, detail="missing or invalid bearer token")
  excerpt-sha256 (L245–L255, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L522-L526@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L522–L526):
    @app.post("/api/reindex")
    async def reindex(
        body: Optional[ReindexIn] = None,
        _: None = Depends(require_bearer),
    ):
  excerpt-sha256 (L522–L526, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/api_auth.py:L5-L9@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L5–L9):
    - **Legacy mode** (``DATABASE_URL`` unset — today's single-tenant deployment):
      ``resolve_api_write`` / ``resolve_api_read`` reproduce the old
      ``require_bearer`` / ``require_read_bearer`` guards **byte-for-byte**. They
      return the shared ``_LEGACY`` context (``tenant_id=None``), and every existing
      bearer/read-auth test passes unchanged.
  excerpt-sha256 (L5–L9, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-05
- claim: At commit 9978d84, three helpers in server/main.py derive the caller's tenant from the `ApiAuthContext`. `_tenant_root` gives the content root on disk: `docs/` for a public caller (legacy or tenant #1), else `<KB_ROOT>/tenants/<uuid>/`. `_tenant_db_id` gives the value stamped on writes: `''` in legacy mode, else the uuid. `_tenant_filter` gives the value that scopes reads: `None` in legacy mode, else the uuid.
- kind: behaviour
- questions: Q1 · load-bearing: yes (every validation lookup is tenant-scoped through these)
- support: S-r1-code-validate-01 · server/main.py:L323-L341@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L323, L327–L329, L332, L335, L338, L341):
    def _tenant_root(ctx: ApiAuthContext) -> Path:
    …
        if ctx.is_public:
            return config.docs_root()
        return config.kb_root() / "tenants" / str(ctx.tenant_id)
    def _tenant_db_id(ctx: ApiAuthContext) -> str:
    …
        return str(ctx.tenant_id) if ctx.tenant_id is not None else ""
    def _tenant_filter(ctx: ApiAuthContext) -> Optional[str]:
    …
        return str(ctx.tenant_id) if ctx.tenant_id is not None else None
  excerpt-sha256 (L323–L341, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-06
- claim: At commit 9978d84, the `ensure_registry_project` dependency of `POST /api/documents` returns `None` in legacy mode. In tenant mode, when the project name is valid, it get-or-creates the tenant's Postgres registry `projects` row. Its docstring says it runs before the handler and that "the row may be created even when the handler then 409s".
- kind: behaviour
- questions: Q2 · load-bearing: yes (the one write that can happen before validation fails)
- support: S-r1-code-validate-01 · server/main.py:L815-L844@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L815–L819, L825–L826, L832–L833, L837–L844):
    async def ensure_registry_project(
        body: DocumentIn,
        ctx: ApiAuthContext = Depends(resolve_api_write),
    ) -> UUID | None:
        """Get-or-create the Postgres registry project for a write's project name.
    …
        body with the handler and caches ``resolve_api_write`` per request, so this runs
        exactly once, before the handler.
    …
        ``UNIQUE(tenant_id, name)``. The row may be created even when the handler then
        409s (target already exists) — harmless and idempotent. Returns the registry
    …
        if ctx.tenant_id is None:
            return None
        try:
            project = documents_mod.validate_project(body.project)
        except documents_mod.ConventionError:
            return None
        record = await get_accounts_service().get_or_create_project(ctx.tenant_id, project)
        return record.id
  excerpt-sha256 (L815–L844, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84; tenant mode only
- confidence: high (code) · flags: none
- conflicts: none

### C-r1-code-validate-07
- claim: At commit 9978d84, the `DocumentIn` request model requires `title`, `markdown`, `project`, `tags` and `source_repo`. `format` is `Literal["md", "html", "native"]` (default `"md"`). The other fields are optional with defaults: `date`, `slug`, `related`, `summary`, `overwrite` (False), `new_version` (False), `rel_path`, `commit` (True), `co_authored_by`, `book`, `chapter`, `lang`, `translated_from`, `subject` and `assets`. The nested models `BookRefIn`, `ChapterRefIn`, `TranslatedFromIn` and `AssetIn` set `extra="forbid"`; `DocumentIn` itself sets no `model_config`.
- kind: definition
- questions: Q1 · load-bearing: yes (the request shape the validators read)
- support: S-r1-code-validate-01 · server/main.py:L590-L636@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L590, L594–L601, L608, L610–L611, L620–L623, L629–L633, L636):
    class DocumentIn(BaseModel):
    …
        title: str
        markdown: str
        project: str
        tags: list[str]
        source_repo: str
        date: Optional[str] = None
        slug: Optional[str] = None
        related: list[str] = []
    …
        format: Literal["md", "html", "native"] = "md"
    …
        summary: Optional[str] = None
        overwrite: bool = False
    …
        new_version: bool = False
        rel_path: Optional[str] = None
        commit: bool = True
        co_authored_by: Optional[str] = None
    …
        book: Optional[BookRefIn] = None
        chapter: Optional[ChapterRefIn] = None
        lang: Optional[str] = None
        translated_from: Optional[TranslatedFromIn] = None
        subject: Optional[str] = None
    …
        assets: Optional[list[AssetIn]] = None
  excerpt-sha256 (L590–L636, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L542-L587@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L542, L550, L559, L564, L572–L573, L579, L583):
    class BookRefIn(BaseModel):
    …
        model_config = ConfigDict(extra="forbid")
    class ChapterRefIn(BaseModel):
    …
        model_config = ConfigDict(extra="forbid")
    class TranslatedFromIn(BaseModel):
        model_config = ConfigDict(extra="forbid")
    class AssetIn(BaseModel):
    …
        model_config = ConfigDict(extra="forbid")
  excerpt-sha256 (L542–L587, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-08
- claim: At commit 9978d84, `create_document`'s first statement is `_check_document(body, ctx, conn)`; the comment calls it "the one path the dry run shares". The handler takes `WRITE_LOCK` only after `_check_document` has returned.
- kind: behaviour
- questions: Q1, Q3 · load-bearing: yes (the validate-then-lock order)
- support: S-r1-code-validate-01 · server/main.py:L1319-L1320@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1319–L1320):
        # 1-2c. Validate (P31.S1: the one path the dry run shares, `_check_document`).
        checked = _check_document(body, ctx, conn)
  excerpt-sha256 (L1319–L1320, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L1371-L1374@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1371–L1374):
        # 3. Locked critical section: archive -> file write -> index update -> DB upsert
        #    -> LOCAL git add/commit. (WRITE_LOCK is NOT reentrant — nothing called in
        #    here may retake it, which is why the push is queued outside it in 4b.)
        with WRITE_LOCK:
  excerpt-sha256 (L1371–L1374, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-09
- claim: At commit 9978d84, `_check_document` step 1 runs the field validators in this order: project, tags, date (default today), slug (default `slugify(title)`), related, chapter placement, `lang`, `subject` and `translated_from`. It then checks that `translated_from.lang` differs from the document's lang, that `summary` is sent only with `format: "native"`, and that `summary` is non-empty. Any `ConventionError` among them becomes a 422 whose detail is the error string.
- kind: behaviour
- questions: Q1, Q2 · load-bearing: yes (the first validation stage and its string 422)
- support: S-r1-code-validate-01 · server/main.py:L950-L987@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L950–L966, L980–L987):
        # 1. Validate (S1 validators). ConventionError -> 422. Defaults: date=today,
        #    slug=slugify(title).
        try:
            project = documents_mod.validate_project(body.project)
            tags = documents_mod.validate_tags(body.tags)
            date = (
                documents_mod.validate_date(body.date)
                if body.date
                else datetime.date.today().isoformat()
            )
            slug = documents_mod.validate_slug(
                body.slug if body.slug else documents_mod.slugify(body.title)
            )
            related = documents_mod.validate_related(body.related)
            # P30.S2 (additive): chapter placement + the optional header fields. All
            # None for a write that sends none of them -> today's loose path exactly.
            placement = _validated_placement(body)
    …
            if body.summary is not None and body.format != "native":
                raise documents_mod.ConventionError(
                    "summary is a native chapter's header field: send it with format \"native\""
                )
            if body.summary is not None and not body.summary.strip():
                raise documents_mod.ConventionError("summary must be a non-empty string")
        except documents_mod.ConventionError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
  excerpt-sha256 (L950–L987, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-10
- claim: At commit 9978d84, the server/documents.py validators enforce these rules. A project matches `^[A-Za-z0-9][A-Za-z0-9._-]*$` with no `..` or `/`. Tags are a list of 2–5 lowercase-kebab items. A date is `YYYY-MM-DD` and a real calendar date. A slug uses the tag charset. A related entry is a relative path with at least 2 parts, no `..`, ending `.md` or `.html`, and duplicates are dropped. `slugify` lowercases, collapses runs of non-alphanumerics to `-`, caps at 80 characters and falls back to `untitled`.
- kind: behaviour
- questions: Q1 · load-bearing: no (detail of the step-1 rules)
- support: S-r1-code-validate-01 · server/documents.py:L34-L86@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L34–L37, L42–L45, L49–L55, L63–L64, L73–L74, L80–L85):
    _PROJECT_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
    _TAG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")  # also the slug charset
    _DATE_FMT_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    _SLUG_MAX = 80
    …
        s = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")
        if len(s) > _SLUG_MAX:
            s = s[:_SLUG_MAX].rstrip("-")
        return s or "untitled"
    …
        if (
            not isinstance(project, str)
            or not _PROJECT_RE.fullmatch(project)
            or ".." in project
            or "/" in project
        ):
            raise ConventionError(f"invalid project: {project!r}")
    …
        if not (2 <= len(tags) <= 5):
            raise ConventionError(f"tags must have 2-5 items, got {len(tags)}")
    …
        if not isinstance(slug, str) or not _TAG_RE.fullmatch(slug):
            raise ConventionError(f"invalid slug: {slug!r}")
    …
        if not isinstance(date, str) or not _DATE_FMT_RE.fullmatch(date):
            raise ConventionError(f"invalid date (expected YYYY-MM-DD): {date!r}")
        try:
            datetime.date.fromisoformat(date)
        except ValueError:
            raise ConventionError(f"invalid date (not a real date): {date!r}")
  excerpt-sha256 (L34–L86, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/documents.py:L97-L128@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L113–L124):
        if p.is_absolute():
            raise ConventionError(f"related entry must be relative: {r!r}")
        if ".." in p.parts:
            raise ConventionError(f"related entry must not contain '..': {r!r}")
        if len(p.parts) < 2:
            raise ConventionError(
                f"related entry must have at least 2 path parts: {r!r}"
            )
        if not (r.endswith(".md") or r.endswith(".html")):
            raise ConventionError(
                f"related entry must end with .md or .html: {r!r}"
            )
  excerpt-sha256 (L97–L128, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-11
- claim: At commit 9978d84, `_validated_placement` returns `None` for a loose document (neither `book` nor `chapter`). It raises `ConventionError` (a 422) when only one of the two is sent, and when `book.kind` is `subject` without a `book.subject`. Otherwise it returns a dict of the validated book (slug, title, kind, subject, description), chapter (key, position, title, source) and `lang` (default `en`).
- kind: behaviour
- questions: Q1 · load-bearing: yes (the placement part of validation)
- support: S-r1-code-validate-01 · server/main.py:L647-L684@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L653–L665, L683):
        if body.book is None and body.chapter is None:
            return None
        if body.book is None or body.chapter is None:
            raise documents_mod.ConventionError(
                "book and chapter go together: send both to place a chapter, or neither "
                "for a loose document"
            )
        b, c = body.book, body.chapter
        kind = books_mod.validate_kind(b.kind) if b.kind is not None else None
        subject = books_mod.validate_subject(b.subject)
        if kind == "subject" and subject is None:
            raise documents_mod.ConventionError("a subject book needs book.subject")
        return {
    …
            "lang": books_mod.validate_lang(body.lang) if body.lang is not None else books_mod.DEFAULT_LANG,
  excerpt-sha256 (L647–L684, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/books.py:L56-L93@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L56, L60, L64, L91–L92):
    _KEY_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
    …
    _LANG_RE = re.compile(r"^[a-z]{2,3}$")
    …
    DEFAULT_LANG = "en"
    …
        if kind not in BOOK_KINDS:
            raise ConventionError(f"invalid book kind: {kind!r} (expected codebase|subject)")
  excerpt-sha256 (L56–L93, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-12
- claim: At commit 9978d84, `_check_document` next collects content violations into one list of `{line, col, code, message}`. These are the body size limit (any format), an `asset-format` entry when a non-native document sends `assets`, and every asset failure from `prepare_assets`. For a non-native format, a non-empty list is raised at once as a 422 with the list as detail. For `native`, the list is kept to join the parser's violations later.
- kind: behaviour
- questions: Q1, Q2 · load-bearing: yes (the list-shaped 422 and its timing)
- support: S-r1-code-validate-01 · server/main.py:L997-L1015@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L997–L1015):
        violations: list[dict] = native_ingest.body_limit_violations(body.format, body.markdown)
        body_too_large = bool(violations)
        prepared_assets: list = []
        if body.assets:
            if body.format != "native":
                violations.append({
                    "line": 0, "col": 0, "code": "asset-format",
                    "message": f"only a native chapter can carry assets, not an {body.format} document",
                })
            else:
                try:
                    prepared_assets = assets_mod.prepare_assets(
                        [a.model_dump() for a in body.assets]
                    )
                except assets_mod.AssetError as exc:
                    violations.extend(exc.to_detail())
        if violations and body.format != "native":
            raise HTTPException(status_code=422, detail=violations)
        asset_map = assets_mod.asset_map(prepared_assets)
  excerpt-sha256 (L997–L1015, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/native_ingest.py:L43-L65@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L43–L47, L56–L65):
    BODY_LIMITS = {
        "md": 512 * 1024,
        "html": 1024 * 1024,
        "native": native_schema.MAX_BODY_BYTES,
    }
    …
    def body_limit_violations(fmt: str, body: Optional[str]) -> list[dict]:
        """``[body-too-large]`` when the body is over its format's limit, else ``[]``."""
        size = len((body or "").encode("utf-8"))
        limit = BODY_LIMITS[fmt]
        if size <= limit:
            return []
        return [{
            "line": 0, "col": 0, "code": "body-too-large",
            "message": f"a {fmt} body is at most {limit // 1024} KB; this one is {size} bytes",
        }]
  excerpt-sha256 (L43–L65, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84; the native limit is `native_schema.MAX_BODY_BYTES` (the module docstring, L8, calls it P29's 512 KB; the constant itself was not opened)
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-13
- claim: At commit 9978d84, `prepare_assets` validates, strips and hashes images in memory only; its docstring says "nothing touches disk, so it runs before the write lock". The checks cover name, duplicates, media type, base64, the 2 MB per-image, 20-image and 12 MB total limits, magic bytes, a Pillow decode, the 40 MP pixel cap, the animated-GIF-only rule and a lossless strip. All failures are collected into one `AssetError`. Storing the bytes is a separate function, `store_assets`, documented as "Call inside ``WRITE_LOCK``".
- kind: behaviour
- questions: Q2 · load-bearing: yes (asset validation writes nothing before an error)
- support: S-r1-code-validate-01 · server/assets.py:L59-L64@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L59–L61, L64):
    MAX_IMAGE_BYTES = 2 * 1024 * 1024
    MAX_IMAGES = 20
    MAX_TOTAL_BYTES = 12 * 1024 * 1024
    …
    MAX_PIXELS = 40_000_000
  excerpt-sha256 (L59–L64, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/assets.py:L464-L472@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L464–L472):
    def prepare_assets(items: Optional[list]) -> list[PreparedAsset]:
        """Validate, strip and hash every asset of one publish, or raise ``AssetError``.

        ``items`` is a list of ``{name, media_type, content_base64}`` mappings (the
        request's shape). Pure: nothing touches disk, so it runs before the write lock.
        """
        if not items:
            return []
        violations: list[dict] = []
  excerpt-sha256 (L464–L472, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/assets.py:L589-L595@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L589–L595):
        if total > MAX_TOTAL_BYTES:
            violations.append(_violation(
                "asset-total", f"{total} bytes of images; at most {MAX_TOTAL_BYTES} per publish", None
            ))
        if violations:
            raise AssetError(violations)
        return prepared
  excerpt-sha256 (L589–L595, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/assets.py:L711-L716@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L711–L716):
    def store_assets(root: Union[str, Path], rel_path: str, prepared: list[PreparedAsset]) -> int:
        """Store every prepared asset (and still) under the document's directory.

        Call inside ``WRITE_LOCK``. Identical bytes are stored once (the file name is
        their hash). Returns how many files were newly written.
        """
  excerpt-sha256 (L711–L716, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84; the body of `prepare_assets` (L473–L588) was read and contains no file write (it calls only in-memory decode, strip and hash helpers)
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-14
- claim: At commit 9978d84, after content validation `_check_document` computes `rel = <project>/<date>-<slug>.<ext>`, with `.html` for `format: "html"` and `.md` for md and native. It then sanitizes `source_repo` (a local path collapses to its basename; a URL passes through) and resolves `root = _tenant_root(ctx)` and `tid = _tenant_db_id(ctx)`.
- kind: behaviour
- questions: Q1 · load-bearing: yes (the computed path every later check tests)
- support: S-r1-code-validate-01 · server/main.py:L1017-L1025@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1017–L1019, L1024–L1025):
        rel = documents_mod.rel_path(project, date, slug, fmt=body.format)
        # Sanitize source_repo: local paths → basename, URLs pass through unchanged.
        source_repo = documents_mod.sanitize_source_repo(body.source_repo)
    …
        root = _tenant_root(ctx)
        tid = _tenant_db_id(ctx)
  excerpt-sha256 (L1017–L1025, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/documents.py:L89-L94@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L93–L94):
        ext = "html" if fmt == "html" else "md"
        return f"{project}/{date}-{slug}.{ext}"
  excerpt-sha256 (L89–L94, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-15
- claim: At commit 9978d84, for a placed chapter `_check_document` reads the book manifest from disk. A malformed manifest is a 409. A book that does not exist yet with no `book.kind` is a 422. A `rel_path` that conflicts with the chapter's already-bound variant is a 422. A bound variant becomes the version target, so the publish is that document's next version whatever `new_version` says.
- kind: behaviour
- questions: Q1, Q2 · load-bearing: yes (placement's errors before the lock)
- support: S-r1-code-validate-01 · server/main.py:L1037-L1068@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1037–L1047, L1053–L1068):
        target = None
        if placement is not None:
            existing = _read_manifest_or_409(root, project, placement["book"]["slug"])
            if existing is None and placement["book"]["kind"] is None:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"book {placement['book']['slug']!r} does not exist yet: "
                        "book.kind is required to create it"
                    ),
                )
    …
            bound = ch["variants"].get(placement["lang"]) if ch is not None else None
            if bound is not None:
                if body.rel_path and body.rel_path != bound:
                    raise HTTPException(
                        status_code=422,
                        detail=(
                            f"rel_path {body.rel_path} conflicts with chapter "
                            f"{placement['chapter']['key']!r} ({placement['lang']}), "
                            f"which is bound to {bound}"
                        ),
                    )
                # A binding whose document row is gone (drift) resolves to nothing and
                # falls through to a fresh create, which is then re-bound.
                target = db.get_document_by_path_or_alias(
                    conn, bound, tenant_id=_tenant_filter(ctx)
                )
  excerpt-sha256 (L1037–L1068, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L687-L696@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L687–L696):
    def _read_manifest_or_409(root: Path, project: str, slug: str) -> Optional[dict]:
        """The book's current manifest (``None`` = no such book yet); a malformed one on
        disk is a 409 — the write refuses to build on a manifest it cannot read."""
        try:
            return books_mod.read_manifest(root, project, slug)
        except documents_mod.ConventionError as exc:
            raise HTTPException(
                status_code=409,
                detail=f"book manifest {books_mod.manifest_rel_path(project, slug)} is invalid: {exc}",
            )
  excerpt-sha256 (L687–L696, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/books.py:L281-L299@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L287–L294):
        path = Path(root) / manifest_rel_path(project, slug)
        if not path.is_file():
            return None
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ConventionError(f"unreadable book manifest {path.name}: {exc}")
        manifest = normalize_manifest(raw, project=project)
  excerpt-sha256 (L281–L299, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84; only when `book` and `chapter` are sent
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-16
- claim: At commit 9978d84, when placement did not already resolve a target, `_resolve_version_target` runs. It returns `None` unless `new_version` is true. With a `rel_path` it looks that path up (the stem alias included). Otherwise it takes the newest document matching `(project, slug)`. Both lookups are scoped to the caller's tenant, and a miss is not an error: the write falls back to a plain v1 create at the computed `rel_path`.
- kind: behaviour
- questions: Q1 · load-bearing: yes (version-target resolution)
- support: S-r1-code-validate-01 · server/main.py:L1069-L1070@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1069–L1070):
        if target is None:
            target = _resolve_version_target(conn, ctx, body, project=project, slug=slug)
  excerpt-sha256 (L1069–L1070, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L868-L904@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L881–L884, L897–L904):
        * **Explicit** — ``rel_path`` in the request names the target directly. It is
          looked up as-is; a miss (no such document) is NOT an error, it simply falls
          back to a plain v1 create at the request's own computed rel_path, so an agent
          that guessed wrong still publishes instead of 404ing.
    …
        if not body.new_version:
            return None
        tenant = _tenant_filter(ctx)
        if body.rel_path:
            # The stem alias (P30.S5): naming a migrated document by its old .html path
            # still finds it.
            return db.get_document_by_path_or_alias(conn, body.rel_path, tenant_id=tenant)
        return db.find_latest_document_by_slug(conn, project, slug, tenant_id=tenant)
  excerpt-sha256 (L868–L904, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-17
- claim: At commit 9978d84, a resolved version target is refused with a 422 when the request changes its format, except `md→native` and `html→native`, or changes its project. Otherwise the write takes the target's `rel_path`, `date` and `slug`, overriding the request's.
- kind: behaviour
- questions: Q1, Q2 · load-bearing: yes (the version-target 422s)
- support: S-r1-code-validate-01 · server/main.py:L1075-L1104@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1081–L1086, L1093–L1095, L1102–L1104):
            target_format = target.get("format") or "md"
            if target_format != body.format and (target_format, body.format) not in (
                ("md", "native"), ("html", "native"),
            ):
                raise HTTPException(
                    status_code=422,
    …
            if target["project"] != project:
                raise HTTPException(
                    status_code=422,
    …
            rel = target["rel_path"]
            date = target["date"]
            slug = target["slug"]
  excerpt-sha256 (L1075–L1104, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-18
- claim: At commit 9978d84, a native publish onto an html target is a format migration. `migrated_from` is set to the old `.html` rel_path and `rel` moves to `<stem>.md`. A 409 is raised when another document's row, or a stray file with no row, already occupies `<stem>.md`.
- kind: behaviour
- questions: Q1, Q2 · load-bearing: yes (a 409 in validation)
- support: S-r1-code-validate-01 · server/main.py:L1105-L1123@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1105–L1116):
            if target_format == "html" and body.format == "native":
                migrated_from = rel
                rel = f"{db.rel_path_stem(rel)}.md"
                # The native file's place must be free: another document (or a stray
                # file) at <stem>.md would otherwise be overwritten.
                occupant = db.get_document_by_path(conn, rel, tenant_id=_tenant_filter(ctx))
                if (occupant is not None and occupant["id"] != target["id"]) or (
                    occupant is None and (root / rel).exists()
                ):
                    raise HTTPException(
                        status_code=409,
  excerpt-sha256 (L1105–L1123, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-19
- claim: At commit 9978d84, when `overwrite` is false and no version target was resolved, `_check_document` raises a 409 if a file exists at `root/rel` or the tenant's DB has a row at `rel`. When there is a row, the 409 detail adds `id`, `existing_title`, `version` and a `hint` to re-publish with `"new_version": true, "rel_path": "<rel>"`.
- kind: behaviour
- questions: Q1, Q2 · load-bearing: yes (the main 409)
- support: S-r1-code-validate-01 · server/main.py:L1128-L1148@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1131–L1137, L1143–L1148):
        if not body.overwrite and target is None:
            existing_row = db.get_document_by_path(conn, rel, tenant_id=_tenant_filter(ctx))
            if (root / rel).exists() or existing_row is not None:
                detail = {"message": f"document already exists at {rel}", "rel_path": rel}
                if existing_row is not None:
                    detail["id"] = existing_row["id"]
                    detail["existing_title"] = existing_row["title"]
    …
                    detail["version"] = existing_row.get("version") or 1
                    detail["hint"] = (
                        "re-publish as the next version: POST again with "
                        f'"new_version": true, "rel_path": "{rel}"'
                    )
                raise HTTPException(status_code=409, detail=detail)
  excerpt-sha256 (L1128–L1148, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-20
- claim: At commit 9978d84, when no version target was resolved, `_check_document` raises a 409 if another document in the tenant already uses the same file stem (`<project>/<date>-<slug>`) under a different `rel_path`. This is checked even with `overwrite: true`; the detail carries a re-publish hint.
- kind: behaviour
- questions: Q1, Q2 · load-bearing: yes (the second 409)
- support: S-r1-code-validate-01 · server/main.py:L1150-L1176@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1155–L1166):
        if target is None:
            stem = db.rel_path_stem(rel)
            for other in db.find_documents_by_stem(conn, stem, tenant_id=_tenant_filter(ctx)):
                if other["rel_path"] == rel:
                    continue
                raise HTTPException(
                    status_code=409,
                    detail={
                        "message": (
                            f"{other['rel_path']} already uses the file stem {stem}; "
                            "a document's stem is its identity across formats"
                        ),
  excerpt-sha256 (L1150–L1176, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-21
- claim: At commit 9978d84, `_check_document` numbers the version without writing. `superseded` is the target, or with `overwrite` the row at `rel`. `prev_version` comes from that row, or from the file's own `version:` header when only a file exists (`read_document_version`, a read), else `None`. `doc_version` is `prev_version + 1`, or 1.
- kind: behaviour
- questions: Q1 · load-bearing: no (the numbers the dry run reports)
- support: S-r1-code-validate-01 · server/main.py:L1183-L1192@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1183–L1192):
        superseded = target
        if superseded is None and body.overwrite:
            superseded = db.get_document_by_path(conn, rel, tenant_id=_tenant_filter(ctx))
        if superseded is not None:
            prev_version: Optional[int] = int(superseded.get("version") or 1)
        elif body.overwrite:
            prev_version = documents_mod.read_document_version(root, rel)
        else:
            prev_version = None
        doc_version = prev_version + 1 if prev_version is not None else 1
  excerpt-sha256 (L1183–L1192, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/documents.py:L834-L861@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L844–L848):
        path = Path(docs_root) / rel_path
        if not path.is_file():
            return None
        try:
            lines = path.read_text(encoding="utf-8").split("\n")
  excerpt-sha256 (L834–L861, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-22
- claim: At commit 9978d84, for `format: "native"` `_check_document` composes the full file in memory with `native_file_content` (the server's header plus the body; the function writes nothing). It reserves the ids of the document's earlier native versions and parses the file with `parse_chapter`. It then adds the parse violations, unknown-asset references, reference-resolution errors and translation quiz-id errors to the earlier content list, with file lines remapped to body lines, and raises one 422 with the whole list when it is non-empty.
- kind: behaviour
- questions: Q1, Q2 · load-bearing: yes (the native grammar stage)
- support: S-r1-code-validate-01 · server/main.py:L1199-L1274@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1202–L1203, L1218–L1227, L1241, L1250, L1263, L1270, L1273–L1274):
        if body.format == "native":
            content, offset = documents_mod.native_file_content(
    …
            reserved = (
                native_ingest.retired_ids(conn, superseded, tenant_id=_tenant_filter(ctx))
                if superseded is not None
                else set()
            )
            if not body_too_large:
                try:
                    native = parse_chapter(content, reserved_ids=reserved)
                except NativeFormatError as exc:
                    violations.extend(native_ingest.remap_lines(exc.to_detail(), offset))
    …
                errors, warns = native_ingest.resolve_refs(
    …
                violations.extend(native_ingest.remap_lines(errors, offset))
    …
                    errors, warns = native_ingest.translation_findings(
    …
                    violations.extend(errors)
    …
            if violations:
                raise HTTPException(status_code=422, detail=violations)
  excerpt-sha256 (L1199–L1274, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/documents.py:L560-L605@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L580–L584, L603–L605):
        alone. Returns ``(content, body_offset)``: the file to hand to
        ``server.native.parse_chapter``, and how many file lines precede the body's first
        line (so a violation's file line maps back to the line of the body the caller
        sent). Nothing is written here: the parser's ``.source`` (ids written in) is what
        ``write_raw_document_file`` stores.
    …
        content = header + "\n" + _normalize_body(body)
        # header lines + the blank separator line, minus the leading blanks dropped.
        return content, header.count("\n") + 1 - leading
  excerpt-sha256 (L560–L605, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84; native only. When the body is already over the limit, the parse is skipped and the 422 carries `body-too-large` (L1223).
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-23
- claim: At commit 9978d84, the native parser `parse_chapter` collects violations as it goes and raises a single `NativeFormatError` listing every violation, sorted by line, column and code. Its `to_detail()` is the list of `{line, col, code, message[, block, element, attribute]}` dicts that ingest puts in the 422.
- kind: behaviour
- questions: Q1 · load-bearing: yes (why native failures are one list)
- support: S-r1-code-validate-01 · server/native/errors.py:L34-L48@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L34–L40, L47–L48):
    class NativeFormatError(ValueError):
        """The chapter violates the native format. Never stripped: rejected."""

        def __init__(self, violations: list[Violation]):
            if not violations:
                raise ValueError("NativeFormatError needs at least one violation")
            self.violations = sorted(violations, key=lambda v: (v.line, v.col, v.code))
    …
        def to_detail(self) -> list[dict]:
            return [v.to_dict() for v in self.violations]
  excerpt-sha256 (L34–L48, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/native/parse.py:L122-L156@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L131–L133, L151–L156):
            lines = text.split("\n")
            summary = self.header(lines)
            self.errors.raise_if_any()
    …
            self.assign()
            for target, line, block in self.id_refs:
                if target not in self.ids:
                    self.report(line, "ref-missing-id", f"#{target} names no id in this chapter",
                                **({"block": block} if block else {}))
            self.errors.raise_if_any()
  excerpt-sha256 (L122–L156, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84. The parser stops early at a few checkpoints: NUL, size, header errors and nesting depth (L124–L141). "Every violation" therefore means every violation up to the stage that failed.
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-24
- claim: At commit 9978d84, `native_ingest.resolve_refs` treats an `asset:` name that is not one of this publish's assets as an error (`ref-unknown-asset`, part of the 422). A `chapter:` or `doc:` reference that resolves to nothing is only a warning (`ref-unresolved`), and the publish's own chapter and slug count as resolved.
- kind: behaviour
- questions: Q1 · load-bearing: no (detail of the native stage)
- support: S-r1-code-validate-01 · server/native_ingest.py:L187-L229@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L201–L218):
        errors: list[dict] = unknown_assets(asset_uses(result), asset_names)
        warnings: list[dict] = []
        for ref in result.refs:
            kind = ref.get("kind")
            line = int(ref.get("line") or 0)
            if kind == "chapter":
                proj = ref.get("project") or project
                if self_chapter == (proj, ref["book"], ref["key"]):
                    continue
                if not db.chapter_variant_exists(
                    conn, tenant_id=tenant_id, project=proj, book=ref["book"], key=ref["key"],
                    lang=ref.get("lang"),
                ):
                    warnings.append(_finding(
                        line, "ref-unresolved",
                        f"{ref['href']} names no chapter yet; it renders as a missing link "
                        "until that chapter is published",
                    ))
  excerpt-sha256 (L187–L229, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-25
- claim: At commit 9978d84, the docstring of `_check_document` states that it is the one validation path shared by `POST /api/documents` and its dry run `POST /api/documents/check`. It also states that it raises the publish's own exceptions with the same bodies in the same order, and that it "only reads": "no lock, no file, no row, no commit, and nothing on the accounts plane".
- kind: behaviour
- questions: Q2, Q3 · load-bearing: yes (the no-write invariant of validation)
- support: S-r1-code-validate-01 · server/main.py:L938-L948@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L938–L948):
    def _check_document(body: DocumentIn, ctx: ApiAuthContext, conn) -> _CheckedWrite:
        """Validate a write exactly as ``POST /api/documents`` does, writing nothing (P31.S1).

        The one validation path shared by the publish and its dry run
        (``POST /api/documents/check``), so the two cannot drift: it raises the publish's
        own ``HTTPException``s (the string 422s, the one list 422, the 409s) with the same
        bodies, in the same order, and otherwise returns what the write needs. It only
        reads (the validators, the manifest on disk, the SQLite index) — no lock, no file,
        no row, no commit, and nothing on the accounts plane, so a project that does not
        exist yet in the registry is simply one a publish would create.
        """
  excerpt-sha256 (L938–L948, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84. This docstring is the code's own statement. Reading the body (L950–L1299) supports it: the only calls are validators, `db.get_*`/`find_*` lookups, the manifest read (C-15), `prepare_assets` (C-13), `native_file_content` (C-22), `read_document_version` (C-21) and the parser. The `db.*` helpers themselves were not opened (see Unused leads).
- confidence: high for the files and commits; medium for "no row" in SQLite, since the `db.*` lookup helpers were not read · flags: none
- conflicts: none

### C-r1-code-validate-26
- claim: At commit 9978d84, `POST /api/documents/check` (`check_document`) takes the same `DocumentIn` body and the same `resolve_api_write` auth, but not `ensure_registry_project` or `resolve_org_slug`. It calls `_check_document` and, for a placed chapter, `_place_variant`, outside `WRITE_LOCK`. It returns 200 with `ok: true` plus `rel_path`, `version`, `previous_version`, `format`, `project`, `slug` and `date`; native adds `warnings` and `migrated_from`, and placement adds `book`, `chapter_key`, `lang`, `book_created` and `chapter_created`.
- kind: behaviour
- questions: Q3 · load-bearing: yes (how the dry run reuses validation)
- support: S-r1-code-validate-01 · server/main.py:L1740-L1793@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1740–L1745, L1757–L1760, L1763–L1781, L1782, L1787):
    @app.post("/api/documents/check")
    def check_document(
        body: DocumentIn,
        ctx: ApiAuthContext = Depends(resolve_api_write),
        conn=Depends(get_conn),
    ):
    …
        It never writes: no ``WRITE_LOCK``, no file, row, manifest, asset or commit, no
        ``ensure_registry_project`` get-or-create (a project not yet in the registry is
        one a publish would create), and no ``request.state.usage`` — a check is not
        metered.
    …
        checked = _check_document(body, ctx, conn)
        book_created = chapter_created = None
        if checked.placement is not None:
            # The binding refusals a publish meets under its lock (P30.S2), read here
            # without it: ``_place_variant`` only builds the manifest, it never writes.
            _, book_created, chapter_created = _place_variant(
                conn, root=checked.root, project=checked.project, tid=checked.tid,
                placement=checked.placement, rel=checked.rel, replaces=checked.migrated_from,
            )
        resp: dict[str, Any] = {
            "ok": True,
            "rel_path": checked.rel,
            "version": checked.doc_version,
            "previous_version": checked.prev_version,
            "format": body.format,
            "project": checked.project,
            "slug": checked.slug,
            "date": checked.date,
        }
        if body.format == "native":
    …
        if checked.placement is not None:
  excerpt-sha256 (L1740–L1793, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-27
- claim: At commit 9978d84, `_place_variant` builds the new manifest in memory and writes nothing. It re-reads the manifest (a malformed one is a 409). A missing book with no `kind` is a 422. A 409 is raised when `rel` is already a different chapter or language in this book, when the index binds `rel` to a chapter in another book, or when the `(chapter, lang)` slot is bound to a different live document. A normalization failure is a 422. The publish runs it first under `WRITE_LOCK`, before any file is touched; the dry run runs it without the lock.
- kind: behaviour
- questions: Q2, Q3 · load-bearing: yes (errors that only `_place_variant` raises, which the dry run also reports)
- support: S-r1-code-validate-01 · server/main.py:L699-L812@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L709–L716, L746–L748, L757–L762, L792–L798, L807–L812):
        """Build the manifest that binds ``rel`` as the placement's variant (no write).

        Runs INSIDE ``WRITE_LOCK``, before any file is touched, so every refusal leaves
        nothing behind: it re-reads the manifest (the authoritative copy) and 409s when
        this ``(chapter, lang)`` is already bound to a different document, or when ``rel``
        already belongs to a different chapter — in this book or, through the index, in
        another (P29: a document is in at most one chapter). A new book needs
        ``book.kind`` (422). Returns ``(manifest, book_created, chapter_created)``.
    …
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
        return manifest, book_created, chapter_created
  excerpt-sha256 (L699–L812, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L1374-L1385@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1374–L1385):
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
  excerpt-sha256 (L1374–L1385, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84. The write steps after L1385 belong to the code-write angle.
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-28
- claim: At commit 9978d84, the HTTP middleware `usage_metering` records a usage event only when a handler stashed a `UsageHint`, the response is 2xx and the hint has a `tenant_id`. A 401, 409 or 422 raised during validation is therefore never metered, and `check_document` never stashes a hint.
- kind: behaviour
- questions: Q2, Q3 · load-bearing: no (side effects of a refused or dry-run request)
- support: S-r1-code-validate-01 · server/main.py:L107-L130@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L122–L130):
        response = await call_next(request)
        hint = getattr(request.state, "usage", None)
        if (
            hint is not None
            and hint.tenant_id is not None
            and 200 <= response.status_code < 300
        ):
            await record_usage(hint)  # best-effort; never raises
        return response
  excerpt-sha256 (L107–L130, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L1727-L1737@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1727–L1729):
        request.state.usage = UsageHint(
            tenant_id=ctx.tenant_id,
            event_type=EVENT_DOCUMENT_CREATED,
  excerpt-sha256 (L1727–L1737, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-29
- claim: At commit 9978d84, a comment on `DocumentIn.format` says a bad `format` value "gets a free 422 from the Literal", meaning a Pydantic request-validation 422 raised by FastAPI before the handler runs.
- kind: behaviour
- questions: Q2 · load-bearing: no (a fourth source of 422, attributed to the comment; FastAPI's own error shape was not checked)
- support: S-r1-code-validate-01 · server/main.py:L602-L608@9978d84 · rung 1 · fit partial · upstream self
  excerpt (L602–L604, L608):
        # Additive (default "md" — existing callers unchanged). "html" ingests a
        # self-contained explainer: the `markdown` field carries the raw HTML body, and
        # a bad value gets a free 422 from the Literal. Pydantic v2 forbids by default.
    …
        format: Literal["md", "html", "native"] = "md"
  excerpt-sha256 (L602–L608, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84. The order of a body-validation 422 relative to the dependency-raised 401 is FastAPI's behaviour and was not verified here.
- confidence: medium · flags: none
- conflicts: none

### C-r1-code-validate-30
- claim: At commit 9978d84, `_check_document` raises its errors in this source order: (1) the string 422s from the field validators; (2) the list 422 of content violations, for md and html only; (3) the placement manifest 409 and 422s; (4) the version-target format and project 422s and the migration 409; (5) the already-exists 409; (6) the file-stem 409; (7) for native, the one list 422 of size, asset, grammar, reference and translation violations. A request that fails several checks therefore gets only the first stage's error.
- kind: behaviour
- questions: Q1, Q2 · load-bearing: yes (the order a developer must preserve)
- support: S-r1-code-validate-01 · server/main.py:L986-L987@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L986–L987):
        except documents_mod.ConventionError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
  excerpt-sha256 (L986–L987, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L1013-L1014@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1013–L1014):
        if violations and body.format != "native":
            raise HTTPException(status_code=422, detail=violations)
  excerpt-sha256 (L1013–L1014, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L1038-L1063@9978d84 · rung 1 · fit direct · upstream self (see C-15)
  excerpt (L1038–L1039):
        if placement is not None:
            existing = _read_manifest_or_409(root, project, placement["book"]["slug"])
  excerpt-sha256 (L1038–L1063, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L1081-L1123@9978d84 · rung 1 · fit direct · upstream self (see C-17, C-18)
  excerpt (L1081):
            target_format = target.get("format") or "md"
  excerpt-sha256 (L1081–L1123, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L1131-L1148@9978d84 · rung 1 · fit direct · upstream self (see C-19)
  excerpt (L1131):
        if not body.overwrite and target is None:
  excerpt-sha256 (L1131–L1148, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L1155-L1176@9978d84 · rung 1 · fit direct · upstream self (see C-20)
  excerpt (L1155):
        if target is None:
  excerpt-sha256 (L1155–L1176, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L1273-L1274@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1273–L1274):
            if violations:
                raise HTTPException(status_code=422, detail=violations)
  excerpt-sha256 (L1273–L1274, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84; the publish path; `_place_variant`'s 409s and 422s come after all of these (C-27)
- confidence: high · flags: none
- conflicts: none

### C-r1-code-validate-31
- claim: At commit 9978d84, a refused publish can leave behind only one write made before the handler body: in tenant mode, the Postgres registry `projects` row that `ensure_registry_project` get-or-creates (C-06). `_check_document` itself takes no lock and makes no file, asset, manifest, archive or commit (C-25, C-13, C-22). `_place_variant`, the first step under `WRITE_LOCK`, raises before any file is touched (C-27).
- kind: interpretation
- questions: Q2 · load-bearing: yes (the answer to "is anything made before the errors")
- support: S-r1-code-validate-01 · server/main.py:L815-L844@9978d84 · rung 1 · fit direct · upstream self (C-06)
  excerpt (L843):
        record = await get_accounts_service().get_or_create_project(ctx.tenant_id, project)
  excerpt-sha256 (L815–L844, first 16 hex): not computed (Bash denied)
- support: S-r1-code-validate-01 · server/main.py:L938-L948@9978d84 · rung 1 · fit direct · upstream self (C-25)
  excerpt (L944–L946):
        own ``HTTPException``s (the string 422s, the one list 422, the 409s) with the same
        bodies, in the same order, and otherwise returns what the write needs. It only
        reads (the validators, the manifest on disk, the SQLite index) — no lock, no file,
  excerpt-sha256 (L938–L948, first 16 hex): not computed (Bash denied)
- scope: commit 9978d84. `get_conn` → `db.connect()` was not opened. If it applies the idempotent `CREATE TABLE IF NOT EXISTS` schema (db.py L18–L21), that is a schema step, not a document row; unverified.
- confidence: medium (composed from code claims; the `db.*` helpers and `get_or_create_project` were not opened) · flags: none
- conflicts: none

## Conflicts
- none

## Speculation and flags
- C-r1-code-validate-04: the dispatch names `require_bearer` as the write path's auth dependency, but at 9978d84 `create_document` depends on `resolve_api_write`. `require_bearer` guards only `/api/reindex`.
- C-r1-code-validate-29: the comment "Pydantic v2 forbids by default" sits next to `format`, yet `DocumentIn` sets no `model_config` (unlike its nested models). Whether unknown top-level keys are ignored or rejected is Pydantic's default and was not verified here.
- C-r1-code-validate-27: the dry run calls `_place_variant` without `WRITE_LOCK`. A concurrent publish could therefore change the answer between the check and the publish; this is an inference, not stated by the code.
- All excerpt hashes: not computed, because Bash (the hash command) was denied.

## Unused leads
- server/db.py (`connect`, `get_document_by_path`, `get_document_by_path_or_alias`, `find_latest_document_by_slug`, `find_documents_by_stem`, `find_chapter_binding`, `chapter_variant_exists`, `list_document_versions`) — opening them would confirm that the validation lookups are pure SELECTs and whether `connect()` runs DDL.
- server/accounts/service.py `get_or_create_project` — would confirm the registry write's race-safety claim (C-06).
- server/native/schema.py `MAX_BODY_BYTES`, and server/native/parse.py `parse_chapter` (the signature taking `reserved_ids`) — the native limit and the parser's entry point.
- FastAPI dependency and body-validation ordering (a 401 from `resolve_api_write` versus a Pydantic 422 on a bad body; `ensure_registry_project` also takes `body`) — a web researcher should check FastAPI's docs for how `solve_dependencies` orders them.
- tests/ for `/api/documents/check` and the 409 hint shape — would corroborate C-19, C-20 and C-26.

## Queries
- Read server/main.py L1290–L1429 (create_document entry) → useful
- Read server/main.py L860–L1299 (_resolve_version_target, _CheckedWrite, _check_document) → useful
- Read server/main.py L1–L860 (deps, tenant helpers, DocumentIn, _validated_placement, _place_variant, ensure_registry_project) → useful
- Read server/main.py L1725–L1814 (check_document) → useful
- Read server/api_auth.py → useful
- Read server/native_ingest.py, server/assets.py → useful
- Read server/documents.py L1–L936 → useful
- Read server/books.py L1–L330 → useful
- Read server/native/__init__.py, errors.py, parse.py L1–L160 → useful
- Read server/db.py L1–L120 → nothing new (schema only)
- git rev-parse HEAD; git status --porcelain -- server → denied (Bash)

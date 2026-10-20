# P30.S4 result — Image assets (server + web relay)

## Verdict

- status: done
- tier: high
- model: opus
- effort: high
- summary: Chapter images ship end to end on the server. `POST /api/documents` takes `assets`, validates them (name rule, the four formats with magic bytes, 2 MB / 20 / 12 MB, a Pillow decode, a 40 MP cap), strips EXIF/GPS losslessly at the container level with a pixel check, and stores them content-addressed under P29's per-document `<root>/.assets/<project>/<date>-<slug>/` (never in git). The version's map is recorded in its header and SQLite. The id and pretty asset routes sit behind the document's own gate with one constant 404, the web BFF relay is `/api/documents/[id]/assets/[file]`, and deleting a document removes its images.
- files_changed: server/assets.py (new), server/main.py, server/documents_api.py, server/documents.py, server/db.py, server/reindex.py, server/gitops.py, pyproject.toml, uv.lock, .gitignore, deploy/knowledge.conf, web/src/app/api/documents/[id]/assets/[file]/route.ts (new), web/src/lib/knowledge/app.ts, tests/test_assets.py (new), web/tests/asset-route.test.ts (new), works/phases/active/P30/phase.md, works/phases/active/P30/topics/notes-server.md (new), works/phases/active/P30/topics/decisions-archive.md (new)
- validation:
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`: PASS (190 passed, Postgres-gated included; `kb-p28s2-pg` was up)
  - `pnpm --dir web typecheck`: PASS; `pnpm --dir web lint`: PASS; `pnpm --dir web test`: PASS (125); `pnpm --dir web build`: PASS (route `ƒ /api/documents/[id]/assets/[file]`)
  - `nginx -t` on `deploy/knowledge.conf` (nginx:alpine, dummy certs): PASS
  - `python3 scripts/skills_parity.py`: FAIL as known (A3, the missing `.agents/skills/explain/SKILL.md`, until S7)
  - `python3 scripts/workflow.py validate`: PASS (the stale-docs and oversized-section warnings predate this slice)
- deviations:
  1. Storage follows P29's exact layout (`.assets/<project>/<date>-<slug>/<sha256>.<ext>`), not the plan's hash-prefix layout, as the plan's "or P29's exact layout if it names one" requires. Dedupe is therefore within one document (its versions share bytes), and delete removes the whole directory, which only that document's (all deleted) versions reference.
  2. Metadata is stripped at the container level, not by Pillow re-encoding (which is lossy for JPEG and lossy WebP). No format had to be rejected; Pillow is used to decode, size, verify the pixels and make the GIF still (OQ9).
  3. `deploy/knowledge.conf` changed (not in the plan): without a regex location the relay path falls into `location /api/` (FastAPI) in production, and the 5m body cap would 413 a publish carrying 12 MB of base64 images (OQ13).
  4. The pretty route exists on the backend only (`/app/orgs/{org}/{project}/{slug}/assets/{file}`); the plan's "one route" in the BFF is the id relay.
  5. The asset routes use `{file:path}` so even an encoded-slash file segment gets the constant 404, not the framework's own.
- doc_impact: api.md, data.md, backend.md, security.md, frontend.md, operations.md, decisions.md (7 lines appended to `## Doc impact`, each tagged P30.S4)

## What was built

- **`server/assets.py`** (spec in its module docstring). `prepare_assets(items)` collects every violation
  into one `AssetError`; `to_detail()` is S3's shape (`line: 0`, `col: 0`, `code`, `message`, plus
  `asset`). Codes: `asset-name`, `asset-duplicate`, `asset-type`, `asset-base64`, `asset-empty`,
  `asset-size`, `asset-magic`, `asset-dimensions`, `asset-decode`, `asset-animated`, `asset-count`,
  `asset-total`; `asset-format` is raised in `main.py` for assets on an html document.
  - Stripping per format: JPEG keeps SOF/DHT/DQT/DRI/SOS+entropy data, APP0 JFIF, APP2 ICC and APP14
    Adobe, and drops every other APPn and COM; PNG keeps the critical, colour and APNG chunks and drops
    text, time, eXIf and private chunks; WebP keeps VP8/VP8L/VP8X/ALPH/ICCP/ANIM/ANMF, drops EXIF/XMP and
    fixes the VP8X flags and the RIFF size; GIF drops comment extensions and every application extension
    but NETSCAPE2.0/ANIMEXTS1.0.
  - The orientation tag (2–8) is written back as an orientation-only EXIF block (after JFIF APP0 in a
    JPEG, after IHDR as `eXIf` in a PNG, as a trailing `EXIF` chunk in an extended WebP), and the
    recorded `width`/`height` are the displayed size.
  - After stripping, both versions are decoded; mode, size, frame count and frame 0's bytes must match,
    or the asset is rejected.
  - An animated GIF records `animated: true` and stores its first frame as a metadata-free PNG (`still`).
    Animated PNG/WebP are rejected (OQ10).
  - Storage writes atomically (temp file + `os.replace`) only when the content-addressed file is absent,
    under `WRITE_LOCK`, and drops `<root>/.assets/.gitignore` (`*`).
- **The map** is `{name: {file, media_type, width, height, animated[, still]}}`. It is in the header as an
  `assets:` block (last, only when non-empty, one JSON-flow line per name with a JSON-quoted key), in
  `documents.assets` and `document_versions.assets` (new nullable JSON columns, idempotent `ALTER`), and in
  the `/api` and `/app` detail and version reads (the `/app` list omits it to keep its key set). Reindex
  re-derives it leniently (`parse_asset_map` drops malformed entries). A version bump archives the old
  body verbatim, header included, and copies the old row's map onto its `document_versions` row.
- **Read routes** (`server/documents_api.py`): `GET /app/documents/{id}/assets/{file}` resolves through
  `_resolve_readable_doc`; `GET /app/orgs/{org}/{project}/{slug}/assets/{file}` through
  `_resolve_readable_slug`, the slug resolver's gate, now shared with `resolve_document_by_slug`
  (refactored, behaviour unchanged). The file must be named by the current map or any archived version's
  map, and exist under the owner's content root (`docs/` for the legacy sentinel or tenant #1, else
  `tenants/<uuid>/`; a non-UUID owner resolves to nothing). Every miss raises `404 {"detail": "no such
  asset"}`. Headers: the map's media type, `nosniff`, `default-src 'none'; sandbox`, and
  `private|public, max-age=300` (public only through the public path).
- **Web relay** `web/src/app/api/documents/[id]/assets/[file]/route.ts`: it validates both segments before
  any session read, relays optional-identity like `/raw`, takes the content type from the extension and
  the cache scope from upstream (only the two allowed values), and maps 404 to 404 and anything else to
  502. `getDocumentAsset` was added to `lib/knowledge/app.ts` by hand (D22: the file was not reformatted;
  its existing prettier drift at line 554 predates this slice). The two new files are prettier-clean.
- **Delete:** `_delete_document`, which backs all three delete handlers (`/api` by id, `/api` by path,
  `/app`), removes the asset directory under the lock. The response gains `assets_removed`. Nothing is
  staged, since nothing was ever committed.
- **Git:** `.assets/` is in the repo `.gitignore`, `<root>/.assets/.gitignore` ignores itself, and
  `gitops.add` drops any path inside `.assets`. `.assets` joined `reindex.RESERVED_DIRS`.

## Tests (very core only)

`tests/test_assets.py` has 4 tests, the last Postgres-gated:

1. A stored JPEG has no GPS IFD and no maker tag; only the orientation survives; the decoded pixels equal
   the original's; the displayed size is swapped for orientation 6.
2. A magic mismatch, an oversize image, an SVG type, more than 20 images and more than 12 MB each produce
   an entry in one list of S3's shape.
3. A publish over a temp git repo stores the files (identical bytes once), writes the header map
   (reindex re-derives it), and keeps `.assets` out of the commit, `git status` and `git log --all`. A v2
   without images keeps v1's map and files. Delete removes the directory.
4. Visibility: anonymous on a public project gets 200 with the stated headers (id and pretty routes); the
   member reads their private image; anonymous on a private project (id and pretty routes) is
   byte-identical to a missing document's 404; a file of another document, an unknown hash and an
   encoded-slash name are that same 404.

`web/tests/asset-route.test.ts` has 3 tests: the pinned headers against a lying upstream, the tokenless
relay with a private scope, and the 404 mappings with bad segments short-circuiting before any fetch.

## Probes run (throwaway, in the scratchpad)

- All four formats with EXIF GPS: JPEG (orientation 6) kept `{274: 6}` only; PNG ended with no EXIF;
  WebP (orientation 3) kept `{274: 3}`; a GIF comment was removed; none of the outputs carried the maker
  string.
- A 3-frame RGB GIF stays 3 frames, keeps its NETSCAPE loop extension and loses its comment; the still's
  pixel is frame 0's red.

## Not verified here

- No real browser run: this slice builds no visible surface (S16 renders figures). Nothing claims a
  browser check.
- The nginx change was syntax-checked only. It and the 20m cap take effect at the next deploy.

## Notebook

- `## Notes for later slices`: S2's and S3's long notes moved to `topics/notes-server.md` (their S4 items
  marked consumed), plus S4's note for S5/S7/S16/S25/S27. The notebook keeps one link line each.
- `## Decisions`: one P30.S4 line. Three P30.DECOMP/S1 entries were compressed to summaries, their full
  text moved verbatim to `topics/decisions-archive.md`.
- `## Operator Questions`: OQ9–OQ13 appended, all decided.
- `## Doc impact`: 7 lines. `## Now` was rewritten. `phase.md` is now 37.7 KB of 40 KB.

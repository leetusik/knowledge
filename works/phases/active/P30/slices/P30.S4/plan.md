# P30.S4 — Image assets (server + web relay)

## Goal

Chapters carry images:
- uploaded with the publish;
- validated (magic bytes, formats, limits);
- EXIF/GPS stripped;
- stored content-addressed under `<root>/.assets/`;
- served only with the document's own visibility (the constant 404);
- relayed through the web BFF;
- deleted with their document.

`.assets/` is gitignored for every tenant (A2).

## Read first (just in time)

- `works/phases/active/P30/topics/slice-breakdown.md` → **S4**: the scope checklist.
- P29's contracts, via `python3 scripts/workflow.py phase-section P29 Decisions`. Read only *S1 Images* and
  the `02-figures` *Contract details* (width, height, `animated`, the still frame).
- `works/phases/active/P30/phase.md`:
  - `## Notes for later slices`: S2's API and helper names; S3's module API, which includes the asset-name
    rule `[A-Za-z0-9][A-Za-z0-9._-]{0,127}` (adopt it);
  - `## Decisions` (A2);
  - `## Operator Questions`: OQ1–OQ8, decided.
- Code:
  - `server/documents_api.py` (the publish path and `_resolve_readable_doc`), `server/books.py`,
    `server/gitops.py`, `server/documents.py`;
  - the document delete handlers;
  - the web BFF's existing relay routes under `web/src/app/api/` (how `/raw` is relayed today, and its
    headers);
  - `.gitignore`.

## Approach (pinned)

1. **Publish:** `POST /api/documents` accepts optional `assets: [{name, media_type, content_base64}]`.
   - Validate:
     - the name rule;
     - the media type is one of P29's formats, and the magic bytes match it;
     - per-image ≤ 2 MB, ≤ 20 images, ≤ 12 MB total;
     - width and height are read from the image.
   - Animated images: record `animated` and derive the still frame exactly as P29 / `02-figures` say.
   - Strip EXIF/GPS on store. Use Pillow if it is already a dependency, otherwise add Pillow, free and
     local; no paid service. Re-encoding must keep the pixels; if Pillow can't strip a format losslessly,
     reject that format rather than silently degrading it, and record the decision.
   - Violations go in one 422 list, in the same shape as S3's `to_detail()`.
2. **Store:** content-addressed `<root>/.assets/<sha256-prefix>/<sha256>.<ext>`, or P29's exact layout if it
   names one.
   - The document version records its asset map `{name → sha256.ext, media_type, width, height,
     animated}`. Persist it where P29 says: in the header, a sidecar, or the SQLite index, plus reindex if
     it is derived.
   - Identical bytes are stored once.
   - Writes go under the write lock.
   - **Never committed to git:** add `.assets/` to the tenant content tree's `.gitignore` for every tenant
     (tenant #1's repo included), and make sure `gitops.py`'s add/commit never stages it.
3. **Read routes:**
   - `GET /app/documents/{id}/assets/{sha256}.{ext}` and the pretty `/@{org}/{project}/{slug}/assets/{file}`;
   - both resolve the document through `_resolve_readable_doc`, so the visibility re-check is identical to
     the document's own;
   - an unknown asset, or one that is not in that document's map, returns the **same constant 404** as an
     unreadable document;
   - headers as P29 states (content type, `nosniff`, cache policy and CSP for SVG if SVG images are allowed
     at all; follow P29).
4. **Web BFF relay:** one route under `web/src/app/api/…` that relays the asset bytes with the same headers.
   Model it on the existing raw relay. Don't add `no-transform` here; D37 belongs to S25. Format only the
   files you create (D22).
5. **Delete:** deleting a document (every delete handler) removes its asset map. Content-addressed files no
   other document version references are removed too, under the lock. Version history: an asset still
   referenced by a retained version stays. Follow P29 on whether old versions keep their images.

## Tests (very core)

- An asset of a private project's document is a 404, identical to a missing one.
- An asset not in the document's map is a 404.
- Magic-byte mismatch and the limits each produce a 422 entry.
- EXIF GPS is gone from a stored JPEG.
- Delete removes unreferenced asset files.
- `.assets/` never appears in a tenant #1 commit.

## Out of scope

- Resolving `asset:` references inside native chapters (S5 wires the parser and resolution).
- The CLI `--asset` flag (S7).
- The web figure rendering (S16).
- D37's `no-transform` (S25).

## Validation

- `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`, with the container
  `kb-p28s2-pg`; start it if it is stopped.
- `pnpm --dir web typecheck`, `pnpm --dir web lint`, `pnpm --dir web test` and `pnpm --dir web build`.
- `python3 scripts/skills_parity.py` fails as known (A3).
- `python3 scripts/workflow.py validate`.

## Notebook

- `phase.md` is at about 35 KB of the 41 KB budget. **Before adding, compress:** move consumed or long
  material from `## Notes for later slices` into `topics/notes-server.md`, linked by one line, keeping
  every decision and question.
  - Doc impact: `api.md`, `data.md`, `backend.md`, `security.md` (asset visibility), `frontend.md` (the
    relay route), and a `decisions.md` ADR line.
  - Notes for S5, S7 and S16.
  - `## Now`.
- `result.md`: verdict block first.

**Unattended run:** settle open choices by P29's recommendation or the stricter option. Record them on
`## Operator Questions` as `decided: …`, and return `done`. Return `blocked` only for a real impediment.

## Dispatch

slice=P30.S4
phase=P30
kind=implementation
risk=high
attempt=1
route=high
reason=risk high (not low)
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high

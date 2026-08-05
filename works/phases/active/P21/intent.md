# Intent — P21

- Captured at: 2026-08-05T14:25:01+09:00
- Origin: operator

## Original Input (verbatim)

> for below tasks:
> ---
> 1. the documents should be able to remove on the web.
> 2. the graph all grpah title shown is kinda sucks. make it possible to see only clicked one.
> 3. the documents should be handled version control. so the coding agent can see the previous document, and add v2 and v3 of it not new post. you should support this feature, and /explain will be updated in bootstrap repo. you create phase for them. on the ./bootstrap...sh
> 4. changple5 prod successfully connected to the knowledge prod. but reported some callback? is disconnected. even the docuemnt uploading it self is successful.

(This phase covers item 1; the four items were split into phases P21–P24.)

## Confirmed Intent (refined + clarified)

Let logged-in members hard-delete documents from the web app. Today the web app has no delete capability at all — delete exists only on the machine plane (`DELETE /api/documents/{id}` / `by-path`, shared `_delete_document` in `server/main.py`). Add a delete action (with a confirmation step) on the session-gated documents pages, reusing the existing server delete logic so the document is removed from the content file, the DB row, FTS, and embeddings.

## Clarifications Resolved

- Q: Should this be a hard delete or a soft delete / trash? — A: Hard delete, logged-in members (recommended option accepted): confirm dialog on the session-gated documents pages, wired to the existing server delete logic; gone from file + DB + search.

## Notes

- Existing machine-plane delete: `server/main.py:717` (`DELETE /api/documents/{doc_id}`) and `:742` (`by-path`), shared `_delete_document`, meters `EVENT_DOCUMENT_DELETED`, optional git commit.

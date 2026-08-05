# Intent — P24

- Captured at: 2026-08-05T14:25:01+09:00
- Origin: operator

## Original Input (verbatim)

> for below tasks:
> ---
> 1. the documents should be able to remove on the web.
> 2. the graph all grpah title shown is kinda sucks. make it possible to see only clicked one.
> 3. the documents should be handled version control. so the coding agent can see the previous document, and add v2 and v3 of it not new post. you should support this feature, and /explain will be updated in bootstrap repo. you create phase for them. on the ./bootstrap...sh
> 4. changple5 prod successfully connected to the knowledge prod. but reported some callback? is disconnected. even the docuemnt uploading it self is successful.

(This phase covers item 4; the four items were split into phases P21–P24.)

## Confirmed Intent (refined + clarified)

changple5 prod uploads documents to knowledge prod successfully, but the client side reported a disconnect — the operator believes it "couldn't get a finish return, maybe timeout". There is no callback mechanism in the upload path (it is a single `POST /api/documents`); the leading hypothesis is that `/explain`'s save step uses `curl` with a 5-second timeout while the server performs git commit/push synchronously before responding, so the save lands but the client gives up before the finish response arrives. The phase should first confirm the actual failure mode, then make the finish response reliable (and the client-side reporting honest about what actually happened).

## Clarifications Resolved

- Q: Where was "callback disconnected" reported — /explain output, a changple5 ops surface, or unknown? — A: "I think it couldn't get a finish return, maybe timeout." → treat as a finish-response timeout; the phase starts by confirming that hypothesis.

## Notes

- `/explain` save step: single `curl --json @payload.json <KB_API_BASE_URL>/api/documents` with 5s timeout (`plugin/skills/explain/SKILL.md` §5).
- Server: `POST /api/documents` (`server/main.py:423`) does git commit/push best-effort before responding; 201 can carry `committed:false` / `push_error`, which also reads like a partial failure to the client.

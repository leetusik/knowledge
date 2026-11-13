# Brief: 20261023-0350-post-api-documents-write-path
- subject: What happens when a document is published with POST /api/documents: the write path from validation to the git commit and the push · mode: topic · run: full
- reader: a developer joining the project who knows Python, FastAPI basics and git, and has not read server/main.py · purpose: trace a publish through the code, explain why the 201 never waits on the network, and change the write path without breaking its invariants
- must-cover: validation; the git commit; the push; why the 201 never waits on the network; the write path's invariants · leave-out: none
- trusted sources: none · lang: en · placement: loose (project knowledge, slug post-api-documents-write-path)
- prior: none · open: depth on the native-format validator; depth on embeddings/indexing; how much of the reader UI to mention

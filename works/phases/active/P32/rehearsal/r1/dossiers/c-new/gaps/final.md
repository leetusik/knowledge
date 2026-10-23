# Final gaps: 20261023-0350-post-api-documents-write-path · stop: complete · gap rounds: 2
- Q16 · can a 201 wait on the network indirectly? · state: contested (D-02, open: architecture.md L37 vs the code) · best source: S-r1-code-validate-01 · disposition: stated ("the code makes a publish wait at `with WRITE_LOCK:` while a background push holds the lock; no doc states how long; the project's docs say both 'local disk + SQLite' and 'serialized on the lock'")
- G-r2-01 (not lb) · total wait bound · disposition: stated ("each git step is capped at KB_GIT_TIMEOUT_S; no source states a bound for the whole push or for a waiting write")
- G-r2-02 (not lb) · object transfer · disposition: dropped (say only that the next successful push sets origin's main to local HEAD, carrying the accumulated commits per the docs)
- G-r2-04 (not lb) · failed rebase --abort · disposition: stated ("ignored; nothing checks the repo afterwards; no doc covers recovery")
- Q15 (not lb) · index.lock · disposition: dropped

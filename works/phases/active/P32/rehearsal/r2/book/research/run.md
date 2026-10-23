# Run: 20261023-1245-sqlite-wal
- subject: SQLite's write-ahead log (WAL): how it works, then running it in production · run: full · tier: 3 · lang: en
- stage: whole-book research finished (§9.2 items 1–6: D0–D5s, gaps/final.md, book/outline.md, summary.md) · state: done — research stopped at D4 r2 with `complete` (the second gap review found no load-bearing gap) after 1 gap round and 12 of 45 dispatches; D5–D5s then ran on the book's main claims and mapped candidates. D6–D9 belong to each chapter's own run (run-ch<k>.md), after the operator signs book/outline.md, which freezes library.md and ledger.md
- dossier: /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s9/ws/works/phases/active/P90/book/research · tools: /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s9/state/knowledge-kb/explain/tools · skill: /Users/sugang/projects/personal/knowledge/plugin/skills/explain/SKILL.md (plugin 0.6.0, read by path: a workspace book lead, P90.DECOMP)
## Mode
mode: parallel      agents: plugin      wave: 8
verifier: claude-sonnet-5-5 (r1-b1…b10; the researchers ran on claude-opus-5-5)
critic: none here (book research; each chapter's critic runs in its own slice)
quote-match: exact      caps: agent
searches: 32 counted before D5 (probe B 1, D1 scouting 2, r1 researchers 26, r2 researchers 3) + the D5 verifiers' counter-evidence queries (about 50, listed per record in verify/final-b*.md); limit hit: no
## Preflight
- path: plugin · probe: A ok (foreground; the lead is a subagent) · B: search ok, fetch ok, curl ok, converter ok, write ok, read ok · pdftotext: yes (/opt/homebrew/bin/pdftotext)
- §2: KB_STATUS=configured · KB_EXPLAIN_STATE=/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s9/state/knowledge-kb/explain · KB_NOW=20261023-1245
- §3.1: no unfinished run under KB_EXPLAIN_STATE (the folder does not exist yet); prior: none (GET /api/books/s9-wal/sqlite-wal → "no book 'sqlite-wal' in project 's9-wal'")
- the dossier is the phase's book/research/ (§9.2), not KB_EXPLAIN_STATE/<run-id>; pages/.gitignore written first
## Log
- D1: plan.md written · 37 questions (20 load-bearing) · 8 angles · tier 3 · wave 1: 8 · ceiling 45
- D2 r1: dispatched (foreground, one message) r1-found-rw, r1-found-ckpt, r1-found-shm, r1-practice-config, r1-practice-ops, r1-evidence, r1-criticism, r1-cases (knowledge:web-researcher ×8) · ceiling used 8/45
- D2 r1 returned: r1-found-rw (complete, 6 S / 28 C), r1-found-ckpt (complete, 7 / 35), r1-found-shm (complete, 8 / 38; 42 calls, over cap by 2), r1-practice-config (complete, 9 / 33), r1-practice-ops (complete, 10 / 55), r1-evidence (partial: over cap at 49 calls, Q31 thin; 8 / 25), r1-criticism (partial: ~62 calls, Q33 thin; 10 / 35), r1-cases (partial: ~64 calls; 11 / 24) · failed none · queued none
- D3 r1: sources 46 (69 entries, 23 merged by canonical URL) · claims 242 (273 entries, 31 merged) · load-bearing 123 · disagreements D-01…D-06 (last merge: none · none)
- D3v r1 returned: r1-b1 13/13 supported · r1-b2 12 + 1 partial · r1-b3 12 + 1 partial · r1-b4 10 + 2 partial · r1-b5 10 + 2 partial · r1-b6 13/13 · r1-b7 12 + 1 partial · r1-b8 8 + 1 partial · r1-b9 11 + 2 partial · r1-b10 11 + 1 partial (all complete; no contradicted, not-found or unreachable)
- D3s r1: 106 supported · 11 partial (narrower wording on the ledger) · 6 contested (D-01: ckpt-21, ckpt-29, ops-24, ops-25; D-04: criticism-17; D-05: evidence-20) · question states: 21 answered, 7 contested, 2 thin, 7 non-load-bearing pending D5
- D4 r1: dispatched gap reviewer (knowledge:gap-reviewer, after round 1, scope run) · ceiling used 9/45
- D4 r1 returned (complete; model claude-opus-5-5): 3 load-bearing gaps (G-r1-01, G-r1-02, G-r1-03) of 13 → round 2 (Q38 from G-r1-01, owner found-ckpt; Q39 from G-r1-02 and Q40 from G-r1-03, owner practice-config); G-r1-04…G-r1-13 recorded, not researched
- D2 r2: dispatched (foreground, one message) r2-found-ckpt (Q38), r2-practice-config (Q39, Q40) (knowledge:web-researcher ×2) · ceiling used 11/45
- D2 r2 returned: r2-found-ckpt (complete; 44 calls, over cap by 4; 5 S / 12 C), r2-practice-config (partial: ~63 calls, over cap; both questions answered; 10 S / 21 C) · failed none
- D3 r2: sources 58 (+12; S-r2-practice-config-02, -03, -04 merged) · claims 275 (+33) · load-bearing 146 (+23) · disagreements D-01 extended, D-07 and D-08 new (last merge: 46 · 242)
- D3v r2: dispatched (foreground, one message) r2-b1 (14 claims: SQLite source at 3.54.1), r2-b2 (9 claims: sqlite.org docs and Apple's man pages) (knowledge:verifier ×2)
- D3v r2 returned: r2-b1 (complete: 11 supported, 2 partial, 1 needs-rewrite; one curl in a non-brief form denied and redone in B11's form — the role's error, not the session's), r2-b2 (complete: 9/9 supported)
- D3s r2: 16 supported · 2 partial · 3 contested (D-01: C-r2-found-ckpt-09; D-07: C-r2-practice-config-17, -20) · 1 unsupported (C-r2-found-ckpt-03: bar below, exceptional) · 1 candidate (C-r2-found-ckpt-12, needs-rewrite) · questions: Q39 answered, Q40 contested, Q38 thin · load-bearing totals: 122 supported, 13 partial, 9 contested, 1 unsupported, 1 candidate (146)
- D4 r2: dispatched gap reviewer (after round 2, scope run, earlier gaps gaps/r1.md) · ceiling used 12/45
- D4 r2 returned (complete; model claude-opus-5-5): no load-bearing gaps · closed G-r1-02, G-r1-03 · G-r1-01 downgraded to not load-bearing (D-01 teachable with due weight) · new G-r2-01 (outline mapping: C-r2-found-ckpt-01 into ch2 growth and busy — done), G-r2-02, G-r2-03 (not load-bearing) → stop: complete · gap rounds: 1 · researcher and gap-reviewer dispatches: 12 of 45
- D5: main claims marked (29, `· main` on their ledger lines) · Not used drafted in outline.md (38 claims, never mapped, so not verified) · dispatched (foreground, one message) final-b1 … final-b10 (121 claims: 92 still-candidate mapped claims + 29 main claims with counter-evidence ids v1 … v10) (knowledge:verifier ×10)
- D5 returned (all complete): final-b1 13/13 · final-b2 11 + C-r2-found-ckpt-03 carried forward · final-b3 13 + 1 partial · final-b4 11 + 1 partial · final-b5 9/9 · final-b6 13 + 1 partial · final-b7 12/12 · final-b8 11 + 2 partial · final-b9 11/11 · final-b10 11/11 · counter-sources recorded: S-v4-01, S-v4-02, S-v6-01, S-v6-03, S-v7-01, S-v7-02, S-v8-01, S-v8-02, S-v9-05, S-v10-02, S-v10-03 (claims C-v4-01, C-v4-02, C-v6-01, C-v6-02, C-v7-01, C-v7-02, C-v8-01, C-v8-02, C-v9-01, C-v10-01, C-v10-02); main claims with none-found: 20 of 29 · several verifiers wrote a command outside their brief's forms once (a `--max-time 60`, a `$` in grep, a `python -c`); each was denied and redone in the brief's form — the roles' errors, not the session's
- D5s: 286 claims · 206 supported · 18 partial · 12 contested · 1 unsupported · 49 candidate (38 not used, 11 counter-claims) · new disagreements D-09 (open), D-10 (resolved-by-scope), D-11 (open), D-12, D-13 (resolved-by-scope), D-14 (open); D-02, D-05, D-08 now resolved-by-scope (D-05: wal.html strikes through its old large-transaction warnings) · gaps/final.md written (Q38 thin, stated)
- D5g (not a stop in a book, §9.2): must-cover 5/5 answered or contested · load-bearing questions 26/27 answered or contested (Q38 thin) → would pass; Q38 and Q31 are reported as weak spots
- book/outline.md written: 2 chapters (how-wal-works, running-wal), no sources chapter; 247 claim ids and 55 source ids named, every one present in ledger.md / library.md, statuses matching (checked)
- summary.md written (§9.2 item 6) · state: done
- D3v r1 (dispatch record): r1-b1 (13 claims, wal.html), r1-b2 (13, wal.html), r1-b3 (13, wal.html), r1-b4 (12, wal.html), r1-b5 (12, fileformat2 + isolation), r1-b6 (13, walformat), r1-b7 (13, pragma), r1-b8 (9, checkpoint API), r1-b9 (13, transactions, result codes, busy handler, compile, Tailscale, HN, Ayer), r1-b10 (12, howtocorrupt, backup, vacuum, os_unix.c) — 123 load-bearing claims (knowledge:verifier ×10)
## Models
- probe A, probe B: general subagents dispatched on haiku
- r1-found-rw, r1-found-ckpt, r1-found-shm, r1-practice-config, r1-practice-ops, r1-evidence, r1-criticism, r1-cases: model: claude-opus-5-5
- r1-b1 … r1-b10: model: claude-sonnet-5-5
- gap reviewer r1: model: claude-opus-5-5
- r2-found-ckpt, r2-practice-config: model: claude-opus-5-5
- r2-b1, r2-b2: model: claude-sonnet-5-5
- gap reviewer r2: model: claude-opus-5-5
- final-b1 … final-b10: model: claude-sonnet-5-5
## Resume
- 2026-10-23: attempt 2 of P90.DECOMP. Attempt 1 stopped at §2 with FAILED: permissions and wrote nothing; this run starts at §2.

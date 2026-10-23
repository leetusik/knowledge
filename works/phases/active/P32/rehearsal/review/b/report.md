PUBLISHED (quick) — HSTS: what the Strict-Transport-Security header does and how to roll it out safely
- url: http://localhost:8765/web-security/2026-10-23-hsts-safe-rollout/ · v1 (new document)

## Mode
mode: sequential (quick: lead researched alone) · agents: plugin · verifier: claude-sonnet-5-5 · critic: none (quick)
quote-match: exact (5/5 sources) · caps: prompt-only · searches: 1 (probe); pages fetched directly · limit hit: no
- degraded: none. The session lacked the Grep tool and denied `python3 -c`, so grep -n via Bash was used instead.

## Research
- quick run: 2 angles (foundations, practice), 5 sources (RFC 6797, MDN, hstspreload.org, OWASP, nginx docs), 26 claims
- verification: one batch of 15 load-bearing claims → 14 supported, 1 partial (C-r1-practice-07: other browsers' preload lists are written only in hstspreload.org's attributed form)
- skipped by quick: gap rounds, counter-evidence search, critic. Non-load-bearing claims stay unverified (candidate) and rest on one opened rung-1/2 source.
- disagreements: none · gate: must-cover 2/2, load-bearing questions 9/9 → pass

## Declared gaps
- none load-bearing. Only nginx is shown; the chapter says other servers have an equivalent setting.

## Critic
- none (quick)

## Where it landed
- loose document, project web-security, subject "Web security", rel_path web-security/2026-10-23-hsts-safe-rollout.md
- commit_error: "fatal: (현재 폴더 또는 상위 폴더 중 일부가) 깃 저장소가 아닙니다: .git", meaning the KB root is not a git repository. The document is saved and indexed but not committed.
- warnings: none

## Dossier
/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/review/runs/b/state/knowledge-kb/explain/20261023-1559-hsts-safe-rollout

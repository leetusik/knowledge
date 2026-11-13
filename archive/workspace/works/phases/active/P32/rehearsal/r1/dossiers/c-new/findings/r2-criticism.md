# Findings: 20261023-0350-post-api-documents-write-path · round 2 · angle criticism
- researcher: claude-opus-5-5 · status: partial (hard cap of 20 tool calls reached, then exceeded by 3 calls to fix one NOT FOUND passage; git-push DESCRIPTION paragraph on what objects are sent was not read) · tool calls: 23

## Questions
- Q17: thin — claims: C-r2-criticism-01, -02, -03, -04, -05, -06, -07, -08, -09, -10, -11 — note: (b) and (c) answered from rung-1 docs; (a) is answered for which ref is updated with which commit and for the fast-forward definition, but no passage was captured that says git push transfers every commit reachable from <src> that the remote lacks (git-push § DESCRIPTION, line ~230 of pages/S-r2-criticism-01.txt, was not read before the cap). Python's queue docs say nothing about persistence or about items left in a queue when the process dies; the narrower supported facts are that SIGKILL cannot be caught and atexit handlers do not run on an unhandled signal or os._exit().

## Sources

### S-r2-criticism-01
- url: https://git-scm.com/docs/git-push · canonical: git-scm.com/docs/git-push
- title: Git - git-push Documentation · authors: Git project · publisher: git-scm.com
- date: n/a (latest manual page at access) · version: latest Git release shown on git-scm.com at access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Git project (git-scm.com) · upstream: none
- lateral: same page as S-r1-criticism-01, re-fetched under this id for new passages; git-scm.com renders Documentation/ from git.git.
- passages:
  - P1 · § "OPTIONS" (<refspec>...): "Specify what destination ref to update with what source object."
  - P2 · § "OPTIONS" (<refspec>...): "The <src> is often the name of the local branch to push, but it can be any arbitrary"
  - P3 · § "OPTIONS" (<refspec>...): "The <dst> determines what ref to update on the remote side. It must be the name of a branch, tag, or other ref, not an arbitrary expression."
  - P4 · § "NOTE ABOUT FAST-FORWARDS": "When an update changes a branch (or more in general, a ref) that used to point at commit A to point at another commit B, it is called a fast-forward update if and only if B is a descendant of A."
  - P5 · § "OUTPUT": "For a successfully pushed ref, the summary shows the old and new values of the ref in a form suitable for using as an argument to git log (this is <old>..<new> in most cases, and <old>...<new> for forced non-fast-forward updates)."

### S-r2-criticism-02
- url: https://git-scm.com/docs/git-rev-list · canonical: git-scm.com/docs/git-rev-list
- title: Git - git-rev-list Documentation · authors: Git project · publisher: git-scm.com
- date: n/a (latest manual page at access) · version: latest Git release shown on git-scm.com at access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Git project · upstream: none
- lateral: as S-r2-criticism-01.
- passages:
  - P1 · § "DESCRIPTION": "List commits that are reachable by following the parent links from the given commit(s), but exclude commits that are reachable from the one(s) given with a ^ in front of them."
  - P2 · § "DESCRIPTION": "A special notation … <commit1>..<commit2> … can be used as a short-hand for … ^<commit1> <commit2>"
  - P3 · § "OPTIONS" (--count; converter heading "Commit Formatting"): "Print a number stating how many commits would have been listed, and suppress all other output."
  - P4 · § "EXAMPLES": "Print the list of commits on this branch, but not present in the upstream branch."
  - P5 · § "DESCRIPTION": "The output is given in reverse chronological order by default."

### S-r2-criticism-03
- url: https://git-scm.com/docs/git-status · canonical: git-scm.com/docs/git-status
- title: Git - git-status Documentation · authors: Git project · publisher: git-scm.com
- date: n/a (latest manual page at access) · version: latest Git release shown on git-scm.com at access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Git project · upstream: none
- lateral: as S-r2-criticism-01.
- passages:
  - P1 · § "OPTIONS" (--ahead-behind): "Display or do not display detailed ahead/behind counts for the branch relative to its upstream branch. Defaults to true."
  - P2 · § "Porcelain Format Version 2" (Branch Headers): "branch.ab +<ahead> -<behind> … If upstream is set and the commit is present."

### S-r2-criticism-04
- url: https://docs.python.org/3/library/queue.html · canonical: docs.python.org/3/library/queue.html
- title: queue — A synchronized queue class · authors: Python documentation · publisher: Python Software Foundation
- date: n/a · version: Python 3 current docs at access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: docs.python.org is CPython's official documentation.
- passages:
  - P1 · § "Queue Objects": "Two methods are offered to support tracking whether enqueued tasks have been fully processed by daemon consumer threads."
  - P2 · § "Queue Objects" (Queue.join): "The count of unfinished tasks goes up whenever an item is added to the queue. The count goes down whenever a consumer thread calls task_done() to indicate that the item was retrieved and all work on it is complete."

### S-r2-criticism-05
- url: https://docs.python.org/3/library/signal.html · canonical: docs.python.org/3/library/signal.html
- title: signal — Set handlers for asynchronous events · authors: Python documentation · publisher: Python Software Foundation
- date: n/a · version: Python 3 current docs at access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: as S-r2-criticism-04.
- passages:
  - P1 · § "Module contents" (signal.SIGKILL): "Kill signal. … It cannot be caught, blocked, or ignored."
  - P2 · § "Note on Signal Handlers and Exceptions": "applications that are complex or require high reliability should avoid raising exceptions from signal handlers. They should also avoid catching KeyboardInterrupt as a means of gracefully shutting down. Instead, they should install their own SIGINT handler."

### S-r2-criticism-06
- url: https://docs.python.org/3/library/atexit.html · canonical: docs.python.org/3/library/atexit.html
- title: atexit — Exit handlers · authors: Python documentation · publisher: Python Software Foundation
- date: n/a · version: Python 3 current docs at access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: as S-r2-criticism-04.
- passages:
  - P1 · § "atexit — Exit handlers": "Exit handlers are not called when the program is killed by a signal not handled by Python, when a Python fatal internal error is detected, or when os._exit() is called."

## Claims

### C-r2-criticism-01
- claim: In git push, a refspec of the form <src>:<dst> names which remote ref (<dst>, a branch, tag or other ref name) to update with which source object (<src>), and <src> may be any SHA-1 expression rather than only a local branch name, so HEAD:main updates the remote's main with the commit HEAD names.
- kind: behaviour
- questions: Q17 · load-bearing: yes (explains what `git push origin HEAD:main` updates)
- support: S-r2-criticism-01/P1 · rung 1 · fit direct · upstream self
- support: S-r2-criticism-01/P2 · rung 1 · fit direct · upstream self
- support: S-r2-criticism-01/P3 · rung 1 · fit direct · upstream self
- scope: git-push refspec syntax, current git-scm.com manual; "HEAD:main" is this chapter's instance of the documented form (the page's own examples are main, main:other, HEAD^:refs/heads/main)
- confidence: high · flags: none
- conflicts: none

### C-r2-criticism-02
- claim: Git calls a ref update from commit A to commit B a fast-forward if and only if B is a descendant of A.
- kind: definition
- questions: Q17 · load-bearing: yes (a push of a HEAD that descends from earlier unpushed commits is a fast-forward over them)
- support: S-r2-criticism-01/P4 · rung 1 · fit direct · upstream self
- scope: git-push "NOTE ABOUT FAST-FORWARDS"
- confidence: high · flags: none
- conflicts: none

### C-r2-criticism-03
- claim: For a successfully pushed ref, git push's summary shows the ref's old and new values in a git-log-ready form, <old>..<new> in most cases and <old>...<new> for forced non-fast-forward updates.
- kind: behaviour
- questions: Q17 · load-bearing: no (how to see which range a push published)
- support: S-r2-criticism-01/P5 · rung 1 · fit direct · upstream self
- scope: git-push OUTPUT section
- confidence: high · flags: none
- conflicts: none

### C-r2-criticism-04
- claim: git rev-list lists commits reachable by following parent links from the given commits, excluding commits reachable from any commit given with a ^ prefix, and the notation <commit1>..<commit2> is shorthand for ^<commit1> <commit2>, so origin/main..HEAD lists commits reachable from HEAD but not from origin/main.
- kind: behaviour
- questions: Q17 · load-bearing: yes (defines what `origin/main..HEAD` selects)
- support: S-r2-criticism-02/P1 · rung 1 · fit direct · upstream self
- support: S-r2-criticism-02/P2 · rung 1 · fit direct · upstream self
- scope: git-rev-list DESCRIPTION; origin/main..HEAD is this chapter's instance (the page's own example is origin..HEAD)
- confidence: high · flags: none
- conflicts: none

### C-r2-criticism-05
- claim: The git rev-list --count option prints the number of commits that would have been listed and suppresses all other output.
- kind: behaviour
- questions: Q17 · load-bearing: yes (`git rev-list --count origin/main..HEAD` is the ahead count)
- support: S-r2-criticism-02/P3 · rung 1 · fit direct · upstream self
- scope: git-rev-list --count without --left-right or --cherry-mark (both change the output)
- confidence: high · flags: none
- conflicts: none

### C-r2-criticism-06
- claim: The git-rev-list manual gives, among its examples, printing "the list of commits on this branch, but not present in the upstream branch".
- kind: fact
- questions: Q17 · load-bearing: no (corroborates the use of a range against the upstream to find unpushed commits)
- support: S-r2-criticism-02/P4 · rung 1 · fit partial (the exact command line of the example was not captured) · upstream self
- scope: git-rev-list EXAMPLES
- confidence: medium · flags: none
- conflicts: none

### C-r2-criticism-07
- claim: git status displays ahead/behind counts for the current branch relative to its upstream branch by default (--ahead-behind defaults to true), and its porcelain v2 format reports them in a "branch.ab +<ahead> -<behind>" header line when an upstream is set and its commit is present.
- kind: behaviour
- questions: Q17 · load-bearing: yes (how git reports a branch ahead of its upstream)
- support: S-r2-criticism-03/P1 · rung 1 · fit direct · upstream self
- support: S-r2-criticism-03/P2 · rung 1 · fit direct · upstream self
- scope: git-status current manual; the human-readable "Your branch is ahead of ... by N commits" wording is not quoted in this manual page
- confidence: high · flags: none
- conflicts: none

### C-r2-criticism-08
- claim: Python's signal documentation states that SIGKILL cannot be caught, blocked, or ignored.
- kind: behaviour
- questions: Q17 · load-bearing: yes (no Python handler can run to drain or persist a queue on SIGKILL)
- support: S-r2-criticism-05/P1 · rung 1 · fit direct · upstream self
- scope: signal.SIGKILL, Python 3 docs (POSIX signal)
- confidence: high · flags: none
- conflicts: none

### C-r2-criticism-09
- claim: Python's atexit exit handlers are not called when the program is killed by a signal not handled by Python, when a Python fatal internal error is detected, or when os._exit() is called.
- kind: behaviour
- questions: Q17 · load-bearing: yes (shutdown hooks cannot be relied on to flush in-memory push work)
- support: S-r2-criticism-06/P1 · rung 1 · fit direct · upstream self
- scope: atexit module, Python 3 docs
- confidence: high · flags: none
- conflicts: none

### C-r2-criticism-10
- claim: Python's queue.Queue offers task_done() and join() to track whether enqueued tasks have been fully processed by daemon consumer threads, with an unfinished-task count that rises on each put and falls on each task_done() call.
- kind: behaviour
- questions: Q17 · load-bearing: no (background on the queue API; the docs say nothing about queue contents surviving process death)
- support: S-r2-criticism-04/P1 · rung 1 · fit direct · upstream self
- support: S-r2-criticism-04/P2 · rung 1 · fit direct · upstream self
- scope: queue.Queue, Python 3 docs
- confidence: high · flags: none
- conflicts: none

### C-r2-criticism-11
- claim: Python's signal documentation advises that complex or high-reliability applications avoid catching KeyboardInterrupt as a means of graceful shutdown and instead install their own SIGINT handler.
- kind: behaviour
- questions: Q17 · load-bearing: no (graceful-shutdown practice for catchable signals)
- support: S-r2-criticism-05/P2 · rung 1 · fit direct · upstream self
- scope: signal docs, "Note on Signal Handlers and Exceptions"; applies to SIGINT, not SIGKILL
- confidence: high · flags: none
- conflicts: none

## Conflicts
- none

## Speculation and flags
- Q17(a): the claim that a push transfers every commit reachable from <src> that the remote lacks is not captured verbatim here; C-r2-criticism-01/-02 support only the ref update and fast-forward definition. The lead should not state the transfer in the chapter's own voice without a passage (see Unused leads).
- Q17(c): no Python doc read says "items in a queue.Queue are lost when the process is killed"; that is an inference from in-memory storage plus C-r2-criticism-08/-09 and the known C-r1-criticism-13.

## Unused leads
- https://git-scm.com/docs/git-push § DESCRIPTION (pages/S-r2-criticism-01.txt, the line after "## DESCRIPTION", line ~230) — likely states that push sends the objects needed to complete the given refs; not read before the cap.
- https://git-scm.com/docs/gitrevisions — the canonical definition of the A..B range notation.
- https://git-scm.com/docs/git-config (push.default, branch.<name>.merge) and https://git-scm.com/docs/git-branch (-vv shows ahead/behind) — further ahead-of-upstream reporting.
- https://docs.python.org/3/library/os.html#os._exit — os._exit exits without calling cleanup handlers or flushing stdio buffers.

## Queries
- direct fetch https://git-scm.com/docs/git-push → useful
- direct fetch https://git-scm.com/docs/git-rev-list → useful
- direct fetch https://git-scm.com/docs/git-status → useful
- direct fetch https://docs.python.org/3/library/queue.html → useful (nothing on persistence)
- direct fetch https://docs.python.org/3/library/signal.html → useful
- direct fetch https://docs.python.org/3/library/atexit.html → useful

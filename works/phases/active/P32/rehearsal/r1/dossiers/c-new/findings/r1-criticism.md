# Findings: 20261023-0350-post-api-documents-write-path · round 1 · angle criticism
- researcher: claude-opus-5-5 · status: partial (hard cap reached; Q14 has two sub-points with no direct passage, "background work is lost on a process crash" and "a failed push leaves commits unpublished until the next push"; Q15's only source was dropped at --check) · tool calls: 33

## Questions
- Q14: thin — claims: C-r1-criticism-01, -02, -03, -04, -07, -08, -09, -10, -11, -13, -15, -17, -18 — note: (b) is well covered by git-push/git-rebase and subprocess docs; (a) is covered for shutdown (daemon threads stopped abruptly; ThreadPoolExecutor joined at exit; Starlette tasks are in-process and run after the response), but no fetched official page says outright that queued in-process work is lost on a crash or kill; "unpublished until next push" rests only on git-push's "Git did not try to send the ref at all" (C-r1-criticism-02), so it is an inference.
- Q15: thin — claims: none — note: git's lockfile.c (raw.githubusercontent.com/git/git/master/lockfile.c) contains the "Another git process seems to be running in this repository" message (grep of the saved raw file: 1 hit), but the HTML converter mangled the C source, so the passage could not be checked and was dropped; git-scm.com manual pages were not searched for index.lock.

## Sources

### S-r1-criticism-01
- url: https://git-scm.com/docs/git-push · canonical: git-scm.com/docs/git-push
- title: Git - git-push Documentation · authors: Git project · publisher: git-scm.com
- date: n/a (latest manual page at access) · version: latest Git release shown on git-scm.com at access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Git project (git-scm.com) · upstream: none
- lateral: no lateral search run; git-scm.com is the Git project's own documentation site, rendered from Documentation/ in git.git.
- passages:
  - P1 · § "NOTE ABOUT FAST-FORWARDS": "The command by default does not allow an update that is not a fast-forward to prevent such loss of history."
  - P2 · § "NOTE ABOUT FAST-FORWARDS": "Alternatively, you can rebase your change between X and B on top of A, with git pull --rebase, and push the result back. The rebase will create a new commit D that builds the change between X and B on top of A."
  - P3 · § "NOTE ABOUT FAST-FORWARDS": "Again, updating A with this commit will fast-forward and your push will be accepted."
  - P4 · § "OUTPUT" (status "rejected"): "Git did not try to send the ref at all, typically because it is not a fast-forward and you did not force the update."
  - P5 · § "OUTPUT" (status "remote rejected"): "The remote end refused the update. Usually caused by a hook on the remote side"
  - P6 · § "REMOTE GROUPS": "If any member remote fails whether due to a push rejection (e.g. a non-fast-forward update, a server-side hook refusing a ref) or a connection error (e.g. the repository does not exist, authentication fails, or the network is unreachable), Git reports the error and continues pushing to the remaining remotes in the group."
  - P7 · § "NOTE ABOUT FAST-FORWARDS": "git push --force is a method reserved for a case where you do mean to lose history."
  - P8 · § "OPTIONS" (--force-with-lease): "blindly pushing with --force will lose their work."

### S-r1-criticism-02
- url: https://docs.python.org/3/library/subprocess.html · canonical: docs.python.org/3/library/subprocess.html
- title: subprocess — Subprocess management · authors: Python documentation · publisher: Python Software Foundation
- date: n/a · version: Python 3 current docs at access (page mentions changes in 3.15)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: no lateral search run; docs.python.org is CPython's official documentation.
- passages:
  - P1 · § "Using the subprocess Module" (subprocess.run): "If the timeout expires, the child process will be killed and waited for. The TimeoutExpired exception will be re-raised after the child process has terminated."
  - P2 · § "Popen Objects" (Popen.communicate): "The child process is not killed if the timeout expires, so in order to cleanup properly a well-behaved application should kill the child process and finish communication:"
  - P3 · § "Timeout Behavior": "The initial process creation itself cannot be interrupted on many platform APIs. This means that even when specifying a timeout, you are not guaranteed to see a timeout exception until at least after however long process creation takes."

### S-r1-criticism-03
- url: https://docs.python.org/3/library/threading.html · canonical: docs.python.org/3/library/threading.html
- title: threading — Thread-based parallelism · authors: Python documentation · publisher: Python Software Foundation
- date: n/a · version: Python 3 current docs at access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: as S-r1-criticism-02.
- passages:
  - P1 · § "Thread objects": "Daemon threads are abruptly stopped at shutdown. Their resources (such as open files, database transactions, etc.) may not be released properly. If you want your threads to stop gracefully, make them non-daemonic and use a suitable signalling mechanism such as an Event."
  - P2 · § "Thread objects" (daemon): "The entire Python program exits when no alive non-daemon threads are left."
  - P3 · § "Lock objects": "When the state is locked, acquire() blocks until a call to release() in another thread changes it to unlocked"
  - P4 · § "Lock objects": "When more than one thread is blocked in acquire() waiting for the state to turn to unlocked, only one thread proceeds when a release() call resets the state to unlocked; which one of the waiting threads proceeds is not defined, and may vary across implementations."
  - P5 · § "Lock objects": "Once a thread has acquired a lock, subsequent attempts to acquire it block, until it is released; any thread may release it."
  - P6 · § "RLock objects": "RLock's acquire()/release() call pairs may be nested, unlike Lock's acquire()/release()."

### S-r1-criticism-04
- url: https://starlette.dev/background/ (www.starlette.io did not resolve) · canonical: starlette.dev/background/
- title: Background Tasks - Starlette · authors: Starlette maintainers · publisher: starlette.dev
- date: n/a · version: current docs at access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Starlette project (repository Kludex/starlette, as the page shows) · upstream: none
- lateral: no lateral search run; the page links the Kludex/starlette repository as its source.
- passages:
  - P1 · § "Background Tasks": "Starlette includes a BackgroundTask class for in-process background tasks."
  - P2 · § "Background Tasks": "A background task should be attached to a response, and will run only once the response has been sent."
  - P3 · § "BackgroundTasks" (Important): "The tasks are executed in order. In case one of the tasks raises an exception, the following tasks will not get the opportunity to be executed."

### S-r1-criticism-05
- url: https://fastapi.tiangolo.com/tutorial/background-tasks/ · canonical: fastapi.tiangolo.com/tutorial/background-tasks/
- title: Background Tasks - FastAPI · authors: FastAPI docs · publisher: fastapi.tiangolo.com
- date: n/a · version: current docs at access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: FastAPI project (Sebastián Ramírez / tiangolo) · upstream: FastAPI's BackgroundTasks builds on Starlette's (S-r1-criticism-04); not independent of it for behaviour
- lateral: no lateral search run.
- passages:
  - P1 · § "Background Tasks": "You can define background tasks to be run after returning a response."
  - P2 · § "Caveat": "If you need to perform heavy background computation and you don't necessarily need it to be run by the same process (for example, you don't need to share memory, variables, etc), you might benefit from using other bigger tools like Celery."

### S-r1-criticism-06
- url: https://docs.python.org/3/library/concurrent.futures.html · canonical: docs.python.org/3/library/concurrent.futures.html
- title: concurrent.futures — Launching parallel tasks · authors: Python documentation · publisher: Python Software Foundation
- date: n/a · version: Python 3 current docs at access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: as S-r1-criticism-02.
- passages:
  - P1 · § "ThreadPoolExecutor" (text l.99): "All threads enqueued to ThreadPoolExecutor will be joined before the interpreter can exit. Note that the exit handler which does this is executed before any exit handlers added using atexit. This means exceptions in the main thread must be caught and handled in order to signal threads to exit gracefully. For this reason, it is recommended that ThreadPoolExecutor not be used for long-running tasks."
  - P2 · § "Executor Objects" (shutdown): "If cancel_futures is True, this method will cancel all pending futures that the executor has not started running."

### S-r1-criticism-08
- url: https://git-scm.com/docs/git-rebase · canonical: git-scm.com/docs/git-rebase
- title: Git - git-rebase Documentation · authors: Git project · publisher: git-scm.com
- date: n/a · version: latest Git release shown on git-scm.com at access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Git project · upstream: none
- lateral: as S-r1-criticism-01.
- passages:
  - P1 · § "DESCRIPTION": "If there is a merge conflict during this process, git rebase will stop at the first problematic commit and leave conflict markers."
  - P2 · § "MODE OPTIONS" (--abort): "Abort the rebase operation and reset HEAD to the original branch."
  - P3 · § "Interruptability": "The apply backend has safety problems with an ill-timed interrupt; if the user presses Ctrl-C at the wrong time to try to abort the rebase, the rebase can enter a state where it cannot be aborted with a subsequent git rebase --abort. The merge backend does not appear to suffer from the same shortcoming."

## Claims

### C-r1-criticism-01
- claim: By default, git push refuses to update a remote branch with a commit that is not a fast-forward (not a descendant of the branch's current tip), to prevent loss of history.
- kind: behaviour
- questions: Q14 · load-bearing: yes (the core push failure mode the worker must handle)
- support: S-r1-criticism-01/P1 · rung 1 · fit direct · upstream self
- scope: git push default behaviour, without --force
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-02
- claim: When git push reports a ref as "rejected", Git did not try to send that ref at all, typically because the update is not a fast-forward and was not forced.
- kind: behaviour
- questions: Q14 · load-bearing: yes (basis for "a rejected push leaves the local commits unpublished")
- support: S-r1-criticism-01/P4 · rung 1 · fit partial (says the ref was not sent; does not itself say the commits stay local until a later push) · upstream self
- scope: git push output status "rejected"
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-03
- claim: The git-push documentation gives, as one remedy for a non-fast-forward rejection, rebasing the local change onto the updated remote tip with git pull --rebase and pushing again, after which the update fast-forwards and the push is accepted.
- kind: behaviour
- questions: Q14 · load-bearing: yes (justifies fetch + rebase + push)
- support: S-r1-criticism-01/P2 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P3 · rung 1 · fit direct · upstream self
- scope: git-push "NOTE ABOUT FAST-FORWARDS"; the doc also offers git pull (merge) as the first alternative
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-04
- claim: The git-push documentation reserves git push --force for cases where one means to lose history, and warns that blindly pushing with --force will lose others' work built on the remote tip.
- kind: behaviour
- questions: Q14 · load-bearing: no (a guard rail for changing the push step, not the failure mode itself)
- support: S-r1-criticism-01/P7 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P8 · rung 1 · fit direct · upstream self
- scope: git push --force
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-05
- claim: A git push ref status of "remote rejected" means the remote end refused the update, usually because of a hook on the remote side.
- kind: behaviour
- questions: Q14 · load-bearing: no (a second rejection kind that fetch + rebase does not fix)
- support: S-r1-criticism-01/P5 · rung 1 · fit direct · upstream self
- scope: git push output status "remote rejected"; the passage goes on to list receive.deny* safety options
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-06
- claim: The git-push documentation distinguishes push rejections (such as a non-fast-forward update or a server-side hook refusing a ref) from connection errors (such as a missing repository, failed authentication or an unreachable network).
- kind: behaviour
- questions: Q14 · load-bearing: no (classification of failures)
- support: S-r1-criticism-01/P6 · rung 1 · fit partial (stated in the context of pushing to a remote group) · upstream self
- scope: pushing to a group of remotes; the classification is given there
- confidence: medium · flags: none
- conflicts: none

### C-r1-criticism-07
- claim: If a merge conflict occurs while git rebase replays commits, git rebase stops at the first problematic commit and leaves conflict markers.
- kind: behaviour
- questions: Q14 · load-bearing: yes (the failure mode of the fetch + rebase step)
- support: S-r1-criticism-08/P1 · rung 1 · fit direct · upstream self
- scope: git rebase (as run by git pull --rebase or directly)
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-08
- claim: git rebase --abort aborts the rebase operation and resets HEAD to the original branch.
- kind: behaviour
- questions: Q14 · load-bearing: yes (the recovery from a stopped rebase)
- support: S-r1-criticism-08/P2 · rung 1 · fit direct · upstream self
- scope: git rebase --abort
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-09
- claim: The git-rebase documentation says the apply backend has safety problems with an ill-timed interrupt (Ctrl-C at the wrong time can leave a rebase that git rebase --abort cannot abort), and that the merge backend does not appear to suffer from the same shortcoming.
- kind: behaviour
- questions: Q14 · load-bearing: no (relevant if a timeout kills a running rebase; that link is this researcher's inference)
- support: S-r1-criticism-08/P3 · rung 1 · fit partial (the doc speaks of a user's Ctrl-C, not a timeout kill) · upstream self
- scope: git rebase apply backend vs merge backend; "does not appear" is the doc's hedge
- confidence: medium · flags: none
- conflicts: none

### C-r1-criticism-10
- claim: In Python's subprocess.run, if the timeout expires the child process is killed and waited for, and TimeoutExpired is re-raised after the child has terminated.
- kind: behaviour
- questions: Q14 · load-bearing: yes (how a bounded git subprocess ends on a hang)
- support: S-r1-criticism-02/P1 · rung 1 · fit direct · upstream self
- scope: subprocess.run with timeout, Python 3 current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-11
- claim: In Python's Popen.communicate, the child process is not killed when the timeout expires, so the application should kill the child and finish communication itself.
- kind: behaviour
- questions: Q14 · load-bearing: yes (contrasts with run(); matters if the code uses Popen directly)
- support: S-r1-criticism-02/P2 · rung 1 · fit direct · upstream self
- scope: Popen.communicate(timeout=…)
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-12
- claim: Python's subprocess docs say a timeout is not guaranteed to fire before process creation completes, because process creation cannot be interrupted on many platform APIs.
- kind: behaviour
- questions: Q14 · load-bearing: no
- support: S-r1-criticism-02/P3 · rung 1 · fit direct · upstream self
- scope: timeout in run(), Popen.wait(), Popen.communicate()
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-13
- claim: Python daemon threads are stopped abruptly at interpreter shutdown, their resources may not be released properly, and the docs recommend non-daemon threads with a signalling mechanism such as an Event for a graceful stop.
- kind: behaviour
- questions: Q14 · load-bearing: yes (a daemon push worker can be cut off mid-push at shutdown)
- support: S-r1-criticism-03/P1 · rung 1 · fit direct · upstream self
- scope: threading daemon threads, Python 3
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-14
- claim: A Python program exits when no alive non-daemon threads are left.
- kind: behaviour
- questions: Q14 · load-bearing: no
- support: S-r1-criticism-03/P2 · rung 1 · fit direct · upstream self
- scope: threading, Python 3
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-15
- claim: Python joins all ThreadPoolExecutor threads before the interpreter can exit, so the docs say exceptions in the main thread must be caught to signal threads to exit gracefully and recommend not using ThreadPoolExecutor for long-running tasks.
- kind: behaviour
- questions: Q14 · load-bearing: yes (shutdown behaviour of a thread-pool push worker)
- support: S-r1-criticism-06/P1 · rung 1 · fit direct · upstream self
- scope: concurrent.futures.ThreadPoolExecutor, Python 3
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-16
- claim: Executor.shutdown(cancel_futures=True) cancels all pending futures that the executor has not started running.
- kind: behaviour
- questions: Q14 · load-bearing: no
- support: S-r1-criticism-06/P2 · rung 1 · fit direct · upstream self
- scope: concurrent.futures, Python 3.9 and later (the page: "Changed in version 3.9: Added cancel_futures.")
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-17
- claim: Starlette's BackgroundTask is an in-process background task, attached to a response, that runs only once the response has been sent.
- kind: behaviour
- questions: Q14 · load-bearing: yes (the client already has its 201 when the task starts)
- support: S-r1-criticism-04/P1 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-04/P2 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-05/P1 · rung 1 · fit partial (FastAPI: "run after returning a response"; FastAPI builds on Starlette, not independent) · upstream S-r1-criticism-04
- scope: Starlette BackgroundTask/BackgroundTasks; FastAPI BackgroundTasks
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-18
- claim: Starlette's BackgroundTasks run in order, and if one task raises an exception the following tasks do not get the opportunity to run.
- kind: behaviour
- questions: Q14 · load-bearing: yes (a failing earlier task can skip a later push task)
- support: S-r1-criticism-04/P3 · rung 1 · fit direct · upstream self
- scope: Starlette BackgroundTasks (multiple tasks on one response)
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-19
- claim: The FastAPI docs say that for heavy background computation that need not run in the same process, bigger tools like Celery may be a better fit.
- kind: interpretation
- questions: Q14 · load-bearing: no (attributed advice only)
- support: S-r1-criticism-05/P2 · rung 1 · fit direct (attributed form only) · upstream self
- scope: FastAPI tutorial "Caveat"
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-criticism-20
- claim: A Python threading.Lock blocks acquire() while locked until release() is called, and any thread may release it.
- kind: behaviour
- questions: Q14 · load-bearing: no (lock semantics behind the process-wide write lock)
- support: S-r1-criticism-03/P3 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-03/P5 · rung 1 · fit direct · upstream self
- scope: threading.Lock, Python 3
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-21
- claim: When several threads wait on a Python threading.Lock, which waiting thread proceeds after a release is not defined and may vary across implementations.
- kind: behaviour
- questions: Q14 · load-bearing: no (no FIFO ordering of writers is guaranteed)
- support: S-r1-criticism-03/P4 · rung 1 · fit direct · upstream self
- scope: threading.Lock, Python 3
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-22
- claim: Unlike RLock, Python's threading.Lock acquire()/release() pairs cannot be nested by the same thread.
- kind: behaviour
- questions: Q14 · load-bearing: no (re-acquiring the write lock inside itself would block)
- support: S-r1-criticism-03/P6 · rung 1 · fit direct · upstream self
- scope: threading.Lock vs threading.RLock, Python 3
- confidence: high · flags: none
- conflicts: none

## Conflicts
- none

## Speculation and flags
- C-r1-criticism-19: vendor-about-itself; FastAPI's own advice ("you might benefit from using other bigger tools like Celery"), usable only attributed.
- C-r1-criticism-09: the doc hedges ("does not appear to suffer"); applying it to a timeout kill of git is an inference, not stated by the doc.
- Q14 gap: no fetched official page states that in-process background work queued at a hard crash (SIGKILL, OOM) is lost; C-r1-criticism-13, -15 and -17 establish only that the work is in-process, runs after the response, and is stopped or joined at shutdown.
- Q14 gap: "a failed push leaves local commits unpublished until the next push" rests only on C-r1-criticism-02 (the ref was not sent); no passage says it outright.

## Unused leads
- https://raw.githubusercontent.com/git/git/master/lockfile.c — saved as pages/S-r1-criticism-09.html; contains the "Another git process seems to be running in this repository" message (Q15), but pagetext.py mangled the C source, so no checkable passage; refetch at a pinned commit and quote via a code entry, or use git's manual.
- https://git-scm.com/docs/git — saved as pages/S-r1-criticism-07.txt; GIT_TERMINAL_PROMPT (l.916) may document that git can block on a credential prompt (a hang that a timeout must bound); not quoted because the cap was reached.
- https://git-scm.com/docs/git-config — http.lowSpeedLimit / http.lowSpeedTime and core.sshCommand: git's own network stall limits (not fetched).
- https://git-scm.com/docs/git-status — "ahead of" reporting; could show directly that unpushed commits stay local (not fetched).

## Queries
- No WebSearch run; official pages were fetched directly by known URL: git-push, git-rebase, git, lockfile.c, Python subprocess, threading, concurrent.futures, Starlette background, FastAPI background tasks.
- https://www.starlette.io/background/ → DNS failure; https://starlette.dev/background/ → useful

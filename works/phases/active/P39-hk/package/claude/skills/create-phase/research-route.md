## The research route

An explain tells only what the phases recorded. **When no phase covers its subject** (the code is there, but no phase built or recorded it), the plugin's front door, or *The explain route*'s own confirmation, offers "research first", and on that reply hands this skill the operator's request and a block like this one, verbatim (the plugin's §1 *Resolve the topic, the mode and the placement*, *The phases that cover the subject*):

```
Research: <subject>
- subject: <subject, refined from the operator's words>
- paths: <the subject's files and folders>
- question: what does this code do, and why is it built this way: <the reader's questions, one a line>
- findings-only: yes — it reads the code and records findings in its phase's notebook and topics; it writes no product code
- then: an explain of <subject>, from these findings, only when the operator asks again (`/knowledge:explain <subject>`)
```

A research phase is an **ordinary phase**: no flag, no new `intent.md` section, no engine change. Its `research` slices already record findings, never product code, into the phase's notebook and `topics/`, and that record is what a later explain reads (the plugin's §3.4 *D1: the evidence*). What the route adds is that the scope is already written down, and the lines that make the record findable. The same refine → clarify → **confirm at step 3** → `new-phase` → stop:

1. **Propose from the block** at step 3: the name `Research: <subject>`, and an objective such as *"read `<paths>` and record what this code does and why, as findings, so that an explain of <subject> can be written from them; findings only, no product code"*. The operator may narrow the paths or add questions. The explain does **not** follow by itself.
2. **`new-phase`, fill `intent.md`, STOP.** The request and the block go verbatim under *Original Input (verbatim)*. Under *Confirmed Intent* write the block's five lines as confirmed, one a line: **the `paths:` line and the subject's plain name are what the plugin's coverage greps `intent.md` for**, so that a later explain finds this phase. (Its commits touch only its own phase folder, so the coverage's other half, `git log` over the subject's paths, never names it: these lines, and its `## Decisions` gists naming the same paths, are how it is found.) Then write what its `DECOMP` will cut (below). It runs on the default stream like any phase, unless the operator asks for a worktree.

**What that `DECOMP` will cut** (write it into `intent.md`; do not cut it here): one `--kind research --risk high` slice per part of the subject a reader asks about separately (one for a small subject), declared by the usual rule, and nothing else: no build slices. Each research slice reads **this repository only**: the code at the commit it reads (`git log -1 --format=%h`), its comments and its history (`git log`, `git blame`), never the web, so that its findings stay inside what the code does. It records each finding as:
- a `## Decisions` gist line that names the subject's paths and what was found, its detail in `topics/<slug>.md`;
- in that topic, what the code does, each claim cited `<path>:L<a>-L<b>@<short sha>` (the citation form the explain re-finds, the plugin's B9 *The dossier: files, ids and entries*), the why where the code, a comment or the history shows it, and, on `Not found:` lines, what none of them shows: the explain states those as gaps, never fills them;
- an operator-decision question only on `## Operator Questions`, by the usual rule.

The phase changes no product code and no operator-visible surface, so its acceptance gate is waived at the `DECOMP` boundary (`accept-gate <P> --waive --note "research phase: findings only, nothing the operator sees"`). It leaves no `## Doc impact` note, unless a finding shows a `docs/current/` section wrong, which gets one line. Its closing report ends with the explain it was made for: "ask `/knowledge:explain <subject>` again; its front door now finds this phase as covering the subject."

# Intent — P35-a4

- Captured at: 2026-10-30T15:25:20+09:00
- Origin: operator

## Original Input (verbatim)

> for refine the instruction for making documents.
> ---
> I don't care about the phase numbers and defer numbers. the only I care is what the document explain about. even if it's the explaining a certain phase, I don't asking for what s3 does. maybe you can leave a small (p3) kind of marks. but don't make it hard to read. the document it self needed to be standalone not depend on reference links you know I mean.

## Confirmed Intent (refined + clarified)

An explain document is about its subject. When the subject is a phase, the reader wants to learn what the system does now and why. The document is not a tour of the workflow ("S3 added…", "deferred as D69…"). Phase, slice and deferred ids appear at most as a small, unobtrusive mark like "(P30)". They are never the topic, and they never set how the document is organised.

Every document also stands alone: a reader understands all of it without following any link to another document, a chapter, a repo file or a source.

Refine the explain writing rules, the outline and the critic that checks them so that this holds for every document and chapter. Today's instructions push the other way in three places:

- the plugin's placement rules title phase books and chapters by id ("P30: <phase name>", chapters keyed `s1`, `s2`);
- the prose rules and the recommended outline never say "explain the subject, not the work records", and a phase subject's evidence is its records (intent, notes, each slice's result), so the research and the outline come out slice by slice;
- the critic's rubric prefers a link to a re-teaching ("re-teaching an earlier chapter instead of linking it" is a fault), which is the opposite of standalone.

## Clarifications Resolved

- Q: Is the scope only the explain pipeline (the plugin's explain skill, its critic, the workspace's explain references), and not the workspace's own durable docs (`docs/current/`), which are records of the workflow itself? — A: yes.
- Q: Do book chapters stand alone too? Recommended: a chapter gives a short recap of an earlier idea instead of "see chapter 2"; a link may be added as an extra, never in place of the explanation (this reverses the critic's current rule). — A: yes.
- Q: Sources: keep the cited sources as evidence, with the rule that no sentence needs a source opened to make sense? The same for repo file paths: fine as a code block's title, never as "see SKILL.md §4" in place of explaining. — A: yes.
- Q: Titles: a phase's book or chapter is titled by what it explains ("How a review publishes privately"), the id at most a small mark, rather than "P30: <phase name>"? — A: yes.
- Q: Already-published documents stay as they are, and a later re-explain picks up the new rules? — A: yes; no re-explain job is filed.
- Q (asked at `/do-whole-phase`, "only doing it here is enough? or new workflow version needed?"): the writing rules live in this repo's plugin, but the workspace's explain references and `create-phase` are copies of the workflow repo's payload, and they restate a few of the same rules (a phase book titled `P<N>: <phase name>`, chapters linking earlier chapters, the review flagging "a term taught twice"). Should this phase change only the plugin here, with the workflow side as its own phase in the workflow repo? — A: "after you done in this side, make a phase on the workflow repo, and I'll do it on there." So this phase changes the plugin only (`plugin/skills/explain/SKILL.md`, `plugin/agents/explain-critic.md`, its version) and leaves the workspace copies alone. When it is done, a phase is created in the workflow repo (`bootstrap_agentic_workspace.sh`) for the operator to run there: bring the workflow's explain references and `create-phase` in line with the plugin's new rules, released as a new workflow version.
- Operator, mid-run (verbatim): "and make it possible only change in knowledge from now on. I mean, that's what pointer is for isn't it? why did we need to work twice." — The workflow's explain text is meant to point at the plugin's sections and restate nothing; a few rules leaked into it, which is the only reason a writing-rule change needs both repos. So the workflow-repo phase is a one-time cleanup that removes the restated writing, placement and linking rules and leaves pointers only, so that from then on a change to how documents are written is made in this repo alone. This phase helps that hold: it keeps the plugin's section numbers and headings stable (the workflow cites them by number and heading), and writes each new rule in full in the plugin so the workflow can point at it without repeating it.

## Notes

- Not a visual design phase. Runs on the default stream.

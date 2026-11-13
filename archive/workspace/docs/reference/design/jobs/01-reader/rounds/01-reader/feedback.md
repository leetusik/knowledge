# Feedback — job `01-reader`, round `01-reader` (slice P29.S4)

- **Received:** 2026-10-19, in the session, at the round's PENDING #1.
- **Canvas version reviewed:** `1792340688-1a72`. Opening it in the app saved `1792394126-dcf6`, with
  no project file changed (see *Operator edits*).
- **Outcome:** feedback, not approval. The round closes **superseded**, and round `02-revise` re-drafts
  the job on the same canvas.

## The operator's words, verbatim

### First message, 2026-10-19

```
1. prototype state too big. which is fine. but just make it doesn't follow scroll.
---
1. ASCII art you mean the "one FastAPI process, one uvicorn worker" this trash already in pc
2. make the tables, and text bodies got same width. wide table scroll on mobile is fine.
3. no ok.
4. agree
5. fine
6. yes
7. yeah
8. don't care
9, 10 yes
```

The block above the `---` is about the canvas itself, the prototype's state bar. The list below it
answers the round's ten open questions by number (`result.md` → *Open questions, for the operator*;
`phase.md` → Q9), against the orchestrator's PENDING #1 report.

### The orchestrator's reading, put back to the operator for confirmation (not the operator's words)

> No edits or comments came back from the canvas; the newer version there is just the app saving when
> you opened it, and all 39 files match. So your message is the whole feedback. It changes what's
> drawn, so the reader gets one more round: same canvas link, new version, reviewed again, then this
> stop again.
>
> Here's how I read your notes. Answer by number like last time, and I'll start the redraw.
>
> 1. **State bar.** It keeps its size but scrolls away with the page. Today it stays pinned because the
>    chapter scrolls inside a frame beneath it. Should this apply to every canvas from now on (waves 2
>    and 3 too)? If yes, I'll add it to your standing design rules so you don't have to repeat it.
> 2. **Tables (your Q2).** Tables get the same width as the text column, which stays as narrow as it is
>    now. A table wider than the column scrolls sideways in its own box, on a phone as now and on a
>    desktop too. I'd treat code blocks the same, so every block lines up on one edge. The cost is that
>    long code lines wrap sooner. OK?
> 3. **ASCII art (your Q1).** Yes, that's the one, and it really is broken on PC, for two reasons:
>    - its top border is 73 characters wide while every other line is 74, so the top-right corner
>      doesn't meet;
>    - the line spacing leaves gaps in the vertical lines.
>
>    My proposal: in new chapters a drawing like this becomes a real diagram, which wave 2 designs, so
>    this round shows a placeholder in that spot. Plain ASCII art stays only for old Markdown
>    documents, drawn with its lines joined and the corner fixed in the sample. OK?
> 4. **Korean font (your Q5).** I read "fine" as yes to my suggestion: a Korean serif such as Noto
>    Serif KR for chapter text, and Pretendard for buttons and menus. Say so if you meant Pretendard
>    throughout.
>
> These need no answer:
> - **Mark as unread:** reading to the end again finishes the chapter again. In P30, Mark as unread
>   resets that chapter's progress.
> - **Korean words inside English text** stay unbroken.
> - **Unchanged, as drawn:** no Copy link or Print button, the reader's own top bar, the secondary Sign
>   in button, and the reader's own text sizes.
> - **Literata, the edge-to-edge bars and the callout colours stay as drawn.** You didn't take up the
>   Warning colour; say if you want it.
> - **Design system (your Q8):** the reader's new values (sepia, Literata, sizes) go into the code in
>   P30 and reach the design system at the next sync from code. Waves 2 and 3 take them from this
>   canvas until then.
>
> The slice stays waiting on you until you confirm.

### Second message, 2026-10-19: the operator's confirmation

```
ok
```

## What the words settle

Each line is the reading above, confirmed by the operator's "ok". Round `02-revise`'s handoff carries
them.

| Item | The operator's words | Settled |
|---|---|---|
| State bar | "prototype state too big. which is fine. but just make it doesn't follow scroll." | Its size stays. It scrolls away with the page and is never pinned. Applies to every canvas from now on: `bar.md`, rule 1. |
| Q1, ASCII art | "ASCII art you mean the "one FastAPI process, one uvicorn worker" this trash already in pc" | A drawing like this becomes a `diagram` block in a native chapter; the `diagrams` job (P29.S5) designs it, and this job shows a placeholder in its spot. A plain ASCII `text` block stays only for old Markdown documents, drawn with its lines joined and every line the same width. |
| Q2, tables | "make the tables, and text bodies got same width. wide table scroll on mobile is fine." | Tables and code blocks take the text column's width, which stays as it is. A table wider than the column scrolls sideways in its own box on every screen, the phone's box as drawn. |
| Q3, Copy link and Print | "no ok." | No Copy link and no Print in the reader's chrome, as drawn. |
| Q4, where a member reads | "agree" | The reader's own chrome, with no app shell, as drawn. |
| Q5, the Hangul face | "fine" | A Korean serif (Noto Serif KR, the example accepted) for chapter text; Pretendard for the interface. |
| Q6, Hangul inside English | "yes" | The renderer wraps each Hangul run inside English in `lang="ko"`, so it never breaks mid-word. |
| Q7, "Sign in to save" | "yeah" | "Sign in" stays a secondary button, as drawn. |
| Q8, the reader's tokens | "don't care" | The default path: the values are built into the code in P30 and reach the `kb` system at the next sync from code. Waves 2 and 3 take them from this canvas until then. |
| Q9, interface type | "9, 10 yes" | The reader keeps its own 13 and 15 px steps, as drawn. |
| Q10, Mark as unread | "9, 10 yes" | A re-read to the end finishes the chapter again. Mark as unread resets that chapter's progress (`max_fraction`), an exception to S3's "only grows" that P30 builds. |
| Taste calls (critique 2b) | none | Literata, the edge-to-edge bars and the callout grounds stay as drawn. The Warning tint was offered and not taken. |

## Comments

None. `ArtifactComments` `read` on 2026-10-19: "No comment threads on this artifact yet."

## Operator edits

None. The canvas was read back on 2026-10-19 at version `1792394126-dcf6`: all 39 `project/` files,
`ds/kb/` included, are byte-identical to `jobs/01-reader/canvas/project/`. The newer version is the
app saving on open.

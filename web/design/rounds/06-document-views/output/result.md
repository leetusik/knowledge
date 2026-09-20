# Round 06 — result (the record)

**Phase/slice:** P27.S5 · **Round:** 06-document-views · **Date:** 2026-09-21
**Brief:** `web/design/rounds/06-document-views/handoff.md` · **Contract:** `build-prompt.md` beside this file.
**Cards:** `33-doc-column.html` … `41-doc-states.html`, in the pane under `⏳ P27.S5 · Document views`.

The round designed the reading page at 390 / 768 / 1180 for both bodies, the two capabilities the
operator asked for, and the thing that had never existed in any form: paper. Nine cards, two additive
stylesheets (`docview-r6.css`, `print-r6.css`), six new tokens, ten new strings, one behaviour
correction.

All ten questions in §6 were posed back to the operator and returned **"decide for me"**. Every one is
answered below, in the design and in the contract; none is left open.

---

## What was settled

**1 · The reading column becomes a grid, and the three numbers stop disagreeing.** They disagreed
because one width was doing two jobs: holding a line of prose *and* holding a code fence, a wide GFM
table, a diagram. `.kb-prose` becomes a three-track grid — a centred **text** track at `--kb-measure`
and a **full** track at the article's own width. 64rem stays the page and becomes the bleed. 42rem, the
token declared at P12 and referenced nowhere in `web/src`, is adopted verbatim: *the round adds no
number of its own.* `.kb-prose`'s 46rem is retired. Below 42rem the side tracks collapse and a phone
sees no structural change at all.

The fact this makes expressible: the same document sat in **two different available widths** — a member
page has a rail, a public page does not — so with one max-width doing both jobs a stranger's prose
simply ran wider than a member's. At a fixed 42rem the two now read identically, and the only thing
that changes between them is how much paper is beside the column.

**2 · The framed explainer gets the full 64rem, not the measure.** It is a foreign page that has
already laid itself out, with its own table of contents and its own diagrams sized to the width it is
given. A 42rem column would margin it twice.

**3 · The actions row stops being a list and becomes two groups.** Left is where you came from; right is
what you can do with this document. Copy link · Export PDF · Full width, then a hairline, then Delete —
the one control that ends the page. The claim hint leaves the row: it is a sentence and was never a
control. At 390 the row is Back on its own line, three equal 44px cells, and Delete below a full-width
rule, so the destructive control is never a thumb-width from Copy link. Five controls in two groups read
as two decisions; five in a row read as five.

**4 · Both new controls appear on all three document surfaces, including a past version.** A reader who
needs a printed copy of an archived body needs it more than anyone. Copy link stays member-only and
Delete stays off the share surface and off the archive, unchanged.

**5 · The chrome-less view is `?view=full` on the document's own URL, for both bodies, with one exit.**
A query rather than a route, so browser back is the primary exit at every width, the view is linkable,
and the page's fetch, auth branch and 404 behaviour are untouched. It keeps a floating pill — always
visible, 44px, bottom-right on a pointer device, bottom-centre above the home indicator on a phone.
Not on hover and not on scroll-up: a phone has neither, and a reader who cannot find the way out of a
full-window view has been trapped by a feature they opted into. It is offered for markdown too, because
the reader is asking for the document without our furniture and that request does not change because
the body happens to be ours. It is called **Full width**, not "HTML only", for the same reason. The
superseded stamp is the one piece of chrome that stays — nobody may reach a stale body with the warning
stripped off it. The frame is the same sandboxed relay frame; nothing is ever served bare on our origin.

One correction fell out of designing the pill: **it must be a sibling of `.kb-app`, not a child.** The
shell declares `container-type: inline-size`, which brings layout containment, which makes it the
containing block for fixed descendants — a pill inside it pins to the bottom of the *document*, so on a
long explainer it is invisible. Round 03 moved the toast region out of the shell for exactly this
reason and wrote the reason down; this round is the second surface to need it.

**6 · The explainer frame's pre-measurement height stops being a viewport sum.** 26rem phone, 32rem
tablet, 40rem desktop — flat, per tier, exactly as round 05 re-cut the graph plate, and for the same
reason: the sum it replaces (`100dvh − topbar − 13rem`, floored at 30rem) was written before the
navigation bar existed. A mono line holds the box while we wait. After four seconds with no height, the
frame takes a stated 70rem, scrolls inside itself, and **says so** — the old behaviour, chosen rather
than inherited, with a line that offers the full-width view as the fix.

**7 · `.kb-prose` is formalized, twelve years of typography notwithstanding.** Body 0.98 → 1rem (the
0.98 was a hedge against a line length that no longer exists); `h1` joins round 03's fluid display ramp
instead of sitting at a flat 1.7rem; a heading following a heading loses its top margin; fences reach
the phone gutter and drop to 0.8rem; task lists lose their bullet. Round 03's `data-pri` stacking is
**deliberately not applied** to a document's own table: both column priority and row stacking need an
author to say which column is the row's name and which column may go, and a table that arrived in a
markdown push has nobody to ask. The table keeps its shape and the page lends it the full track behind
a faded scroller.

**8 · Paper is always light, and the page box is the measure.** At A4 with 15mm side margins the column
is 180mm ≈ 41rem — `--kb-measure` to within a millimetre — so the prose grid collapses to one column and
the bleed track disappears with it. Print re-declares the light palette over the scheme attribute *and*
over round 03's OS adoption, drops the paper tint to white, and darkens the ink to `#1b1714` because the
screen ink reads thin at 10.5pt. Teal survives in exactly one place: nowhere. On paper the accent has no
job. No rule in `print-r6.css` names a paper size; A4 and Letter differ only in where the break falls.

**9 · What is on the sheet, and what the browser puts there.** Printed: a masthead (wordmark ·
canonical URL · version · date printed), the title block, the metadata strip flattened to one wrapped
definition line with tags as plain text, the body, and a colophon that repeats the identity because the
first and last pages of a printed document get separated on a desk. Dropped: the shells, the actions
row, the claim hint, the version-history panel, the exit pill, every shadow and every animation.
**Page numbers are the browser's** — browsers do not implement `@page` margin boxes, and a design that
drew its own would be drawing a picture of one. The export copy says so rather than pretending.

**10 · A printed link carries its target; a printed archive shouts.** Every link whose text is not
already its href prints its URL in mono after the text, which is the difference between a document and a
souvenir — `MarkdownBody` absolutizes relative hrefs against the canonical URL first, and marks a
self-naming link `data-bare`. The superseded banner prints, boxed, above the title, and may never split
across a break; the version repeats in the masthead and the colophon. A reader holding a piece of paper
is the one reader who cannot check whether it is current, and a printed archive body that does not say
it is archived is the single most dangerous artefact this product can produce.

**11 · The quiz on paper: honest, not clever.** We may not style inside the sandbox, so we cannot
suppress the quiz, re-flow the diagrams or hint a break inside the frame. The design therefore gets out
of the way — the card's border, radius and background drop, so the foreign page sits *on* the paper
rather than in a box on it — and prints one caveat line under it. Because the print stylesheet drops the
chrome itself, the output is identical from the normal page and from the full-width view, which is why
Export PDF never switches views first. The one case the pipeline cannot deliver is a frame that never
reported a height: the export control names it **before** the dialog opens and points at the full-width
view.

**12 · One silent failure is made audible.** Today a version-history fetch that fails returns an empty
array, and an empty array renders no panel — so an outage is indistinguishable from a document that has
never been re-published. The panel now renders with round 03's `.kb-panel` + `.kb-editorial`
composition and says what happened. An empty array still renders nothing: a document with no history
genuinely has no panel.

---

## What was rejected

- **A better viewport sum for the frame.** The sum asks "how much window is left"; on a phone the honest
  answer changes with the URL bar. Round 05 settled this argument for the plate.
- **Stacking a document's GFM table** (round 03's phone rule). It would invent a heading column and drop
  a column at random.
- **A hover or scroll-up bar in the full-width view.** No hover on a phone, and a bar that hides is a bar
  a reader has to discover twice.
- **A separate `/documents/{id}/full` route.** A query costs no route, no fetch, no auth branch and no
  404 path, and browser back works for free.
- **Drawing our own page numbers or running header.** Not implementable in a browser print; naming the
  browser's own footer in the copy is cheaper than faking it.
- **Suppressing or restyling the quiz on paper.** Impossible inside the sandbox, and the round will not
  design a thing it cannot ship.
- **Changing `--kb-measure` from 42rem to 46rem.** Additive-only holds; the token was right, it was just
  never wired.

## What an implementer must not "improve"

- Do not add `allow-same-origin`, and do not serve document HTML on our origin in the full-width view.
- Do not restore `.kb-prose { max-width }`. The grid is the measure; a max-width on top of it silently
  re-narrows the full track.
- Do not give the explainer frame the prose measure "for consistency".
- Do not hide the exit pill on scroll, and do not make Esc the only exit.
- Do not print teal, do not print the version-history panel, and do not let the superseded stamp become
  a quiet line in the header.
- Do not make an empty version array render the failure panel.

---

## The cards

| Card | What it shows |
| --- | --- |
| `33-doc-column.html` | The three numbers, the track map, and the two available widths at 390 / 768 / 1180 |
| `34-doc-actions.html` | The row as two groups, the phone's two rows and a line, the surface matrix, the strip |
| `35-explainer-frame.html` | The box at full width, the four states of the height handshake, the ToC jump |
| `36-markdown-body.html` | The ladder, the fence and the table at 390, lists, figures, the empty body, dark |
| `37-versions.html` | The panel with its columns ranked, and the past version's five-field strip |
| `38-html-only.html` | What goes and what stays, both bodies at 1180 and 390, the three ways out |
| `39-export-control.html` | Four states, iOS, and the ten new strings |
| `40-printed-page.html` | A4 and Letter at 1:1 — markdown, a past version, an explainer, kept vs dropped |
| `41-doc-states.html` | Two not-founds, the bounce, the wait, the relay's failures, the silent one |

Every screen card is real `.kb-app` frames at real widths — the console queries its container, so a
390px frame *is* the phone layout. Card 40 is drawn as paper at 1:1 in millimetres, with the print rules
mirrored onto `.r6__paper`; `print-r6.css` is the shippable truth and the mirror is labelled as a
picture of it. The content in every frame is real: `docs/current/frontend.md` at v0016 and its sixteen
archived versions, the P16 explainer, a two-line cutover note, a document with no tags and no source.

## Files in the project

| File | What it is |
| --- | --- |
| `docview-r6.css` | The screen delta — additive, replaces the bodies of `prose.css` and `explainer.css` |
| `print-r6.css` | The paper delta — the first `@media print` rule this product has ever had |
| `specimen-r6.css` | Specimen chrome: the foreign-page stand-in, the paper sheets, the print mirror |

Two files rather than one, deliberately: paper is a different medium, not a narrow screen, and a
reviewer should be able to read every rule that governs it without reading a screen rule.

## Housekeeping

Round 05's cards 27–32 have had their `⏳ P27.S4 · ` prefix retired: the group is now `Graph`. Line 1
only; nothing else in those files was touched. Round 05's record and contract are now
`round-05-result.md` and `round-05-build-prompt.md`, as rounds 03 and 04's were.

## Still open

Nothing from §6. Two things for P28 to watch, both named in the contract's acceptance checks:

- **Printing a tall iframe is engine-dependent.** Chromium and WebKit print a content-sized frame in
  full; Gecko has historically clipped one. The design does not depend on it — the caveat line and the
  full-width fallback cover the bad case — but the check is written so P28 finds out rather than a reader.
- **The four-second unmeasured timeout** is the round's one new timing. It exists so "this document is
  broken" is never said about a slow one; if real relays are slower, raise it rather than removing the
  state.

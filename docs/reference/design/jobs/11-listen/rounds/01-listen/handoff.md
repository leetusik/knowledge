# Handoff — 11-listen / 01-listen (P41-sr.D1)

brief: waves/P41-sr.D1/brief.md

new visual direction: no

critique: critic

## Scope boundary

This job designs **Listen**: the control that starts it and the player that plays it, on the surfaces a reader
moves between. Every surface of the group:

- the **reader**, for a loose document and for a book chapter, with the Listen control and the **docked**
  player;
- the **opened player**, with its full controls and the chapter list of a book;
- the **book landing**, with Listen for the whole book and resume.

**The entry Page** (`Main.dc.html`) runs the flow:
1. the book landing;
2. Listen;
3. the chapter in the reader, with the docked player playing;
4. the opened player;
5. back to the text.

It also reaches a loose document's Listen.

**Not this slice:**
- **P36-1s's Hermes panel and drawer** (its own branch; its design slice D1 has not started). On desktop it
  plans a side panel beside the reading column. On phone and tablet it plans a drawer, and an "Ask Hermes"
  action in the annotation popover. Listen's docked player must leave room for a panel beside the column and
  a drawer from the bottom or side. **Draw no Hermes surface**; say in `## Build` how the player sits beside
  one.
- **The lock screen and Control Centre.** The OS draws them (R3); a build item.
- **The voice samples page.** Not a product surface: the operator picks the voice there.
- **The reader's existing sheets** (Contents, Display, Notes; jobs `01-reader`, `05-annotations`), the
  library, sign in. These are destinations outside the slice.

**Prototype first:** every screen × state below must be reachable on an interactive Page, by a click or,
where no click reaches it, by that page's state bar. The state bar scrolls away; it is never pinned (the bar).

## Pages

- **`reader` → `Reader.dc.html`.** The reader with Listen. The signed reader (job `01-reader`, closed
  snapshot) is the frame it joins; it never reshapes the top bar, the column or the bottom nav.
  - **The item it takes:** a loose document (title, language, length) or a book chapter (book, chapter
    number and title, language).
  - **It leads to:**
    - `player`, by opening the docked player;
    - `book`, by a chapter's back link (the code's top-bar back link goes to the book; below 40rem it reads
      "Book").
  - **Screens × states, each with its check:**
    - *document, idle, audio ready*: the Listen control with its length ("42 min" is the real figure). Check:
      found at the top of the document without hunting, and still reachable while reading, given that the top
      bar hides on scroll;
    - *document, idle, not yet made*: Listen with no length. Check: it says nothing false about how long
      preparing takes until it knows;
    - *chapter, idle*: Listen on a chapter, which plays the book **from this chapter onward**. Check: the
      reader can tell it continues past this chapter (open question 1);
    - *preparing, waiting*: the job waits for the voice runner (for example the Mac is off, "last seen …").
      Check: says why it waits and that it starts by itself; nothing else is blocked;
    - *preparing, making*: progress (part k of n, or a percentage) with a rough time left. Check: the reader
      can keep reading and leave the page; the progress never pretends precision it lacks;
    - *ready to start while still making*: the first part is ready, the rest is still being made. Check: one
      obvious tap plays; the unfinished remainder is visible but calm;
    - *tap to play*: preparing outlasted the tap, or the phone locked while preparing, so iOS needs a new tap.
      Check: the one action is plain and large enough for a thumb;
    - *loading at start, and buffering mid-play*. Check: a short wait reads as a wait, not an error;
    - *playing, docked*: the current title (and chapter), play or pause, the position. Draw it at phone
      390, 320, iPad and desktop. Check:
      - it never covers the text being read, the chapter's bottom nav or a sheet's controls;
      - it stays put when the top bar hides and returns;
      - it is reachable with one thumb;
      - it leaves room for a panel beside the column (desktop) and a drawer (phone): P36-1s;
    - *paused, docked*. Check: told apart from playing by more than colour;
    - *moving to the next chapter*: inside one stream this is a title change. Check: the reader sees the new
      chapter's title; the page under it does not jump unless they asked to follow;
    - *next chapter still preparing*: the current chapter ends before the next is made. Check: says it waits
      for the next chapter and resumes by itself;
    - *finished*: the end of the document, or of the book. Check: a clear end, and a way to start over;
    - *failed*, four flavours:
      - the voice could not make the audio (retry);
      - the free voice's **daily limit** reached, with when it can continue;
      - a playback error (network, or the session expired: sign in);
      - the document cannot be read.

      Check: each says what happened and the one thing to do, in the README's error voice;
    - *offline*: cannot start; or mid-play, it plays what is buffered, then stops. Check: honest about which;
    - *audio outdated*: the document changed since the audio was made. Check: the reader knows, and knows what
      happens next;
    - *follow along*, **if the drafter takes it**: the block being read is marked in the column. Check:
      - told apart from an annotation highlight (job `05-annotations`) and a term marker (job
        `10-reading-aids`);
      - it never scrolls the page against the reader's will;
      - it can be switched off;
    - *Korean document* ("우리의 기준: 성과 규칙 v1"). Check: Pretendard, `keep-all`, no awkward breaks;
    - *dark*: idle, playing and failed. Check: contrast measured.
- **`player` → `Player.dc.html`.** The opened player.
  - **The item it takes:** the current Listen: the unit (a document, or a book from a chapter onward), the
    current chapter and the position.
  - **It leads to:** `reader` (close, and "go to the text", which shows the chapter or block being read).
  - **Screens × states:**
    - *playing*. Check: every control has a name and a ≥ 44 px target, and the position is readable at a
      glance. It shows:
      - the title, and the chapter and book;
      - the position and the length, which is open-ended while still making;
      - a seek bar;
      - play and pause;
      - skip back and forward;
      - speed;
      - previous and next chapter;
    - *paused*;
    - *buffering*;
    - *speed choice open*. Check: the current speed is marked; choosing closes cleanly;
    - *chapter list* (a book): every chapter with its length and which are ready, being made or waiting, and
      the current one marked. Check: a 20-chapter book scrolls inside the player, never the page behind; a
      chapter not yet made says so;
    - *next chapter still preparing*;
    - *finished*: the end of the document or the book;
    - *failed* (the four flavours) and *offline*;
    - *resume offered*: on opening a book or document the reader left part-way ("Chapter 4 · 12:30") with
      "Start over". Check: resume is the obvious action; start over is reachable but not the default;
    - *audio outdated*;
    - *a document* (no chapters). Check: no empty chapter controls;
    - *long title* at 320 px, and a *Korean* title;
    - *phone 390 and 320, and desktop*; *dark*. Check: on desktop it never hides the reading column
      entirely, and the column behind stays readable or dimmed by the README's scrim rule.
- **`book` → `Book.dc.html`.** The book landing with Listen. It joins the signed book landing (job
  `07-book-page`, closed snapshot) and never reshapes it.
  - **The item it takes:** a book: its title, its chapters, and the listener's saved position if any.
  - **It leads to:**
    - `reader`, at the chapter where playback starts, with the docked player playing;
    - `player`.
  - **Screens × states:**
    - *never listened*: Listen to the book, with its length when known ("about 4 h"), or without when not
      yet made. Check: one primary Listen, in the README's single-accent rule; it does not crowd the landing's
      existing actions;
    - *in progress*: resume ("Chapter 4 · 12:30") and start over. Check: resume is the obvious action;
    - *preparing the book*: making ahead, with progress across chapters. Check: honest progress; the landing
      stays usable;
    - *finished*;
    - *failed* (the daily limit, with when it continues) and *offline*;
    - *20 chapters* ("changple5 curriculum"). Check: per-chapter readiness, if drawn, stays quiet in a long
      list;
    - *phone 390 and 320, desktop*; *dark*.

## Every link has a target in scope

- **The docked player** (`reader`, `book`) opens `player`: a real link, carrying the current Listen.
- **`player`'s close and "go to the text"** return to `reader`, at the chapter being read.
- **`book`'s Listen and resume** go to `reader`, at the starting chapter, playing.
- **A chapter's back link** goes to `book`.
- **Contents, Display, Language, Notes, the library and sign in** lie outside the slice. Show them as they
  are in the signed reader, unlinked, or as an in-canvas state that says what would be there. Never link off
  the prototype.

## A shared choice, one answer

**What the repo already answers** (quoted as existing):
- **sentence case**, and the pending label as the verb plus "…" (README, *Content fundamentals*);
- **no emoji**, anywhere (README);
- **one interactive accent**, `kb-accent`; status always carries its word (README, *Colour*);
- **the reader's top-bar actions**, and the hiding top bar (`reader-frame.tsx`, `reader.ts` `top`; job
  `01-reader`);
- **the chapter bottom nav**, "Previous · Contents · Next" (`reader.ts` `bottom`);
- **the scrim** under a sheet or dialog, `kb-scrim` (README).

**What the repo does not answer** (for the frame pass to give one answer each, before any page):
- the words: Listen, its preparing, waiting and resume labels;
- the time formats: a position (m:ss or h:mm:ss) and a length ("42 min", "about 4 h");
- the speed values;
- the skip amount in the page;
- the play, pause, skip, speed and chapter icons. No media icon set exists in the product, so these are inline
  stroke SVG, one set;
- the docked player as one shared component, used on `reader` and `book`;
- the preparing-progress pattern;
- the failure and offline messages;
- the follow-along mark, if taken.

## Alignment

Alignment means every button, text and box on every page, measured, never one component class. In
particular:
- the docked player's controls against the reading column's edges at each width;
- the opened player's controls on one grid.

## Job data

- **The documents and book:** the brief's *Shared data*.
- **Preparing figures:**
  - a document of 42 min may take from about 5 to about 40 minutes to make, depending on the voice;
  - a 4 h book takes 1–3.5 hours or more;
  - playback may start once the first part (a few minutes of audio) is ready.

  Show progress in those terms, never invented precision.
- **The daily limit:** a free API's daily cap ends the day's making, which resumes after a reset time. Use a
  realistic local time.
- **The voice runner:** the operator's Mac, when it is the runner, shows as "last seen" with a time.
- **No voice names, keys or account names** on the canvas.

## Open questions, posed back (only the operator's words settle them)

1. **Listen on a chapter: the book from here only, or also this chapter alone?** The cut says "book playback
   from here onward". Draw that, and say whether a chapter-only choice is needed.
2. **Tables are read aloud,** row by row: about 9 of the 42 minutes in "Our bar: performance rule v1". The
   operator may want a way to skip them. Draw nothing for this unless the frame finds a natural place; log it.
3. **Follow along:** take it or drop it, with the reason in `## Summary`.
4. **Preparing a book ahead** (R3's optional "Prepare" on the book landing), against making it only when
   played. Draw what the flow needs, and log the choice.
5. **A voice picker:** none is in scope. Log it if the design needs one.

## The required output

- The joined canvas tree, passing `design-check 11-listen`.
- **One round `result.md`** (the join's), with:
  - the verdict block, including `open_items:`;
  - a `## Summary` of 1 KB or less: what was drawn, departures, and open items with their ids;
  - a `## Build` complete enough to build from without inventing anything, including how the docked player
    sits beside P36-1s's planned panel and drawer.
- The frame and each page leave their own files under the round.

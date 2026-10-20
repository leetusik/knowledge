---
format: native
syntax: 1
---
## Check yourself {#check}

```quiz #check-quiz
title: Check yourself
items:
  - id: read-column
    type: choice
    prompt: How wide is the reading column?
    options:
      - {id: a, text: 30rem}
      - {id: b, text: "**36rem**"}
      - {id: c, text: 48rem}
    answer: [b]
    explain: The measure is `--rd-measure`.
  - id: pick-all
    type: choice
    prompt: Which are typed blocks?
    options:
      - {id: a, text: figure}
      - {id: b, text: callout}
      - {id: c, text: quiz}
      - {id: d, text: table}
    answer: [a, c]
    explain: Callouts and tables are plain Markdown.
  - id: recall-lock
    type: recall
    prompt: What does the write lock protect?
    answer: The manifest and the file, written together.
    explain: See [the section](#check).
  - id: fill-lock
    type: cloze
    text: The {{write lock|WRITE_LOCK}} is held around **every** {{write}}.
    explain: One writer at a time.
```

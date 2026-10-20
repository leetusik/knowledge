---
title: "The write lock"
format: native
syntax: 1
lang: en
summary: Why only one writer may change the ledger at a time.
tags:
  - fixture
  - concurrency
---
## Background {#background}

The Marlow ledger is an **invented** service. Two clerks writing to the same page at the same moment
would blur each other's numbers, so the ledger lets only one writer in at a time.

> [!IMPORTANT] The key idea
> A write lock lets one writer through and makes the others wait.

```figure #lock-figure
src: lock-tile
alt: A teal tile standing in for a picture of a lock
caption: The lock, *as a placeholder tile*.
```

## How it works {#how-it-works}

```diagram #lock-flow
kind: flow
title: Two writers and one lock
direction: right
nodes:
  - {id: a, label: Writer A, shape: pill}
  - {id: lock, label: Write lock, shape: store, tone: store}
  - {id: ledger, label: Ledger, tone: accent}
  - {id: b, label: Writer B, shape: pill}
edges:
  - {from: a, to: lock, label: asks}
  - {from: lock, to: ledger, label: one at a time}
  - {from: b, to: lock, label: waits, style: dashed}
```

## Quiz {#quiz-section}

```quiz #lock-quiz
title: Check yourself
items:
  - id: lock-choice
    type: choice
    prompt: How many writers hold the lock at once?
    options:
      - {id: one, text: One}
      - {id: two, text: Two}
      - {id: many, text: As many as ask}
    answer: [one]
    explain: That is what makes it a lock.
  - id: lock-recall
    type: recall
    prompt: What goes wrong without the lock?
    answer: Two writers blur each other's changes.
  - id: lock-cloze
    type: cloze
    text: A second writer {{waits|queues}} until the first lets go.
```

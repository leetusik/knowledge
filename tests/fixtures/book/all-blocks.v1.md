---
title: "Every block, once"
format: native
syntax: 1
lang: en
summary: An early draft of the fixture chapter.
tags:
  - fixture
  - blocks
---
## Background {#background}

This is the **first draft** of the fixture chapter. A paragraph has *emphasis* and `inline code`.

> [!IMPORTANT] The key idea
> A cache trades **freshness** for speed.

## Quiz {#quiz-section}

```quiz #quiz
title: Check yourself
items:
  - id: q-choice
    type: choice
    prompt: What does a cache trade away to be fast?
    options:
      - {id: a, text: Memory}
      - {id: b, text: Freshness}
    answer: [b]
    explain: A cached copy may be older than the origin.
```

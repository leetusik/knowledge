---
format: native
syntax: 1
---
## References {#references}

In-chapter: [the sources](#sources-list), [a source](#src-one) and [a quiz item](#q-ref).
Chapters: [same project](chapter:phases/p8), [with lang](chapter:phases/p8?lang=ko),
[with an id](chapter:phases/p8#background), [both](chapter:phases/p8?lang=en#background),
[other project](chapter:knowledge/phases/p30).
Documents: [loose](doc:write-lock), [other project](doc:finance/compound-interest).
An image: ![a diagram](asset:flow.png "Flow").
External: [https](https://example.com) and [http](http://example.com/path#frag).

```quiz
items:
  - id: q-ref
    type: recall
    prompt: Where is [the source](#src-two)?
    answer: In the [sources](#sources).
```

## Sources

```sources #sources
items:
  - id: src-one
    title: The CommonMark spec
    url: https://spec.commonmark.org/0.31.2/
    publisher: CommonMark
    date: "2024-01-28"
    accessed: 2026-10-21
    note: The grammar the format starts from.
  - id: src-two
    title: GitHub Flavored Markdown
    url: https://github.github.com/gfm/
```

---
format: native
syntax: 1
---
```figure #newline-ids
src: a.png
alt: A
caption: C
```

```quiz #newline-quiz
items:
  - id: |
      block-scalar-id
    type: recall
    prompt: P
    answer: A
  - id: ok-id
    type: choice
    prompt: P
    options:
      - id: |
          opt-a
        text: A
      - {id: b, text: B}
    answer: [b]
    explain: E
```

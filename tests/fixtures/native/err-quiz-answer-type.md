---
format: native
syntax: 1
---
```quiz #bad-answer
items:
  - id: nested-answer
    type: choice
    prompt: P
    options:
      - {id: a, text: A}
      - {id: b, text: B}
    answer: [[a]]
    explain: E
  - id: mixed-answer
    type: choice
    prompt: P
    options:
      - {id: a, text: A}
      - {id: b, text: B}
    answer: [a, 3, {k: v}]
    explain: E
```

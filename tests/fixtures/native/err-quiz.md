---
format: native
syntax: 1
---
```quiz #bad-quiz
items:
  - id: no-answer
    type: choice
    prompt: P
    options:
      - {id: a, text: A}
      - {id: b, text: B}
    answer: [c]
    explain: E
  - id: no-blanks
    type: cloze
    text: There is no blank here.
  - id: empty-blank
    type: cloze
    text: An {{|empty}} alternative.
  - id: bad-type
    type: essay
    prompt: Write.
```

---
format: native
syntax: 1
---
## Malformed {#Not_Valid}

## Twice {#twice}

## Twice again {#twice}

```figure #twice
src: a.png
alt: A
caption: C
```

```quiz #ids-quiz
items:
  - id: same
    type: recall
    prompt: P
    answer: A
  - id: same
    type: choice
    prompt: P
    options:
      - {id: a, text: A}
      - {id: a, text: B}
    answer: [a]
    explain: E
```

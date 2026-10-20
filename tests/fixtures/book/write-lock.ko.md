---
title: "쓰기 잠금"
format: native
syntax: 1
lang: ko
summary: 한 번에 한 명만 장부를 바꿀 수 있는 이유를 설명합니다.
translated_from:
  lang: en
  version: 1
tags:
  - fixture
  - concurrency
---
## 배경 {#background}

말로 장부는 **지어낸** 서비스입니다. 두 사무원이 같은 쪽에 동시에 적으면 숫자가 뒤섞이므로, 장부는 한 번에
한 명의 작성자만 들어오게 합니다.

> [!IMPORTANT] 핵심 아이디어
> 쓰기 잠금은 한 명의 작성자만 통과시키고 나머지는 기다리게 합니다.

```figure #lock-figure
src: lock-tile
alt: 잠금 그림을 대신하는 청록색 타일
caption: 잠금, *자리표시 타일로 표현*했습니다.
```

## 동작 방식 {#how-it-works}

```diagram #lock-flow
kind: flow
title: 두 작성자와 하나의 잠금
direction: right
nodes:
  - {id: a, label: 작성자 A, shape: pill}
  - {id: lock, label: 쓰기 잠금, shape: store, tone: store}
  - {id: ledger, label: 장부, tone: accent}
  - {id: b, label: 작성자 B, shape: pill}
edges:
  - {from: a, to: lock, label: 요청}
  - {from: lock, to: ledger, label: 한 번에 하나}
  - {from: b, to: lock, label: 대기, style: dashed}
```

## 퀴즈 {#quiz-section}

```quiz #lock-quiz
title: 확인 문제
items:
  - id: lock-choice
    type: choice
    prompt: 동시에 잠금을 쥘 수 있는 작성자는 몇 명인가요?
    options:
      - {id: one, text: 한 명}
      - {id: two, text: 두 명}
      - {id: many, text: 요청한 만큼}
    answer: [one]
    explain: 그래서 잠금이라고 부릅니다.
  - id: lock-recall
    type: recall
    prompt: 잠금이 없으면 무엇이 잘못되나요?
    answer: 두 작성자가 서로의 변경을 뒤섞습니다.
  - id: lock-cloze
    type: cloze
    text: 두 번째 작성자는 첫 번째가 놓을 때까지 {{기다립니다|대기합니다}}.
```

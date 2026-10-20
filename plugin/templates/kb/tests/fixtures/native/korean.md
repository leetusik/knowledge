---
format: native
syntax: 1
lang: ko
summary: 한국어 요약입니다.
---
## 배경

한국어 본문입니다. **강조**와 `코드`가 섞여 있습니다.
줄바꿈 뒤의 문장입니다.

## Mixed 혼합 제목

## 쓰기 잠금 {#write-lock}

| 용어 | 뜻 |
|---|---|
| 잠금 | 한 번에 하나 |

```diagram
kind: flow
title: 요청의 흐름
caption: 요청이 *잠금*을 거칩니다.
nodes:
  - {id: client, label: 클라이언트}
  - {id: lock, label: 쓰기 잠금, sub: 하나씩}
edges:
  - {from: client, to: lock, label: 요청}
```

```quiz #lock-quiz
title: 확인 문제
items:
  - id: ko-cloze
    type: cloze
    text: 한 번에 하나의 쓰기만 {{잠금|락}}을 얻습니다.
  - id: ko-recall
    type: recall
    prompt: 잠금은 왜 필요한가요?
    answer: 동시에 쓰면 파일이 깨지기 때문입니다.
```

잠금 뒤의 문단입니다.

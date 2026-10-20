---
format: native
syntax: 1
---
```diagram #handshake
kind: sequence
title: Sign in
actors:
  - {id: user, label: User}
  - {id: web, label: Web}
  - {id: api, label: API}
steps:
  - {from: user, to: web, label: Submit}
  - {from: web, to: api, label: POST /login, note: over TLS}
  - {from: api, to: web, label: token, style: dashed}
  - {from: web, to: web, label: store cookie}
```

```diagram #layers
kind: stack
title: The layers
nested: true
layers:
  - {label: Browser, tone: series-1}
  - {label: Next.js, items: [BFF, pages]}
  - {label: FastAPI}
```

```diagram #rollout
kind: timeline
title: The rollout
axis: {unit: days, from: 0, to: 30, ticks: [0, 10, 20, 30]}
lanes:
  - label: Build
    bars:
      - {from: 0, to: 12, label: Server, tone: accent}
      - {from: 10, to: 20}
    marks:
      - {at: 20, label: Review}
  - label: Ship
    bars: []
```

```diagram #per-day
kind: chart
title: Reviews per day
type: bar
x: {label: Day, categories: [Mon, Tue, Wed]}
y: {label: Reviews, min: 0, max: 50}
series:
  - {name: Cards, values: [12, 30, 7], tone: series-2}
  - {name: Highlights, values: [3, 4.5, 0]}
rules:
  - {at: 25, label: Goal}
```

```diagram #retention
kind: chart
title: Retention
type: line
x: {label: Days since review, numeric: {from: 1, to: 30}}
y: {label: Recall}
series:
  - {name: Recall, values: [1, 0.9, 0.8, 0.75]}
```

```diagram #spread
kind: chart
title: Spread
type: interval
x: {label: Deck, categories: [A, B]}
y: {label: Days}
series:
  - {name: Interval, values: [[4, 9, 21], [7, 15]]}
```

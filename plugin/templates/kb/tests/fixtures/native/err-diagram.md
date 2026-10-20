---
format: native
syntax: 1
---
```diagram #bad-flow
kind: flow
title: Bad flow
nodes:
  - {id: a, label: A, tone: purple, shape: hexagon}
  - {id: a, label: Again}
  - {id: b, label: 2024}
edges:
  - {from: a, to: ghost}
```

```diagram #bad-kind
kind: mindmap
title: Unknown kind
```

```diagram #bad-chart
kind: chart
title: Bad chart
type: interval
x: {label: X, categories: [a, b]}
y: {label: Y}
series:
  - {name: S, values: [[9, 1], [1, 2, 3, 4]]}
```

```diagram #bad-timeline
kind: timeline
title: Bad timeline
axis: {unit: days, from: 0, to: 10}
lanes:
  - label: L
    bars:
      - {from: 5, to: 20}
```

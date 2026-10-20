---
format: native
syntax: 1
---
```diagram #pipeline
kind: flow
title: The publish pipeline
direction: right
nodes:
  - {id: cli, label: CLI, shape: pill, at: [0, 0]}
  - {id: api, label: API, sub: FastAPI, at: [0, 1], tone: accent}
  - {id: disk, label: Disk, shape: store, at: [0, 2], tone: store}
  - id: doc
    label: documents
    shape: entity
    fields: [id, rel_path, version]
    at: [1, 2]
groups:
  - {id: server, label: Server, nodes: [api, disk, doc]}
edges:
  - {from: cli, to: api, label: POST}
  - {from: api, to: disk, style: dashed, tone: muted}
  - {from: api, to: api, label: retry}
```

```diagram #card-states
kind: state
title: A card's life
caption: From *new* to retired.
initial: new
final: [retired]
nodes:
  - {id: new, label: New, at: [0, 0]}
  - {id: learning, label: Learning, at: [0, 1]}
  - {id: retired, label: Retired, at: [1, 1], tone: muted}
edges:
  - {from: new, to: learning, label: first review}
  - {from: learning, to: retired}
```

```diagram #single-final
kind: state
title: Single final
final: done
nodes:
  - {id: start, label: Start}
  - {id: done, label: Done}
edges:
  - {from: start, to: done}
```

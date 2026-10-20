---
title: "Every block, once"
format: native
syntax: 1
lang: en
summary: A fixture chapter that uses every block type, callout type, diagram kind and quiz type once.
tags:
  - fixture
  - blocks
---
## Background {#background}

This chapter is an **invented fixture**. Every sentence in it is made up so that the reader can be
checked against a page that uses everything the native format allows. A paragraph has *emphasis*,
**strong** text, ~~strikethrough~~, `inline code` and an [external link](https://example.com/reading "Example").
Here is a link inside the chapter: [jump to the quiz](#quiz), and a link to a [source](#src-lantern).

> [!SKIP] Skip this if you already know what a cache is
> A cache keeps a copy of an answer close to the place that asks for it, so the next ask is cheap.

### A list and a table {#lists}

1. First, a numbered item.
2. Second, with a nested list:
   - a bullet inside
   - and another one
3. Third.

| Layer | Speed | Holds |
|:------|:-----:|------:|
| Memory | fast | `hot` keys |
| Disk | medium | `warm` keys |
| Remote | slow | everything |

> A plain quote, not a callout. It stays a quote.

---

## Callouts {#callouts}

> [!NOTE]
> A note with no title.

> [!IMPORTANT] The key idea
> A cache trades **freshness** for speed.
>
> - a list inside a callout
> - and a second item

> [!WARNING] Careful
> A stale entry can be served for as long as its time to live.

> [!CAUTION]
> Never cache an answer that depends on who is asking.

> [!DEFINITION]- Primer: time to live
> The time to live (TTL) is how long an entry may be served before it must be fetched again.

## Code {#code}

```python title="pebble/cache.py" #cache-get
def get(key, store, ttl=30):
    entry = store.get(key)
    if entry and entry.age < ttl:
        return entry.value
    value = fetch(key)
    store.put(key, value)
    return value
```

```text
client -> cache -> origin
```

## Images {#images}

An inline image: ![A small blue tile](asset:tile-blue "The blue tile").

```figure #fig-tile
src: tile-wide
alt: A wide gradient tile used as a placeholder photo
caption: A wide figure, *drawn by the fixture script*.
credit: "Generated for this fixture, no source"
width: wide
```

```figures #fig-row
caption: Two tiles side by side.
items:
  - image: tile-blue
    alt: A blue tile
    caption: The blue tile.
  - image: tile-green
    alt: A green tile
    caption: The green tile.
```

```figures #fig-mixed
caption: A diagram, an svg and a card in one row.
items:
  - diagram:
      kind: stack
      title: Three layers
      layers:
        - {label: Memory, tone: series-1}
        - {label: Disk, tone: series-2}
        - {label: Remote, tone: series-3}
    caption: The layers.
  - svg: |
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="4" y="4" width="32" height="32" rx="4" class="kb-stroke-accent" fill="none"/></svg>
    label: An outlined square
  - card:
      title: Remember
      body: |
        A cache is a copy.

        Copies go stale.
      tone: warn
```

## Diagrams {#diagrams}

```diagram #flow-request
kind: flow
title: A request through the cache
caption: A miss goes to the *origin* and fills the cache.
direction: right
nodes:
  - {id: client, label: Client, shape: pill, at: [0, 0]}
  - {id: cache, label: Cache, shape: store, tone: store, at: [0, 1]}
  - {id: origin, label: Origin, sub: source of truth, tone: accent, at: [0, 2]}
  - id: entry
    label: entries
    shape: entity
    fields: [key, value, age]
    at: [1, 1]
groups:
  - {id: edge, label: Near the client, nodes: [client, cache]}
edges:
  - {from: client, to: cache, label: GET}
  - {from: cache, to: origin, label: on a miss, style: dashed}
  - {from: cache, to: entry, tone: muted}
```

```diagram #state-entry
kind: state
title: The life of a cache entry
initial: fresh
final: [evicted]
nodes:
  - {id: fresh, label: Fresh, at: [0, 0], tone: ok}
  - {id: stale, label: Stale, at: [0, 1], tone: warn}
  - {id: evicted, label: Evicted, at: [0, 2], tone: muted}
edges:
  - {from: fresh, to: stale, label: ttl passes}
  - {from: stale, to: fresh, label: refetched}
  - {from: stale, to: evicted, label: dropped}
```

```diagram #seq-miss
kind: sequence
title: A cache miss
actors:
  - {id: client, label: Client}
  - {id: cache, label: Cache}
  - {id: origin, label: Origin}
steps:
  - {from: client, to: cache, label: GET key}
  - {from: cache, to: origin, label: GET key, note: only on a miss}
  - {from: origin, to: cache, label: value, style: dashed}
  - {from: cache, to: client, label: value, style: dashed}
```

```diagram #stack-layers
kind: stack
title: The three layers
nested: true
layers:
  - {label: Memory, items: [hot keys], tone: series-1}
  - {label: Disk, items: [warm keys, snapshots], tone: series-2}
  - {label: Remote}
```

```diagram #timeline-plan
kind: timeline
title: A four week rollout
axis: {unit: weeks, from: 0, to: 4, ticks: [0, 1, 2, 3, 4]}
lanes:
  - label: Build
    bars:
      - {from: 0, to: 2, label: Cache, tone: accent}
      - {from: 2, to: 3, label: Tests}
    marks:
      - {at: 3, label: Review}
  - label: Ship
    bars:
      - {from: 3, to: 4, label: Rollout, tone: ok}
```

```diagram #chart-bar
kind: chart
title: Requests per day
type: bar
x: {label: Day, categories: [Mon, Tue, Wed, Thu]}
y: {label: Requests, min: 0, max: 100}
series:
  - {name: Hits, values: [60, 72, 55, 80], tone: series-1}
  - {name: Misses, values: [20, 12, 25, 9], tone: series-4}
rules:
  - {at: 50, label: Target}
```

```diagram #chart-line
kind: chart
title: Hit rate over weeks
type: line
x: {label: Week, numeric: {from: 1, to: 6}}
y: {label: Hit rate, min: 0, max: 1}
series:
  - {name: Hit rate, values: [0.4, 0.55, 0.7, 0.78, 0.82, 0.85]}
```

```diagram #chart-interval
kind: chart
title: Latency spread
type: interval
x: {label: Path, categories: [Hit, Miss]}
y: {label: Milliseconds}
series:
  - {name: Latency, values: [[1, 2, 4], [20, 45]]}
```

```svg #svg-art
label: An arrow from the client to the cache
caption: Drawn by hand, *in SVG*.
svg: |
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 50" role="img" aria-label="Arrow">
    <title>Arrow</title>
    <defs>
      <marker id="head" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
      </marker>
    </defs>
    <rect x="4" y="12" width="40" height="26" rx="4" fill="none" stroke="currentColor"/>
    <rect x="116" y="12" width="40" height="26" rx="4" class="kb-stroke-accent" fill="none"/>
    <line x1="46" y1="25" x2="114" y2="25" stroke="currentColor" stroke-width="2" marker-end="url(#head)" vector-effect="non-scaling-stroke"/>
    <text x="14" y="29" font-size="9" class="kb-fill-muted">client</text>
    <text x="123" y="29" font-size="9" class="kb-fill-muted">cache</text>
  </svg>
```

## Best practices and next steps {#best-practices}

The shape matches common practice: a small fast layer in front of a slow one, with a bounded time to
live ([the Lantern cache guide](#src-lantern) — lantern.example). It diverges by keeping every
entry for the same time, which suits a fixture and nothing else ([a field report](#src-marlow) — marlow.example).

1. Measure the hit rate before tuning anything.
2. Give hot keys a longer time to live than cold ones.
3. Add a way to drop one key on demand.

## Quiz {#quiz-section}

```quiz #quiz
title: Check yourself
items:
  - id: q-choice
    type: choice
    prompt: What does a cache trade away to be fast?
    options:
      - {id: a, text: Memory}
      - {id: b, text: "**Freshness**"}
      - {id: c, text: Correctness of the origin}
    answer: [b]
    explain: A cached copy may be older than the origin.
  - id: q-multi
    type: choice
    prompt: Which of these are layers in the diagram above?
    options:
      - {id: a, text: Memory}
      - {id: b, text: Disk}
      - {id: c, text: Printer}
      - {id: d, text: Remote}
    answer: [a, b, d]
    explain: The stack lists memory, disk and remote.
  - id: q-recall
    type: recall
    prompt: Why must an entry have a time to live?
    answer: So a stale copy is eventually replaced by a fresh one.
    explain: See [the primer](#callouts).
  - id: q-cloze
    type: cloze
    text: A cache hit skips the {{origin|source of truth}}, and a miss {{fills|populates}} the cache.
    explain: Hits are cheap; misses pay the full price once.
```

## Sources {#sources-list}

```sources #sources
items:
  - id: src-lantern
    title: A guide to small caches
    url: https://lantern.example/guides/small-caches
    publisher: Lantern Docs
    date: "2024-03-01"
    accessed: 2026-10-21
    note: Invented for the fixture.
  - id: src-marlow
    title: One time to live for every entry
    url: https://marlow.example/reports/single-ttl
    publisher: Marlow Reports
    accessed: 2026-10-21
```

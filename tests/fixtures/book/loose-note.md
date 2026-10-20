---
title: "Compound growth in one page"
format: native
syntax: 1
lang: en
subject: "Fixture finance"
summary: How a small steady rate becomes a large number, with invented figures.
tags:
  - fixture
  - finance
---
## The idea {#idea}

A balance that grows by a fixed share each year grows by *more* each year, because the share applies to
a bigger number. All figures here are invented.

> [!NOTE]
> The rule of 72 says a rate of `r` percent doubles a balance in about `72 / r` years.

```diagram #growth
kind: chart
title: A balance growing at 6 percent a year
type: line
x: {label: Year, numeric: {from: 0, to: 5}}
y: {label: Balance}
series:
  - {name: Balance, values: [100, 106, 112.36, 119.1, 126.25, 133.82]}
```

## Worked example {#worked-example}

Start with 100 and add 6 percent each year. After one year you hold 106. After two you hold 112.36,
because the second 6 percent is taken from 106, not from 100 ([the Lantern primer](#src-lantern-primer)).

```quiz #check
items:
  - id: q-double
    type: cloze
    text: At 6 percent a balance doubles in about {{12|twelve}} years.
    explain: 72 divided by 6 is 12.
```

## Sources {#sources-list}

```sources #sources
items:
  - id: src-lantern-primer
    title: A primer on compound growth
    url: https://lantern.example/primers/compound-growth
    publisher: Lantern Docs
    accessed: 2026-10-21
    note: Invented for the fixture.
```

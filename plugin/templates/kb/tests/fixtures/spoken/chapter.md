---
format: native
syntax: 1
summary: How a sample's mean is read aloud.
---
Before any section.

## The mean {#mean}

The error shrinks as $`s / \sqrt{n}`$, see ![a falling curve](asset:curve.png) here.

- First item.
- Second item

  with a second paragraph.

  - A nested item.

> [!NOTE] Keep in mind
> A callout body.

| Quantity | Formula |
|---|---|
| mean | $`\bar{x}`$ |
| spread | |

```python
print("never read")
```

```quiz #check
items:
  - id: q1
    type: recall
    prompt: Is this read?
    answer: No.
```

```figure #fig
src: chart.png
alt: A bar chart of means
caption: Means by group.
```

```figures #row
caption: Two views.
items:
  - image: a.png
    alt: The first view
  - card:
      title: A card
      body: |
        The card body.
  - diagram:
      kind: stack
      title: Layers
      layers:
        - {label: UI}
    caption: The stack.
```

```diagram #flow
kind: stack
title: The stack diagram
layers:
  - {label: Browser}
caption: Read the title, not the layers.
```

```svg #art
label: An arrow
svg: |
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="none"/></svg>
```

```formula #tstat
tex: |
  t = \frac{\bar{x} - \mu}{s / \sqrt{n}}
alt: t equals x bar minus mu, over s over root n.
reading: How many standard errors the mean sits away.
where:
  - sym: '\bar{x}'
    means: the sample mean
  - sym: 'n'
    means: the sample size
```

## Sources {#sources-list}

```sources #sources
items:
  - id: src-one
    title: A source title
    url: https://example.com/
```

```glossary #glossary
terms:
  - id: mean
    term: Mean
    short: The average.
```

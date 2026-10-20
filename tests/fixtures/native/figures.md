---
format: native
syntax: 1
---
## Figures {#figures}

```figure #fig-full
src: chart-1.png
alt: A bar chart of reviews per day
caption: Reviews per day, *last month*.
credit: "Source: [the team](https://example.com/data)"
width: wide
```

```figure
src: photo_2.jpeg
alt: A desk
caption: The minimal figure.
```

```figures #row-two
items:
  - image: before.png
    alt: Before
    caption: Before the change.
  - card:
      title: After
      body: |
        The first paragraph of the card.

        A second paragraph with *emphasis*.
      tone: accent
```

```figures #row-three
caption: Three ways to show it.
items:
  - image: a.webp
    alt: The image
  - diagram:
      kind: stack
      title: Layers
      layers:
        - {label: UI}
        - {label: API, items: [FastAPI, uvicorn], tone: muted}
    caption: The stack.
  - svg: |
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" class="kb-stroke-accent" fill="none"/></svg>
    label: A square
```

Text after the row.

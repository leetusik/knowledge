---
format: native
syntax: 1
---
## Art {#art}

```svg #arrow-art
label: An arrow from A to B
caption: Drawn by hand, *in SVG*.
svg: |
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 120 40" role="img" aria-label="Arrow">
    <title>Arrow</title>
    <defs>
      <marker id="head" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
      </marker>
      <g id="dot"><circle cx="0" cy="0" r="3" class="kb-fill-accent"/></g>
    </defs>
    <line x1="10" y1="20" x2="100" y2="20" stroke="currentColor" stroke-width="1.5" marker-end="url(#head)" vector-effect="non-scaling-stroke"/>
    <use href="#dot" x="10" y="20"/>
    <use xlink:href="#dot" x="100" y="20"/>
    <text x="10" y="35" font-size="10" class="kb-fill-muted">A <tspan font-weight="bold">to</tspan> B</text>
  </svg>
```

```svg
label: JSON body
svg: "<svg viewBox=\"0 0 4 4\"><rect width=\"4\" height=\"4\" aria-hidden=\"true\"/></svg>"
```

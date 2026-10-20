---
format: native
syntax: 1
---
```svg #bad-element
label: A disallowed element
svg: |
  <svg viewBox="0 0 10 10">
    <rect width="10" height="10"/>
    <script>alert(1)</script>
    <foreignObject width="10" height="10"/>
  </svg>
```

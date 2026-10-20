---
format: native
syntax: 1
---
```svg #bad-attribute
label: A disallowed attribute
svg: |
  <svg viewBox="0 0 10 10">
    <rect width="10" height="10" onclick="alert(1)"/>
    <circle r="2" style="fill:red"/>
    <path d="M0 0" fill="#ff0000" class="text-red-500"/>
  </svg>
```

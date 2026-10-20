---
format: native
syntax: 1
---
```svg #bad-reference
label: An external reference
svg: |
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10">
    <use href="https://evil.example/sprite.svg#icon"/>
    <use xlink:href="data:image/svg+xml;base64,AAAA"/>
    <line x1="0" y1="0" x2="10" y2="10" marker-end="url(https://evil.example/m.svg#m)"/>
  </svg>
```

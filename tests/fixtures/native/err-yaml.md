---
format: native
syntax: 1
---
```figure #anchors
src: &name a.png
alt: *name
caption: C
```

```figure #tags
src: !!str a.png
alt: A
caption: C
```

```figure #dupes
src: a.png
src: b.png
alt: A
caption: C
```

```figure #broken
src: [a.png
```

```figure #fields
src: a.png
alt: ""
colour: red
width: full
```

```sources #not-a-mapping
- a
- b
```

---
format: native
syntax: 1
---
## Formulas {#formulas}

```formula #no-reading
tex: 'x + y'
alt: x plus y.
where:
  - {sym: 'x', means: the first}
```

```formula #no-alt
tex: 'x + y'
reading: The sum of two numbers.
where:
  - {sym: 'x', means: the first}
```

```formula #no-where
tex: 'x + y'
alt: x plus y.
reading: The sum of two numbers.
```

```formula #math-in-reading
tex: 'x + y'
alt: x plus y.
reading: The sum $`x + y`$ of two numbers.
where:
  - {sym: 'x', means: the first}
```

```formula #legend
tex: 'x + z'
alt: x plus z.
reading: The sum of two numbers.
where:
  - {sym: 'x', means: the first}
  - {sym: 'y', means: a symbol the formula lacks}
  - {sym: 'x_i', means: a script the formula lacks}
```

```formula #empty-where
tex: 'x'
alt: x.
reading: A number.
where: []
```

```formula #shapes
tex: 'x'
alt: x.
reading: A number.
size: large
where:
  - just a string
  - {sym: 'x', means: the number, note: an extra key}
```

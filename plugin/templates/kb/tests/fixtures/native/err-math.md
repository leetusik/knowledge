---
format: native
syntax: 1
---
## Inline {#inline}

A missing argument: $`x^`$.

An unclosed brace: $`{x + 1`$.

A double script: $`x^a^b`$.

An unknown command: $`\foo x`$.

A colour, which Temml would sanitize: $`\color{red}{x}`$.

A stacked fraction is display-only: $`\frac{a}{b}`$.

A link inside math: $`\href{https://example.com}{x}`$.

An environment inline: $`\begin{aligned} a \end{aligned}`$.

A cell break inline: $`a \\ b`$.

Too long: $`x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + y`$.

At the limit: $`x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + yyyy`$.

Too deep: $`{{{{{{{{{{{{{{{{{{{{{x}}}}}}}}}}}}}}}}}}}}}`$.

At the depth: $`{{{{{{{{{{{{{{{{{{{{x}}}}}}}}}}}}}}}}}}}}`$.

Not ASCII: $`α + β`$.

A comment sign: $`50%`$.

An unpaired left: $`\left( x`$.

Words go in a text argument, never commands: $`\text{a \alpha}`$.

A limit control off an operator: $`x\limits_0`$.

| Quantity | Formula |
|---|---|
| bad | $`x^^2`$ |

```formula #display
tex: '\begin{matrix} a \end{matrix}'
alt: a matrix.
reading: An environment outside the allowlist.
where:
  - {sym: 'a', means: an entry}
```

```formula #unclosed
tex: |
  \begin{aligned}
  a &= b
alt: a equals b.
reading: An environment with no end.
where:
  - {sym: 'a', means: the left side}
```

```formula #cell
tex: 'a & b'
alt: a, b.
reading: A cell break outside an environment.
where:
  - {sym: 'a', means: the left side}
```

```formula #nested
tex: '{\begin{aligned} a \end{aligned}}'
alt: a.
reading: An environment inside a group.
where:
  - {sym: 'a', means: the left side}
```

```formula #spacing
tex: |
  \begin{aligned}
  a &= b \\
  [c] &= d
  \end{aligned}
alt: a equals b, and c equals d.
reading: A line break followed by a bracket.
where:
  - {sym: 'a', means: the left side}
```

```formula #too-long
tex: 'x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + x + y'
alt: a long sum.
reading: Too long to typeset.
where:
  - {sym: 'x', means: a term}
```

```formula #control
tex: "\frac{a}{b}"
alt: a over b.
reading: A double-quoted YAML string turns the backslash and f into a form feed.
where:
  - {sym: 'a', means: the top}
```

```formula #symbols
tex: '\frac{a}{b}'
alt: a over b.
reading: Legend symbols are checked in the inline context.
where:
  - {sym: '\frac{a}{b}', means: the whole fraction}
  - {sym: 'a', means: 'the top, $`\color{blue}{a}`$'}
```

```glossary #glossary
terms:
  - id: term
    term: Term
    short: 'A definition with bad math: $`\sqrt`$.'
```

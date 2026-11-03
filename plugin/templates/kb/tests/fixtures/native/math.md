---
format: native
syntax: 1
---
## Inline math {#inline}

The rule $`t = s \times \sqrt{n}`$ holds; it costs $5 and $10.
Set $HOME/$USER first, and run $ `ls` to list them: dollars that are not math stay text.
A step *inside emphasis, $`\lambda = \mathrm{rate} \times \mathrm{time}`$*, and a [link to $`e^{-\lambda}`$](#display).
Two in a row: $`a`$$`b`$. A code span stays code: `x^2`, and so does $ `y` with a space.
The [t statistic](term:tstat) of $`\sum_i e_i^2`$ counts $`\lvert x \rvert \le 2`$ in one atom each.

| Quantity | Formula |
|---|---|
| mean | $`\bar{x}`$ |
| spread | $`\sigma^2 = \text{variance}`$ |

> [!NOTE] Inline math in a callout title: $`x^2`$
> And in its body, $`P(\text{no event}) = e^{-\lambda}`$.

## Why $`\sqrt{n}`$

The standard error shrinks with $`\sqrt{n}`$, so four times the sample halves it.

## Display {#display}

```formula #tstat
tex: |
  t = \frac{\bar{x} - \mu}{s / \sqrt{n}}
alt: t equals x bar minus mu, over s divided by the square root of n.
reading: The t statistic counts how many standard errors the sample mean sits from the mean you assumed.
where:
  - sym: 't'
    means: the [t statistic](term:tstat)
  - sym: '\bar{x}'
    means: the sample mean, $`\bar{x}`$ in the text
  - sym: '\mu'
    means: the mean under the null hypothesis
  - sym: 's'
    means: the sample's standard deviation
  - sym: 'n'
    means: the sample size; the error falls as $`\sqrt{n}`$ grows
```

```formula #steps
tex: |
  \begin{aligned}
  \lambda &= \mathrm{rate} \times \mathrm{time} \\
  &= 3 \times 2 \\
  &= 6
  \end{aligned}
alt: lambda equals rate times time, which is 3 times 2, which is 6.
reading: Multiply the rate by the time to get the number of events you expect.
where:
  - sym: '\lambda'
    means: the expected number of events
```

```formula
tex: '\frac{(\sum_i e_i)^2}{N \sum_i e_i^2}'
alt: the square of the sum of e i, over N times the sum of e i squared.
reading: One when every person does the same amount, and smaller as a few do most of it.
where:
  - sym: 'N'
    means: the number of people
  - sym: 'e_{i}'
    means: what person $`i`$ did
```

```quiz #check
items:
  - id: se
    type: recall
    prompt: What happens to $`\sqrt{n}`$ when the sample grows four times?
    answer: It doubles, so the standard error halves.
```

```glossary #glossary
terms:
  - id: tstat
    term: t statistic
    short: 'How far $`\bar{x}`$ sits from $`\mu`$, counted in standard errors.'
    long: 'It divides the gap by $`s / \sqrt{n}`$, so a bigger sample makes the same gap count for more.'
```

---
title: "Our bar: performance rule v1"
format: native
syntax: 1
lang: en
summary: How the scorer decides whether a run clears the bar, with its formulas and its terms.
tags:
  - fixture
  - reading-aids
---
## Scoring a run {#scoring-a-run}

The rule asks whether the average gain stands clear of its noise, and it answers with a [t-statistic](term:tstat).

The scorer takes each event’s P&L in % of [K](term:k) and computes $`s = \mathrm{mean} \div \mathrm{sd}`$ and $`t = s \times \sqrt{n}`$. Thirty events averaging +0.10 % of K with an sd of 0.25 % give $`t \approx 2.19`$, just over B6’s 2.0; fifteen such events give 1.55, enough for CONDITIONAL-GO’s 1.5 but not for B6.

```formula #tstat
tex: |
  \begin{aligned}
  s &= \frac{\mathrm{mean}}{\mathrm{sd}} \\
  t &= s \times \sqrt{n}
  \end{aligned}
alt: s equals mean over sd; t equals s times the square root of n
reading: 'Divide the average P&L per event by its spread, then multiply by the square root of the number of events: four times the events doubles the result.'
where:
  - sym: 't'
    means: 'the [t-statistic](term:tstat): how far the average P&L sits from zero, in standard errors'
  - sym: 's'
    means: 'the per-event [Sharpe ratio](term:sharpe)'
  - sym: 'n'
    means: 'the number of events'
  - sym: '\mathrm{mean}'
    means: 'the average P&L per event, in % of [K](term:k)'
  - sym: '\mathrm{sd}'
    means: 'the standard deviation of the P&L per event: how much it varies'
```

With the thirty events above:

```formula #worked
tex: |
  \begin{aligned}
  t &= \left(\frac{\mathrm{mean}}{\mathrm{sd}}\right) \times \sqrt{n} \\
  &= \left(\frac{0.10}{0.25}\right) \times \sqrt{30} \\
  &\approx 0.40 \times 5.48 \\
  &\approx 2.19
  \end{aligned}
alt: t equals mean over sd times the square root of n, equals 0.10 over 0.25 times the square root of 30, about 0.40 times 5.48, about 2.19
reading: 'Thirty events averaging +0.10 % of K with a spread of 0.25 % give a t-statistic of about 2.19, just over B6’s 2.0.'
where:
  - sym: 't'
    means: 'the [t-statistic](term:tstat)'
  - sym: '\mathrm{mean}'
    means: '+0.10 % of [K](term:k), the average P&L per event'
  - sym: '\mathrm{sd}'
    means: '0.25 % of K, the spread of the P&L per event'
  - sym: 'n'
    means: '30, the number of events'
```

Every figure in this chapter comes from a [walk-forward backtest](term:walkforward), so each result is [out-of-sample](term:oos) for the tuning before it and free of [look-ahead bias](term:lookahead). Why one good figure is not enough is the subject of Counting the trials. The rule also caps the worst [drawdown](term:drawdown) and takes a [haircut](term:haircut) off every result.

## Counting the trials {#counting-the-trials}

Picking the best of many backtests flatters it. The [deflated Sharpe ratio (DSR)](term:dsr) answers this. It is a probability, that the true [Sharpe ratio](term:sharpe) beats a bar, with the bar raised for the number of trials.

The scorer takes the [participation ratio](term:participation) of the trials’ correlation matrix, $`(\sum e)^2 \div \sum e^2`$ over its [eigenvalues](term:eigenvalue) $`e`$: ten perfectly correlated trials count as 1, ten independent ones as 10.

```formula #participation
tex: |
  N = \frac{\left(\sum_i e_i\right)^2}{\sum_i e_i^2}
alt: N equals the square of the sum of e i, over the sum of e i squared
reading: 'Square the sum of the eigenvalues and divide by the sum of their squares: ten perfectly correlated trials count as 1, ten independent ones as 10.'
where:
  - sym: 'N'
    means: 'the [participation ratio](term:participation): how many independent trials the set is worth'
  - sym: 'e_i'
    means: 'the i-th [eigenvalue](term:eigenvalue) of the trials’ correlation matrix'
  - sym: '\sum_i'
    means: 'add up over every eigenvalue, from i = 1 to the number of trials'
```

The [probabilistic Sharpe ratio (PSR)](term:psr) turns a Sharpe ratio into a probability: that the true one exceeds a chosen threshold, allowing for non-Normal returns; it rises with a longer record and positive skew and falls with fatter tails.

## When nothing happens {#when-nothing-happens}

With independent arrivals at a steady rate, the count over a stretch is Poisson with mean $`\lambda = \mathrm{rate} \times \mathrm{time}`$, and no event at all has probability $`e^{-\lambda}`$.

```formula #poisson
tex: |
  \begin{aligned}
  \lambda &= \mathrm{rate} \times \mathrm{time} \\
  P(\text{no event}) &= e^{-\lambda}
  \end{aligned}
alt: lambda equals rate times time; P of no event equals e to the minus lambda
reading: 'The longer the stretch, the more events you expect, and the chance of seeing none at all falls fast toward zero.'
where:
  - sym: '\lambda'
    means: 'the number of events you expect over the stretch'
  - sym: '\mathrm{rate}'
    means: 'events per unit of time, steady and independent'
  - sym: '\mathrm{time}'
    means: 'the length of the stretch'
  - sym: 'P(\text{no event})'
    means: 'the chance of seeing no event at all'
  - sym: 'e'
    means: 'Euler’s number, about 2.718'
```

```quiz #check-the-bar
title: Check the bar
items:
  - id: fifteen-events
    type: choice
    prompt: Fifteen events average +0.10 % of K with an sd of 0.25 %. Which bar does their t clear?
    options:
      - {id: b6, text: B6’s 2.0}
      - {id: conditional-go, text: CONDITIONAL-GO’s 1.5}
      - {id: both, text: Both}
      - {id: neither, text: Neither}
    answer: [conditional-go]
    explain: 'Fifteen such events give a t of about 1.55: over 1.5, under 2.0.'
```

```glossary #glossary
terms:
  - id: sharpe
    term: Sharpe ratio
    short: 'The average return divided by how much returns vary. Here it is counted per event: the mean P&L of the events divided by their standard deviation (sd). A higher ratio means steadier gains for the risk taken.'
    long: 'The scorer writes it as $`s`$. On its own it says nothing about luck: a short record can show a high ratio by chance. That is why the rule turns it into a t-statistic, and why the deflated and probabilistic versions turn it into a probability.'
  - id: dsr
    term: Deflated Sharpe ratio
    aliases: [DSR]
    short: 'A probability: how likely it is that the strategy’s true Sharpe ratio beats a bar, with the bar raised for the number of trials you ran. The more variants you tried, the higher the bar, so a lucky best result counts for less.'
    long: 'Testing many variants and keeping the best one inflates its Sharpe ratio by chance alone. The deflated Sharpe ratio corrects for that choice: it counts the trials as the participation ratio of their correlations, raises the bar to match, then asks how likely the true ratio is to clear it. The rule’s bar for it is [DSR BAR].'
  - id: psr
    term: Probabilistic Sharpe ratio
    aliases: [PSR]
    short: 'Turns a Sharpe ratio into a probability: that the true one exceeds a chosen threshold, allowing for returns that are not Normal. It rises with a longer record and positive skew, and falls with fatter tails.'
    long: 'It answers “how sure can I be?” rather than “how high is it?”. Two strategies with the same Sharpe ratio get different PSRs when one has the longer record or the thinner tails. The deflated Sharpe ratio is a PSR whose threshold is raised for the number of trials.'
  - id: participation
    term: Participation ratio
    aliases: [effective number of trials]
    short: 'How many independent trials a set of correlated trials is worth. Ten perfectly correlated trials count as 1; ten independent ones count as 10. The scorer computes it from the eigenvalues of the trials’ correlation matrix.'
    long: 'The scorer squares the sum of the eigenvalues and divides by the sum of their squares. When one eigenvalue carries everything, because all trials move together, the result is 1; when they are all equal, it is the number of trials. The deflated Sharpe ratio uses it as its count of trials.'
  - id: eigenvalue
    term: Eigenvalue
    short: 'A number that says how strongly a matrix stretches along one of its own directions. For the trials’ correlation matrix, each eigenvalue measures how much of their shared movement falls along one independent direction; together they add up to the number of trials.'
  - id: walkforward
    term: Walk-forward backtest
    short: 'A backtest that tunes the strategy on one stretch of history, tests it on the next stretch it has not seen, then steps forward and repeats. It imitates how the strategy would have been run live, one period at a time.'
    long: 'Each test window is out-of-sample for the tuning before it, so the stitched-together results avoid look-ahead bias. The rule tunes on [TUNING WINDOW] and tests on [TEST WINDOW] at each step.'
  - id: lookahead
    term: Look-ahead bias
    short: 'An error in a backtest that uses information that was not available at the moment of the decision, such as trading at the open on that day’s closing price. It makes results look better than anything you could have traded.'
  - id: oos
    term: Out-of-sample
    aliases: [OOS]
    short: 'Data the strategy was not tuned on. A result measured out-of-sample is a fairer guess at live performance than one measured on the same data that was used to choose the strategy’s settings.'
  - id: drawdown
    term: Drawdown
    short: 'The fall from the highest point the account has reached to a later low, in % of K. The largest drawdown in a record is the worst loss you would have sat through before the next new high.'
    long: 'It is measured from the running peak, not from the start, so a strategy can be up overall and still sit in a deep drawdown. The rule’s limit is [DRAWDOWN LIMIT] of K.'
  - id: haircut
    term: Haircut
    short: 'A deliberate cut to a backtested figure before you trust it, to allow for trading costs and for optimism the backtest cannot see. The rule cuts a result by [HAIRCUT] before comparing it with its bar.'
  - id: k
    term: K
    aliases: [position size]
    short: 'The position size that every event’s P&L is measured against. Writing P&L in % of K makes events of different sizes comparable: +0.10 % of K is a gain of one tenth of a percent of the position.'
  - id: tstat
    term: t-statistic
    aliases: [t]
    short: 'How far an average sits from zero, counted in standard errors. The scorer computes it from the per-event Sharpe ratio and the number of events: thirty events averaging +0.10 % of K with an sd of 0.25 % give 2.19, just over B6’s 2.0.'
    long: 'A larger value means the average is less likely to be luck. It grows with the square root of the number of events, so the same per-event Sharpe ratio needs four times the events to double it: fifteen such events give only 1.55, enough for CONDITIONAL-GO’s 1.5 but not for B6.'
```

## Sources {#sources-list}

```sources #sources
items:
  - id: src-rule
    title: "[SOURCE TITLE]"
    url: https://example.com/source
    publisher: "[AUTHOR]"
    date: "[YEAR]"
```

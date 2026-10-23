---
title: "How a French Press Brews Coffee"
date: 2026-10-24
format: native
syntax: 1
lang: en
subject: "Coffee"
summary: "How immersion brewing works in a French press, one tested recipe, and the mistakes a first-timer should avoid."
tags:
  - coffee
  - french-press
  - brewing
source:
  project: coffee
  repo: work
---

A French press makes coffee by soaking, not dripping, and that one fact explains almost everything about how to use it well. This chapter shows how the press works, walks through one tested recipe, and flags the mistakes a first-timer is most likely to make.

## How it brews {#how-it-brews}

**The grounds sit in the water the whole time.** Bodum, a press maker, has you put coarse ground coffee in the pot, pour in hot (not boiling) water, set the plunger unit on top without pressing it, and let the coffee brew for at least 4 minutes. Only then do you lower the plunger.

```diagram #press-flow
kind: flow
title: The four stages of a French press brew
direction: right
nodes:
  - {id: grind, label: Coarse grounds, sub: into the pot}
  - {id: water, label: Hot water, sub: not boiling}
  - {id: steep, label: Steep, sub: "lid on, plunger up"}
  - {id: press, label: Press slowly, sub: filter holds the grounds}
edges:
  - {from: grind, to: water}
  - {from: water, to: steep}
  - {from: steep, to: press}
```

Because the grounds never leave the water, you control strength with time and dose rather than with the speed of a drip. The plunger carries the filter, and it is the last step, not the first.

> [!NOTE] Why the grind matters here
> Bodum warns that fine grounds can clog the filter and create high pressure. Coarse grounds are not a taste preference; they keep the plunger moving.

## Brew your first cup {#recipe}

Here is one roaster's tested recipe, from Klatch Coffee Roasters' guide for a 34 oz press. Treat it as a starting point, not a law.

| Item | Klatch's recipe |
|---|---|
| Coffee | 54 g, medium coarse (about kosher salt) |
| Water | 700 g, hot |
| Ratio | 13:1 water to coffee |
| Steep | 4 min 30 s |

Klatch's steps ([Klatch guide](#s-r1-practice-03)):

1. Weigh the coffee and grind it to a kosher-salt texture.
2. Pour in the water and start a timer.
3. At the 1-minute mark, stir briefly: 5 seconds, in a circle.
4. Put the lid on and wait until 4:30.
5. Press the plunger down only until it reaches the grounds, without squeezing them.
6. Serve. The guide says the rest may go into a separate carafe to prevent over-extraction and an unpleasant mouthfeel.

> [!NOTE]- No scale?
> Bodum's own rule is 1 rounded tablespoon of coarse coffee per 4 oz (1.25 dl) cup ([Bodum instructions](#s-r1-found-02)). Bodum also says the pot's water should be hot, not boiling. We found no verified degree figure, so use "off the boil".

## Mistakes to avoid {#mistakes}

- **Grinding too fine.** It can clog the filter and create high pressure ([Bodum](#s-r1-found-02)).
- **Plunging hard.** Bodum says lowering the plunger slowly with minimal pressure gives the best results, and that excessive force can make scalding liquid shoot out of the pot.
- **Stirring with metal.** Bodum says to stir with a plastic spoon, because metal can scratch or chip the glass beaker.
- **Leaving it on the grounds.** Klatch pours the remainder into a carafe to prevent over-extraction.

## Best practices and next steps {#next-steps}

The mesh is why the cup tastes full, and also why a little sludge settles at the bottom. According to NutritionFacts.org, fine particles still get through the press's mesh screen ([NutritionFacts.org](#s-r1-science-01)). The same page says switching from a metal-mesh maker to a paper filter can cut more than 90 percent of cafestol, a cholesterol-raising fatty substance in coffee oil, which matters if you drink several cups a day and watch your cholesterol. It is one health site's summary, not a clinical recommendation.

Next steps:

1. Brew Klatch's recipe once exactly, and taste it.
2. Change one thing at a time: steep time, or the ratio. Klatch's author found 13:1 fuller than 15:1 with a dark roast, which is one person's result.
3. Pour all the coffee out right after pressing.

## Quiz {#quiz-section}

```quiz #quiz
title: Check yourself
items:
  - id: q-grind
    type: choice
    prompt: Why should you use a coarse grind in a French press?
    options:
      - {id: a, text: Fine grounds can clog the filter and create high pressure}
      - {id: b, text: Coarse grounds heat faster}
      - {id: c, text: Fine grounds never taste good}
    answer: [a]
    explain: Bodum's instructions warn that fine grind can clog the filter and create high pressure.
  - id: q-time
    type: recall
    prompt: Is the plunger pressed at the start or the end of the brew, and why?
    answer: At the end. The grounds steep in the water first (at least 4 minutes in Bodum's instructions), then the plunger is lowered.
  - id: q-force
    type: cloze
    text: Bodum says to lower the plunger {{slowly}} with minimal pressure, because excessive force can make {{scalding|hot}} liquid shoot out.
```

## Sources {#sources-list}

```sources #sources
items:
  - id: s-r1-practice-03
    title: "Brewing Coffee Using a French Press: Klatch Brew Guide"
    url: https://cdn.shopify.com/s/files/1/1607/0925/files/French_Press_-_Brew_Guide.pdf?3079
    publisher: Klatch Coffee Roasters
    accessed: 2026-10-24
  - id: s-r1-found-02
    title: BODUM coffee press user instructions
    url: https://m.media-amazon.com/images/I/81xl3nMFw4L.pdf
    publisher: Bodum
    accessed: 2026-10-24
    note: Hosted on Amazon's CDN; no date or version.
  - id: s-r1-science-01
    title: Paper-Filtered Coffee and Cholesterol
    url: https://nutritionfacts.org/2022/09/20/paper-filtered-coffee-and-cholesterol/
    publisher: NutritionFacts.org
    date: 2022-09-20
    accessed: 2026-10-24
```

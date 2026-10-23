A pressure cooker is an ordinary pot with a lid that locks and a valve that holds steam in. That one change makes food cook faster, and it is also the reason you have to follow a few rules when you use one. This chapter explains the first, then walks through the second in the order you will meet it at the stove.

## Why it cooks faster {#why-faster}

**A sealed pot changes the temperature at which water boils.** In a pressure cooker the lid is sealed, so [steam is captured and pressure builds](#s-r1-all-03). The physics reference HyperPhysics states the consequence: [food cooks faster because the boiling point of water increases with pressure](#s-r1-all-01).

```diagram #boil-flow
kind: flow
title: Why a sealed pot cooks faster
direction: right
nodes:
  - {id: seal, label: Lid sealed, sub: steam cannot escape}
  - {id: pressure, label: Pressure builds, shape: store, tone: store}
  - {id: boil, label: Boiling point rises, tone: accent}
  - {id: hot, label: Water and food get hotter, tone: warn}
  - {id: fast, label: Food cooks faster, tone: ok}
edges:
  - {from: seal, to: pressure}
  - {from: pressure, to: boil}
  - {from: boil, to: hot}
  - {from: hot, to: fast}
caption: The chain from a locked lid to shorter cooking times.
```

How much hotter? HyperPhysics gives a typical figure: the cooker vents at [about 15 pounds per square inch above atmospheric pressure, which raises the boiling point to about 121 °C (257 °F)](#s-r1-all-01). Atmosphere itself is about 14.7 psi, so that setting roughly doubles the absolute pressure inside the pot.

The savings depend on the food. One extension-service handout from Utah State University says [most recipes cook in one-third the time](#s-r1-all-02), but treat that as a rough guide, not a rule.

> [!NOTE]- Electric cookers may run at lower pressure
> The 15 psi figure describes a typical stovetop-style cooker. Hamilton Beach's manual says its electric model [runs at 9 to 12 psi](#s-r1-all-03), so a different model will have its own pressure and its own cooking times. Follow your own manual's times.

## Using one safely {#safe-use}

Almost every safety rule comes from one fact: the pot is closed, and steam must be able to leave through its valve in a controlled way. If the valve clogs or you open the lid early, pressure has nowhere safe to go.

### Before you lock the lid {#before-lid}

- **Check that the vent is clear.** The Utah State handout says to [look through the vent pipe before closing the cooker](#s-r1-all-02), and Hamilton Beach's manual says to [check the pressure release devices for clogging before each use](#s-r1-all-03).
- **Do not overfill.** The Utah State handout says [no more than two-thirds full for most foods and half full for dry rice, beans, vegetables or soups](#s-r1-all-02). Hamilton Beach gives the same limits for its cooker: [two-thirds, or one-half for foods that expand](#s-r1-all-03) such as rice. Overfilling risks clogging the vent pipe, which is the very valve you rely on.
- **Add liquid.** Steam needs liquid to form. Hamilton Beach recommends [at least 1 cup (237 mL)](#s-r1-all-03) for its cooker. Other models and recipes may differ, so check yours.
- **Skip foaming foods unless the recipe is written for a pressure cooker.** Applesauce, split peas, oatmeal and other cereals, pearl barley, noodles and rhubarb are on both lists of foods that sputter. The Utah State handout asks for [caution and a pressure-cooker-specific recipe](#s-r1-all-02). Hamilton Beach goes further: such foods can [foam, froth, sputter and clog the steam release valve](#s-r1-all-03) and should not be cooked in pressure mode.
- **Inspect the seal.** The Utah State handout says to [replace the sealing ring or overpressure plug when it becomes hard or soft and sticky](#s-r1-all-02).

### When the cooking time ends {#opening}

**Never force the lid.** Both sources say not to open the cooker until its pressure is fully released ([Utah State](#s-r1-all-02), [Hamilton Beach](#s-r1-all-03)). Hamilton Beach adds a useful test: if the lid is hard to turn, the cooker is still pressurized, so do not force it open.

The gentlest way to bring pressure down is **natural release**: you turn off the heat and wait. In Hamilton Beach's manual the lid unlocks when the float valve drops, which [may take 10 to 30 minutes or more, depending on the amount of food, and food may continue to cook meanwhile](#s-r1-all-03). Your own manual describes the other release methods your model allows, so read it before your first batch.

```diagram #steps
kind: flow
title: The order of a safe first use
direction: right
nodes:
  - {id: check, label: Check vent and seal}
  - {id: fill, label: Add liquid, sub: fill no more than 2/3 or 1/2}
  - {id: cook, label: Lock lid and cook, tone: accent}
  - {id: release, label: Release pressure, tone: warn}
  - {id: open, label: Open only when depressurized, tone: ok}
edges:
  - {from: check, to: fill}
  - {from: fill, to: cook}
  - {from: cook, to: release}
  - {from: release, to: open}
caption: Each step protects the next one.
```

Two things this chapter does not settle: how much time you save on a particular food, since the sources here give only rough figures, and the exact times and pressure for your model, which belong to its manual.

## Quiz {#quiz-heading}

```quiz #quiz
title: Check yourself
items:
  - id: q-boil
    type: choice
    prompt: Why does food cook faster in a sealed pressure cooker?
    options:
      - {id: a, text: "The lid traps heat so the burner can run hotter"}
      - {id: b, text: "Trapped steam raises the pressure, which raises water's boiling point"}
      - {id: c, text: Pressure forces water out of the food}
    answer: [b]
    explain: Boiling point rises with pressure, so the water and food get hotter than in an open pot.
  - id: q-fill
    type: choice
    prompt: You are cooking dry rice. How full may the pot be?
    options:
      - {id: a, text: Up to two-thirds}
      - {id: b, text: Up to one-half}
      - {id: c, text: "Right to the top, since rice absorbs water"}
    answer: [b]
    explain: Foods that expand, like rice, get the lower limit, because overfilling can clog the vent.
  - id: q-lid
    type: recall
    prompt: The lid will not turn after cooking. What does that tell you, and what do you do?
    answer: The cooker is still pressurized. Do not force it open; wait for pressure to release fully.
  - id: q-valve
    type: cloze
    text: Before you close the lid, look through the {{vent pipe|vent}} to make sure it is clear.
```

## Sources {#sources-list}

```sources #sources
items:
  - id: s-r1-all-01
    title: Pressure Cooker
    url: https://hyperphysics.gsu.edu/hbase/thermo/precook.html
    publisher: HyperPhysics, Georgia State University
    accessed: 2026-10-24
  - id: s-r1-all-02
    title: The Pressure Cooker (Cooking Under Pressure handout)
    url: https://extension.usu.edu/fscreate/files/handoutFCooksPressureCookingHandout.pdf
    publisher: Utah State University Extension
    accessed: 2026-10-24
  - id: s-r1-all-03
    title: Electric pressure cooker use and care manual
    url: https://useandcares.hamiltonbeach.com/files/840346901.pdf
    publisher: Hamilton Beach Brands
    accessed: 2026-10-24
    note: Manufacturer's manual; applies to its own model.
```

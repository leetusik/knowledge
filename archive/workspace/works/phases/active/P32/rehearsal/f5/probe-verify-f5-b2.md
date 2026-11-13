# Verification: 20261025-f5-probe · f5-b2
- verifier: claude-opus-5-5 · date: 2026-10-25 · claims: 3 · supported 3 · partial 0
  · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0
  · needs-rewrite 0
## Records
### V-C-r1-all-01-1
- claim: C-r1-all-01
- source S-r1-all-01 · opened: https://hyperphysics.gsu.edu/hbase/thermo/precook.html (curl; saved pages/f5-b2/S-r1-all-01.txt, HTTP 200) · quote-match: exact · passage at § "Pressure Cooker": found verbatim (line 3)
- looked first: the page is one short section, "Pressure Cooker" (by R Nave, HyperPhysics Thermodynamics). Its opening sentence gives the reason pressure cookers cook faster: water's boiling point rises with pressure. It then describes a pot with a vent set at a pressure above atmospheric, gives the typical vent pressure (about 15 psi gauge) and the boiling point that results (about 121 °C / 257 °F), and links that to the near-doubling of absolute pressure and the shape of the saturation vapour pressure curve. There are no hedges beyond "about" and "typical", and no conditions.
- implied: (1) speaker: HyperPhysics page, author R Nave, hosted at gsu.edu; (2) food can be cooked faster in a pressure cooker; (3) reason given ("since"): the boiling point of water increases with pressure.
- verdict: supported · reason: the claim restates P1 almost word for word and keeps the attribution to HyperPhysics (GSU). Minor point: the claim's `kind: definition` is wrong. It is an attributed causal fact, but that does not affect truth.
- bar: met (attributed descriptive claim: the page is rung 1 for what it says) · independence: n/a (single source, attributed form) · currency: the page is undated; the physics is long settled, and I saw no sign of a revision or erratum on the page
- counter: not run

### V-C-r1-all-02-1
- claim: C-r1-all-02
- source S-r1-all-01 · opened: https://hyperphysics.gsu.edu/hbase/thermo/precook.html (curl; saved pages/f5-b2/S-r1-all-01.txt, HTTP 200) · quote-match: exact · passage at § "Pressure Cooker": found verbatim (line 3)
- looked first: what the page says about vent pressure and temperature: "controlled vent at a specified pressure above atmospheric pressure"; "typical" venting pressure about 15 lb/in² above atmospheric; this "raises the boiling point to about 121°C or 257 °F". The next paragraph says that with atmospheric pressure at about 14.7 lb/in², this roughly doubles the absolute pressure, and that the saturation vapour pressure curve puts the boiling point near 121 °C. The page does not tell stovetop and electric models apart, and gives no source for "typical".
- implied: (1) "typical" (the page's own hedge); (2) venting pressure about 15 psi; (3) measured above atmospheric pressure, i.e. gauge pressure; (4) result: boiling point about 121 °C; (5) the same as about 257 °F; (6) the subject is water (from P1's context: "the boiling point of water increases with pressure").
- verdict: supported · reason: every item (typical, about 15 psi above atmospheric, vent, about 121 °C / 257 °F, water) is stated on the page at the locator. The claim's own text says "a typical pressure cooker" without the stovetop limit in its scope line (the page makes no such limit either). If the chapter means stovetop models only, the sentence should say so.
- bar: below (load-bearing descriptive, written in the chapter's own voice. B8 asks for one rung-1 source. HyperPhysics is a university teaching reference, a textbook-like rung-2 source for this claim, not the thing itself: it neither sets nor measures cooker vent pressures and does not cite a source for "typical". The fixes are the attributed form ("HyperPhysics gives…"), or a rung-1 source such as a manufacturer's spec for the 15 psi setting, or a steam table / USDA canning guidance for about 121 °C at 15 psig) · independence: n/a (single source) · currency: the page is undated; the 121 °C at about 15 psig relation is stable physics, but how "typical" 15 psi is for current cookers, electric models included, is not addressed by this source
- counter: not run

### V-C-r1-all-05-1
- claim: C-r1-all-05
- source S-r1-all-02 · opened: https://extension.usu.edu/fscreate/files/handoutFCooksPressureCookingHandout.pdf (pdf → text; saved pages/f5-b2/S-r1-all-02.pdf and .txt, HTTP 200 application/pdf) · quote-match: exact · passage at p.3 "Safety Tips": found verbatim (line 161, p.3)
- looked first: what the handout says about how full to fill a cooker. The only fill guidance is Safety Tip 2, on p.3: "Never overfill the pressure cooker. Never fill the pressure cooker more than ⅔ full for most foods or ½ full for dry rice, beans, vegetables or soups." Tip 1 tells readers to follow the instructions for their own model. Tip 5 asks for caution with sputtering foods (dry beans, split peas, cereals, pasta and others). The handout says on p.1 that its material is "adapted from Presto's Pressure Cooker School Lessons" and that SNAP funded it.
- implied: (1) speaker: Utah State University Extension handout (adapted from Presto material); (2) fill limit ⅔ for most foods; (3) fill limit ½ for "dry rice, beans, vegetables or soups" (the source's wording; whether "dry" covers every item in the list is left open by the source, and the claim keeps the same wording); (4) given as a "Never" safety rule.
- verdict: supported · reason: both limits and the list of foods match the passage, and the attribution to the USU Extension handout is kept. The "no more than" wording faithfully renders "never … more than".
- bar: met (attributed descriptive claim: the handout is rung 1 for its own statement) · independence: n/a (single source, attributed form; note that the handout's upstream is Presto, a manufacturer, so it does not count as independent of any Presto source the chapter cites) · currency: the handout is undated; its upstream link (gopresto.com/information/school/parts.php) suggests older material, but the fill rule is a general rule, and I saw no sign that it was superseded or corrected
- counter: not run
## Counter-evidence
(none: no claim in this batch was marked main)
## Leads
- (none)

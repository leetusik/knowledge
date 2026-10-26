# Verification: 20261025-r4-probe · r4-a
- verifier: claude-sonnet-5-5 · date: 2026-10-26 · claims: 2 · supported 1 · partial 1 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0
## Records
### V-C-r1-all-02-1
- claim: C-r1-all-02
- source S-r1-all-01 · opened: https://hyperphysics.gsu.edu/hbase/thermo/precook.html (curl, saved pages/r4-a/S-r1-all-01.txt) · quote-match: exact · passage at P2 § "Pressure Cooker": found verbatim
- looked first: the page is two short paragraphs. It says a pressure cooker is a pressurized pot with a controlled vent, that venting at about 15 psi above atmospheric is "typical", and that this puts the boiling point at about 121 °C or 257 °F. It also says the 121 °C figure follows from the saturation vapor pressure curve.
- implied: (a) typical vent pressure about 15 psi gauge: stated. (b) boiling point about 121 °C: stated. (c) 257 °F: stated by the page, but it is not equivalent to 121 °C. 121 × 1.8 + 32 = 249.8 °F, about 250 °F. 257 °F is 125 °C. The page's own pair of numbers is inconsistent, and the claim repeats the error. (d) "stovetop-style" in the researcher's scope note is not on the page. The page only says "typical".
- verdict: partial · reason: the 15 psi and 121 °C parts are directly stated. The "(257 °F)" part is wrong as a conversion of 121 °C, even though the source prints it. A search result snippet also gives 250 °F for 15 psi; I did not open that page, so it is only a pointer. · narrower claim: "In a typical pressure cooker the vent opens at about 15 psi above atmospheric pressure, which raises water's boiling point to about 121 °C (about 250 °F)." (the 250 °F is by arithmetic conversion, not stated by the source)
- bar: below (HyperPhysics is a university teaching reference by one instructor, with no peer review. It is rung 2 at best, not the thing itself, and the claim concerns third-party devices. A load-bearing descriptive claim wants a rung-1 source, such as a manufacturer manual, a steam table or a USDA/extension guide. The 257 °F figure should not be used.) · independence: one source only · currency: no date on page; physical constants, so low risk
- counter: not run

### V-C-r1-all-03-1
- claim: C-r1-all-03
- source S-r1-all-01 · opened: https://hyperphysics.gsu.edu/hbase/thermo/precook.html (curl, saved pages/r4-a/S-r1-all-01.txt) · quote-match: exact · passage at P3 § "Pressure Cooker": found verbatim
- implied: (a) atmospheric pressure about 14.7 psi: stated ("about 14.7 lb/in2"). (b) 15 psi gauge is about double the absolute pressure: stated ("about a doubling of absolute pressure"). Arithmetic: 15 + 14.7 = 29.7 psia, about 2 × 14.7. (c) "because": the source's "Since" supports the causal link. (d) sea-level scope is the researcher's note. The page gives no altitude, and 14.7 psi is the standard sea-level value.
- verdict: supported · reason: every part is stated by the source and checks out arithmetically.
- bar: met (not load-bearing: one opened rung-1/2 source directly supports it) · independence: n/a · currency: physical constants, no concern
- counter: not run

## Counter-evidence
none (counter-evidence ids: none; claims not marked main)

## Leads
- https://en.wikipedia.org/wiki/Pressure_cooker — rung 3; a pointer only, check upstream references for 15 psi and 250 °F
- https://modernistcuisine.com/mc/how-pressure-cookers-work/ — possible independent source on pressure and temperature; not opened

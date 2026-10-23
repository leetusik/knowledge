# Trace: 20261023-0350-free-threaded-cpython · body.md

## (lede)
- ¶1 s1: framing (a common belief); "for ordinary CPython it holds": C-r1-foundations-01
- ¶1 s2: C-r1-foundations-04, C-r1-foundations-33 (3.13), C-r1-foundations-36 (3.14 no longer experimental)
- ¶1 s3: framing

## background
- primer callout: definitions the chapter gives for itself; GIL sentence: C-r1-foundations-01
- ¶1 s1: C-r1-foundations-01
- ¶1 s2–s4: C-r2-evidence-09
- ¶2 s1: framing
- ¶2 s2–s3: C-r2-evidence-10
- ¶2 s4: C-r2-evidence-09 (I/O releases the GIL)
- ¶2 s5: framing, from C-r1-foundations-01

## what-it-is
- ¶1 s1–s2: C-r1-foundations-02
- ¶1 s3: C-r1-foundations-03 (the "ABI tag … the label compiled extensions and wheels carry": definition)
- ¶1 s4: framing; names: C-r1-practice-10, C-r1-practice-18, C-r3-practice-04
- ¶2: C-r1-foundations-02 (a configure flag; the GIL build stays the default and on python.org), C-r1-practice-07 (installed alongside)

## history
- ¶1 s1: framing
- ¶1 s2–s3: C-r1-foundations-38 (partial; the narrower wording used)
- ¶2 s1: C-r1-foundations-30
- ¶2 s2 + list: C-r1-foundations-31
- ¶3 s1–s2: C-r1-foundations-32
- diagram phases: C-r1-practice-01 (merged into C-r1-foundations-31), C-r1-foundations-33, C-r1-foundations-36, C-r1-foundations-40 (phase III undecided); edge "PEP 779 accepted": C-r1-foundations-35
- ¶4 s1: C-r1-foundations-33
- ¶4 s2: C-r1-foundations-34 (partial: "proposed")
- ¶4 s3: C-r1-foundations-35
- ¶4 s4–s5: C-r1-foundations-36
- ¶4 s6: C-r1-practice-05

## intuition
- ¶1 s1: exercise (a toy example)
- ¶1 s2–s3: C-r1-foundations-01 (only one thread runs Python code); "about as long as one after the other": analogy
- ¶1 s4: C-r1-foundations-11
- ¶2 s1–s3: C-r1-foundations-11
- diagram toy-timeline: analogy, marked as an illustration in its title and caption (C-r1-foundations-01, C-r1-foundations-11)
- ¶3 s1: exercise
- ¶3 s2: C-r2-evidence-09
- ¶3 s3: inference from C-r2-evidence-09 and C-r1-foundations-01 (framing)
- ¶3 s4: C-r2-evidence-17
- IMPORTANT callout s1–s2: C-r1-foundations-22, C-r1-foundations-12, C-r1-foundations-20 (summary of the How-it-works section)
- IMPORTANT callout s3: C-r1-foundations-09 (partial; the narrower wording)
- ¶4: C-r1-evidence-15 (attributed via LWN, 2024, 3.13 beta 1)
- chart shaw-bench: C-r1-evidence-15
- ¶5 s1: routine arithmetic on C-r1-evidence-15
- ¶5 s2: C-r1-evidence-15 (3.13 beta), C-r1-foundations-28 (3.14 changes); framing

## how-it-works
- ¶1 s1: framing
- ¶1 s2: framing (the section's own grouping)
- ¶2 s1: C-r1-foundations-17 (freed when the count reaches zero)
- ¶2 s2: framing (why counts need protecting; the rationale for C-r1-foundations-12)
- ¶2 s3: C-r1-foundations-12 ("proposes")
- bullet biased: C-r1-foundations-13
- bullet immortal: C-r1-foundations-15
- bullet deferred: C-r1-foundations-17
- ¶3: C-r1-foundations-20
- ¶4 s1–s3: C-r1-foundations-22, C-r1-foundations-23
- ¶4 s4–s6: C-r1-foundations-24
- ¶5 s1: framing (why reclamation matters; from C-r1-foundations-24/-25)
- ¶5 s2–s3: C-r1-foundations-25
- ¶6 s1: C-r1-foundations-27 (inline cache), C-r1-evidence-01 (PEP 659)
- ¶6 s2–s3: C-r1-foundations-27
- ¶6 s4: C-r1-foundations-28
- ¶6 s5: framing
- diagram safety-stack: C-r1-foundations-12, C-r1-foundations-13, C-r1-foundations-15, C-r1-foundations-17, C-r1-foundations-20, C-r1-foundations-22, C-r1-foundations-23, C-r1-foundations-24, C-r1-foundations-25; top layer: C-r1-criticism-04 (compound operations need external synchronization)

## status
- ¶1 s1: framing from the next two sentences
- ¶1 s2: C-r1-foundations-36
- ¶1 s3: C-r1-practice-05
- ¶1 s4: C-r2-criticism-11, C-r2-criticism-12 (C-r1-practice-06)
- ¶1 s5: C-r1-foundations-37
- ¶2: C-r1-practice-08 (attributed; D-03 left open), C-r1-foundations-36
- ¶3 s1: C-r1-foundations-40
- ¶3 s2: C-r1-foundations-40
- ¶3 s3: C-r1-foundations-41
- ¶3 s4–s5: C-r1-foundations-43 (an open issue, not a plan)
- ¶3 s6: C-r1-foundations-44
- ¶3 s7: framing from C-r1-foundations-43/-44 wording
- ¶4 s1: framing
- ¶4 s2: C-r2-criticism-13 (gap G-r1-07 stated)
- ¶4 s3: framing
- ¶4 s4: C-r1-cases-02 (attributed)
- ¶4 s5: C-r1-cases-13 (attributed, hedged "suspects")
- ¶4 s6: framing

## install
- ¶1 s1: C-r1-practice-07
- ¶1 s2–s3: C-r1-practice-08 (attributed)
- ¶1 s4: C-r1-practice-06 (C-r2-criticism-12)
- ¶2 s1: C-r1-practice-12 (partial; the guide's list; no pyenv option claimed)
- ¶2 s2–s4: C-r1-practice-11
- ¶3: C-r1-practice-10 (attributed to the guide)
- code "Trying it with uv": C-r1-practice-12 (`uv venv --python 3.14t`), C-r1-foundations-07 (`python -VV`)

## check
- ¶1 + bullets: C-r1-foundations-07
- code check-gil: C-r1-foundations-07
- ¶2 s1: framing
- ¶2 s2: C-r1-foundations-05
- ¶2 s3: C-r3-practice-09
- ¶2 s4: C-r1-foundations-06 (link forward)
- WARNING callout: C-r3-practice-15 (contested, D-09; both quotes); s3: C-r3-practice-09; s4: D-09 status open; s5: C-r1-foundations-07 (framing advice)

## overhead
- ¶1 s1: C-r1-evidence-03, C-r1-evidence-04 (a single-thread penalty exists)
- ¶1 s2: routine comparison of the ledgered numbers; D-01 open
- table row 1: C-r1-evidence-01
- table row 2: C-r2-evidence-04 (D-08)
- table row 3: C-r1-evidence-05 (partial: the "reported … around 10% (about 3% on macOS)" part)
- table row 4: C-r1-evidence-03
- table row 5: C-r2-evidence-03 (attributed)
- table row 6: C-r1-evidence-04, C-r2-evidence-01
- ¶2 s1: framing (defines pyperformance as the suite named in the sources)
- ¶2 s2: C-r2-evidence-01 (no measurement date printed); gaps/r2.md caution
- ¶2 s3: D-08 (nature: methodological)
- ¶2 s4–s5: routine reading of the ledgered numbers (C-r1-evidence-01, -03, -04, C-r2-evidence-03)
- ¶3 s1–s3: C-r1-evidence-06 (partial: "proposed"), C-v4-01, C-r1-foundations-35, C-r1-evidence-05 (partial)
- ¶3 s4: C-r1-criticism-24
- ¶3 s5: C-r2-evidence-18
- ¶4: gap G-r1-04 stated (gaps/final.md); advice: framing
- code bench: exercise (no factual claim; uses sys._is_gil_enabled from C-r1-foundations-07)
- ¶5: exercise; s2: C-r1-foundations-06 (an import can re-enable the GIL)

## ecosystem
- ¶1 s1–s2: C-r1-evidence-10
- ¶1 s3–s4: C-r1-evidence-10, C-r1-evidence-11
- ¶1 s5: verify/r1-b4.md note on C-r1-evidence-11 ("a free-threaded wheel exists, not works")
- ¶1 s6: C-r1-evidence-12
- ¶1 s7–s8: C-r1-evidence-13

## threads
- ¶1 s1–s3: C-r1-foundations-08
- ¶1 s4–s5: C-r1-criticism-11 (attributed)
- ¶2 s1: framing
- ¶2 s2–s3: C-r1-criticism-13
- ¶2 s4: C-r1-criticism-12
- ¶3 + table: C-r1-criticism-03 (rows 1–3), C-r1-criticism-05 (rows 4–5), C-r1-criticism-04 (row 6)
- ¶4 s1–s2: C-r1-criticism-04 (framing of check-then-act)
- ¶4 s3: C-r1-criticism-06
- code check-then-act: C-r1-criticism-04, C-r1-criticism-06
- ¶5 s1–s3: C-r1-criticism-10 (D-04 resolved-by-scope)
- ¶5 s4–s5: C-r1-criticism-15 (attributed)
- ¶6: C-r2-practice-21 (attributed)
- ¶7 s1: framing
- ¶7 s2: C-r2-criticism-08 (attributed; D-06)
- ¶7 s3: C-r1-criticism-11, C-r1-criticism-04 (D-06 side B)
- ¶7 s4: framing (advice resting on the docs' side)

## asyncio
- ¶1 s1: framing
- ¶1 s2: C-r2-practice-01
- ¶1 s3–s4: C-r2-practice-02
- ¶1 s5: inference stated from C-r2-practice-02
- ¶2 s1–s2: C-r2-practice-03
- ¶2 s3: C-r1-practice-22 (attributed)
- ¶2 s4: framing (no measurement found; C-r2-practice-11 points to an unread blog)
- diagram loop-per-thread: C-r2-practice-02, C-r2-practice-03
- ¶3 s1: framing
- ¶3 s2: C-r2-practice-09
- ¶3 s3: D-07 resolved-by-scope (C-r2-practice-01 vs -09)
- ¶3 list: C-r2-practice-07
- ¶4: C-r2-practice-08; s4: C-r2-practice-10
- ¶5 s1: framing
- ¶5 s2–s3: C-r2-practice-04
- ¶5 s4–s5: C-r2-practice-05 ("thread or process pool")

## multiprocessing
- ¶1 s1: framing; C-r2-evidence-10 (the docs' advice)
- ¶1 s2: C-r1-cases-22
- ¶1 s3: C-r2-evidence-12 (attributed)
- ¶1 s4: C-r1-evidence-16 (partial; the narrower wording)
- ¶1 s5: C-r1-evidence-17 (partial; attributed)
- ¶2 s1: framing, resting on C-r1-evidence-17 and C-r2-evidence-12
- ¶2 s2: C-r2-evidence-13 (partial; the narrower wording)
- bullet 1: C-r2-evidence-07; s3: inference from C-r1-foundations-01 (serialized under the GIL)
- bullet 2: C-r2-evidence-14 (attributed)
- bullet 3: definition (processes are separate programs, from the primer) + C-r2-evidence-19
- ¶3 s2–s3: C-r1-cases-16
- ¶3 s4: C-r1-cases-15
- ¶3 s5: C-r1-cases-18
- ¶3 s6–s7: C-r1-cases-20 (partial; the narrower wording)
- table: row 1 C-r1-foundations-08 (threads share objects, with locks) / C-r1-cases-18 / C-r1-cases-22; row 2 C-r1-foundations-11 / C-r1-cases-16 / C-r2-evidence-10; row 3 C-r1-criticism-04 / C-r1-cases-20 / C-r2-evidence-12 (no shared address space)

## web-services
- ¶1 s1: framing
- ¶1 s2: C-r2-evidence-09; "can only come from the CPU part": inference (framing)
- ¶2 s1: gap G-r1-03 stated
- ¶2 s2: research scope (gaps/r2.md, findings/r2-criticism.md Q20 note); C-r1-cases-01
- ¶2 s3: C-r1-cases-01 (attributed)
- ¶2 s4: C-r1-cases-03
- ¶2 s5–s6: C-r1-cases-05
- ¶2 s7: C-r1-cases-02
- ¶3 s1: gap G-r1-03 stated
- ¶3 s2: C-r1-cases-06, C-r2-criticism-01
- ¶3 s3: C-r2-criticism-05 (partial; the narrower wording)
- ¶3 s4: C-r2-criticism-02 (partial; the narrower wording)
- ¶3 s5: C-r2-criticism-03 (attributed only)
- ¶3 s6: C-r2-criticism-09 (partial), C-r2-criticism-07 (hedged)
- ¶4 s1–s2: gap G-r1-03 stated; verify/final-b6.md (machine transcript)
- ¶4 s3: C-r2-evidence-16 (attributed)
- the "2.5x" figure: dropped (gaps/final.md)

## dependencies
- ¶1 s1: C-r1-foundations-10
- ¶1 s2: C-r1-practice-18

## no-wheel
- ¶1 s1: C-r3-practice-01
- ¶1 s2: C-r3-practice-02
- ¶1 s3: inference from C-r3-practice-01/-02 and C-r1-foundations-10 (an extension must be rebuilt)
- ¶1 s4–s5: C-r3-practice-12 (partial; the narrower wording), C-r3-practice-14
- ¶1 s6: C-r3-practice-13
- diagram install-flow: C-r3-practice-01, C-r3-practice-02 (wheel then sdist), C-r3-practice-12 (needs a compiler), C-r1-foundations-06 and C-r3-practice-07 (GIL enabled, warning names the module), C-r2-practice-14 (unmarked GIL-build extensions)

## gil-reenabled
- ¶1 s1: framing
- ¶1 s2: C-r1-foundations-06
- ¶1 s3–s4: C-r3-practice-07
- code warning: C-r3-practice-07
- ¶2 s1: framing
- ¶2 s2: C-r3-practice-09
- ¶2 s3–s4: C-r3-practice-10 (attributed)
- ¶2 s5: C-r3-practice-07 ("at your own risk"), C-r2-evidence-08 (attributed)
- ¶2 s6: C-r1-foundations-07, C-r1-foundations-06 (gaps/r3.md G-r3-04 caution: no "permanently")
- ¶3 list: C-r3-practice-14 (attributed)
- ¶4: C-r2-practice-20 (attributed)
- ¶5: C-r1-practice-17

## abi3t
- ¶1 s1: framing (abi3 definition from C-r2-practice-17, C-r3-practice-04)
- ¶1 s2 + list: C-r3-practice-04
- ¶2 s1: C-r3-practice-03 (about the shared-library tag, not installers)
- ¶2 s2: C-r3-practice-05
- bullet 3.13t/3.14t: C-r2-practice-18 (attributed), C-r2-practice-14
- bullet 3.15t: C-r2-practice-13 (attributed to PEP 803), C-r2-practice-15 (with the "may be removed" hedge), C-r2-practice-17, C-r2-practice-16
- ¶3 s1: C-r2-practice-19
- ¶3 s2: C-v5-01 / C-r1-practice-20 source passage (S-r1-practice-03/P7), D-02
- ¶3 s3: D-02 resolved-by-scope (gaps/r3.md G-r3-03; C-r3-practice-04)

## limitations
- ¶1 s1: framing
- ¶1 s2: C-r1-criticism-20 (attributed)
- ¶1 s3–s4: C-r1-criticism-22
- ¶1 s5: D-05 side A (S-r1-criticism-06 passage, ledger D-05)
- ¶1 s6: D-05 open; the advice is framing that does not settle it
- ¶2 s1: C-r1-criticism-23
- ¶2 s2: C-r1-criticism-27 (attributed), C-r2-evidence-14
- ¶2 s3: link back (C-r1-criticism-24)

## next-steps
- ¶1: framing
- aligns s1: framing
- aligns s2: C-r1-foundations-08
- aligns s3: C-r1-criticism-15 (attributed)
- aligns s4: C-r1-criticism-35 (attributed)
- aligns s5–s6: C-r1-criticism-37
- aligns s7: C-r1-criticism-38
- aligns s8: C-r1-criticism-40
- diverges s1: C-r1-foundations-36 (supported, still optional)
- diverges s2: bullet-3 framing from #multiprocessing (C-r2-evidence-19), C-r2-evidence-07
- diverges s3: framing (an option, not a practice claim)
- diverges s4: C-r1-cases-20 (partial; deliberate sharing), framing
- step 1: C-r1-practice-12, C-r1-foundations-07, C-r1-foundations-06
- step 2: C-r1-evidence-11, C-r3-practice-13
- step 3: C-r1-criticism-37, C-r1-criticism-15
- step 4: exercise; C-r2-practice-02, C-r2-practice-03

## quiz
- quiz q-loop key: C-r2-practice-02 · explain: C-r2-practice-02, C-r2-practice-03, C-r2-practice-05 · distractors exempt
- quiz q-abi key: C-r3-practice-03 · explain: C-r3-practice-03, C-r2-practice-18
- quiz q-atomic key: C-r1-criticism-03, C-r1-criticism-05 · explain: C-r1-criticism-04, C-r1-criticism-06
- quiz q-import key: C-r3-practice-07, C-r1-foundations-06 · explain: C-r3-practice-11 (attributed), C-r3-practice-07, C-r1-foundations-07
- quiz q-io answer: C-r2-evidence-09, C-r1-foundations-01
- quiz q-check key: C-r1-foundations-07 · explain: C-r1-foundations-07, C-r1-foundations-06

## sources
- every item is a library.md source the chapter cites; ids are library ids in lowercase; C-v4-01 rests on the SC acceptance post (s-r1-foundations-07, same canonical URL as S-v4-04)

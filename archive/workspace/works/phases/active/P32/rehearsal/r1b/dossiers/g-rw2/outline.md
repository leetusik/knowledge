# Outline (D6, the reader's path): 20261023-0350-free-threaded-cpython
(statuses from ledger.md after D5s; partial claims carry their narrower wording; gaps from gaps/final.md. Rewritten 2026-10-23 on resume after the P32.F1 reset.)

## Reader's task
- T1 decide whether to try the free-threaded build now, for a web service or a data script → decision table "Try it now if… / Wait if…" (#should-you)
- T2 install it and prove the GIL is really off → the commands to install, check the build, check the running GIL (#trying-it)
- T3 know what changes in their own threaded, asyncio and multiprocessing code → checklist "Before you run your code without the GIL" (#your-code)
- T4 know what happens to their dependencies → the steps for a dependency without a free-threaded wheel, and the warning to watch for (#dependencies)

## Background {#background} · T1 · what the GIL is, what it already let threads do, and where the project stands · ~450 words
- Q1, Q2, Q19 answered
- C-r1-foundations-01, -02, -03, -30, -31, -32, -33, -36, -40 supported · C-r1-foundations-38 partial ("…two reference repositories…") · C-r2-evidence-09, -10 supported · C-r1-practice-05, -06 supported
- callout (collapsed): earlier attempts C-r1-foundations-38 (partial); SC "not Python 4" C-r1-foundations-32
- diagram timeline phases: C-r1-foundations-31, -33, -36, -40, C-r1-practice-05, -06

## Intuition {#intuition} · T1 · the core idea with a toy and one real measurement · ~400 words
- Q1, Q4 answered · Q11 answered (attributed)
- C-r1-foundations-11 supported · C-r1-foundations-09 partial (attributed) · C-r1-evidence-15 supported (2024, 3.13b1, via LWN) · C-r1-evidence-16 partial · C-r2-evidence-17 supported
- diagram toy-timeline: an analogy (exempt) · chart shaw-bench: C-r1-evidence-15

## How it works {#how-it-works} · T3 (why races still exist) · the mechanisms that replace the GIL · ~550 words
- Q4 answered
- C-r1-foundations-11, -12 ("proposes"), -13, -15, -17, -20, -22, -23, -24, -25, -27, -28 supported · C-r1-criticism-23, -24 supported · C-r1-foundations-08 supported
- diagram safety-stack: C-r1-foundations-12, -13, -15, -17, -20, -22, -23, -25
- callout (collapsed): memory reasons C-r1-criticism-24, C-r1-foundations-25

## Should you try it today? {#should-you} · T1 · status, cost, evidence, decision · ~750 words
- Q3 contested (D-03, attributed) · Q5, Q21 contested (D-01, D-08) · Q13, Q20 answered (attributed, one speaker) · Q24 answered · Q16 thin (stated as open)
- status: C-r1-foundations-35, -36, -37, -40, -41, -43 supported · C-r1-practice-05, -06 · C-r2-criticism-11, -13 · C-r1-cases-13 attributed, hedged · C-r2-evidence-05 attributed
- cost: C-r1-evidence-01 ("largest single cause"), -03, -04 supported · C-r2-evidence-01, -03, -04 supported · C-r1-evidence-05, -06 partial (narrower: "proposed"; SC targets) · C-r1-foundations-35 (SC targets)
- cases: C-r1-cases-10, -11 supported (vendor about itself, attributed) · web: C-r1-cases-01, -02, -03, -05 attributed · C-r1-cases-06 supported · C-r2-criticism-01 supported · C-r2-criticism-02 partial · C-r2-criticism-03 attributed only · C-r2-criticism-07 attributed, hedged · C-r2-evidence-16 attributed
- gaps stated: G-r1-04, G-r1-03 (the "2.5x" dropped), G-r1-07
- deliverable T1: decision table (C-r2-evidence-09, -17, C-r1-evidence-11, C-r1-cases-02, C-r2-criticism-03 attributed)
- chart overhead: C-r1-evidence-01, C-r2-evidence-01 (two editions of the HOWTO)

## Trying it {#trying-it} · T2 · install, check, run · ~450 words
- Q6 answered · Q25 contested (D-09)
- C-r1-practice-07, -11 supported · C-r1-practice-08, -10 attributed · C-r1-practice-12 partial (the guide's list) · C-r1-foundations-05, -07 supported · C-r3-practice-09 supported · C-r3-practice-15 contested (D-09; never "disabled by default")
- deliverable T2: the commands

## What changes for your code {#your-code} · T3 · threads, asyncio, processes · ~900 words
- Q9 answered (D-06 attributed) · Q10, Q22 answered (D-07 resolved-by-scope) · Q11, Q18 answered
- threads: C-r1-criticism-03, -04, -05, -06, -10 (scoped), -11, -12, -13, -15 supported · C-r1-foundations-08 · C-r2-practice-21 attributed · C-r2-criticism-08 attributed (D-06) · C-r1-criticism-22
- asyncio: C-r2-practice-01, -02, -03, -04, -05, -07, -08 supported · C-r1-practice-22 attributed
- processes: C-r1-cases-22 supported · C-r2-evidence-12, -14 attributed · C-r2-evidence-13 partial · C-r1-cases-16, -20 (partial)
- diagram loop-per-thread: C-r2-practice-02, -03
- deliverable T3: checklist (C-r1-criticism-04, -06, -15, C-r2-practice-07, -08, C-r1-foundations-08, C-r1-criticism-35)

## What changes for your dependencies {#dependencies} · T4 · wheels, the GIL re-enabled, the stable ABI · ~750 words
- Q7 answered (D-02 resolved-by-scope) · Q8 answered · Q23 answered · Q25 contested (D-09)
- C-r1-foundations-06, -10 supported · C-r1-practice-17, -18, -19, -20 supported · C-r1-evidence-10, -11, -12 (no protobuf), -13 supported · C-r2-evidence-07, -08 · C-r3-practice-01, -02, -04, -05, -07, -13 supported · C-r3-practice-10, -14 attributed · C-r2-practice-12, -14, -16, -17, -19 supported · C-r2-practice-13 attributed (PEP 803)
- diagram install-flow: C-r3-practice-01, -02, C-r1-practice-18, C-r3-practice-07, C-r1-foundations-06
- deliverable T4: the steps; point to sys._is_gil_enabled() after imports; never "permanently"
- callout (collapsed): abi3 / abi3t detail C-r2-practice-13, -16, C-r3-practice-04, -05

## Best practices & next steps {#next-steps} · T1–T4 · cited · ~400 words
- Q15, Q17 answered
- C-r1-criticism-35, -37, -38, -40 supported (guide, attributed) · C-r1-criticism-13 · C-r1-cases-15, -16, -20 partial · C-r1-evidence-11

## Quiz
- q-loop: C-r2-practice-02 · q-abi: C-r2-practice-13 (attributed, PEP 803) and C-r3-practice-04 · q-atomic: C-r1-criticism-03, -04 · q-import: C-r3-practice-07, C-r1-foundations-06 · q-io: C-r2-evidence-09 · q-check: C-r1-foundations-07

## Not used
- C-r1-cases-07: needs-rewrite, no baseline (the "2.5x")
- C-r1-foundations-14, -16, -18, -19, -21, -26, -29, -39, -42: still candidate after D5 (not verified); covered elsewhere where needed by verified claims
- C-r1-criticism-07, -08, -09, -14, -16..-19, -21, -25, -26, -28..-34, -36, -39, -41..-44: candidate, not verified
- C-r1-practice-09, -21, -23 · C-r1-evidence-02, -07, -08, -09, -14 · C-r1-cases-04, -08, -09, -12, -14, -17, -19, -21, -23, -24: candidate
- C-r1-cases-18, -19, C-r2-practice-06, -09, -10, -11, -20, C-r2-evidence-06, -11, -15, -19, C-r2-criticism-04, -05, -06, -09, -10, -12, C-r3-practice-03 (filenames only), -06, -08, -11, -12: true but no task needs them
- C-r1-evidence-17 (Shaw's judgment on subinterpreters): history no task needs

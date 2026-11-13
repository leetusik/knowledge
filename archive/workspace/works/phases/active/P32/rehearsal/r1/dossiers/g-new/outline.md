# Outline (D6, final map): 20261023-0350-free-threaded-cpython
(statuses from ledger.md after D5s; partial claims carry their narrower wording; dropped/stated gaps from gaps/final.md)

## Background {#background}
- Q1 answered · Q2 answered · Q19 answered
- C-r1-foundations-01 supported · C-r2-evidence-09 supported · C-r2-evidence-10 supported · C-r1-foundations-02 supported · C-r1-foundations-03 supported
- C-r1-foundations-38 partial ("PEP 703 lists earlier GIL-removal efforts, including Greg Stein's 1996 patch against Python 1.4 and Larry Hastings's Gilectomy, and points to two reference repositories…")
- C-r1-foundations-30, -31, -32, -33, -35, -36 supported · C-r1-practice-01 supported (merged into foundations-31) · C-r1-practice-05 supported · C-v4-01 supported
- diagram phases: C-r1-practice-01, C-r1-foundations-33, C-r1-foundations-36, C-r1-foundations-40
## Intuition {#intuition}
- Q1, Q4, Q19 answered · Q11 answered (partial, attributed)
- C-r1-foundations-01, -11 supported · C-r2-evidence-09 supported · C-r2-evidence-17 supported · C-r1-foundations-09 partial · C-r1-evidence-15 supported (2024, 3.13b1, attributed via LWN)
- diagram toy-timeline: an analogy (C-r1-foundations-01, -11) · chart shaw-bench: C-r1-evidence-15
## How it works {#how-it-works}
- Q4 answered
- C-r1-foundations-11, -12 ("proposes"), -13, -15, -17, -20, -22, -23, -24, -25, -27, -28 supported · C-r1-foundations-09 partial
- diagram safety-stack: C-r1-foundations-12, -20, -22, -23, -25
## Status today {#status}
- Q3 contested (D-03) · Q24 answered · Q16 thin (not load-bearing; stated as open)
- C-r1-foundations-36, -37, -40, -41, -43, -44 supported · C-r1-practice-05, -06 supported · C-r2-criticism-10, -11, -12, -13 supported · C-r1-practice-08 supported attributed (D-03) · C-r1-cases-02 supported attributed · C-r1-cases-13 supported attributed, hedged
- gap G-r1-07 stated ("The 3.15 notes say nothing either way.")
## Trying it {#trying-it} (worked examples)
- Q6 answered · Q5 contested (D-01, D-08) · Q21 contested (D-01) · Q8 answered · Q25 contested (D-09)
- C-r1-practice-07, -11 supported · C-r1-practice-08, -10 attributed · C-r1-practice-12 partial (the guide's list) · C-r1-foundations-05, -07 supported · C-r3-practice-09 supported · C-r3-practice-15 contested (D-09)
- numbers: C-r1-evidence-01, -03, -04 supported · C-r2-evidence-01, -03, -04 supported · C-r1-evidence-05, -06 partial (narrower: "proposed"; SC targets) · C-v4-01 supported · C-r2-evidence-18 supported · C-r1-criticism-24 supported
- ecosystem: C-r1-evidence-10, -11, -12, -13 supported
- gap G-r1-04 stated ("No independent, dated multi-thread benchmark for the current release was found…")
## What changes for your code {#your-code}
- Q9 answered (D-04 resolved-by-scope, D-06) · Q10, Q22 answered (D-07 resolved-by-scope) · Q11, Q18 answered · Q13, Q20 answered (attributed, one speaker)
- threads: C-r1-criticism-03, -04, -05, -06, -10, -11, -12, -13, -15 supported · C-r1-foundations-08 supported · C-r2-practice-21 supported attributed · C-r2-criticism-08 attributed (D-06)
- asyncio: C-r2-practice-01, -02, -03, -04, -05, -07, -08, -09, -10 supported · C-r1-practice-22 attributed · C-r2-evidence-16 attributed
- processes: C-r1-cases-22 supported · C-r1-evidence-16 partial · C-r2-evidence-12, -14 attributed · C-r2-evidence-13 partial · C-r2-evidence-07, -19 supported · C-r1-cases-15, -16, -18 supported · C-r1-cases-20 partial
- web: C-r1-cases-01, -02, -03, -05 attributed · C-r2-criticism-01 supported · C-r2-criticism-02 partial · C-r2-criticism-03 attributed only · C-r2-criticism-07 attributed, hedged · C-r2-criticism-09 partial · gap G-r1-03 stated; the "2.5x" dropped
- diagram loop-per-thread: C-r2-practice-02, -03
## What changes for your dependencies {#dependencies}
- Q7 answered (D-02 resolved-by-scope) · Q23 answered · Q25 contested (D-09)
- C-r1-foundations-06, -10 supported · C-r1-practice-17, -18 supported · C-r2-evidence-07 supported · C-r3-practice-01, -02, -07, -08, -09, -13 supported · C-r3-practice-10, -14 attributed · C-r3-practice-12 partial · C-r2-practice-20 attributed · C-r2-evidence-08 attributed
- ABI: C-r3-practice-03 (filenames, not installers), -04, -05 supported · C-r2-practice-13 attributed (PEP 803) · C-r2-practice-14, -15 (keep "may be removed"), -16, -17, -19 supported · C-r2-practice-18 attributed
- diagram install-flow: C-r3-practice-01, -02, C-r1-practice-18, C-r3-practice-07, C-r1-foundations-06
## Costs and limitations {#limitations}
- Q12 contested (D-04, D-05)
- C-r1-criticism-20, -22, -23, -24, -27 supported (-27 attributed) · C-r2-evidence-14 attributed · D-05 (debugging guide vs HOWTO)
## Best practices & next steps {#next-steps}
- Q15 answered · Q17 answered
- C-r1-criticism-35, -37, -38, -40 supported (guide, attributed) · C-r1-foundations-07, -08 · C-r3-practice-13 · C-r1-evidence-11 · C-r1-cases-16, -20 partial
## Quiz
- q-loop tests a single event loop on the free-threaded build: C-r2-practice-02
- q-abi tests which stable-ABI tag a 3.15t interpreter loads: C-r3-practice-03
- q-atomic tests the documented guarantees: C-r1-criticism-03, -04, -05
- q-import tests importing an unmarked extension: C-r3-practice-07, C-r1-foundations-06
- q-io tests why I/O-bound threads gain less: C-r2-evidence-09
- q-check tests the runtime check: C-r1-foundations-07
## Sources

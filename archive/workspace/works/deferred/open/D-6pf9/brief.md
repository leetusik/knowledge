# Deferred: D-6pf9 A long table's box state depends on resize history

## Context

## Why Deferred

Once a long table overflows, its cells go to one line (is-over → nowrap), which keeps it overflowing after the window widens again; a 5-column long table loaded at 1440 fits, but stays boxed after a resize to 390 and back (pre-existing, seen in the before build; from P-8jbf.F1 a wide-and-long table can show it at the 1600 step). Both states are designed and nothing false is shown; fixing it changes the signed long-table logic below 1600, outside P-8jbf.

## Trigger to Promote

the next reader-tables phase or a QA sweep

## Notes


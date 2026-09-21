# Deferred: D26 Capture the off-frame graph screenshot before P28 implements the graph

## Context

## Why Deferred

The operator reported wires drawing off the frame by default on member /graph and public /@leetusik/graph, on their Mac. It was never reproduced here (Aside 1440x900 dpr 1, fresh + settled + tags on/off) and no screenshot reached design round 05, so the round's section 4.2 is a behaviour contract (fit on first paint; a stored view restored only into a plate of the size it was saved in), not a diagnosis. P28 inherits an unreproduced defect report.

## Trigger to Promote

Before P28's graph apply slice starts, or the next time the operator sees the defect. If it survives the apply, capture the stored sessionStorage view record and the plate's measured size at first paint before changing anything else.

## Notes


# Deferred: D88-gd Landing hero h1 overflows at 390px

## Context

## Why Deferred

At a 390px viewport the hero h1 ('conversation.' at 68px needs 404px) overflows the 342px column; the hero band's overflow-hidden clips the h1, lede and CTA row at the right edge. Re-measured on a production build at P37-1p.REVIEW. Predates P37-1p (hero.tsx untouched).

## Trigger to Promote

the next landing or marketing phase, or before a phone-focused launch

## Notes


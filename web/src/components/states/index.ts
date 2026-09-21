// Barrel for round 03 §5's system states (P28.S3) — the editorial failure block
// and its error-ref line, the toast region, and the skeleton vocabulary.
// Consumers import from "@/components/states"; nothing here carries new CSS,
// only the classes §3 already landed in `kb-console-responsive.css`.
//
// `OptionalShell` is deliberately NOT re-exported. It reaches `optionalIdentity()`
// and therefore `lib/session.ts`, which is server-only — a barrel carrying it
// would drag `node:crypto` into the client graph of every `"use client"` file
// that wants `<Editorial>` (the two error boundaries do). It also imports
// `AppShell`, which imports `<ToastRegion>` from this folder, so keeping it out
// breaks that cycle too. Import it by path:
// `@/components/states/optional-shell`.
export { Editorial } from "./editorial";
export { ErrorRef } from "./error-ref";
export {
  LoadingRegion,
  SkelBlock,
  SkelPageHead,
  SkelPanel,
  SkelTable,
  SkelTiles,
} from "./skeleton";
export { ToastRegion } from "./toast-region";

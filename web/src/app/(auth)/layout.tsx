import type { Metadata } from "next";

// P12.S2 (re-skinned P12.S2R) — public auth area (login + signup), the Knowledge
// Base "quiet threshold": the login/signup commit to the DARK slate scheme (a
// secure gate) while the app opens light. The stage carries
// `data-md-color-scheme="slate"` and paints the warm charcoal paper, then centers
// the gate card — no glow/grid decor, just the calm dark threshold. Deliberately
// UNGUARDED: the login page must stay reachable, so the session gate lives one
// level over in the sibling `(app)` group's layout, not here. The `(auth)` group
// is invisible in the URL, so these render at /login and /signup.
//
// `robots: { index: false, follow: false }` keeps the whole auth subtree out of
// search indexes.
//
// P28.S5 — round 04 §4.8. The stage utilities (`grid min-h-dvh place-items-center
// px-6 py-14` + the inline background) are replaced by `.kb-authgate`, which
// declares its OWN container, `kbauth`. That matters: round 03's 44px/16px phone
// floors are scoped to `kbapp`, and the gate is not inside `.kb-app` — §4.8's own
// table is what restates them here. `align-content: safe center` (not plain
// centring) keeps the card's top reachable when a software keyboard shortens the
// viewport. The scheme stays `data-md-color-scheme="slate"` with NO
// `data-kb-scheme`: the gate is always dark, in either OS scheme.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The ink is kept from the old inline style and is NOT decoration: `body`
    // resolves `color: var(--kb-ink)` in the LIGHT scheme, so anything inside the
    // gate that does not set its own colour would inherit near-black ink onto the
    // dark card. `.kb-authgate` sets no `color`, so this utility only ADDS (the
    // phase's cascade rule).
    //
    // It must be `text-[var(--kb-ink)]`, NOT `text-ink`: the theme utility reads
    // `var(--color-ink)`, which Tailwind substitutes at `:root` — outside this
    // element's `data-md-color-scheme="slate"` scope — so it would resolve to the
    // LIGHT ink. Measured: `text-ink` computed rgb(38,33,28) here. Referencing
    // `--kb-ink` directly resolves it where the slate override applies.
    <div
      data-md-color-scheme="slate"
      className="kb-authgate text-[var(--kb-ink)]"
    >
      <main id="main-content" className="kb-authgate__wrap">
        {children}
      </main>
    </div>
  );
}

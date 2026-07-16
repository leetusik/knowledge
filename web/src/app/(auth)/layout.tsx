import type { Metadata } from "next";

// P12.S2 — public auth area (login + signup), skinned as hi2vi_web's dark "secure
// threshold" gate (operator/login): a full-viewport ink stage with two aria-hidden
// decorative layers (radial green glows + a masked hairline grid), so entering the
// app reads as crossing a threshold. Deliberately UNGUARDED: the login page must
// stay reachable, so the session gate lives one level over in the sibling `(app)`
// group's layout, not here. The `(auth)` group is invisible in the URL, so these
// render at /login and /signup.
//
// `robots: { index: false, follow: false }` keeps the whole auth subtree out of
// search indexes.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-ink px-6 pt-14 pb-20">
      {/* Two radial green glows over the ink stage. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 42% at 50% 0%, rgba(47,242,143,.18), transparent 62%), radial-gradient(50% 40% at 82% 96%, rgba(31,203,145,.10), transparent 60%)",
        }}
      />
      {/* Masked 52px hairline grid, faded toward the edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-hairline-dark) 1px, transparent 1px), linear-gradient(90deg, var(--color-hairline-dark) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          WebkitMaskImage:
            "radial-gradient(70% 60% at 50% 30%, #000, transparent 75%)",
          maskImage: "radial-gradient(70% 60% at 50% 30%, #000, transparent 75%)",
        }}
      />

      <main id="main-content" className="relative z-[1] w-full">
        {children}
      </main>
    </div>
  );
}

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
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      data-md-color-scheme="slate"
      className="grid min-h-dvh place-items-center px-6 py-14"
      style={{ background: "var(--kb-paper)", color: "var(--kb-ink)" }}
    >
      <main id="main-content" className="w-full">
        {children}
      </main>
    </div>
  );
}

import Link from "next/link";

import { AUTH_TRUST_ITEMS, BRAND } from "@/content";
import type { AuthPageCopy } from "@/content";

/**
 * Shared presentation for the login + signup pages (P12.S2, re-skinned P12.S2R) —
 * the Knowledge Base dark "quiet threshold" gate: a warm dark gradient card with an
 * inset top-light, a brand row (logo mark + serif wordmark) beside a mono "Secure"
 * pill, the serif lead + sub, the form island, a mono trust-chip footer, and the
 * cross-link to the other auth page. Rendered under the `(auth)` layout's `slate`
 * scheme, so every `--kb-*` token resolves to the dark palette. Server component —
 * only the `children` form is a client island.
 *
 * P28.S5 — round 04 §4.8: **every inline style in this file is deleted.** Each one
 * is replaced by its `.kb-authcard*` class from §3, value for value — nothing here
 * is new except what a `@container kbauth (width < 40rem)` rule in that sheet says
 * (tighter card padding, the 44px/16px field floors round 03 scoped to `kbapp` and
 * so never reached the gate, and a tighter trust-chip gap). The old wrapper `<div
 * class="mx-auto" style="width:min(25rem,100%)">` is gone too: `.kb-authgate__wrap`
 * on the layout's `<main>` is what sizes the column now (`min(28rem, 100%)` less
 * 1.5rem of padding = the same 25rem card), so this component returns a FRAGMENT —
 * the card and the alt line are the wrap's two children, exactly as §4.8 draws it.
 *
 * The trust chips wrap to as many centred lines as they need and are never
 * truncated, never scrolled, and never reduced to two of three (§4.8).
 */
export function AuthCard({
  copy,
  children,
}: {
  copy: AuthPageCopy;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="kb-authcard">
        {/* Brand row + Secure pill. */}
        <div className="kb-authcard__brand">
          <span className="kb-authcard__word">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt="" width={24} height={24} />
            {BRAND.wordmark}
          </span>
          <span className="kb-authcard__pill">
            <i aria-hidden="true" />
            {copy.securePill}
          </span>
        </div>

        <h1 className="kb-authcard__lead">{copy.lead}</h1>
        <p className="kb-authcard__sub">{copy.sub}</p>

        {children}

        {/* Signed session · SameSite=Strict · Noindex */}
        <div className="kb-authcard__trust">
          {AUTH_TRUST_ITEMS.map((item) => (
            <span key={item} className="kb-authcard__trustitem">
              <i aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <p className="kb-authcard__alt">
        {copy.altPrompt} <Link href={copy.altHref}>{copy.altLinkLabel}</Link>
      </p>
    </>
  );
}

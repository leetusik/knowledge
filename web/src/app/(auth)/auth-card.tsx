import Link from "next/link";

import { AUTH_TRUST_ITEMS, BRAND } from "@/content";
import type { AuthPageCopy } from "@/content";

/**
 * Shared presentation for the login + signup pages (P12.S2), skinned as
 * hi2vi_web's dark secure-gate card (operator/login): the forest-gradient card with
 * a top-light inset, a brand row (green-accent mark) + a mono uppercase "Secure"
 * pill with a glowing green dot, the lead/sub, the form island, a mono trust-chip
 * footer, and the cross-link to the other auth page. Server component — only the
 * `children` form is a client island.
 */
export function AuthCard({
  copy,
  children,
}: {
  copy: AuthPageCopy;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-[min(408px,92vw)]">
      <div
        className="rounded-xxl border border-hairline-dark px-[34px] pt-[34px] pb-[26px]"
        style={{
          backgroundImage: "linear-gradient(180deg, #0d3127, var(--color-forest))",
          boxShadow:
            "0 40px 90px -36px rgba(0,0,0,.7), inset 0 1px 0 rgba(154,247,199,.08)",
        }}
      >
        {/* Brand row + Secure pill. */}
        <div className="mb-[26px] flex items-center justify-between">
          <span className="text-[26px] font-extrabold tracking-[-0.3px] text-on-dark">
            {BRAND.prefix}
            <span className="text-green">{BRAND.accent}</span>
            {BRAND.suffix}
          </span>
          <span className="inline-flex items-center gap-[7px] rounded-full border border-hairline-dark bg-[rgba(154,247,199,0.08)] px-2.5 py-[5px] font-mono text-[9px] font-bold tracking-[0.7px] text-security-mint uppercase">
            <span className="h-[7px] w-[7px] rounded-full bg-green shadow-[0_0_0_3px_rgba(47,242,143,0.22)]" />
            {copy.securePill}
          </span>
        </div>

        <h1 className="mb-1 text-heading-4 tracking-[-0.2px] text-on-dark">
          {copy.lead}
        </h1>
        <p className="mb-6 text-body-sm text-on-dark-muted">{copy.sub}</p>

        {children}

        {/* Signed session · SameSite=Strict · Noindex */}
        <div className="mt-[22px] flex flex-wrap justify-center gap-x-3.5 gap-y-2 border-t border-hairline-dark pt-4">
          {AUTH_TRUST_ITEMS.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.6px] text-on-dark-muted uppercase"
            >
              <span className="h-[5px] w-[5px] rounded-full bg-security-teal" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-body-sm text-on-dark-muted">
        {copy.altPrompt}{" "}
        <Link
          href={copy.altHref}
          className="font-semibold text-green hover:underline"
        >
          {copy.altLinkLabel}
        </Link>
      </p>
    </div>
  );
}

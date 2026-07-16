import Link from "next/link";

import { AUTH_TRUST_ITEMS, BRAND } from "@/content";
import type { AuthPageCopy } from "@/content";

/**
 * Shared presentation for the login + signup pages (P12.S2, re-skinned P12.S2R) —
 * the Knowledge Base dark "quiet threshold" gate (per the `app-login` specimen):
 * a warm dark gradient card with an inset top-light, a brand row (logo mark +
 * serif wordmark) beside a mono "Secure" pill, the serif lead + sub, the form
 * island, a mono trust-chip footer, and the cross-link to the other auth page.
 * Rendered under the `(auth)` layout's `slate` scheme, so every `--kb-*` token
 * resolves to the dark palette. Server component — only the `children` form is a
 * client island.
 */
export function AuthCard({
  copy,
  children,
}: {
  copy: AuthPageCopy;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto" style={{ width: "min(25rem, 100%)" }}>
      <div
        style={{
          background: "linear-gradient(180deg, #26221b, #1f1c16)",
          border: "1px solid var(--kb-border-strong)",
          borderRadius: "var(--kb-radius)",
          padding: "1.6rem 1.6rem 1.3rem",
          boxShadow:
            "0 2rem 4rem rgba(0,0,0,.5), inset 0 1px 0 rgba(236,228,215,.06)",
        }}
      >
        {/* Brand row + Secure pill. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo} alt="" width={24} height={24} />
            <span
              style={{
                fontFamily: "var(--kb-font-display)",
                fontWeight: 600,
                fontSize: "1.35rem",
                color: "var(--kb-ink)",
              }}
            >
              {BRAND.wordmark}
            </span>
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontFamily: "var(--kb-font-mono)",
              fontSize: "0.56rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--kb-accent)",
              border: "1px solid var(--kb-border-strong)",
              borderRadius: "var(--kb-radius-pill)",
              padding: "0.3em 0.6em",
            }}
          >
            <span
              aria-hidden
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--kb-accent)",
                boxShadow: "0 0 0 3px var(--kb-accent-soft)",
              }}
            />
            {copy.securePill}
          </span>
        </div>

        <h1
          style={{
            fontFamily: "var(--kb-font-display)",
            fontWeight: 600,
            fontSize: "1.35rem",
            color: "var(--kb-ink)",
            margin: "0 0 0.2rem",
          }}
        >
          {copy.lead}
        </h1>
        <p
          style={{
            fontSize: "0.88rem",
            color: "var(--kb-secondary)",
            margin: "0 0 1.3rem",
          }}
        >
          {copy.sub}
        </p>

        {children}

        {/* Signed session · SameSite=Strict · Noindex */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0.4rem 1.1rem",
            marginTop: "1.3rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--kb-border)",
          }}
        >
          {AUTH_TRUST_ITEMS.map((item) => (
            <span
              key={item}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontFamily: "var(--kb-font-mono)",
                fontSize: "0.58rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--kb-hint)",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: "var(--kb-accent)",
                }}
              />
              {item}
            </span>
          ))}
        </div>
      </div>

      <p
        style={{
          textAlign: "center",
          fontSize: "0.88rem",
          color: "var(--kb-secondary)",
          marginTop: "1.3rem",
        }}
      >
        {copy.altPrompt}{" "}
        <Link
          href={copy.altHref}
          style={{
            color: "var(--kb-accent)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {copy.altLinkLabel}
        </Link>
      </p>
    </div>
  );
}

import type { Metadata } from "next";

import { requireIdentity } from "@/lib/auth-guards";

// P12.S2 (re-skinned P12.S2R) — the dashboard is a MINIMAL placeholder: it proves
// the auth gate + light Knowledge Base console render for a real session (eyebrow
// + serif title + the signed-in email/tenant in a `.kb-panel`). S3 swaps this for
// the real tenant dashboard (projects list + create + usage stat tiles + trend).
// `requireIdentity` is the same `cache()`d guard the layout awaits, so this shares
// its /auth/me round-trip rather than making a second one.
export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { identity } = await requireIdentity();
  const tenantName = identity.tenant?.name ?? "—";

  return (
    <section style={{ maxWidth: "48rem" }}>
      <div className="kb-app-eyebrow">{tenantName} · Workspace</div>
      <h1 className="kb-app-title" style={{ marginTop: "0.35rem" }}>
        Dashboard
      </h1>
      <p className="kb-app-sub">
        You are signed in. Projects, credentials, and usage arrive in the next
        slices — this page confirms the authenticated console renders.
      </p>

      <div className="kb-panel" style={{ marginTop: "var(--kb-space-lg)" }}>
        <div className="kb-panel__head">
          <h2 className="kb-app-h2">Session</h2>
          <span className="kb-chip">P12.S2R</span>
        </div>
        <dl
          style={{
            display: "grid",
            gap: "var(--kb-space-md)",
            gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
            margin: 0,
          }}
        >
          <div>
            <dt className="kb-app-eyebrow">Signed-in user</dt>
            <dd
              style={{
                margin: "0.35rem 0 0",
                fontFamily: "var(--kb-font-mono)",
                fontSize: "0.85rem",
                color: "var(--kb-ink)",
                wordBreak: "break-all",
              }}
            >
              {identity.user.email}
            </dd>
          </div>
          <div>
            <dt className="kb-app-eyebrow">Workspace</dt>
            <dd
              style={{
                margin: "0.35rem 0 0",
                fontSize: "0.95rem",
                color: "var(--kb-ink)",
              }}
            >
              {tenantName}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

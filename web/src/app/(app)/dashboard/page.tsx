import type { Metadata } from "next";

import { Tag } from "@/components/ui";
import { requireIdentity } from "@/lib/auth-guards";

// P12.S2 — the dashboard is a MINIMAL placeholder: it proves the auth gate + shell
// render for a real session (heading + the signed-in email/tenant). S3 swaps this
// for the real tenant dashboard (projects list + create + usage). `requireIdentity`
// is the same `cache()`d guard the layout awaits, so this shares its /auth/me
// round-trip rather than making a second one.
export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { identity } = await requireIdentity();
  const tenantName = identity.tenant?.name ?? "—";

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2.5">
        <h1 className="text-heading-3 text-ink">Dashboard</h1>
        <Tag>P12.S2</Tag>
      </div>
      <p className="mt-2 text-body-md text-slate">
        You are signed in. Projects, credentials, and usage arrive in the next
        slices — this page confirms the authenticated shell renders.
      </p>

      <dl className="mt-6 grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2">
        <div className="bg-canvas p-5">
          <dt className="text-caption text-steel">Signed-in user</dt>
          <dd className="mt-1 font-mono text-code-md break-all text-charcoal">
            {identity.user.email}
          </dd>
        </div>
        <div className="bg-canvas p-5">
          <dt className="text-caption text-steel">Workspace</dt>
          <dd className="mt-1 text-body-md-medium text-charcoal">{tenantName}</dd>
        </div>
      </dl>
    </section>
  );
}

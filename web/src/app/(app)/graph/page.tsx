import { redirect } from "next/navigation";

import { requireIdentity } from "@/lib/auth-guards";

// P12.S6 gave this route the in-app knowledge graph; P37-1p retired the member graph,
// so `/graph` now only forwards to `/library`, the signed-in landing. The redirect
// lives in the page rather than `next.config.ts` so the `(app)` group's own auth
// behaviour still runs first: a signed-out visitor gets the same `/login?next=/graph`
// bounce as every other `(app)` route, and a signed-in one lands on the library. No
// fetch beyond the session check. The three graph stylesheets beside this file stay
// until P37-1p.S3 removes them with `globals.css`'s imports.
export default async function GraphPage(): Promise<never> {
  await requireIdentity();
  redirect("/library");
}

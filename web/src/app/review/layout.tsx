import { requireIdentity } from "@/lib/auth-guards";

// P30.S24 — the review route is signed in only. The guard sits in the LAYOUT, above the
// segment's `loading.tsx`: a redirect from the page itself would come after the loading shell
// had streamed (an HTTP 200 carrying the skeleton), and the build prompt says a signed-out
// request renders nothing of the queue, not even a skeleton, and is redirected to
// `/login?next=/review` before any review data is read.
export default async function ReviewLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireIdentity();
  return children;
}

import type { Metadata } from "next";

import { LOGIN_PAGE } from "@/content";
import { redirectIfAuthenticated } from "@/lib/auth-guards";
import { safeNextPath } from "@/lib/next-path";

import { AuthCard } from "../auth-card";
import { LoginForm } from "./login-form";

// P12.S2 — /login. Server component: an already-signed-in visitor is bounced (to
// the dashboard, or to `?next=` when one was supplied and survives the guard —
// verified against knowledge, see `redirectIfAuthenticated`), everyone else gets
// the card + the client form island. Reading the session cookie makes this route
// dynamic, so it is never prerendered.
//
// P28.S5 (D18) — `?next=` is the return address a public surface attaches when it
// sends an anonymous visitor here ("Sign in to read →"). It is laundered ONCE, at
// this boundary, by `safeNextPath`, which accepts same-origin relative paths only
// and fails closed to `/dashboard`; the already-safe value is what reaches both
// the bounce and the form. Nothing downstream re-parses the raw query, so there is
// exactly one place where the rule lives.
export const metadata: Metadata = { title: LOGIN_PAGE.title };

export default async function LoginPage({
  searchParams,
}: {
  // Next 16: search params arrive as a Promise, and a repeated key is a `string[]`
  // — which `safeNextPath` rejects outright rather than picking one of.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = safeNextPath((await searchParams).next);
  await redirectIfAuthenticated(next);

  return (
    <AuthCard copy={LOGIN_PAGE}>
      <LoginForm next={next} />
    </AuthCard>
  );
}

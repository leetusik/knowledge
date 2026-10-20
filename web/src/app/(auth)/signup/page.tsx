import type { Metadata } from "next";

import { SIGNUP_PAGE } from "@/content";
import { redirectIfAuthenticated } from "@/lib/auth-guards";
import { safeNextPath } from "@/lib/next-path";

import { AuthCard } from "../auth-card";
import { SignupForm } from "./signup-form";

// P12.S2 — /signup. Same shape as /login: bounce an already-signed-in visitor,
// otherwise render the card + the client form island. Dynamic (reads the cookie).
//
// P30.S11 (D18) — signup is a sign-in success path too: a visitor sent to /login
// with a return address who follows "create an account" keeps it (the card's
// cross-link carries `?next=`), and lands there once the account exists. Laundered
// once here by `safeNextPath`, exactly like /login.
export const metadata: Metadata = { title: SIGNUP_PAGE.title };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = safeNextPath((await searchParams).next);
  await redirectIfAuthenticated(next);

  return (
    <AuthCard copy={SIGNUP_PAGE} next={next}>
      <SignupForm next={next} />
    </AuthCard>
  );
}

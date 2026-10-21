import { AppShell } from "@/components/app-shell";
import { PublicShell } from "@/components/public-shell";
import { optionalIdentity } from "@/lib/auth-guards";
import { loginHref } from "@/lib/next-path";

// P30.S22 — the shell of `/@{org}` and every state of it (`06-library` §1 and §9: "the shell
// stays in every state"). Signed out: the public shell, whose "Sign in" returns to this page.
// Signed in (a member or not): the app shell, with no item current. The page, its loading and
// failed states and its not-found all render inside it, because they are children of this layout.
// The group has no other route: `/@{org}/graph`, the documents and the reader keep their own.
export default async function OrgLibraryLayout({
  params,
  children,
}: {
  params: Promise<{ org: string }>;
  children: React.ReactNode;
}) {
  const { org } = await params;
  const ctx = await optionalIdentity();
  if (ctx) return <AppShell identity={ctx.identity}>{children}</AppShell>;
  let path = "/";
  try {
    const decoded = decodeURIComponent(org);
    if (decoded.startsWith("@") && decoded.length > 1) path = `/${decoded}`;
  } catch {
    // a malformed escape: the page 404s; the link goes to the bare gate
  }
  return (
    <PublicShell signInHref={path === "/" ? "/login" : loginHref(path)}>
      {children}
    </PublicShell>
  );
}

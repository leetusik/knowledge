import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PublicLibrary } from "@/components/library/library-view";
import { LIBRARY } from "@/content";
import { optionalIdentity } from "@/lib/auth-guards";
import { loadPublicLibrary } from "@/lib/library/load";
import { chooseGroup } from "@/lib/library/model";
import { parseReaderCookie, READER_COOKIE } from "@/lib/reader-cookie";

// P30.S22 — `/@{org}`, the org's public library (`06-library` round 01): anonymous, public
// projects only, no reading data of its own. The org segment is `@`-prefixed (our public
// namespace); anything else is the constant not-found before any upstream call. An unknown org,
// an org with nothing public (to anyone not a member) and a private project's address are one
// indistinguishable 404. A signed-in reader (member or not) also sees their own progress.
// The <title> is static, like the graph's: the client is `no-store`, so `generateMetadata`
// would cost a second uncached fetch.
export const metadata: Metadata = { title: LIBRARY.metaTitle };

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function OrgLibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const org = safeDecode((await params).org);
  if (!org.startsWith("@") || org.length < 2) notFound();
  const ctx = await optionalIdentity();
  const data = await loadPublicLibrary(ctx?.token, org.slice(1));
  if (!data) notFound();
  const remembered = parseReaderCookie(
    (await cookies()).get(READER_COOKIE)?.value,
  ).libraryGroup;
  const group = chooseGroup((await searchParams).by, remembered);
  return <PublicLibrary data={data} group={group} path={`/${org}`} />;
}

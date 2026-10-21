/**
 * P30.S22 — what the two library pages read (`06-library` *Wiring*).
 *
 *  - `/library`: the viewer's own org (`GET /app/orgs/{org}/library`), their reading state
 *    (`GET /app/reader/library`) and Continue reading (`continue.ts`), in parallel;
 *  - `/@{org}`: the org's PUBLIC projects only (`?scope=public`, so a member sees the same
 *    page a stranger does), plus the viewer's own state on those books when signed in.
 *
 * Any fault but a 404 on the org throws: the route's `error.tsx` is the "failed" state.
 */
import "server-only";

import { getOrgLibrary } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import { getReaderLibrary } from "@/lib/knowledge/reader";
import type { KbIdentity, KbOrgLibrary } from "@/lib/knowledge/types";
import { orgSegment } from "@/lib/reader-href";

import { loadContinue, type ContinueItem } from "./continue";
import {
  projectsOf,
  toCards,
  toRows,
  type BookCard,
  type DocRow,
  type ProjectInfo,
} from "./model";

export interface LibraryData {
  /** The org's display name. */
  orgName: string;
  books: BookCard[];
  docs: DocRow[];
  projects: ProjectInfo[];
  continue: ContinueItem[];
}

export interface PublicLibraryData {
  orgName: string;
  /** The viewer is signed in (their own progress shows). */
  signedIn: boolean;
  /** The viewer is a member of this org. */
  member: boolean;
  books: BookCard[];
  docs: DocRow[];
  projects: ProjectInfo[];
}

const EMPTY: KbOrgLibrary = {
  org: { id: "", slug: null, name: "—", label: "" },
  member: true,
  projects: [],
  books: [],
  documents: [],
};

export async function loadLibrary(
  token: string,
  identity: KbIdentity,
): Promise<LibraryData> {
  const tenant = identity.tenant;
  const [listing, state] = await Promise.all([
    tenant ? getOrgLibrary(token, orgSegment(tenant), "all") : EMPTY,
    getReaderLibrary(token),
  ]);
  const books = toCards(listing, state);
  const docs = toRows(listing, state);
  const items = await loadContinue(
    token,
    books.map((b) => ({ project: b.project, slug: b.slug })),
  );
  return {
    orgName: tenant?.name ?? listing.org.name,
    books,
    docs,
    projects: projectsOf(listing),
    continue: items,
  };
}

/** `null` is the constant not-found (an unknown org, or one that shows this viewer nothing). */
export async function loadPublicLibrary(
  token: string | undefined,
  org: string,
): Promise<PublicLibraryData | null> {
  let listing: KbOrgLibrary;
  try {
    listing = await getOrgLibrary(token, org, "public");
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      return null;
    }
    throw error;
  }
  const state = token ? await getReaderLibrary(token) : null;
  const books = toCards(listing, state);
  const docs = toRows(listing, state);
  // A stranger is shown nothing of an org with nothing to read: the same not-found.
  if (!listing.member && books.length === 0 && docs.length === 0) return null;
  return {
    orgName: listing.org.name,
    signedIn: token !== undefined,
    member: listing.member,
    books,
    docs,
    projects: projectsOf(listing),
  };
}

import "server-only";

import { readKbApiEnv } from "@/lib/env";

// P12.S2 — the server-side knowledge API client: the ONE place the Next.js server
// talks to knowledge-api (D-P12-2, the BFF boundary). Ported from vocky's P4.S2
// client (itself adapted from hi2vi_web's `content-agent/api.ts`), server-side
// rather than browser-side:
//   - the URL is absolute, built from server-only KB_API_BASE_URL;
//   - the caller's knowledge bearer token is injected as `Authorization: Bearer <token>`
//     (the token comes from the sealed cookie via `requireSession()`);
//   - every request is `cache: "no-store"` — per-user data must never be shared
//     across requests by Next's fetch cache;
//   - errors carry knowledge's `{detail}`.
//
// This module is the seam S3–S6 extend with the `/app/*` calls. It is
// `server-only`: the browser never learns the knowledge base URL and never holds a
// token. Tokens/passwords are NEVER logged — `ApiError` carries the status and
// knowledge's detail text only, and callers key off the STATUS, not the text.

/** A non-2xx knowledge response, carrying the HTTP status + knowledge's `{detail}`. */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string | null;

  constructor(status: number, detail: string | null) {
    super(detail ? `${status} ${detail}` : `${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** Build an `ApiError` from a non-ok response, tolerating a missing/non-JSON body. */
async function toError(res: Response): Promise<ApiError> {
  let detail: string | null = null;
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") detail = body.detail;
  } catch {
    // no/!json body — status alone
  }
  return new ApiError(res.status, detail);
}

/** Absolute knowledge URL for `path` (leading slash), trailing base slash stripped. */
function kbUrl(path: string): string {
  const { KB_API_BASE_URL } = readKbApiEnv();
  return `${KB_API_BASE_URL.replace(/\/+$/, "")}${path}`;
}

/** Request options shared by the verbs — `token` is the caller's knowledge bearer. */
export interface KbRequestOptions {
  /** The knowledge session token to present as `Authorization: Bearer <token>`. */
  token?: string;
  signal?: AbortSignal;
}

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Parse a JSON body, tolerating 204/empty (returns `undefined`). */
async function parseBody<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (text === "") return undefined as T;
  return JSON.parse(text) as T;
}

/** `GET <base><path>` with the bearer injected. Throws `ApiError` on non-2xx. */
export async function getJson<T>(
  path: string,
  options: KbRequestOptions = {},
): Promise<T> {
  const res = await fetch(kbUrl(path), {
    method: "GET",
    headers: { Accept: "application/json", ...authHeaders(options.token) },
    cache: "no-store",
    signal: options.signal,
  });
  if (!res.ok) throw await toError(res);
  return parseBody<T>(res);
}

/**
 * `GET <base><path>` with the bearer injected, returning the RAW `Response` with
 * its body UNREAD — for a knowledge route that answers bytes, not JSON, which a
 * proxy route relays straight to the browser (kept for S5/S6 read surfaces).
 *
 * The sibling of `getJson`, not a replacement: identical URL/bearer/no-store
 * construction and the same `ApiError`-on-non-2xx contract (knowledge's ERROR
 * bodies are still JSON, so `toError` reads them normally) — it simply hands the
 * caller the stream instead of `JSON.parse`ing it. No `Accept` header: the caller
 * cannot know the stored content type, and knowledge does not content-negotiate.
 *
 * The caller MUST consume or relay the body; on the success path nothing here
 * reads it.
 */
export async function getRaw(
  path: string,
  options: KbRequestOptions = {},
): Promise<Response> {
  const res = await fetch(kbUrl(path), {
    method: "GET",
    headers: authHeaders(options.token),
    cache: "no-store",
    signal: options.signal,
  });
  if (!res.ok) throw await toError(res);
  return res;
}

/**
 * `POST|PATCH|PUT|DELETE <base><path>` with an optional JSON body + the bearer
 * injected. Throws `ApiError` on non-2xx; returns the parsed body (or `undefined`
 * for a 204, e.g. `POST /auth/logout`).
 */
export async function sendJson<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
  options: KbRequestOptions = {},
): Promise<T> {
  const res = await fetch(kbUrl(path), {
    method,
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...authHeaders(options.token),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: options.signal,
  });
  if (!res.ok) throw await toError(res);
  return parseBody<T>(res);
}

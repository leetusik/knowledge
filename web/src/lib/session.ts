import "server-only";

import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { readSessionEnv } from "./env";
import { loginHref, REQUEST_PATH_HEADER, safeNextPath } from "./next-path";

// P12.S2 — the sealed-cookie session (D-P12-2). knowledge issues an opaque 30-day
// bearer token from `/auth/*`; the BFF SEALS that token into an httpOnly cookie
// the Next.js app sets for ITSELF, so the raw knowledge token never reaches
// browser JS and there is no web-side session store. This module is the whole
// crypto + guard surface; ported from vocky's P4.S2 (itself adapted from
// hi2vi_web's operator auth) — we AES-256-GCM ENCRYPT knowledge's token (the GCM
// tag doubles as the integrity check) and the guards RETURN the decrypted token
// for bearer injection into server-to-server knowledge calls.
//
// `import "server-only"` guarantees no `"use client"` module can pull the key or
// a live token into the browser bundle. `node:crypto` only ⇒ the routes/layouts
// that use this run on the nodejs runtime (never Edge). The key/token/cookie are
// never logged.

/** Cookie name holding the sealed knowledge session. */
export const SESSION_COOKIE = "knowledge_session";

/** Session lifetime: 30 days — matches knowledge's opaque-token TTL exactly. */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

/** Sealed-cookie envelope version — `v1.<iv>.<ct>.<tag>`, each part base64url. */
const SEAL_VERSION = "v1";

/** Sealed plaintext: the knowledge token + its self-describing expiry (epoch ms). */
interface SealedPayload {
  token: string;
  exp: number;
}

/** Cookie attributes (Secure only in prod — dev is plain http on 127.0.0.1). */
export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: "strict";
  secure: boolean;
  path: "/";
  maxAge: number;
}

/** The Set-Cookie attributes used when issuing the session (login/signup). */
export function sessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

/** The Set-Cookie attributes used when clearing the session (logout) — maxAge 0. */
export function clearedSessionCookieOptions(): SessionCookieOptions {
  return { ...sessionCookieOptions(), maxAge: 0 };
}

// ── The active org (multi-org sessions) ─────────────────────────────────────
// A user may belong to several orgs; the API acts in the first one unless a session
// request names another with `X-Hi2vi-Org`. The web keeps that choice in a second
// httpOnly cookie beside the session, holding only a tenant id: it is no secret (the
// API checks membership on every request and 403s a foreign id), so it is not sealed.
// It is set ONLY by `POST /api/auth/org` after the API confirmed the membership, and
// cleared by the reset (`GET /api/auth/org`), by sign-in, sign-up and sign-out.

/** Cookie name holding the active org's tenant id. */
export const ORG_COOKIE = "hi2vi_org";

/** The request header the API reads the active org from (`server/accounts/auth.py`). */
export const ORG_HEADER = "X-Hi2vi-Org";

/** The switch (POST) and reset (GET) route. Under `/api/auth/` so the edge routes it here. */
export const ORG_ROUTE = "/api/auth/org";

const UUID_SHAPE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A UUID-shaped tenant id (lowercased), or `null` for anything else. Never throws. */
export function asOrgId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return UUID_SHAPE.test(trimmed) ? trimmed.toLowerCase() : null;
}

/** The org cookie's attributes: the session cookie's own (httpOnly, Strict, its lifetime). */
export function orgCookieOptions(): SessionCookieOptions {
  return sessionCookieOptions();
}

/** The org cookie's clearing attributes — maxAge 0. */
export function clearedOrgCookieOptions(): SessionCookieOptions {
  return clearedSessionCookieOptions();
}

/**
 * The active org chosen in this request's cookie, or `null` (absent, malformed, or
 * no request scope at all — a call made outside a request never carries an org).
 */
export async function getActiveOrg(): Promise<string | null> {
  try {
    const store = await cookies();
    return asOrgId(store.get(ORG_COOKIE)?.value);
  } catch {
    return null;
  }
}

/**
 * Where a page whose org cookie the API refused (403) is sent: the reset route,
 * which clears the cookie and returns to `next` (laundered by `safeNextPath` here
 * and again in the route). A server component cannot clear a cookie itself.
 */
export function orgResetHref(next?: string | null): string {
  return `${ORG_ROUTE}?next=${encodeURIComponent(safeNextPath(next))}`;
}

/** The reset target for the page being rendered (`REQUEST_PATH_HEADER`). */
export async function orgResetTarget(): Promise<string> {
  const store = await headers();
  return orgResetHref(store.get(REQUEST_PATH_HEADER));
}

/** Derive the 32-byte AES-256 key from SESSION_SECRET (sha256). */
function sessionKey(): Buffer {
  const { SESSION_SECRET } = readSessionEnv();
  return createHash("sha256").update(SESSION_SECRET).digest();
}

/**
 * Seal a knowledge bearer token into the cookie value `v1.<iv>.<ct>.<tag>` (each
 * part base64url). Plaintext is JSON `{token, exp}` where `exp = now + 30d`; a
 * fresh random 12-byte IV is generated per seal. Reads SESSION_SECRET (throws
 * naming the key, not its value, when unset → the caller turns that into a clean
 * 500).
 */
export function sealSession(token: string, now: number = Date.now()): string {
  const payload: SealedPayload = { token, exp: now + SESSION_TTL_MS };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(), iv);
  const ct = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    SEAL_VERSION,
    iv.toString("base64url"),
    ct.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

/**
 * Open a sealed cookie value and return the knowledge token, or `null` for ANY
 * failure — wrong shape/version, a decrypt/tag-verify failure (tampering), a
 * non-JSON payload, or an expired `exp`. The GCM auth tag makes tampering a
 * decrypt failure, so a flipped byte can never yield a forged token. Never
 * throws, so callers can treat "no valid session" uniformly.
 */
export function openSession(
  value: string | undefined | null,
  now: number = Date.now(),
): string | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [version, ivB64, ctB64, tagB64] = parts;
  if (version !== SEAL_VERSION) return null;

  try {
    const iv = Buffer.from(ivB64, "base64url");
    const ct = Buffer.from(ctB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    if (iv.length !== 12 || tag.length !== 16 || ct.length === 0) return null;

    const decipher = createDecipheriv("aes-256-gcm", sessionKey(), iv);
    decipher.setAuthTag(tag);
    // `final()` throws if the tag does not verify → tampering caught here.
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]).toString(
      "utf8",
    );
    const payload = JSON.parse(pt) as Partial<SealedPayload>;
    if (
      typeof payload.token !== "string" ||
      payload.token === "" ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= now
    ) {
      return null;
    }
    return payload.token;
  } catch {
    return null;
  }
}

/**
 * Read the raw session cookie value out of a `Request` (used by the logout route,
 * a pure function of the incoming request rather than the async `cookies()` store).
 */
export function readSessionCookie(req: Request): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

/**
 * Server-component/layout guard (no redirect): read the sealed cookie via the
 * async `cookies()` store and return the knowledge token, or `null` when it is
 * absent/invalid/expired. Reading the cookie opts the caller into dynamic
 * rendering (never statically prerendered).
 */
export async function getSession(): Promise<string | null> {
  const store = await cookies();
  return openSession(store.get(SESSION_COOKIE)?.value);
}

/**
 * P30.S11 (D32) — where a refused page request is sent: `/login?next=<the page>`.
 *
 * The page's path + query come from the `REQUEST_PATH_HEADER` the proxy
 * (`src/proxy.ts`) stamps on every page request — a server component has no other
 * reliable way to learn its own URL. `loginHref` launders it through
 * `safeNextPath`, so a missing, crafted or off-site value degrades to a bare
 * `/login` (which lands on the default after sign-in), never to an open redirect.
 * A server action's request carries the PAGE's path (actions post to the page
 * URL), so an action that finds the session gone returns the reader to the page
 * they acted on.
 */
export async function loginRedirectTarget(): Promise<string> {
  const store = await headers();
  return loginHref(store.get(REQUEST_PATH_HEADER));
}

/**
 * Server-component/layout guard that REQUIRES a session: returns the decrypted
 * knowledge token for bearer injection, or redirects to the sign-in gate when the
 * cookie is absent/invalid/expired — carrying `?next=` back to this page (P30.S11,
 * D32). The `(app)` layout awaits this before rendering.
 */
export async function requireSession(): Promise<string> {
  const token = await getSession();
  if (!token) redirect(await loginRedirectTarget());
  return token;
}

/**
 * CSRF defense-in-depth for the BFF mutation routes (ported verbatim from
 * hi2vi_web via vocky): accept when `Sec-Fetch-Site` is `same-origin`/`none`, or
 * when the `Origin` header's host matches the request `Host`. Anything else — a
 * cross-site fetch, a mismatched Origin, or no origin signal at all — is rejected
 * (the caller returns 403). SameSite=Strict already blunts CSRF; this is the
 * second layer.
 */
export function assertSameOrigin(req: Request): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin" || secFetchSite === "none") {
    return true;
  }
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const host = req.headers.get("host");
      if (host && new URL(origin).host === host) return true;
    } catch {
      // malformed Origin → fall through to reject
    }
  }
  return false;
}

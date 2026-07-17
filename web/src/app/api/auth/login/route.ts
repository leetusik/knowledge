import { handleCredentialRoute } from "@/lib/bff";
import { login } from "@/lib/knowledge/auth";

// P12.S2 — BFF login. The browser POSTs JSON here (same origin); this route calls
// knowledge's `POST /auth/login` server-to-server and seals the returned opaque
// bearer token into the httpOnly cookie. The token never crosses back to the
// browser.
//
// node:crypto (sealing) + a per-request cookie ⇒ nodejs runtime, never statically
// cached. The ordered checks live in `handleCredentialRoute`.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login is the STRICTER throttle of the two auth routes: 5 attempts per IP per 15
// minutes, to blunt naive credential-stuffing. Weak first layer (per-process,
// spoofable IP), and it only covers browser traffic through this BFF — a direct
// call to knowledge's `POST /auth/login` bypasses it entirely. The real limit is
// now knowledge's own SERVER-SIDE per-IP throttle on that route (P13.S5,
// server/auth_api.py), which a direct call cannot skip.
const LOGIN_RATE_LIMIT = 5;
const LOGIN_RATE_WINDOW_MS = 15 * 60_000;

export async function POST(req: Request): Promise<Response> {
  return handleCredentialRoute(req, {
    limit: LOGIN_RATE_LIMIT,
    windowMs: LOGIN_RATE_WINDOW_MS,
    bucket: "auth-login",
    call: login,
    // 401 = invalid email OR password (knowledge answers an identical generic 401
    // for both so accounts cannot be enumerated — the BFF preserves that property
    // by passing the bare status with no body detail). 400 = backend validation.
    passThroughStatuses: [401, 400],
  });
}

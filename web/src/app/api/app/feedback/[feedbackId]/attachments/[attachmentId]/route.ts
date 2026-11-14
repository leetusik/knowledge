import { getFeedbackAttachment } from "@/lib/feedback/app";
import { ApiError } from "@/lib/knowledge/client";
import { openSession, readSessionCookie } from "@/lib/session";

// The Feedback attachment download relay: the detail page's Download links point
// here. The API serves the bytes at `/app/feedback/{id}/attachments/{aid}` behind
// the session bearer, which lives sealed in an httpOnly cookie on this origin, so
// the browser cannot fetch them directly; this route relays them server-side.
//
// SESSION-ONLY: no cookie is a 401 status (never a login redirect: a download
// wants a status, not an HTML page). The API re-checks the session and the org's
// ownership of the record on the call below.
//
// SECURITY, the reason this is not a dumb pipe:
//   - `Content-Disposition: attachment` is FORCED. The bytes and their declared
//     type are the uploader's; served inline from this origin, a declared
//     `text/html` would be stored XSS against our own session cookie.
//   - The upstream `Content-Type` passes through unchanged (a download needs it),
//     which is safe only because of the disposition, with `nosniff` beside it.
//   - `private, no-store`: one user's file is never cached for another.
//   - Every failure is a bare status: nothing about the upstream is echoed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Both ids are UUIDs: anything else is a hand-typed or tampered URL. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number): Response {
  return new Response(null, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ feedbackId: string; attachmentId: string }> },
): Promise<Response> {
  const token = openSession(readSessionCookie(req));
  if (!token) return fail(401);

  const { feedbackId, attachmentId } = await params;
  if (!UUID_PATTERN.test(feedbackId) || !UUID_PATTERN.test(attachmentId)) {
    return fail(400);
  }

  let upstream: Response;
  try {
    upstream = await getFeedbackAttachment(token, feedbackId, attachmentId);
  } catch (error) {
    if (error instanceof ApiError) {
      // 404: missing, another org's, or no stored object (404-never-403, so a
      // pass-through keeps ids unprobeable).
      if (error.status === 404) return fail(404);
      // 401: the session died between the cookie check and the call.
      if (error.status === 401) return fail(401);
      // 503: the API's attachment storage is down; this route is fine.
      if (error.status === 503) return fail(502);
      return fail(500);
    }
    // The API unreachable, or its env unset: never surfaced to the client.
    return fail(500);
  }

  // Streamed, not buffered. No filename in the disposition: the page's
  // `<a download>` names the file, so no caller-supplied name enters a header.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": "attachment",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

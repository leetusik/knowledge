import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/app/feedback/[feedbackId]/attachments/[attachmentId]/route";
import { SESSION_COOKIE, sealSession } from "@/lib/session";

// The Feedback attachment relay against a STUBBED API: session-only, ids checked
// before any upstream call, 404 passed through, and a success forced to download.

const TOKEN = "0GkQ3vJ8bYd1wZs5RfN7tXcA2eLmPqU9hVjK4oIyB6M";
const FID = "7f1c2a9e-3b4d-4e5f-8a6b-9c0d1e2f3a4b";
const AID = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

beforeAll(() => {
  process.env.SESSION_SECRET = "feedback-relay-test-secret-not-real";
  process.env.KB_API_BASE_URL = "http://kb.test:8766";
});
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function call(fid: string, aid: string, session = true) {
  const req = new Request(
    `http://localhost/api/app/feedback/${fid}/attachments/${aid}`,
    {
      headers: session
        ? { cookie: `${SESSION_COOKIE}=${sealSession(TOKEN)}` }
        : {},
    },
  );
  return GET(req, {
    params: Promise.resolve({ feedbackId: fid, attachmentId: aid }),
  });
}

describe("GET /api/app/feedback/[feedbackId]/attachments/[attachmentId]", () => {
  it("answers 401 with no session and never calls the API", async () => {
    const res = await call(FID, AID, false);
    expect(res.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("answers 400 to a non-UUID id and never calls the API", async () => {
    expect((await call("not-a-uuid", AID)).status).toBe(400);
    expect((await call(FID, "../../etc")).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("passes an upstream 404 through as 404", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "attachment not found" }), {
        status: 404,
      }),
    );
    const res = await call(FID, AID);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
  });

  it("streams a success as a forced download with the four headers", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("<html>x</html>", {
        status: 200,
        headers: { "content-type": "text/html", "set-cookie": "leak=1" },
      }),
    );
    const res = await call(FID, AID);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe(
      `http://kb.test:8766/app/feedback/${FID}/attachments/${AID}`,
    );
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html");
    expect(res.headers.get("content-disposition")).toBe("attachment");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(await res.text()).toBe("<html>x</html>");
  });
});

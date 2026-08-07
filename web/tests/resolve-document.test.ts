import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { resolveDocument } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";

// P25.S3 — the client seam for the pretty-URL resolver, driven against a STUBBED
// knowledge backend (global fetch replaced, the `document-versions` suite's idiom).
// What matters here is exactly what leaves the BFF: the `/app/orgs/{org}/{project}/{slug}`
// URL with every segment escaped and the org slug BARE (no `@` — that prefix is a
// web-plane routing marker the page strips), the caller's bearer when there is one and
// NO Authorization header when there is not (this is an optional-identity read — a
// shared link must resolve anonymously), and `cache: "no-store"`. The page above it is
// convention-covered and not re-mocked.

const TOKEN = "0GkQ3vJ8bYd1wZs5RfN7tXcA2eLmPqU9hVjK4oIyB6M";

beforeAll(() => {
  process.env.KB_API_BASE_URL = "http://kb.test:8766";
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/** Stub one knowledge JSON response. */
function stubKb(body: unknown, status = 200) {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("resolveDocument", () => {
  it("GETs /app/orgs/{org}/{project}/{slug} with the bearer, no-store", async () => {
    stubKb({ id: 42, title: "Hi", canonical_path: "/@hi2vi/kb/hello" });

    await expect(
      resolveDocument(TOKEN, "hi2vi", "kb", "hello"),
    ).resolves.toMatchObject({ id: 42 });
    expect(fetch).toHaveBeenCalledWith(
      "http://kb.test:8766/app/orgs/hi2vi/kb/hello",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
  });

  it("escapes every segment, so nothing can restructure the upstream path", async () => {
    stubKb({ id: 7 });

    await resolveDocument(TOKEN, "hi 2vi", "kb/../etc", "a b");
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      "http://kb.test:8766/app/orgs/hi%202vi/kb%2F..%2Fetc/a%20b",
    );
  });

  it("resolves TOKENLESS when there is no session (a shared link)", async () => {
    stubKb({ id: 42, canonical_path: "/@hi2vi/kb/hello" });

    await expect(
      resolveDocument(undefined, "hi2vi", "kb", "hello"),
    ).resolves.toMatchObject({ id: 42 });
    const headers = (vi.mocked(fetch).mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("throws ApiError(404) on a miss — never swallows it", async () => {
    stubKb({ detail: "no document at that path" }, 404);

    // Unknown org / project / slug and a private project are ONE indistinguishable
    // 404 upstream; the page maps this status to the branded not-found.
    await expect(
      resolveDocument(undefined, "nope", "kb", "hello"),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      resolveDocument(undefined, "nope", "kb", "hello"),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

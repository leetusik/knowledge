import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { getDocumentVersion, getDocumentVersions } from "@/lib/knowledge/app";

// P23.S3 — the client seam for the version-history reads, driven against a STUBBED
// knowledge backend (global fetch replaced, like the delete-document suite). What
// matters here is what leaves the BFF: the exact `/app/documents/{id}/versions[...]`
// URLs, the caller's bearer when there is one and NO Authorization header when there
// is not (these are optional-identity reads — a public document's history must load
// anonymously), and `cache: "no-store"` so per-user data never enters Next's fetch
// cache. The pages above them are convention-covered and not re-mocked.

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
function stubKb(body: unknown) {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("getDocumentVersions", () => {
  it("GETs /app/documents/{id}/versions with the bearer, no-store", async () => {
    stubKb({
      rel_path: "kb/2026-01-02-x.md",
      current_version: 3,
      total: 1,
      versions: [],
    });

    await expect(getDocumentVersions(TOKEN, 42)).resolves.toMatchObject({
      current_version: 3,
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://kb.test:8766/app/documents/42/versions",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
  });

  it("relays TOKENLESS when there is no session (public document's history)", async () => {
    stubKb({
      rel_path: "kb/2026-01-02-x.md",
      current_version: 1,
      total: 0,
      versions: [],
    });

    // The unversioned answer is an EMPTY history, never a 404 — one call decides.
    await expect(getDocumentVersions(undefined, 42)).resolves.toMatchObject({
      total: 0,
      versions: [],
    });
    const headers = (vi.mocked(fetch).mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
  });
});

describe("getDocumentVersion", () => {
  it("GETs /app/documents/{id}/versions/{version} with the bearer", async () => {
    stubKb({ rel_path: "kb/2026-01-02-x.md", version: 2, markdown: "# old" });

    await expect(getDocumentVersion(TOKEN, 42, 2)).resolves.toMatchObject({
      version: 2,
      markdown: "# old",
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://kb.test:8766/app/documents/42/versions/2",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
  });
});

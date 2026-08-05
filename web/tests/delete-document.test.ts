import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { deleteDocument } from "@/lib/knowledge/app";

// P21.S2 — the client seam for the new member delete, driven against a STUBBED
// knowledge backend (global fetch replaced, like the raw-route suite). What matters
// here is what leaves the BFF: the DELETE verb on `/app/documents/{id}` with the
// caller's bearer, and a 204 collapsing to `undefined` (the endpoint sends no body).
// The action's plumbing above it is convention-covered; it is not re-mocked here.

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

describe("deleteDocument", () => {
  it("sends DELETE /app/documents/{id} with the bearer and resolves undefined on 204", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteDocument(TOKEN, 42)).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      "http://kb.test:8766/app/documents/42",
      expect.objectContaining({
        method: "DELETE",
        cache: "no-store",
        body: undefined,
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
  });
});

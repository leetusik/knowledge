import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { mintOrgCredentialAction } from "@/app/(app)/dashboard/actions";
import { mintCredentialAction } from "@/app/(app)/projects/[projectId]/actions";

// A key's scope is chosen at mint: both actions send only `full` or `capture`, and
// `full` when the form carries no choice. The session guard and Next's cache are
// mocked; the API is a stubbed fetch whose request body is read back.

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("@/lib/auth-guards", () => ({
  requireIdentity: vi.fn(async () => ({ token: "tok", identity: {} })),
}));

const PROJECT = "9a8b7c6d-1111-4e5f-9a0b-2c3d4e5f6a7b";

beforeAll(() => {
  process.env.KB_API_BASE_URL = "http://kb.test:8766";
});
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ credential: {}, key: "vk_x" }), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
    ),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

const sentBody = () =>
  JSON.parse(String((vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit).body));

describe.each([
  ["org key", (f: Record<string, string>) => mintOrgCredentialAction({ error: null }, form(f))],
  [
    "project key",
    (f: Record<string, string>) =>
      mintCredentialAction({ error: null }, form({ projectId: PROJECT, ...f })),
  ],
])("%s mint", (_label, mint) => {
  it("defaults the scope to full when the form carries none", async () => {
    const state = await mint({ name: "ci" });
    expect(state.error).toBeNull();
    expect(sentBody()).toEqual({ name: "ci", scope: "full" });
  });

  it("passes capture through", async () => {
    await mint({ scope: "capture" });
    expect(sentBody()).toEqual({ scope: "capture" });
  });

  it("refuses any other value before the API sees it", async () => {
    const state = await mint({ scope: "admin" });
    expect(state.error).not.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});

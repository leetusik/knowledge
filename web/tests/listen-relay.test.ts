import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  GET as playGET,
  HEAD as playHEAD,
} from "@/app/api/listen/play/[...path]/route";
import { SESSION_COOKIE, sealSession } from "@/lib/session";

// P41-sr.B2 — the Listen audio relay against a STUBBED knowledge backend: Range in,
// 206 and its range headers out, a streamed body, 416 passed through, and nothing
// relayed outside its own prefix.

const TOKEN = "0GkQ3vJ8bYd1wZs5RfN7tXcA2eLmPqU9hVjK4oIyB6M";
const UNIT = "ab".repeat(16);
const PART = `/api/listen/play/${UNIT}/0.m4a`;

beforeAll(() => {
  process.env.SESSION_SECRET = "p41b2-test-secret-not-a-real-one";
  process.env.KB_API_BASE_URL = "http://kb.test:8766";
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function makeReq(
  path: string,
  headers: Record<string, string> = {},
  method = "GET",
  session = true,
): Request {
  return new Request(`http://localhost:3030${path}`, {
    method,
    headers: {
      ...headers,
      ...(session ? { cookie: `${SESSION_COOKIE}=${sealSession(TOKEN)}` } : {}),
    },
  });
}

function upstreamCall(): { url: string; init: RequestInit } {
  const [url, init] = vi.mocked(fetch).mock.calls[0];
  return { url: String(url), init: init as RequestInit };
}

describe("GET|HEAD /api/listen/play/[...path] — the audio relay", () => {
  it("forwards Range, passes 206 and its range headers, and streams the body", async () => {
    const first = new Uint8Array([0, 0, 0, 28, 102, 116, 121, 112]);
    // A body that never ends: a relay that buffered it would never answer.
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(first);
      },
    });
    vi.mocked(fetch).mockResolvedValue(
      new Response(body, {
        status: 206,
        headers: {
          "content-type": "audio/mp4",
          "content-range": "bytes 0-99/6503",
          "content-length": "100",
          "accept-ranges": "bytes",
          etag: '"e1"',
          "last-modified": "Wed, 11 Nov 2026 07:27:24 GMT",
          "cache-control": "private, max-age=31536000, immutable",
          "set-cookie": "leak=1",
        },
      }),
    );

    const res = await playGET(
      makeReq(PART, { Range: "bytes=0-99", "If-Range": '"e1"' }),
    );

    const { url, init } = upstreamCall();
    expect(url).toBe(`http://kb.test:8766/app/listen/play/${UNIT}/0.m4a`);
    expect(init.method).toBe("GET");
    expect(init.headers).toEqual({
      range: "bytes=0-99",
      "if-range": '"e1"',
      Authorization: `Bearer ${TOKEN}`,
    });
    expect(res.status).toBe(206);
    expect(res.headers.get("content-type")).toBe("audio/mp4");
    expect(res.headers.get("content-range")).toBe("bytes 0-99/6503");
    expect(res.headers.get("content-length")).toBe("100");
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("etag")).toBe('"e1"');
    expect(res.headers.get("last-modified")).toBe(
      "Wed, 11 Nov 2026 07:27:24 GMT",
    );
    expect(res.headers.get("cache-control")).toBe(
      "private, max-age=31536000, immutable",
    );
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("content-encoding")).toBeNull();
    const reader = res.body!.getReader();
    expect((await reader.read()).value).toEqual(first);
    await reader.cancel();
  });

  it("passes 416, answers HEAD without a body, and keeps the query as given", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("", {
        status: 416,
        headers: {
          "content-range": "bytes */6503",
          "content-type": "text/plain",
        },
      }),
    );
    const past = await playGET(makeReq(PART, { Range: "bytes=999999-" }));
    expect(past.status).toBe(416);
    expect(past.headers.get("content-range")).toBe("bytes */6503");

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 200,
        headers: { "content-type": "audio/mp4", "content-length": "6503" },
      }),
    );
    const head = await playHEAD(makeReq(PART, {}, "HEAD"));
    expect(vi.mocked(fetch).mock.calls[1][1]).toMatchObject({ method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("content-length")).toBe("6503");
    expect(head.body).toBeNull();

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('{"list":"x"}', {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }),
    );
    const timeline = await playGET(
      makeReq("/api/listen/play/timeline?list=p3VJDiVAQx-FP-uhHXpM6w"),
    );
    expect(String(vi.mocked(fetch).mock.calls[2][0])).toBe(
      "http://kb.test:8766/app/listen/play/timeline?list=p3VJDiVAQx-FP-uhHXpM6w",
    );
    expect(timeline.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses a path outside its prefix, and a caller without a session, before any call", async () => {
    for (const path of [
      "/api/listen/position",
      "/api/listen/play/",
      "/api/listen/play//x.m3u8",
      `/api/listen/play/${UNIT}/../../jobs/claim`,
      `/api/listen/play/%2e%2e/%2e%2e/parts/${UNIT}`,
      `/api/listen/play/${UNIT}%2F0.m4a`,
      `/api/listen/play/${UNIT}/0/1.m4a`,
      "/api/listen/play/a..m3u8",
    ]) {
      expect((await playGET(makeReq(path))).status).toBe(404);
    }
    expect((await playGET(makeReq(PART, {}, "GET", false))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps knowledge's 404 a 404, and never widens a cache scope to public", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('{"detail":"not found"}', { status: 404 }),
    );
    expect((await playGET(makeReq(PART))).status).toBe(404);

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("#EXTM3U\n", {
        status: 200,
        headers: {
          "content-type": "application/vnd.apple.mpegurl",
          "cache-control": "public, max-age=60",
        },
      }),
    );
    const list = await playGET(makeReq("/api/listen/play/abc.m3u8"));
    expect(list.headers.get("content-type")).toBe(
      "application/vnd.apple.mpegurl",
    );
    expect(list.headers.get("cache-control")).toBe("no-store");
    expect(await list.text()).toBe("#EXTM3U\n");
  });
});

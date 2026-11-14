import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getFeedbackDetail, listFeedback } from "@/lib/feedback/app";
import {
  feedbackQueryString,
  nextPageHref,
  readActiveParams,
  toQuery,
} from "@/lib/feedback/query";

// The Feedback list's query builder (URL → API) and the two reads it feeds.

const PROJECT = "7f1c2a9e-3b4d-4e5f-8a6b-9c0d1e2f3a4b";

describe("the Feedback query builder", () => {
  it("drops blanks, sends `project` as `project_id`, and passes nothing unknown", () => {
    // What a GET form submit looks like: every field present, blanks included,
    // plus a stray param and the API's own name for the project filter.
    const active = readActiveParams({
      q: "  결제 ",
      project: PROJECT,
      feedback_value: "",
      tag: "   ",
      bogus: "x",
      project_id: "11111111-1111-1111-1111-111111111111",
    });
    expect(active).toEqual({ q: "결제", project: PROJECT });

    const query = toQuery(active);
    expect(query).toEqual({ q: "결제", project_id: PROJECT });
    expect(feedbackQueryString(query)).toBe(
      `?q=${encodeURIComponent("결제")}&project_id=${PROJECT}`,
    );
  });

  it("narrows the numeric params and keeps an empty query bare", () => {
    expect(toQuery({ feedback_value: "2", limit: "10" })).toEqual({
      feedback_value: 2,
      limit: 10,
    });
    expect(feedbackQueryString({})).toBe("");
  });

  it("carries the cursor and every active filter onto the next page", () => {
    const href = nextPageHref(
      { q: "slow", project: PROJECT, cursor: "old" },
      "new",
    );
    const url = new URL(href, "http://x");
    expect(url.pathname).toBe("/feedback");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "slow",
      project: PROJECT,
      cursor: "new",
    });
    // The cursor in the URL reaches the API unchanged.
    const query = toQuery(readActiveParams(Object.fromEntries(url.searchParams)));
    expect(query).toEqual({ q: "slow", project_id: PROJECT, cursor: "new" });
  });
});

describe("listFeedback / getFeedbackDetail", () => {
  beforeAll(() => {
    process.env.KB_API_BASE_URL = "http://kb.test:8766";
  });
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  it("returns the records and the cursor, and keeps an absent cursor absent", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      json({ records: [{ id: "a" }], next_cursor: "c2" }),
    );
    const page = await listFeedback("tok", { project_id: PROJECT, q: "" });
    expect(page).toEqual({ records: [{ id: "a" }], next_cursor: "c2" });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe(
      `http://kb.test:8766/app/feedback?project_id=${PROJECT}`,
    );
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer tok",
    });

    vi.mocked(fetch).mockResolvedValueOnce(json({ records: [] }));
    const last = await listFeedback("tok");
    expect(last).toEqual({ records: [] });
    expect("next_cursor" in last).toBe(false);
  });

  it("unwraps `{record}`", async () => {
    const record = { id: PROJECT, comments: [], attachments: [] };
    vi.mocked(fetch).mockResolvedValueOnce(json({ record }));
    await expect(getFeedbackDetail("tok", PROJECT)).resolves.toEqual(record);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toBe(
      `http://kb.test:8766/app/feedback/${PROJECT}`,
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  COPIED_LABEL,
  FAILED_LABEL,
  attemptCopy,
} from "@/components/marketing/copy-button";
import { HEALTH_CHECK_CURL, ZSHENV_COPY } from "@/content/marketing";

// P20.S3 — the copy control's one bit of real logic: `attemptCopy` resolves a copy to
// "copied" or "failed" and ALWAYS writes the full artifact whole, never logging it.
// (The render is a static pill; the states/labels are locked in copy-button.tsx.) Plus
// a byte-lock on the two snippet payloads — byte-exactness is part of the design contract.

describe("attemptCopy", () => {
  it("writes the full text and resolves to copied on success (idle → copied)", async () => {
    let written: string | null = null;
    const state = await attemptCopy(
      () => ZSHENV_COPY,
      async (t) => {
        written = t;
      },
    );
    expect(state).toBe("copied");
    // The FULL artifact is copied — both export lines with the trailing comment.
    expect(written).toBe(ZSHENV_COPY);
    expect(COPIED_LABEL).toBe("Copied");
  });

  it("resolves to failed when the clipboard write rejects (denied / insecure origin)", async () => {
    const state = await attemptCopy(
      () => HEALTH_CHECK_CURL,
      async () => {
        throw new Error("clipboard blocked");
      },
    );
    expect(state).toBe("failed");
    expect(FAILED_LABEL).toBe("Copy failed");
  });

  it("resolves to failed when the text provider rejects (e.g. a non-ok /SKILL.md fetch)", async () => {
    const state = await attemptCopy(
      async () => {
        throw new Error();
      },
      async () => {},
    );
    expect(state).toBe("failed");
  });
});

describe("locked snippet payloads", () => {
  it("keeps the ~/.zshenv copy byte-exact (two export lines, 8-space trailing comment)", () => {
    expect(ZSHENV_COPY).toBe(
      'export KB_API_BASE_URL="https://knowledge.hi2vi.com"\n' +
        'export KB_API_TOKEN="vk_..."        # org-level key: Dashboard → Org API keys → New key',
    );
  });

  it("keeps the health-check curl line byte-exact", () => {
    expect(HEALTH_CHECK_CURL).toBe(
      'curl -sS --max-time 5 -H "Authorization: Bearer $KB_API_TOKEN" "$KB_API_BASE_URL/api/documents?limit=1"',
    );
  });
});

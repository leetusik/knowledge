import { describe, expect, it } from "vitest";

import { cx } from "@/lib/cx";

describe("cx", () => {
  it("joins the parts that are on with one space, so a class list is never glued", () => {
    expect(cx("qz-st", false)).toBe("qz-st");
    expect(cx("qz-st", true && "is-off")).toBe("qz-st is-off");
    expect(cx("a b", null, undefined, "", "c")).toBe("a b c");
    expect(cx()).toBe("");
  });
});

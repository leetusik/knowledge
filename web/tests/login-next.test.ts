import { isValidElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { redirectIfAuthenticated } from "@/lib/auth-guards";

// P30.S11 (D18, D32) — the gate pages honour a safe `?next=` and ignore an
// unsafe one: what reaches the form (where a successful sign-in lands), the
// already-signed-in bounce and the login ⇄ signup cross-link is always the
// laundered value. The guard is mocked; the pages are called as plain async
// functions and their element tree is inspected, never rendered.

vi.mock("@/lib/auth-guards", () => ({
  redirectIfAuthenticated: vi.fn(async () => undefined),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
}));

const { default: LoginPage } = await import("@/app/(auth)/login/page");
const { default: SignupPage } = await import("@/app/(auth)/signup/page");

type Page = (props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => Promise<ReactElement>;

/** The `next` the page hands its card and form. */
async function nextOf(page: Page, raw: string | string[] | undefined) {
  const card = (await page({
    searchParams: Promise.resolve(raw === undefined ? {} : { next: raw }),
  })) as ReactElement<{
    next?: string;
    children: ReactElement<{ next?: string }>;
  }>;
  expect(isValidElement(card)).toBe(true);
  return { card: card.props.next, form: card.props.children.props.next };
}

beforeEach(() => {
  vi.mocked(redirectIfAuthenticated).mockClear();
});

describe.each([
  ["login", LoginPage as unknown as Page],
  ["signup", SignupPage as unknown as Page],
])("/%s ?next=", (_name, page) => {
  it("honours a safe next", async () => {
    const safe = "/@acme/handbook/books/phases/p8?lang=ko#s-2";
    expect(await nextOf(page, safe)).toEqual({ card: safe, form: safe });
    expect(redirectIfAuthenticated).toHaveBeenCalledWith(safe);
  });

  it.each([
    ["//evil.example"],
    ["https://evil.example/x"],
    ["/%2F%2Fevil.example"],
    ["javascript:alert(1)"],
  ])("ignores %j", async (unsafe) => {
    expect(await nextOf(page, unsafe)).toEqual({
      card: "/dashboard",
      form: "/dashboard",
    });
    expect(redirectIfAuthenticated).toHaveBeenCalledWith("/dashboard");
  });
});

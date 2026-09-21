import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown, { type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

import { DOCUMENTS } from "@/content";

// P12.S5 — the document reader body. A server component (no client island): it just
// renders markdown to HTML at request time. XSS-SAFE BY CONSTRUCTION — react-markdown
// ignores embedded raw HTML by default and we deliberately do NOT add `rehype-raw`,
// so a document's own body can never inject markup or scripts; its `defaultUrlTransform`
// also neutralizes `javascript:`/`data:` hrefs. `remark-gfm` adds GFM tables, task
// lists, strikethrough, and autolinks.
//
// P28.S7 (round 06 §3.1/§5) — the output is styled by `.kb-prose` in the round's own
// `kb-docview.css` (globals chain), NOT by a co-located sheet: `prose.css` is deleted
// and its 46rem cap is retired, because `.kb-prose` is now a THREE-TRACK GRID (a
// centred text track at `--kb-measure`, a full track at the article's 64rem). Three
// components are overridden here, and the first one only works because of that grid:
//
//   1. `table` is wrapped in `.kb-prose__wide`, which must be a DIRECT CHILD of
//      `.kb-prose` to reach the full track (§5). The wrapper is the scroller, so it
//      is also the focusable region (§6).
//   2. `a` absolutizes a relative href against the document's own canonical URL, so
//      the href round 06's print layer prints after the text is reachable from paper;
//      `data-bare` marks a link whose visible text already IS its href, which the
//      print layer uses to not print it twice.
//   3. `pre` scrolls horizontally, so it takes `tabIndex`/`role`/`aria-label` (§6) —
//      a scrollable region that cannot be focused is unreachable by keyboard.

/** The hast node react-markdown hands a component, narrowed to what we read. */
type HastNode = NonNullable<ExtraProps["node"]>;

/** Concatenated text content of a hast subtree — what the reader actually sees. */
function textOf(node: HastNode | undefined): string {
  if (!node) return "";
  let out = "";
  for (const child of node.children ?? []) {
    if (child.type === "text") out += child.value;
    else if (child.type === "element") out += textOf(child);
  }
  return out;
}

/**
 * Resolve a document-relative href against the document's own URL.
 *
 * Left ALONE: an in-page `#anchor` (it belongs to this page and §8 check 16 prints
 * nothing for it), and anything already absolute or protocol-relative. Everything
 * else is resolved against `baseUrl`. A malformed href is returned unchanged rather
 * than thrown on — a document's body must never be able to break its own page.
 *
 * Exported for the print layer and for direct testing; it is pure.
 */
export function absolutizeHref(
  href: string | undefined,
  baseUrl: string,
): string | undefined {
  if (href === undefined || href === "") return href;
  if (href.startsWith("#")) return href;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) return href;
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

/** `language-ts` on the fenced `<code>` → `ts`; an unfenced/unlabelled block → null. */
function fenceLanguage(node: HastNode | undefined): string | null {
  const first = node?.children?.find((child) => child.type === "element");
  if (!first || first.type !== "element") return null;
  const raw = first.properties?.className;
  const names = Array.isArray(raw) ? raw.map(String) : [];
  const match = names.find((name) => name.startsWith("language-"));
  return match ? match.slice("language-".length) || null : null;
}

export function MarkdownBody({
  markdown,
  baseUrl,
}: {
  markdown: string;
  /**
   * The document's own absolute URL — the base a relative link in the body is
   * resolved against (§5). Absolute, not a path, because the point of resolving it
   * is that the printed href is reachable from a sheet of paper.
   */
  baseUrl: string;
}) {
  return (
    <div className="kb-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ node, href, children, ...rest }) {
            const resolved = absolutizeHref(href, baseUrl);
            const text = textOf(node).trim();
            const bare = text !== "" && (text === href || text === resolved);
            return (
              <a {...rest} href={resolved} data-bare={bare ? "" : undefined}>
                {children}
              </a>
            );
          },
          table({ node, children, ...rest }: ComponentPropsWithoutRef<"table"> & ExtraProps) {
            void node;
            return (
              // The wrapper, not the table, is the full-track grid child and the
              // scroll container — so it is what takes focus (§6).
              <div
                className="kb-prose__wide"
                tabIndex={0}
                role="region"
                aria-label={DOCUMENTS.read.regions.table}
              >
                <table {...rest}>{children}</table>
              </div>
            );
          },
          pre({ node, children, ...rest }: ComponentPropsWithoutRef<"pre"> & ExtraProps) {
            return (
              <pre
                {...rest}
                tabIndex={0}
                role="region"
                aria-label={DOCUMENTS.read.regions.code(fenceLanguage(node))}
              >
                {children}
              </pre>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

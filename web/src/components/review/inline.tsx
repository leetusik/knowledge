import { Fragment, type ReactNode } from "react";

import type { Inline } from "@/lib/native/tree";
import { hangulRuns } from "@/lib/reader/hangul";

/**
 * P30.S24 — a card's inline Markdown (a prompt, an option, an answer, an explanation), drawn
 * on the client from the queue's tree. The chapter renderer is server-only (its links resolve
 * through the book), so a card cannot borrow it; this draws the same inline nodes with the same
 * elements (`em`, `strong`, `del`, `code`) and the chapter's Hangul rule (a Hangul run inside
 * text that is not Korean is `lang="ko"`).
 *
 * Links: an external address opens in a new tab; a `#id` link goes to that place in the card's
 * chapter (`hrefBase`); a chapter or document reference (`chapter:…`) needs the book to resolve
 * and is shown as its words, never as a guess at an address. An image is shown as its alt text.
 *
 * A cloze sentence passes `cloze`: each blank becomes the card's input, numbered in reading
 * order, and what touches a blank's end with no space between (a comma, a full stop, a Korean
 * particle) rides in the blank's no-wrap group, so a line never starts with "," or "에".
 */
export interface ClozeHooks {
  /** Make the input for the n-th blank; `tail` are the characters that touch its end. */
  blank: (n: number, tail: ReactNode) => ReactNode;
}

export function InlineText({
  nodes,
  wrap,
  hrefBase,
  cloze,
}: {
  nodes: readonly Inline[] | null | undefined;
  /** The text's language is not Korean: wrap its Hangul runs. */
  wrap: boolean;
  /** The card's chapter address without a fragment, for `#id` links. */
  hrefBase: string;
  cloze?: ClozeHooks;
}) {
  const counter = { n: 0 };
  return <>{run(nodes ?? [], wrap, hrefBase, cloze, counter)}</>;
}

function linkTarget(
  href: string,
  base: string,
): { href: string; external: boolean } | null {
  if (/^https?:\/\//i.test(href)) return { href, external: true };
  if (href.startsWith("#") && href.length > 1)
    return { href: `${base}${href}`, external: false };
  return null;
}

function run(
  nodes: readonly Inline[],
  wrap: boolean,
  base: string,
  cloze: ClozeHooks | undefined,
  counter: { n: number },
): ReactNode {
  let skip = 0;
  return nodes.map((node, i) => {
    if (node.type === "blank" && cloze) {
      counter.n += 1;
      const next = nodes[i + 1];
      const m =
        next?.type === "text" ? /^[^\s`*_[\]~{}<>]+/.exec(next.text) : null;
      skip = m ? m[0].length : 0;
      return (
        <Fragment key={i}>
          {cloze.blank(counter.n, m ? hangulRuns(m[0], wrap) : undefined)}
        </Fragment>
      );
    }
    if (node.type === "text" && skip > 0) {
      const rest = node.text.slice(skip);
      skip = 0;
      return rest ? (
        <Fragment key={i}>{hangulRuns(rest, wrap)}</Fragment>
      ) : null;
    }
    skip = 0;
    switch (node.type) {
      case "text":
        return <Fragment key={i}>{hangulRuns(node.text, wrap)}</Fragment>;
      case "code":
        return <code key={i}>{node.text}</code>;
      case "em":
        return (
          <em key={i}>{run(node.children, wrap, base, cloze, counter)}</em>
        );
      case "strong":
        return (
          <strong key={i}>
            {run(node.children, wrap, base, cloze, counter)}
          </strong>
        );
      case "del":
        return (
          <del key={i}>{run(node.children, wrap, base, cloze, counter)}</del>
        );
      case "break":
        return <br key={i} />;
      case "blank":
        return (
          <span key={i} aria-hidden="true">
            {"_____"}
          </span>
        );
      case "image":
        return <Fragment key={i}>{hangulRuns(node.alt, wrap)}</Fragment>;
      case "link": {
        const inner = run(node.children, wrap, base, cloze, counter);
        const target = linkTarget(node.href, base);
        if (!target) return <Fragment key={i}>{inner}</Fragment>;
        return target.external ? (
          <a
            key={i}
            href={target.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {inner}
          </a>
        ) : (
          <a key={i} href={target.href}>
            {inner}
          </a>
        );
      }
      default:
        return null;
    }
  });
}

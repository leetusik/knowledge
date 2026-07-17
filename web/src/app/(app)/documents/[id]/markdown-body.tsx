import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import "./prose.css";

// P12.S5 — the document reader body. A server component (no client island): it just
// renders markdown to HTML at request time. XSS-SAFE BY CONSTRUCTION — react-markdown
// ignores embedded raw HTML by default and we deliberately do NOT add `rehype-raw`,
// so a document's own body can never inject markup or scripts; its `defaultUrlTransform`
// also neutralizes `javascript:`/`data:` hrefs. `remark-gfm` adds GFM tables, task
// lists, strikethrough, and autolinks. Output is styled by the co-located `.kb-prose`
// block (prose.css) — a minimal on-KB-token reader surface.
export function MarkdownBody({ markdown }: { markdown: string }) {
  return (
    <div className="kb-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}

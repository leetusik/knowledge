/**
 * The block tree → React mapping (P29 *Render model*). A server component:
 * nothing here ships to the client, and nothing here is ever HTML.
 *
 * - **No raw HTML, ever.** There is no `dangerouslySetInnerHTML`, no
 *   `innerHTML` and no HTML passthrough: every element below is a React element
 *   built from the normalized tree, and every string is a React text child
 *   (escaped by React). Raw HTML never reaches the tree (native: refused at
 *   ingest and again here; `md`: dropped by the parser).
 * - **SVG** is rebuilt element by element from the validated tree through the
 *   allowlist a second time (`svg.ts`), with its ids scoped to the block.
 * - **Links** go through `links.ts`: a target the reader cannot open renders as
 *   a "missing link" that carries no href.
 * - **Plumbing, not look.** Minimal semantic markup with stable class and
 *   `data-*` hooks (`kb-ch-*`); S13 onwards style it under the signed rounds.
 *   No `style` attribute anywhere: the CSP stays free of `'unsafe-inline'`.
 */
import "server-only";

import { createElement, Fragment, type ReactNode } from "react";

import { CHAPTER } from "@/content";

import { highlight } from "./highlight";
import {
  assetHref,
  resolveImage,
  resolveLink,
  type LinkContext,
} from "./links";
import type { ChapterFormat } from "./parse";
import {
  allowedSvgElement,
  svgAttrsToProps,
  TEXT_ELEMENTS,
  type SvgChild,
  type SvgElement,
} from "./svg";
import type { Block, Inline, TypedBlock } from "./tree";
import { validateChapter, type CheckedChapter } from "./validate";

export interface NativeChapterProps extends Omit<LinkContext, "format"> {
  /** The stored file: a native chapter's whole `source` (header included), or an md body. */
  source: string;
  format: ChapterFormat;
  /** The variant's language, carried on the article (P29: Korean typography keys on it). */
  lang?: string;
}

/** Parse, re-validate and render a chapter. */
export function NativeChapter({
  source,
  format,
  lang,
  ...links
}: NativeChapterProps) {
  return (
    <ChapterView
      checked={validateChapter(source, format)}
      lang={lang}
      links={{ ...links, format }}
    />
  );
}

export function ChapterView({
  checked,
  lang,
  links,
}: {
  checked: CheckedChapter;
  lang?: string;
  links: LinkContext;
}) {
  if (checked.refused) {
    return (
      <div
        className="kb-ch kb-ch--refused"
        data-format={checked.format}
        lang={lang}
      >
        <p className="kb-ch-unshowable" role="note">
          {CHAPTER.unshowableChapter}
        </p>
      </div>
    );
  }
  const r = new Renderer(links);
  return (
    <div className="kb-ch" data-format={checked.format} lang={lang}>
      {checked.blocks.map((entry, i) =>
        entry.refused ? (
          <div
            key={i}
            className="kb-ch-unshowable"
            role="note"
            data-block={
              entry.block && entry.block.id ? entry.block.id : undefined
            }
          >
            {CHAPTER.unshowableBlock}
          </div>
        ) : entry.block ? (
          <Fragment key={i}>{r.block(entry.block)}</Fragment>
        ) : null,
      )}
    </div>
  );
}

// --- typed-block field readers (fields are `unknown` until checked) ------------

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const recs = (v: unknown): Rec[] => arr(v).filter(isRec);
const inl = (v: unknown): Inline[] | null =>
  Array.isArray(v) ? (v as Inline[]) : null;
const KNOWN_CALLOUTS = new Set(Object.keys(CHAPTER.calloutLabel));
const KNOWN_TONES = new Set([
  "default",
  "muted",
  "accent",
  "ok",
  "warn",
  "bad",
  "store",
  "series-1",
  "series-2",
  "series-3",
  "series-4",
  "series-5",
  "series-6",
]);
/** P29's render fallback: an unknown tone draws as `default` (ingest refuses it first). */
const tone = (v: unknown): string =>
  typeof v === "string" && KNOWN_TONES.has(v) ? v : "default";

class Renderer {
  constructor(private readonly links: LinkContext) {}

  // --- inline ------------------------------------------------------------------

  inline(nodes: readonly Inline[] | null | undefined): ReactNode {
    if (!nodes) return null;
    return nodes.map((node, i) => this.inlineNode(node, i));
  }

  inlineNode(node: Inline, key: number): ReactNode {
    switch (node.type) {
      case "text":
        return <Fragment key={key}>{node.text}</Fragment>;
      case "code":
        return <code key={key}>{node.text}</code>;
      case "em":
        return <em key={key}>{this.inline(node.children)}</em>;
      case "strong":
        return <strong key={key}>{this.inline(node.children)}</strong>;
      case "del":
        return <del key={key}>{this.inline(node.children)}</del>;
      case "break":
        return <br key={key} />;
      case "blank":
        return (
          <span
            key={key}
            className="kb-ch-blank"
            aria-label={CHAPTER.quiz.blank}
          >
            {"_____"}
          </span>
        );
      case "image": {
        const src = resolveImage(node.src, this.links);
        if (src === null) {
          return (
            <span
              key={key}
              className="kb-ch-image-missing"
              role="img"
              aria-label={CHAPTER.missingImage(node.alt)}
            >
              {node.alt}
            </span>
          );
        }
        return (
          // eslint-disable-next-line @next/next/no-img-element -- a same-origin asset relay, sized by S16
          <img
            key={key}
            src={src}
            alt={node.alt}
            title={node.title ?? undefined}
            loading="lazy"
          />
        );
      }
      case "link":
        return this.link(
          node.href,
          node.title,
          this.inline(node.children),
          key,
        );
      default:
        return null;
    }
  }

  link(
    href: string,
    title: string | null,
    children: ReactNode,
    key?: number,
  ): ReactNode {
    const target = resolveLink(href, this.links);
    if (target.kind === "missing") {
      // Never a dead link and never a leak: no href, no title, no target text.
      return (
        <span key={key} className="kb-link-missing" data-missing-link="">
          {children}
          <span className="sr-only"> {CHAPTER.missingLink}</span>
        </span>
      );
    }
    if (target.kind === "external") {
      return (
        <a
          key={key}
          href={target.href}
          title={title ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          data-link="external"
        >
          {children}
        </a>
      );
    }
    return (
      <a
        key={key}
        href={target.href}
        title={title ?? undefined}
        data-link={target.kind}
      >
        {children}
      </a>
    );
  }

  // --- blocks ------------------------------------------------------------------

  blocks(blocks: readonly Block[]): ReactNode {
    return blocks.map((b, i) => <Fragment key={i}>{this.block(b)}</Fragment>);
  }

  block(block: Block): ReactNode {
    switch (block.type) {
      case "paragraph":
        return <p>{this.inline(block.content)}</p>;
      case "heading": {
        const level = Math.min(Math.max(block.level, 1), 6);
        return createElement(
          `h${level}`,
          {
            id: block.id ?? undefined,
            className: "kb-ch-h",
            "data-block": block.id ?? undefined,
          },
          this.inline(block.content),
        );
      }
      case "list": {
        const items = block.items.map((item, i) => (
          <li key={i}>{this.blocks(item.blocks)}</li>
        ));
        return block.ordered ? (
          <ol
            start={
              block.start !== null && block.start !== 1
                ? block.start
                : undefined
            }
            data-tight={block.tight ? "" : undefined}
          >
            {items}
          </ol>
        ) : (
          <ul data-tight={block.tight ? "" : undefined}>{items}</ul>
        );
      }
      case "blockquote":
        return <blockquote>{this.blocks(block.blocks)}</blockquote>;
      case "callout":
        return this.callout(block);
      case "table":
        return this.table(block);
      case "code":
        return this.code(block);
      case "hr":
        return <hr />;
      default:
        return this.typed(block);
    }
  }

  callout(block: Extract<Block, { type: "callout" }>): ReactNode {
    // P29: an unknown type renders as NOTE (ingest refuses it first).
    const kind =
      block.kind && KNOWN_CALLOUTS.has(block.kind) ? block.kind : "NOTE";
    const label = CHAPTER.calloutLabel[kind];
    const title =
      block.title && block.title.length ? this.inline(block.title) : null;
    if (block.collapsed) {
      return (
        <details
          className="kb-ch-callout"
          data-kind={kind.toLowerCase()}
          data-collapsed=""
        >
          <summary className="kb-ch-callout__title">{title ?? label}</summary>
          {this.blocks(block.blocks)}
        </details>
      );
    }
    return (
      <aside
        className="kb-ch-callout"
        data-kind={kind.toLowerCase()}
        aria-label={label}
      >
        {title ? <p className="kb-ch-callout__title">{title}</p> : null}
        {this.blocks(block.blocks)}
      </aside>
    );
  }

  table(block: Extract<Block, { type: "table" }>): ReactNode {
    return (
      <div
        className="kb-ch-table"
        tabIndex={0}
        role="region"
        aria-label={CHAPTER.regions.table}
      >
        <table>
          <thead>
            <tr>
              {block.head.map((cell, i) => (
                <th key={i} data-align={block.align[i] ?? undefined}>
                  {this.inline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          {block.rows.length ? (
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) => (
                    <td key={i} data-align={block.align[i] ?? undefined}>
                      {this.inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ) : null}
        </table>
      </div>
    );
  }

  code(block: Extract<Block, { type: "code" }>): ReactNode {
    const lines = highlight(block.text, block.lang);
    const body = lines
      ? lines.map((line, i) => (
          <Fragment key={i}>
            {i > 0 ? "\n" : null}
            {line.map((tok, j) =>
              tok.className ? (
                <span key={j} className={tok.className}>
                  {tok.text}
                </span>
              ) : (
                <Fragment key={j}>{tok.text}</Fragment>
              ),
            )}
          </Fragment>
        ))
      : block.text;
    return (
      <figure
        className="kb-ch-code"
        id={block.id ?? undefined}
        data-block={block.id ?? undefined}
        data-lang={block.lang ?? undefined}
      >
        {block.title ? (
          <figcaption className="kb-ch-code__title">{block.title}</figcaption>
        ) : null}
        <pre
          tabIndex={0}
          role="region"
          aria-label={CHAPTER.regions.code(block.lang)}
        >
          <code>{body}</code>
        </pre>
      </figure>
    );
  }

  // --- typed blocks ----------------------------------------------------------------

  typed(block: TypedBlock): ReactNode {
    const id = block.id ?? undefined;
    // A top-level chart arrives as type "bar" | "line" | "interval" with kind
    // "chart" (the Python tree's quirk, kept for parity; see tree.ts): a diagram.
    const isChart =
      block.kind === "chart" &&
      (block.type === "bar" ||
        block.type === "line" ||
        block.type === "interval");
    switch (isChart ? "diagram" : block.type) {
      case "figure":
        return this.figure(block, id);
      case "figures":
        return this.figures(block, id);
      case "diagram":
        return (
          <figure
            className="kb-ch-diagram"
            id={id}
            data-block={id}
            data-kind={str(block.kind) ?? undefined}
          >
            {this.diagramBody(block)}
            {this.caption(inl(block.caption))}
          </figure>
        );
      case "svg":
        return (
          <figure className="kb-ch-svg" id={id} data-block={id}>
            {this.svg(block.svg, str(block.label) ?? "", id ?? "svg")}
            {this.caption(inl(block.caption))}
          </figure>
        );
      case "quiz":
        return this.quiz(block, id);
      case "sources":
        return this.sources(block, id);
      default:
        return null;
    }
  }

  caption(nodes: Inline[] | null, extra?: ReactNode): ReactNode {
    if ((!nodes || !nodes.length) && !extra) return null;
    return (
      <figcaption className="kb-ch-caption">
        {this.inline(nodes)}
        {extra}
      </figcaption>
    );
  }

  image(name: string | null, alt: string): ReactNode {
    const src = assetHref(name, this.links);
    if (src === null) {
      return (
        <span
          className="kb-ch-image-missing"
          role="img"
          aria-label={CHAPTER.missingImage(alt)}
        >
          {alt}
        </span>
      );
    }
    // eslint-disable-next-line @next/next/no-img-element -- a same-origin asset relay, sized by S16
    return <img src={src} alt={alt} loading="lazy" />;
  }

  figure(block: TypedBlock, id: string | undefined): ReactNode {
    const credit = inl(block.credit);
    return (
      <figure
        className="kb-ch-figure"
        id={id}
        data-block={id}
        data-width={str(block.width) ?? "column"}
      >
        {this.image(str(block.src), str(block.alt) ?? "")}
        {this.caption(
          inl(block.caption),
          credit && credit.length ? (
            <span className="kb-ch-figure__credit">{this.inline(credit)}</span>
          ) : null,
        )}
      </figure>
    );
  }

  figures(block: TypedBlock, id: string | undefined): ReactNode {
    const items = recs(block.items);
    return (
      <figure
        className="kb-ch-figures"
        id={id}
        data-block={id}
        data-count={items.length}
      >
        <div className="kb-ch-figures__row">
          {items.map((item, i) => (
            <figure
              key={i}
              className="kb-ch-figures__item"
              data-kind={str(item.kind) ?? undefined}
            >
              {this.figuresItem(item, `${id ?? "figures"}-${i + 1}`)}
              {this.caption(inl(item.caption))}
            </figure>
          ))}
        </div>
        {this.caption(inl(block.caption))}
      </figure>
    );
  }

  figuresItem(item: Rec, scope: string): ReactNode {
    switch (item.kind) {
      case "image":
        return this.image(str(item.src), str(item.alt) ?? "");
      case "diagram":
        return isRec(item.diagram) ? (
          <div
            className="kb-ch-diagram"
            data-kind={str(item.diagram.kind) ?? undefined}
          >
            {this.diagramBody(item.diagram)}
          </div>
        ) : null;
      case "svg":
        return this.svg(item.svg, str(item.label) ?? "", scope);
      case "card":
        return (
          <div className="kb-ch-card" data-tone={tone(item.tone)}>
            <p className="kb-ch-card__title">{str(item.title)}</p>
            {arr(item.body).map((para, i) => (
              <p key={i}>{this.inline(inl(para))}</p>
            ))}
          </div>
        );
      default:
        return null;
    }
  }

  /**
   * S12's diagram body: the diagram's content as accessible structured text
   * (title, then nodes and connections, steps, layers, lanes or a data table).
   * S17/S18 replace it with the drawn diagram from the signed `03-diagrams`.
   */
  diagramBody(d: Rec): ReactNode {
    const kind = str(d.kind);
    const title = <p className="kb-ch-diagram__title">{str(d.title)}</p>;
    let body: ReactNode = null;
    if (kind === "flow" || kind === "state") {
      const labels = new Map(
        recs(d.nodes).map((n) => [str(n.id), str(n.label)]),
      );
      body = (
        <>
          <ul
            className="kb-ch-diagram__nodes"
            aria-label={CHAPTER.diagram.nodes}
          >
            {recs(d.nodes).map((n, i) => (
              <li
                key={i}
                data-shape={str(n.shape) ?? "box"}
                data-tone={tone(n.tone)}
              >
                {str(n.label)}
                {str(n.sub) ? (
                  <span className="kb-ch-diagram__sub"> {str(n.sub)}</span>
                ) : null}
                {arr(n.fields).length ? (
                  <ul>
                    {arr(n.fields).map((f, j) => (
                      <li key={j}>{str(f)}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          {recs(d.edges).length ? (
            <ul
              className="kb-ch-diagram__edges"
              aria-label={CHAPTER.diagram.edges}
            >
              {recs(d.edges).map((e, i) => (
                <li
                  key={i}
                  data-style={str(e.style) ?? "solid"}
                  data-tone={tone(e.tone)}
                >
                  {labels.get(str(e.from)) ?? str(e.from)} {"→"}{" "}
                  {labels.get(str(e.to)) ?? str(e.to)}
                  {str(e.label) ? `: ${str(e.label)}` : null}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      );
    } else if (kind === "sequence") {
      const labels = new Map(
        recs(d.actors).map((a) => [str(a.id), str(a.label)]),
      );
      body = (
        <ol className="kb-ch-diagram__steps" aria-label={CHAPTER.diagram.steps}>
          {recs(d.steps).map((s, i) => (
            <li key={i} data-style={str(s.style) ?? "solid"}>
              {labels.get(str(s.from)) ?? str(s.from)} {"→"}{" "}
              {labels.get(str(s.to)) ?? str(s.to)}: {str(s.label)}
              {str(s.note) ? (
                <span className="kb-ch-diagram__sub"> {str(s.note)}</span>
              ) : null}
            </li>
          ))}
        </ol>
      );
    } else if (kind === "stack") {
      body = (
        <ul
          className="kb-ch-diagram__layers"
          aria-label={CHAPTER.diagram.layers}
          data-nested={d.nested ? "" : undefined}
        >
          {recs(d.layers).map((l, i) => (
            <li key={i} data-tone={tone(l.tone)}>
              {str(l.label)}
              {arr(l.items).length ? (
                <ul>
                  {arr(l.items).map((it, j) => (
                    <li key={j}>{str(it)}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      );
    } else if (kind === "timeline") {
      const unit = isRec(d.axis) ? (str(d.axis.unit) ?? "") : "";
      body = (
        <ul className="kb-ch-diagram__lanes" aria-label={CHAPTER.diagram.lanes}>
          {recs(d.lanes).map((lane, i) => (
            <li key={i}>
              {str(lane.label)}
              <ul>
                {recs(lane.bars).map((b, j) => (
                  <li key={`b${j}`} data-tone={tone(b.tone)}>
                    {num(b.from)}–{num(b.to)} {unit}
                    {str(b.label) ? `: ${str(b.label)}` : null}
                  </li>
                ))}
                {recs(lane.marks).map((m, j) => (
                  <li key={`m${j}`} data-mark="">
                    {num(m.at)} {unit}: {str(m.label)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      );
    } else if (kind === "chart") {
      body = this.chartTable(d);
    }
    return (
      <div className="kb-ch-diagram__body">
        {title}
        {body}
      </div>
    );
  }

  chartTable(d: Rec): ReactNode {
    const x = isRec(d.x) ? d.x : {};
    const categories = arr(x.categories).map((c) => str(c) ?? "");
    const series = recs(d.series);
    const width = Math.max(
      categories.length,
      ...series.map((s) => arr(s.values).length),
      0,
    );
    const cell = (v: unknown) =>
      Array.isArray(v) ? v.join("–") : (num(v) ?? "");
    return (
      <table
        className="kb-ch-chart"
        data-type={str(d.type) ?? undefined}
        aria-label={CHAPTER.diagram.series}
      >
        <thead>
          <tr>
            <th>{str(x.label)}</th>
            {Array.from({ length: width }, (_, i) => (
              <th key={i}>{categories[i] ?? i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((s, i) => (
            <tr key={i} data-tone={tone(s.tone)}>
              <th>{str(s.name)}</th>
              {arr(s.values).map((v, j) => (
                <td key={j}>{cell(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  /** Rebuild a validated svg tree as React elements, through the allowlist again. */
  svg(tree: unknown, label: string, scope: string): ReactNode {
    if (!isRec(tree) || tree.name !== "svg") return null;
    const root = tree as unknown as SvgElement;
    const props = svgAttrsToProps("svg", root.attrs ?? {}, scope);
    return createElement(
      "svg",
      {
        ...props,
        xmlns: "http://www.w3.org/2000/svg",
        role: "img",
        "aria-label": label,
        className: ["kb-ch-svg__art", props.className]
          .filter(Boolean)
          .join(" "),
      },
      this.svgChildren(root, scope),
    );
  }

  svgChildren(node: SvgElement, scope: string): ReactNode {
    const children = node.children ?? [];
    // <title>/<desc> take ONE string child: React 19 treats `title` as document
    // metadata and stringifies anything else ("[object Object]"), which also
    // breaks hydration. Text elsewhere goes in as plain strings too.
    if (TEXT_ELEMENTS.has(node.name) && children.every((c) => "text" in c)) {
      return children.map((c) => ("text" in c ? c.text : "")).join("");
    }
    return children.map((child: SvgChild, i) => {
      if ("text" in child)
        return TEXT_ELEMENTS.has(node.name) ? child.text : null;
      if (!allowedSvgElement(child.name) || child.name === "svg") return null;
      return createElement(
        child.name,
        { key: i, ...svgAttrsToProps(child.name, child.attrs ?? {}, scope) },
        this.svgChildren(child, scope),
      );
    });
  }

  quiz(block: TypedBlock, id: string | undefined): ReactNode {
    const title = str(block.title);
    return (
      <section
        className="kb-ch-quiz"
        id={id}
        data-block={id}
        aria-label={title ?? CHAPTER.quiz.label}
      >
        {title ? <p className="kb-ch-quiz__title">{title}</p> : null}
        <ol className="kb-ch-quiz__items">
          {recs(block.items).map((item, i) => (
            <li
              key={i}
              id={str(item.id) ?? undefined}
              data-type={str(item.type) ?? undefined}
            >
              {this.quizItem(item)}
            </li>
          ))}
        </ol>
      </section>
    );
  }

  quizItem(item: Rec): ReactNode {
    const explain = inl(item.explain);
    const explanation =
      explain && explain.length ? (
        <details className="kb-ch-quiz__explain">
          <summary>{CHAPTER.quiz.explanation}</summary>
          <p>{this.inline(explain)}</p>
        </details>
      ) : null;
    if (item.type === "choice") {
      return (
        <>
          <p className="kb-ch-quiz__prompt">{this.inline(inl(item.prompt))}</p>
          <ul className="kb-ch-quiz__options">
            {recs(item.options).map((o, j) => (
              <li key={j} data-option={str(o.id) ?? undefined}>
                {this.inline(inl(o.text))}
              </li>
            ))}
          </ul>
          {explanation}
        </>
      );
    }
    if (item.type === "recall") {
      return (
        <>
          <p className="kb-ch-quiz__prompt">{this.inline(inl(item.prompt))}</p>
          <details className="kb-ch-quiz__answer">
            <summary>{CHAPTER.quiz.showAnswer}</summary>
            <p>{this.inline(inl(item.answer))}</p>
          </details>
          {explanation}
        </>
      );
    }
    if (item.type === "cloze") {
      return (
        <>
          <p className="kb-ch-quiz__prompt">{this.inline(inl(item.text))}</p>
          {explanation}
        </>
      );
    }
    return null;
  }

  sources(block: TypedBlock, id: string | undefined): ReactNode {
    return (
      <section
        className="kb-ch-sources"
        id={id}
        data-block={id}
        aria-label={CHAPTER.sources.label}
      >
        <ol>
          {recs(block.items).map((item, i) => {
            const url = str(item.url);
            const title = str(item.title) ?? "";
            const meta = [
              str(item.publisher),
              str(item.date),
              item.accessed
                ? CHAPTER.sources.accessed(String(item.accessed))
                : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={i} id={str(item.id) ?? undefined}>
                {url ? this.link(url, null, title) : title}
                {meta ? (
                  <span className="kb-ch-sources__meta"> {meta}</span>
                ) : null}
                {str(item.note) ? (
                  <span className="kb-ch-sources__note"> {str(item.note)}</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>
    );
  }
}

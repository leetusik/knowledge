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
 *   The only `style` attributes are the figures' custom properties (`--fg-w`, `--fg-h`,
 *   `--fg-vbw`, `--fg-minw`, P30.S16): numbers from the asset map and the validated svg,
 *   never author strings. The CSP leaves `style-src` open (see `csp.ts`).
 */
import "server-only";

import { createElement, Fragment, type ReactNode } from "react";

import { DiagramFigure } from "@/components/reader/diagram-figure";
import {
  ImageBox,
  MissingBox,
  ScrollFigure,
} from "@/components/reader/figure-parts";
import { ArtBox, TableBox } from "@/components/reader/scroll-box";
import { CHAPTER } from "@/content";
import { hangulRuns, isKorean } from "@/lib/reader/hangul";

import { letters, planCitations, type CitationPlan } from "./cites";
import { Drawing, graphAlt, layoutFor } from "./diagram-draw";
import { highlight } from "./highlight";
import {
  resolveAsset,
  resolveImage,
  resolveLink,
  type AssetInfo,
  type LinkContext,
} from "./links";
import { plainText, type ChapterFormat } from "./parse";
import { parseRef, RefError } from "./refs";
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
  omitTitle,
}: {
  checked: CheckedChapter;
  lang?: string;
  links: LinkContext;
  /**
   * The document's title, when the reader's chapter opening already shows it: an `md`
   * body starts at its own H1, which is then left out (only that first H1, and only
   * when its text is this title).
   */
  omitTitle?: string | null;
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
  // §6a: in text whose language is not Korean, each Hangul run is wrapped in `lang="ko"`.
  const r = new Renderer(
    links,
    lang !== undefined && !isKorean(lang),
    checked.blocks.flatMap((e) => (e.block && !e.refused ? [e.block] : [])),
  );
  const first = checked.blocks.find((b) => b.block !== null);
  const skip =
    omitTitle &&
    first &&
    !first.refused &&
    first.block?.type === "heading" &&
    first.block.level === 1 &&
    plainText(first.block.content).trim() === omitTitle.trim()
      ? first
      : null;
  return (
    <div className="kb-ch" data-format={checked.format} lang={lang}>
      {checked.blocks.map((entry, i) =>
        entry === skip ? null : entry.refused ? (
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

/** A paragraph's leading and trailing blanks (a space or a break beside an image) are not text. */
function trimRun(run: Inline[]): Inline[] {
  const blank = (n: Inline) =>
    n.type === "break" || (n.type === "text" && n.text.trim() === "");
  let a = 0;
  let b = run.length;
  while (a < b && blank(run[a])) a += 1;
  while (b > a && blank(run[b - 1])) b -= 1;
  const out = run.slice(a, b);
  const first = out[0];
  if (first?.type === "text") out[0] = { ...first, text: first.text.trimStart() };
  const last = out[out.length - 1];
  if (last?.type === "text")
    out[out.length - 1] = { ...last, text: last.text.trimEnd() };
  return out;
}

class Renderer {
  /** The chapter's citations and each source's way back (`cites.ts`); empty for `md`. */
  private readonly plan: CitationPlan;
  /** How many plain images of each asset the chapter has had (`img-<name>`, `-2`, `-3` …). */
  private readonly imageIds = new Map<string, number>();

  constructor(
    private readonly links: LinkContext,
    /** Wrap each Hangul run in `lang="ko"` (the text's language is not Korean). */
    private readonly wrap: boolean = false,
    blocks: readonly Block[] = [],
  ) {
    this.plan = planCitations(links.format === "md" ? [] : blocks);
  }

  /** Text with its Hangul runs wrapped (§6a). Never used for code or attributes. */
  text(value: string): ReactNode {
    return hangulRuns(value, this.wrap);
  }

  // --- inline ------------------------------------------------------------------

  inline(nodes: readonly Inline[] | null | undefined): ReactNode {
    if (!nodes) return null;
    return nodes.map((node, i) => this.inlineNode(node, i));
  }

  inlineNode(node: Inline, key: number): ReactNode {
    switch (node.type) {
      case "text":
        return <Fragment key={key}>{this.text(node.text)}</Fragment>;
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
      case "image":
        return (
          <Fragment key={key}>
            {this.links.format === "md"
              ? this.mdImage(node)
              : this.imageBox(
                  resolveAsset(this.assetName(node.src), this.links),
                  node.alt,
                  node.title,
                )}
          </Fragment>
        );
      case "link": {
        const cite = this.plan.byLink.get(node);
        if (cite) return this.citation(node, cite, key);
        return this.link(
          node.href,
          node.title,
          this.inline(node.children),
          key,
        );
      }
      default:
        return null;
    }
  }

  /** A native image's asset name: `asset:<name>` only (null for anything else). */
  assetName(src: string): string | null {
    try {
      const ref = parseRef(src, true);
      return ref.kind === "asset" ? ref.name : null;
    } catch (exc) {
      if (exc instanceof RefError) return null;
      throw exc;
    }
  }

  /**
   * The image box (§1): the reserved box with the asset's size from the version's map, or the
   * "Image not available" box when the version holds no such asset.
   */
  imageBox(
    info: AssetInfo | null,
    alt: string,
    title?: string | null,
  ): ReactNode {
    const altNode = this.text(alt);
    if (!info)
      return (
        <MissingBox w={null} h={null} label={CHAPTER.figure.missing}>
          {altNode}
        </MissingBox>
      );
    return (
      <ImageBox
        src={info.url}
        still={info.animated ? info.stillUrl : null}
        alt={alt}
        title={title ?? undefined}
        w={info.width}
        h={info.height}
        label={CHAPTER.figure.missing}
        missingAlt={altNode}
      />
    );
  }

  /** An `md` image: a same-origin URL, with no size to reserve (it keeps the old inline `<img>`). */
  mdImage(node: Extract<Inline, { type: "image" }>): ReactNode {
    const src = resolveImage(node.src, this.links);
    if (src === null)
      return (
        <MissingBox w={null} h={null} label={CHAPTER.figure.missing}>
          {this.text(node.alt)}
        </MissingBox>
      );
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a same-origin md image, with no asset map to size it from
      <img
        src={src}
        alt={node.alt}
        title={node.title ?? undefined}
        loading="lazy"
      />
    );
  }

  /** A citation (§8): the author's words, a no-break space and the source's `[n]`, in one link. */
  citation(
    node: Extract<Inline, { type: "link" }>,
    cite: { sourceId: string; n: number; citeId: string },
    key: number,
  ): ReactNode {
    const only = node.children;
    // The words were only a number (`1` or `[1]`): the link shows `[n]` alone.
    const bare =
      only.length === 1 &&
      only[0].type === "text" &&
      /^\s*\[?\s*\d+\s*\]?\s*$/.test(only[0].text);
    return (
      <a
        key={key}
        className="fg-cite"
        id={cite.citeId}
        href={`#${cite.sourceId}`}
        title={node.title ?? undefined}
        data-link="anchor"
      >
        {bare ? null : this.inline(only)}
        <span className="fg-cite__n">
          {bare ? "" : "\u00a0"}[{cite.n}]
        </span>
      </a>
    );
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
          <span className="kb-ch-link__ext">{CHAPTER.newTab}</span>
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
        return this.paragraph(block);
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

  /**
   * §3: an image never sits among words. A native paragraph that holds one is split: the text
   * before it is a paragraph, the image is its own block (`.fg-plain`), the text after it is a
   * new paragraph; a paragraph that is only the image becomes the image. (`md` keeps its inline
   * images: it has no asset map to size a box from.)
   */
  paragraph(block: Extract<Block, { type: "paragraph" }>): ReactNode {
    if (
      this.links.format === "md" ||
      !block.content.some((n) => n.type === "image")
    )
      return <p>{this.inline(block.content)}</p>;
    const parts: ReactNode[] = [];
    let run: Inline[] = [];
    const flush = () => {
      const text = trimRun(run);
      run = [];
      if (text.length)
        parts.push(<p key={parts.length}>{this.inline(text)}</p>);
    };
    for (const node of block.content) {
      if (node.type === "image") {
        flush();
        parts.push(
          <Fragment key={parts.length}>{this.plainImage(node)}</Fragment>,
        );
      } else run.push(node);
    }
    flush();
    return <>{parts}</>;
  }

  plainImage(node: Extract<Inline, { type: "image" }>): ReactNode {
    const name = this.assetName(node.src);
    let id: string | undefined;
    if (name !== null) {
      const seen = (this.imageIds.get(name) ?? 0) + 1;
      this.imageIds.set(name, seen);
      id = seen === 1 ? `img-${name}` : `img-${name}-${seen}`;
    }
    return (
      <div className="fg-plain" id={id} data-block={id}>
        {this.imageBox(resolveAsset(name, this.links), node.alt, node.title)}
      </div>
    );
  }

  callout(block: Extract<Block, { type: "callout" }>): ReactNode {
    // P29: an unknown type renders as NOTE (ingest refuses it first).
    const kind =
      block.kind && KNOWN_CALLOUTS.has(block.kind) ? block.kind : "NOTE";
    const label = CHAPTER.calloutLabel[kind];
    const title =
      block.title && block.title.length ? this.inline(block.title) : null;
    // §7 the head: the type word in mono, then the title, on one wrapping baseline row.
    // An untitled callout still shows its type word.
    const head = (Tag: "div" | "span") => (
      <Tag className="kb-ch-callout__head">
        <span className="kb-ch-callout__type">
          {CHAPTER.calloutWord[kind]}
        </span>
        {title ? <span className="kb-ch-callout__title">{title}</span> : null}
      </Tag>
    );
    if (block.collapsed) {
      return (
        <details
          className="kb-ch-callout"
          data-kind={kind.toLowerCase()}
          data-collapsed=""
        >
          <summary className="kb-ch-callout__sum">
            {head("span")}
            <span className="kb-ch-callout__toggle" aria-hidden="true">
              <span className="kb-ch-callout__toggle-closed">
                {CHAPTER.calloutShow}
              </span>
              <span className="kb-ch-callout__toggle-open">
                {CHAPTER.calloutHide}
              </span>
            </span>
          </summary>
          <div className="kb-ch-callout__body">{this.blocks(block.blocks)}</div>
        </details>
      );
    }
    return (
      <aside
        className="kb-ch-callout"
        data-kind={kind.toLowerCase()}
        aria-label={label}
      >
        {head("div")}
        <div className="kb-ch-callout__body">{this.blocks(block.blocks)}</div>
      </aside>
    );
  }

  table(block: Extract<Block, { type: "table" }>): ReactNode {
    const cols = block.head.length;
    const rows = block.rows.length;
    // §9: 8 columns or more is wide; more than 20 rows is long.
    const wide = cols >= 8;
    const long = rows > 20;
    return (
      <TableBox
        wide={wide}
        long={long}
        ariaLabel={
          long
            ? CHAPTER.tableBox.ariaLong(cols, rows)
            : CHAPTER.tableBox.ariaSideways(cols)
        }
        hint={
          long
            ? CHAPTER.tableBox.hintLong(rows, cols)
            : CHAPTER.tableBox.hintSideways(cols)
        }
      >
        <table>
          <thead>
            <tr>
              {block.head.map((cell, i) => (
                <th
                  key={i}
                  scope="col"
                  data-align={block.align[i] ?? undefined}
                >
                  {this.inline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          {rows ? (
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
      </TableBox>
    );
  }

  code(block: Extract<Block, { type: "code" }>): ReactNode {
    const lines = highlight(block.text, block.lang);
    // One block per source line: a wrapped line hangs 2ch under its first (§8), and an
    // ASCII drawing keeps each line whole.
    const plain: { text: string; className?: string }[][] = block.text
      .split("\n")
      .map((t) => [{ text: t }]);
    const body = (lines ?? plain).map(
      (line, i) => (
        <span key={i} className="kb-ch-code__ln">
          {line.map((tok, j) =>
            tok.className ? (
              <span key={j} className={tok.className}>
                {tok.text}
              </span>
            ) : (
              <Fragment key={j}>{tok.text}</Fragment>
            ),
          )}
        </span>
      ),
    );
    const id = block.id ?? undefined;
    const lang = block.lang ?? undefined;
    // §8 the title bar, when a title is given: the title and the language.
    const bar = block.title ? (
      <figcaption className="kb-ch-code__bar">
        <span className="kb-ch-code__title">{block.title}</span>
        {block.lang ? (
          <span className="kb-ch-code__lang">{block.lang}</span>
        ) : null}
      </figcaption>
    ) : null;
    // §8 ASCII drawings: a `text` fence is drawn as art wherever it appears.
    if (block.lang?.toLowerCase() === "text") {
      return (
        <ArtBox
          id={id}
          lang={lang}
          bar={bar}
          ariaLabel={CHAPTER.drawing.aria}
          hint={CHAPTER.drawing.hint}
        >
          {body}
        </ArtBox>
      );
    }
    return (
      <figure
        className="kb-ch-code"
        id={id}
        data-block={id}
        data-lang={lang}
      >
        {bar}
        <div className="kb-ch-code__wrap">
          <pre className="kb-ch-code__pre">
            <code>{body}</code>
          </pre>
        </div>
      </figure>
    );
  }

  // --- typed blocks ----------------------------------------------------------------

  typed(block: TypedBlock): ReactNode {
    const id = block.id ?? undefined;
    switch (block.type) {
      case "figure":
        return this.figure(block, id);
      case "figures":
        return this.figures(block, id);
      case "diagram":
        if (this.isDrawn(block))
          return this.drawn(block, id, "figure", inl(block.caption));
        return (
          <figure
            className="kb-ch-diagram"
            id={id}
            data-block={id}
            data-kind={str(block.kind) ?? undefined}
            aria-label={str(block.title) ?? undefined}
          >
            {this.diagramBody(block)}
            {this.caption(inl(block.caption))}
          </figure>
        );
      case "svg":
        return this.svgBlock(block, id);
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

  /** §2 the figure's caption, credit and (for an animated asset) the still-frame line. */
  figcap(
    caption: Inline[] | null,
    credit: Inline[] | null,
    still: boolean,
  ): ReactNode {
    const hasCredit = !!credit && credit.length > 0;
    if (!(caption && caption.length) && !hasCredit && !still) return null;
    return (
      <figcaption className="fg-figcap">
        {caption && caption.length ? (
          <p className="fg-cap">{this.inline(caption)}</p>
        ) : null}
        {hasCredit ? (
          <p className="fg-credit">
            <span className="fg-credit__label">{CHAPTER.figure.credit}</span>
            <span className="fg-credit__text">{this.inline(credit)}</span>
          </p>
        ) : null}
        {still ? <p className="fg-still">{CHAPTER.figure.still}</p> : null}
      </figcaption>
    );
  }

  /** §2 the figure (`figure` block): an image, its caption and its credit; `column` or `wide`. */
  figure(block: TypedBlock, id: string | undefined): ReactNode {
    const info = resolveAsset(str(block.src), this.links);
    const wide = str(block.width) === "wide";
    const media = this.imageBox(info, str(block.alt) ?? "");
    const caption = this.figcap(
      inl(block.caption),
      inl(block.credit),
      !!info && info.animated && info.stillUrl !== null,
    );
    // A `wide` figure is a scroll box when it overflows (measured in the browser); a column
    // figure never is.
    if (wide)
      return (
        <ScrollFigure
          id={id}
          kind="image"
          wide
          ariaLabel={CHAPTER.figure.aria}
          hint={CHAPTER.figure.hint}
          caption={caption}
        >
          {media}
        </ScrollFigure>
      );
    return (
      <figure className="fg-fig" id={id} data-block={id}>
        <div className="fg-box">
          <div className="fg-box__scroll">{media}</div>
        </div>
        {caption}
      </figure>
    );
  }

  /** §4 the figure row (`figures` block): 2-3 items under the row's caption, between two hairlines. */
  figures(block: TypedBlock, id: string | undefined): ReactNode {
    const items = recs(block.items);
    const cards = items.length > 0 && items.every((i) => i.kind === "card");
    const caption = inl(block.caption);
    return (
      <figure
        className={`fg-row fg-row--${items.length}${cards ? " fg-row--cards" : ""}`}
        id={id}
        data-block={id}
      >
        {caption && caption.length ? (
          <figcaption className="fg-row__cap">{this.inline(caption)}</figcaption>
        ) : null}
        <div className="fg-row__items">
          <div className="fg-row__grid">
            {items.map((item, i) => (
              <Fragment key={i}>
                {this.figuresItem(item, `${id ?? "figures"}-${i + 1}`)}
              </Fragment>
            ))}
          </div>
        </div>
      </figure>
    );
  }

  /** An item's own caption: under the item, in secondary. */
  itemCap(nodes: Inline[] | null): ReactNode {
    if (!nodes || !nodes.length) return null;
    return (
      <figcaption className="fg-figcap">
        <p className="fg-cap">{this.inline(nodes)}</p>
      </figcaption>
    );
  }

  figuresItem(item: Rec, scope: string): ReactNode {
    switch (item.kind) {
      case "image":
        return (
          <figure className="fg-item" data-kind="image">
            {this.imageBox(resolveAsset(str(item.src), this.links), str(item.alt) ?? "")}
            {this.itemCap(inl(item.caption))}
          </figure>
        );
      case "diagram":
        if (isRec(item.diagram) && this.isDrawn(item.diagram))
          return (
            <figure className="fg-item" data-kind="diagram">
              {this.drawn(item.diagram, undefined, "div", null)}
              {this.itemCap(inl(item.caption))}
            </figure>
          );
        return isRec(item.diagram) ? (
          <figure className="fg-item" data-kind="diagram">
            <div
              className="kb-ch-diagram"
              data-kind={str(item.diagram.kind) ?? undefined}
            >
              {this.diagramBody(item.diagram)}
            </div>
            {this.itemCap(inl(item.caption))}
          </figure>
        ) : null;
      case "svg":
        return (
          <figure className="fg-item fg-svg fg-svg--item" data-kind="svg">
            {this.svg(item.svg, str(item.label) ?? "", scope, true)}
            {this.itemCap(inl(item.caption))}
          </figure>
        );
      case "card":
        return this.card(item);
      default:
        return null;
    }
  }

  /** §5 the row card: a title and a Markdown body on the tone's soft ground. A tone is never the only signal. */
  card(item: Rec): ReactNode {
    return (
      <div className={`fg-card fg-tone-${tone(item.tone)}`} data-kind="card">
        <p className="fg-card__title">{this.text(str(item.title) ?? "")}</p>
        {arr(item.body).map((para, i) => (
          <p key={i} className="fg-card__p">
            {this.inline(inl(para))}
          </p>
        ))}
      </div>
    );
  }

  /** The kinds S17 draws (flow and state); the others keep S12's structured text until S18 draws them. */
  isDrawn(d: Rec): boolean {
    const kind = str(d.kind);
    return kind === "flow" || kind === "state";
  }

  /** How many drawn diagrams this render has made (their title ids: `dg-title-<n>`). */
  private dgCount = 0;

  /**
   * S17: a flow or state diagram, drawn on the server into safe React SVG (`03-diagrams` round 01): the frame in the
   * slot, the drawing laid out from its data (`diagram-layout.ts`), the visually hidden text alternative and the
   * caption. `tag` is `div` inside a figure-row item, whose own figcaption carries the caption.
   */
  drawn(
    d: Rec,
    id: string | undefined,
    tag: "figure" | "div",
    caption: Inline[] | null,
  ): ReactNode {
    const kind = str(d.kind) === "state" ? "state" : "flow";
    const layout = layoutFor(d, kind);
    const lines = graphAlt(layout, d);
    this.dgCount += 1;
    return (
      <DiagramFigure
        id={id}
        kind={kind}
        tag={tag}
        titleId={`dg-title-${this.dgCount}`}
        title={this.text(str(d.title) ?? "")}
        drawing={<Drawing layout={layout} />}
        alt={
          lines.length ? (
            <div className="dg__sr">
              <p>{CHAPTER.diagram.alt.lead}</p>
              <ul>
                {lines.map((line, i) => (
                  <li key={i}>{this.text(line)}</li>
                ))}
              </ul>
            </div>
          ) : null
        }
        caption={
          caption && caption.length ? (
            <figcaption className="dg__cap">{this.inline(caption)}</figcaption>
          ) : null
        }
        ariaLabel={CHAPTER.diagram.aria}
        hint={CHAPTER.diagram.hint}
      />
    );
  }

  /**
   * S12's diagram body: the diagram's content as accessible structured text
   * (title, then nodes and connections, steps, layers, lanes or a data table).
   * S17/S18 replace it with the drawn diagram from the signed `03-diagrams`.
   */
  diagramBody(d: Rec): ReactNode {
    const kind = str(d.kind);
    const dTitle = str(d.title);
    const title = (
      <p className="kb-ch-diagram__title">
        {dTitle === null ? null : this.text(dTitle)}
      </p>
    );
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
        data-type={str(d.chart) ?? undefined}
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

  /** §6 the `svg` block: the drawing, scrolling in its box when narrower than its smallest label allows. */
  svgBlock(block: TypedBlock, id: string | undefined): ReactNode {
    const caption = inl(block.caption);
    return (
      <ScrollFigure
        id={id}
        kind="svg"
        wide={false}
        ariaLabel={CHAPTER.drawing.aria}
        hint={CHAPTER.drawing.hint}
        caption={this.itemCap(caption)}
      >
        {this.svg(block.svg, str(block.label) ?? "", id ?? "svg", false)}
      </ScrollFigure>
    );
  }

  /**
   * Rebuild a validated svg tree as React elements, through the allowlist again. `--fg-vbw` is
   * the viewBox's width; `--fg-minw` (a block, not a row item) is the width below which the
   * drawing's smallest label would be under 11 px (16 when the source sets no font-size).
   */
  svg(tree: unknown, label: string, scope: string, item: boolean): ReactNode {
    if (!isRec(tree) || tree.name !== "svg") return null;
    const root = tree as unknown as SvgElement;
    const props = svgAttrsToProps("svg", root.attrs ?? {}, scope);
    const vbw = viewBoxWidth(root.attrs?.viewBox);
    const style: Record<string, string | number> = {};
    if (vbw !== null) {
      style["--fg-vbw"] = vbw;
      if (!item) style["--fg-minw"] = `${Math.ceil((vbw * 11) / smallestFont(root))}px`;
    }
    return createElement(
      "svg",
      {
        ...props,
        xmlns: "http://www.w3.org/2000/svg",
        role: "img",
        "aria-label": label,
        className: ["fg-svg__svg", props.className].filter(Boolean).join(" "),
        style,
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

  /** §7 the sources list; each item draws its way back from the citations (`cites.ts`). */
  sources(block: TypedBlock, id: string | undefined): ReactNode {
    return (
      <ol
        className="fg-src"
        id={id}
        data-block={id}
        aria-label={CHAPTER.sources.label}
      >
        {recs(block.items).map((item, i) => {
          const sid = str(item.id);
          const url = str(item.url);
          const target = url ? resolveLink(url, this.links) : null;
          const meta = [
            str(item.publisher),
            str(item.date),
            item.accessed ? CHAPTER.sources.accessed(String(item.accessed)) : null,
          ].filter((m): m is string => !!m);
          const note = str(item.note);
          return (
            <li key={i} className="fg-src__item" id={sid ?? undefined}>
              <span className="fg-src__n">[{i + 1}]</span>
              <div className="fg-src__body">
                <p className="fg-src__title">{this.text(str(item.title) ?? "")}</p>
                {meta.length ? (
                  <p className="fg-src__meta">
                    {meta.map((m, j) => (
                      <Fragment key={j}>
                        {j > 0 ? <span aria-hidden="true"> · </span> : null}
                        {this.text(m)}
                      </Fragment>
                    ))}
                  </p>
                ) : null}
                {url ? (
                  <p className="fg-src__url">
                    {target?.kind === "external" ? (
                      <a
                        className="fg-src__link"
                        href={target.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-link="external"
                      >
                        {url}
                        <span className="kb-ch-link__ext">{CHAPTER.newTab}</span>
                      </a>
                    ) : (
                      url
                    )}
                  </p>
                ) : null}
                {note ? <p className="fg-src__note">{this.text(note)}</p> : null}
                {sid ? this.sourceBack(sid) : null}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  /** §7 the way back: once cited, one link; cited twice or more, a lead and one lettered link each; never cited, none. */
  sourceBack(sid: string): ReactNode {
    const cites = this.plan.sources.get(sid)?.cites ?? [];
    if (!cites.length) return null;
    if (cites.length === 1) {
      const c = cites[0];
      return (
        <p className="fg-src__back">
          <a
            className="fg-back"
            href={`#${c.citeId}`}
            aria-label={CHAPTER.sources.backAria(c.section)}
          >
            <span className="fg-back__chev" aria-hidden="true">
              ‹
            </span>
            <span>{CHAPTER.sources.back}</span>
          </a>
        </p>
      );
    }
    return (
      <p className="fg-src__back">
        <span>{CHAPTER.sources.backLead}</span>
        {cites.map((c, i) => {
          const letter = letters(i);
          return (
            <a
              key={c.citeId}
              className="fg-back fg-back--letter"
              href={`#${c.citeId}`}
              aria-label={CHAPTER.sources.backLetterAria(
                letter,
                cites.length,
                c.section,
              )}
            >
              <span className="fg-back__chev" aria-hidden="true">
                ‹
              </span>{" "}
              {letter}
            </a>
          );
        })}
      </p>
    );
  }
}

/** The viewBox's width, or null when it is not four numbers (ingest checked it; defence in depth). */
function viewBoxWidth(viewBox: string | undefined): number | null {
  const parts = (viewBox ?? "").trim().split(/[\s,]+/).map(Number);
  return parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0
    ? parts[2]
    : null;
}

/** The smallest `font-size` attribute in the drawing; 16 when it sets none. */
function smallestFont(root: SvgElement): number {
  let smallest = Infinity;
  const walk = (node: SvgElement) => {
    const size = parseFloat(node.attrs?.["font-size"] ?? "");
    if (Number.isFinite(size) && size > 0) smallest = Math.min(smallest, size);
    for (const child of node.children ?? [])
      if (!("text" in child)) walk(child);
  };
  walk(root);
  return Number.isFinite(smallest) ? smallest : 16;
}

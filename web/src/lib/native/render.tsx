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
import { PrintAddr } from "@/components/reader/print-sheet";
import {
  PrintAnswers,
  PrintQuiz,
  type PrintItem,
  type PrintKey,
} from "@/components/reader/print-quiz";
import { ClozeBlank, QuizBlock, type QuizItemProps } from "@/components/reader/quiz";
import { ArtBox, TableBox } from "@/components/reader/scroll-box";
import { CHAPTER } from "@/content";
import { hangulRuns, isKorean } from "@/lib/reader/hangul";
import { printAddress, widestLine } from "@/lib/reader/print";
import { specOf } from "@/lib/reader/quiz";
import type { QuizSaved } from "@/lib/reader/quiz-saved";
import { signInToSaveHref, type ReaderTarget } from "@/lib/reader-href";

import { letters, planCitations, type CitationPlan } from "./cites";
import { diagramParts, kindOf } from "./diagram-kinds";
import { highlight } from "./highlight";
import {
  resolveAsset,
  resolveImage,
  resolveLink,
  type AssetInfo,
  type LinkContext,
} from "./links";
import { plainText, type ChapterFormat } from "./parse";
import { codePoints, containers, inlineText } from "./project";
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

/**
 * What the quiz island needs from the reader (P30.S19): who is reading, where an attempt
 * is saved, the saved answers as they show on return, and the place Sign in to save
 * returns to. Absent (the older `/documents` pages), a quiz still answers, grades and
 * retries; it saves nothing and offers no sign-in.
 */
export interface QuizViewContext {
  member: boolean;
  write: { org: string; project: string; doc: string } | null;
  /** The version on screen. */
  version: number;
  place: "chapter" | "document";
  /** The chapter's language, as the reader carries it. */
  lang: string;
  signIn: {
    target: ReaderTarget;
    /** The `?lang=` of the return address (null = the default variant). */
    lang: string | null;
    /** The `?v=` of the return address (null = the newest). */
    version: number | null;
  } | null;
  saved: QuizSaved;
}

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
  quiz,
}: {
  checked: CheckedChapter;
  lang?: string;
  links: LinkContext;
  /** The reader's context for quiz blocks (see `QuizViewContext`). */
  quiz?: QuizViewContext;
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
    quiz,
  );
  // P30.S20: each passage container's place in its section's text (`project.ts`), so
  // the reader can capture and paint annotation offsets in the shared projection.
  const stamps = checked.format === "native" ? anchorStamps(checked.blocks) : null;
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
          <Fragment key={i}>{r.stamped(stamps?.[i] ?? null, entry.block)}</Fragment>
        ) : null,
      )}
      {/* P30.S26: the quizzes' answer key, printed after the whole body (print only). */}
      <PrintAnswers keys={r.printKeys} />
    </div>
  );
}

// --- typed-block field readers (fields are `unknown` until checked) ------------

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
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

/** One passage container's place in its section's text: what `data-sec`/`data-base` carry. */
interface Stamp {
  sec: string;
  text: string;
  base: number;
}

/**
 * P30.S20 — the anchor basis, per top-level block: its passage containers in the order
 * `project.ts` lists them, each with its section and its start offset (code points) in the
 * section's text. The renderer takes them in the same order as it emits the containers and
 * checks each text, so a container is stamped only where the page shows exactly the
 * projection's text (a mismatch stops the stamps for the rest of that block: such text
 * takes no highlight rather than a wrong one). Refused blocks still advance the offsets.
 */
function anchorStamps(
  entries: readonly { block: Block | null; refused: boolean }[],
): (Stamp[] | null)[] {
  let sec: string | null = null;
  let cursor = 0;
  let first = true;
  return entries.map((entry) => {
    const block = entry.block;
    if (!block) return null;
    if (block.id) {
      sec = block.id;
      cursor = 0;
      first = true;
    }
    if (sec === null) return null;
    const out: Stamp[] = [];
    for (const text of containers(block)) {
      const base = first ? cursor : cursor + 1;
      out.push({ sec, text, base });
      cursor = base + codePoints(text).length;
      first = false;
    }
    return out;
  });
}

/** A paragraph run's leading blanks that `trimRun` drops, in code points of the projection. */
function leadTrim(run: Inline[]): number {
  let n = 0;
  for (const node of run) {
    if (node.type === "break") n += 1;
    else if (node.type === "text" && node.text.trim() === "")
      n += codePoints(node.text).length;
    else {
      if (node.type === "text")
        n += codePoints(node.text).length - codePoints(node.text.trimStart()).length;
      break;
    }
  }
  return n;
}

class Renderer {
  /** The chapter's citations and each source's way back (`cites.ts`); empty for `md`. */
  private readonly plan: CitationPlan;
  /** How many plain images of each asset the chapter has had (`img-<name>`, `-2`, `-3` …). */
  private readonly imageIds = new Map<string, number>();
  /** Set while a cloze sentence renders: its blanks become the island's inputs, counted in order. */
  private cloze: { n: number; print?: boolean } | null = null;
  /** P30.S26: each quiz's answer key, in the order the quizzes are rendered (print only). */
  readonly printKeys: PrintKey[] = [];
  /** The current top-level block's anchor stamps (P30.S20), taken in order; null = none. */
  private stamps: Stamp[] | null = null;
  private stampAt = 0;

  constructor(
    private readonly links: LinkContext,
    /** Wrap each Hangul run in `lang="ko"` (the text's language is not Korean). */
    private readonly wrap: boolean = false,
    blocks: readonly Block[] = [],
    private readonly quizCtx?: QuizViewContext,
  ) {
    this.plan = planCitations(links.format === "md" ? [] : blocks);
  }

  /** Render one top-level block with its anchor stamps (P30.S20). */
  stamped(stamps: Stamp[] | null, block: Block): ReactNode {
    this.stamps = stamps;
    this.stampAt = 0;
    try {
      return this.block(block);
    } finally {
      this.stamps = null;
    }
  }

  /**
   * The next passage container's stamp, when its text is the one the projection lists
   * next; otherwise none from here to the end of the block (never a wrong offset).
   */
  private take(text: string): Stamp | null {
    const q = this.stamps;
    if (!q) return null;
    const next = q[this.stampAt];
    if (!next || next.text !== text) {
      this.stamps = null;
      return null;
    }
    this.stampAt += 1;
    return next;
  }

  /** The `data-*` a stamped passage container carries (`kind` p | code). */
  private static mark(
    stamp: Stamp | null,
    offset = 0,
    kind: "p" | "code" = "p",
  ): Record<string, string> {
    return stamp
      ? {
          "data-tx": kind,
          "data-sec": stamp.sec,
          "data-base": String(stamp.base + offset),
        }
      : {};
  }

  /** Text with its Hangul runs wrapped (§6a). Never used for code or attributes. */
  text(value: string): ReactNode {
    return hangulRuns(value, this.wrap);
  }

  // --- inline ------------------------------------------------------------------

  inline(nodes: readonly Inline[] | null | undefined): ReactNode {
    if (!nodes) return null;
    if (this.cloze) return this.clozeRun(nodes);
    return nodes.map((node, i) => this.inlineNode(node, i));
  }

  /**
   * A cloze sentence's inline run (`04-quiz` §6): each blank becomes the island's input,
   * numbered in reading order. What touches a blank's end with no space between (a comma,
   * a full stop, a Korean particle such as 을 or 에) rides in the blank's no-wrap group, so a
   * line never starts with "," or "에". Only plain characters are taken: up to the first
   * space or Markdown mark, and only from a text node that directly follows.
   */
  private clozeRun(nodes: readonly Inline[]): ReactNode {
    let skip = 0;
    return nodes.map((node, i) => {
      if (node.type === "blank" && this.cloze) {
        this.cloze.n += 1;
        const next = nodes[i + 1];
        const m =
          next?.type === "text" ? /^[^\s`*_\[\]~{}<>]+/.exec(next.text) : null;
        skip = m ? m[0].length : 0;
        if (this.cloze.print) {
          // The paper's blank: a numbered rule, its tail kept with it.
          return (
            <span key={i} className="pp-bw">
              <span className="pp-blank">
                <span className="pp-blank__n">({this.cloze.n})</span>
              </span>
              {m ? this.text(m[0]) : null}
            </span>
          );
        }
        return (
          <ClozeBlank
            key={i}
            n={this.cloze.n}
            tail={m ? this.text(m[0]) : undefined}
          />
        );
      }
      if (node.type === "text" && skip > 0) {
        const rest = node.text.slice(skip);
        skip = 0;
        return rest ? <Fragment key={i}>{this.text(rest)}</Fragment> : null;
      }
      skip = 0;
      return this.inlineNode(node, i);
    });
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
            data-an-skip=""
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
          inlineText(node.children),
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
        {/* P30.S20: "[n]" is not the document's text; a bare citation stands for the author's own words. */}
        <span
          className="fg-cite__n"
          {...(bare
            ? { "data-an-len": String(codePoints(inlineText(only)).length) }
            : { "data-an-skip": "" })}
        >
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
    plain?: string,
  ): ReactNode {
    const target = resolveLink(href, this.links);
    if (target.kind === "missing") {
      // Never a dead link and never a leak: no href, no title, no target text.
      return (
        <span key={key} className="kb-link-missing" data-missing-link="">
          {children}
          <span className="sr-only" data-an-skip="">
            {" "}
            {CHAPTER.missingLink}
          </span>
        </span>
      );
    }
    if (target.kind === "external") {
      return (
        <Fragment key={key}>
          <a
            href={target.href}
            title={title ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            data-link="external"
          >
            {children}
            <span className="kb-ch-link__ext" data-an-skip="">
              {CHAPTER.newTab}
            </span>
          </a>
          {this.printHref(target.href, plain)}
        </Fragment>
      );
    }
    return (
      <Fragment key={key}>
        <a href={target.href} title={title ?? undefined} data-link={target.kind}>
          {children}
        </a>
        {target.kind === "internal" ? this.printHref(target.href, plain) : null}
      </Fragment>
    );
  }

  /**
   * P30.S26: what a link prints after its text, on paper only: its address in full, with a
   * break opportunity between segments. A same-app path gets the site's host; an outside URL
   * is kept as it is; an in-document `#` link and a bare link (its text is its address)
   * print nothing more. Not the author's text, so the anchor layer skips it.
   */
  private printHref(href: string, plain: string | undefined): ReactNode {
    if (!href || href.startsWith("#")) return null;
    const address = printAddress(href);
    const text = (plain ?? "").trim();
    const bare = (a: string) => a.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    if (text && (bare(text) === bare(href) || bare(text) === bare(address)))
      return null;
    return (
      <span className="pp-href pp-only" data-an-skip="">
        {" ("}
        <PrintAddr address={address} />
        {")"}
      </span>
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
    const stamp = this.take(inlineText(block.content));
    if (
      this.links.format === "md" ||
      !block.content.some((n) => n.type === "image")
    )
      return <p {...Renderer.mark(stamp)}>{this.inline(block.content)}</p>;
    // Each part keeps its place in the paragraph's projected text: the images and the
    // blanks trimmed beside them are not text the page shows.
    const parts: ReactNode[] = [];
    let run: Inline[] = [];
    let at = 0;
    let runAt = 0;
    const flush = () => {
      const text = trimRun(run);
      const offset = runAt + leadTrim(run);
      run = [];
      if (text.length)
        parts.push(
          <p key={parts.length} {...Renderer.mark(stamp, offset)}>
            {this.inline(text)}
          </p>,
        );
    };
    for (const node of block.content) {
      if (node.type === "image") {
        flush();
        parts.push(
          <Fragment key={parts.length}>{this.plainImage(node)}</Fragment>,
        );
        runAt = at;
      } else {
        if (run.length === 0) runAt = at;
        run.push(node);
        at += codePoints(inlineText([node])).length;
      }
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
    const titleStamp =
      block.title && block.title.length
        ? this.take(inlineText(block.title))
        : null;
    const title =
      block.title && block.title.length ? this.inline(block.title) : null;
    // §7 the head: the type word in mono, then the title, on one wrapping baseline row.
    // An untitled callout still shows its type word.
    const head = (Tag: "div" | "span") => (
      <Tag className="kb-ch-callout__head">
        <span className="kb-ch-callout__type">
          {CHAPTER.calloutWord[kind]}
        </span>
        {title ? (
          <span
            className="kb-ch-callout__title"
            {...Renderer.mark(titleStamp)}
          >
            {title}
          </span>
        ) : null}
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
                  {...Renderer.mark(this.take(inlineText(cell)))}
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
                    <td
                      key={i}
                      data-align={block.align[i] ?? undefined}
                      {...Renderer.mark(this.take(inlineText(cell)))}
                    >
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
    const stamp = this.take(block.text);
    const lines = highlight(block.text, block.lang);
    // P30.S20: each line carries its offset in the section's text ("code lines carry their
    // offset"), only where its tokens spell exactly the source line.
    const source = block.text.split("\n");
    const lineAt: number[] = [];
    let pos = 0;
    for (const line of source) {
      lineAt.push(pos);
      pos += codePoints(line).length + 1;
    }
    // One block per source line: a wrapped line hangs 2ch under its first (§8), and an
    // ASCII drawing keeps each line whole.
    const plain: { text: string; className?: string }[][] = block.text
      .split("\n")
      .map((t) => [{ text: t }]);
    const body = (lines ?? plain).map(
      (line, i) => (
        <span
          key={i}
          className="kb-ch-code__ln"
          {...(source[i] !== undefined &&
          line.map((tok) => tok.text).join("") === source[i]
            ? Renderer.mark(stamp, lineAt[i], "code")
            : {})}
        >
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
          cols={widestLine(block.text)}
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
        return this.drawn(block, id, "figure", inl(block.caption));
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
        return isRec(item.diagram) ? (
          <figure className="fg-item" data-kind="diagram">
            {this.drawn(item.diagram, undefined, "div", null)}
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

  /** How many drawn diagrams this render has made (their title ids: `dg-title-<n>`). */
  private dgCount = 0;

  /**
   * A diagram, drawn on the server into safe React elements (`03-diagrams` round 01): the frame in the slot, the
   * drawing (an SVG for flow, state and sequence, HTML in `em` for stack, timeline and chart), the visually hidden
   * text alternative and the caption. `tag` is `div` inside a figure-row item, whose own figcaption carries the
   * caption.
   */
  drawn(
    d: Rec,
    id: string | undefined,
    tag: "figure" | "div",
    caption: Inline[] | null,
  ): ReactNode {
    const kind = kindOf(d);
    const { drawing, alt } = diagramParts(
      d,
      kind,
      (s) => this.text(s),
      CHAPTER.diagram.alt.lead,
    );
    this.dgCount += 1;
    return (
      <DiagramFigure
        id={id}
        kind={kind}
        tag={tag}
        titleId={`dg-title-${this.dgCount}`}
        title={this.text(str(d.title) ?? "")}
        drawing={drawing}
        alt={alt}
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

  /**
   * The quiz (`04-quiz` round 01): the chapter's one client island. The block's items are
   * handed over as data (`spec`: grading is client-side, so the key ships in the page) and
   * as rendered inline Markdown, so a link in a prompt, an option or an explanation is the
   * reader's link. The island paints the state the view model gives (saved answers
   * included) and hydrates to answer, grade, retry and save.
   */
  quiz(block: TypedBlock, id: string | undefined): ReactNode {
    const bid = id ?? "quiz";
    const title = str(block.title);
    const q = this.quizCtx;
    const items: QuizItemProps[] = [];
    // P30.S26: the same items for paper (the quiz as printed, and its answer key).
    const paper: PrintItem[] = [];
    recs(block.items).forEach((item, i) => {
      const spec = specOf(item, i + 1);
      if (!spec) return;
      const domId = `${bid}--${spec.id}`;
      const explain = inl(item.explain);
      const props: QuizItemProps = {
        spec,
        domId,
        prompt: null,
        explain: explain && explain.length ? this.inline(explain) : undefined,
        signInHref: q?.signIn
          ? signInToSaveHref(q.signIn.target, {
              lang: q.signIn.lang,
              version: q.signIn.version,
              section: domId,
            })
          : null,
        saved: q?.saved[domId],
      };
      if (spec.type === "choice") {
        props.prompt = this.inline(inl(item.prompt));
        props.options = recs(item.options).map((o) => this.inline(inl(o.text)));
      } else if (spec.type === "recall") {
        props.prompt = this.inline(inl(item.prompt));
        props.answer = this.inline(inl(item.answer));
      } else {
        this.cloze = { n: 0 };
        try {
          props.prompt = this.inline(inl(item.text));
        } finally {
          this.cloze = null;
        }
      }
      items.push(props);
      const sheet: PrintItem = {
        spec,
        prompt: props.prompt,
        options: props.options,
        answer: props.answer,
        explain: props.explain,
      };
      if (spec.type === "cloze") {
        // The sentence again, its blanks as numbered rules instead of the island's inputs.
        this.cloze = { n: 0, print: true };
        try {
          sheet.prompt = this.inline(inl(item.text));
        } finally {
          this.cloze = null;
        }
      }
      paper.push(sheet);
    });
    const noun = q?.place ?? "chapter";
    if (paper.length) this.printKeys.push({ title, items: paper });
    return (
      <>
        <QuizBlock
          id={bid}
          name={title ? `${CHAPTER.quiz.label}: ${title}` : CHAPTER.quiz.label}
          title={title ? this.text(title) : undefined}
          items={items}
          member={q?.member ?? false}
          write={q?.write ?? null}
          version={q?.version ?? 0}
          place={noun}
          lang={q?.lang ?? "en"}
        />
        {paper.length ? (
          <PrintQuiz
            title={title ? this.text(title) : null}
            items={paper}
            noun={noun}
          />
        ) : null}
      </>
    );
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
                    <span className="pp-screen">
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
                    </span>
                    {/* P30.S26: on paper the address, broken between its segments. */}
                    <span className="pp-src__addr pp-only" data-an-skip="">
                      <PrintAddr address={url} />
                    </span>
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

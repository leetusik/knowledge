"use server";

import { z } from "zod";

import { getDocument, resolveDocument } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import {
  docStem,
  getReviewQueue,
  patchReaderProfile,
  patchReviewCard,
  postCardReview,
} from "@/lib/knowledge/reader";
import type { KbDocument } from "@/lib/knowledge/types";
import { loadContinue } from "@/lib/library/continue";
import { validateChapter } from "@/lib/native";
import {
  displayQuote,
  displayText,
  quoteBasis,
  type QuoteBasis,
} from "@/lib/native/display-text";
import { linearTex } from "@/lib/native/mathml";
import { plainText } from "@/lib/native/parse";
import type { Tree } from "@/lib/native/tree";
import { sectionLabel } from "@/lib/reader/notes-load";
import { getSession } from "@/lib/session";

import type {
  ActionResult,
  CardWhere,
  Profile,
  RateReply,
  ReviewCard,
  ReviewQueue,
  StatusReply,
} from "./types";

/**
 * P30.S24 — the review surface's calls, as SERVER ACTIONS (the pattern of `lib/reader/
 * actions.ts`): the knowledge token is unsealed from the httpOnly cookie here, the body is
 * strict, and nothing throws — a fault is `{ok: false, ref}`, with a short reference the
 * failed state shows ("ref · …") and the server log carries. A card the server no longer
 * knows (a 404, or a 409 for one suspended elsewhere) is `gone`: the page drops it.
 *
 * NOTE: this file may export ONLY async functions (a `"use server"` module registers every
 * export as an action); types are erased and fine.
 */

/** Page size of one queue read; the page asks again when it has rated its way to the end. */
const QUEUE_LIMIT = 50;

function reference(): string {
  return `rv-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

function failure(
  error: unknown,
  label: string,
): { ok: false; gone?: boolean; ref: string } {
  const ref = reference();
  const status = error instanceof ApiError ? error.status : undefined;
  console.error(`[review] ${label} failed (${status ?? "network"}) ref=${ref}`);
  return {
    ok: false,
    gone: status === 404 || status === 409 ? true : undefined,
    ref,
  };
}

/**
 * P39-hk.S8 (OQ9, built on its recommendation) — a quiz card shows a formula as its linear text
 * (`t = s × √n`, the inline formula's spoken form, R1 §3), made here on the server where the
 * queue is read, since the card draws on the client and the math engine is server-only. Every
 * inline `math` node of a card's front and back becomes that text; never dropped. (A formula the
 * engine refuses, which publish never lets through, stays as its TeX in code.)
 */
function linearMath(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(linearMath);
  if (typeof value !== "object" || value === null) return value;
  const node = value as Record<string, unknown>;
  if (node.type === "math" && typeof node.tex === "string") {
    const text = linearTex(node.tex);
    return text === null
      ? { type: "code", text: node.tex }
      : { type: "text", text };
  }
  return Object.fromEntries(
    Object.entries(node).map(([k, v]) => [k, linearMath(v)]),
  );
}

function linearCard<C extends ReviewCard | null>(card: C): C {
  if (!card || card.source !== "quiz") return card;
  return {
    ...card,
    front: linearMath(card.front),
    back: linearMath(card.back),
  } as C;
}

/**
 * P39-hk.F4 (OQ10) — a highlight card shows a formula in its quote as its linear text too. The
 * stored quote is a slice of the section's projection, where a formula is its bare TeX, so the
 * shown quote is rebuilt from the chapter's own tree and the anchor the card carries
 * (`front.anchor`: the section and its offsets, resolved by the server on the version in
 * `where`), never by searching the string. The chapter is read once per distinct document in
 * one queue read (`getDocument` by id, else `resolveDocument` by its slug, checked against the
 * card's document and version). Whatever cannot be mapped exactly (another version, an offset
 * inside a formula, text that is not the stored quote, any fault) keeps the card as it came.
 * The place name a snapshot stored before F4 (the label with TeX) is shown as today's label
 * when it is exactly that label. Display only: the API, the stored quote and the snapshot are
 * untouched.
 */
interface Chapter {
  tree: Tree;
  quotes: QuoteBasis;
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** The card's document, read the cheapest way the card allows; null when it is not that document's version. */
async function chapterOf(
  token: string,
  where: CardWhere,
): Promise<Chapter | null> {
  try {
    const byId = /^\/documents\/(\d+)(?:[?#]|$)/.exec(where.href);
    const slug = where.doc.replace(/^\d{4}-\d{2}-\d{2}-/, "");
    const doc: KbDocument = byId
      ? await getDocument(token, Number(byId[1]))
      : await resolveDocument(token, where.org, where.project, slug);
    if (
      doc.format !== "native" ||
      !doc.source ||
      doc.project !== where.project ||
      docStem(doc.project, doc.rel_path) !== where.doc ||
      doc.version !== where.version
    )
      return null;
    const checked = validateChapter(doc.source, "native");
    if (checked.refused) return null;
    return { tree: checked.tree, quotes: quoteBasis(checked.tree) };
  } catch {
    return null;
  }
}

function shownHighlight(
  card: Extract<ReviewCard, { source: "highlight" }>,
  chapter: Chapter,
): ReviewCard {
  const front = card.front as typeof card.front & { anchor?: unknown };
  const anchor = isRec(front.anchor) ? front.anchor : null;
  const sec = typeof anchor?.block_id === "string" ? anchor.block_id : null;
  const start = anchor?.start;
  const end = anchor?.end;
  const quote =
    front.quote &&
    sec &&
    typeof start === "number" &&
    typeof end === "number"
      ? displayQuote(chapter.quotes, sec, start, end, front.quote)
      : null;
  const at = card.where.block_id ?? sec;
  const stored = at ? sectionLabel(chapter.tree, at, plainText) : null;
  const today = at ? sectionLabel(chapter.tree, at, displayText) : null;
  const relabel = <T extends string | null | undefined>(title: T): T | string =>
    title && stored && today && title === stored && stored !== today
      ? today
      : title;
  const blockTitle = relabel(front.block_title);
  const whereTitle = relabel(card.where.block_title);
  if (
    quote === null &&
    blockTitle === front.block_title &&
    whereTitle === card.where.block_title
  )
    return card;
  return {
    ...card,
    front: { ...card.front, quote: quote ?? front.quote, block_title: blockTitle },
    where: { ...card.where, block_title: whereTitle },
  };
}

/** Every card as the page shows it: quiz math linearized (S8), highlight quotes mapped (F4). */
async function shownCards<C extends ReviewCard | null>(
  token: string,
  cards: readonly C[],
): Promise<C[]> {
  const reads = new Map<string, Promise<Chapter | null>>();
  const chapterFor = (w: CardWhere) => {
    const key = `${w.org}/${w.project}/${w.doc}@${w.version}`;
    let hit = reads.get(key);
    if (!hit) {
      hit = chapterOf(token, w);
      reads.set(key, hit);
    }
    return hit;
  };
  return Promise.all(
    cards.map(async (card) => {
      if (!card || card.source !== "highlight") return linearCard(card);
      const chapter = await chapterFor(card.where);
      return (chapter ? shownHighlight(card, chapter) : card) as C;
    }),
  );
}

export async function loadReviewQueue(): Promise<ActionResult<ReviewQueue>> {
  const token = await getSession();
  if (!token) return { ok: false, ref: reference() };
  try {
    const queue = await getReviewQueue(token, QUEUE_LIMIT);
    return {
      ok: true,
      data: { ...queue, cards: await shownCards(token, queue.cards) },
    };
  } catch (error) {
    return failure(error, "queue");
  }
}

const idPart = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9][a-z0-9-]{0,63}$/);

const rateSchema = z
  .object({
    cardId: z.string().uuid(),
    rating: z.enum(["again", "good"]),
    reviewId: z.string().uuid(),
    response: z
      .union([
        z.object({ selected: z.array(idPart).max(6) }).strict(),
        z.object({ blanks: z.array(z.string().max(1000)).max(5) }).strict(),
        z.object({ self_grade: z.enum(["got", "missed"]) }).strict(),
      ])
      .optional(),
  })
  .strict();

export type RateInput = z.input<typeof rateSchema>;

/** Rate one card. A repeated `reviewId` is a no-op on the server: Try again sends the same one. */
export async function rateReviewCard(
  input: RateInput,
): Promise<ActionResult<RateReply>> {
  const parsed = rateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, ref: reference() };
  const token = await getSession();
  if (!token) return { ok: false, ref: reference() };
  try {
    const { cardId, rating, reviewId, response } = parsed.data;
    const data = await postCardReview(token, cardId, {
      rating,
      review_id: reviewId,
      ...(response ? { response } : {}),
    });
    const [next] = await shownCards(token, [data.next]);
    return { ok: true, data: { ...data, next } };
  } catch (error) {
    return failure(error, "rating");
  }
}

const statusSchema = z
  .object({
    cardId: z.string().uuid(),
    status: z.enum(["active", "suspended"]),
  })
  .strict();

export type StatusInput = z.input<typeof statusSchema>;

/** Suspend a card, or undo that. */
export async function setReviewCardStatus(
  input: StatusInput,
): Promise<ActionResult<StatusReply>> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, ref: reference() };
  const token = await getSession();
  if (!token) return { ok: false, ref: reference() };
  try {
    return {
      ok: true,
      data: await patchReviewCard(
        token,
        parsed.data.cardId,
        parsed.data.status,
      ),
    };
  } catch (error) {
    return failure(error, "suspend");
  }
}

const settingsSchema = z
  .object({
    time_zone: z.string().min(1).max(64).optional(),
    max_reviews_per_day: z.number().int().min(1).max(999).optional(),
    new_highlights_per_day: z.number().int().min(0).max(999).optional(),
  })
  .strict();

export type SettingsInput = z.input<typeof settingsSchema>;

/** `PATCH /app/reader/profile`: the time zone and the two daily limits (the signed ranges). */
export async function saveReviewSettings(
  input: SettingsInput,
): Promise<ActionResult<Profile>> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, ref: reference() };
  const token = await getSession();
  if (!token) return { ok: false, ref: reference() };
  try {
    return {
      ok: true,
      data: (await patchReaderProfile(token, parsed.data)).profile,
    };
  } catch (error) {
    return failure(error, "settings");
  }
}

/** The end state's "Continue reading" block (Q9): the reader's most recent place, or nothing. */
export interface ContinueView {
  title: string;
  lede: string;
  href: string;
  lang: string;
}

export async function loadReviewContinue(): Promise<ContinueView | null> {
  const token = await getSession();
  if (!token) return null;
  try {
    const first = (await loadContinue(token, []))[0];
    if (!first) return null;
    const where =
      first.kind === "doc"
        ? `${first.project} · Document`
        : `${first.bookTitle} · Chapter ${first.n} of ${first.total}`;
    return {
      title: first.title,
      lede: first.next ? where : `${where} · ${first.pct}% read`,
      href: first.href,
      lang: first.lang,
    };
  } catch {
    return null;
  }
}

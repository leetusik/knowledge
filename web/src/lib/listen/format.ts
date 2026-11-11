import { LISTEN } from "@/content/listen";

// P41-sr.W1 — the formats of `11-listen` F2, pure so the dock, the note and the head say
// a time one way. Positions and lengths are audio seconds (speed never changes them, F3).

const pad = (n: number): string => String(n).padStart(2, "0");

/** A position: `m:ss` under an hour (`12:30`, `0:04`), `h:mm:ss` from an hour (`1:02:45`). */
export function clockPos(seconds: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

/**
 * A length of made audio: whole minutes under an hour (`42 min`), `1 h 7 min` from an
 * hour. A made length under a minute reads `1 min` (never `0 min`).
 */
export function lengthWords(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Time left preparing (F2, F9): always "about", rounded (to 5 min under an hour, to the
 * half hour from an hour), and `under 5 min` under five minutes.
 */
export function aboutLeft(seconds: number): string {
  const mins = seconds / 60;
  if (mins < 5) return LISTEN.time.under5;
  if (mins < 57.5) {
    return LISTEN.time.about(`${Math.round(mins / 5) * 5} min`);
  }
  const half = Math.max(2, Math.round(mins / 30));
  const h = Math.floor(half / 2);
  return LISTEN.time.about(half % 2 ? `${h} h 30 min` : `${h} h`);
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * A clock time (F2, as `lib/review/model.ts` builds it: 24-hour, `19:55`), with a day
 * word when it is not today (`19:55 yesterday`, `09:00 tomorrow`); further away, the
 * date as `lib/reader/date.ts` writes it (`3 Nov 2026`). Null for an unreadable time.
 */
export function clockAt(
  iso: string | null,
  now: Date = new Date(),
): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const clock = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  if (dayKey(at) === dayKey(now)) return clock;
  const day = 24 * 3600 * 1000;
  if (dayKey(at) === dayKey(new Date(now.getTime() - day))) {
    return LISTEN.time.yesterday(clock);
  }
  if (dayKey(at) === dayKey(new Date(now.getTime() + day))) {
    return LISTEN.time.tomorrow(clock);
  }
  return `${at.getDate()} ${MONTHS[at.getMonth()]} ${at.getFullYear()}`;
}

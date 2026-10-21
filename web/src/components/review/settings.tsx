"use client";

import { useEffect, useId, useMemo, useRef, type FormEvent } from "react";

import { REVIEW } from "@/content/review";
import { cx } from "@/lib/review/cx";
import {
  settingsErrors,
  zoneIds,
  zoneLabel,
  type SettingsDraft,
} from "@/lib/review/model";

/**
 * P30.S24 — review settings (`08-review` §7, `ReviewSettings`, board 18): the body of the
 * right-hand sheet that opens from Settings. One form for `PATCH /app/reader/profile`: the
 * time zone, Reviews a day and New highlights a day (the signed ranges, 1-999 and 0-999), the
 * 04:00 day line (not editable), Save settings and Cancel.
 *
 *  - invalid: on Save each bad field takes the revoked border, `aria-invalid` and its error,
 *    and nothing is sent. A field's hint and error are stacked in ONE grid cell (the cell keeps
 *    the taller one's height), so nothing below moves. Focus goes to the first invalid field;
 *  - saving: "Saving…" in Save settings' place, at full opacity;
 *  - failed: "Not saved · check your connection" above the buttons, with the draft kept.
 */
export type SettingsPhase = "edit" | "invalid" | "saving" | "failed";

export function ReviewSettingsForm({
  draft,
  phase,
  attempt,
  now,
  onField,
  onSave,
  onCancel,
}: {
  draft: SettingsDraft;
  phase: SettingsPhase;
  /** Counts Save presses, so focus follows each invalid attempt. */
  attempt: number;
  now: string;
  onField: (key: keyof SettingsDraft, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const S = REVIEW.settings;
  const uid = useId();
  const ids = {
    tz: `${uid}-tz`,
    tzHint: `${uid}-tzh`,
    max: `${uid}-max`,
    maxHint: `${uid}-maxh`,
    maxErr: `${uid}-maxe`,
    nw: `${uid}-nw`,
    nwHint: `${uid}-nwh`,
    nwErr: `${uid}-nwe`,
  };
  const formRef = useRef<HTMLFormElement>(null);
  const errs = settingsErrors(draft);
  const shown = phase === "invalid" || phase === "saving" || phase === "failed";
  const maxBad = shown && errs.max;
  const nwBad = shown && errs.maxNew;
  const saving = phase === "saving";
  const failed = phase === "failed";

  const zones = useMemo(() => {
    const at = new Date(now);
    return zoneIds(draft.tz).map((id) => ({ id, label: zoneLabel(id, at) }));
    // The list is built once per open sheet and per current zone, not per keystroke.
  }, [draft.tz, now]);

  useEffect(() => {
    if (phase !== "invalid") return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus({ preventScroll: true });
  }, [phase, attempt]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!saving) onSave();
  };
  const lab = saving ? "saving" : failed ? "retry" : "save";

  return (
    <form ref={formRef} className="rv-set" noValidate onSubmit={submit}>
      <p className="rd-sheet__lead">{S.lead}</p>
      <div className="an-ed">
        <label className="an-ed__label" htmlFor={ids.tz}>
          {S.timeZone}
        </label>
        <select
          id={ids.tz}
          className="an-ed__field an-ed__field--line rv-select"
          value={draft.tz}
          aria-describedby={ids.tzHint}
          onChange={(e) => onField("tz", e.target.value)}
        >
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.label}
            </option>
          ))}
        </select>
        <p className="rv-hint" id={ids.tzHint}>
          {S.timeZoneHint}
        </p>
      </div>
      <div className="an-ed">
        <label className="an-ed__label" htmlFor={ids.max}>
          {S.reviews}
        </label>
        <input
          type="text"
          inputMode="numeric"
          id={ids.max}
          className={cx(
            "an-ed__field an-ed__field--line rv-num",
            maxBad && "is-bad",
          )}
          value={draft.max}
          aria-invalid={maxBad ? "true" : undefined}
          aria-describedby={
            maxBad ? `${ids.maxErr} ${ids.maxHint}` : ids.maxHint
          }
          autoComplete="off"
          onChange={(e) => onField("max", e.target.value)}
        />
        <div className="rv-msg">
          <p className={cx("rv-hint", maxBad && "is-off")} id={ids.maxHint}>
            {S.reviewsHint}
          </p>
          <p className={cx("rv-err", !maxBad && "is-off")} id={ids.maxErr}>
            {S.reviewsError}
          </p>
        </div>
      </div>
      <div className="an-ed">
        <label className="an-ed__label" htmlFor={ids.nw}>
          {S.newHighlights}
        </label>
        <input
          type="text"
          inputMode="numeric"
          id={ids.nw}
          className={cx(
            "an-ed__field an-ed__field--line rv-num",
            nwBad && "is-bad",
          )}
          value={draft.maxNew}
          aria-invalid={nwBad ? "true" : undefined}
          aria-describedby={nwBad ? `${ids.nwErr} ${ids.nwHint}` : ids.nwHint}
          autoComplete="off"
          onChange={(e) => onField("maxNew", e.target.value)}
        />
        <div className="rv-msg">
          <p className={cx("rv-hint", nwBad && "is-off")} id={ids.nwHint}>
            {S.newHint}
          </p>
          <p className={cx("rv-err", !nwBad && "is-off")} id={ids.nwErr}>
            {S.newError}
          </p>
        </div>
      </div>
      <p className="rv-set__day">{S.day}</p>
      <div className="rv-set__foot">
        <p
          className={cx("rv-set__fail", !failed && "is-off")}
          role="status"
          aria-hidden={failed ? undefined : "true"}
        >
          {S.notSaved}
        </p>
        <button
          type="submit"
          className="rd-btn rd-btn--primary qz-act"
          aria-busy={saving ? "true" : undefined}
          disabled={saving}
        >
          <span className="qz-swap">
            <span className={lab === "save" ? undefined : "is-off"}>
              {S.save}
            </span>
            <span className={lab === "saving" ? undefined : "is-off"}>
              {S.saving}
            </span>
            <span className={lab === "retry" ? undefined : "is-off"}>
              {S.tryAgain}
            </span>
          </span>
        </button>
        <button
          type="button"
          className="rd-btn rd-btn--quiet"
          onClick={onCancel}
        >
          {S.cancel}
        </button>
      </div>
    </form>
  );
}

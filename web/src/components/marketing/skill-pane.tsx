"use client";

import { useState } from "react";

// Skill document pane (P20.S3, build-prompt §(b)) — the ONE client island the skill
// section needs: the head-of-file preview (rendered server-side from the served file
// and slotted as `children`) plus the in-place expand/collapse. Collapsed, the body is
// clipped to `max-height: 430px` with a bottom fade (marketing.css); "read the whole
// skill ↓" releases it to a scrollable `70vh` reader — the SAME pane, in place — and
// the link flips to "collapse ↑". No-JS / no-motion fallback = the Download link above
// (the collapsed head always renders server-side; this toggle only enriches it). The
// `data-expanded` hook drives the CSS; nothing here re-reads or forks the file.
export function SkillPane({
  children,
  name,
  meta,
  cmd,
  footLead,
  expand,
  collapse,
  parity,
}: {
  /** The server-rendered, syntax-inked file body (the head-of-file preview). */
  children: React.ReactNode;
  name: string;
  meta: string;
  cmd: string;
  footLead: string;
  expand: string;
  collapse: string;
  parity: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mkt-skill" data-expanded={expanded || undefined}>
      <div className="mkt-skill__topbar">
        <span className="mkt-skill__name">{name}</span>
        <span className="mkt-skill__size">{meta}</span>
        <span className="mkt-skill__cmd">{cmd}</span>
      </div>

      <div className="mkt-skill__body">{children}</div>

      <div className="mkt-skill__foot">
        <span className="mkt-skill__footlead">
          {!expanded && <>{footLead} · </>}
          <button
            type="button"
            className="mkt-skill__toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? collapse : expand}
          </button>
        </span>
        <span className="mkt-skill__parity">{parity}</span>
      </div>
    </div>
  );
}

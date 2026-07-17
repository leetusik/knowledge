import type { Terminal, TermTone } from "@/content/marketing";

// The CLI / agent-first "product" illustration — a static terminal block. Always
// sits on a dark band, so it renders as a raised charcoal card regardless of the
// active scheme. Real commands come in as data (content/marketing/terminals.ts).

const TONE_CLASS: Record<TermTone, string> = {
  prompt: "mkt-t-p",
  arg: "mkt-t-a",
  ok: "mkt-t-ok",
  key: "mkt-t-key",
};

export function TerminalBlock({ terminal }: { terminal: Terminal }) {
  return (
    <div className="mkt-term">
      <div className="mkt-term__bar">
        <span className="mkt-term__dot" aria-hidden />
        <span className="mkt-term__dot" aria-hidden />
        <span className="mkt-term__dot" aria-hidden />
        <span className="mkt-term__title">{terminal.title}</span>
      </div>
      <pre className="mkt-term__body">
        {terminal.lines.map((line, i) => (
          <div key={i} className="mkt-term__line">
            {line.map((seg, j) => (
              <span key={j} className={seg.tone ? TONE_CLASS[seg.tone] : undefined}>
                {seg.text}
              </span>
            ))}
          </div>
        ))}
      </pre>
    </div>
  );
}

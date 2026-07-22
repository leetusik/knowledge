// Terminal-block content (P14.S2) — the "product" illustration for the hero and
// the connect feature. Real `knowledge` CLI commands. `CONNECT_TERMINAL` is
// verbatim from build-prompt.md §4; `HERO_TERMINAL` departs from it (P20.S1):
// the original hero line 1 `uv tool install knowledge-cli` was live-broken — that
// package was never published to PyPI (D-P13-1) — so the hero now depicts the
// working curl-installer plus the honest `init` password prompt and the real
// `init`/`save` output shapes (a representative selection, not a full transcript).
// This is copy inside the already-designed hero component, not a design round;
// never edit web/design/rounds/01-* (read-only design record). Each line is a
// list of segments; `tone` picks the syntax ink in the terminal renderer (prompt
// teal · arg/comment hint · ok success · key bronze; untoned = on-dark body).

export type TermTone = "prompt" | "arg" | "ok" | "key";
export interface TermSeg {
  text: string;
  tone?: TermTone;
}
export type TermLine = TermSeg[];
export interface Terminal {
  /** Mono label in the terminal title bar. */
  title: string;
  lines: TermLine[];
}

// Hero — the one-command onboarding path: install → init → save.
export const HERO_TERMINAL: Terminal = {
  title: "knowledge — onboarding",
  lines: [
    [
      { text: "$ ", tone: "prompt" },
      { text: "curl " },
      { text: "-fsSL https://knowledge.hi2vi.com/install.sh", tone: "arg" },
      { text: " | bash" },
    ],
    [
      { text: "$ ", tone: "prompt" },
      { text: "knowledge init " },
      { text: "--email you@example.com", tone: "arg" },
    ],
    [{ text: "Password:" }],
    [{ text: "signed up as you@example.com (org: default)", tone: "ok" }],
    [{ text: "project: default (created)", tone: "ok" }],
    [
      { text: "key: minted ", tone: "ok" },
      { text: "vk_…9f2c", tone: "key" },
    ],
    [
      { text: "config: ", tone: "ok" },
      { text: "~/.config/knowledge-kb/config.json", tone: "arg" },
      { text: " (0600)", tone: "ok" },
    ],
    [
      { text: "$ ", tone: "prompt" },
      { text: "knowledge save explainer.md" },
    ],
    [{ text: "saved: explainer", tone: "ok" }],
    [
      { text: "url: ", tone: "ok" },
      { text: "https://knowledge.hi2vi.com/documents/a1b2c3", tone: "arg" },
    ],
  ],
};

// Connect — the day-to-day loop: save with tags → search --json → logout leaves
// the vk_ key working → list.
export const CONNECT_TERMINAL: Terminal = {
  title: "knowledge — day to day",
  lines: [
    [
      { text: "$ ", tone: "prompt" },
      { text: "knowledge save reverse-proxy.md " },
      { text: "--tag networking --tag nginx", tone: "arg" },
    ],
    [
      { text: "saved · ", tone: "ok" },
      { text: "knowledge read a1b2c3", tone: "arg" },
    ],
    [
      { text: "$ ", tone: "prompt" },
      { text: "knowledge search " },
      { text: '"reverse proxy" --json', tone: "arg" },
    ],
    [{ text: '[{ "id": "a1b2c3", "score": 0.94 }]', tone: "arg" }],
    [
      { text: "$ ", tone: "prompt" },
      { text: "knowledge logout" },
    ],
    [
      { text: "session ended · ", tone: "ok" },
      { text: "vk_live_ still valid", tone: "key" },
    ],
    [
      { text: "$ ", tone: "prompt" },
      { text: "knowledge list" },
    ],
    [{ text: "✓ 12 documents · 3 projects", tone: "ok" }],
  ],
};

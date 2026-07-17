// Terminal-block content (P14.S2) — the "product" illustration for the hero and
// the connect feature. Real `knowledge` CLI commands, verbatim from
// build-prompt.md §4. Each line is a list of segments; `tone` picks the syntax
// ink in the terminal renderer (prompt teal · arg/comment hint · ok success ·
// key bronze; untoned = on-dark body).

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
      { text: "uv tool install knowledge-cli" },
    ],
    [
      { text: "$ ", tone: "prompt" },
      { text: "knowledge init " },
      { text: "--email you@example.com", tone: "arg" },
    ],
    [{ text: "✓ signed up · project created", tone: "ok" }],
    [
      { text: "✓ minted ", tone: "ok" },
      { text: "vk_live_9f2c…", tone: "key" },
    ],
    [
      { text: "✓ config written ", tone: "ok" },
      { text: "~/.config/knowledge-kb", tone: "arg" },
    ],
    [
      { text: "$ ", tone: "prompt" },
      { text: "knowledge save explainer.md" },
    ],
    [
      { text: "saved · ", tone: "ok" },
      { text: "knowledge read a1b2c3", tone: "arg" },
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

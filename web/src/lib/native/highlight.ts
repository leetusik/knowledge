/**
 * Server-side code highlighting (P29 *Code*: "highlighted at render time on the
 * server into token classes styled by design tokens").
 *
 * Shiki, pinned, with its JavaScript regex engine (no WASM to trace into the
 * standalone server) and a CSS-variables theme. Shiki's output is never used as
 * HTML: `codeToTokens` gives plain token objects, and each token's colour —
 * `var(--kb-code-token-keyword)` and friends — is turned into a class name
 * (`kb-tok-keyword`). Nothing inline: no `style`, no colour, so S13's themes own
 * every colour through those classes and the CSP never needs `'unsafe-inline'`.
 *
 * Synchronous, so the whole render pipeline stays a plain server component.
 * An unknown or missing language (and `text`) renders unhighlighted.
 */
import "server-only";

import {
  createCssVariablesTheme,
  createHighlighterCoreSync,
  type HighlighterCore,
} from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/bash.mjs";
import c from "shiki/langs/c.mjs";
import cpp from "shiki/langs/cpp.mjs";
import css from "shiki/langs/css.mjs";
import diff from "shiki/langs/diff.mjs";
import dockerfile from "shiki/langs/dockerfile.mjs";
import go from "shiki/langs/go.mjs";
import html from "shiki/langs/html.mjs";
import java from "shiki/langs/java.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import jsx from "shiki/langs/jsx.mjs";
import kotlin from "shiki/langs/kotlin.mjs";
import python from "shiki/langs/python.mjs";
import ruby from "shiki/langs/ruby.mjs";
import rust from "shiki/langs/rust.mjs";
import sql from "shiki/langs/sql.mjs";
import swift from "shiki/langs/swift.mjs";
import toml from "shiki/langs/toml.mjs";
import tsx from "shiki/langs/tsx.mjs";
import typescript from "shiki/langs/typescript.mjs";
import yaml from "shiki/langs/yaml.mjs";

const THEME_NAME = "kb-code";
/** The CSS variable prefix the theme emits; mapped to classes, never shipped. */
const VAR_PREFIX = "--kb-code-";

const theme = createCssVariablesTheme({
  name: THEME_NAME,
  variablePrefix: VAR_PREFIX,
  fontStyle: true,
});

let highlighter: HighlighterCore | null = null;

function getHighlighter(): HighlighterCore {
  if (highlighter === null) {
    highlighter = createHighlighterCoreSync({
      themes: [theme],
      langs: [
        bash,
        c,
        cpp,
        css,
        diff,
        dockerfile,
        go,
        html,
        java,
        javascript,
        json,
        jsx,
        kotlin,
        python,
        ruby,
        rust,
        sql,
        swift,
        toml,
        tsx,
        typescript,
        yaml,
      ],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    });
  }
  return highlighter;
}

/** Extra spellings authors use that Shiki's grammars do not alias themselves. */
const ALIASES: Record<string, string> = {
  py: "python",
  ts: "typescript",
  js: "javascript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  shellscript: "bash",
  console: "bash",
  yml: "yaml",
  rs: "rust",
  "c++": "cpp",
  docker: "dockerfile",
  kt: "kotlin",
  rb: "ruby",
  golang: "go",
  patch: "diff",
};

export interface CodeToken {
  text: string;
  /** Space-separated class names (`kb-tok kb-tok-keyword …`), or "" for plain text. */
  className: string;
}

/** One line of tokens per source line. */
export type CodeLines = CodeToken[][];

function classesFor(
  color: string | undefined,
  fontStyle: number | undefined,
): string {
  const names: string[] = [];
  const m = color ? /var\(--kb-code-([a-z0-9-]+)/.exec(color) : null;
  if (m && m[1] !== "foreground")
    names.push(`kb-tok-${m[1].replace(/^token-/, "")}`);
  if (fontStyle && fontStyle > 0) {
    if (fontStyle & 1) names.push("kb-tok-italic");
    if (fontStyle & 2) names.push("kb-tok-bold");
    if (fontStyle & 4) names.push("kb-tok-underline");
  }
  return names.length ? `kb-tok ${names.join(" ")}` : "";
}

/**
 * Tokenize `code` in `lang`. Returns null when the language is not highlighted
 * (unknown, `text`, none) or highlighting fails: the caller renders plain text.
 */
export function highlight(code: string, lang: string | null): CodeLines | null {
  if (!lang) return null;
  const wanted = lang.toLowerCase();
  const name = ALIASES[wanted] ?? wanted;
  try {
    const hl = getHighlighter();
    if (!hl.getLoadedLanguages().includes(name)) return null;
    const { tokens } = hl.codeToTokens(code, { lang: name, theme: THEME_NAME });
    return tokens.map((line) =>
      line.map((t) => ({
        text: t.content,
        className: classesFor(t.color, t.fontStyle),
      })),
    );
  } catch {
    return null;
  }
}

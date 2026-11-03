/**
 * The TeX subset a native chapter's math may use (mirrors `server/native/tex.py`;
 * P39-hk R1 §4). The reader typesets with Temml (S8); this validator refuses up
 * front whatever Temml would reject, sanitize or render unsafely.
 *
 * `validateTex(tex, display)` returns `null` for TeX inside the subset, else
 * `[code, message]` for its first problem:
 *  - `limit`: inline TeX over 300 code points, display TeX over 2,000, or nesting
 *    deeper than 20 levels (braces, `[…]`, `\left…\right` and environments together);
 *  - `math-syntax`: a character or a structure outside the subset;
 *  - `math-command`: a command outside `TEX_ALLOWLIST`, a display-only form
 *    (`\frac`, an environment, `&`, `\\`) in inline math, or `&` and `\\` outside an
 *    environment.
 *
 * `TEX_ALLOWLIST` is data: `tests/fixtures/native/tex-allowlist.tsv` holds it, and
 * a Python and a TS test each assert their constant equals that file.
 *
 * `texOccurs(sym, tex)` is the `formula-legend` match: `sym`'s tokens appear, in a
 * row, in `tex`'s tokens, after spaces are dropped and every brace group holding
 * one token is unwrapped (`e_{i}` matches `e_i`).
 */

export const TEX_INLINE_MAX = 300;
export const TEX_DISPLAY_MAX = 2000;
export const TEX_MAX_DEPTH = 20;

export type TexContext = "inline" | "display";
export type TexArity =
  | "0"
  | "delim"
  | "op"
  | "limits"
  | "fence"
  | "1"
  | "2"
  | "text"
  | "opt1"
  | "env"
  | "cell";

/** `[command, context, arity]`, in the TSV's order (arities: `tex.py`'s table). */
export const TEX_ALLOWLIST: readonly (readonly [
  string,
  TexContext,
  TexArity,
])[] = [
  // Greek
  ["\\alpha", "inline", "0"],
  ["\\beta", "inline", "0"],
  ["\\gamma", "inline", "0"],
  ["\\delta", "inline", "0"],
  ["\\epsilon", "inline", "0"],
  ["\\varepsilon", "inline", "0"],
  ["\\zeta", "inline", "0"],
  ["\\eta", "inline", "0"],
  ["\\theta", "inline", "0"],
  ["\\vartheta", "inline", "0"],
  ["\\iota", "inline", "0"],
  ["\\kappa", "inline", "0"],
  ["\\lambda", "inline", "0"],
  ["\\mu", "inline", "0"],
  ["\\nu", "inline", "0"],
  ["\\xi", "inline", "0"],
  ["\\pi", "inline", "0"],
  ["\\rho", "inline", "0"],
  ["\\sigma", "inline", "0"],
  ["\\tau", "inline", "0"],
  ["\\upsilon", "inline", "0"],
  ["\\phi", "inline", "0"],
  ["\\varphi", "inline", "0"],
  ["\\chi", "inline", "0"],
  ["\\psi", "inline", "0"],
  ["\\omega", "inline", "0"],
  ["\\Gamma", "inline", "0"],
  ["\\Delta", "inline", "0"],
  ["\\Theta", "inline", "0"],
  ["\\Lambda", "inline", "0"],
  ["\\Xi", "inline", "0"],
  ["\\Pi", "inline", "0"],
  ["\\Sigma", "inline", "0"],
  ["\\Upsilon", "inline", "0"],
  ["\\Phi", "inline", "0"],
  ["\\Psi", "inline", "0"],
  ["\\Omega", "inline", "0"],
  // operators and relations
  ["\\times", "inline", "0"],
  ["\\div", "inline", "0"],
  ["\\cdot", "inline", "0"],
  ["\\pm", "inline", "0"],
  ["\\mp", "inline", "0"],
  ["\\approx", "inline", "0"],
  ["\\neq", "inline", "0"],
  ["\\ne", "inline", "0"],
  ["\\le", "inline", "0"],
  ["\\leq", "inline", "0"],
  ["\\ge", "inline", "0"],
  ["\\geq", "inline", "0"],
  ["\\ll", "inline", "0"],
  ["\\gg", "inline", "0"],
  ["\\sim", "inline", "0"],
  ["\\simeq", "inline", "0"],
  ["\\equiv", "inline", "0"],
  ["\\propto", "inline", "0"],
  ["\\to", "inline", "0"],
  ["\\rightarrow", "inline", "0"],
  ["\\leftarrow", "inline", "0"],
  ["\\Rightarrow", "inline", "0"],
  ["\\Leftarrow", "inline", "0"],
  ["\\leftrightarrow", "inline", "0"],
  ["\\Leftrightarrow", "inline", "0"],
  ["\\mapsto", "inline", "0"],
  ["\\infty", "inline", "0"],
  ["\\partial", "inline", "0"],
  ["\\nabla", "inline", "0"],
  ["\\in", "inline", "0"],
  ["\\notin", "inline", "0"],
  ["\\subset", "inline", "0"],
  ["\\subseteq", "inline", "0"],
  ["\\cup", "inline", "0"],
  ["\\cap", "inline", "0"],
  ["\\emptyset", "inline", "0"],
  ["\\forall", "inline", "0"],
  ["\\exists", "inline", "0"],
  ["\\neg", "inline", "0"],
  ["\\land", "inline", "0"],
  ["\\lor", "inline", "0"],
  ["\\ldots", "inline", "0"],
  ["\\cdots", "inline", "0"],
  ["\\dots", "inline", "0"],
  ["\\circ", "inline", "0"],
  ["\\bullet", "inline", "0"],
  ["\\ast", "inline", "0"],
  ["\\prime", "inline", "0"],
  ["\\%", "inline", "0"],
  ["\\$", "inline", "0"],
  // delimiters
  ["\\lvert", "inline", "delim"],
  ["\\rvert", "inline", "delim"],
  ["\\lVert", "inline", "delim"],
  ["\\rVert", "inline", "delim"],
  ["\\langle", "inline", "delim"],
  ["\\rangle", "inline", "delim"],
  ["\\lfloor", "inline", "delim"],
  ["\\rfloor", "inline", "delim"],
  ["\\lceil", "inline", "delim"],
  ["\\rceil", "inline", "delim"],
  ["\\{", "inline", "delim"],
  ["\\}", "inline", "delim"],
  ["\\|", "inline", "delim"],
  // large operators and functions
  ["\\sum", "inline", "op"],
  ["\\prod", "inline", "op"],
  ["\\int", "inline", "op"],
  ["\\lim", "inline", "op"],
  ["\\max", "inline", "op"],
  ["\\min", "inline", "op"],
  ["\\sup", "inline", "op"],
  ["\\inf", "inline", "op"],
  ["\\arg", "inline", "op"],
  ["\\log", "inline", "op"],
  ["\\ln", "inline", "op"],
  ["\\exp", "inline", "op"],
  ["\\sin", "inline", "op"],
  ["\\cos", "inline", "op"],
  ["\\tan", "inline", "op"],
  ["\\det", "inline", "op"],
  ["\\Pr", "inline", "op"],
  ["\\limits", "inline", "limits"],
  ["\\nolimits", "inline", "limits"],
  // commands with arguments
  ["\\sqrt", "inline", "opt1"],
  ["\\text", "inline", "text"],
  ["\\mathrm", "inline", "text"],
  ["\\operatorname", "inline", "text"],
  ["\\mathit", "inline", "1"],
  ["\\mathbf", "inline", "1"],
  ["\\hat", "inline", "1"],
  ["\\bar", "inline", "1"],
  ["\\tilde", "inline", "1"],
  ["\\vec", "inline", "1"],
  ["\\dot", "inline", "1"],
  ["\\ddot", "inline", "1"],
  ["\\left", "inline", "fence"],
  ["\\right", "inline", "fence"],
  // spacing
  ["\\,", "inline", "0"],
  ["\\;", "inline", "0"],
  ["\\:", "inline", "0"],
  ["\\!", "inline", "0"],
  ["\\quad", "inline", "0"],
  ["\\qquad", "inline", "0"],
  // display only
  ["\\frac", "display", "2"],
  ["\\tfrac", "display", "2"],
  ["\\dfrac", "display", "2"],
  ["\\binom", "display", "2"],
  ["\\begin{aligned}", "display", "env"],
  ["\\begin{cases}", "display", "env"],
  ["&", "display", "cell"],
  ["\\\\", "display", "cell"],
];

const TABLE = new Map<string, readonly [TexContext, TexArity]>(
  TEX_ALLOWLIST.map(([command, context, arity]) => [command, [context, arity]]),
);
const LETTERS = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");
const ORDINARY = new Set(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-*/=<>()[]|,.;:!?",
);
const CONTROL_SYMBOLS = new Set(",;:! {}|%$_&\\");
const TEXT_FORBIDDEN = new Set("\\{}$%#&^_~");
const DELIMITERS = new Set("()[]|.");
const SPACE = " ";
const NEWLINE = "\n";

type Ctx = "top" | "group" | "opt" | "left" | "env";

class Refused extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function cp(ch: string): number {
  return ch.codePointAt(0) ?? 0;
}

/** A character for a message: printable ASCII quoted, anything else as U+XXXX. */
function show(ch: string): string {
  const c = cp(ch);
  return c >= 0x21 && c <= 0x7e
    ? `'${ch}'`
    : `U+${c.toString(16).toUpperCase().padStart(4, "0")}`;
}

function isControl(ch: string): boolean {
  const c = cp(ch);
  return c < 0x20 || (c >= 0x7f && c <= 0x9f);
}

class Checker {
  readonly s: string[];
  readonly n: number;
  i = 0;

  constructor(
    tex: string,
    readonly display: boolean,
  ) {
    this.s = Array.from(tex); // code points
    this.n = this.s.length;
  }

  // --- the reading head --------------------------------------------------------

  fail(code: string, message: string): never {
    throw new Refused(code, message);
  }

  peek(): string | null {
    return this.i < this.n ? this.s[this.i] : null;
  }

  skipSpace(): void {
    while (
      this.i < this.n &&
      (this.s[this.i] === SPACE || this.s[this.i] === NEWLINE)
    )
      this.i += 1;
  }

  /** The control sequence starting at `at` (a backslash) and its end, or `[null, at]`. */
  commandAt(at: number): [string | null, number] {
    if (at + 1 >= this.n) return [null, at];
    const next = this.s[at + 1];
    if (LETTERS.has(next)) {
      let end = at + 1;
      while (end < this.n && LETTERS.has(this.s[end])) end += 1;
      return [`\\${this.s.slice(at + 1, end).join("")}`, end];
    }
    if (CONTROL_SYMBOLS.has(next)) return [`\\${next}`, at + 2];
    return [null, at];
  }

  readCommand(): string {
    const [name, end] = this.commandAt(this.i);
    if (name === null) {
      if (this.i + 1 >= this.n)
        this.fail("math-syntax", "a lone \\ at the end");
      this.fail(
        "math-syntax",
        `unknown control symbol \\ followed by ${show(this.s[this.i + 1])}`,
      );
    }
    this.i = end;
    return name;
  }

  peekCommand(): string | null {
    if (this.peek() !== "\\") return null;
    return this.commandAt(this.i)[0];
  }

  lookup(name: string): TexArity {
    const row = TABLE.get(name);
    if (row === undefined)
      this.fail("math-command", `${name} is not in the TeX allowlist`);
    const [context, arity] = row;
    if (context === "display" && !this.display)
      this.fail(
        "math-command",
        `${name} is display-only: inline math is one line (use a formula block)`,
      );
    return arity;
  }

  badChar(ch: string): never {
    if (ch === "%")
      this.fail(
        "math-syntax",
        "'%' starts a TeX comment: write \\% for a percent sign",
      );
    if (ch === "$")
      this.fail("math-syntax", "write \\$ for a dollar sign inside math");
    if (cp(ch) > 0x7e)
      this.fail(
        "math-syntax",
        `${show(ch)} is not ASCII: outside \\text{}, write symbols as commands (\\alpha, \\times)`,
      );
    this.fail("math-syntax", `unexpected character ${show(ch)}`);
  }

  enter(depth: number): void {
    if (depth > TEX_MAX_DEPTH)
      this.fail("limit", `TeX nests deeper than ${TEX_MAX_DEPTH} levels`);
  }

  // --- the grammar ---------------------------------------------------------------

  run(): void {
    for (const ch of this.s) {
      if (isControl(ch) && !(this.display && ch === NEWLINE))
        this.fail(
          "math-syntax",
          `a control character (${show(ch)}): in YAML, write TeX in a block scalar (|) or single quotes`,
        );
    }
    if (this.s.every((ch) => ch === SPACE || ch === NEWLINE))
      this.fail("math-syntax", "the formula is empty");
    this.expr("top", 0, null);
  }

  unclosed(ctx: Ctx, env: string | null): never {
    if (ctx === "group") this.fail("math-syntax", "an unclosed {");
    if (ctx === "opt")
      this.fail(
        "math-syntax",
        "an unclosed [ (the optional argument of \\sqrt)",
      );
    if (ctx === "left") this.fail("math-syntax", "\\left without its \\right");
    this.fail("math-syntax", `\\begin{${env}} has no \\end{${env}}`);
  }

  /**
   * A run of atoms up to `ctx`'s end: the end of the TeX (`top`), `}` (`group`),
   * `]` (`opt`), `\right` (`left`) or `\end` (`env`), left for the caller to read.
   */
  expr(ctx: Ctx, depth: number, env: string | null): void {
    for (;;) {
      this.skipSpace();
      const ch = this.peek();
      if (ch === null) {
        if (ctx === "top") return;
        this.unclosed(ctx, env);
      }
      if (ch === "}") {
        if (ctx === "group") return;
        if (ctx === "top") this.fail("math-syntax", "an unmatched }");
        this.unclosed(ctx, env);
      }
      if (ch === "]" && ctx === "opt") return;
      const name = this.peekCommand();
      if (name === "\\right") {
        if (ctx === "left") return;
        if (ctx === "top")
          this.fail("math-syntax", "\\right without its \\left");
        this.unclosed(ctx, env);
      }
      if (name === "\\end") {
        if (ctx === "env") return;
        if (ctx === "top")
          this.fail("math-syntax", "\\end without its \\begin");
        this.unclosed(ctx, env);
      }
      if (ch === "&" || name === "\\\\") {
        this.cell(ctx);
        continue;
      }
      this.atom(ctx, depth);
    }
  }

  cell(ctx: Ctx): void {
    const name = this.peek() === "&" ? "&" : "\\\\";
    this.lookup(name);
    if (ctx !== "env")
      this.fail(
        "math-command",
        `${name} belongs directly inside aligned or cases`,
      );
    this.i += name.length;
    if (name === "\\\\") {
      this.skipSpace();
      if (this.peek() === "[")
        this.fail(
          "math-syntax",
          "\\\\ followed by [ reads as a spacing argument: put {} between them",
        );
    }
  }

  atom(ctx: Ctx, depth: number): void {
    const ch = this.peek() as string;
    let op = false;
    if (ch === "^" || ch === "_" || ch === "'") {
      // a script on an empty base
    } else if (ch === "{") {
      this.group(depth);
    } else if (ch === "\\") {
      const name = this.readCommand();
      if (name === "\\begin") {
        this.environment(ctx, depth);
      } else {
        const arity = this.lookup(name);
        op = arity === "op";
        this.command(name, arity, ctx, depth);
      }
    } else if (ORDINARY.has(ch)) {
      this.i += 1;
    } else {
      this.badChar(ch);
    }
    this.scripts(op, ctx, depth);
  }

  command(name: string, arity: TexArity, ctx: Ctx, depth: number): void {
    if (arity === "limits")
      this.fail(
        "math-syntax",
        `${name} must follow a large operator such as \\sum`,
      );
    if (arity === "fence") {
      // \left (\right ends an expr before it gets here)
      this.delimiter(name);
      this.enter(depth + 1);
      this.expr("left", depth + 1, null);
      this.readCommand(); // \right
      this.delimiter("\\right");
    } else if (arity === "1" || arity === "2") {
      for (let k = 0; k < Number(arity); k += 1)
        this.argument(name, ctx, depth);
    } else if (arity === "text") {
      this.textArgument(name);
    } else if (arity === "opt1") {
      this.skipSpace();
      if (this.peek() === "[") {
        this.i += 1;
        this.enter(depth + 1);
        this.expr("opt", depth + 1, null);
        this.i += 1; // ]
      }
      this.argument(name, ctx, depth);
    }
  }

  environment(ctx: Ctx, depth: number): void {
    const env = this.environmentName("\\begin");
    const full = `\\begin{${env}}`;
    this.lookup(full);
    if (ctx !== "top")
      this.fail("math-syntax", `${full} sits at the top level only`);
    this.enter(depth + 1);
    this.expr("env", depth + 1, env);
    this.readCommand(); // \end
    const end = this.environmentName("\\end");
    if (end !== env)
      this.fail("math-syntax", `${full} is closed by \\end{${end}}`);
  }

  environmentName(cmd: string): string {
    this.skipSpace();
    const start = this.i;
    if (this.peek() === "{") {
      this.i += 1;
      const begin = this.i;
      while (this.i < this.n && LETTERS.has(this.s[this.i])) this.i += 1;
      const name = this.s.slice(begin, this.i).join("");
      if (name && this.peek() === "}") {
        this.i += 1;
        return name;
      }
    }
    this.i = start;
    this.fail(
      "math-syntax",
      `${cmd} needs an environment name in braces, such as {aligned}`,
    );
  }

  delimiter(name: string): void {
    this.skipSpace();
    const ch = this.peek();
    if (ch !== null && DELIMITERS.has(ch)) {
      this.i += 1;
      return;
    }
    if (ch === "\\") {
      const dname = this.readCommand();
      if (this.lookup(dname) === "delim") return;
      this.fail(
        "math-syntax",
        `${dname} is not a delimiter: ${name} takes one of ( ) [ ] | . or a delimiter command such as \\lvert`,
      );
    }
    this.fail(
      "math-syntax",
      `${name} needs a delimiter, such as ( or \\lvert or .`,
    );
  }

  argument(owner: string, ctx: Ctx, depth: number): void {
    this.skipSpace();
    const ch = this.peek();
    if (
      ch === null ||
      ch === "}" ||
      ch === "^" ||
      ch === "_" ||
      ch === "&" ||
      ch === "'" ||
      (ch === "]" && ctx === "opt")
    )
      this.fail("math-syntax", `${owner} is missing its argument`);
    if (ch === "{") {
      this.group(depth);
      return;
    }
    if (ch === "\\") {
      const [peeked] = this.commandAt(this.i);
      if (peeked === "\\right" || peeked === "\\end" || peeked === "\\\\")
        this.fail("math-syntax", `${owner} is missing its argument`);
      const name = this.readCommand();
      if (name === "\\begin")
        this.fail(
          "math-syntax",
          `\\begin needs braces to be the argument of ${owner}`,
        );
      const arity = this.lookup(name);
      if (arity === "0" || arity === "delim") return;
      this.fail(
        "math-syntax",
        `${name} needs braces to be the argument of ${owner}: write {${name}…}`,
      );
    }
    if (ORDINARY.has(ch)) {
      this.i += 1;
      return;
    }
    this.badChar(ch);
  }

  textArgument(name: string): void {
    this.skipSpace();
    if (this.peek() !== "{")
      this.fail("math-syntax", `${name} needs a {…} argument`);
    this.i += 1;
    for (;;) {
      const ch = this.peek();
      if (ch === null) this.fail("math-syntax", `${name}{ is not closed`);
      if (ch === "}") {
        this.i += 1;
        return;
      }
      if (TEXT_FORBIDDEN.has(ch) || isControl(ch))
        this.fail("math-syntax", `${name}{} cannot hold ${show(ch)}`);
      this.i += 1;
    }
  }

  group(depth: number): void {
    this.i += 1; // {
    this.enter(depth + 1);
    this.expr("group", depth + 1, null);
    this.i += 1; // }
  }

  scripts(op: boolean, ctx: Ctx, depth: number): void {
    let sup = false;
    let sub = false;
    for (;;) {
      this.skipSpace();
      const ch = this.peek();
      if (ch === "^") {
        if (sup)
          this.fail("math-syntax", "a double superscript: brace one (x^{a^b})");
        this.i += 1;
        this.argument("^", ctx, depth);
        sup = true;
      } else if (ch === "_") {
        if (sub)
          this.fail("math-syntax", "a double subscript: brace one (x_{a_b})");
        this.i += 1;
        this.argument("_", ctx, depth);
        sub = true;
      } else if (ch === "'") {
        if (sup)
          this.fail(
            "math-syntax",
            "a double superscript: a prime after a superscript",
          );
        while (this.peek() === "'") this.i += 1;
        if (this.peek() === "^") {
          this.i += 1;
          this.argument("^", ctx, depth);
        }
        sup = true;
      } else {
        const name = this.peekCommand();
        if (name !== "\\limits" && name !== "\\nolimits") return;
        this.readCommand();
        if (!op)
          this.fail(
            "math-syntax",
            `${name} must follow a large operator such as \\sum`,
          );
      }
    }
  }
}

/** `null` when `tex` is inside the subset, else `[code, message]`. */
export function validateTex(
  tex: string,
  display: boolean,
): [string, string] | null {
  const limit = display ? TEX_DISPLAY_MAX : TEX_INLINE_MAX;
  const size = Array.from(tex).length;
  if (size > limit)
    return [
      "limit",
      `${display ? "display" : "inline"} math is at most ${limit} characters, this is ${size}`,
    ];
  try {
    new Checker(tex, display).run();
  } catch (exc) {
    if (exc instanceof Refused) return [exc.code, exc.message];
    throw exc;
  }
  return null;
}

/**
 * `tex`'s tokens for the legend match: control sequences whole, every other
 * character alone, spaces dropped, then each `{` + one token + `}` unwrapped
 * (repeatedly, so `{{i}}` is `i`).
 */
export function texTokens(tex: string): string[] {
  const s = Array.from(tex);
  let out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === SPACE || ch === NEWLINE) {
      i += 1;
    } else if (ch === "\\" && i + 1 < s.length && LETTERS.has(s[i + 1])) {
      let end = i + 1;
      while (end < s.length && LETTERS.has(s[end])) end += 1;
      out.push(s.slice(i, end).join(""));
      i = end;
    } else if (ch === "\\" && i + 1 < s.length) {
      out.push(ch + s[i + 1]);
      i += 2;
    } else {
      out.push(ch);
      i += 1;
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    const res: string[] = [];
    let k = 0;
    while (k < out.length) {
      if (
        out[k] === "{" &&
        k + 2 < out.length &&
        out[k + 2] === "}" &&
        out[k + 1] !== "{" &&
        out[k + 1] !== "}"
      ) {
        res.push(out[k + 1]);
        k += 3;
        changed = true;
      } else {
        res.push(out[k]);
        k += 1;
      }
    }
    out = res;
  }
  return out;
}

/** True when `sym`'s tokens occur, in a row, among `tex`'s (`formula-legend`). */
export function texOccurs(sym: string, tex: string): boolean {
  const want = texTokens(sym);
  const have = texTokens(tex);
  for (let k = 0; k + want.length <= have.length; k += 1) {
    if (want.every((t, j) => have[k + j] === t)) return true;
  }
  return false;
}

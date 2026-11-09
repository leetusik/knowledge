"""The TeX subset a native chapter's math may use (P39-hk R1 §4), checked at
publish with no math engine: the reader typesets with Temml (S8), and this
validator refuses up front whatever Temml would reject, sanitize or render
unsafely.

``validate(tex, display=...)`` returns ``None`` for TeX inside the subset, else
``(code, message)`` for its first problem:

* ``limit``: inline TeX over 300 code points, display TeX over 2,000, or
  nesting deeper than 20 levels (braces, ``[…]``, ``\\left…\\right`` and
  environments together);
* ``math-syntax``: a character or a structure outside the subset (a control
  character, non-ASCII outside a text argument, ``% # ~ $``, an unbalanced
  brace, a missing argument, a double script, an unpaired ``\\left`` or
  ``\\begin``);
* ``math-command``: a command outside ``ALLOWLIST``, or a display-only form
  (``\\frac``, an environment, ``&``, ``\\\\``) in inline math, or ``&`` and
  ``\\\\`` outside an environment.

``ALLOWLIST`` is data: ``tests/fixtures/native/tex-allowlist.tsv`` holds it,
and a Python and a TS test each assert their constant equals that file. It
grows only through the fixture. ``web/src/lib/native/tex.ts`` is the twin.

``occurs(sym, tex)`` is the ``formula-legend`` match: ``sym``'s tokens appear,
in a row, in ``tex``'s tokens, after spaces are dropped and every brace group
holding one token is unwrapped (``e_{i}`` matches ``e_i``).
"""
from __future__ import annotations

from typing import Optional

INLINE_MAX = 300
DISPLAY_MAX = 2000
MAX_DEPTH = 20

# (command, context, arity), in the TSV's order. Context: ``inline`` (anywhere)
# or ``display`` (a formula block's ``tex`` only). Arity:
#   0       a symbol; it takes nothing
#   delim   a symbol that may also follow \left or \right
#   op      a large operator or function; \limits / \nolimits may follow it
#   limits  \limits, \nolimits: only after an ``op``
#   fence   \left, \right: one delimiter follows
#   1, 2    one or two arguments (a {group} or one token)
#   text    one {text} argument: words, never commands
#   opt1    an optional [ ] argument, then one argument (\sqrt)
#   env     \begin{<name>} ... \end{<name>}, at the top level only
#   cell    & and \\: directly inside an environment only
ALLOWLIST: tuple[tuple[str, str, str], ...] = (
    # Greek
    ("\\alpha", "inline", "0"),
    ("\\beta", "inline", "0"),
    ("\\gamma", "inline", "0"),
    ("\\delta", "inline", "0"),
    ("\\epsilon", "inline", "0"),
    ("\\varepsilon", "inline", "0"),
    ("\\zeta", "inline", "0"),
    ("\\eta", "inline", "0"),
    ("\\theta", "inline", "0"),
    ("\\vartheta", "inline", "0"),
    ("\\iota", "inline", "0"),
    ("\\kappa", "inline", "0"),
    ("\\lambda", "inline", "0"),
    ("\\mu", "inline", "0"),
    ("\\nu", "inline", "0"),
    ("\\xi", "inline", "0"),
    ("\\pi", "inline", "0"),
    ("\\rho", "inline", "0"),
    ("\\sigma", "inline", "0"),
    ("\\tau", "inline", "0"),
    ("\\upsilon", "inline", "0"),
    ("\\phi", "inline", "0"),
    ("\\varphi", "inline", "0"),
    ("\\chi", "inline", "0"),
    ("\\psi", "inline", "0"),
    ("\\omega", "inline", "0"),
    ("\\Gamma", "inline", "0"),
    ("\\Delta", "inline", "0"),
    ("\\Theta", "inline", "0"),
    ("\\Lambda", "inline", "0"),
    ("\\Xi", "inline", "0"),
    ("\\Pi", "inline", "0"),
    ("\\Sigma", "inline", "0"),
    ("\\Upsilon", "inline", "0"),
    ("\\Phi", "inline", "0"),
    ("\\Psi", "inline", "0"),
    ("\\Omega", "inline", "0"),
    # operators and relations
    ("\\times", "inline", "0"),
    ("\\div", "inline", "0"),
    ("\\cdot", "inline", "0"),
    ("\\pm", "inline", "0"),
    ("\\mp", "inline", "0"),
    ("\\approx", "inline", "0"),
    ("\\neq", "inline", "0"),
    ("\\ne", "inline", "0"),
    ("\\le", "inline", "0"),
    ("\\leq", "inline", "0"),
    ("\\ge", "inline", "0"),
    ("\\geq", "inline", "0"),
    ("\\ll", "inline", "0"),
    ("\\gg", "inline", "0"),
    ("\\sim", "inline", "0"),
    ("\\simeq", "inline", "0"),
    ("\\equiv", "inline", "0"),
    ("\\propto", "inline", "0"),
    ("\\to", "inline", "0"),
    ("\\rightarrow", "inline", "0"),
    ("\\leftarrow", "inline", "0"),
    ("\\Rightarrow", "inline", "0"),
    ("\\Leftarrow", "inline", "0"),
    ("\\leftrightarrow", "inline", "0"),
    ("\\Leftrightarrow", "inline", "0"),
    ("\\mapsto", "inline", "0"),
    ("\\infty", "inline", "0"),
    ("\\partial", "inline", "0"),
    ("\\nabla", "inline", "0"),
    ("\\in", "inline", "0"),
    ("\\notin", "inline", "0"),
    ("\\subset", "inline", "0"),
    ("\\subseteq", "inline", "0"),
    ("\\cup", "inline", "0"),
    ("\\cap", "inline", "0"),
    ("\\emptyset", "inline", "0"),
    ("\\forall", "inline", "0"),
    ("\\exists", "inline", "0"),
    ("\\neg", "inline", "0"),
    ("\\land", "inline", "0"),
    ("\\lor", "inline", "0"),
    ("\\ldots", "inline", "0"),
    ("\\cdots", "inline", "0"),
    ("\\dots", "inline", "0"),
    ("\\circ", "inline", "0"),
    ("\\bullet", "inline", "0"),
    ("\\ast", "inline", "0"),
    ("\\prime", "inline", "0"),
    ("\\%", "inline", "0"),
    ("\\$", "inline", "0"),
    # delimiters
    ("\\lvert", "inline", "delim"),
    ("\\rvert", "inline", "delim"),
    ("\\lVert", "inline", "delim"),
    ("\\rVert", "inline", "delim"),
    ("\\langle", "inline", "delim"),
    ("\\rangle", "inline", "delim"),
    ("\\lfloor", "inline", "delim"),
    ("\\rfloor", "inline", "delim"),
    ("\\lceil", "inline", "delim"),
    ("\\rceil", "inline", "delim"),
    ("\\{", "inline", "delim"),
    ("\\}", "inline", "delim"),
    ("\\|", "inline", "delim"),
    # large operators and functions
    ("\\sum", "inline", "op"),
    ("\\prod", "inline", "op"),
    ("\\int", "inline", "op"),
    ("\\lim", "inline", "op"),
    ("\\max", "inline", "op"),
    ("\\min", "inline", "op"),
    ("\\sup", "inline", "op"),
    ("\\inf", "inline", "op"),
    ("\\arg", "inline", "op"),
    ("\\log", "inline", "op"),
    ("\\ln", "inline", "op"),
    ("\\exp", "inline", "op"),
    ("\\sin", "inline", "op"),
    ("\\cos", "inline", "op"),
    ("\\tan", "inline", "op"),
    ("\\det", "inline", "op"),
    ("\\Pr", "inline", "op"),
    ("\\limits", "inline", "limits"),
    ("\\nolimits", "inline", "limits"),
    # commands with arguments
    ("\\sqrt", "inline", "opt1"),
    ("\\text", "inline", "text"),
    ("\\mathrm", "inline", "text"),
    ("\\operatorname", "inline", "text"),
    ("\\mathit", "inline", "1"),
    ("\\mathbf", "inline", "1"),
    ("\\hat", "inline", "1"),
    ("\\bar", "inline", "1"),
    ("\\tilde", "inline", "1"),
    ("\\vec", "inline", "1"),
    ("\\dot", "inline", "1"),
    ("\\ddot", "inline", "1"),
    ("\\left", "inline", "fence"),
    ("\\right", "inline", "fence"),
    # spacing
    ("\\,", "inline", "0"),
    ("\\;", "inline", "0"),
    ("\\:", "inline", "0"),
    ("\\!", "inline", "0"),
    ("\\quad", "inline", "0"),
    ("\\qquad", "inline", "0"),
    # display only
    ("\\frac", "display", "2"),
    ("\\tfrac", "display", "2"),
    ("\\dfrac", "display", "2"),
    ("\\binom", "display", "2"),
    ("\\begin{aligned}", "display", "env"),
    ("\\begin{cases}", "display", "env"),
    ("&", "display", "cell"),
    ("\\\\", "display", "cell"),
)

_TABLE = {command: (context, arity) for command, context, arity in ALLOWLIST}
_LETTERS = frozenset("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")
_ORDINARY = frozenset("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-*/=<>()[]|,.;:!?")
_CONTROL_SYMBOLS = frozenset(",;:! {}|%$_&\\")
_TEXT_FORBIDDEN = frozenset("\\{}$%#&^_~")
_DELIMITERS = frozenset("()[]|.")
_SPACE = " "
_NEWLINE = "\n"


class _Refused(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def _show(ch: str) -> str:
    """A character for a message: printable ASCII quoted, anything else as U+XXXX."""
    cp = ord(ch)
    return f"'{ch}'" if 0x21 <= cp <= 0x7E else f"U+{cp:04X}"


def _is_control(ch: str) -> bool:
    cp = ord(ch)
    return cp < 0x20 or 0x7F <= cp <= 0x9F


class _Checker:
    def __init__(self, tex: str, display: bool):
        self.s = list(tex)  # code points
        self.n = len(self.s)
        self.i = 0
        self.display = display

    # --- the reading head -------------------------------------------------

    def fail(self, code: str, message: str):
        raise _Refused(code, message)

    def peek(self) -> Optional[str]:
        return self.s[self.i] if self.i < self.n else None

    def skip_space(self) -> None:
        while self.i < self.n and self.s[self.i] in (_SPACE, _NEWLINE):
            self.i += 1

    def command_at(self, at: int) -> tuple[Optional[str], int]:
        """The control sequence starting at ``at`` (a backslash) and its end,
        or ``(None, at)`` when the backslash starts none."""
        if at + 1 >= self.n:
            return None, at
        nxt = self.s[at + 1]
        if nxt in _LETTERS:
            end = at + 1
            while end < self.n and self.s[end] in _LETTERS:
                end += 1
            return "\\" + "".join(self.s[at + 1:end]), end
        if nxt in _CONTROL_SYMBOLS:
            return "\\" + nxt, at + 2
        return None, at

    def read_command(self) -> str:
        name, end = self.command_at(self.i)
        if name is None:
            if self.i + 1 >= self.n:
                self.fail("math-syntax", "a lone \\ at the end")
            self.fail("math-syntax", f"unknown control symbol \\ followed by {_show(self.s[self.i + 1])}")
        self.i = end
        return name

    def peek_command(self) -> Optional[str]:
        if self.peek() != "\\":
            return None
        return self.command_at(self.i)[0]

    def lookup(self, name: str) -> str:
        row = _TABLE.get(name)
        if row is None:
            self.fail("math-command", f"{name} is not in the TeX allowlist")
        context, arity = row
        if context == "display" and not self.display:
            self.fail("math-command", f"{name} is display-only: inline math is one line (use a formula block)")
        return arity

    def bad_char(self, ch: str):
        if ch == "%":
            self.fail("math-syntax", "'%' starts a TeX comment: write \\% for a percent sign")
        if ch == "$":
            self.fail("math-syntax", "write \\$ for a dollar sign inside math")
        if ord(ch) > 0x7E:
            self.fail("math-syntax", f"{_show(ch)} is not ASCII: outside \\text{{}}, write symbols as commands "
                                     "(\\alpha, \\times)")
        self.fail("math-syntax", f"unexpected character {_show(ch)}")

    def enter(self, depth: int) -> None:
        if depth > MAX_DEPTH:
            self.fail("limit", f"TeX nests deeper than {MAX_DEPTH} levels")

    # --- the grammar ------------------------------------------------------

    def run(self) -> None:
        for ch in self.s:
            if _is_control(ch) and not (self.display and ch == _NEWLINE):
                self.fail("math-syntax", f"a control character ({_show(ch)}): in YAML, write TeX in a block "
                                         "scalar (|) or single quotes")
        if all(ch in (_SPACE, _NEWLINE) for ch in self.s):
            self.fail("math-syntax", "the formula is empty")
        self.expr("top", 0, None)

    def unclosed(self, ctx: str, env: Optional[str]):
        if ctx == "group":
            self.fail("math-syntax", "an unclosed {")
        if ctx == "opt":
            self.fail("math-syntax", "an unclosed [ (the optional argument of \\sqrt)")
        if ctx == "left":
            self.fail("math-syntax", "\\left without its \\right")
        self.fail("math-syntax", f"\\begin{{{env}}} has no \\end{{{env}}}")

    def expr(self, ctx: str, depth: int, env: Optional[str]) -> None:
        """A run of atoms up to ``ctx``'s end: the end of the TeX (``top``), ``}``
        (``group``), ``]`` (``opt``), ``\\right`` (``left``) or ``\\end`` (``env``),
        which is left for the caller to read."""
        while True:
            self.skip_space()
            ch = self.peek()
            if ch is None:
                if ctx == "top":
                    return
                self.unclosed(ctx, env)
            if ch == "}":
                if ctx == "group":
                    return
                if ctx == "top":
                    self.fail("math-syntax", "an unmatched }")
                self.unclosed(ctx, env)
            if ch == "]" and ctx == "opt":
                return
            name = self.peek_command()
            if name == "\\right":
                if ctx == "left":
                    return
                if ctx == "top":
                    self.fail("math-syntax", "\\right without its \\left")
                self.unclosed(ctx, env)
            if name == "\\end":
                if ctx == "env":
                    return
                if ctx == "top":
                    self.fail("math-syntax", "\\end without its \\begin")
                self.unclosed(ctx, env)
            if ch == "&" or name == "\\\\":
                self.cell(ctx)
                continue
            self.atom(ctx, depth)

    def cell(self, ctx: str) -> None:
        name = "&" if self.peek() == "&" else "\\\\"
        self.lookup(name)
        if ctx != "env":
            self.fail("math-command", f"{name} belongs directly inside aligned or cases")
        self.i += len(name)
        if name == "\\\\":
            self.skip_space()
            if self.peek() == "[":
                self.fail("math-syntax", "\\\\ followed by [ reads as a spacing argument: put {} between them")

    def atom(self, ctx: str, depth: int) -> None:
        ch = self.peek()
        op = False
        if ch in ("^", "_", "'"):
            pass  # a script on an empty base
        elif ch == "{":
            self.group(depth)
        elif ch == "\\":
            name = self.read_command()
            if name == "\\begin":
                self.environment(ctx, depth)
            else:
                arity = self.lookup(name)
                op = arity == "op"
                self.command(name, arity, ctx, depth)
        elif ch in _ORDINARY:
            self.i += 1
        else:
            self.bad_char(ch)
        self.scripts(op, ctx, depth)

    def command(self, name: str, arity: str, ctx: str, depth: int) -> None:
        if arity == "limits":
            self.fail("math-syntax", f"{name} must follow a large operator such as \\sum")
        if arity == "fence":  # \left (\right ends an expr before it gets here)
            self.delimiter(name)
            self.enter(depth + 1)
            self.expr("left", depth + 1, None)
            self.read_command()  # \right
            self.delimiter("\\right")
        elif arity in ("1", "2"):
            for _ in range(int(arity)):
                self.argument(name, ctx, depth)
        elif arity == "text":
            self.text_argument(name)
        elif arity == "opt1":
            self.skip_space()
            if self.peek() == "[":
                self.i += 1
                self.enter(depth + 1)
                self.expr("opt", depth + 1, None)
                self.i += 1  # ]
            self.argument(name, ctx, depth)

    def environment(self, ctx: str, depth: int) -> None:
        env = self.environment_name("\\begin")
        full = f"\\begin{{{env}}}"
        self.lookup(full)
        if ctx != "top":
            self.fail("math-syntax", f"{full} sits at the top level only")
        self.enter(depth + 1)
        self.expr("env", depth + 1, env)
        self.read_command()  # \end
        end = self.environment_name("\\end")
        if end != env:
            self.fail("math-syntax", f"{full} is closed by \\end{{{end}}}")

    def environment_name(self, cmd: str) -> str:
        self.skip_space()
        start = self.i
        if self.peek() == "{":
            self.i += 1
            begin = self.i
            while self.i < self.n and self.s[self.i] in _LETTERS:
                self.i += 1
            name = "".join(self.s[begin:self.i])
            if name and self.peek() == "}":
                self.i += 1
                return name
        self.i = start
        self.fail("math-syntax", f"{cmd} needs an environment name in braces, such as {{aligned}}")

    def delimiter(self, name: str) -> None:
        self.skip_space()
        ch = self.peek()
        if ch is not None and ch in _DELIMITERS:
            self.i += 1
            return
        if ch == "\\":
            dname = self.read_command()
            if self.lookup(dname) == "delim":
                return
            self.fail("math-syntax", f"{dname} is not a delimiter: {name} takes one of ( ) [ ] | . or a "
                                     "delimiter command such as \\lvert")
        self.fail("math-syntax", f"{name} needs a delimiter, such as ( or \\lvert or .")

    def argument(self, owner: str, ctx: str, depth: int) -> None:
        self.skip_space()
        ch = self.peek()
        if ch is None or ch in ("}", "^", "_", "&", "'") or (ch == "]" and ctx == "opt"):
            self.fail("math-syntax", f"{owner} is missing its argument")
        if ch == "{":
            self.group(depth)
            return
        if ch == "\\":
            name, _end = self.command_at(self.i)
            if name in ("\\right", "\\end", "\\\\"):
                self.fail("math-syntax", f"{owner} is missing its argument")
            name = self.read_command()
            if name == "\\begin":
                self.fail("math-syntax", f"\\begin needs braces to be the argument of {owner}")
            if self.lookup(name) in ("0", "delim"):
                return
            self.fail("math-syntax", f"{name} needs braces to be the argument of {owner}: write {{{name}…}}")
        if ch in _ORDINARY:
            self.i += 1
            return
        self.bad_char(ch)

    def text_argument(self, name: str) -> None:
        self.skip_space()
        if self.peek() != "{":
            self.fail("math-syntax", f"{name} needs a {{…}} argument")
        self.i += 1
        while True:
            ch = self.peek()
            if ch is None:
                self.fail("math-syntax", f"{name}{{ is not closed")
            if ch == "}":
                self.i += 1
                return
            if ch in _TEXT_FORBIDDEN or _is_control(ch):
                self.fail("math-syntax", f"{name}{{}} cannot hold {_show(ch)}")
            self.i += 1

    def group(self, depth: int) -> None:
        self.i += 1  # {
        self.enter(depth + 1)
        self.expr("group", depth + 1, None)
        self.i += 1  # }

    def scripts(self, op: bool, ctx: str, depth: int) -> None:
        sup = sub = False
        while True:
            self.skip_space()
            ch = self.peek()
            if ch == "^":
                if sup:
                    self.fail("math-syntax", "a double superscript: brace one (x^{a^b})")
                self.i += 1
                self.argument("^", ctx, depth)
                sup = True
            elif ch == "_":
                if sub:
                    self.fail("math-syntax", "a double subscript: brace one (x_{a_b})")
                self.i += 1
                self.argument("_", ctx, depth)
                sub = True
            elif ch == "'":
                if sup:
                    self.fail("math-syntax", "a double superscript: a prime after a superscript")
                while self.peek() == "'":
                    self.i += 1
                if self.peek() == "^":
                    self.i += 1
                    self.argument("^", ctx, depth)
                sup = True
            elif self.peek_command() in ("\\limits", "\\nolimits"):
                name = self.read_command()
                if not op:
                    self.fail("math-syntax", f"{name} must follow a large operator such as \\sum")
            else:
                return


def validate(tex: str, *, display: bool) -> Optional[tuple[str, str]]:
    """``None`` when ``tex`` is inside the subset, else ``(code, message)``."""
    limit = DISPLAY_MAX if display else INLINE_MAX
    size = len(tex)
    if size > limit:
        kind = "display" if display else "inline"
        return "limit", f"{kind} math is at most {limit} characters, this is {size}"
    try:
        _Checker(tex, display).run()
    except _Refused as exc:
        return exc.code, exc.message
    return None


def tokens(tex: str) -> list[str]:
    """``tex``'s tokens for the legend match: control sequences whole, every other
    character alone, spaces dropped, then each ``{`` + one token + ``}`` unwrapped
    (repeatedly, so ``{{i}}`` is ``i``)."""
    s = list(tex)
    out: list[str] = []
    i = 0
    while i < len(s):
        ch = s[i]
        if ch in (_SPACE, _NEWLINE):
            i += 1
        elif ch == "\\" and i + 1 < len(s) and s[i + 1] in _LETTERS:
            end = i + 1
            while end < len(s) and s[end] in _LETTERS:
                end += 1
            out.append("".join(s[i:end]))
            i = end
        elif ch == "\\" and i + 1 < len(s):
            out.append(ch + s[i + 1])
            i += 2
        else:
            out.append(ch)
            i += 1
    changed = True
    while changed:
        changed = False
        res: list[str] = []
        k = 0
        while k < len(out):
            if (out[k] == "{" and k + 2 < len(out) and out[k + 2] == "}"
                    and out[k + 1] not in ("{", "}")):
                res.append(out[k + 1])
                k += 3
                changed = True
            else:
                res.append(out[k])
                k += 1
        out = res
    return out


def occurs(sym: str, tex: str) -> bool:
    """True when ``sym``'s tokens occur, in a row, among ``tex``'s (``formula-legend``)."""
    want = tokens(sym)
    have = tokens(tex)
    m = len(want)
    return any(have[k:k + m] == want for k in range(len(have) - m + 1))


__all__ = ["ALLOWLIST", "DISPLAY_MAX", "INLINE_MAX", "MAX_DEPTH", "occurs", "tokens", "validate"]

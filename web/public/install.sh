#!/usr/bin/env bash
#
# knowledge-cli installer — served live at https://knowledge.hi2vi.com/install.sh
#
#   curl -fsSL https://knowledge.hi2vi.com/install.sh | bash
#
# Installs the `knowledge` CLI with uv (bootstrapping uv first if it is missing)
# from the canonical git-subdirectory channel — there is no PyPI package by
# design (D-P13-1). No sudo and no system files touched: uv installs the tool
# under ~/.local. Every step is echoed before it runs, and all logic lives inside
# main() with `main "$@"` as the last line, so a partially-downloaded
# `curl | bash` can never execute a half-written script.
set -euo pipefail

UV_BIN_DIR="$HOME/.local/bin"
INSTALL_TARGET="git+https://github.com/leetusik/knowledge#subdirectory=cli"

say() { printf '==> %s\n' "$1"; }
die() { printf 'error: %s\n' "$1" >&2; exit 1; }

main() {
  command -v curl >/dev/null 2>&1 \
    || die "curl is required but was not found on PATH."

  if ! command -v uv >/dev/null 2>&1; then
    say "uv not found — installing it via the official Astral installer."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$UV_BIN_DIR:$PATH"
    command -v uv >/dev/null 2>&1 \
      || die "uv still not on PATH after install — open a new shell (or add $UV_BIN_DIR to PATH) and re-run."
  fi
  say "uv: $(command -v uv)"

  say "Installing the knowledge CLI (upgrade-safe: re-run any time to update)."
  uv tool install --reinstall "$INSTALL_TARGET"

  # uv drops the console script in ~/.local/bin; make sure this shell can see it
  # for the version check even before a new login shell or `uv tool update-shell`.
  export PATH="$UV_BIN_DIR:$PATH"
  if command -v knowledge >/dev/null 2>&1; then
    say "installed: $(knowledge --version)"
  else
    printf 'note: %s\n' \
      "knowledge is installed but not yet on PATH — add $UV_BIN_DIR to PATH (or run 'uv tool update-shell'), then open a new shell." >&2
  fi

  say "Next: knowledge init --email you@example.com"
}

main "$@"

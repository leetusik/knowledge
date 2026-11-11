#!/bin/bash
# Install and load the Listen runner's LaunchAgent for this user. The operator runs it.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LABEL="com.knowledge.listen-runner"
DEST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/kb-listen-runner.log"

[ -x "$DIR/.venv/bin/python" ] || { echo "run 'uv sync' in $DIR first" >&2; exit 1; }
[ -f "$DIR/.env" ] || { echo "create $DIR/.env from env.example first" >&2; exit 1; }
grep -q '^KB_LISTEN_KEY=vk_' "$DIR/.env" || { echo "$DIR/.env needs KB_LISTEN_KEY=vk_..." >&2; exit 1; }
chmod 600 "$DIR/.env"

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
esc() { printf '%s' "$1" | sed -e 's/[&|\\]/\\&/g'; }
sed -e "s|@RUNNER_DIR@|$(esc "$DIR")|g" -e "s|@LOG@|$(esc "$LOG")|g" \
  "$DIR/launchd/$LABEL.plist.template" > "$DEST.tmp"
plutil -lint "$DEST.tmp" >/dev/null
mv "$DEST.tmp" "$DEST"

DOMAIN="gui/$(id -u)"
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
launchctl bootstrap "$DOMAIN" "$DEST"
echo "loaded $LABEL; logs: $LOG"

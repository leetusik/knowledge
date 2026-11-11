#!/bin/bash
# Stop and remove the Listen runner's LaunchAgent. The log file is kept.
set -euo pipefail
LABEL="com.knowledge.listen-runner"
DEST="$HOME/Library/LaunchAgents/$LABEL.plist"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
rm -f "$DEST"
echo "removed $LABEL"

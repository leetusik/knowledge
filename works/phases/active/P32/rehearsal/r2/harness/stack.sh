#!/bin/bash
# P32.S9 scratch stack: stack.sh <name> <port>  (legacy mode, no Gemini key, no push, token s9-token)
S9=/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s9
NAME="$1"; PORT="$2"
case "$PORT" in 8766|3030|8777|8797) echo "refusing port $PORT"; exit 2;; esac
mkdir -p "$S9/$NAME/kb" "$S9/$NAME/home"
cd /Users/sugang/projects/personal/knowledge
env -u DATABASE_URL -u GEMINI_API_KEY -u GOOGLE_API_KEY -u KB_GIT_PUSH -u KB_API_BASE_URL \
  KB_ROOT="$S9/$NAME/kb" KB_API_TOKEN=s9-token KB_STARTUP_REINDEX=0 HOME="$S9/$NAME/home" \
  .venv/bin/python -m uvicorn server.main:app --host 127.0.0.1 --port "$PORT" > "$S9/$NAME/server.log" 2>&1 &
echo $! > "$S9/$NAME/server.pid"
echo "started $NAME on $PORT pid $(cat "$S9/$NAME/server.pid")"

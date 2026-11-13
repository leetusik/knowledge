#!/bin/bash
# P32.F1 scratch stack: stack.sh <name> <port>  (legacy mode, no Gemini key, no push, token f1-token)
F1=/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/f1
NAME="$1"; PORT="$2"
case "$PORT" in 8766|3030|8777|8797) echo "refusing port $PORT"; exit 2;; esac
cd /Users/sugang/projects/personal/knowledge
env -u DATABASE_URL -u GEMINI_API_KEY -u GOOGLE_API_KEY -u KB_GIT_PUSH -u KB_API_BASE_URL \
  KB_ROOT="$F1/$NAME/kb" KB_API_TOKEN=f1-token KB_STARTUP_REINDEX=0 HOME="$F1/$NAME/home" \
  .venv/bin/python -m uvicorn server.main:app --host 127.0.0.1 --port "$PORT" > "$F1/$NAME/server.log" 2>&1 &
echo $! > "$F1/$NAME/server.pid"
echo "started $NAME on $PORT pid $(cat "$F1/$NAME/server.pid")"

#!/bin/bash
SP=/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/e7ea5b44-3c7d-4e6d-8ebc-268a3e5a2b8a/scratchpad/s27
cd /Users/sugang/projects/personal/knowledge
ROOT=$SP/root
KB_ROOT=$ROOT KB_DB_PATH=$ROOT/data/kb.sqlite3 DATABASE_URL=postgresql+psycopg://kb:kb@127.0.0.1:55432/kb_s27live KB_PUBLIC_BASE_URL=http://127.0.0.1:3911 nohup .venv/bin/uvicorn server.main:app --host 127.0.0.1 --port 8911 >> $SP/api.log 2>&1 &
echo $! > $SP/api.pid
for i in 1 2 3 4 5 6 7 8 9 10; do sleep 1; curl -s -o /dev/null http://127.0.0.1:8911/healthz && break; done

#!/bin/bash
set -e

PROJECT_DIR="/Users/user/Desktop/AI Business Analytics Assistant"
BACKEND_LOG="/tmp/analytics_backend.log"
FRONTEND_LOG="/tmp/analytics_frontend.log"
UVICORN="$PROJECT_DIR/backend/venv/bin/uvicorn"
NPM="/usr/local/bin/npm"

# Kill any existing instances
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1

echo "Starting backend..."
cd "$PROJECT_DIR/backend"
"$UVICORN" main:app --reload --port 8001 > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

echo "Waiting for backend..."
for i in $(seq 1 20); do
  if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "Backend ready."
    break
  fi
  sleep 1
done

echo "Starting frontend..."
cd "$PROJECT_DIR/frontend"
"$NPM" run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

echo "Waiting for frontend..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|307"; then
    break
  fi
  sleep 1
done

echo ""
echo "App running:"
echo "  Frontend → http://localhost:3000"
echo "  Backend  → http://localhost:8001"
echo "  API Docs → http://localhost:8001/api/docs"
echo ""
echo "Login: admin@analytics.com / Admin@123"
echo ""
echo "Press Ctrl+C to stop."

open http://localhost:3000 2>/dev/null || true

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'; exit 0" INT TERM
wait $BACKEND_PID $FRONTEND_PID

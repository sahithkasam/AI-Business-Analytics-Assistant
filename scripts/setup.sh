#!/bin/bash
# ============================================================
# AI Business Analytics Assistant — Local Setup Script
# ============================================================
set -e

echo ""
echo "🚀 Setting up AI Business Analytics Assistant..."
echo ""

# Check prerequisites
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "❌ PostgreSQL client is required"; exit 1; }

# Backend setup
echo "📦 Setting up Python backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q

# Copy env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Created backend/.env — please add your GROQ_API_KEY"
fi

echo ""
echo "🗃️  Setting up database..."
# Create database if it doesn't exist
psql -U postgres -c "CREATE DATABASE analytics_db;" 2>/dev/null || echo "  Database already exists"
psql -U postgres -d analytics_db -f database/schema.sql
psql -U postgres -d analytics_db -f database/seed.sql

cd ..

# Frontend setup
echo ""
echo "⚛️  Setting up Next.js frontend..."
cd frontend

if [ ! -f .env.local ]; then
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
fi

npm install --legacy-peer-deps
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  Backend:  cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Demo credentials:"
echo "  Admin:   admin@analytics.com / Admin@123"
echo "  Analyst: analyst@analytics.com / Admin@123"
echo "  Viewer:  viewer@analytics.com / Admin@123"
echo ""

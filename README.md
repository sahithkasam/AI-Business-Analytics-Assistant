# AI Business Analytics Assistant

I built this project to solve a problem I kept running into — spending way too much time writing SQL queries just to get basic business insights. The idea is simple: you type a question in plain English, and the system figures out the SQL, runs it, and gives you a chart plus a short business summary.

It's a full-stack app with a FastAPI backend, Next.js frontend, and PostgreSQL. The AI layer uses OpenAI GPT-4.1 to handle the natural language → SQL conversion.

---

## What it does

- You ask something like *"show me top customers by revenue this quarter"* and it generates the SQL, runs it, and renders the right chart automatically
- If the generated SQL breaks, it retries with the error context (up to 2 attempts) — this alone saves a lot of headaches
- Every result comes with a plain-English explanation of the query and a short business insight
- Supports streaming responses so the UI feels fast even for heavy queries
- You can export any result as CSV or PDF

### Dashboard

There's also a pre-built dashboard with KPI cards, a 12-month revenue chart, category breakdown, order trends, and a top-customers leaderboard. Mostly useful as a starting point or to demo the app.

### Auth & roles

JWT-based login with three roles: `admin`, `analyst`, `viewer`. The SQL execution is locked down to SELECT-only with injection prevention and a 30-second statement timeout.

---

## Tech stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, Recharts, Zustand
- **Backend:** FastAPI (Python 3.12), SQLAlchemy 2.0 async
- **AI:** OpenAI GPT-4.1
- **Database:** PostgreSQL 16
- **Auth:** JWT with python-jose + passlib
- **Export:** ReportLab for PDFs
- **Infra:** Docker + Docker Compose

---

## Getting started

### Docker (easiest way)

```bash
git clone https://github.com/sahithkasam/AI-Business-Analytics-Assistant.git
cd "AI Business Analytics Assistant"

# Add your OpenAI key
export OPENAI_API_KEY=sk-your-key-here

docker compose up --build
```

Then open http://localhost:3000.

### Running locally

You'll need Python 3.12+, Node.js 22+, and PostgreSQL 16.

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Environment setup

`backend/.env`:
```
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4.1
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/analytics_db
SECRET_KEY=your-secret-key-at-least-32-chars
ALLOWED_ORIGINS=["http://localhost:3000"]
```

`frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@analytics.com | Admin@123 |
| Analyst | analyst@analytics.com | Admin@123 |
| Viewer | viewer@analytics.com | Admin@123 |

---

## Example queries to try

```
Show me monthly revenue for this year
Top 5 customers by lifetime value
Which product category had the best month?
Compare sales by country
Average order value over the last 6 months
Payment method breakdown for completed orders
```

---

## API docs

Start the backend and go to:
- http://localhost:8000/api/docs (Swagger)
- http://localhost:8000/api/redoc

Main endpoints:

| Method | Endpoint | What it does |
|--------|----------|--------------|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/query/ask` | Run a natural language query |
| POST | `/api/v1/query/ask/stream` | Same but streamed |
| GET | `/api/v1/dashboard/kpis` | Dashboard KPI data |
| GET | `/api/v1/history` | Query history |
| POST | `/api/v1/export/csv` | Export as CSV |
| POST | `/api/v1/export/pdf` | Export as PDF |

---

## How the AI pipeline works

1. Pulls the live schema from PostgreSQL so the model knows what tables exist
2. Builds a few-shot prompt and sends it to GPT-4.1
3. Validates the generated SQL (SELECT-only, no dangerous keywords, no system tables)
4. Executes it with a timeout
5. If it fails, sends the error back to the model for a corrected query
6. Generates a plain-English explanation + chart type recommendation + business insight
7. Saves everything to query history

---

## Database schema

```
customers → orders → order_items → products
                  ↓
              payments
employees → departments
```

The seed data has 300+ realistic orders so the charts actually look useful out of the box.

---

## License

MIT

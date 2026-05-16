# AI Business Analytics Assistant

A production-quality, full-stack AI Business Intelligence platform where users interact with databases using natural language and receive SQL results, interactive charts, and intelligent business insights.

## Features

### Core Capabilities
- **Natural Language to SQL** — Ask questions in plain English; GPT-4.1 generates optimized PostgreSQL queries
- **Auto SQL Correction** — If a query fails, the AI automatically debugs and retries (up to 2 attempts)
- **Interactive Charts** — Auto-selects chart type (line, bar, pie, area, scatter, table) based on data shape
- **AI Business Insights** — Executive-level insights generated after every query
- **SQL Explanation** — Plain-English explanation of every generated query
- **Streaming AI Responses** — Real-time SSE streaming for the query pipeline
- **CSV & PDF Export** — Export any query result with one click

### Authentication & Security
- JWT-based authentication (access + refresh tokens)
- Role-Based Access Control: `admin`, `analyst`, `viewer`
- SQL safety layer: SELECT-only, injection prevention, statement timeouts, row limits
- Rate limiting middleware (100 req/min per IP)

### Dashboard
- KPI overview cards with month-over-month change indicators
- Revenue trend (12-month area chart)
- Product category breakdown (pie/donut chart)
- Monthly orders bar chart
- Top customers leaderboard
- Dark / Light mode toggle

### Data Management
- Query history with pagination and full-text SQL viewer
- Favorite queries (star/unstar)
- Re-run any historical query
- Analytics Explorer with preset quick queries

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Charts | Recharts |
| State | Zustand |
| Backend | FastAPI (Python 3.12) |
| AI | OpenAI GPT-4.1 |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2.0 (async) |
| Auth | JWT (python-jose + passlib) |
| Cache | Redis (optional) |
| Export | ReportLab (PDF) |
| Deploy | Docker + Docker Compose |

## Project Structure

```
AI Business Analytics Assistant/
├── backend/
│   ├── ai/
│   │   ├── prompts.py          # Few-shot prompt templates
│   │   ├── schema_inspector.py # Live DB schema for AI context
│   │   └── sql_engine.py       # Full AI pipeline (generate → validate → execute → correct → insights)
│   ├── config/
│   │   └── settings.py         # Pydantic settings (env vars)
│   ├── database/
│   │   ├── connection.py       # Async SQLAlchemy engine
│   │   ├── schema.sql          # PostgreSQL schema
│   │   └── seed.sql            # Realistic sample data (300+ orders)
│   ├── middleware/
│   │   └── rate_limiter.py
│   ├── models/
│   │   ├── analytics.py        # QueryHistory, SavedQuery, APIUsageLog
│   │   └── user.py             # User model with roles
│   ├── routes/
│   │   ├── auth.py             # Login, register, refresh, /me
│   │   ├── dashboard.py        # KPIs, revenue trend, category breakdown
│   │   ├── export.py           # CSV and PDF export
│   │   ├── history.py          # Query history CRUD
│   │   └── query.py            # /ask and /ask/stream endpoints
│   ├── services/
│   │   └── schemas.py          # All Pydantic request/response models
│   ├── utils/
│   │   ├── security.py         # JWT helpers, password hashing, RBAC deps
│   │   └── sql_executor.py     # Safe async SQL execution
│   ├── main.py                 # FastAPI app with lifespan, middleware
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx   # Sidebar + header shell
│   │   │       ├── page.tsx     # Overview dashboard
│   │   │       ├── chat/        # AI Chat interface
│   │   │       ├── history/     # Query history
│   │   │       ├── favorites/   # Starred queries
│   │   │       └── analytics/   # Analytics explorer
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   │   └── ChartRenderer.tsx  # Universal chart component
│   │   │   └── dashboard/
│   │   │       ├── Header.tsx
│   │   │       ├── KPICard.tsx
│   │   │       └── Sidebar.tsx
│   │   ├── lib/
│   │   │   ├── api.ts           # Axios client with JWT interceptor
│   │   │   └── utils.ts         # Formatters, cn(), debounce
│   │   ├── store/
│   │   │   ├── useAuthStore.ts  # Zustand auth state
│   │   │   └── useUIStore.ts    # Theme + sidebar state
│   │   └── types/index.ts
│   ├── package.json
│   ├── tailwind.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── scripts/setup.sh
└── README.md
```

## Quick Start

### Option A: Docker (Recommended)

```bash
# Clone and configure
git clone <repo-url>
cd "AI Business Analytics Assistant"

# Set your OpenAI API key
export OPENAI_API_KEY=sk-your-key-here

# Start all services
docker compose up --build

# Access the app
open http://localhost:3000
```

### Option B: Local Development

**Prerequisites:** Python 3.12+, Node.js 22+, PostgreSQL 16+

```bash
# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start backend (in one terminal)
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Start frontend (in another terminal)
cd frontend
npm run dev
```

### Environment Variables

Create `backend/.env`:

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4.1
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/analytics_db
SECRET_KEY=your-secret-key-at-least-32-chars
ALLOWED_ORIGINS=["http://localhost:3000"]
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@analytics.com | Admin@123 |
| Analyst | analyst@analytics.com | Admin@123 |
| Viewer | viewer@analytics.com | Admin@123 |

## API Documentation

After starting the backend, visit:
- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login and get JWT tokens |
| POST | `/api/v1/auth/register` | Create new account |
| POST | `/api/v1/query/ask` | Natural language query (sync) |
| POST | `/api/v1/query/ask/stream` | Natural language query (SSE stream) |
| GET | `/api/v1/dashboard/kpis` | Dashboard KPI cards |
| GET | `/api/v1/dashboard/revenue-trend` | Monthly revenue chart data |
| GET | `/api/v1/history` | Paginated query history |
| POST | `/api/v1/export/csv` | Export result as CSV |
| POST | `/api/v1/export/pdf` | Export result as PDF report |

## Example Natural Language Queries

```
"Show me monthly revenue growth for this year"
"Top 5 customers by lifetime value"
"Compare sales across product categories"
"Which department has the highest budget?"
"Revenue breakdown by country and customer type"
"Best selling products this month by units"
"Average order value trend over the past 6 months"
"Payment method distribution for completed orders"
```

## Database Schema

```
customers    → orders → order_items → products
                     ↓
                 payments
employees → departments
```

**Tables:** customers, products, orders, order_items, employees, departments, payments

## SQL Safety

All AI-generated SQL goes through multi-layer validation:
1. Must start with `SELECT` or `WITH` (CTE)
2. Blocked keywords: `INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER, CREATE, GRANT, EXEC`
3. No SQL comments (`--`, `/*`)
4. No multiple statements (`;` banned mid-query)
5. System table access blocked (`pg_`, `information_schema`)
6. Statement timeout enforced at PostgreSQL level (30s default)
7. Row limit applied to all results (10,000 default)

## Architecture

```
User → Next.js → FastAPI → AI Pipeline → PostgreSQL
                     ↓           ↓
                  Redis       OpenAI GPT-4.1
                (caching)
```

**AI Pipeline flow:**
1. Fetch live schema from PostgreSQL
2. Build few-shot prompt with schema context
3. Call GPT-4.1 to generate SQL
4. Validate SQL for safety
5. Execute on PostgreSQL with timeout
6. If error → send error + SQL back to GPT-4.1 for correction (up to 2 retries)
7. Generate plain-English explanation
8. Recommend chart type based on column shapes
9. Generate business insights from the result data
10. Persist to query history

## License

MIT

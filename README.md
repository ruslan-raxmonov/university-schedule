# University Digital Schedule

Digital university timetable platform: Telegram Bot, Telegram Mini App, Admin Panel, FastAPI backend, PostgreSQL.

## Structure

```
university-schedule/
├── apps/web/          # Next.js — Student Mini App + Admin Panel
├── apps/bot/          # Telegram bot (aiogram)
├── backend/           # FastAPI API
├── database/          # Postgres init
├── docker-compose.yml
└── docs/
```

## Quick start (local)

```bash
cp .env.example .env
docker compose up -d postgres
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# alembic upgrade head && python -m app.scripts.seed  # when migrations/seed are ready
uvicorn app.main:app --reload --port 8000

cd apps/web && npm install && npm run dev
```

- Mini App / Student UI: http://localhost:3000
- Admin login: http://localhost:3000/admin/login
- API docs: http://localhost:8000/docs

## Vercel

Frontend deploys from `apps/web`. Set env:

- `NEXT_PUBLIC_API_URL` — public URL of your FastAPI backend

Backend (FastAPI + Postgres + Bot) is not hosted on Vercel — run via Docker / Railway / Render / VPS.

## Demo credentials

Set in `.env` (seeded admin):

- `ADMIN_EMAIL` / `ADMIN_PASSWORD`

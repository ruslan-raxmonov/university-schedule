.PHONY: help dev db up down migrate seed test lint backend-install web-install bot-install

help:
	@echo "University Digital Schedule — common commands"
	@echo ""
	@echo "  make up            Start Postgres via docker-compose"
	@echo "  make down          Stop docker-compose services"
	@echo "  make migrate       Run Alembic migrations"
	@echo "  make seed          Seed DEMO data"
	@echo "  make backend       Run FastAPI (uvicorn)"
	@echo "  make web           Run Next.js web app"
	@echo "  make bot           Run Telegram bot"
	@echo "  make test          Run backend tests"
	@echo "  make install       Install backend + web deps"
	@echo "  make dev           Start db + migrate + seed (prep)"

up:
	docker compose up -d postgres

down:
	docker compose down

db: up

migrate:
	cd backend && PYTHONPATH=. alembic upgrade head

seed:
	cd backend && PYTHONPATH=. python -m app.scripts.seed

backend:
	cd backend && PYTHONPATH=. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

web:
	cd apps/web && npm run dev

bot:
	cd apps/bot && PYTHONPATH=../../backend:. python -m bot.main

test:
	cd backend && PYTHONPATH=. pytest -q

install:
	cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	cd apps/web && npm install
	cd apps/bot && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt

dev: up
	@echo "Waiting for Postgres..."
	@sleep 3
	@$(MAKE) migrate
	@$(MAKE) seed
	@echo "Ready. Run: make backend | make web | make bot (in separate terminals)"

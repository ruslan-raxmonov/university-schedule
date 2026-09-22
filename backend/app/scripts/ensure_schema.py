"""Ensure new columns exist on older DEMO databases."""

from sqlalchemy import text

from app.core.database import engine


async def ensure_schema() -> None:
    statements = [
        "ALTER TABLE teachers ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE",
        "ALTER TABLE teachers ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255)",
        "CREATE INDEX IF NOT EXISTS ix_teachers_telegram_id ON teachers (telegram_id)",
    ]
    async with engine.begin() as conn:
        for stmt in statements:
            await conn.execute(text(stmt))

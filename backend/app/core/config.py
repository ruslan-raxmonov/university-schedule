"""Application settings loaded from environment variables."""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(
        default="postgresql+asyncpg://schedule:schedule_dev_password@localhost:5432/university_schedule",
        alias="DATABASE_URL",
    )

    backend_host: str = Field(default="0.0.0.0", alias="BACKEND_HOST")
    backend_port: int = Field(default=8000, alias="BACKEND_PORT")
    backend_url: str = Field(default="http://localhost:8000", alias="BACKEND_URL")
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,https://university-schedule-neon.vercel.app",
        alias="CORS_ORIGINS",
    )

    jwt_secret: str = Field(default="dev-secret-change-me", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(default=60 * 24 * 7, alias="JWT_EXPIRE_MINUTES")
    admin_jwt_expire_minutes: int = Field(default=480, alias="ADMIN_JWT_EXPIRE_MINUTES")

    environment: str = Field(default="development", alias="ENVIRONMENT")
    debug: bool = Field(default=True, alias="DEBUG")
    rate_limit_per_minute: int = Field(default=120, alias="RATE_LIMIT_PER_MINUTE")

    admin_email: str = Field(default="admin@university.local", alias="ADMIN_EMAIL")
    admin_password: str = Field(default="Admin123!ChangeMe", alias="ADMIN_PASSWORD")
    admin_full_name: str = Field(default="System Administrator", alias="ADMIN_FULL_NAME")

    bot_token: str = Field(default="", alias="BOT_TOKEN")
    telegram_bot_username: str = Field(default="", alias="TELEGRAM_BOT_USERNAME")
    mini_app_url: str = Field(default="http://localhost:3000", alias="MINI_APP_URL")
    telegram_auth_bypass: bool = Field(default=False, alias="TELEGRAM_AUTH_BYPASS")

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_development(self) -> bool:
        return self.environment.lower() in {"development", "dev", "local"}


@lru_cache
def get_settings() -> Settings:
    return Settings()

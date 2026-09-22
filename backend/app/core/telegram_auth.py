"""Telegram WebApp initData validation (HMAC-SHA256)."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any, Optional
from urllib.parse import parse_qsl

from app.core.config import get_settings
from app.core.responses import AppError


def validate_telegram_init_data(
    init_data: str,
    *,
    max_age_seconds: int = 86400,
) -> dict[str, Any]:
    """
    Validate Telegram Mini App initData per official docs.
    Returns parsed data including nested `user` object.
    """
    settings = get_settings()

    if not init_data or not init_data.strip():
        raise AppError("init_data is required", status_code=401)

    # Local development bypass — never use in production.
    if settings.telegram_auth_bypass and settings.is_development:
        return _parse_bypass(init_data)

    if not settings.bot_token:
        raise AppError("BOT_TOKEN is not configured", status_code=500)

    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise AppError("Missing hash in init_data", status_code=401)

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
    secret_key = hmac.new(
        b"WebAppData",
        settings.bot_token.encode(),
        hashlib.sha256,
    ).digest()
    computed = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed, received_hash):
        raise AppError("Invalid Telegram initData signature", status_code=401)

    auth_date = int(parsed.get("auth_date", "0"))
    if auth_date and max_age_seconds:
        if time.time() - auth_date > max_age_seconds:
            raise AppError("Telegram initData expired", status_code=401)

    user_raw = parsed.get("user")
    user: Optional[dict[str, Any]] = None
    if user_raw:
        try:
            user = json.loads(user_raw)
        except json.JSONDecodeError as exc:
            raise AppError("Invalid user payload in init_data", status_code=401) from exc

    if not user or "id" not in user:
        raise AppError("Telegram user missing in init_data", status_code=401)

    return {
        "user": user,
        "auth_date": auth_date,
        "query_id": parsed.get("query_id"),
        "raw": parsed,
    }


def _parse_bypass(init_data: str) -> dict[str, Any]:
    """Parse init_data without signature for local UI testing."""
    try:
        if init_data.strip().startswith("{"):
            payload = json.loads(init_data)
            user = payload.get("user") or payload
        else:
            parsed = dict(parse_qsl(init_data, keep_blank_values=True))
            user = json.loads(parsed.get("user", "{}")) if parsed.get("user") else None
            if not user:
                # Allow simple form: telegram_id=123&full_name=Test
                user = {
                    "id": int(parsed.get("telegram_id") or parsed.get("id") or "100001"),
                    "username": parsed.get("username", "demo_student"),
                    "first_name": parsed.get("first_name", "Demo"),
                    "last_name": parsed.get("last_name", "Student"),
                }
    except (json.JSONDecodeError, ValueError, TypeError) as exc:
        raise AppError("Invalid bypass init_data", status_code=401) from exc

    if not user or "id" not in user:
        raise AppError("Bypass init_data must include user.id", status_code=401)

    return {"user": user, "auth_date": int(time.time()), "query_id": None, "raw": {}}

"""Renessans | Schedule — Telegram bot (aiogram 3)."""

from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

from bot.config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("renessans-bot")


def main_keyboard(mini_app_url: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(
                    text="📅 Dars jadvalim",
                    web_app=WebAppInfo(url=mini_app_url),
                )
            ],
            [
                KeyboardButton(text="🔎 Qidirish"),
                KeyboardButton(text="🔔 O‘zgarishlar"),
            ],
            [KeyboardButton(text="⚙️ Sozlamalar")],
        ],
        resize_keyboard=True,
    )


async def cmd_start(message: Message, mini_app_url: str) -> None:
    name = message.from_user.first_name if message.from_user else "talaba"
    await message.answer(
        f"Assalomu alaykum, {name}! 👋\n\n"
        "Renessans Ta’lim Universiteti dars jadvalingizni bir joydan ko‘ring.",
        reply_markup=main_keyboard(mini_app_url),
    )
    await message.answer(
        "📅 Dars jadvalini ochish uchun pastdagi tugmani bosing.",
        reply_markup=main_keyboard(mini_app_url),
    )


async def cmd_help(message: Message) -> None:
    await message.answer(
        "Yordam:\n"
        "• 📅 Dars jadvalim — Mini Appni ochadi\n"
        "• 🔎 Qidirish — fan / o‘qituvchi / xona\n"
        "• 🔔 O‘zgarishlar — bildirishnomalar\n"
        "• ⚙️ Sozlamalar — guruh va profil\n\n"
        "Texnik savollar uchun universitet IT bo‘limiga murojaat qiling."
    )


async def open_hint(message: Message, mini_app_url: str) -> None:
    await message.answer(
        "Mini Appni ochish uchun «📅 Dars jadvalim» tugmasini bosing.",
        reply_markup=main_keyboard(mini_app_url),
    )


async def main() -> None:
    settings = get_settings()
    if not settings.bot_token:
        raise RuntimeError("BOT_TOKEN is missing in .env")

    bot = Bot(token=settings.bot_token)
    dp = Dispatcher()
    mini = settings.mini_app_url.rstrip("/")

    @dp.message(CommandStart())
    async def _start(message: Message) -> None:
        await cmd_start(message, mini)

    @dp.message(Command("help"))
    async def _help(message: Message) -> None:
        await cmd_help(message)

    @dp.message(F.text == "📅 Dars jadvalim")
    async def _schedule(message: Message) -> None:
        # WebApp button opens Mini App; this is a fallback hint.
        await open_hint(message, mini)

    @dp.message(F.text == "🔎 Qidirish")
    async def _search(message: Message) -> None:
        await message.answer(
            "Qidiruv Mini App ichida mavjud. «📅 Dars jadvalim» → Qidiruv.",
            reply_markup=main_keyboard(mini),
        )

    @dp.message(F.text == "🔔 O‘zgarishlar")
    async def _notif(message: Message) -> None:
        await message.answer(
            "O‘zgarishlar Mini App → Bildirishnomalar bo‘limida.",
            reply_markup=main_keyboard(mini),
        )

    @dp.message(F.text == "⚙️ Sozlamalar")
    async def _settings(message: Message) -> None:
        await message.answer(
            "Sozlamalar Mini App → Profil orqali ochiladi.",
            reply_markup=main_keyboard(mini),
        )

    me = await bot.get_me()
    logger.info("Bot started as @%s → Mini App %s", me.username, mini)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())

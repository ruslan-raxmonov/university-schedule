"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException

from app.api.v1.router import router as v1_router
from app.core.config import get_settings
from app.core.responses import AppError, app_error_handler, http_exception_handler, unhandled_exception_handler

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(
    title="University Digital Schedule API",
    version="1.0.0",
    description="Production MVP API for university timetable + Telegram Mini App",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(v1_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"success": True, "data": {"status": "ok"}, "message": None}

"""Shared response envelopes and exceptions."""

from typing import Any, Generic, Optional, TypeVar

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None


class PaginatedData(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class AppError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        data: Any = None,
    ):
        self.message = message
        self.status_code = status_code
        self.data = data
        super().__init__(message)


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "data": exc.data,
            "message": exc.message,
        },
    )


async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict):
        message = detail.get("message") or str(detail)
        data = detail.get("data")
    else:
        message = str(detail)
        data = None
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "data": data, "message": message},
    )


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    # Log details server-side; never expose stack traces to clients.
    import logging

    logging.getLogger("uvicorn.error").exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "data": None,
            "message": "Ichki server xatosi yuz berdi.",
        },
    )


def ok(data: Any = None, message: Optional[str] = None) -> dict[str, Any]:
    return {"success": True, "data": data, "message": message}

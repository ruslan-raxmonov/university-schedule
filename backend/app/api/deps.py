"""FastAPI dependencies for auth and RBAC."""

from typing import Annotated, Optional

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.responses import AppError
from app.core.security import decode_access_token
from app.models import AdminRole, AdminUser, Group, Student

bearer = HTTPBearer(auto_error=False)
DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_student(
    db: DbSession,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)] = None,
    authorization: Annotated[Optional[str], Header()] = None,
) -> Student:
    token = _extract_token(credentials, authorization)
    payload = decode_access_token(token)
    if payload.get("type") != "student":
        raise AppError("Student authentication required", status_code=401)
    student_id = int(payload["sub"])
    result = await db.execute(
        select(Student)
        .options(selectinload(Student.group).selectinload(Group.faculty))
        .where(Student.id == student_id, Student.is_active.is_(True))
    )
    student = result.scalar_one_or_none()
    if not student:
        raise AppError("Student not found", status_code=401)
    return student


async def get_current_admin(
    db: DbSession,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)] = None,
    authorization: Annotated[Optional[str], Header()] = None,
) -> AdminUser:
    token = _extract_token(credentials, authorization)
    payload = decode_access_token(token)
    if payload.get("type") != "admin":
        raise AppError("Admin authentication required", status_code=401)
    admin_id = int(payload["sub"])
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == admin_id, AdminUser.is_active.is_(True))
    )
    admin = result.scalar_one_or_none()
    if not admin:
        raise AppError("Admin not found", status_code=401)
    return admin


def require_roles(*roles: AdminRole):
    async def _checker(admin: Annotated[AdminUser, Depends(get_current_admin)]) -> AdminUser:
        if admin.role == AdminRole.super_admin:
            return admin
        if admin.role not in roles:
            raise AppError("Insufficient permissions", status_code=403)
        return admin

    return _checker


CanSchedule = Annotated[
    AdminUser,
    Depends(require_roles(AdminRole.super_admin, AdminRole.scheduler, AdminRole.editor)),
]
CanEditEntities = Annotated[
    AdminUser,
    Depends(require_roles(AdminRole.super_admin, AdminRole.editor, AdminRole.scheduler)),
]
CanViewAdmin = Annotated[
    AdminUser,
    Depends(
        require_roles(
            AdminRole.super_admin,
            AdminRole.scheduler,
            AdminRole.editor,
            AdminRole.viewer,
        )
    ),
]
CurrentStudent = Annotated[Student, Depends(get_current_student)]
CurrentAdmin = Annotated[AdminUser, Depends(get_current_admin)]


def _extract_token(
    credentials: Optional[HTTPAuthorizationCredentials],
    authorization: Optional[str],
) -> str:
    if credentials and credentials.credentials:
        return credentials.credentials
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    raise AppError("Not authenticated", status_code=401)

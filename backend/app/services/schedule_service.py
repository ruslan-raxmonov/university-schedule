"""Schedule CRUD with conflict checks and notification hooks."""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.responses import AppError
from app.models import LessonStatus, Schedule, ScheduleChange
from app.schemas import ScheduleCreate, ScheduleUpdate
from app.services.audit import write_audit
from app.services.conflicts import detect_conflicts
from app.services.notifications import notify_schedule_update

SCHEDULE_LOAD = (
    selectinload(Schedule.group),
    selectinload(Schedule.subject),
    selectinload(Schedule.teacher),
    selectinload(Schedule.room),
)


def _snapshot(schedule: Schedule) -> dict[str, Any]:
    return {
        "group_id": schedule.group_id,
        "subject_id": schedule.subject_id,
        "teacher_id": schedule.teacher_id,
        "room_id": schedule.room_id,
        "date": str(schedule.date),
        "start_time": schedule.start_time.strftime("%H:%M"),
        "end_time": schedule.end_time.strftime("%H:%M"),
        "lesson_type": schedule.lesson_type.value if schedule.lesson_type else None,
        "status": schedule.status.value if schedule.status else None,
        "notes": schedule.notes,
    }


async def get_schedule(db: AsyncSession, schedule_id: int) -> Schedule:
    result = await db.execute(
        select(Schedule).options(*SCHEDULE_LOAD).where(Schedule.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise AppError("Schedule not found", status_code=404)
    return schedule


async def create_schedule(
    db: AsyncSession,
    data: ScheduleCreate,
    *,
    admin_id: Optional[int] = None,
) -> Schedule:
    conflicts = await detect_conflicts(
        db,
        group_id=data.group_id,
        teacher_id=data.teacher_id,
        room_id=data.room_id,
        schedule_date=data.date,
        start_time=data.start_time,
        end_time=data.end_time,
    )
    if conflicts and not data.force:
        raise AppError(
            "⚠️ Conflict detected",
            status_code=409,
            data={"conflicts": [c.model_dump() for c in conflicts]},
        )

    schedule = Schedule(
        group_id=data.group_id,
        subject_id=data.subject_id,
        teacher_id=data.teacher_id,
        room_id=data.room_id,
        date=data.date,
        start_time=data.start_time,
        end_time=data.end_time,
        lesson_type=data.lesson_type,
        status=data.status,
        notes=data.notes,
    )
    db.add(schedule)
    await db.flush()

    change = ScheduleChange(
        schedule_id=schedule.id,
        change_type="created",
        old_value=None,
        new_value=_snapshot(schedule),
        reason=data.reason,
        changed_by=admin_id,
    )
    db.add(change)
    await write_audit(
        db,
        admin_user_id=admin_id,
        action="created_schedule",
        entity_type="schedule",
        entity_id=schedule.id,
        metadata={"new": _snapshot(schedule)},
    )

    if data.notify:
        await notify_schedule_update(
            db,
            schedule=schedule,
            change_type="created",
            old_value={},
            new_value=_snapshot(schedule),
            reason=data.reason,
        )

    return await get_schedule(db, schedule.id)


async def update_schedule(
    db: AsyncSession,
    schedule_id: int,
    data: ScheduleUpdate,
    *,
    admin_id: Optional[int] = None,
) -> Schedule:
    schedule = await get_schedule(db, schedule_id)
    old = _snapshot(schedule)

    payload = data.model_dump(exclude_unset=True, exclude={"notify", "reason", "force"})
    for key, value in payload.items():
        setattr(schedule, key, value)

    start = schedule.start_time
    end = schedule.end_time
    if end <= start:
        raise AppError("end_time must be after start_time")

    if schedule.status != LessonStatus.cancelled:
        conflicts = await detect_conflicts(
            db,
            group_id=schedule.group_id,
            teacher_id=schedule.teacher_id,
            room_id=schedule.room_id,
            schedule_date=schedule.date,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
            exclude_id=schedule.id,
        )
        if conflicts and not data.force:
            raise AppError(
                "⚠️ Conflict detected",
                status_code=409,
                data={"conflicts": [c.model_dump() for c in conflicts]},
            )

    await db.flush()
    new = _snapshot(schedule)

    change_type = "updated"
    if old.get("status") != new.get("status") and new.get("status") == "cancelled":
        change_type = "cancelled"
    elif old.get("room_id") != new.get("room_id"):
        change_type = "room"
    elif old.get("start_time") != new.get("start_time") or old.get("end_time") != new.get("end_time"):
        change_type = "time"
    elif old.get("date") != new.get("date"):
        change_type = "moved"

    db.add(
        ScheduleChange(
            schedule_id=schedule.id,
            change_type=change_type,
            old_value=old,
            new_value=new,
            reason=data.reason,
            changed_by=admin_id,
        )
    )
    await write_audit(
        db,
        admin_user_id=admin_id,
        action=f"{change_type}_schedule",
        entity_type="schedule",
        entity_id=schedule.id,
        metadata={"before": old, "after": new, "reason": data.reason},
    )

    if data.notify and old != new:
        await notify_schedule_update(
            db,
            schedule=schedule,
            change_type=change_type,
            old_value=old,
            new_value=new,
            reason=data.reason,
        )

    return await get_schedule(db, schedule.id)


async def delete_schedule(
    db: AsyncSession,
    schedule_id: int,
    *,
    admin_id: Optional[int] = None,
) -> None:
    schedule = await get_schedule(db, schedule_id)
    snap = _snapshot(schedule)
    await db.delete(schedule)
    await write_audit(
        db,
        admin_user_id=admin_id,
        action="deleted_schedule",
        entity_type="schedule",
        entity_id=schedule_id,
        metadata={"before": snap},
    )

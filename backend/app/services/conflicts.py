"""Conflict detection for schedules."""

from __future__ import annotations

from datetime import date, time
from typing import Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import LessonStatus, Schedule
from app.schemas import ConflictInfo


def _times_overlap(start_a: time, end_a: time, start_b: time, end_b: time) -> bool:
    return start_a < end_b and start_b < end_a


async def detect_conflicts(
    db: AsyncSession,
    *,
    group_id: int,
    teacher_id: int,
    room_id: int,
    schedule_date: date,
    start_time: time,
    end_time: time,
    exclude_id: Optional[int] = None,
) -> list[ConflictInfo]:
    stmt = (
        select(Schedule)
        .options(
            selectinload(Schedule.group),
            selectinload(Schedule.teacher),
            selectinload(Schedule.room),
            selectinload(Schedule.subject),
        )
        .where(
            Schedule.date == schedule_date,
            Schedule.status != LessonStatus.cancelled,
            or_(
                Schedule.group_id == group_id,
                Schedule.teacher_id == teacher_id,
                Schedule.room_id == room_id,
            ),
        )
    )
    if exclude_id:
        stmt = stmt.where(Schedule.id != exclude_id)

    result = await db.execute(stmt)
    existing = result.scalars().all()
    conflicts: list[ConflictInfo] = []

    for item in existing:
        if not _times_overlap(start_time, end_time, item.start_time, item.end_time):
            continue

        if item.teacher_id == teacher_id:
            conflicts.append(
                ConflictInfo(
                    type="teacher",
                    message=(
                        f"Teacher {item.teacher.full_name if item.teacher else teacher_id} "
                        f"is already assigned from {item.start_time.strftime('%H:%M')} "
                        f"to {item.end_time.strftime('%H:%M')}."
                    ),
                    conflicting_schedule_id=item.id,
                )
            )
        if item.room_id == room_id:
            room_label = (
                f"{item.room.room_number}" if item.room else str(room_id)
            )
            conflicts.append(
                ConflictInfo(
                    type="room",
                    message=(
                        f"Room {room_label} is already occupied from "
                        f"{item.start_time.strftime('%H:%M')} to {item.end_time.strftime('%H:%M')}."
                    ),
                    conflicting_schedule_id=item.id,
                )
            )
        if item.group_id == group_id:
            group_label = item.group.code if item.group else str(group_id)
            conflicts.append(
                ConflictInfo(
                    type="group",
                    message=(
                        f"Group {group_label} already has a class from "
                        f"{item.start_time.strftime('%H:%M')} to {item.end_time.strftime('%H:%M')}."
                    ),
                    conflicting_schedule_id=item.id,
                )
            )

    return conflicts

"""Notification templates and Telegram delivery."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models import Notification, NotificationType, Schedule, Student
from app.models.enums import LessonStatus


def template_room_changed(*, subject: str, time_range: str, room: str, group: str) -> tuple[str, str]:
    title = "🔔 Dars jadvali o‘zgardi"
    message = (
        f"📚 {subject}\n"
        f"🕐 {time_range}\n"
        f"🏫 Yangi auditoriya: {room}\n\n"
        f"Guruh: {group}"
    )
    return title, message


def template_class_cancelled(*, subject: str, date_str: str, time_range: str, group: str) -> tuple[str, str]:
    title = "❌ Dars bekor qilindi"
    message = (
        f"📚 {subject}\n"
        f"📅 {date_str}\n"
        f"🕐 {time_range}\n\n"
        f"Guruh: {group}"
    )
    return title, message


def template_time_changed(
    *, subject: str, old_time: str, new_time: str, group: str
) -> tuple[str, str]:
    title = "🕐 Dars vaqti o‘zgardi"
    message = (
        f"📚 {subject}\n\n"
        f"Eski vaqt:\n{old_time}\n\n"
        f"Yangi vaqt:\n{new_time}\n\n"
        f"Guruh: {group}"
    )
    return title, message


def template_schedule_changed(*, subject: str, time_range: str, details: str, group: str) -> tuple[str, str]:
    title = "🔔 Jadval o‘zgardi"
    message = (
        f"📚 {subject}\n"
        f"🕐 {time_range}\n"
        f"{details}\n\n"
        f"Guruh: {group}"
    )
    return title, message


async def create_and_send_for_group(
    db: AsyncSession,
    *,
    schedule: Schedule,
    title: str,
    message: str,
    ntype: NotificationType,
    dedupe_key: Optional[str] = None,
) -> list[Notification]:
    students_result = await db.execute(
        select(Student).where(
            Student.group_id == schedule.group_id,
            Student.is_active.is_(True),
        )
    )
    students = students_result.scalars().all()
    created: list[Notification] = []

    for student in students:
        if not _should_notify(student, ntype):
            continue
        if dedupe_key:
            existing = await db.execute(
                select(Notification).where(
                    Notification.student_id == student.id,
                    Notification.dedupe_key == dedupe_key,
                )
            )
            if existing.scalar_one_or_none():
                continue

        notif = Notification(
            student_id=student.id,
            schedule_id=schedule.id,
            title=title,
            message=message,
            type=ntype,
            dedupe_key=dedupe_key,
            delivery_status="pending",
        )
        db.add(notif)
        created.append(notif)

    await db.flush()

    for notif in created:
        student = next(s for s in students if s.id == notif.student_id)
        await deliver_telegram(db, notif, student.telegram_id)

    return created


async def deliver_telegram(
    db: AsyncSession,
    notification: Notification,
    telegram_id: int,
) -> None:
    settings = get_settings()
    if not settings.bot_token:
        notification.delivery_status = "skipped"
        notification.delivery_error = "BOT_TOKEN not configured"
        return

    text = f"{notification.title}\n\n{notification.message}"
    url = f"https://api.telegram.org/bot{settings.bot_token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                url,
                json={
                    "chat_id": telegram_id,
                    "text": text,
                    "disable_web_page_preview": True,
                },
            )
        data = resp.json()
        if resp.status_code == 200 and data.get("ok"):
            notification.delivery_status = "sent"
            notification.sent_at = datetime.now(timezone.utc)
            notification.telegram_message_id = data.get("result", {}).get("message_id")
            notification.delivery_error = None
        else:
            notification.delivery_status = "failed"
            notification.delivery_error = str(data)[:500]
    except Exception as exc:  # noqa: BLE001
        notification.delivery_status = "failed"
        notification.delivery_error = str(exc)[:500]


async def send_announcement(
    db: AsyncSession,
    *,
    title: str,
    message: str,
    students: Iterable[Student],
) -> int:
    count = 0
    for student in students:
        if not student.notify_announcements:
            continue
        notif = Notification(
            student_id=student.id,
            schedule_id=None,
            title=title,
            message=message,
            type=NotificationType.announcement,
            delivery_status="pending",
        )
        db.add(notif)
        await db.flush()
        await deliver_telegram(db, notif, student.telegram_id)
        count += 1
    return count


def _should_notify(student: Student, ntype: NotificationType) -> bool:
    if ntype == NotificationType.class_cancelled:
        return student.notify_cancellations
    if ntype == NotificationType.room_changed:
        return student.notify_room_changes
    if ntype == NotificationType.announcement:
        return student.notify_announcements
    return student.notify_schedule_changes


async def notify_schedule_update(
    db: AsyncSession,
    *,
    schedule: Schedule,
    change_type: str,
    old_value: dict,
    new_value: dict,
    reason: Optional[str] = None,
) -> None:
    # Ensure relations loaded
    result = await db.execute(
        select(Schedule)
        .options(
            selectinload(Schedule.subject),
            selectinload(Schedule.room),
            selectinload(Schedule.group),
            selectinload(Schedule.teacher),
        )
        .where(Schedule.id == schedule.id)
    )
    schedule = result.scalar_one()

    subject = schedule.subject.name if schedule.subject else "Subject"
    group = schedule.group.code if schedule.group else str(schedule.group_id)
    time_range = (
        f"{schedule.start_time.strftime('%H:%M')}–{schedule.end_time.strftime('%H:%M')}"
    )
    date_str = schedule.date.strftime("%d-%m-%Y")
    room = schedule.room.room_number if schedule.room else "?"

    if schedule.status == LessonStatus.cancelled or change_type == "cancelled":
        title, message = template_class_cancelled(
            subject=subject, date_str=date_str, time_range=time_range, group=group
        )
        ntype = NotificationType.class_cancelled
    elif change_type == "room" or ("room_id" in old_value and old_value.get("room_id") != new_value.get("room_id")):
        title, message = template_room_changed(
            subject=subject, time_range=time_range, room=room, group=group
        )
        ntype = NotificationType.room_changed
    elif change_type == "time" or old_value.get("start_time") != new_value.get("start_time"):
        old_t = f"{old_value.get('start_time')}–{old_value.get('end_time')}"
        new_t = f"{new_value.get('start_time')}–{new_value.get('end_time')}"
        title, message = template_time_changed(
            subject=subject, old_time=old_t, new_time=new_t, group=group
        )
        ntype = NotificationType.time_changed
    else:
        details = reason or "Jadval yangilandi"
        title, message = template_schedule_changed(
            subject=subject, time_range=time_range, details=details, group=group
        )
        ntype = NotificationType.schedule_changed

    dedupe = f"{schedule.id}:{change_type}:{schedule.updated_at.isoformat() if schedule.updated_at else ''}"
    await create_and_send_for_group(
        db,
        schedule=schedule,
        title=title,
        message=message,
        ntype=ntype,
        dedupe_key=dedupe,
    )

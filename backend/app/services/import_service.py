"""Excel/CSV schedule import service."""

from __future__ import annotations

import io
from datetime import datetime
from typing import Any, Optional

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import AppError
from app.models import Group, LessonType, Room, Schedule, Subject, Teacher
from app.schemas import ImportPreviewResult, ImportPreviewRow, ScheduleCreate
from app.services.audit import write_audit
from app.services.conflicts import detect_conflicts
from app.services.schedule_service import create_schedule

COLUMN_MAP = {
    "date": ["date", "sana", "дата"],
    "start_time": ["start time", "start_time", "start", "boshlanish", "начало"],
    "end_time": ["end time", "end_time", "end", "tugash", "конец"],
    "group": ["group", "guruh", "группа"],
    "subject": ["subject", "fan", "предмет"],
    "teacher": ["teacher", "o'qituvchi", "oqituvchi", "преподаватель"],
    "room": ["room", "xona", "auditoriya", "аудитория"],
    "lesson_type": ["lesson type", "lesson_type", "type", "tur", "тип"],
    "notes": ["notes", "izoh", "примечание"],
}


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename: dict[str, str] = {}
    lower_cols = {str(c).strip().lower(): c for c in df.columns}
    for canonical, aliases in COLUMN_MAP.items():
        for alias in aliases:
            if alias in lower_cols:
                rename[lower_cols[alias]] = canonical
                break
    return df.rename(columns=rename)


def _parse_date(value: Any):
    if pd.isna(value):
        raise ValueError("Date is required")
    if isinstance(value, datetime):
        return value.date()
    text = str(value).strip()
    for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    parsed = pd.to_datetime(value, dayfirst=True)
    return parsed.date()


def _parse_time(value: Any):
    if pd.isna(value):
        raise ValueError("Time is required")
    if hasattr(value, "hour"):
        return value if not isinstance(value, datetime) else value.time()
    text = str(value).strip()
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.strptime(text, fmt).time()
        except ValueError:
            continue
    parsed = pd.to_datetime(text)
    return parsed.time()


def _parse_lesson_type(value: Any) -> LessonType:
    if pd.isna(value) or not str(value).strip():
        return LessonType.lecture
    raw = str(value).strip().lower()
    mapping = {
        "lecture": LessonType.lecture,
        "лекц": LessonType.lecture,
        "ma'ruza": LessonType.lecture,
        "maruza": LessonType.lecture,
        "seminar": LessonType.seminar,
        "practical": LessonType.practical,
        "amaliy": LessonType.practical,
        "laboratory": LessonType.laboratory,
        "lab": LessonType.laboratory,
        "other": LessonType.other,
    }
    for key, lt in mapping.items():
        if key in raw:
            return lt
    try:
        return LessonType(raw)
    except ValueError:
        return LessonType.other


async def _load_lookups(db: AsyncSession) -> dict[str, Any]:
    groups = {g.code.lower(): g for g in (await db.execute(select(Group))).scalars()}
    subjects_by_name = {s.name.lower(): s for s in (await db.execute(select(Subject))).scalars()}
    subjects_by_code = {s.code.lower(): s for s in subjects_by_name.values()}
    teachers = {t.full_name.lower(): t for t in (await db.execute(select(Teacher))).scalars()}
    rooms = {}
    for r in (await db.execute(select(Room))).scalars():
        rooms[r.room_number.lower()] = r
        rooms[f"{r.building}:{r.room_number}".lower()] = r
    return {
        "groups": groups,
        "subjects_by_name": subjects_by_name,
        "subjects_by_code": subjects_by_code,
        "teachers": teachers,
        "rooms": rooms,
    }


async def preview_import(db: AsyncSession, content: bytes, filename: str) -> ImportPreviewResult:
    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as exc:  # noqa: BLE001
        raise AppError(f"Failed to parse file: {exc}") from exc

    df = _normalize_columns(df)
    required = ["date", "start_time", "end_time", "group", "subject", "teacher", "room"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise AppError(f"Missing required columns: {', '.join(missing)}")

    lookups = await _load_lookups(db)
    rows: list[ImportPreviewRow] = []
    seen: set[tuple] = set()

    for idx, series in df.iterrows():
        row_number = int(idx) + 2  # header + 1-based
        errors: list[str] = []
        warnings: list[str] = []
        data: dict[str, Any] = {}
        try:
            d = _parse_date(series["date"])
            st = _parse_time(series["start_time"])
            et = _parse_time(series["end_time"])
            if et <= st:
                errors.append("End time must be after start time")
            group_code = str(series["group"]).strip()
            subject_name = str(series["subject"]).strip()
            teacher_name = str(series["teacher"]).strip()
            room_number = str(series["room"]).strip()
            lesson_type = _parse_lesson_type(series.get("lesson_type"))
            notes = None if pd.isna(series.get("notes")) else str(series.get("notes"))

            group = lookups["groups"].get(group_code.lower())
            if not group:
                errors.append(f"Unknown group: {group_code}")

            subject = lookups["subjects_by_name"].get(subject_name.lower()) or lookups[
                "subjects_by_code"
            ].get(subject_name.lower())
            if not subject:
                errors.append(f"Unknown subject: {subject_name}")

            teacher = lookups["teachers"].get(teacher_name.lower())
            if not teacher:
                errors.append(f"Unknown teacher: {teacher_name}")

            room = lookups["rooms"].get(room_number.lower())
            if not room:
                errors.append(f"Unknown room: {room_number}")

            key = (group_code.lower(), str(d), str(st), str(et), subject_name.lower())
            if key in seen:
                warnings.append("Duplicate row in file")
            seen.add(key)

            data = {
                "date": str(d),
                "start_time": st.strftime("%H:%M"),
                "end_time": et.strftime("%H:%M"),
                "group": group_code,
                "subject": subject_name,
                "teacher": teacher_name,
                "room": room_number,
                "lesson_type": lesson_type.value,
                "notes": notes,
                "group_id": group.id if group else None,
                "subject_id": subject.id if subject else None,
                "teacher_id": teacher.id if teacher else None,
                "room_id": room.id if room else None,
            }

            if not errors and group and teacher and room:
                conflicts = await detect_conflicts(
                    db,
                    group_id=group.id,
                    teacher_id=teacher.id,
                    room_id=room.id,
                    schedule_date=d,
                    start_time=st,
                    end_time=et,
                )
                for c in conflicts:
                    warnings.append(c.message)

        except Exception as exc:  # noqa: BLE001
            errors.append(str(exc))

        rows.append(
            ImportPreviewRow(
                row_number=row_number,
                valid=len(errors) == 0,
                errors=errors,
                warnings=warnings,
                data=data,
            )
        )

    valid_rows = sum(1 for r in rows if r.valid)
    error_rows = sum(1 for r in rows if not r.valid)
    warning_rows = sum(1 for r in rows if r.warnings)
    return ImportPreviewResult(
        total_rows=len(rows),
        valid_rows=valid_rows,
        error_rows=error_rows,
        warning_rows=warning_rows,
        rows=rows,
        can_import=valid_rows > 0 and error_rows == 0,
    )


async def confirm_import(
    db: AsyncSession,
    content: bytes,
    filename: str,
    *,
    admin_id: Optional[int],
    allow_partial: bool = False,
) -> dict[str, Any]:
    preview = await preview_import(db, content, filename)
    if preview.error_rows and not allow_partial:
        raise AppError(
            "Import blocked: fix errors first or enable partial import",
            data=preview.model_dump(),
        )

    created = 0
    skipped = 0
    for row in preview.rows:
        if not row.valid:
            skipped += 1
            continue
        d = row.data
        payload = ScheduleCreate(
            group_id=d["group_id"],
            subject_id=d["subject_id"],
            teacher_id=d["teacher_id"],
            room_id=d["room_id"],
            date=datetime.strptime(d["date"], "%Y-%m-%d").date(),
            start_time=datetime.strptime(d["start_time"], "%H:%M").time(),
            end_time=datetime.strptime(d["end_time"], "%H:%M").time(),
            lesson_type=LessonType(d["lesson_type"]),
            notes=d.get("notes"),
            notify=False,
            force=True,  # conflicts already surfaced as warnings
        )
        await create_schedule(db, payload, admin_id=admin_id)
        created += 1

    await write_audit(
        db,
        admin_user_id=admin_id,
        action="imported_schedules",
        entity_type="schedule",
        entity_id=None,
        metadata={"created": created, "skipped": skipped, "filename": filename},
    )
    return {"created": created, "skipped": skipped, "preview": preview.model_dump()}

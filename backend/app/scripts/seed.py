"""Create schema + DEMO seed data."""

from __future__ import annotations

import asyncio
from datetime import date, time, timedelta

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import hash_password
from app.models import (
    AdminRole,
    AdminUser,
    Faculty,
    Group,
    LessonStatus,
    LessonType,
    Room,
    Schedule,
    Subject,
    Teacher,
)


async def seed() -> None:
    settings = get_settings()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(AdminUser).limit(1))
        if existing.scalar_one_or_none():
            print("Seed skipped: data already present")
            return

        admin = AdminUser(
            full_name=settings.admin_full_name,
            email=settings.admin_email.lower(),
            password_hash=hash_password(settings.admin_password),
            role=AdminRole.super_admin,
            is_active=True,
        )
        db.add(admin)

        faculty = Faculty(
            name="School of Computing",
            code="SOC",
            description="DEMO DATA — fictional faculty",
        )
        db.add(faculty)
        await db.flush()

        groups = [
            Group(faculty_id=faculty.id, name="CS 24-01", code="CS-24-01", year=2024),
            Group(faculty_id=faculty.id, name="CS 24-02", code="CS-24-02", year=2024),
            Group(faculty_id=faculty.id, name="CS 25-01", code="CS-25-01", year=2025),
        ]
        db.add_all(groups)
        await db.flush()

        teachers = [
            Teacher(full_name="John Smith", short_name="J. Smith", department="Computing"),
            Teacher(full_name="Ali Karimov", short_name="A. Karimov", department="Computing"),
            Teacher(full_name="Sarah Johnson", short_name="S. Johnson", department="Languages"),
        ]
        db.add_all(teachers)

        subjects = [
            Subject(name="Programming", code="CS101"),
            Subject(name="Database Systems", code="CS201"),
            Subject(name="Mathematics", code="MATH101"),
            Subject(name="English", code="ENG101"),
            Subject(name="Computer Networks", code="CS301"),
        ]
        db.add_all(subjects)

        rooms = [
            Room(building="Main", room_number="101", floor=1, capacity=40),
            Room(building="Main", room_number="204", floor=2, capacity=35),
            Room(building="Main", room_number="301", floor=3, capacity=50),
            Room(building="Lab", room_number="Lab-1", floor=1, capacity=25, room_type="laboratory"),
        ]
        db.add_all(rooms)
        await db.flush()

        today = date.today()
        monday = today - timedelta(days=today.weekday())
        g1 = groups[0]
        demo_lessons = [
            (0, time(9, 0), time(10, 20), subjects[0], teachers[0], rooms[1], LessonType.practical),
            (0, time(10, 30), time(11, 50), subjects[2], teachers[1], rooms[0], LessonType.lecture),
            (1, time(9, 0), time(10, 20), subjects[1], teachers[0], rooms[2], LessonType.lecture),
            (2, time(13, 0), time(14, 20), subjects[3], teachers[2], rooms[0], LessonType.seminar),
            (3, time(9, 0), time(10, 20), subjects[4], teachers[1], rooms[3], LessonType.laboratory),
            (4, time(10, 30), time(11, 50), subjects[0], teachers[0], rooms[1], LessonType.practical),
        ]
        for offset, start, end, subject, teacher, room, ltype in demo_lessons:
            db.add(
                Schedule(
                    group_id=g1.id,
                    subject_id=subject.id,
                    teacher_id=teacher.id,
                    room_id=room.id,
                    date=monday + timedelta(days=offset),
                    start_time=start,
                    end_time=end,
                    lesson_type=ltype,
                    status=LessonStatus.scheduled,
                    notes="DEMO DATA",
                )
            )

        await db.commit()
        print("DEMO DATA seeded successfully")
        print(f"Admin: {settings.admin_email}")


if __name__ == "__main__":
    asyncio.run(seed())

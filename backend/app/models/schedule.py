from datetime import date, datetime, time
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import LessonStatus, LessonType, NotificationType

if TYPE_CHECKING:
    from app.models.academic import Group, Room, Student, Subject, Teacher
    from app.models.admin import AdminUser


class Schedule(Base):
    __tablename__ = "schedules"
    __table_args__ = (
        Index("ix_schedules_date_group", "date", "group_id"),
        Index("ix_schedules_date", "date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="RESTRICT"), index=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id", ondelete="RESTRICT"), index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="RESTRICT"), index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    lesson_type: Mapped[LessonType] = mapped_column(
        Enum(LessonType, name="lesson_type", native_enum=False),
        default=LessonType.lecture,
        server_default=LessonType.lecture.value,
    )
    status: Mapped[LessonStatus] = mapped_column(
        Enum(LessonStatus, name="lesson_status", native_enum=False),
        default=LessonStatus.scheduled,
        server_default=LessonStatus.scheduled.value,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    group: Mapped["Group"] = relationship(back_populates="schedules")
    subject: Mapped["Subject"] = relationship(back_populates="schedules")
    teacher: Mapped["Teacher"] = relationship(back_populates="schedules")
    room: Mapped["Room"] = relationship(back_populates="schedules")
    changes: Mapped[list["ScheduleChange"]] = relationship(back_populates="schedule")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="schedule")


class ScheduleChange(Base):
    __tablename__ = "schedule_changes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    schedule_id: Mapped[int] = mapped_column(ForeignKey("schedules.id", ondelete="CASCADE"), index=True)
    change_type: Mapped[str] = mapped_column(String(50), nullable=False)
    old_value: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    schedule: Mapped["Schedule"] = relationship(back_populates="changes")
    admin: Mapped[Optional["AdminUser"]] = relationship()


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    schedule_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("schedules.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type", native_enum=False),
        default=NotificationType.general,
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    delivery_status: Mapped[str] = mapped_column(String(50), default="pending", server_default="pending")
    delivery_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    telegram_message_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    dedupe_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student: Mapped["Student"] = relationship(back_populates="notifications")
    schedule: Mapped[Optional["Schedule"]] = relationship(back_populates="notifications")

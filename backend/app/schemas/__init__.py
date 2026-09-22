from __future__ import annotations

from datetime import date, datetime, time
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import AdminRole, LessonStatus, LessonType, NotificationType


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Auth ---


class TelegramAuthRequest(BaseModel):
    init_data: str


class OnboardingStudentRequest(BaseModel):
    group_id: Optional[int] = None


class OnboardingTeacherRequest(BaseModel):
    teacher_id: int


class PendingUserOut(BaseModel):
    telegram_id: int
    telegram_username: Optional[str] = None
    full_name: str


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class AdminOut(ORMModel):
    id: int
    full_name: str
    email: EmailStr
    role: AdminRole
    is_active: bool
    created_at: datetime


class StudentOut(ORMModel):
    id: int
    telegram_id: int
    telegram_username: Optional[str] = None
    full_name: str
    group_id: Optional[int] = None
    is_active: bool
    notify_schedule_changes: bool = True
    notify_cancellations: bool = True
    notify_room_changes: bool = True
    notify_announcements: bool = True
    created_at: datetime
    group: Optional["GroupBrief"] = None


class StudentUpdate(BaseModel):
    group_id: Optional[int] = None
    full_name: Optional[str] = None
    notify_schedule_changes: Optional[bool] = None
    notify_cancellations: Optional[bool] = None
    notify_room_changes: Optional[bool] = None
    notify_announcements: Optional[bool] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str  # pending | student | teacher | admin
    needs_onboarding: bool = False
    student: Optional[StudentOut] = None
    teacher: Optional["TeacherOut"] = None
    admin: Optional[AdminOut] = None
    pending: Optional[PendingUserOut] = None


# --- Academic ---


class FacultyCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None


class FacultyUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None


class FacultyOut(ORMModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class GroupCreate(BaseModel):
    faculty_id: int
    name: str
    code: str
    year: int
    active: bool = True


class GroupUpdate(BaseModel):
    faculty_id: Optional[int] = None
    name: Optional[str] = None
    code: Optional[str] = None
    year: Optional[int] = None
    active: Optional[bool] = None


class GroupBrief(ORMModel):
    id: int
    name: str
    code: str
    year: int
    faculty_id: int


class GroupOut(ORMModel):
    id: int
    faculty_id: int
    name: str
    code: str
    year: int
    active: bool
    created_at: datetime
    updated_at: datetime
    faculty: Optional[FacultyOut] = None


class TeacherCreate(BaseModel):
    full_name: str
    short_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    active: bool = True


class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None
    short_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    active: Optional[bool] = None


class TeacherOut(ORMModel):
    id: int
    telegram_id: Optional[int] = None
    telegram_username: Optional[str] = None
    full_name: str
    short_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    active: bool
    created_at: datetime
    updated_at: datetime


class SubjectCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    active: bool = True


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class SubjectOut(ORMModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    active: bool
    created_at: datetime
    updated_at: datetime


class RoomCreate(BaseModel):
    building: str = "Main"
    room_number: str
    floor: Optional[int] = None
    capacity: Optional[int] = None
    room_type: Optional[str] = "classroom"
    active: bool = True


class RoomUpdate(BaseModel):
    building: Optional[str] = None
    room_number: Optional[str] = None
    floor: Optional[int] = None
    capacity: Optional[int] = None
    room_type: Optional[str] = None
    active: Optional[bool] = None


class RoomOut(ORMModel):
    id: int
    building: str
    room_number: str
    floor: Optional[int] = None
    capacity: Optional[int] = None
    room_type: Optional[str] = None
    active: bool
    created_at: datetime
    updated_at: datetime


class StudentAdminCreate(BaseModel):
    telegram_id: int
    telegram_username: Optional[str] = None
    full_name: str
    group_id: Optional[int] = None
    is_active: bool = True


class StudentAdminUpdate(BaseModel):
    telegram_username: Optional[str] = None
    full_name: Optional[str] = None
    group_id: Optional[int] = None
    is_active: Optional[bool] = None


# --- Schedules ---


class ScheduleCreate(BaseModel):
    group_id: int
    subject_id: int
    teacher_id: int
    room_id: int
    date: date
    start_time: time
    end_time: time
    lesson_type: LessonType = LessonType.lecture
    status: LessonStatus = LessonStatus.scheduled
    notes: Optional[str] = None
    notify: bool = False
    reason: Optional[str] = None
    force: bool = False

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v: time, info):  # type: ignore[no-untyped-def]
        start = info.data.get("start_time")
        if start and v <= start:
            raise ValueError("end_time must be after start_time")
        return v


class ScheduleUpdate(BaseModel):
    group_id: Optional[int] = None
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    room_id: Optional[int] = None
    date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    lesson_type: Optional[LessonType] = None
    status: Optional[LessonStatus] = None
    notes: Optional[str] = None
    notify: bool = True
    reason: Optional[str] = None
    force: bool = False


class ScheduleOut(ORMModel):
    id: int
    group_id: int
    subject_id: int
    teacher_id: int
    room_id: int
    date: date
    start_time: time
    end_time: time
    lesson_type: LessonType
    status: LessonStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    group: Optional[GroupBrief] = None
    subject: Optional[SubjectOut] = None
    teacher: Optional[TeacherOut] = None
    room: Optional[RoomOut] = None


class ScheduleChangeOut(ORMModel):
    id: int
    schedule_id: int
    change_type: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    reason: Optional[str] = None
    changed_by: Optional[int] = None
    created_at: datetime


class NotificationOut(ORMModel):
    id: int
    student_id: int
    schedule_id: Optional[int] = None
    title: str
    message: str
    type: NotificationType
    is_read: bool
    delivery_status: str
    sent_at: Optional[datetime] = None
    created_at: datetime


class AnnouncementRequest(BaseModel):
    title: str
    message: str
    faculty_id: Optional[int] = None
    group_id: Optional[int] = None
    confirm: bool = False


class AuditLogOut(ORMModel):
    id: int
    admin_user_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    metadata: Optional[Any] = Field(default=None, validation_alias="metadata_")
    created_at: datetime
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class DashboardStats(BaseModel):
    total_students: int
    total_groups: int
    total_teachers: int
    todays_classes: int
    cancelled_today: int
    recent_changes: list[ScheduleChangeOut] = []
    todays_schedules: list[ScheduleOut] = []
    message: Optional[str] = None


class ConflictInfo(BaseModel):
    type: str
    message: str
    conflicting_schedule_id: Optional[int] = None


class ImportPreviewRow(BaseModel):
    row_number: int
    valid: bool
    errors: list[str] = []
    warnings: list[str] = []
    data: dict[str, Any] = {}


class ImportPreviewResult(BaseModel):
    total_rows: int
    valid_rows: int
    error_rows: int
    warning_rows: int
    rows: list[ImportPreviewRow]
    can_import: bool


StudentOut.model_rebuild()
ScheduleOut.model_rebuild()
TokenResponse.model_rebuild()

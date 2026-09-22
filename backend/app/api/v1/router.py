from datetime import date, timedelta
from math import ceil
from typing import Any, Optional

from fastapi import APIRouter, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CanEditEntities, CanSchedule, CanViewAdmin, CurrentStudent, DbSession
from app.core.responses import AppError, ok
from app.core.security import create_access_token, verify_password
from app.core.telegram_auth import validate_telegram_init_data
from app.models import (
    AdminUser,
    AuditLog,
    Faculty,
    Group,
    LessonStatus,
    Notification,
    Room,
    Schedule,
    ScheduleChange,
    Student,
    Subject,
    Teacher,
)
from app.schemas import (
    AdminLoginRequest,
    AdminOut,
    AnnouncementRequest,
    DashboardStats,
    FacultyCreate,
    FacultyOut,
    FacultyUpdate,
    GroupCreate,
    GroupOut,
    GroupUpdate,
    NotificationOut,
    RoomCreate,
    RoomOut,
    RoomUpdate,
    ScheduleChangeOut,
    ScheduleCreate,
    ScheduleOut,
    ScheduleUpdate,
    StudentAdminCreate,
    StudentAdminUpdate,
    StudentOut,
    StudentUpdate,
    SubjectCreate,
    SubjectOut,
    SubjectUpdate,
    TeacherCreate,
    TeacherOut,
    TeacherUpdate,
    TelegramAuthRequest,
    TokenResponse,
)
from app.services.audit import write_audit
from app.services.import_service import confirm_import, preview_import
from app.services.notifications import send_announcement
from app.services.schedule_service import (
    SCHEDULE_LOAD,
    create_schedule,
    delete_schedule,
    get_schedule,
    update_schedule,
)
from fastapi import File, UploadFile

router = APIRouter()


def _paginated(items: list[Any], total: int, page: int, page_size: int) -> dict[str, Any]:
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": ceil(total / page_size) if page_size else 0,
    }


# ========== AUTH ==========


@router.post("/auth/telegram")
async def auth_telegram(body: TelegramAuthRequest, db: DbSession):
    parsed = validate_telegram_init_data(body.init_data)
    user = parsed["user"]
    telegram_id = int(user["id"])
    username = user.get("username")
    first = user.get("first_name") or ""
    last = user.get("last_name") or ""
    full_name = f"{first} {last}".strip() or username or f"User {telegram_id}"

    result = await db.execute(
        select(Student)
        .options(selectinload(Student.group))
        .where(Student.telegram_id == telegram_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        student = Student(
            telegram_id=telegram_id,
            telegram_username=username,
            full_name=full_name,
        )
        db.add(student)
        await db.flush()
    else:
        student.telegram_username = username or student.telegram_username
        if full_name:
            student.full_name = full_name

    token = create_access_token(str(student.id), token_type="student")
    await db.refresh(student, attribute_names=["group"])
    return ok(
        TokenResponse(
            access_token=token,
            student=StudentOut.model_validate(student),
        ).model_dump()
    )


@router.post("/auth/admin/login")
async def admin_login(body: AdminLoginRequest, db: DbSession):
    result = await db.execute(select(AdminUser).where(AdminUser.email == body.email.lower()))
    admin = result.scalar_one_or_none()
    if not admin or not verify_password(body.password, admin.password_hash):
        raise AppError("Email yoki parol noto‘g‘ri", status_code=401)
    if not admin.is_active:
        raise AppError("Hisob faol emas", status_code=403)
    token = create_access_token(
        str(admin.id),
        token_type="admin",
        extra={"role": admin.role.value},
    )
    return ok(
        TokenResponse(
            access_token=token,
            admin=AdminOut.model_validate(admin),
        ).model_dump()
    )


@router.get("/auth/me")
async def auth_me_student(student: CurrentStudent):
    return ok(StudentOut.model_validate(student).model_dump())


@router.get("/auth/admin/me")
async def auth_me_admin(admin: CanViewAdmin):
    return ok(AdminOut.model_validate(admin).model_dump())


# ========== STUDENTS ==========


@router.patch("/students/me")
async def update_my_profile(body: StudentUpdate, student: CurrentStudent, db: DbSession):
    if body.group_id is not None:
        group = await db.get(Group, body.group_id)
        if not group or not group.active:
            raise AppError("Guruh topilmadi", status_code=404)
        student.group_id = body.group_id
    if body.full_name is not None:
        student.full_name = body.full_name
    for field in (
        "notify_schedule_changes",
        "notify_cancellations",
        "notify_room_changes",
        "notify_announcements",
    ):
        value = getattr(body, field)
        if value is not None:
            setattr(student, field, value)
    await db.flush()
    result = await db.execute(
        select(Student).options(selectinload(Student.group)).where(Student.id == student.id)
    )
    return ok(StudentOut.model_validate(result.scalar_one()).model_dump())


# ========== FACULTIES / GROUPS / etc ==========


@router.get("/faculties")
async def list_faculties(
    db: DbSession,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    stmt = select(Faculty)
    count_stmt = select(func.count()).select_from(Faculty)
    if q:
        like = f"%{q}%"
        filt = or_(Faculty.name.ilike(like), Faculty.code.ilike(like))
        stmt = stmt.where(filt)
        count_stmt = count_stmt.where(filt)
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(
        stmt.order_by(Faculty.name).offset((page - 1) * page_size).limit(page_size)
    )
    items = [FacultyOut.model_validate(x).model_dump() for x in result.scalars()]
    return ok(_paginated(items, total, page, page_size))


@router.post("/admin/faculties")
async def create_faculty(body: FacultyCreate, admin: CanEditEntities, db: DbSession):
    faculty = Faculty(**body.model_dump())
    db.add(faculty)
    await db.flush()
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="created_faculty",
        entity_type="faculty",
        entity_id=faculty.id,
    )
    return ok(FacultyOut.model_validate(faculty).model_dump())


@router.patch("/admin/faculties/{faculty_id}")
async def update_faculty(
    faculty_id: int, body: FacultyUpdate, admin: CanEditEntities, db: DbSession
):
    faculty = await db.get(Faculty, faculty_id)
    if not faculty:
        raise AppError("Faculty not found", status_code=404)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(faculty, k, v)
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="updated_faculty",
        entity_type="faculty",
        entity_id=faculty_id,
    )
    return ok(FacultyOut.model_validate(faculty).model_dump())


@router.delete("/admin/faculties/{faculty_id}")
async def delete_faculty(faculty_id: int, admin: CanEditEntities, db: DbSession):
    faculty = await db.get(Faculty, faculty_id)
    if not faculty:
        raise AppError("Faculty not found", status_code=404)
    await db.delete(faculty)
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="deleted_faculty",
        entity_type="faculty",
        entity_id=faculty_id,
    )
    return ok({"deleted": True})


@router.get("/groups")
async def list_groups(
    db: DbSession,
    q: Optional[str] = None,
    faculty_id: Optional[int] = None,
    active: Optional[bool] = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
):
    stmt = select(Group).options(selectinload(Group.faculty))
    count_stmt = select(func.count()).select_from(Group)
    filters = []
    if q:
        like = f"%{q}%"
        filters.append(or_(Group.name.ilike(like), Group.code.ilike(like)))
    if faculty_id:
        filters.append(Group.faculty_id == faculty_id)
    if active is not None:
        filters.append(Group.active.is_(active))
    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(
        stmt.order_by(Group.code).offset((page - 1) * page_size).limit(page_size)
    )
    items = [GroupOut.model_validate(x).model_dump() for x in result.scalars()]
    return ok(_paginated(items, total, page, page_size))


@router.get("/groups/{group_id}")
async def get_group(group_id: int, db: DbSession):
    result = await db.execute(
        select(Group).options(selectinload(Group.faculty)).where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise AppError("Group not found", status_code=404)
    return ok(GroupOut.model_validate(group).model_dump())


@router.post("/admin/groups")
async def create_group(body: GroupCreate, admin: CanEditEntities, db: DbSession):
    group = Group(**body.model_dump())
    db.add(group)
    await db.flush()
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="created_group",
        entity_type="group",
        entity_id=group.id,
    )
    return ok(GroupOut.model_validate(group).model_dump())


@router.patch("/admin/groups/{group_id}")
async def update_group(group_id: int, body: GroupUpdate, admin: CanEditEntities, db: DbSession):
    group = await db.get(Group, group_id)
    if not group:
        raise AppError("Group not found", status_code=404)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(group, k, v)
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="updated_group",
        entity_type="group",
        entity_id=group_id,
    )
    return ok(GroupOut.model_validate(group).model_dump())


@router.delete("/admin/groups/{group_id}")
async def deactivate_group(group_id: int, admin: CanEditEntities, db: DbSession):
    group = await db.get(Group, group_id)
    if not group:
        raise AppError("Group not found", status_code=404)
    group.active = False
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="deactivated_group",
        entity_type="group",
        entity_id=group_id,
    )
    return ok(GroupOut.model_validate(group).model_dump())


@router.get("/teachers")
async def list_teachers(
    db: DbSession,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    stmt = select(Teacher).where(Teacher.active.is_(True))
    count_stmt = select(func.count()).select_from(Teacher).where(Teacher.active.is_(True))
    if q:
        like = f"%{q}%"
        filt = or_(Teacher.full_name.ilike(like), Teacher.department.ilike(like))
        stmt = stmt.where(filt)
        count_stmt = count_stmt.where(filt)
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(
        stmt.order_by(Teacher.full_name).offset((page - 1) * page_size).limit(page_size)
    )
    items = [TeacherOut.model_validate(x).model_dump() for x in result.scalars()]
    return ok(_paginated(items, total, page, page_size))


@router.post("/admin/teachers")
async def create_teacher(body: TeacherCreate, admin: CanEditEntities, db: DbSession):
    teacher = Teacher(**body.model_dump())
    db.add(teacher)
    await db.flush()
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="created_teacher",
        entity_type="teacher",
        entity_id=teacher.id,
    )
    return ok(TeacherOut.model_validate(teacher).model_dump())


@router.patch("/admin/teachers/{teacher_id}")
async def update_teacher(
    teacher_id: int, body: TeacherUpdate, admin: CanEditEntities, db: DbSession
):
    teacher = await db.get(Teacher, teacher_id)
    if not teacher:
        raise AppError("Teacher not found", status_code=404)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(teacher, k, v)
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="updated_teacher",
        entity_type="teacher",
        entity_id=teacher_id,
    )
    return ok(TeacherOut.model_validate(teacher).model_dump())


@router.delete("/admin/teachers/{teacher_id}")
async def deactivate_teacher(teacher_id: int, admin: CanEditEntities, db: DbSession):
    teacher = await db.get(Teacher, teacher_id)
    if not teacher:
        raise AppError("Teacher not found", status_code=404)
    teacher.active = False
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="deactivated_teacher",
        entity_type="teacher",
        entity_id=teacher_id,
    )
    return ok(TeacherOut.model_validate(teacher).model_dump())


@router.get("/subjects")
async def list_subjects(
    db: DbSession,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    stmt = select(Subject).where(Subject.active.is_(True))
    count_stmt = select(func.count()).select_from(Subject).where(Subject.active.is_(True))
    if q:
        like = f"%{q}%"
        filt = or_(Subject.name.ilike(like), Subject.code.ilike(like))
        stmt = stmt.where(filt)
        count_stmt = count_stmt.where(filt)
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(
        stmt.order_by(Subject.name).offset((page - 1) * page_size).limit(page_size)
    )
    items = [SubjectOut.model_validate(x).model_dump() for x in result.scalars()]
    return ok(_paginated(items, total, page, page_size))


@router.post("/admin/subjects")
async def create_subject(body: SubjectCreate, admin: CanEditEntities, db: DbSession):
    subject = Subject(**body.model_dump())
    db.add(subject)
    await db.flush()
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="created_subject",
        entity_type="subject",
        entity_id=subject.id,
    )
    return ok(SubjectOut.model_validate(subject).model_dump())


@router.patch("/admin/subjects/{subject_id}")
async def update_subject(
    subject_id: int, body: SubjectUpdate, admin: CanEditEntities, db: DbSession
):
    subject = await db.get(Subject, subject_id)
    if not subject:
        raise AppError("Subject not found", status_code=404)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(subject, k, v)
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="updated_subject",
        entity_type="subject",
        entity_id=subject_id,
    )
    return ok(SubjectOut.model_validate(subject).model_dump())


@router.delete("/admin/subjects/{subject_id}")
async def deactivate_subject(subject_id: int, admin: CanEditEntities, db: DbSession):
    subject = await db.get(Subject, subject_id)
    if not subject:
        raise AppError("Subject not found", status_code=404)
    subject.active = False
    return ok(SubjectOut.model_validate(subject).model_dump())


@router.get("/rooms")
async def list_rooms(
    db: DbSession,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    stmt = select(Room).where(Room.active.is_(True))
    count_stmt = select(func.count()).select_from(Room).where(Room.active.is_(True))
    if q:
        like = f"%{q}%"
        filt = or_(Room.room_number.ilike(like), Room.building.ilike(like))
        stmt = stmt.where(filt)
        count_stmt = count_stmt.where(filt)
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(
        stmt.order_by(Room.room_number).offset((page - 1) * page_size).limit(page_size)
    )
    items = [RoomOut.model_validate(x).model_dump() for x in result.scalars()]
    return ok(_paginated(items, total, page, page_size))


@router.post("/admin/rooms")
async def create_room(body: RoomCreate, admin: CanEditEntities, db: DbSession):
    room = Room(**body.model_dump())
    db.add(room)
    await db.flush()
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="created_room",
        entity_type="room",
        entity_id=room.id,
    )
    return ok(RoomOut.model_validate(room).model_dump())


@router.patch("/admin/rooms/{room_id}")
async def update_room(room_id: int, body: RoomUpdate, admin: CanEditEntities, db: DbSession):
    room = await db.get(Room, room_id)
    if not room:
        raise AppError("Room not found", status_code=404)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(room, k, v)
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="updated_room",
        entity_type="room",
        entity_id=room_id,
    )
    return ok(RoomOut.model_validate(room).model_dump())


@router.delete("/admin/rooms/{room_id}")
async def deactivate_room(room_id: int, admin: CanEditEntities, db: DbSession):
    room = await db.get(Room, room_id)
    if not room:
        raise AppError("Room not found", status_code=404)
    room.active = False
    return ok(RoomOut.model_validate(room).model_dump())


# ========== SCHEDULES ==========


@router.get("/schedules/today")
async def schedules_today(student: CurrentStudent, db: DbSession):
    if not student.group_id:
        raise AppError("Avval guruhni tanlang", status_code=400)
    today = date.today()
    result = await db.execute(
        select(Schedule)
        .options(*SCHEDULE_LOAD)
        .where(Schedule.group_id == student.group_id, Schedule.date == today)
        .order_by(Schedule.start_time)
    )
    items = [ScheduleOut.model_validate(x).model_dump() for x in result.scalars()]
    return ok(items)


@router.get("/schedules/week")
async def schedules_week(
    student: CurrentStudent,
    db: DbSession,
    week_start: Optional[date] = None,
):
    if not student.group_id:
        raise AppError("Avval guruhni tanlang", status_code=400)
    start = week_start or (date.today() - timedelta(days=date.today().weekday()))
    end = start + timedelta(days=6)
    result = await db.execute(
        select(Schedule)
        .options(*SCHEDULE_LOAD)
        .where(
            Schedule.group_id == student.group_id,
            Schedule.date >= start,
            Schedule.date <= end,
        )
        .order_by(Schedule.date, Schedule.start_time)
    )
    items = [ScheduleOut.model_validate(x).model_dump() for x in result.scalars()]
    return ok({"week_start": str(start), "week_end": str(end), "items": items})


@router.get("/schedules/{schedule_id}")
async def schedule_detail(schedule_id: int, db: DbSession, student: CurrentStudent):
    schedule = await get_schedule(db, schedule_id)
    if student.group_id and schedule.group_id != student.group_id:
        # Students can only view their group schedules
        raise AppError("Access denied", status_code=403)
    return ok(ScheduleOut.model_validate(schedule).model_dump())


@router.get("/admin/schedules")
async def admin_list_schedules(
    admin: CanViewAdmin,
    db: DbSession,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    group_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    room_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    status: Optional[LessonStatus] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    stmt = select(Schedule).options(*SCHEDULE_LOAD)
    count_stmt = select(func.count()).select_from(Schedule)
    filters = []
    if date_from:
        filters.append(Schedule.date >= date_from)
    if date_to:
        filters.append(Schedule.date <= date_to)
    if group_id:
        filters.append(Schedule.group_id == group_id)
    if teacher_id:
        filters.append(Schedule.teacher_id == teacher_id)
    if room_id:
        filters.append(Schedule.room_id == room_id)
    if subject_id:
        filters.append(Schedule.subject_id == subject_id)
    if status:
        filters.append(Schedule.status == status)
    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(
        stmt.order_by(Schedule.date.desc(), Schedule.start_time)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [ScheduleOut.model_validate(x).model_dump() for x in result.scalars()]
    return ok(_paginated(items, total, page, page_size))


@router.post("/admin/schedules")
async def admin_create_schedule(body: ScheduleCreate, admin: CanSchedule, db: DbSession):
    schedule = await create_schedule(db, body, admin_id=admin.id)
    return ok(ScheduleOut.model_validate(schedule).model_dump())


@router.patch("/admin/schedules/{schedule_id}")
async def admin_update_schedule(
    schedule_id: int, body: ScheduleUpdate, admin: CanSchedule, db: DbSession
):
    schedule = await update_schedule(db, schedule_id, body, admin_id=admin.id)
    return ok(ScheduleOut.model_validate(schedule).model_dump())


@router.delete("/admin/schedules/{schedule_id}")
async def admin_delete_schedule(schedule_id: int, admin: CanSchedule, db: DbSession):
    await delete_schedule(db, schedule_id, admin_id=admin.id)
    return ok({"deleted": True})


# ========== SEARCH ==========


@router.get("/search")
async def search_all(
    db: DbSession,
    student: CurrentStudent,
    q: str = Query(..., min_length=1),
):
    like = f"%{q}%"
    subjects = (
        await db.execute(select(Subject).where(Subject.name.ilike(like)).limit(10))
    ).scalars().all()
    teachers = (
        await db.execute(select(Teacher).where(Teacher.full_name.ilike(like)).limit(10))
    ).scalars().all()
    rooms = (
        await db.execute(select(Room).where(Room.room_number.ilike(like)).limit(10))
    ).scalars().all()
    groups = (
        await db.execute(select(Group).where(Group.code.ilike(like)).limit(10))
    ).scalars().all()

    schedule_items = []
    if student.group_id:
        sched_result = await db.execute(
            select(Schedule)
            .options(*SCHEDULE_LOAD)
            .join(Subject)
            .join(Teacher)
            .join(Room)
            .where(
                Schedule.group_id == student.group_id,
                or_(
                    Subject.name.ilike(like),
                    Teacher.full_name.ilike(like),
                    Room.room_number.ilike(like),
                ),
            )
            .order_by(Schedule.date.desc())
            .limit(20)
        )
        schedule_items = [
            ScheduleOut.model_validate(x).model_dump() for x in sched_result.scalars()
        ]

    return ok(
        {
            "subjects": [SubjectOut.model_validate(x).model_dump() for x in subjects],
            "teachers": [TeacherOut.model_validate(x).model_dump() for x in teachers],
            "rooms": [RoomOut.model_validate(x).model_dump() for x in rooms],
            "groups": [GroupOut.model_validate(x).model_dump() for x in groups],
            "schedules": schedule_items,
        }
    )


# ========== NOTIFICATIONS ==========


@router.get("/notifications")
async def list_notifications(student: CurrentStudent, db: DbSession):
    result = await db.execute(
        select(Notification)
        .where(Notification.student_id == student.id)
        .order_by(Notification.created_at.desc())
        .limit(100)
    )
    items = [NotificationOut.model_validate(x).model_dump() for x in result.scalars()]
    return ok(items)


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int, student: CurrentStudent, db: DbSession
):
    notif = await db.get(Notification, notification_id)
    if not notif or notif.student_id != student.id:
        raise AppError("Notification not found", status_code=404)
    notif.is_read = True
    return ok(NotificationOut.model_validate(notif).model_dump())


@router.post("/notifications/read-all")
async def mark_all_read(student: CurrentStudent, db: DbSession):
    result = await db.execute(
        select(Notification).where(
            Notification.student_id == student.id, Notification.is_read.is_(False)
        )
    )
    for n in result.scalars():
        n.is_read = True
    return ok({"updated": True})


# ========== IMPORT ==========


@router.post("/import/schedule/preview")
async def import_preview(
    admin: CanSchedule,
    db: DbSession,
    file: UploadFile = File(...),
):
    content = await file.read()
    result = await preview_import(db, content, file.filename or "upload.xlsx")
    return ok(result.model_dump())


@router.post("/import/schedule")
async def import_schedule(
    admin: CanSchedule,
    db: DbSession,
    file: UploadFile = File(...),
    allow_partial: bool = False,
):
    content = await file.read()
    result = await confirm_import(
        db,
        content,
        file.filename or "upload.xlsx",
        admin_id=admin.id,
        allow_partial=allow_partial,
    )
    return ok(result)


# ========== ADMIN DASHBOARD / STUDENTS / AUDIT / ANNOUNCEMENTS ==========


@router.get("/admin/dashboard")
async def admin_dashboard(admin: CanViewAdmin, db: DbSession):
    today = date.today()
    total_students = (await db.execute(select(func.count()).select_from(Student))).scalar() or 0
    total_groups = (
        await db.execute(select(func.count()).select_from(Group).where(Group.active.is_(True)))
    ).scalar() or 0
    total_teachers = (
        await db.execute(
            select(func.count()).select_from(Teacher).where(Teacher.active.is_(True))
        )
    ).scalar() or 0
    todays_classes = (
        await db.execute(
            select(func.count()).select_from(Schedule).where(Schedule.date == today)
        )
    ).scalar() or 0
    cancelled_today = (
        await db.execute(
            select(func.count())
            .select_from(Schedule)
            .where(Schedule.date == today, Schedule.status == LessonStatus.cancelled)
        )
    ).scalar() or 0

    recent = (
        await db.execute(
            select(ScheduleChange).order_by(ScheduleChange.created_at.desc()).limit(10)
        )
    ).scalars().all()
    todays = (
        await db.execute(
            select(Schedule)
            .options(*SCHEDULE_LOAD)
            .where(Schedule.date == today)
            .order_by(Schedule.start_time)
            .limit(20)
        )
    ).scalars().all()

    message = None
    if total_students == 0 and todays_classes == 0:
        message = "Ma'lumot yetarli emas"

    stats = DashboardStats(
        total_students=total_students,
        total_groups=total_groups,
        total_teachers=total_teachers,
        todays_classes=todays_classes,
        cancelled_today=cancelled_today,
        recent_changes=[ScheduleChangeOut.model_validate(x) for x in recent],
        todays_schedules=[ScheduleOut.model_validate(x) for x in todays],
        message=message,
    )
    return ok(stats.model_dump())


@router.get("/admin/students")
async def admin_list_students(
    admin: CanViewAdmin,
    db: DbSession,
    q: Optional[str] = None,
    group_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    stmt = select(Student).options(selectinload(Student.group))
    count_stmt = select(func.count()).select_from(Student)
    filters = []
    if q:
        like = f"%{q}%"
        filters.append(
            or_(Student.full_name.ilike(like), Student.telegram_username.ilike(like))
        )
    if group_id:
        filters.append(Student.group_id == group_id)
    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(
        stmt.order_by(Student.full_name).offset((page - 1) * page_size).limit(page_size)
    )
    items = [StudentOut.model_validate(x).model_dump() for x in result.scalars()]
    return ok(_paginated(items, total, page, page_size))


@router.post("/admin/students")
async def admin_create_student(
    body: StudentAdminCreate, admin: CanEditEntities, db: DbSession
):
    existing = await db.execute(
        select(Student).where(Student.telegram_id == body.telegram_id)
    )
    if existing.scalar_one_or_none():
        raise AppError("Student with this telegram_id already exists")
    student = Student(**body.model_dump())
    db.add(student)
    await db.flush()
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="created_student",
        entity_type="student",
        entity_id=student.id,
    )
    return ok(StudentOut.model_validate(student).model_dump())


@router.patch("/admin/students/{student_id}")
async def admin_update_student(
    student_id: int, body: StudentAdminUpdate, admin: CanEditEntities, db: DbSession
):
    student = await db.get(Student, student_id)
    if not student:
        raise AppError("Student not found", status_code=404)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(student, k, v)
    return ok(StudentOut.model_validate(student).model_dump())


@router.get("/admin/changes")
async def admin_changes(
    admin: CanViewAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    total = (await db.execute(select(func.count()).select_from(ScheduleChange))).scalar() or 0
    result = await db.execute(
        select(ScheduleChange)
        .order_by(ScheduleChange.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [ScheduleChangeOut.model_validate(x).model_dump() for x in result.scalars()]
    return ok(_paginated(items, total, page, page_size))


@router.get("/admin/audit")
async def admin_audit(
    admin: CanViewAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    total = (await db.execute(select(func.count()).select_from(AuditLog))).scalar() or 0
    result = await db.execute(
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = []
    for x in result.scalars():
        items.append(
            {
                "id": x.id,
                "admin_user_id": x.admin_user_id,
                "action": x.action,
                "entity_type": x.entity_type,
                "entity_id": x.entity_id,
                "metadata": x.metadata_,
                "created_at": x.created_at.isoformat() if x.created_at else None,
            }
        )
    return ok(_paginated(items, total, page, page_size))


@router.post("/admin/announcements")
async def admin_announcement(
    body: AnnouncementRequest, admin: CanSchedule, db: DbSession
):
    if not body.confirm:
        raise AppError("Confirmation required (confirm=true)")
    stmt = select(Student).where(Student.is_active.is_(True))
    if body.group_id:
        stmt = stmt.where(Student.group_id == body.group_id)
    elif body.faculty_id:
        stmt = stmt.join(Group).where(Group.faculty_id == body.faculty_id)
    students = (await db.execute(stmt)).scalars().all()
    count = await send_announcement(
        db, title=body.title, message=body.message, students=students
    )
    await write_audit(
        db,
        admin_user_id=admin.id,
        action="sent_announcement",
        entity_type="announcement",
        metadata={"title": body.title, "recipients": count},
    )
    return ok({"sent": count})


@router.get("/admin/notifications")
async def admin_notifications(
    admin: CanViewAdmin,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    total = (await db.execute(select(func.count()).select_from(Notification))).scalar() or 0
    result = await db.execute(
        select(Notification)
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [NotificationOut.model_validate(x).model_dump() for x in result.scalars()]
    return ok(_paginated(items, total, page, page_size))

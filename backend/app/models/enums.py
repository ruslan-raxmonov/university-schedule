import enum


class LessonType(str, enum.Enum):
    lecture = "lecture"
    seminar = "seminar"
    practical = "practical"
    laboratory = "laboratory"
    other = "other"


class LessonStatus(str, enum.Enum):
    scheduled = "scheduled"
    cancelled = "cancelled"
    moved = "moved"
    completed = "completed"


class AdminRole(str, enum.Enum):
    super_admin = "super_admin"
    scheduler = "scheduler"
    editor = "editor"
    viewer = "viewer"


class NotificationType(str, enum.Enum):
    schedule_changed = "schedule_changed"
    class_cancelled = "class_cancelled"
    room_changed = "room_changed"
    time_changed = "time_changed"
    new_schedule = "new_schedule"
    announcement = "announcement"
    general = "general"

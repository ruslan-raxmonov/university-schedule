export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  message: string | null;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type LessonType =
  | "lecture"
  | "seminar"
  | "practical"
  | "laboratory"
  | "other";

export type LessonStatus = "scheduled" | "cancelled" | "moved" | "completed";

export type AdminRole = "super_admin" | "scheduler" | "editor" | "viewer";

export type NotificationType =
  | "schedule_changed"
  | "class_cancelled"
  | "room_changed"
  | "time_changed"
  | "new_schedule"
  | "announcement"
  | "general";

export type Faculty = {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
};

export type GroupBrief = {
  id: number;
  name: string;
  code: string;
  year: number;
  faculty_id: number;
};

export type Group = {
  id: number;
  faculty_id: number;
  name: string;
  code: string;
  year: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  faculty?: Faculty | null;
};

export type Student = {
  id: number;
  telegram_id: number;
  telegram_username?: string | null;
  full_name: string;
  group_id?: number | null;
  is_active: boolean;
  notify_schedule_changes: boolean;
  notify_cancellations: boolean;
  notify_room_changes: boolean;
  notify_announcements: boolean;
  created_at: string;
  group?: GroupBrief | null;
};

export type Admin = {
  id: number;
  full_name: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
};

export type Teacher = {
  id: number;
  telegram_id?: number | null;
  telegram_username?: string | null;
  full_name: string;
  short_name?: string | null;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type PendingUser = {
  telegram_id: number;
  telegram_username?: string | null;
  full_name: string;
};

export type AppRole = "pending" | "student" | "teacher" | "admin";

export type TokenResponse = {
  access_token: string;
  token_type: string;
  role: AppRole;
  needs_onboarding: boolean;
  student?: Student | null;
  teacher?: Teacher | null;
  admin?: Admin | null;
  pending?: PendingUser | null;
};

export type Subject = {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Room = {
  id: number;
  building: string;
  room_number: string;
  floor?: number | null;
  capacity?: number | null;
  room_type?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Schedule = {
  id: number;
  group_id: number;
  subject_id: number;
  teacher_id: number;
  room_id: number;
  date: string;
  start_time: string;
  end_time: string;
  lesson_type: LessonType;
  status: LessonStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  group?: GroupBrief | null;
  subject?: Subject | null;
  teacher?: Teacher | null;
  room?: Room | null;
};

export type ScheduleChange = {
  id: number;
  schedule_id: number;
  change_type: string;
  old_value?: unknown;
  new_value?: unknown;
  reason?: string | null;
  changed_by?: number | null;
  created_at: string;
};

export type Notification = {
  id: number;
  student_id: number;
  schedule_id?: number | null;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  delivery_status: string;
  sent_at?: string | null;
  created_at: string;
};

export type DashboardStats = {
  total_students: number;
  total_groups: number;
  total_teachers: number;
  todays_classes: number;
  cancelled_today: number;
  recent_changes: ScheduleChange[];
  todays_schedules: Schedule[];
  message?: string | null;
};

export type SearchResults = {
  subjects: Subject[];
  teachers: Teacher[];
  rooms: Room[];
  groups: Group[];
  schedules: Schedule[];
};

export type WeekSchedule = {
  week_start: string;
  week_end: string;
  items: Schedule[];
};

export type AuditLog = {
  id: number;
  admin_user_id?: number | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: unknown;
  created_at?: string | null;
};

export type ImportPreviewRow = {
  row_number: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  data: Record<string, unknown>;
};

export type ImportPreviewResult = {
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  warning_rows: number;
  rows: ImportPreviewRow[];
  can_import: boolean;
};

export type ConflictInfo = {
  type: string;
  message: string;
  conflicting_schedule_id?: number | null;
};

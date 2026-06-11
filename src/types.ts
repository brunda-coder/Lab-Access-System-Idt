// ─────────────────────────────────────────────────────────────
// types.ts — Canonical type definitions for Lab Access System
// ─────────────────────────────────────────────────────────────

export type UserRole = 'STUDENT' | 'EVALUATOR' | 'ADMIN';
export type AppView = 'ROLE_SELECT' | 'AUTH_LOGIN' | 'STUDENT_ENTRY' | 'STUDENT_DASHBOARD' | 'EVALUATOR_DASHBOARD' | 'ADMIN_DASHBOARD';

// ── User Profile ─────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  email: string;
  full_name: string;
  role: UserRole;
  reg_num: string | null;
  created_at: string;
}

// ── Lab Session ──────────────────────────────────────────────
export interface LabSession {
  id: string;
  course_code: string;
  course_name: string;
  room: string;
  is_active: boolean;
  current_dynamic_token: string;
  token_generated_at: string;
  created_by: string;
  created_at: string;
}

// ── File Attachment ──────────────────────────────────────────
export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string; // base64 for local storage, URL for cloud
  uploaded_at: string;
}

// ── Assignment ───────────────────────────────────────────────
export interface Assignment {
  id: string;
  lab_session_id: string;
  title: string;
  description: string;
  due_date: string;
  created_by: string;
  created_at: string;
  attachments: FileAttachment[];
}

// ── Submission ───────────────────────────────────────────────
export type SubmissionStatus = 'PENDING' | 'REVIEWED' | 'GRADED';

export interface Submission {
  id: string;
  student_uid: string;
  student_name: string;
  student_reg: string;
  lab_session_id: string;
  assignment_id: string | null;
  course_code: string;
  status: SubmissionStatus;
  code_content: string;
  files: FileAttachment[];
  marks: number | null;
  max_marks: number;
  feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

// ── Doubt ────────────────────────────────────────────────────
export type DoubtStatus = 'OPEN' | 'RESOLVED';

export interface Doubt {
  id: string;
  student_uid: string;
  student_name: string;
  student_reg: string;
  lab_session_id: string;
  course_code: string;
  question: string;
  category: string;
  status: DoubtStatus;
  response: string | null;
  responded_by: string | null;
  responded_by_name: string | null;
  created_at: string;
  resolved_at: string | null;
}

// ── Attendance Record ────────────────────────────────────────
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'LEFT_EARLY' | 'ABSENT';

export interface AttendanceRecord {
  id: string;
  student_uid: string;
  student_name: string;
  student_reg: string;
  lab_session_id: string;
  course_code: string;
  check_in_time: string;
  check_out_time: string | null;
  token_used: string;
  status: AttendanceStatus;
  date: string; // YYYY-MM-DD
}

// ── Room ─────────────────────────────────────────────────────
export interface Room {
  id: string;
  name: string;
  building: string;
  floor: string;
  capacity: number;
  equipment: string[];
  is_available: boolean;
  assigned_session_id: string | null;
}

// ── Auth State ───────────────────────────────────────────────
export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
}

// ── Storage keys ─────────────────────────────────────────────
export const STORAGE_KEYS = {
  SESSIONS: 'lab_sessions',
  ASSIGNMENTS: 'lab_assignments',
  SUBMISSIONS: 'lab_submissions',
  DOUBTS: 'lab_doubts',
  ATTENDANCE: 'lab_attendance',
  ROOMS: 'lab_rooms',
  USERS: 'lab_users',
  AUTH: 'lab_auth',
} as const;

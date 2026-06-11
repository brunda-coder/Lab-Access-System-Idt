// ─────────────────────────────────────────────────────────────
// utils/storage.ts — Type-safe localStorage abstraction
// Provides a consistent data layer for local-mode operations
// ─────────────────────────────────────────────────────────────

import { STORAGE_KEYS } from '../types';
import type {
  LabSession, Assignment, Submission, Doubt,
  AttendanceRecord, Room, UserProfile,
} from '../types';

// ── Generic helpers ──────────────────────────────────────────

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// ── Sessions ─────────────────────────────────────────────────

export const SessionStore = {
  getAll: (): LabSession[] => read<LabSession>(STORAGE_KEYS.SESSIONS),
  getActive: (): LabSession[] => read<LabSession>(STORAGE_KEYS.SESSIONS).filter(s => s.is_active),
  getById: (id: string): LabSession | undefined => read<LabSession>(STORAGE_KEYS.SESSIONS).find(s => s.id === id),
  
  create: (session: Omit<LabSession, 'id' | 'created_at'>): LabSession => {
    const list = read<LabSession>(STORAGE_KEYS.SESSIONS);
    const newSession: LabSession = { ...session, id: generateId('sess'), created_at: new Date().toISOString() };
    list.push(newSession);
    write(STORAGE_KEYS.SESSIONS, list);
    return newSession;
  },

  update: (id: string, updates: Partial<LabSession>): void => {
    const list = read<LabSession>(STORAGE_KEYS.SESSIONS).map(s => s.id === id ? { ...s, ...updates } : s);
    write(STORAGE_KEYS.SESSIONS, list);
  },

  updateTokens: (tokens: Record<string, string>): void => {
    const list = read<LabSession>(STORAGE_KEYS.SESSIONS).map(s => {
      if (s.is_active && tokens[s.id]) {
        return { ...s, current_dynamic_token: tokens[s.id], token_generated_at: new Date().toISOString() };
      }
      return s;
    });
    write(STORAGE_KEYS.SESSIONS, list);
  },

  delete: (id: string): void => {
    const list = read<LabSession>(STORAGE_KEYS.SESSIONS).filter(s => s.id !== id);
    write(STORAGE_KEYS.SESSIONS, list);
  },

  saveAll: (sessions: LabSession[]): void => {
    write(STORAGE_KEYS.SESSIONS, sessions);
  },
};

// ── Assignments ──────────────────────────────────────────────

export const AssignmentStore = {
  getAll: (): Assignment[] => read<Assignment>(STORAGE_KEYS.ASSIGNMENTS),
  getBySession: (sessionId: string): Assignment[] => read<Assignment>(STORAGE_KEYS.ASSIGNMENTS).filter(a => a.lab_session_id === sessionId),

  create: (assignment: Omit<Assignment, 'id' | 'created_at'>): Assignment => {
    const list = read<Assignment>(STORAGE_KEYS.ASSIGNMENTS);
    const newAssignment: Assignment = { ...assignment, id: generateId('asgn'), created_at: new Date().toISOString() };
    list.push(newAssignment);
    write(STORAGE_KEYS.ASSIGNMENTS, list);
    return newAssignment;
  },

  update: (id: string, updates: Partial<Assignment>): void => {
    const list = read<Assignment>(STORAGE_KEYS.ASSIGNMENTS).map(a => a.id === id ? { ...a, ...updates } : a);
    write(STORAGE_KEYS.ASSIGNMENTS, list);
  },

  delete: (id: string): void => {
    const list = read<Assignment>(STORAGE_KEYS.ASSIGNMENTS).filter(a => a.id !== id);
    write(STORAGE_KEYS.ASSIGNMENTS, list);
  },
};

// ── Submissions ──────────────────────────────────────────────

export const SubmissionStore = {
  getAll: (): Submission[] => read<Submission>(STORAGE_KEYS.SUBMISSIONS),
  getByStudent: (uid: string): Submission[] => read<Submission>(STORAGE_KEYS.SUBMISSIONS).filter(s => s.student_uid === uid),
  getBySession: (sessionId: string): Submission[] => read<Submission>(STORAGE_KEYS.SUBMISSIONS).filter(s => s.lab_session_id === sessionId),
  getPending: (): Submission[] => read<Submission>(STORAGE_KEYS.SUBMISSIONS).filter(s => s.status === 'PENDING'),

  create: (submission: Omit<Submission, 'id' | 'submitted_at'>): Submission => {
    const list = read<Submission>(STORAGE_KEYS.SUBMISSIONS);
    const newSubmission: Submission = { ...submission, id: generateId('sub'), submitted_at: new Date().toISOString() };
    list.push(newSubmission);
    write(STORAGE_KEYS.SUBMISSIONS, list);
    return newSubmission;
  },

  update: (id: string, updates: Partial<Submission>): void => {
    const list = read<Submission>(STORAGE_KEYS.SUBMISSIONS).map(s => s.id === id ? { ...s, ...updates } : s);
    write(STORAGE_KEYS.SUBMISSIONS, list);
  },
};

// ── Doubts ───────────────────────────────────────────────────

export const DoubtStore = {
  getAll: (): Doubt[] => read<Doubt>(STORAGE_KEYS.DOUBTS),
  getByStudent: (uid: string): Doubt[] => read<Doubt>(STORAGE_KEYS.DOUBTS).filter(d => d.student_uid === uid),
  getBySession: (sessionId: string): Doubt[] => read<Doubt>(STORAGE_KEYS.DOUBTS).filter(d => d.lab_session_id === sessionId),
  getOpen: (): Doubt[] => read<Doubt>(STORAGE_KEYS.DOUBTS).filter(d => d.status === 'OPEN'),

  create: (doubt: Omit<Doubt, 'id' | 'created_at'>): Doubt => {
    const list = read<Doubt>(STORAGE_KEYS.DOUBTS);
    const newDoubt: Doubt = { ...doubt, id: generateId('dbt'), created_at: new Date().toISOString() };
    list.push(newDoubt);
    write(STORAGE_KEYS.DOUBTS, list);
    return newDoubt;
  },

  update: (id: string, updates: Partial<Doubt>): void => {
    const list = read<Doubt>(STORAGE_KEYS.DOUBTS).map(d => d.id === id ? { ...d, ...updates } : d);
    write(STORAGE_KEYS.DOUBTS, list);
  },
};

// ── Attendance ───────────────────────────────────────────────

export const AttendanceStore = {
  getAll: (): AttendanceRecord[] => read<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE),
  getByStudent: (uid: string): AttendanceRecord[] => read<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE).filter(a => a.student_uid === uid),
  getBySession: (sessionId: string): AttendanceRecord[] => read<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE).filter(a => a.lab_session_id === sessionId),
  getByDate: (date: string): AttendanceRecord[] => read<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE).filter(a => a.date === date),

  checkIn: (record: Omit<AttendanceRecord, 'id'>): AttendanceRecord => {
    const list = read<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);
    // Prevent duplicate check-ins for same student + session + date
    const existing = list.find(a =>
      a.student_uid === record.student_uid &&
      a.lab_session_id === record.lab_session_id &&
      a.date === record.date
    );
    if (existing) return existing;

    const newRecord: AttendanceRecord = { ...record, id: generateId('att') };
    list.push(newRecord);
    write(STORAGE_KEYS.ATTENDANCE, list);
    return newRecord;
  },

  checkOut: (id: string): void => {
    const list = read<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE).map(a =>
      a.id === id ? { ...a, check_out_time: new Date().toISOString() } : a
    );
    write(STORAGE_KEYS.ATTENDANCE, list);
  },

  update: (id: string, updates: Partial<AttendanceRecord>): void => {
    const list = read<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE).map(a => a.id === id ? { ...a, ...updates } : a);
    write(STORAGE_KEYS.ATTENDANCE, list);
  },
};

// ── Rooms ────────────────────────────────────────────────────

export const RoomStore = {
  getAll: (): Room[] => read<Room>(STORAGE_KEYS.ROOMS),
  getAvailable: (): Room[] => read<Room>(STORAGE_KEYS.ROOMS).filter(r => r.is_available),
  getById: (id: string): Room | undefined => read<Room>(STORAGE_KEYS.ROOMS).find(r => r.id === id),

  create: (room: Omit<Room, 'id'>): Room => {
    const list = read<Room>(STORAGE_KEYS.ROOMS);
    const newRoom: Room = { ...room, id: generateId('room') };
    list.push(newRoom);
    write(STORAGE_KEYS.ROOMS, list);
    return newRoom;
  },

  update: (id: string, updates: Partial<Room>): void => {
    const list = read<Room>(STORAGE_KEYS.ROOMS).map(r => r.id === id ? { ...r, ...updates } : r);
    write(STORAGE_KEYS.ROOMS, list);
  },

  delete: (id: string): void => {
    const list = read<Room>(STORAGE_KEYS.ROOMS).filter(r => r.id !== id);
    write(STORAGE_KEYS.ROOMS, list);
  },
};

// ── Users (local mode) ──────────────────────────────────────

export const UserStore = {
  getAll: (): UserProfile[] => read<UserProfile>(STORAGE_KEYS.USERS),
  getById: (uid: string): UserProfile | undefined => read<UserProfile>(STORAGE_KEYS.USERS).find(u => u.uid === uid),
  getByEmail: (email: string): UserProfile | undefined => read<UserProfile>(STORAGE_KEYS.USERS).find(u => u.email === email),

  create: (user: UserProfile): UserProfile => {
    const list = read<UserProfile>(STORAGE_KEYS.USERS);
    const existing = list.find(u => u.email === user.email);
    if (existing) return existing;
    list.push(user);
    write(STORAGE_KEYS.USERS, list);
    return user;
  },

  update: (uid: string, updates: Partial<UserProfile>): void => {
    const list = read<UserProfile>(STORAGE_KEYS.USERS).map(u => u.uid === uid ? { ...u, ...updates } : u);
    write(STORAGE_KEYS.USERS, list);
  },

  delete: (uid: string): void => {
    const list = read<UserProfile>(STORAGE_KEYS.USERS).filter(u => u.uid !== uid);
    write(STORAGE_KEYS.USERS, list);
  },
};

// ── Auth persistence (local mode) ────────────────────────────

export const AuthStore = {
  get: (): { uid: string; role: UserRole } | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  set: (uid: string, role: UserRole): void => {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ uid, role }));
  },

  clear: (): void => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  },
};

// Re-export role type for AuthStore
import type { UserRole } from '../types';

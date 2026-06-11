// ─────────────────────────────────────────────────────────────
// constants.ts — Application-wide constants
// ─────────────────────────────────────────────────────────────

export const APP_NAME = 'Laboratory Access & Evaluation System';
export const APP_VERSION = '2.0.0';
export const APP_SUBTITLE = 'Institutional Laboratory Management Platform';

// Token configuration
export const TOKEN_LENGTH = 6;
export const TOKEN_ROTATION_INTERVAL_MS = 60_000; // 60 seconds
export const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous: I,O,0,1

// Submission limits
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_FILES_PER_SUBMISSION = 5;
export const MAX_CODE_LENGTH = 50_000;

// Marks
export const DEFAULT_MAX_MARKS = 100;

// Doubt categories
export const DOUBT_CATEGORIES = [
  'Conceptual',
  'Implementation',
  'Debugging',
  'Algorithm',
  'Syntax',
  'Environment Setup',
  'Assignment Clarification',
  'Other',
] as const;

// Room equipment options
export const ROOM_EQUIPMENT = [
  'Projector',
  'Whiteboard',
  'Computers',
  'Network Access',
  'Power Outlets',
  'Air Conditioning',
  'Printer',
  'Scanner',
] as const;

// Colors for roles
export const ROLE_COLORS = {
  STUDENT: { primary: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.2)' },
  EVALUATOR: { primary: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)' },
  ADMIN: { primary: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
} as const;

// Building list for rooms
export const BUILDINGS = [
  'Main Academic Block',
  'Engineering Block',
  'Science Block',
  'Computer Science Block',
  'Research Wing',
] as const;

// ─────────────────────────────────────────────────────────────
// Header.tsx — Top navigation bar for all dashboard views
// ─────────────────────────────────────────────────────────────

import { motion } from 'motion/react';
import {
  Activity,
  LogOut,
  GraduationCap,
  ClipboardCheck,
  ShieldCheck,
  FlaskConical,
} from 'lucide-react';
import type { UserRole } from '../types';
import { APP_NAME, APP_VERSION } from '../constants';

interface HeaderProps {
  role: UserRole;
  userName: string;
  sessionInfo?: string;
  onLogout: () => void;
}

const roleConfig: Record<
  UserRole,
  { label: string; color: string; bg: string; border: string; icon: typeof GraduationCap }
> = {
  STUDENT: {
    label: 'Student',
    color: '#0ea5e9',
    bg: 'rgba(14, 165, 233, 0.1)',
    border: 'rgba(14, 165, 233, 0.2)',
    icon: GraduationCap,
  },
  EVALUATOR: {
    label: 'Evaluator',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.2)',
    icon: ClipboardCheck,
  },
  ADMIN: {
    label: 'Admin',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.2)',
    icon: ShieldCheck,
  },
};

export default function Header({ role, userName, sessionInfo, onLogout }: HeaderProps) {
  const config = roleConfig[role];
  const RoleIcon = config.icon;

  return (
    <motion.header
      className="sticky top-0 z-50 border-b border-slate-700/40 bg-[rgba(3,7,18,0.85)] backdrop-blur-xl"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* ── Left: Brand ──────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Pulsing Activity icon */}
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <Activity className="h-4.5 w-4.5 text-indigo-400" />
            <motion.div
              className="absolute inset-0 rounded-lg border border-indigo-400/30"
              animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.3, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {/* App name — hidden on small screens */}
          <div className="hidden sm:block">
            <h1 className="font-display text-sm font-semibold leading-tight text-slate-100">
              {APP_NAME}
            </h1>
          </div>

          {/* Version badge */}
          <span className="badge hidden bg-slate-800/60 text-slate-500 border border-slate-700/40 md:inline-flex">
            v{APP_VERSION}
          </span>
        </div>

        {/* ── Right: Role, user, session, logout ───────────────── */}
        <div className="flex items-center gap-3">
          {/* Session info chip */}
          {sessionInfo && (
            <div className="hidden items-center gap-1.5 rounded-lg border border-slate-700/40 bg-slate-800/40 px-3 py-1.5 lg:flex">
              <FlaskConical className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-300">{sessionInfo}</span>
            </div>
          )}

          {/* Role indicator */}
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{ background: config.bg, border: `1px solid ${config.border}` }}
          >
            <RoleIcon className="h-3.5 w-3.5" style={{ color: config.color }} />
            <span
              className="hidden text-xs font-semibold uppercase tracking-wide sm:inline"
              style={{ color: config.color }}
            >
              {config.label}
            </span>
            {/* Pulsing color dot */}
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
                style={{ backgroundColor: config.color }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
            </span>
          </div>

          {/* User name */}
          <div className="hidden items-center gap-2 md:flex">
            <div className="h-7 w-7 flex items-center justify-center rounded-full bg-slate-700/60 border border-slate-600/30">
              <span className="text-[11px] font-bold uppercase text-slate-300">
                {userName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </span>
            </div>
            <span className="max-w-[120px] truncate text-sm font-medium text-slate-200">
              {userName}
            </span>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-700/50" />

          {/* Logout */}
          <motion.button
            id="header-logout-btn"
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
            onClick={onLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}

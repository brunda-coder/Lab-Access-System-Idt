// ─────────────────────────────────────────────────────────────
// RoleSelection.tsx — Landing page with role selection cards
// ─────────────────────────────────────────────────────────────

import { motion } from 'motion/react';
import { GraduationCap, ClipboardCheck, ShieldCheck, Sparkles } from 'lucide-react';
import type { UserRole } from '../types';
import { APP_NAME, APP_SUBTITLE, APP_VERSION } from '../constants';

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
}

const roles = [
  {
    role: 'STUDENT' as UserRole,
    label: 'Student',
    subtitle: 'Enter lab session via security token',
    icon: GraduationCap,
    color: '#0ea5e9',
    bgGlow: 'rgba(14, 165, 233, 0.12)',
    borderGlow: 'rgba(14, 165, 233, 0.25)',
    gradient: 'from-sky-500/20 to-sky-600/5',
    shadowColor: 'rgba(14, 165, 233, 0.25)',
  },
  {
    role: 'EVALUATOR' as UserRole,
    label: 'Evaluator',
    subtitle: 'Manage assignments, grade submissions',
    icon: ClipboardCheck,
    color: '#8b5cf6',
    bgGlow: 'rgba(139, 92, 246, 0.12)',
    borderGlow: 'rgba(139, 92, 246, 0.25)',
    gradient: 'from-violet-500/20 to-violet-600/5',
    shadowColor: 'rgba(139, 92, 246, 0.25)',
  },
  {
    role: 'ADMIN' as UserRole,
    label: 'Admin',
    subtitle: 'System oversight & room management',
    icon: ShieldCheck,
    color: '#10b981',
    bgGlow: 'rgba(16, 185, 129, 0.12)',
    borderGlow: 'rgba(16, 185, 129, 0.25)',
    gradient: 'from-emerald-500/20 to-emerald-600/5',
    shadowColor: 'rgba(16, 185, 129, 0.25)',
  },
] as const;

export default function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* ── Animated Background Orbs ──────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
          }}
          animate={{
            x: [0, 60, -30, 0],
            y: [0, -40, 50, 0],
            scale: [1, 1.15, 0.95, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 -right-40 h-[450px] w-[450px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, transparent 70%)',
          }}
          animate={{
            x: [0, -50, 30, 0],
            y: [0, 60, -30, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-24 left-1/3 h-[400px] w-[400px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
          }}
          animate={{
            x: [0, 40, -60, 0],
            y: [0, -50, 20, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* ── Hero Section ──────────────────────────────────────── */}
      <motion.div
        className="relative z-10 mb-14 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <motion.div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-500/20"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 200 }}
        >
          <Sparkles className="h-8 w-8 text-white" />
        </motion.div>

        <h1 className="font-display text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl lg:text-6xl">
          {APP_NAME.split('&').map((part, i) => (
            <span key={i}>
              {i > 0 && (
                <span className="bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">
                  &amp;
                </span>
              )}
              {part}
            </span>
          ))}
        </h1>

        <motion.p
          className="mt-4 font-sans text-lg text-slate-400 sm:text-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {APP_SUBTITLE}
        </motion.p>
      </motion.div>

      {/* ── Role Cards Grid ───────────────────────────────────── */}
      <div className="relative z-10 grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
        {roles.map((r, index) => {
          const Icon = r.icon;
          return (
            <motion.button
              key={r.role}
              id={`role-card-${r.role.toLowerCase()}`}
              className="group relative flex cursor-pointer flex-col items-center rounded-2xl border border-slate-700/40 bg-[rgba(15,23,42,0.6)] p-8 text-center backdrop-blur-xl transition-colors hover:border-transparent focus-visible:outline-none"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.3 + index * 0.12,
                ease: 'easeOut',
              }}
              whileHover={{
                scale: 1.04,
                boxShadow: `0 0 40px ${r.shadowColor}, 0 8px 32px rgba(0,0,0,0.3)`,
                borderColor: r.borderGlow,
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectRole(r.role)}
              aria-label={`Continue as ${r.label}`}
            >
              {/* Gradient border glow on hover */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background: `linear-gradient(135deg, ${r.borderGlow}, transparent 60%)`,
                }}
              />

              {/* Icon container */}
              <div
                className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: r.bgGlow }}
              >
                <Icon className="h-8 w-8" style={{ color: r.color }} />
              </div>

              {/* Label */}
              <h2
                className="relative font-display text-xl font-semibold transition-colors duration-300"
                style={{ color: r.color }}
              >
                {r.label}
              </h2>

              {/* Subtitle */}
              <p className="relative mt-2 text-sm leading-relaxed text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
                {r.subtitle}
              </p>

              {/* Bottom accent line */}
              <div
                className="mt-6 h-0.5 w-12 rounded-full opacity-30 transition-all duration-500 group-hover:w-20 group-hover:opacity-70"
                style={{ background: r.color }}
              />
            </motion.button>
          );
        })}
      </div>

      {/* ── Version Badge ─────────────────────────────────────── */}
      <motion.div
        className="relative z-10 mt-14"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <span className="badge bg-slate-800/60 text-slate-500 border border-slate-700/40">
          v{APP_VERSION}
        </span>
      </motion.div>
    </div>
  );
}

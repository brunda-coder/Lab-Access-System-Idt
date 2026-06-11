// ─────────────────────────────────────────────────────────────
// AuthLogin.tsx — Email/password auth for EVALUATOR & ADMIN
// ─────────────────────────────────────────────────────────────

import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ClipboardCheck,
  ShieldCheck,
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { UserRole } from '../types';
import { APP_NAME } from '../constants';

interface AuthLoginProps {
  role: 'EVALUATOR' | 'ADMIN';
  onLogin: (data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    isRegister: boolean;
  }) => void;
  onBack: () => void;
  error: string | null;
  loading: boolean;
}

const roleConfig = {
  EVALUATOR: {
    label: 'Evaluator',
    icon: ClipboardCheck,
    color: '#8b5cf6',
    bgGlow: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.25)',
    gradientFrom: 'from-violet-600',
    gradientTo: 'to-violet-500',
    hoverFrom: 'hover:from-violet-500',
    hoverTo: 'hover:to-violet-400',
    shadow: 'shadow-violet-500/20',
    focusRing: 'focus:border-violet-500/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]',
  },
  ADMIN: {
    label: 'Admin',
    icon: ShieldCheck,
    color: '#10b981',
    bgGlow: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    gradientFrom: 'from-emerald-600',
    gradientTo: 'to-emerald-500',
    hoverFrom: 'hover:from-emerald-500',
    hoverTo: 'hover:to-emerald-400',
    shadow: 'shadow-emerald-500/20',
    focusRing: 'focus:border-emerald-500/50 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)]',
  },
} as const;

export default function AuthLogin({ role, onLogin, onBack, error, loading }: AuthLoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const config = roleConfig[role];
  const Icon = config.icon;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onLogin({ email, password, name, role, isRegister });
  };

  const isFormValid = email.trim() && password.trim() && (!isRegister || name.trim());

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      {/* ── Background glow ────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full opacity-20"
          style={{
            background: `radial-gradient(circle, ${config.color}33 0%, transparent 70%)`,
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* ── Back button ─────────────────────────────────────── */}
        <motion.button
          id="auth-back-btn"
          className="btn-secondary mb-8 inline-flex items-center gap-2 !px-4 !py-2 text-sm"
          onClick={onBack}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.97 }}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </motion.button>

        {/* ── Card ─────────────────────────────────────────────── */}
        <div className="glass-panel-elevated rounded-2xl p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <motion.div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl"
              style={{ background: config.bgGlow, border: `1px solid ${config.borderColor}` }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.15 }}
            >
              <Icon className="h-7 w-7" style={{ color: config.color }} />
            </motion.div>
            <h1 className="font-display text-2xl font-bold text-slate-100">
              {config.label} {isRegister ? 'Registration' : 'Login'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">{APP_NAME}</p>
          </div>

          {/* ── Error display ──────────────────────────────────── */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-300">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Form ────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Register toggle */}
            <AnimatePresence>
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label htmlFor="auth-name" className="mb-1.5 block text-sm font-medium text-slate-300">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="auth-name"
                      type="text"
                      className={`input-base w-full pl-10 ${config.focusRing}`}
                      placeholder="Dr. John Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      autoComplete="name"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="auth-email"
                  type="email"
                  className={`input-base w-full pl-10 ${config.focusRing}`}
                  placeholder="you@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="auth-password"
                  type="password"
                  className={`input-base w-full pl-10 ${config.focusRing}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <motion.button
              id="auth-submit-btn"
              type="submit"
              className={`w-full rounded-xl bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} ${config.hoverFrom} ${config.hoverTo} px-5 py-3 text-sm font-semibold text-white shadow-lg ${config.shadow} transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50`}
              disabled={loading || !isFormValid}
              whileHover={!loading && isFormValid ? { y: -1 } : undefined}
              whileTap={!loading && isFormValid ? { scale: 0.98 } : undefined}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isRegister ? 'Creating Account…' : 'Signing In…'}
                </span>
              ) : isRegister ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* ── Toggle auth mode ───────────────────────────────── */}
          <div className="mt-6 text-center">
            <button
              id="auth-toggle-mode"
              type="button"
              className="text-sm text-slate-400 transition-colors hover:text-slate-200"
              onClick={() => setIsRegister(!isRegister)}
              disabled={loading}
            >
              {isRegister ? (
                <>
                  Already have an account?{' '}
                  <span className="font-semibold" style={{ color: config.color }}>
                    Sign In
                  </span>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <span className="font-semibold" style={{ color: config.color }}>
                    Register
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

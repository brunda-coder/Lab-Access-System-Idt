// ─────────────────────────────────────────────────────────────
// StudentEntry.tsx — Student token-based lab entry page
// ─────────────────────────────────────────────────────────────

import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  GraduationCap,
  User,
  Hash,
  FlaskConical,
  KeyRound,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Info,
} from 'lucide-react';
import type { LabSession } from '../types';
import { TOKEN_LENGTH } from '../constants';

interface StudentEntryProps {
  sessions: LabSession[];
  onEntry: (data: { name: string; regNum: string; sessionId: string }) => void;
  onBack: () => void;
  error: string | null;
  loading: boolean;
}

export default function StudentEntry({ sessions, onEntry, onBack, error, loading }: StudentEntryProps) {
  const [name, setName] = useState('');
  const [regNum, setRegNum] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);

  const activeSessions = sessions.filter((s) => s.is_active);
  const selectedSession = activeSessions.find((s) => s.id === selectedSessionId);

  const handleTokenChange = (value: string) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, TOKEN_LENGTH);
    setToken(sanitized);
    setTokenError(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTokenError(null);

    if (!selectedSession) return;

    // Validate token against the selected session's current dynamic token
    if (token !== selectedSession.current_dynamic_token) {
      setTokenError('Invalid security token. Please check the token displayed in your lab and try again.');
      return;
    }

    onEntry({ name: name.trim(), regNum: regNum.trim(), sessionId: selectedSessionId });
  };

  const isFormValid =
    name.trim() &&
    regNum.trim() &&
    selectedSessionId &&
    token.length === TOKEN_LENGTH;

  const displayError = error || tokenError;

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      {/* ── Background glow ────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* ── Back button ─────────────────────────────────────── */}
        <motion.button
          id="student-back-btn"
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
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.15 }}
            >
              <GraduationCap className="h-7 w-7 text-sky-400" />
            </motion.div>
            <h1 className="font-display text-2xl font-bold text-slate-100">
              Student Laboratory Access
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Verify your identity and enter a lab session
            </p>
          </div>

          {/* ── Error display ──────────────────────────────────── */}
          <AnimatePresence>
            {displayError && (
              <motion.div
                className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-300">{displayError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Form ────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Student name */}
            <div>
              <label htmlFor="student-name" className="mb-1.5 block text-sm font-medium text-slate-300">
                Full Name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="student-name"
                  type="text"
                  className="input-base w-full pl-10 focus:border-sky-500/50 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* Registration number */}
            <div>
              <label htmlFor="student-reg" className="mb-1.5 block text-sm font-medium text-slate-300">
                Registration Number
              </label>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="student-reg"
                  type="text"
                  className="input-base w-full pl-10 focus:border-sky-500/50 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]"
                  placeholder="e.g. 21BCE1234"
                  value={regNum}
                  onChange={(e) => setRegNum(e.target.value.toUpperCase())}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Session selector */}
            <div>
              <label htmlFor="student-session" className="mb-1.5 block text-sm font-medium text-slate-300">
                Lab Session
              </label>
              <div className="relative">
                <FlaskConical className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <select
                  id="student-session"
                  className="input-base w-full appearance-none pl-10 pr-10 focus:border-sky-500/50 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]"
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  disabled={loading}
                  required
                >
                  <option value="">
                    {activeSessions.length === 0
                      ? 'No active sessions available'
                      : 'Select a lab session…'}
                  </option>
                  {activeSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.course_code} — {session.course_name} ({session.room})
                    </option>
                  ))}
                </select>
                {/* Custom dropdown arrow */}
                <svg
                  className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* ── Token input ──────────────────────────────────── */}
            <div>
              <label htmlFor="student-token" className="mb-1.5 block text-sm font-medium text-slate-300">
                Security Token
              </label>
              <div className="relative">
                <input
                  id="student-token"
                  type="text"
                  className="input-base w-full text-center font-mono text-2xl font-bold tracking-[0.35em] uppercase focus:border-sky-500/50 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)] sm:text-3xl"
                  style={{
                    padding: '16px 20px',
                    letterSpacing: '0.35em',
                    textShadow: token.length === TOKEN_LENGTH ? '0 0 12px rgba(14,165,233,0.3)' : 'none',
                    color: token.length === TOKEN_LENGTH ? '#0ea5e9' : '#e2e8f0',
                  }}
                  placeholder={'•'.repeat(TOKEN_LENGTH)}
                  value={token}
                  onChange={(e) => handleTokenChange(e.target.value)}
                  disabled={loading}
                  maxLength={TOKEN_LENGTH}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
              </div>
              {/* Character count & hint */}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Info className="h-3 w-3" />
                  <span className="text-xs">
                    Enter the {TOKEN_LENGTH}-character security token displayed in your lab
                  </span>
                </div>
                <span
                  className="text-xs font-mono font-medium"
                  style={{
                    color: token.length === TOKEN_LENGTH ? '#0ea5e9' : 'rgb(100 116 139)',
                  }}
                >
                  {token.length}/{TOKEN_LENGTH}
                </span>
              </div>
            </div>

            {/* ── Submit ────────────────────────────────────────── */}
            <motion.button
              id="student-entry-submit"
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all duration-200 hover:from-sky-500 hover:to-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading || !isFormValid}
              whileHover={!loading && isFormValid ? { y: -1 } : undefined}
              whileTap={!loading && isFormValid ? { scale: 0.98 } : undefined}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying…
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Verify &amp; Enter Lab Session
                </span>
              )}
            </motion.button>
          </form>

          {/* ── Empty session notice ───────────────────────────── */}
          <AnimatePresence>
            {activeSessions.length === 0 && (
              <motion.div
                className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-sm text-amber-300/80">
                  No active lab sessions are currently available. Please wait for your evaluator to start a session.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// pages/EvaluatorDashboard.tsx — Comprehensive Evaluator Portal
// Provides token management, assignment creation, submission
// review, doubt resolution, attendance tracking, and session
// management via a sidebar-navigated dashboard layout.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Key,
  FileText,
  CheckSquare,
  MessageCircle,
  Users,
  Settings,
  Plus,
  Trash2,
  Edit3,
  RotateCw,
  Upload,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Send,
  Download,
  Paperclip,
  Eye,
  Menu,
  Zap,
  BookOpen,
  Calendar,
  Hash,
  Award,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react';
import Header from '../components/Header';
import type {
  UserProfile,
  LabSession,
  Assignment,
  Submission,
  SubmissionStatus,
  Doubt,
  AttendanceRecord,
  FileAttachment,
} from '../types';
import {
  SessionStore,
  AssignmentStore,
  SubmissionStore,
  DoubtStore,
  AttendanceStore,
} from '../utils/storage';
import { generateSecureToken } from '../utils/token';
import { TOKEN_ROTATION_INTERVAL_MS, DEFAULT_MAX_MARKS, DOUBT_CATEGORIES } from '../constants';

// ── Types ────────────────────────────────────────────────────

type SidebarSection =
  | 'tokens'
  | 'assignments'
  | 'submissions'
  | 'doubts'
  | 'attendance'
  | 'sessions';

interface EvaluatorDashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

// ── Sidebar config ───────────────────────────────────────────

const SIDEBAR_ITEMS: { id: SidebarSection; label: string; icon: typeof Key }[] = [
  { id: 'tokens', label: 'Live Tokens', icon: Key },
  { id: 'assignments', label: 'Assignments', icon: FileText },
  { id: 'submissions', label: 'Review Submissions', icon: CheckSquare },
  { id: 'doubts', label: 'Resolve Doubts', icon: MessageCircle },
  { id: 'attendance', label: 'Attendance', icon: Users },
  { id: 'sessions', label: 'Session Management', icon: Settings },
];

// ── Helper: format relative time ─────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Countdown Ring SVG Component ─────────────────────────────

function CountdownRing({
  secondsLeft,
  total,
}: {
  secondsLeft: number;
  total: number;
}) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = secondsLeft / total;
  const offset = circumference * (1 - progress);

  const color =
    secondsLeft > 20
      ? '#22c55e'
      : secondsLeft > 10
        ? '#f59e0b'
        : '#ef4444';

  const glowColor =
    secondsLeft > 20
      ? 'rgba(34,197,94,0.3)'
      : secondsLeft > 10
        ? 'rgba(245,158,11,0.3)'
        : 'rgba(239,68,68,0.5)';

  return (
    <svg width="108" height="108" viewBox="0 0 108 108" className="shrink-0">
      {/* Background track */}
      <circle
        cx="54"
        cy="54"
        r={radius}
        fill="none"
        stroke="rgba(51,65,85,0.3)"
        strokeWidth="6"
      />
      {/* Progress arc */}
      <circle
        cx="54"
        cy="54"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 54 54)"
        style={{
          transition: 'stroke-dashoffset 0.95s linear, stroke 0.3s ease',
          filter: `drop-shadow(0 0 6px ${glowColor})`,
        }}
      />
      {/* Center text */}
      <text
        x="54"
        y="54"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="22"
        fontWeight="800"
        fontFamily="'JetBrains Mono', monospace"
        style={{ transition: 'fill 0.3s ease' }}
      >
        {secondsLeft}
      </text>
      <text
        x="54"
        y="72"
        textAnchor="middle"
        fill="rgba(148,163,184,0.6)"
        fontSize="9"
        fontWeight="500"
      >
        sec
      </text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export default function EvaluatorDashboard({ user, onLogout }: EvaluatorDashboardProps) {
  // ── Sidebar state ────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<SidebarSection>('tokens');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Data state ───────────────────────────────────────────
  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  // ── Token countdown state ────────────────────────────────
  const [tokenCountdowns, setTokenCountdowns] = useState<Record<string, number>>({});

  // ── Load all data from storage ───────────────────────────
  const loadAllData = useCallback(() => {
    setSessions(SessionStore.getAll());
    setAssignments(AssignmentStore.getAll());
    setSubmissions(SubmissionStore.getAll());
    setDoubts(DoubtStore.getAll());
    setAttendance(AttendanceStore.getAll());
  }, []);

  // Initial load + 3-second polling
  useEffect(() => {
    loadAllData();
    const pollInterval = setInterval(loadAllData, 3000);
    return () => clearInterval(pollInterval);
  }, [loadAllData]);

  // ── Token countdown timer (ticks every second) ──────────
  useEffect(() => {
    const interval = setInterval(() => {
      const activeSessions = sessions.filter((s) => s.is_active);
      const now = Date.now();
      const rotationSec = TOKEN_ROTATION_INTERVAL_MS / 1000;

      const newCountdowns: Record<string, number> = {};
      let needsRotation = false;

      activeSessions.forEach((session) => {
        const elapsed = Math.floor(
          (now - new Date(session.token_generated_at).getTime()) / 1000
        );
        const remaining = Math.max(0, rotationSec - elapsed);
        newCountdowns[session.id] = remaining;

        if (remaining <= 0) {
          needsRotation = true;
        }
      });

      setTokenCountdowns(newCountdowns);

      if (needsRotation) {
        activeSessions.forEach((session) => {
          if (newCountdowns[session.id] <= 0) {
            const newToken = generateSecureToken();
            SessionStore.update(session.id, {
              current_dynamic_token: newToken,
              token_generated_at: new Date().toISOString(),
            });
          }
        });
        // Reload sessions to pick up the new tokens
        setSessions(SessionStore.getAll());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessions]);

  // ── Derived data ─────────────────────────────────────────
  const activeSessions = useMemo(() => sessions.filter((s) => s.is_active), [sessions]);

  // ── Force rotate a single token ──────────────────────────
  const forceRotateToken = useCallback((sessionId: string) => {
    const newToken = generateSecureToken();
    SessionStore.update(sessionId, {
      current_dynamic_token: newToken,
      token_generated_at: new Date().toISOString(),
    });
    setSessions(SessionStore.getAll());
  }, []);

  // ── Render active section ────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case 'tokens':
        return (
          <LiveTokensSection
            sessions={activeSessions}
            countdowns={tokenCountdowns}
            onForceRotate={forceRotateToken}
          />
        );
      case 'assignments':
        return (
          <AssignmentsSection
            sessions={sessions}
            assignments={assignments}
            submissions={submissions}
            userId={user.uid}
            onRefresh={loadAllData}
          />
        );
      case 'submissions':
        return (
          <SubmissionsSection
            sessions={sessions}
            submissions={submissions}
            assignments={assignments}
            userId={user.uid}
            userName={user.full_name}
            onRefresh={loadAllData}
          />
        );
      case 'doubts':
        return (
          <DoubtsSection
            doubts={doubts}
            userId={user.uid}
            userName={user.full_name}
            onRefresh={loadAllData}
          />
        );
      case 'attendance':
        return (
          <AttendanceSection
            sessions={sessions}
            attendance={attendance}
          />
        );
      case 'sessions':
        return (
          <SessionManagementSection
            sessions={sessions}
            userId={user.uid}
            onRefresh={loadAllData}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* Header */}
      <div className="px-4 pt-4 lg:px-6 lg:pt-6">
        <Header role="EVALUATOR" userName={user.full_name} onLogout={onLogout} />
      </div>

      {/* Mobile menu toggle */}
      <div className="lg:hidden px-4 pt-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          id="mobile-menu-toggle"
          className="btn-secondary flex items-center gap-2 w-full justify-center"
        >
          <Menu className="w-4 h-4" />
          {SIDEBAR_ITEMS.find((i) => i.id === activeSection)?.label}
        </button>
      </div>

      <div className="flex gap-4 p-4 lg:gap-6 lg:p-6 min-h-[calc(100vh-88px)]">
        {/* ── Sidebar (desktop) ─────────────────────────── */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 64 : 240 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="hidden lg:flex flex-col glass-panel rounded-2xl p-3 shrink-0 overflow-hidden"
          id="evaluator-sidebar"
        >
          <nav className="flex flex-col gap-1 flex-1">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  id={`sidebar-${item.id}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap overflow-hidden ${
                    isActive
                      ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-violet-400' : ''}`} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            id="sidebar-collapse-toggle"
            className="flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors mt-2 cursor-pointer"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </motion.aside>

        {/* ── Mobile sidebar overlay ────────────────────── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <motion.nav
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="glass-panel-elevated w-64 h-full p-4 flex flex-col gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/40">
                  <span className="font-display font-bold text-sm text-slate-200">Navigation</span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-800/50 text-slate-400 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {SIDEBAR_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-violet-400' : ''}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </motion.nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main content ──────────────────────────────── */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION 1: LIVE TOKEN DISPLAY
// ══════════════════════════════════════════════════════════════

function LiveTokensSection({
  sessions,
  countdowns,
  onForceRotate,
}: {
  sessions: LabSession[];
  countdowns: Record<string, number>;
  onForceRotate: (id: string) => void;
}) {
  const totalSeconds = TOKEN_ROTATION_INTERVAL_MS / 1000;

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="p-5 bg-slate-800/30 rounded-2xl border border-slate-700/30 mb-6">
          <Key className="w-12 h-12 text-slate-600" />
        </div>
        <h2 className="font-display font-bold text-xl text-slate-300 mb-2">No Active Sessions</h2>
        <p className="text-slate-500 text-sm max-w-md">
          Create and activate a lab session from the Session Management tab to start
          generating live access tokens.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
          <Zap className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-slate-100">Live Access Tokens</h2>
          <p className="text-xs text-slate-500">
            Tokens rotate every {totalSeconds} seconds • Display on projector for student access
          </p>
        </div>
      </div>

      {/* Token cards grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 stagger-children">
        {sessions.map((session) => {
          const secondsLeft = countdowns[session.id] ?? totalSeconds;
          const urgencyClass =
            secondsLeft > 20
              ? 'border-emerald-500/30'
              : secondsLeft > 10
                ? 'border-amber-500/40'
                : 'border-red-500/50';

          const tokenGlow =
            secondsLeft > 20
              ? 'text-emerald-400'
              : secondsLeft > 10
                ? 'text-amber-400'
                : 'text-red-400';

          const bgGradient =
            secondsLeft > 20
              ? 'from-emerald-500/5 via-transparent to-transparent'
              : secondsLeft > 10
                ? 'from-amber-500/5 via-transparent to-transparent'
                : 'from-red-500/8 via-transparent to-transparent';

          return (
            <motion.div
              key={session.id}
              layout
              className={`relative overflow-hidden rounded-2xl border-2 ${urgencyClass} transition-colors duration-500`}
              animate={
                secondsLeft <= 10
                  ? {
                      boxShadow: [
                        '0 0 0 0 rgba(239,68,68,0)',
                        '0 0 30px 4px rgba(239,68,68,0.15)',
                        '0 0 0 0 rgba(239,68,68,0)',
                      ],
                    }
                  : {}
              }
              transition={
                secondsLeft <= 10
                  ? { boxShadow: { duration: 1.2, repeat: Infinity } }
                  : {}
              }
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} pointer-events-none`} />
              <div className="absolute inset-0 bg-[rgba(15,23,42,0.7)] pointer-events-none" />

              <div className="relative p-6 lg:p-8">
                {/* Course info bar */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="badge bg-violet-500/15 text-violet-300 border border-violet-500/20">
                      {session.course_code}
                    </span>
                    <span className="text-slate-500 text-xs font-mono">{session.room}</span>
                  </div>
                  <button
                    onClick={() => onForceRotate(session.id)}
                    id={`force-rotate-${session.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-violet-300 hover:border-violet-500/30 hover:bg-violet-500/10 text-xs font-semibold transition-all duration-200 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Force Rotate
                  </button>
                </div>

                {/* Token + Countdown ring */}
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    {/* The MASSIVE token */}
                    <div
                      className={`token-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl ${tokenGlow} transition-colors duration-500 select-all leading-none`}
                      style={{
                        textShadow:
                          secondsLeft <= 10
                            ? '0 0 30px rgba(239,68,68,0.4), 0 0 60px rgba(239,68,68,0.2)'
                            : secondsLeft <= 20
                              ? '0 0 25px rgba(245,158,11,0.3), 0 0 50px rgba(245,158,11,0.1)'
                              : '0 0 20px rgba(34,197,94,0.3), 0 0 40px rgba(34,197,94,0.1)',
                      }}
                    >
                      {session.current_dynamic_token}
                    </div>
                    <p className="text-slate-600 text-xs mt-3 font-mono">
                      {session.course_name}
                    </p>
                  </div>

                  {/* Countdown ring */}
                  <CountdownRing secondsLeft={secondsLeft} total={totalSeconds} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION 2: ASSIGNMENTS
// ══════════════════════════════════════════════════════════════

function AssignmentsSection({
  sessions,
  assignments,
  submissions,
  userId,
  onRefresh,
}: {
  sessions: LabSession[];
  assignments: Assignment[];
  submissions: Submission[];
  userId: string;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setSessionId('');
    setAttachments([]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const attachment: FileAttachment = {
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          data: reader.result as string,
          uploaded_at: new Date().toISOString(),
        };
        setAttachments((prev) => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !sessionId) return;

    if (editingId) {
      AssignmentStore.update(editingId, {
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate,
        lab_session_id: sessionId,
        attachments,
      });
    } else {
      AssignmentStore.create({
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate,
        lab_session_id: sessionId,
        created_by: userId,
        attachments,
      });
    }
    resetForm();
    onRefresh();
  };

  const startEdit = (a: Assignment) => {
    setEditingId(a.id);
    setTitle(a.title);
    setDescription(a.description);
    setDueDate(a.due_date);
    setSessionId(a.lab_session_id);
    setAttachments(a.attachments);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    AssignmentStore.delete(id);
    onRefresh();
  };

  const getSubmissionCount = (assignmentId: string) =>
    submissions.filter((s) => s.assignment_id === assignmentId).length;

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
            <FileText className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-100">Assignments</h2>
            <p className="text-xs text-slate-500">{assignments.length} total assignments</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          id="create-assignment-btn"
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Assignment
        </button>
      </div>

      {/* Create/Edit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm text-slate-200">
                  {editingId ? 'Edit Assignment' : 'Create New Assignment'}
                </h3>
                <button type="button" onClick={resetForm} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-base w-full"
                    placeholder="e.g. Lab 3: Binary Search"
                    required
                    id="assignment-title-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Session *</label>
                  <select
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="input-base w-full"
                    required
                    id="assignment-session-select"
                  >
                    <option value="">Select a session…</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.course_code} — {s.course_name} ({s.room})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-base w-full"
                  rows={3}
                  placeholder="Assignment instructions and requirements…"
                  id="assignment-description-input"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Due Date</label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="input-base w-full"
                    id="assignment-due-date-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Attachments</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-secondary flex items-center gap-2 text-xs"
                      id="assignment-upload-btn"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload Files
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <span className="text-xs text-slate-500">
                      {attachments.length} file{attachments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {attachments.map((att) => (
                        <span
                          key={att.id}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/60 border border-slate-700/30 text-xs text-slate-300"
                        >
                          <Paperclip className="w-3 h-3 text-slate-500" />
                          {att.name}
                          <button
                            type="button"
                            onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                            className="text-slate-500 hover:text-rose-400 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs" id="assignment-submit-btn">
                  {editingId ? 'Update Assignment' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assignments list */}
      {assignments.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No assignments created yet.</p>
          <p className="text-slate-600 text-xs mt-1">Click "New Assignment" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {assignments
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((a) => {
              const session = sessions.find((s) => s.id === a.lab_session_id);
              const subCount = getSubmissionCount(a.id);
              return (
                <div key={a.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-semibold text-sm text-slate-100">{a.title}</h4>
                      {session && (
                        <span className="badge bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {session.course_code}
                        </span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{a.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {a.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {formatDate(a.due_date)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" />
                        {subCount} submission{subCount !== 1 ? 's' : ''}
                      </span>
                      {a.attachments.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          {a.attachments.length} file{a.attachments.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(a)}
                      id={`edit-assignment-${a.id}`}
                      className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:text-violet-300 hover:border-violet-500/30 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      id={`delete-assignment-${a.id}`}
                      className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION 3: REVIEW SUBMISSIONS
// ══════════════════════════════════════════════════════════════

function SubmissionsSection({
  sessions,
  submissions,
  assignments,
  userId,
  userName,
  onRefresh,
}: {
  sessions: LabSession[];
  submissions: Submission[];
  assignments: Assignment[];
  userId: string;
  userName: string;
  onRefresh: () => void;
}) {
  const [filterSession, setFilterSession] = useState('');
  const [filterStatus, setFilterStatus] = useState<SubmissionStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [marks, setMarks] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [gradingStatus, setGradingStatus] = useState<'REVIEWED' | 'GRADED'>('REVIEWED');

  const filtered = useMemo(() => {
    let result = [...submissions].sort(
      (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );
    if (filterSession) result = result.filter((s) => s.lab_session_id === filterSession);
    if (filterStatus) result = result.filter((s) => s.status === filterStatus);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.student_name.toLowerCase().includes(q) ||
          s.student_reg.toLowerCase().includes(q)
      );
    }
    return result;
  }, [submissions, filterSession, filterStatus, searchQuery]);

  const openGrading = (sub: Submission) => {
    setGradingSubmission(sub);
    setMarks(sub.marks ?? 0);
    setFeedback(sub.feedback ?? '');
    setGradingStatus(sub.status === 'GRADED' ? 'GRADED' : 'REVIEWED');
  };

  const handleGradeSave = () => {
    if (!gradingSubmission) return;
    SubmissionStore.update(gradingSubmission.id, {
      marks,
      feedback: feedback.trim() || null,
      status: gradingStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    });
    setGradingSubmission(null);
    onRefresh();
  };

  const statusBadge = (status: SubmissionStatus) => {
    const styles: Record<SubmissionStatus, string> = {
      PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      REVIEWED: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      GRADED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    return `badge border ${styles[status]}`;
  };

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
          <CheckSquare className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-slate-100">Review Submissions</h2>
          <p className="text-xs text-slate-500">
            {submissions.filter((s) => s.status === 'PENDING').length} pending review
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-base w-full pl-9"
              placeholder="Search student name or reg…"
              id="submission-search"
            />
          </div>
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="input-base w-full"
            id="submission-filter-session"
          >
            <option value="">All Sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.course_code} — {s.room}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as SubmissionStatus | '')}
            className="input-base w-full"
            id="submission-filter-status"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="GRADED">Graded</option>
          </select>
        </div>
      </div>

      {/* Submissions list */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <CheckSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No submissions found.</p>
          <p className="text-slate-600 text-xs mt-1">
            {submissions.length === 0
              ? 'Submissions will appear here when students submit their work.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 stagger-children">
          {filtered.map((sub) => {
            const assignment = assignments.find((a) => a.id === sub.assignment_id);
            return (
              <button
                key={sub.id}
                onClick={() => openGrading(sub)}
                id={`review-submission-${sub.id}`}
                className="card w-full text-left flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:border-violet-500/30 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm text-slate-100">{sub.student_name}</span>
                    <span className="font-mono text-xs text-slate-500">{sub.student_reg}</span>
                    <span className={statusBadge(sub.status)}>{sub.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{sub.course_code}</span>
                    {assignment && <span>• {assignment.title}</span>}
                    <span>• {timeAgo(sub.submitted_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {sub.marks !== null && (
                    <span className="font-mono text-sm font-bold text-violet-300">
                      {sub.marks}/{sub.max_marks}
                    </span>
                  )}
                  <Eye className="w-4 h-4 text-slate-500" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Grading Modal ──────────────────────────────── */}
      <AnimatePresence>
        {gradingSubmission && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setGradingSubmission(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel-elevated rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-100">
                    Grade Submission
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {gradingSubmission.student_name} • {gradingSubmission.student_reg}
                  </p>
                </div>
                <button
                  onClick={() => setGradingSubmission(null)}
                  className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 cursor-pointer"
                  id="close-grading-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Course</p>
                  <p className="text-sm text-slate-200 font-mono">{gradingSubmission.course_code}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Status</p>
                  <span className={statusBadge(gradingSubmission.status)}>
                    {gradingSubmission.status}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Submitted</p>
                  <p className="text-sm text-slate-200">{timeAgo(gradingSubmission.submitted_at)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Files</p>
                  <p className="text-sm text-slate-200">{gradingSubmission.files.length} attached</p>
                </div>
              </div>

              {/* Code content */}
              {gradingSubmission.code_content && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Submitted Code</h4>
                  <pre className="bg-[#030712] border border-slate-700/40 rounded-xl p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-words">
                    {gradingSubmission.code_content}
                  </pre>
                </div>
              )}

              {/* Attached files */}
              {gradingSubmission.files.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">Attached Files</h4>
                  <div className="flex flex-wrap gap-2">
                    {gradingSubmission.files.map((f) => (
                      <a
                        key={f.id}
                        href={f.data}
                        download={f.name}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/30 text-xs text-sky-400 hover:border-sky-500/30 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        {f.name}
                        <span className="text-slate-600">
                          ({(f.size / 1024).toFixed(1)}KB)
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Grading controls */}
              <div className="space-y-4 border-t border-slate-700/40 pt-6">
                {/* Marks slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-400">
                      Marks
                    </label>
                    <span className="font-mono text-sm font-bold text-violet-300">
                      {marks} / {gradingSubmission.max_marks}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={gradingSubmission.max_marks}
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
                    className="w-full accent-violet-500"
                    id="marks-slider"
                  />
                  <input
                    type="number"
                    min={0}
                    max={gradingSubmission.max_marks}
                    value={marks}
                    onChange={(e) =>
                      setMarks(Math.min(gradingSubmission.max_marks, Math.max(0, Number(e.target.value))))
                    }
                    className="input-base w-24 mt-2 text-center font-mono"
                    id="marks-input"
                  />
                </div>

                {/* Feedback */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Feedback</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="input-base w-full"
                    rows={3}
                    placeholder="Provide feedback for the student…"
                    id="feedback-textarea"
                  />
                </div>

                {/* Status toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Status</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGradingStatus('REVIEWED')}
                      id="status-reviewed-btn"
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        gradingStatus === 'REVIEWED'
                          ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                          : 'bg-slate-800/50 text-slate-400 border-slate-700/30 hover:bg-slate-700/50'
                      }`}
                    >
                      Reviewed
                    </button>
                    <button
                      type="button"
                      onClick={() => setGradingStatus('GRADED')}
                      id="status-graded-btn"
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        gradingStatus === 'GRADED'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800/50 text-slate-400 border-slate-700/30 hover:bg-slate-700/50'
                      }`}
                    >
                      Graded
                    </button>
                  </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setGradingSubmission(null)}
                    className="btn-secondary text-xs"
                    id="cancel-grading-btn"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGradeSave}
                    className="btn-primary flex items-center gap-2 text-xs"
                    id="save-grading-btn"
                  >
                    <Award className="w-3.5 h-3.5" />
                    Save Grade
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION 4: RESOLVE DOUBTS
// ══════════════════════════════════════════════════════════════

function DoubtsSection({
  doubts,
  userId,
  userName,
  onRefresh,
}: {
  doubts: Doubt[];
  userId: string;
  userName: string;
  onRefresh: () => void;
}) {
  const [expandedDoubt, setExpandedDoubt] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  const openDoubts = doubts
    .filter((d) => d.status === 'OPEN')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const resolvedDoubts = doubts
    .filter((d) => d.status === 'RESOLVED')
    .sort((a, b) => new Date(b.resolved_at ?? b.created_at).getTime() - new Date(a.resolved_at ?? a.created_at).getTime())
    .slice(0, 10);

  const handleResolve = (doubtId: string) => {
    DoubtStore.update(doubtId, {
      status: 'RESOLVED',
      response: responseText.trim() || null,
      responded_by: userId,
      responded_by_name: userName,
      resolved_at: new Date().toISOString(),
    });
    setExpandedDoubt(null);
    setResponseText('');
    onRefresh();
  };

  const categoryBadgeColor = (cat: string) => {
    const colors: Record<string, string> = {
      Conceptual: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      Implementation: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      Debugging: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      Algorithm: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      Syntax: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'Environment Setup': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      'Assignment Clarification': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      Other: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };
    return colors[cat] || colors.Other;
  };

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
          <MessageCircle className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-slate-100">Resolve Doubts</h2>
          <p className="text-xs text-slate-500">
            {openDoubts.length} open doubt{openDoubts.length !== 1 ? 's' : ''} awaiting response
          </p>
        </div>
      </div>

      {/* Open doubts */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          Open Doubts ({openDoubts.length})
        </h3>

        {openDoubts.length === 0 ? (
          <div className="card text-center py-10">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">All doubts resolved!</p>
            <p className="text-slate-600 text-xs mt-1">New student questions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {openDoubts.map((doubt) => (
              <div key={doubt.id} className="card overflow-hidden">
                <button
                  onClick={() => {
                    setExpandedDoubt(expandedDoubt === doubt.id ? null : doubt.id);
                    setResponseText('');
                  }}
                  id={`doubt-toggle-${doubt.id}`}
                  className="w-full text-left p-4 flex items-start gap-3 cursor-pointer hover:bg-slate-800/20 transition-colors"
                >
                  <div className="p-1.5 bg-amber-500/10 rounded-lg mt-0.5 shrink-0">
                    <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-semibold text-sm text-slate-100">{doubt.student_name}</span>
                      <span className="font-mono text-xs text-slate-500">{doubt.student_reg}</span>
                      <span className={`badge border ${categoryBadgeColor(doubt.category)}`}>
                        {doubt.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{doubt.question}</p>
                    <p className="text-xs text-slate-600 mt-1.5">
                      {doubt.course_code} • {timeAgo(doubt.created_at)}
                    </p>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedDoubt === doubt.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-slate-700/30"
                    >
                      <div className="p-4 space-y-3 bg-slate-800/10">
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          className="input-base w-full"
                          rows={3}
                          placeholder="Type your response to the student's question…"
                          id={`doubt-response-${doubt.id}`}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setExpandedDoubt(null)}
                            className="btn-secondary text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleResolve(doubt.id)}
                            className="btn-primary flex items-center gap-2 text-xs"
                            id={`resolve-doubt-${doubt.id}`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            Resolve Doubt
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recently resolved */}
      {resolvedDoubts.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            Recently Resolved ({resolvedDoubts.length})
          </h3>
          <div className="space-y-2">
            {resolvedDoubts.map((doubt) => (
              <div
                key={doubt.id}
                className="card p-4 opacity-70"
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg mt-0.5 shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm text-slate-300">{doubt.student_name}</span>
                      <span className={`badge border ${categoryBadgeColor(doubt.category)}`}>
                        {doubt.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">{doubt.question}</p>
                    {doubt.response && (
                      <div className="mt-2 pl-3 border-l-2 border-emerald-500/30">
                        <p className="text-xs text-emerald-300/80">{doubt.response}</p>
                        <p className="text-[10px] text-slate-600 mt-1">
                          — {doubt.responded_by_name ?? 'Evaluator'} • {doubt.resolved_at ? timeAgo(doubt.resolved_at) : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION 5: ATTENDANCE
// ══════════════════════════════════════════════════════════════

function AttendanceSection({
  sessions,
  attendance,
}: {
  sessions: LabSession[];
  attendance: AttendanceRecord[];
}) {
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Get unique dates from attendance
  const uniqueDates = useMemo(() => {
    const dates = new Set(attendance.map((a) => a.date));
    return Array.from(dates).sort().reverse();
  }, [attendance]);

  const filtered = useMemo(() => {
    let result = attendance;
    if (selectedSession) result = result.filter((a) => a.lab_session_id === selectedSession);
    if (selectedDate) result = result.filter((a) => a.date === selectedDate);
    return result.sort((a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime());
  }, [attendance, selectedSession, selectedDate]);

  // Statistics
  const stats = useMemo(() => {
    const total = filtered.length;
    const present = filtered.filter((a) => a.status === 'PRESENT').length;
    const late = filtered.filter((a) => a.status === 'LATE').length;
    const leftEarly = filtered.filter((a) => a.status === 'LEFT_EARLY').length;
    const absent = filtered.filter((a) => a.status === 'ABSENT').length;
    return { total, present, late, leftEarly, absent };
  }, [filtered]);

  const statusStyle = (status: string) => {
    const styles: Record<string, string> = {
      PRESENT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      LATE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      LEFT_EARLY: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      ABSENT: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };
    return `badge border ${styles[status] || styles.ABSENT}`;
  };

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
          <Users className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-slate-100">Attendance</h2>
          <p className="text-xs text-slate-500">{attendance.length} total records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="input-base w-full"
            id="attendance-filter-session"
          >
            <option value="">All Sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.course_code} — {s.course_name}
              </option>
            ))}
          </select>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-base w-full"
            id="attendance-filter-date"
          >
            <option value="">All Dates</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>
                {formatDate(d)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-200', bg: 'bg-slate-500/10' },
          { label: 'Present', value: stats.present, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Late', value: stats.late, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Left Early', value: stats.leftEarly, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          { label: 'Absent', value: stats.absent, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="card p-4 text-center"
          >
            <p className={`font-mono text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Attendance table */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No attendance records found.</p>
          <p className="text-slate-600 text-xs mt-1">Records appear when students check in with tokens.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-800/30 text-slate-400">
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Reg. Number</th>
                  <th className="px-4 py-3 font-semibold">Course</th>
                  <th className="px-4 py-3 font-semibold">Check In</th>
                  <th className="px-4 py-3 font-semibold">Check Out</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {filtered.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/20 transition-colors text-slate-300">
                    <td className="px-4 py-3 font-medium text-slate-200">{record.student_name}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{record.student_reg}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {record.course_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{formatTime(record.check_in_time)}</td>
                    <td className="px-4 py-3 font-mono">
                      {record.check_out_time ? formatTime(record.check_out_time) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusStyle(record.status)}>
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION 6: SESSION MANAGEMENT
// ══════════════════════════════════════════════════════════════

function SessionManagementSection({
  sessions,
  userId,
  onRefresh,
}: {
  sessions: LabSession[];
  userId: string;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [room, setRoom] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim() || !courseName.trim() || !room.trim()) return;

    SessionStore.create({
      course_code: courseCode.trim().toUpperCase(),
      course_name: courseName.trim(),
      room: room.trim(),
      is_active: true,
      current_dynamic_token: generateSecureToken(),
      token_generated_at: new Date().toISOString(),
      created_by: userId,
    });

    setCourseCode('');
    setCourseName('');
    setRoom('');
    setShowForm(false);
    onRefresh();
  };

  const toggleActive = (id: string, currentActive: boolean) => {
    SessionStore.update(id, { is_active: !currentActive });
    onRefresh();
  };

  const handleDelete = (id: string) => {
    SessionStore.delete(id);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
            <Settings className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-100">Session Management</h2>
            <p className="text-xs text-slate-500">
              {sessions.filter((s) => s.is_active).length} active of {sessions.length} total
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          id="create-session-btn"
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Session
        </button>
      </div>

      {/* Create session form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreate} className="card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm text-slate-200">Create New Lab Session</h3>
                <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Course Code *</label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="input-base w-full"
                    placeholder="e.g. CS201"
                    required
                    id="session-course-code-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Course Name *</label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className="input-base w-full"
                    placeholder="e.g. Data Structures Lab"
                    required
                    id="session-course-name-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Room *</label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="input-base w-full"
                    placeholder="e.g. Lab 301"
                    required
                    id="session-room-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs" id="session-submit-btn">
                  Create Session
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className="card text-center py-12">
          <Settings className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No lab sessions created yet.</p>
          <p className="text-slate-600 text-xs mt-1">Create a session to start managing lab access.</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {sessions
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((session) => (
              <div
                key={session.id}
                className={`card flex flex-col sm:flex-row sm:items-center gap-4 ${
                  session.is_active ? 'border-emerald-500/20' : 'opacity-60'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-semibold text-sm text-slate-100">{session.course_code}</h4>
                    <span className="text-xs text-slate-400">{session.course_name}</span>
                    <span
                      className={`badge border ${
                        session.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                      }`}
                    >
                      {session.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {session.room}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created {timeAgo(session.created_at)}
                    </span>
                    {session.is_active && (
                      <span className="font-mono text-violet-400">
                        Token: {session.current_dynamic_token}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(session.id, session.is_active)}
                    id={`toggle-session-${session.id}`}
                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                      session.is_active
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-slate-800/50 border-slate-700/30 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30'
                    }`}
                    title={session.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {session.is_active ? (
                      <ToggleRight className="w-4.5 h-4.5" />
                    ) : (
                      <ToggleLeft className="w-4.5 h-4.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    id={`delete-session-${session.id}`}
                    className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer"
                    title="Delete Session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

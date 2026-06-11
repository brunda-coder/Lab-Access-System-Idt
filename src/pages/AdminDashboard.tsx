// ─────────────────────────────────────────────────────────────
// pages/AdminDashboard.tsx — Comprehensive Admin Control Panel
// Provides system-wide oversight: sessions, rooms, attendance,
// users, submissions, and real-time token monitoring.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Building, ClipboardList, Tv, Users, FileCheck,
  ChevronLeft, ChevronRight, Plus, Trash2, Edit3, RotateCw, X,
  Activity, Clock, Hash, Shield, Eye, EyeOff, AlertTriangle,
  CheckCircle2, XCircle, Timer, DoorOpen, MonitorSpeaker, Zap,
  Search, Filter, ChevronDown, RefreshCw, Power, Save, Download,
  MessageSquare, User, Calendar, ArrowUpDown, Building2, Cpu,
} from 'lucide-react';

import type {
  UserProfile, LabSession, Submission, Doubt,
  AttendanceRecord, Room, SubmissionStatus,
} from '../types';
import type { AttendanceStatus } from '../types';
import { BUILDINGS, ROOM_EQUIPMENT, TOKEN_ROTATION_INTERVAL_MS } from '../constants';
import {
  SessionStore, SubmissionStore, DoubtStore,
  AttendanceStore, RoomStore, UserStore,
} from '../utils/storage';
import { generateSecureToken } from '../utils/token';
import Header from '../components/Header';

// ── Types ────────────────────────────────────────────────────

type AdminSection = 'overview' | 'rooms' | 'attendance' | 'sessions' | 'users' | 'submissions';

interface AdminDashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

// ── Sidebar nav items ────────────────────────────────────────

const NAV_ITEMS: { id: AdminSection; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'System Overview', icon: LayoutDashboard },
  { id: 'rooms', label: 'Room Management', icon: Building },
  { id: 'attendance', label: 'Attendance Audit', icon: ClipboardList },
  { id: 'sessions', label: 'Session Management', icon: Tv },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'submissions', label: 'Submissions & Grades', icon: FileCheck },
];

// ── Helpers ──────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatTime(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getTokenCountdown(generatedAt: string): number {
  const elapsed = Date.now() - new Date(generatedAt).getTime();
  return Math.max(0, Math.ceil((TOKEN_ROTATION_INTERVAL_MS - elapsed) / 1000));
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'PRESENT': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'LATE': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'LEFT_EARLY': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'ABSENT': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    case 'PENDING': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'REVIEWED': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
    case 'GRADED': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'OPEN': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'RESOLVED': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  }
}

// ── Main Component ───────────────────────────────────────────

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  // ── Sidebar state ────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Data state ───────────────────────────────────────────
  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // ── Countdown ticker ─────────────────────────────────────
  const [, setTick] = useState(0);

  // ── Load & poll data ─────────────────────────────────────
  const refreshData = useCallback(() => {
    setSessions(SessionStore.getAll());
    setSubmissions(SubmissionStore.getAll());
    setDoubts(DoubtStore.getAll());
    setAttendance(AttendanceStore.getAll());
    setRooms(RoomStore.getAll());
    setUsers(UserStore.getAll());
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Token countdown ticker — updates every second
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#030712] flex flex-col">
      <Header role="ADMIN" userName={user.full_name} onLogout={onLogout} />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ────────────────────────────────────── */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 72 : 260 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex-shrink-0 bg-[#0a0f1a] border-r border-slate-800/60 flex flex-col"
        >
          {/* Collapse toggle */}
          <div className="flex items-center justify-end p-3 border-b border-slate-800/40">
            <button
              id="admin-sidebar-toggle"
              onClick={() => setSidebarCollapsed(c => !c)}
              className="p-1.5 rounded-lg hover:bg-slate-800/60 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 py-3 space-y-1 px-2 overflow-y-auto">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  id={`admin-nav-${item.id}`}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </nav>

          {/* Admin badge */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-slate-800/40">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>Admin Access</span>
              </div>
            </div>
          )}
        </motion.aside>

        {/* ── Main Content ───────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {activeSection === 'overview' && (
                <OverviewSection
                  sessions={sessions}
                  submissions={submissions}
                  doubts={doubts}
                  attendance={attendance}
                  rooms={rooms}
                  users={users}
                />
              )}
              {activeSection === 'rooms' && (
                <RoomSection rooms={rooms} sessions={sessions} onRefresh={refreshData} />
              )}
              {activeSection === 'attendance' && (
                <AttendanceSection attendance={attendance} sessions={sessions} onRefresh={refreshData} />
              )}
              {activeSection === 'sessions' && (
                <SessionSection sessions={sessions} onRefresh={refreshData} adminUid={user.uid} />
              )}
              {activeSection === 'users' && (
                <UserSection users={users} onRefresh={refreshData} currentAdminUid={user.uid} />
              )}
              {activeSection === 'submissions' && (
                <SubmissionSection submissions={submissions} sessions={sessions} onRefresh={refreshData} adminUid={user.uid} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// SECTION 1: System Overview
// ═══════════════════════════════════════════════════════════════

interface OverviewProps {
  sessions: LabSession[];
  submissions: Submission[];
  doubts: Doubt[];
  attendance: AttendanceRecord[];
  rooms: Room[];
  users: UserProfile[];
}

function OverviewSection({ sessions, submissions, doubts, attendance, rooms, users }: OverviewProps) {
  const activeSessions = sessions.filter(s => s.is_active);
  const pendingSubs = submissions.filter(s => s.status === 'PENDING').length;
  const reviewedSubs = submissions.filter(s => s.status === 'REVIEWED').length;
  const gradedSubs = submissions.filter(s => s.status === 'GRADED').length;
  const openDoubts = doubts.filter(d => d.status === 'OPEN').length;
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === today).length;

  const stats = [
    {
      label: 'Active Sessions',
      value: activeSessions.length,
      total: sessions.length,
      suffix: 'total',
      icon: Tv,
      gradient: 'from-emerald-500 to-teal-500',
      glow: 'shadow-emerald-500/20',
    },
    {
      label: 'Total Submissions',
      value: submissions.length,
      breakdown: `${pendingSubs}P · ${reviewedSubs}R · ${gradedSubs}G`,
      icon: FileCheck,
      gradient: 'from-indigo-500 to-violet-500',
      glow: 'shadow-indigo-500/20',
    },
    {
      label: 'Open Doubts',
      value: openDoubts,
      total: doubts.length,
      suffix: 'total',
      icon: MessageSquare,
      gradient: 'from-amber-500 to-orange-500',
      glow: 'shadow-amber-500/20',
    },
    {
      label: "Today's Attendance",
      value: todayAttendance,
      icon: ClipboardList,
      gradient: 'from-sky-500 to-blue-500',
      glow: 'shadow-sky-500/20',
    },
    {
      label: 'Total Rooms',
      value: rooms.length,
      total: rooms.filter(r => r.is_available).length,
      suffix: 'available',
      icon: Building,
      gradient: 'from-pink-500 to-rose-500',
      glow: 'shadow-pink-500/20',
    },
    {
      label: 'Registered Users',
      value: users.length,
      icon: Users,
      gradient: 'from-cyan-500 to-teal-500',
      glow: 'shadow-cyan-500/20',
    },
  ];

  // Recent activity
  const recentSubs = [...submissions].sort((a, b) =>
    new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  ).slice(0, 5);

  const recentDoubts = [...doubts].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <LayoutDashboard className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-slate-100">System Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time platform monitoring</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`relative overflow-hidden rounded-2xl bg-slate-900/50 border border-slate-700/40 p-5 hover:border-slate-600/50 transition-all duration-300 ${stat.glow} hover:shadow-lg`}
            >
              {/* Gradient accent top border */}
              <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${stat.gradient}`} />

              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-3xl font-display font-bold text-slate-100 mt-1">{stat.value}</p>
                  {'breakdown' in stat && stat.breakdown && (
                    <p className="text-[11px] font-mono text-slate-400 mt-1">{stat.breakdown}</p>
                  )}
                  {'total' in stat && stat.total !== undefined && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      {stat.total} {stat.suffix}
                    </p>
                  )}
                </div>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} bg-opacity-10`}>
                  <Icon className="w-5 h-5 text-white/80" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live token display for active sessions */}
      {activeSessions.length > 0 && (
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-display font-semibold text-slate-200">Live Active Tokens</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeSessions.map(session => {
              const countdown = getTokenCountdown(session.token_generated_at);
              return (
                <div
                  key={session.id}
                  className="bg-slate-900/70 border border-slate-700/30 rounded-xl p-4 animate-token-pulse"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-emerald-400 font-semibold">{session.course_code}</span>
                    <span className="text-[10px] text-slate-500">{session.room}</span>
                  </div>
                  <div className="token-display text-2xl text-center text-indigo-400 py-2">
                    {session.current_dynamic_token}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <Timer className="w-3 h-3 text-slate-500" />
                    <span className={`text-xs font-mono ${countdown < 10 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {countdown}s
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent submissions */}
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-display font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-indigo-400" />
            Recent Submissions
          </h3>
          {recentSubs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No submissions yet</p>
          ) : (
            <div className="space-y-2">
              {recentSubs.map(sub => (
                <div key={sub.id} className="flex items-center justify-between bg-slate-900/40 rounded-lg px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-200 truncate">{sub.student_name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{sub.course_code} · {formatTime(sub.submitted_at)}</p>
                  </div>
                  <span className={`badge border ${getStatusColor(sub.status)}`}>{sub.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent doubts */}
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-display font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            Recent Doubts
          </h3>
          {recentDoubts.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No doubts yet</p>
          ) : (
            <div className="space-y-2">
              {recentDoubts.map(doubt => (
                <div key={doubt.id} className="flex items-center justify-between bg-slate-900/40 rounded-lg px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-200 truncate">{doubt.question}</p>
                    <p className="text-[11px] text-slate-500">
                      {doubt.student_name} · {doubt.category} · {formatTime(doubt.created_at)}
                    </p>
                  </div>
                  <span className={`badge border ${getStatusColor(doubt.status)}`}>{doubt.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// SECTION 2: Room Management
// ═══════════════════════════════════════════════════════════════

interface RoomSectionProps {
  rooms: Room[];
  sessions: LabSession[];
  onRefresh: () => void;
}

function RoomSection({ rooms, sessions, onRefresh }: RoomSectionProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formBuilding, setFormBuilding] = useState<string>(BUILDINGS[0]);
  const [formFloor, setFormFloor] = useState('');
  const [formCapacity, setFormCapacity] = useState<number>(30);
  const [formEquipment, setFormEquipment] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const resetForm = () => {
    setFormName('');
    setFormBuilding(BUILDINGS[0]);
    setFormFloor('');
    setFormCapacity(30);
    setFormEquipment([]);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setFormName(room.name);
    setFormBuilding(room.building);
    setFormFloor(room.floor);
    setFormCapacity(room.capacity);
    setFormEquipment([...room.equipment]);
  };

  const toggleEquipment = (eq: string) => {
    setFormEquipment(prev =>
      prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]
    );
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formFloor.trim()) return;
    RoomStore.create({
      name: formName.trim(),
      building: formBuilding,
      floor: formFloor.trim(),
      capacity: formCapacity,
      equipment: formEquipment,
      is_available: true,
      assigned_session_id: null,
    });
    resetForm();
    setShowCreateForm(false);
    onRefresh();
  };

  const handleUpdateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !formName.trim() || !formFloor.trim()) return;
    RoomStore.update(editingRoom.id, {
      name: formName.trim(),
      building: formBuilding,
      floor: formFloor.trim(),
      capacity: formCapacity,
      equipment: formEquipment,
    });
    setEditingRoom(null);
    resetForm();
    onRefresh();
  };

  const handleDeleteRoom = (id: string) => {
    RoomStore.delete(id);
    setDeleteConfirmId(null);
    onRefresh();
  };

  const handleToggleAvailability = (room: Room) => {
    RoomStore.update(room.id, { is_available: !room.is_available });
    onRefresh();
  };

  const handleAssignSession = (roomId: string, sessionId: string) => {
    // Unassign the room from any previous session mapping
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      RoomStore.update(roomId, {
        assigned_session_id: sessionId || null,
        is_available: !sessionId,
      });
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20">
            <Building className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-100">Room Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">{rooms.length} rooms configured</p>
          </div>
        </div>
        <button
          id="admin-create-room-btn"
          onClick={() => { resetForm(); setShowCreateForm(true); }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Room
        </button>
      </div>

      {/* Create Room Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <RoomForm
              title="Create New Room"
              formName={formName} setFormName={setFormName}
              formBuilding={formBuilding} setFormBuilding={setFormBuilding}
              formFloor={formFloor} setFormFloor={setFormFloor}
              formCapacity={formCapacity} setFormCapacity={setFormCapacity}
              formEquipment={formEquipment} toggleEquipment={toggleEquipment}
              onSubmit={handleCreateRoom}
              onCancel={() => { resetForm(); setShowCreateForm(false); }}
              submitLabel="Create Room"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Room cards grid */}
      {rooms.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No rooms configured yet</p>
          <p className="text-slate-500 text-xs mt-1">Click "Add Room" to create one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {rooms.map(room => {
            const assignedSession = room.assigned_session_id
              ? sessions.find(s => s.id === room.assigned_session_id)
              : null;

            return (
              <div
                key={room.id}
                className="relative bg-slate-900/50 border border-slate-700/40 rounded-2xl p-5 hover:border-slate-600/50 transition-all group"
              >
                {/* Available indicator */}
                <div className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${
                  room.is_available ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                }`} />

                <h4 className="text-base font-display font-semibold text-slate-100">{room.name}</h4>
                <p className="text-xs text-slate-400 mt-1">{room.building} · Floor {room.floor}</p>

                {/* Capacity */}
                <div className="flex items-center gap-2 mt-3">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs text-slate-400">Capacity: {room.capacity}</span>
                </div>

                {/* Equipment tags */}
                {room.equipment.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {room.equipment.map(eq => (
                      <span
                        key={eq}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/40"
                      >
                        {eq}
                      </span>
                    ))}
                  </div>
                )}

                {/* Assigned session */}
                {assignedSession && (
                  <div className="mt-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
                    <p className="text-[11px] text-indigo-400 font-medium">
                      Assigned: {assignedSession.course_code} — {assignedSession.course_name}
                    </p>
                  </div>
                )}

                {/* Session assignment dropdown */}
                <div className="mt-3">
                  <select
                    id={`admin-room-assign-${room.id}`}
                    value={room.assigned_session_id || ''}
                    onChange={e => handleAssignSession(room.id, e.target.value)}
                    className="w-full input-base text-xs py-1.5"
                  >
                    <option value="">No session assigned</option>
                    {sessions.filter(s => s.is_active).map(s => (
                      <option key={s.id} value={s.id}>{s.course_code} — {s.course_name}</option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/40">
                  <button
                    id={`admin-room-toggle-${room.id}`}
                    onClick={() => handleToggleAvailability(room)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      room.is_available
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {room.is_available ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {room.is_available ? 'Available' : 'Unavailable'}
                  </button>
                  <button
                    id={`admin-room-edit-${room.id}`}
                    onClick={() => openEditModal(room)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    id={`admin-room-delete-${room.id}`}
                    onClick={() => setDeleteConfirmId(room.id)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Delete confirmation */}
                {deleteConfirmId === room.id && (
                  <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 z-10">
                    <AlertTriangle className="w-8 h-8 text-rose-400 mb-2" />
                    <p className="text-sm text-slate-200 font-medium text-center">Delete "{room.name}"?</p>
                    <p className="text-xs text-slate-500 mt-1">This action cannot be undone</p>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="btn-secondary text-xs px-4 py-1.5"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Room Modal */}
      <AnimatePresence>
        {editingRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg"
            >
              <RoomForm
                title={`Edit Room: ${editingRoom.name}`}
                formName={formName} setFormName={setFormName}
                formBuilding={formBuilding} setFormBuilding={setFormBuilding}
                formFloor={formFloor} setFormFloor={setFormFloor}
                formCapacity={formCapacity} setFormCapacity={setFormCapacity}
                formEquipment={formEquipment} toggleEquipment={toggleEquipment}
                onSubmit={handleUpdateRoom}
                onCancel={() => { setEditingRoom(null); resetForm(); }}
                submitLabel="Save Changes"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Room Form (shared between create and edit) ───────────────

interface RoomFormProps {
  title: string;
  formName: string; setFormName: (v: string) => void;
  formBuilding: string; setFormBuilding: (v: string) => void;
  formFloor: string; setFormFloor: (v: string) => void;
  formCapacity: number; setFormCapacity: (v: number) => void;
  formEquipment: string[]; toggleEquipment: (eq: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}

function RoomForm({
  title, formName, setFormName, formBuilding, setFormBuilding,
  formFloor, setFormFloor, formCapacity, setFormCapacity,
  formEquipment, toggleEquipment, onSubmit, onCancel, submitLabel,
}: RoomFormProps) {
  return (
    <form onSubmit={onSubmit} className="glass-panel-elevated rounded-2xl p-6 space-y-4">
      <h3 className="text-lg font-display font-semibold text-slate-100">{title}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Room Name *</label>
          <input
            type="text"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            className="w-full input-base"
            placeholder="e.g., Lab 201"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Building *</label>
          <select
            value={formBuilding}
            onChange={e => setFormBuilding(e.target.value)}
            className="w-full input-base"
          >
            {BUILDINGS.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Floor *</label>
          <input
            type="text"
            value={formFloor}
            onChange={e => setFormFloor(e.target.value)}
            className="w-full input-base"
            placeholder="e.g., 2nd Floor"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Capacity</label>
          <input
            type="number"
            value={formCapacity}
            onChange={e => setFormCapacity(Number(e.target.value))}
            className="w-full input-base"
            min={1}
            max={500}
          />
        </div>
      </div>

      {/* Equipment checkboxes */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2">Equipment</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ROOM_EQUIPMENT.map(eq => (
            <label
              key={eq}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                formEquipment.includes(eq)
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-900/40 border-slate-700/30 text-slate-400 hover:border-slate-600'
              }`}
            >
              <input
                type="checkbox"
                checked={formEquipment.includes(eq)}
                onChange={() => toggleEquipment(eq)}
                className="sr-only"
              />
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                formEquipment.includes(eq)
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-slate-600'
              }`}>
                {formEquipment.includes(eq) && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
              </div>
              {eq}
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm px-5 py-2">
          Cancel
        </button>
        <button type="submit" className="btn-primary text-sm px-5 py-2">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}


// ═══════════════════════════════════════════════════════════════
// SECTION 3: Attendance Audit
// ═══════════════════════════════════════════════════════════════

interface AttendanceSectionProps {
  attendance: AttendanceRecord[];
  sessions: LabSession[];
  onRefresh: () => void;
}

function AttendanceSection({ attendance, sessions, onRefresh }: AttendanceSectionProps) {
  const [dateFilter, setDateFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [bulkOverrideStatus, setBulkOverrideStatus] = useState<AttendanceStatus | ''>('');
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  const filteredRecords = useMemo(() => {
    let records = [...attendance];
    if (dateFilter) records = records.filter(r => r.date === dateFilter);
    if (sessionFilter) records = records.filter(r => r.lab_session_id === sessionFilter);
    return records.sort((a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime());
  }, [attendance, dateFilter, sessionFilter]);

  // Statistics
  const totalRecords = filteredRecords.length;
  const presentCount = filteredRecords.filter(r => r.status === 'PRESENT').length;
  const lateCount = filteredRecords.filter(r => r.status === 'LATE').length;
  const absentCount = filteredRecords.filter(r => r.status === 'ABSENT').length;
  const leftEarlyCount = filteredRecords.filter(r => r.status === 'LEFT_EARLY').length;

  // Per-session bar chart data
  const sessionStats = useMemo(() => {
    const map = new Map<string, { total: number; present: number; late: number; absent: number; code: string }>();
    for (const r of filteredRecords) {
      if (!map.has(r.lab_session_id)) {
        const session = sessions.find(s => s.id === r.lab_session_id);
        map.set(r.lab_session_id, { total: 0, present: 0, late: 0, absent: 0, code: session?.course_code || r.course_code });
      }
      const entry = map.get(r.lab_session_id)!;
      entry.total++;
      if (r.status === 'PRESENT') entry.present++;
      else if (r.status === 'LATE') entry.late++;
      else if (r.status === 'ABSENT') entry.absent++;
    }
    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }));
  }, [filteredRecords, sessions]);

  const toggleSelect = (id: string) => {
    setSelectedRecords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRecords.size === filteredRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map(r => r.id)));
    }
  };

  const handleBulkOverride = () => {
    if (!bulkOverrideStatus || selectedRecords.size === 0) return;
    selectedRecords.forEach(id => {
      AttendanceStore.update(id, { status: bulkOverrideStatus as AttendanceStatus });
    });
    setSelectedRecords(new Set());
    setBulkOverrideStatus('');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20">
          <ClipboardList className="w-5 h-5 text-sky-400" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-slate-100">Attendance Audit</h2>
          <p className="text-xs text-slate-500 mt-0.5">{attendance.length} total records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Date</label>
          <input
            type="date"
            id="admin-attendance-date-filter"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="input-base text-sm py-2"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Session</label>
          <select
            id="admin-attendance-session-filter"
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value)}
            className="input-base text-sm py-2 min-w-[200px]"
          >
            <option value="">All Sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.course_code} — {s.course_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: totalRecords, color: 'text-slate-300' },
          { label: 'Present', value: presentCount, color: 'text-emerald-400' },
          { label: 'Late', value: lateCount, color: 'text-amber-400' },
          { label: 'Left Early', value: leftEarlyCount, color: 'text-orange-400' },
          { label: 'Absent', value: absentCount, color: 'text-rose-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900/50 border border-slate-700/40 rounded-xl p-3 text-center">
            <p className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-slate-500 uppercase mt-0.5">{s.label}</p>
            {totalRecords > 0 && (
              <p className="text-[10px] text-slate-600 font-mono">{((s.value / totalRecords) * 100).toFixed(1)}%</p>
            )}
          </div>
        ))}
      </div>

      {/* Bar chart visualization */}
      {sessionStats.length > 0 && (
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-display font-semibold text-slate-200 mb-4">Attendance by Session</h3>
          <div className="space-y-3">
            {sessionStats.map(stat => {
              const pct = stat.total > 0 ? (stat.present / stat.total) * 100 : 0;
              const latePct = stat.total > 0 ? (stat.late / stat.total) * 100 : 0;
              const absentPct = stat.total > 0 ? (stat.absent / stat.total) * 100 : 0;
              return (
                <div key={stat.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-slate-300">{stat.code}</span>
                    <span className="text-[11px] text-slate-500">{stat.total} records</span>
                  </div>
                  <div className="flex h-4 rounded-lg overflow-hidden bg-slate-800/80">
                    {pct > 0 && (
                      <div
                        className="bg-emerald-500/70 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                        title={`Present: ${pct.toFixed(1)}%`}
                      />
                    )}
                    {latePct > 0 && (
                      <div
                        className="bg-amber-500/70 transition-all duration-500"
                        style={{ width: `${latePct}%` }}
                        title={`Late: ${latePct.toFixed(1)}%`}
                      />
                    )}
                    {absentPct > 0 && (
                      <div
                        className="bg-rose-500/70 transition-all duration-500"
                        style={{ width: `${absentPct}%` }}
                        title={`Absent: ${absentPct.toFixed(1)}%`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            {/* Legend */}
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <div className="w-2.5 h-2.5 rounded bg-emerald-500/70" /> Present
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <div className="w-2.5 h-2.5 rounded bg-amber-500/70" /> Late
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <div className="w-2.5 h-2.5 rounded bg-rose-500/70" /> Absent
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bulk override controls */}
      {selectedRecords.size > 0 && (
        <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3">
          <span className="text-xs text-indigo-300 font-medium">{selectedRecords.size} selected</span>
          <select
            id="admin-bulk-status-select"
            value={bulkOverrideStatus}
            onChange={e => setBulkOverrideStatus(e.target.value as AttendanceStatus | '')}
            className="input-base text-xs py-1.5"
          >
            <option value="">Override status to...</option>
            <option value="PRESENT">PRESENT</option>
            <option value="LATE">LATE</option>
            <option value="LEFT_EARLY">LEFT EARLY</option>
            <option value="ABSENT">ABSENT</option>
          </select>
          <button
            id="admin-bulk-override-btn"
            onClick={handleBulkOverride}
            disabled={!bulkOverrideStatus}
            className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
          >
            Apply Override
          </button>
        </div>
      )}

      {/* Attendance table */}
      {filteredRecords.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No attendance records found</p>
          <p className="text-slate-500 text-xs mt-1">Adjust filters or wait for students to check in</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-500 uppercase text-[11px] tracking-wide">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRecords.size === filteredRecords.length && filteredRecords.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-600 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Reg No.</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Check-In</th>
                  <th className="px-4 py-3">Check-Out</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRecords.has(record.id)}
                        onChange={() => toggleSelect(record.id)}
                        className="rounded border-slate-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">{record.student_name}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{record.student_reg}</td>
                    <td className="px-4 py-3 text-sky-400 font-mono">{record.course_code}</td>
                    <td className="px-4 py-3 font-mono">{formatTime(record.check_in_time)}</td>
                    <td className="px-4 py-3 font-mono">{record.check_out_time ? formatTime(record.check_out_time) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge border ${getStatusColor(record.status)}`}>{record.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{record.date}</td>
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


// ═══════════════════════════════════════════════════════════════
// SECTION 4: Session Management
// ═══════════════════════════════════════════════════════════════

interface SessionSectionProps {
  sessions: LabSession[];
  onRefresh: () => void;
  adminUid: string;
}

function SessionSection({ sessions, onRefresh, adminUid }: SessionSectionProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSession, setEditingSession] = useState<LabSession | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [room, setRoom] = useState('');

  const resetForm = () => {
    setCourseCode('');
    setCourseName('');
    setRoom('');
  };

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
      created_by: adminUid,
    });
    resetForm();
    setShowCreateForm(false);
    onRefresh();
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession || !courseCode.trim() || !courseName.trim() || !room.trim()) return;
    SessionStore.update(editingSession.id, {
      course_code: courseCode.trim().toUpperCase(),
      course_name: courseName.trim(),
      room: room.trim(),
    });
    setEditingSession(null);
    resetForm();
    onRefresh();
  };

  const handleToggle = (session: LabSession) => {
    SessionStore.update(session.id, { is_active: !session.is_active });
    onRefresh();
  };

  const handleDelete = (id: string) => {
    SessionStore.delete(id);
    setDeleteConfirmId(null);
    onRefresh();
  };

  const handleForceRotate = (session: LabSession) => {
    SessionStore.update(session.id, {
      current_dynamic_token: generateSecureToken(),
      token_generated_at: new Date().toISOString(),
    });
    onRefresh();
  };

  const openEdit = (session: LabSession) => {
    setEditingSession(session);
    setCourseCode(session.course_code);
    setCourseName(session.course_name);
    setRoom(session.room);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Tv className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-100">Session Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">{sessions.length} sessions · {sessions.filter(s => s.is_active).length} active</p>
          </div>
        </div>
        <button
          id="admin-create-session-btn"
          onClick={() => { resetForm(); setShowCreateForm(true); }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> New Session
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="glass-panel-elevated rounded-2xl p-6 space-y-4"
          >
            <h3 className="text-lg font-display font-semibold text-slate-100">Create New Session</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Course Code *</label>
                <input
                  type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)}
                  className="w-full input-base" placeholder="e.g., CS301" required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Course Name *</label>
                <input
                  type="text" value={courseName} onChange={e => setCourseName(e.target.value)}
                  className="w-full input-base" placeholder="e.g., Data Structures Lab" required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Room *</label>
                <input
                  type="text" value={room} onChange={e => setRoom(e.target.value)}
                  className="w-full input-base" placeholder="e.g., Lab 201" required
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { resetForm(); setShowCreateForm(false); }} className="btn-secondary text-sm">
                Cancel
              </button>
              <button type="submit" className="btn-primary text-sm">Create Session</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Session cards */}
      {sessions.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Tv className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No lab sessions created</p>
          <p className="text-slate-500 text-xs mt-1">Create one to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {sessions.map(session => {
            const countdown = getTokenCountdown(session.token_generated_at);
            return (
              <div
                key={session.id}
                className={`relative bg-slate-900/50 border rounded-2xl p-5 transition-all ${
                  session.is_active
                    ? 'border-emerald-500/30 hover:border-emerald-500/50'
                    : 'border-slate-700/40 hover:border-slate-600/50 opacity-60'
                }`}
              >
                {/* Active indicator */}
                <div className={`absolute top-4 right-4 flex items-center gap-1.5 ${
                  session.is_active ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    session.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  }`} />
                  <span className="text-[10px] font-bold uppercase">{session.is_active ? 'LIVE' : 'OFF'}</span>
                </div>

                <h4 className="text-base font-display font-semibold text-slate-100">
                  {session.course_code} — {session.course_name}
                </h4>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5" /> {session.room}
                </p>

                {/* Token */}
                {session.is_active && (
                  <div className="mt-3 bg-slate-800/50 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Current Token</p>
                      <p className="token-display text-lg text-indigo-400">{session.current_dynamic_token}</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-mono font-bold ${countdown < 10 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {countdown}s
                      </p>
                      <p className="text-[9px] text-slate-600 uppercase">remaining</p>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-slate-600 mt-2">Created {formatDateTime(session.created_at)}</p>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/40">
                  <button
                    id={`admin-session-toggle-${session.id}`}
                    onClick={() => handleToggle(session)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      session.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {session.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  {session.is_active && (
                    <button
                      id={`admin-session-rotate-${session.id}`}
                      onClick={() => handleForceRotate(session)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> Rotate Token
                    </button>
                  )}
                  <button
                    id={`admin-session-edit-${session.id}`}
                    onClick={() => openEdit(session)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer ml-auto"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    id={`admin-session-delete-${session.id}`}
                    onClick={() => setDeleteConfirmId(session.id)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Delete confirmation */}
                {deleteConfirmId === session.id && (
                  <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 z-10">
                    <AlertTriangle className="w-8 h-8 text-rose-400 mb-2" />
                    <p className="text-sm text-slate-200 font-medium text-center">Delete this session?</p>
                    <p className="text-xs text-slate-500 mt-1">{session.course_code} — {session.course_name}</p>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setDeleteConfirmId(null)} className="btn-secondary text-xs px-4 py-1.5">Cancel</button>
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit session modal */}
      <AnimatePresence>
        {editingSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleUpdate}
              className="glass-panel-elevated rounded-2xl p-6 w-full max-w-lg space-y-4"
            >
              <h3 className="text-lg font-display font-semibold text-slate-100">Edit Session</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Course Code</label>
                  <input type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)} className="w-full input-base" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Course Name</label>
                  <input type="text" value={courseName} onChange={e => setCourseName(e.target.value)} className="w-full input-base" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Room</label>
                  <input type="text" value={room} onChange={e => setRoom(e.target.value)} className="w-full input-base" required />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setEditingSession(null); resetForm(); }} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" className="btn-primary text-sm">Save Changes</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// SECTION 5: User Management
// ═══════════════════════════════════════════════════════════════

interface UserSectionProps {
  users: UserProfile[];
  onRefresh: () => void;
  currentAdminUid: string;
}

function UserSection({ users, onRefresh, currentAdminUid }: UserSectionProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.reg_num && u.reg_num.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleDelete = (uid: string) => {
    UserStore.delete(uid);
    setDeleteConfirmId(null);
    onRefresh();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'EVALUATOR': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'STUDENT': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-100">User Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">{users.length} registered users</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            id="admin-user-search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-base pl-9 text-sm w-64"
            placeholder="Search users..."
          />
        </div>
      </div>

      {/* Users table */}
      {filteredUsers.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {users.length === 0 ? 'No registered users' : 'No users match your search'}
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-500 uppercase text-[11px] tracking-wide">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Reg No.</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredUsers.map(u => (
                  <tr key={u.uid} className="hover:bg-slate-900/40 transition-colors relative">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <span className="font-medium text-slate-200">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge border ${getRoleBadge(u.role)}`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">{u.reg_num || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {u.uid !== currentAdminUid ? (
                        deleteConfirmId === u.uid ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-[10px] font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(u.uid)}
                              className="px-3 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg cursor-pointer"
                            >
                              Confirm
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`admin-delete-user-${u.uid}`}
                            onClick={() => setDeleteConfirmId(u.uid)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      ) : (
                        <span className="text-[10px] text-emerald-500 font-semibold">You</span>
                      )}
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


// ═══════════════════════════════════════════════════════════════
// SECTION 6: Submissions & Grades
// ═══════════════════════════════════════════════════════════════

interface SubmissionSectionProps {
  submissions: Submission[];
  sessions: LabSession[];
  onRefresh: () => void;
  adminUid: string;
}

function SubmissionSection({ submissions, sessions, onRefresh, adminUid }: SubmissionSectionProps) {
  const [sessionFilter, setSessionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | ''>('');
  const [studentFilter, setStudentFilter] = useState('');
  const [sortField, setSortField] = useState<'date' | 'status' | 'marks'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [viewingSub, setViewingSub] = useState<Submission | null>(null);

  // Override form state
  const [overrideMarks, setOverrideMarks] = useState<number | ''>('');
  const [overrideFeedback, setOverrideFeedback] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<SubmissionStatus>('PENDING');

  const toggleSort = (field: 'date' | 'status' | 'marks') => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const filtered = useMemo(() => {
    let list = [...submissions];
    if (sessionFilter) list = list.filter(s => s.lab_session_id === sessionFilter);
    if (statusFilter) list = list.filter(s => s.status === statusFilter);
    if (studentFilter) {
      const q = studentFilter.toLowerCase();
      list = list.filter(s =>
        s.student_name.toLowerCase().includes(q) ||
        s.student_reg.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'marks') cmp = (a.marks || 0) - (b.marks || 0);
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [submissions, sessionFilter, statusFilter, studentFilter, sortField, sortAsc]);

  const openSubDetail = (sub: Submission) => {
    setViewingSub(sub);
    setOverrideMarks(sub.marks ?? '');
    setOverrideFeedback(sub.feedback || '');
    setOverrideStatus(sub.status);
  };

  const handleOverride = () => {
    if (!viewingSub) return;
    SubmissionStore.update(viewingSub.id, {
      marks: overrideMarks === '' ? null : Number(overrideMarks),
      feedback: overrideFeedback.trim() || null,
      status: overrideStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUid,
    });
    setViewingSub(null);
    onRefresh();
  };

  const SortHeader = ({ field, children }: { field: 'date' | 'status' | 'marks'; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 cursor-pointer hover:text-slate-300 transition-colors select-none"
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="w-3 h-3" />
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <FileCheck className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-slate-100">Submissions & Grades</h2>
          <p className="text-xs text-slate-500 mt-0.5">{submissions.length} total submissions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Session</label>
          <select
            id="admin-sub-session-filter"
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value)}
            className="input-base text-sm py-2 min-w-[200px]"
          >
            <option value="">All Sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.course_code} — {s.course_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Status</label>
          <select
            id="admin-sub-status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as SubmissionStatus | '')}
            className="input-base text-sm py-2"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="GRADED">Graded</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Student</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              id="admin-sub-student-filter"
              value={studentFilter}
              onChange={e => setStudentFilter(e.target.value)}
              className="input-base pl-8 text-sm py-2 w-48"
              placeholder="Name or reg..."
            />
          </div>
        </div>
      </div>

      {/* Submissions table */}
      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <FileCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {submissions.length === 0 ? 'No submissions in the system' : 'No submissions match your filters'}
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-500 uppercase text-[11px] tracking-wide">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Course</th>
                  <SortHeader field="date">Date</SortHeader>
                  <SortHeader field="status">Status</SortHeader>
                  <SortHeader field="marks">Marks</SortHeader>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-200">{sub.student_name}</p>
                        <p className="text-[10px] font-mono text-slate-500">{sub.student_reg}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sky-400">{sub.course_code}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDateTime(sub.submitted_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge border ${getStatusColor(sub.status)}`}>{sub.status}</span>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {sub.marks !== null ? (
                        <span className="text-emerald-400">{sub.marks}/{sub.max_marks}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        id={`admin-view-sub-${sub.id}`}
                        onClick={() => openSubDetail(sub)}
                        className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submission detail modal */}
      <AnimatePresence>
        {viewingSub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel-elevated rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-display font-semibold text-slate-100">Submission Detail</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {viewingSub.student_name} · {viewingSub.student_reg} · {viewingSub.course_code}
                  </p>
                </div>
                <button
                  onClick={() => setViewingSub(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Code content */}
              {viewingSub.code_content && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Code Content</label>
                  <pre className="bg-[#030712] border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {viewingSub.code_content}
                  </pre>
                </div>
              )}

              {/* Files */}
              {viewingSub.files && viewingSub.files.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Attached Files</label>
                  <div className="space-y-1.5">
                    {viewingSub.files.map(f => (
                      <div key={f.id} className="flex items-center gap-2 bg-slate-900/40 rounded-lg px-3 py-2">
                        <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs text-slate-300">{f.name}</span>
                        <span className="text-[10px] text-slate-600 ml-auto">{(f.size / 1024).toFixed(1)}KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <hr className="border-slate-800/50" />

              {/* Override form */}
              <h4 className="text-sm font-display font-semibold text-slate-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Admin Override
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Status</label>
                  <select
                    value={overrideStatus}
                    onChange={e => setOverrideStatus(e.target.value as SubmissionStatus)}
                    className="w-full input-base"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="REVIEWED">REVIEWED</option>
                    <option value="GRADED">GRADED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Marks (/{viewingSub.max_marks})</label>
                  <input
                    type="number"
                    value={overrideMarks}
                    onChange={e => setOverrideMarks(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full input-base"
                    min={0}
                    max={viewingSub.max_marks}
                    placeholder="Enter marks"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Feedback</label>
                <textarea
                  value={overrideFeedback}
                  onChange={e => setOverrideFeedback(e.target.value)}
                  className="w-full input-base min-h-[80px] resize-y"
                  placeholder="Admin feedback..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setViewingSub(null)}
                  className="btn-secondary text-sm"
                >
                  Close
                </button>
                <button
                  id="admin-override-submit-btn"
                  onClick={handleOverride}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save Override
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

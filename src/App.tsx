// ─────────────────────────────────────────────────────────────
// App.tsx — Root application orchestrator
// Manages view routing, authentication state, and token rotation
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import type { AppView, UserRole, UserProfile, LabSession } from './types';
import { generateSecureToken } from './utils/token';
import { SessionStore, UserStore, AuthStore, AttendanceStore } from './utils/storage';
import { TOKEN_ROTATION_INTERVAL_MS } from './constants';

// Page imports
import RoleSelection from './pages/RoleSelection';
import AuthLogin from './pages/AuthLogin';
import StudentEntry from './pages/StudentEntry';
import StudentDashboard from './pages/StudentDashboard';
import EvaluatorDashboard from './pages/EvaluatorDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  // ── View state ───────────────────────────────────────────
  const [currentView, setCurrentView] = useState<AppView>('ROLE_SELECT');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // ── Auth state ───────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // ── Student session state ────────────────────────────────
  const [activeSession, setActiveSession] = useState<LabSession | null>(null);

  // ── Lab sessions (for student entry + token rotation) ────
  const [sessions, setSessions] = useState<LabSession[]>([]);

  // ── Load sessions on mount ───────────────────────────────
  useEffect(() => {
    setSessions(SessionStore.getAll());
  }, []);

  // ── Token rotation engine ────────────────────────────────
  // Runs globally to keep tokens fresh for all active sessions
  useEffect(() => {
    const rotate = () => {
      const currentSessions = SessionStore.getAll();
      const tokens: Record<string, string> = {};
      let hasActive = false;

      for (const s of currentSessions) {
        if (s.is_active) {
          tokens[s.id] = generateSecureToken();
          hasActive = true;
        }
      }

      if (hasActive) {
        SessionStore.updateTokens(tokens);
        setSessions(SessionStore.getAll());
      }
    };

    const interval = setInterval(rotate, TOKEN_ROTATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // ── Restore auth on mount ────────────────────────────────
  useEffect(() => {
    const saved = AuthStore.get();
    if (saved) {
      const user = UserStore.getById(saved.uid);
      if (user) {
        setCurrentUser(user);
        setSelectedRole(user.role);
        if (user.role === 'EVALUATOR') setCurrentView('EVALUATOR_DASHBOARD');
        else if (user.role === 'ADMIN') setCurrentView('ADMIN_DASHBOARD');
      }
    }
  }, []);

  // ── Role selection handler ───────────────────────────────
  const handleSelectRole = useCallback((role: UserRole) => {
    setSelectedRole(role);
    setAuthError(null);
    if (role === 'STUDENT') {
      setSessions(SessionStore.getAll());
      setCurrentView('STUDENT_ENTRY');
    } else {
      setCurrentView('AUTH_LOGIN');
    }
  }, []);

  // ── Auth login handler (Evaluator / Admin) ───────────────
  const handleLogin = useCallback(async (data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    isRegister: boolean;
  }) => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      // Simulate network delay for realism
      await new Promise(r => setTimeout(r, 600));

      if (data.isRegister) {
        // Check if email already exists
        const existing = UserStore.getByEmail(data.email);
        if (existing) {
          setAuthError('An account with this email already exists. Please log in instead.');
          setAuthLoading(false);
          return;
        }

        // Validate fields
        if (!data.email.includes('@')) {
          setAuthError('Please enter a valid email address.');
          setAuthLoading(false);
          return;
        }
        if (data.password.length < 6) {
          setAuthError('Password must be at least 6 characters.');
          setAuthLoading(false);
          return;
        }
        if (!data.name.trim()) {
          setAuthError('Full name is required.');
          setAuthLoading(false);
          return;
        }

        // Create user
        const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newUser: UserProfile = {
          uid,
          email: data.email,
          full_name: data.name.trim(),
          role: data.role,
          reg_num: null,
          created_at: new Date().toISOString(),
        };
        UserStore.create(newUser);
        AuthStore.set(uid, data.role);
        setCurrentUser(newUser);
        setCurrentView(data.role === 'EVALUATOR' ? 'EVALUATOR_DASHBOARD' : 'ADMIN_DASHBOARD');
      } else {
        // Login — find user by email
        const user = UserStore.getByEmail(data.email);
        if (!user) {
          setAuthError('No account found with this email. Please register first.');
          setAuthLoading(false);
          return;
        }
        if (user.role !== data.role) {
          setAuthError(`This account is registered as ${user.role}. Please select the correct role.`);
          setAuthLoading(false);
          return;
        }
        // In local mode, we accept any password (no hash storage)
        AuthStore.set(user.uid, user.role);
        setCurrentUser(user);
        setCurrentView(user.role === 'EVALUATOR' ? 'EVALUATOR_DASHBOARD' : 'ADMIN_DASHBOARD');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // ── Student entry handler ────────────────────────────────
  const handleStudentEntry = useCallback((data: {
    name: string;
    regNum: string;
    sessionId: string;
  }) => {
    setAuthLoading(true);
    setAuthError(null);

    setTimeout(() => {
      // Refresh sessions to get latest tokens
      const freshSessions = SessionStore.getAll();
      const session = freshSessions.find(s => s.id === data.sessionId);

      if (!session) {
        setAuthError('Selected session no longer exists.');
        setAuthLoading(false);
        return;
      }

      if (!session.is_active) {
        setAuthError('This lab session has been deactivated.');
        setAuthLoading(false);
        return;
      }

      // Create student profile
      const uid = `student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const studentUser: UserProfile = {
        uid,
        email: '',
        full_name: data.name.trim(),
        role: 'STUDENT',
        reg_num: data.regNum.trim().toUpperCase(),
        created_at: new Date().toISOString(),
      };
      UserStore.create(studentUser);

      // Record attendance
      const today = new Date().toISOString().split('T')[0];
      AttendanceStore.checkIn({
        student_uid: uid,
        student_name: data.name.trim(),
        student_reg: data.regNum.trim().toUpperCase(),
        lab_session_id: session.id,
        course_code: session.course_code,
        check_in_time: new Date().toISOString(),
        check_out_time: null,
        token_used: session.current_dynamic_token,
        status: 'PRESENT',
        date: today,
      });

      setCurrentUser(studentUser);
      setActiveSession(session);
      setCurrentView('STUDENT_DASHBOARD');
      setAuthLoading(false);
    }, 500);
  }, []);

  // ── Logout handler ───────────────────────────────────────
  const handleLogout = useCallback(() => {
    AuthStore.clear();
    setCurrentUser(null);
    setActiveSession(null);
    setSelectedRole(null);
    setAuthError(null);
    setCurrentView('ROLE_SELECT');
  }, []);

  // ── Back to role selection ───────────────────────────────
  const handleBack = useCallback(() => {
    setSelectedRole(null);
    setAuthError(null);
    setCurrentView('ROLE_SELECT');
  }, []);

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100">
      {currentView === 'ROLE_SELECT' && (
        <RoleSelection onSelectRole={handleSelectRole} />
      )}

      {currentView === 'AUTH_LOGIN' && selectedRole && selectedRole !== 'STUDENT' && (
        <AuthLogin
          role={selectedRole}
          onLogin={handleLogin}
          onBack={handleBack}
          error={authError}
          loading={authLoading}
        />
      )}

      {currentView === 'STUDENT_ENTRY' && (
        <StudentEntry
          sessions={sessions.filter(s => s.is_active)}
          onEntry={handleStudentEntry}
          onBack={handleBack}
          error={authError}
          loading={authLoading}
        />
      )}

      {currentView === 'STUDENT_DASHBOARD' && currentUser && activeSession && (
        <StudentDashboard
          studentUid={currentUser.uid}
          studentName={currentUser.full_name}
          studentReg={currentUser.reg_num || ''}
          session={activeSession}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'EVALUATOR_DASHBOARD' && currentUser && (
        <EvaluatorDashboard
          user={currentUser}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'ADMIN_DASHBOARD' && currentUser && (
        <AdminDashboard
          user={currentUser}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

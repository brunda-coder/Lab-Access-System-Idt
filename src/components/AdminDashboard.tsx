import React, { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, onSnapshot, query } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebaseSetup';
import { UserProfile, LabSession, Evaluation } from '../types';
import { Users, Shield, BookOpen, Settings, AlertTriangle, Edit3 } from 'lucide-react';
import { localQueueStore } from '../hooks/useEvaluatorQueue';

export default function AdminDashboard() {
  const [users, setUsers] = useState<({ id: string } & UserProfile)[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [sessions, setSessions] = useState<LabSession[]>([]);
  
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit states for Evaluation Override
  const [editingEval, setEditingEval] = useState<Evaluation | null>(null);
  const [editStatus, setEditStatus] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const [editMarks, setEditMarks] = useState<number | ''>('');
  const [editFeedback, setEditFeedback] = useState('');
  const [editEvalFeedback, setEditEvalFeedback] = useState('');

  useEffect(() => {
    if (isFirebaseConfigured) {
      setLoadingUsers(true);
      getDocs(collection(db, 'users')).then(snap => {
        const u: any[] = [];
        snap.forEach(d => u.push({ id: d.id, ...d.data() }));
        setUsers(u);
        setLoadingUsers(false);
      }).catch(err => {
        setErrorMsg('Failed to load users: ' + err.message);
        setLoadingUsers(false);
      });

      const qEvals = query(collection(db, 'evaluations'));
      const unsubEvals = onSnapshot(qEvals, (snap) => {
        const evs: Evaluation[] = [];
        snap.forEach(d => evs.push({ id: d.id, ...d.data() } as Evaluation));
        setEvaluations(evs);
      });

      const qSessions = query(collection(db, 'lab_sessions'));
      const unsubSessions = onSnapshot(qSessions, (snap) => {
        const sess: LabSession[] = [];
        snap.forEach(d => sess.push({ id: d.id, ...d.data() } as LabSession));
        setSessions(sess);
      });

      return () => {
        unsubEvals();
        unsubSessions();
      };
    } else {
      // Local Mode Data stub
      const localSess = localStorage.getItem('local_sessions');
      if (localSess) setSessions(JSON.parse(localSess));
      
      const updateLocalEvals = () => {
        const eStr = localStorage.getItem('local_evaluations');
        if (eStr) setEvaluations(JSON.parse(eStr));
      };
      updateLocalEvals();
      const t = setInterval(updateLocalEvals, 2000);
      return () => clearInterval(t);
    }
  }, []);

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    if (currentRole === 'ADMIN') return; // Protect admin
    const newRole = currentRole === 'STUDENT' ? 'EVALUATOR' : 'STUDENT';
    
    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'users', userId), { role: newRole });
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } catch (err: any) {
        setErrorMsg('Failed to update role: ' + err.message);
      }
    } else {
      setErrorMsg('Role management is only supported in Cloud Firestore mode.');
    }
  };

  const openEvalEditor = (ev: Evaluation) => {
    setEditingEval(ev);
    setEditStatus(ev.status);
    setEditMarks(ev.marks ?? '');
    setEditFeedback(ev.feedback || '');
    setEditEvalFeedback(ev.evaluatorFeedback || '');
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEval) return;

    const updates = {
      status: editStatus,
      marks: editMarks === '' ? null : Number(editMarks),
      feedback: editFeedback.trim() || null,
      evaluatorFeedback: editEvalFeedback.trim() || null
    };

    if (isFirebaseConfigured) {
      try {
        await updateDoc(doc(db, 'evaluations', editingEval.id), updates);
        setEditingEval(null);
      } catch (err: any) {
        setErrorMsg('Override failed: ' + err.message);
      }
    } else {
      localQueueStore.update(editingEval.id, updates);
      setEditingEval(null);
      const eStr = localStorage.getItem('local_evaluations');
      if (eStr) setEvaluations(JSON.parse(eStr));
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm">{errorMsg}</p>
        </div>
      )}

      {/* User Management */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
        <h3 className="font-display font-semibold text-sm text-slate-200 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-400" />
          User Management (Role Toggles)
        </h3>
        
        {loadingUsers ? (
          <p className="text-slate-500 text-xs text-center py-4">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono">
                <tr>
                  <th className="px-4 py-2 rounded-tl-lg">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2 rounded-tr-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-950/50">
                    <td className="px-4 py-3">{u.full_name}</td>
                    <td className="px-4 py-3 text-slate-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${
                        u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400' :
                        u.role === 'EVALUATOR' ? 'bg-sky-500/10 text-sky-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleRoleToggle(u.id, u.role)}
                          className="bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Toggle to {u.role === 'STUDENT' ? 'EVALUATOR' : 'STUDENT'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-slate-500">
                      No cloud users fetched. Local mode active?
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Global Evaluations Override */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
        <h3 className="font-display font-semibold text-sm text-slate-200 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose-400" />
          Global Evaluations Override
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono">
              <tr>
                <th className="px-4 py-2 rounded-tl-lg">Student / Session</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Marks</th>
                <th className="px-4 py-2 rounded-tr-lg">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {evaluations.map(ev => {
                const sess = sessions.find(s => s.id === ev.lab_session_id);
                return (
                  <tr key={ev.id} className="hover:bg-slate-950/50">
                    <td className="px-4 py-3">
                      <div>{ev.student_name || ev.student_uid}</div>
                      <div className="text-[10px] text-sky-400 font-mono mt-0.5">{sess?.course_code || ev.lab_session_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${
                        ev.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {ev.marks !== null ? ev.marks : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEvalEditor(ev)}
                        className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Override
                      </button>
                    </td>
                  </tr>
                );
              })}
              {evaluations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-slate-500">
                    No evaluations found in system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      {editingEval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">God-Mode Evaluation Override</h3>
            
            <form onSubmit={handleOverrideSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'PENDING' | 'COMPLETED')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Marks</label>
                  <input
                    type="number"
                    value={editMarks}
                    onChange={(e) => setEditMarks(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">General Feedback</label>
                <textarea
                  value={editFeedback}
                  onChange={(e) => setEditFeedback(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Evaluator Feedback (Answers)</label>
                <textarea
                  value={editEvalFeedback}
                  onChange={(e) => setEditEvalFeedback(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEval(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg"
                >
                  Confirm Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

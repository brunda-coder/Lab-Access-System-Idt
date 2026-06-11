import React, { useState } from 'react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from '../firebaseSetup';
import { localQueueStore } from '../hooks/useEvaluatorQueue';
import { KeyRound, CheckCircle2, AlertTriangle, Send, Code, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudentSubmitProps {
  studentUid: string;
  studentName: string;
  studentReg: string | null;
  activeSessions: Array<{ id: string; course_code: string; is_active: boolean }>;
  onSuccess?: () => void;
}

export default function StudentSubmit({
  studentUid,
  studentName,
  studentReg,
  activeSessions,
  onSuccess
}: StudentSubmitProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [inputToken, setInputToken] = useState('');
  
  const [studentWork, setStudentWork] = useState('');
  const [studentDoubts, setStudentDoubts] = useState('');

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) {
      setStatusMsg({ type: 'error', text: 'Please select an active lab session.' });
      return;
    }
    if (!inputToken.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter the current dynamic token.' });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    if (isFirebaseConfigured) {
      try {
        const sessionRef = doc(db, 'lab_sessions', selectedSessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          setStatusMsg({ type: 'error', text: 'Selected session does not exist in Firestore.' });
          setLoading(false);
          return;
        }

        const sessionData = sessionSnap.data();
        if (!sessionData.is_active) {
          setStatusMsg({ type: 'error', text: 'This lab session is no longer accepting submissions.' });
          setLoading(false);
          return;
        }

        if (sessionData.current_dynamic_token !== inputToken.trim()) {
          setStatusMsg({ type: 'error', text: 'Invalid access token. The security token rotates every 60 seconds; check with your evaluator.' });
          setLoading(false);
          return;
        }
        
        setStep(2);
      } catch (err: any) {
        setStatusMsg({ type: 'error', text: err.message || 'Validation failed.' });
      } finally {
        setLoading(false);
      }
    } else {
      setTimeout(() => {
        const localSessionsStr = localStorage.getItem('local_sessions');
        let localSessions = [];
        try {
          localSessions = localSessionsStr ? JSON.parse(localSessionsStr) : [];
        } catch {
          localSessions = [];
        }

        const target = localSessions.find((s: any) => s.id === selectedSessionId);
        if (!target) {
          setStatusMsg({ type: 'error', text: 'Selected session does not exist.' });
          setLoading(false);
          return;
        }

        if (!target.is_active) {
          setStatusMsg({ type: 'error', text: 'This laboratory session has been closed by the evaluator.' });
          setLoading(false);
          return;
        }

        if (target.current_dynamic_token !== inputToken.trim()) {
          setStatusMsg({ type: 'error', text: 'Invalid access token. Ensure it matches the 6-character security token.' });
          setLoading(false);
          return;
        }

        const currentPending = localQueueStore.getPending();
        const alreadyPending = currentPending.some(
          (e) => e.student_uid === studentUid && e.lab_session_id === selectedSessionId
        );

        if (alreadyPending) {
          setStatusMsg({ type: 'error', text: 'You already have a pending evaluation in this session.' });
          setLoading(false);
          return;
        }

        setStep(2);
        setLoading(false);
      }, 550);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    if (isFirebaseConfigured) {
      try {
        await addDoc(collection(db, 'evaluations'), {
          student_uid: studentUid,
          lab_session_id: selectedSessionId,
          status: 'PENDING',
          marks: null,
          feedback: null,
          studentWork,
          studentDoubts,
          evaluatorFeedback: null,
          timestamp: serverTimestamp()
        });

        setStatusMsg({
          type: 'success',
          text: `Successfully submitted evaluation request. Waiting for evaluator assessment.`
        });
        setStep(1);
        setInputToken('');
        setStudentWork('');
        setStudentDoubts('');
        if (onSuccess) onSuccess();

      } catch (err: any) {
        setStatusMsg({ type: 'error', text: err.message || 'Database write failed.' });
        handleFirestoreError(err, OperationType.CREATE, `evaluations`);
      } finally {
        setLoading(false);
      }
    } else {
      setTimeout(() => {
        const localSessionsStr = localStorage.getItem('local_sessions');
        let localSessions = [];
        try {
          localSessions = localSessionsStr ? JSON.parse(localSessionsStr) : [];
        } catch {
          localSessions = [];
        }
        const target = localSessions.find((s: any) => s.id === selectedSessionId);

        localQueueStore.add({
          id: `eval_${Date.now()}`,
          student_uid: studentUid,
          lab_session_id: selectedSessionId,
          status: 'PENDING',
          marks: null,
          feedback: null,
          studentWork,
          studentDoubts,
          evaluatorFeedback: null,
          timestamp: new Date().toISOString(),
          student_name: studentName,
          student_reg: studentReg || 'N/A',
          course_code: target?.course_code || 'Unknown'
        });

        setStatusMsg({
          type: 'success',
          text: 'Request successfully submitted. Waiting for evaluator assessment.'
        });
        setStep(1);
        setInputToken('');
        setStudentWork('');
        setStudentDoubts('');
        if (onSuccess) onSuccess();
        setLoading(false);
      }, 550);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm" id="student-submit-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-slate-100">🔐 Laboratory Evaluation Submission</h2>
          <p className="font-mono text-xs text-slate-400">Secure token-verified access for laboratory evaluation</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.form 
            key="step1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onSubmit={handleNextStep} 
            className="space-y-4"
          >
            <div>
              <label className="block font-sans text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 matches">
                Select Active Lab Session
              </label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-sans cursor-pointer transition-all appearance-none"
                id="session-select-input"
              >
                <option value="">-- Choose Course Lab Session --</option>
                {activeSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.course_code} {s.is_active ? '(Active)' : '(Closed)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block font-sans text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Security Access Token
                </label>
                <span className="font-mono text-[10px] text-amber-400">Rotates every 60s</span>
              </div>
              <input
                type="text"
                placeholder="Enter 6-character security token"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl px-4 py-3 text-center font-mono text-xl tracking-[0.25em] focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-sm"
                id="otp-token-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading || activeSessions.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-sans font-semibold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Verify Token & Continue</span>
                </>
              )}
            </button>
          </motion.form>
        ) : (
          <motion.form 
            key="step2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onSubmit={handleFinalSubmit} 
            className="space-y-4"
          >
            <div>
              <label className="flex items-center gap-2 font-sans text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                <Code className="w-3.5 h-3.5 text-sky-400" />
                Your Work / Code
              </label>
              <textarea
                required
                rows={4}
                placeholder="Paste your code or describe your work here..."
                value={studentWork}
                onChange={(e) => setStudentWork(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 font-sans text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                Doubts / Questions
              </label>
              <textarea
                rows={3}
                placeholder="Any questions or areas you struggled with? (Optional)"
                value={studentDoubts}
                onChange={(e) => setStudentDoubts(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 bg-slate-800 hover:bg-slate-700 text-white font-sans font-semibold text-sm py-3 px-4 rounded-xl transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !studentWork.trim()}
                className="w-2/3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-sans font-semibold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Finalize Submission</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-4 p-4 rounded-xl flex gap-3 text-sm font-sans ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <p>{statusMsg.text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

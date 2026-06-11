import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from '../firebaseSetup';
import { Evaluation } from '../types';

// Simple event cell for local-only state to allow dynamic testing in dev/demo mode
type QueueListener = (evals: Evaluation[]) => void;
class LocalQueueState {
  private listeners = new Set<QueueListener>();
  private evals: Evaluation[] = [];

  constructor() {
    // Load existing items from localStorage or seed
    const saved = localStorage.getItem('demo_evaluations');
    if (saved) {
      try {
        this.evals = JSON.parse(saved);
      } catch (e) {
        this.evals = [];
      }
    } else {
      // Seed with some test data
      this.evals = [
        {
          id: 'eval_mock_1',
          student_uid: 'user_std_1',
          lab_session_id: 'session_1',
          status: 'PENDING',
          marks: null,
          feedback: null,
          timestamp: new Date().toISOString(),
          student_name: 'Jane Doe',
          student_reg: 'REG/2026/0045',
          course_code: 'CS301-Lab'
        },
        {
          id: 'eval_mock_2',
          student_uid: 'user_std_2',
          lab_session_id: 'session_1',
          status: 'PENDING',
          marks: null,
          feedback: null,
          timestamp: new Date(Date.now() - 30 * 1000).toISOString(),
          student_name: 'Arthur Pendragon',
          student_reg: 'REG/2026/0112',
          course_code: 'CS301-Lab'
        }
      ];
      this.save();
    }
  }

  getPending() {
    return this.evals.filter(e => e.status === 'PENDING');
  }

  add(evaluation: Evaluation) {
    this.evals.push(evaluation);
    this.save();
    this.notify();
  }

  update(id: string, updates: Partial<Evaluation>) {
    this.evals = this.evals.map(e => e.id === id ? { ...e, ...updates } : e);
    this.save();
    this.notify();
  }

  subscribe(listener: QueueListener) {
    this.listeners.add(listener);
    listener(this.getPending());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private save() {
    localStorage.setItem('demo_evaluations', JSON.stringify(this.evals));
  }

  private notify() {
    const list = this.getPending();
    this.listeners.forEach(l => l(list));
  }
}

export const localQueueStore = new LocalQueueState();

export function useEvaluatorQueue() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Use local queue storage for live sandbox testing
      const unsubscribe = localQueueStore.subscribe((list) => {
        setEvaluations(list);
        setLoading(false);
      });
      return unsubscribe;
    }

    setLoading(true);
    const path = 'evaluations';
    const evCollection = collection(db, path);
    const q = query(evCollection, where('status', '==', 'PENDING'));

    // Cache of student profiles to avoid repeated network read checks
    const profileCache: Record<string, { name: string; reg: string }> = {};

    const resolveProfilesAndCourse = async (rawEvals: Evaluation[]) => {
      const enriched: Evaluation[] = [];
      
      for (const ev of rawEvals) {
        let student_name = 'Unknown Student';
        let student_reg = 'N/A';
        let course_code = 'N/A';

        // 1. Fetch Student Profile
        if (ev.student_uid) {
          if (profileCache[ev.student_uid]) {
            student_name = profileCache[ev.student_uid].name;
            student_reg = profileCache[ev.student_uid].reg;
          } else {
            try {
              const uDoc = await getDoc(doc(db, 'users', ev.student_uid));
              if (uDoc.exists()) {
                const uData = uDoc.data();
                student_name = uData.full_name || 'Anonymous';
                student_reg = uData.reg_num || 'N/A';
                profileCache[ev.student_uid] = { name: student_name, reg: student_reg };
              }
            } catch (err) {
              console.warn('Could not fetch user profile details:', err);
            }
          }
        }

        // 2. Fetch Course Code
        if (ev.lab_session_id) {
          try {
            const sDoc = await getDoc(doc(db, 'lab_sessions', ev.lab_session_id));
            if (sDoc.exists()) {
              course_code = sDoc.data().course_code || 'N/A';
            }
          } catch (err) {
            console.warn('Could not fetch course code details:', err);
          }
        }

        enriched.push({
          ...ev,
          student_name,
          student_reg,
          course_code,
        });
      }

      // Sort by creation timestamp descending safely
      enriched.sort((a, b) => {
        const timeA = a.timestamp?.seconds || (typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : 0);
        const timeB = b.timestamp?.seconds || (typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : 0);
        return timeB - timeA;
      });

      setEvaluations(enriched);
      setLoading(false);
    };

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Evaluation[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Evaluation);
        });
        
        resolveProfilesAndCourse(list);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, []);

  return { evaluations, loading, error };
}

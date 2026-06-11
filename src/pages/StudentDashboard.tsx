// ─────────────────────────────────────────────────────────────
// pages/StudentDashboard.tsx — Comprehensive student LMS portal
// Tabbed interface: Assignments, Submit Work, My Doubts, Grades
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Upload, HelpCircle, Award, ChevronDown, ChevronUp,
  Paperclip, X, FileText, Download, Send, Clock, CheckCircle2,
  AlertTriangle, MessageSquare, Code, Calendar, TrendingUp,
  Inbox, CloudUpload, Plus, Trash2, FileCode, Eye,
} from 'lucide-react';
import type { LabSession, Assignment, Submission, Doubt, AttendanceRecord, FileAttachment } from '../types';
import {
  AssignmentStore,
  SubmissionStore,
  DoubtStore,
  AttendanceStore,
} from '../utils/storage';
import {
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_SUBMISSION,
  MAX_CODE_LENGTH,
  DEFAULT_MAX_MARKS,
  DOUBT_CATEGORIES,
} from '../constants';
import Header from '../components/Header';

// ── Types ────────────────────────────────────────────────────

interface StudentDashboardProps {
  studentUid: string;
  studentName: string;
  studentReg: string;
  session: LabSession;
  onLogout: () => void;
}

type TabId = 'assignments' | 'submit' | 'doubts' | 'grades';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

// ── Motion variants ──────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

const listItemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' },
  }),
};

// ── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isDuePast(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

function timeUntilDue(dueDate: string): string {
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff < 0) return 'Overdue';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}

// ── Tab definitions ──────────────────────────────────────────

const TABS: TabDef[] = [
  { id: 'assignments', label: 'Assignments', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'submit', label: 'Submit Work', icon: <Upload className="w-4 h-4" /> },
  { id: 'doubts', label: 'My Doubts', icon: <HelpCircle className="w-4 h-4" /> },
  { id: 'grades', label: 'Grades & History', icon: <Award className="w-4 h-4" /> },
];

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════

export default function StudentDashboard({
  studentUid,
  studentName,
  studentReg,
  session,
  onLogout,
}: StudentDashboardProps) {
  // ── Tab state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('assignments');

  // ── Data state ─────────────────────────────────────────────
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  // ── Refresh function ───────────────────────────────────────
  const refreshData = useCallback(() => {
    setAssignments(AssignmentStore.getBySession(session.id));
    setSubmissions(SubmissionStore.getByStudent(studentUid));
    setDoubts(DoubtStore.getByStudent(studentUid));
    setAttendance(AttendanceStore.getByStudent(studentUid));
  }, [session.id, studentUid]);

  // ── Load on mount + polling ────────────────────────────────
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // ── Submission form state ──────────────────────────────────
  const [submitAssignmentId, setSubmitAssignmentId] = useState<string>('');
  const [codeContent, setCodeContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Doubt form state ───────────────────────────────────────
  const [doubtQuestion, setDoubtQuestion] = useState('');
  const [doubtCategory, setDoubtCategory] = useState<string>(DOUBT_CATEGORIES[0]);
  const [doubtLoading, setDoubtLoading] = useState(false);
  const [doubtStatus, setDoubtStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Expanded assignment cards ──────────────────────────────
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);

  // ══════════════════════════════════════════════════════════
  // FILE UPLOAD LOGIC
  // ══════════════════════════════════════════════════════════

  const processFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const remaining = MAX_FILES_PER_SUBMISSION - uploadedFiles.length;

    if (remaining <= 0) {
      setSubmitStatus({ type: 'error', text: `Maximum ${MAX_FILES_PER_SUBMISSION} files allowed.` });
      return;
    }

    const toProcess = files.slice(0, remaining);

    toProcess.forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setSubmitStatus({ type: 'error', text: `"${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit.` });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const attachment: FileAttachment = {
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          data: base64,
          uploaded_at: new Date().toISOString(),
        };
        setUploadedFiles((prev) => {
          if (prev.length >= MAX_FILES_PER_SUBMISSION) return prev;
          return [...prev, attachment];
        });
      };
      reader.readAsDataURL(file);
    });
  }, [uploadedFiles.length]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // ══════════════════════════════════════════════════════════
  // SUBMISSION HANDLER
  // ══════════════════════════════════════════════════════════

  const handleSubmitWork = () => {
    if (!codeContent.trim() && uploadedFiles.length === 0) {
      setSubmitStatus({ type: 'error', text: 'Please provide code content or upload files.' });
      return;
    }

    setSubmitLoading(true);
    setSubmitStatus(null);

    setTimeout(() => {
      try {
        SubmissionStore.create({
          student_uid: studentUid,
          student_name: studentName,
          student_reg: studentReg,
          lab_session_id: session.id,
          assignment_id: submitAssignmentId || null,
          course_code: session.course_code,
          status: 'PENDING',
          code_content: codeContent,
          files: uploadedFiles,
          marks: null,
          max_marks: DEFAULT_MAX_MARKS,
          feedback: null,
          reviewed_at: null,
          reviewed_by: null,
        });

        setSubmitStatus({ type: 'success', text: 'Work submitted successfully! Your evaluator will review it shortly.' });
        setCodeContent('');
        setUploadedFiles([]);
        setSubmitAssignmentId('');
        refreshData();
      } catch {
        setSubmitStatus({ type: 'error', text: 'Failed to submit. Please try again.' });
      } finally {
        setSubmitLoading(false);
      }
    }, 500);
  };

  // ══════════════════════════════════════════════════════════
  // DOUBT SUBMISSION HANDLER
  // ══════════════════════════════════════════════════════════

  const handleSubmitDoubt = () => {
    if (!doubtQuestion.trim()) {
      setDoubtStatus({ type: 'error', text: 'Please enter your question.' });
      return;
    }

    setDoubtLoading(true);
    setDoubtStatus(null);

    setTimeout(() => {
      try {
        DoubtStore.create({
          student_uid: studentUid,
          student_name: studentName,
          student_reg: studentReg,
          lab_session_id: session.id,
          course_code: session.course_code,
          question: doubtQuestion.trim(),
          category: doubtCategory,
          status: 'OPEN',
          response: null,
          responded_by: null,
          responded_by_name: null,
          resolved_at: null,
        });

        setDoubtStatus({ type: 'success', text: 'Doubt submitted! Your evaluator will respond soon.' });
        setDoubtQuestion('');
        setDoubtCategory(DOUBT_CATEGORIES[0]);
        refreshData();
      } catch {
        setDoubtStatus({ type: 'error', text: 'Failed to submit doubt. Please try again.' });
      } finally {
        setDoubtLoading(false);
      }
    }, 400);
  };

  // ══════════════════════════════════════════════════════════
  // DOWNLOAD ATTACHMENT
  // ══════════════════════════════════════════════════════════

  const downloadAttachment = (file: FileAttachment) => {
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ══════════════════════════════════════════════════════════
  // NAVIGATE TO SUBMIT TAB WITH ASSIGNMENT PRE-SELECTED
  // ══════════════════════════════════════════════════════════

  const goToSubmitForAssignment = (assignmentId: string) => {
    setSubmitAssignmentId(assignmentId);
    setActiveTab('submit');
  };

  // ══════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ══════════════════════════════════════════════════════════

  const gradedSubmissions = submissions.filter((s) => s.status === 'GRADED');
  const avgMarks =
    gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + (s.marks ?? 0), 0) / gradedSubmissions.length
      : 0;
  const presentCount = attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#030712]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Header ──────────────────────────────────────────── */}
        <Header
          role="STUDENT"
          userName={studentName}
          sessionInfo={`${session.course_code} — ${session.room}`}
          onLogout={onLogout}
        />

        {/* ── Tab Navigation ──────────────────────────────────── */}
        <nav className="glass-panel rounded-2xl p-1.5 flex gap-1 overflow-x-auto" id="student-tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600/80 to-sky-600/60 rounded-xl"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          ))}
        </nav>

        {/* ── Tab Content ─────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === 'assignments' && (
            <motion.div key="assignments" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <AssignmentsTab
                assignments={assignments}
                submissions={submissions}
                expandedAssignment={expandedAssignment}
                onToggleExpand={(id) => setExpandedAssignment(expandedAssignment === id ? null : id)}
                onSubmitWork={goToSubmitForAssignment}
                onDownload={downloadAttachment}
              />
            </motion.div>
          )}

          {activeTab === 'submit' && (
            <motion.div key="submit" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <SubmitWorkTab
                assignments={assignments}
                submitAssignmentId={submitAssignmentId}
                onAssignmentChange={setSubmitAssignmentId}
                codeContent={codeContent}
                onCodeChange={setCodeContent}
                uploadedFiles={uploadedFiles}
                isDragging={isDragging}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onFileSelect={handleFileSelect}
                onRemoveFile={removeFile}
                fileInputRef={fileInputRef}
                submitLoading={submitLoading}
                submitStatus={submitStatus}
                onSubmit={handleSubmitWork}
                onClearStatus={() => setSubmitStatus(null)}
              />
            </motion.div>
          )}

          {activeTab === 'doubts' && (
            <motion.div key="doubts" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <DoubtsTab
                doubts={doubts}
                doubtQuestion={doubtQuestion}
                onQuestionChange={setDoubtQuestion}
                doubtCategory={doubtCategory}
                onCategoryChange={setDoubtCategory}
                doubtLoading={doubtLoading}
                doubtStatus={doubtStatus}
                onSubmit={handleSubmitDoubt}
                onClearStatus={() => setDoubtStatus(null)}
              />
            </motion.div>
          )}

          {activeTab === 'grades' && (
            <motion.div key="grades" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <GradesTab
                submissions={submissions}
                attendance={attendance}
                avgMarks={avgMarks}
                presentCount={presentCount}
                assignments={assignments}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 1: ASSIGNMENTS
// ═════════════════════════════════════════════════════════════

function AssignmentsTab({
  assignments,
  submissions,
  expandedAssignment,
  onToggleExpand,
  onSubmitWork,
  onDownload,
}: {
  assignments: Assignment[];
  submissions: Submission[];
  expandedAssignment: string | null;
  onToggleExpand: (id: string) => void;
  onSubmitWork: (id: string) => void;
  onDownload: (file: FileAttachment) => void;
}) {
  if (assignments.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 bg-slate-800/50 rounded-2xl mb-4">
          <BookOpen className="w-10 h-10 text-slate-600" />
        </div>
        <h3 className="font-display font-semibold text-lg text-slate-400 mb-2">No Assignments Yet</h3>
        <p className="text-sm text-slate-500 max-w-md">
          Your evaluator hasn't posted any assignments for this session. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sky-400" />
          Assignments
        </h2>
        <span className="badge bg-sky-500/10 text-sky-400 border border-sky-500/20">
          {assignments.length} Total
        </span>
      </div>

      <div className="space-y-3">
        {assignments.map((assignment, index) => {
          const isExpanded = expandedAssignment === assignment.id;
          const hasSubmission = submissions.some((s) => s.assignment_id === assignment.id);
          const overdue = isDuePast(assignment.due_date);
          const timeLeft = timeUntilDue(assignment.due_date);

          return (
            <motion.div
              key={assignment.id}
              custom={index}
              variants={listItemVariants}
              initial="initial"
              animate="animate"
              className="card group"
            >
              {/* Assignment Header */}
              <button
                id={`assignment-toggle-${assignment.id}`}
                onClick={() => onToggleExpand(assignment.id)}
                className="w-full flex items-start justify-between gap-4 text-left cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-display font-semibold text-slate-100 group-hover:text-white transition-colors">
                      {assignment.title}
                    </h3>
                    {hasSubmission && (
                      <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Submitted
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">{assignment.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Due: {formatDateShort(assignment.due_date)}
                    </span>
                    <span className={`font-medium ${overdue ? 'text-rose-400' : 'text-amber-400'}`}>
                      {timeLeft}
                    </span>
                    {assignment.attachments.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5" />
                        {assignment.attachments.length} file{assignment.attachments.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 mt-1 text-slate-500">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {/* Expanded Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-4 border-t border-slate-700/40 space-y-4">
                      {/* Full Description */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Description
                        </h4>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {assignment.description}
                        </p>
                      </div>

                      {/* Attachments */}
                      {assignment.attachments.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Attachments
                          </h4>
                          <div className="space-y-2">
                            {assignment.attachments.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700/30"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm text-slate-200 truncate">{file.name}</p>
                                    <p className="text-[11px] text-slate-500">{formatFileSize(file.size)}</p>
                                  </div>
                                </div>
                                <button
                                  id={`download-attachment-${file.id}`}
                                  onClick={() => onDownload(file)}
                                  className="p-2 rounded-lg hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        id={`submit-for-${assignment.id}`}
                        onClick={() => onSubmitWork(assignment.id)}
                        className="btn-primary flex items-center gap-2 text-sm w-full justify-center"
                      >
                        <Upload className="w-4 h-4" />
                        {hasSubmission ? 'Submit Again' : 'Submit Work'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 2: SUBMIT WORK
// ═════════════════════════════════════════════════════════════

function SubmitWorkTab({
  assignments,
  submitAssignmentId,
  onAssignmentChange,
  codeContent,
  onCodeChange,
  uploadedFiles,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onRemoveFile,
  fileInputRef,
  submitLoading,
  submitStatus,
  onSubmit,
  onClearStatus,
}: {
  assignments: Assignment[];
  submitAssignmentId: string;
  onAssignmentChange: (id: string) => void;
  codeContent: string;
  onCodeChange: (content: string) => void;
  uploadedFiles: FileAttachment[];
  isDragging: boolean;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (fileId: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  submitLoading: boolean;
  submitStatus: { type: 'success' | 'error'; text: string } | null;
  onSubmit: () => void;
  onClearStatus: () => void;
}) {
  const charsUsed = codeContent.length;
  const charsRemaining = MAX_CODE_LENGTH - charsUsed;
  const lineCount = codeContent ? codeContent.split('\n').length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-slate-100 flex items-center gap-2">
          <Upload className="w-5 h-5 text-sky-400" />
          Submit Work
        </h2>
      </div>

      <div className="card space-y-6">
        {/* Assignment Selector */}
        <div>
          <label htmlFor="assignment-selector" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Assignment (Optional)
          </label>
          <select
            id="assignment-selector"
            value={submitAssignmentId}
            onChange={(e) => onAssignmentChange(e.target.value)}
            className="w-full input-base cursor-pointer appearance-none"
          >
            <option value="">— General Submission (no specific assignment) —</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>

        {/* Code Editor */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="code-editor" className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Code className="w-3.5 h-3.5 text-sky-400" />
              Code / Work Content
            </label>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-slate-500">{lineCount} lines</span>
              <span className={charsRemaining < 1000 ? 'text-rose-400' : 'text-slate-500'}>
                {charsRemaining.toLocaleString()} chars left
              </span>
            </div>
          </div>
          <textarea
            id="code-editor"
            value={codeContent}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CODE_LENGTH) {
                onCodeChange(e.target.value);
              }
            }}
            placeholder="Paste your code, algorithm, or lab work here..."
            rows={14}
            className="w-full input-base font-mono text-sm leading-relaxed resize-y min-h-[200px]"
            spellCheck={false}
          />
          {/* Character usage bar */}
          <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                charsRemaining < 1000
                  ? 'bg-rose-500'
                  : charsRemaining < 5000
                    ? 'bg-amber-500'
                    : 'bg-sky-500/60'
              }`}
              style={{ width: `${Math.min((charsUsed / MAX_CODE_LENGTH) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* File Upload Area */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            <span className="flex items-center gap-2">
              <Paperclip className="w-3.5 h-3.5 text-sky-400" />
              File Attachments
            </span>
            <span className="text-slate-500 normal-case font-normal">
              {uploadedFiles.length}/{MAX_FILES_PER_SUBMISSION} files · Max {MAX_FILE_SIZE_MB}MB each
            </span>
          </label>

          {/* Drop Zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
              isDragging
                ? 'border-sky-400 bg-sky-500/5'
                : 'border-slate-700/50 hover:border-slate-600/60 hover:bg-slate-800/20'
            }`}
            id="file-drop-zone"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={onFileSelect}
              className="hidden"
              id="file-upload-input"
            />
            <CloudUpload className={`w-10 h-10 mx-auto mb-3 transition-colors ${isDragging ? 'text-sky-400' : 'text-slate-600'}`} />
            <p className="text-sm text-slate-300 font-medium">
              {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports any file type up to {MAX_FILE_SIZE_MB}MB
            </p>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {uploadedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 truncate">{file.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>·</span>
                        <span>{file.type || 'Unknown type'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    id={`remove-file-${file.id}`}
                    onClick={() => onRemoveFile(file.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Status Message */}
        <AnimatePresence>
          {submitStatus && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`flex items-start gap-3 p-4 rounded-xl text-sm ${
                submitStatus.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}
            >
              {submitStatus.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <p className="flex-1">{submitStatus.text}</p>
              <button onClick={onClearStatus} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <button
          id="submit-work-btn"
          onClick={onSubmit}
          disabled={submitLoading || (!codeContent.trim() && uploadedFiles.length === 0)}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Work
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 3: MY DOUBTS
// ═════════════════════════════════════════════════════════════

function DoubtsTab({
  doubts,
  doubtQuestion,
  onQuestionChange,
  doubtCategory,
  onCategoryChange,
  doubtLoading,
  doubtStatus,
  onSubmit,
  onClearStatus,
}: {
  doubts: Doubt[];
  doubtQuestion: string;
  onQuestionChange: (q: string) => void;
  doubtCategory: string;
  onCategoryChange: (c: string) => void;
  doubtLoading: boolean;
  doubtStatus: { type: 'success' | 'error'; text: string } | null;
  onSubmit: () => void;
  onClearStatus: () => void;
}) {
  const openDoubts = doubts.filter((d) => d.status === 'OPEN');
  const resolvedDoubts = doubts.filter((d) => d.status === 'RESOLVED');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-slate-100 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-sky-400" />
          My Doubts
        </h2>
        <div className="flex items-center gap-2">
          {openDoubts.length > 0 && (
            <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {openDoubts.length} Open
            </span>
          )}
          {resolvedDoubts.length > 0 && (
            <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {resolvedDoubts.length} Resolved
            </span>
          )}
        </div>
      </div>

      {/* Submit New Doubt */}
      <div className="card space-y-4">
        <h3 className="font-display font-semibold text-sm text-slate-200 flex items-center gap-2">
          <Plus className="w-4 h-4 text-sky-400" />
          Ask a Question
        </h3>

        <div>
          <label htmlFor="doubt-category" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Category
          </label>
          <select
            id="doubt-category"
            value={doubtCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full input-base cursor-pointer appearance-none"
          >
            {DOUBT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="doubt-question" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Your Question
          </label>
          <textarea
            id="doubt-question"
            value={doubtQuestion}
            onChange={(e) => onQuestionChange(e.target.value)}
            placeholder="Describe your doubt or question in detail..."
            rows={4}
            className="w-full input-base text-sm resize-y min-h-[100px]"
          />
        </div>

        {/* Status */}
        <AnimatePresence>
          {doubtStatus && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`flex items-start gap-3 p-4 rounded-xl text-sm ${
                doubtStatus.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}
            >
              {doubtStatus.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              )}
              <p className="flex-1">{doubtStatus.text}</p>
              <button onClick={onClearStatus} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          id="submit-doubt-btn"
          onClick={onSubmit}
          disabled={doubtLoading || !doubtQuestion.trim()}
          className="btn-primary flex items-center justify-center gap-2 text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {doubtLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Doubt
            </>
          )}
        </button>
      </div>

      {/* Doubt List */}
      {doubts.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-slate-800/50 rounded-2xl mb-4">
            <MessageSquare className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="font-display font-semibold text-lg text-slate-400 mb-2">No Doubts Yet</h3>
          <p className="text-sm text-slate-500 max-w-md">
            Use the form above to ask your evaluator a question. They'll respond as soon as possible.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {doubts
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((doubt, index) => (
              <motion.div
                key={doubt.id}
                custom={index}
                variants={listItemVariants}
                initial="initial"
                animate="animate"
                className="card"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge bg-slate-700/50 text-slate-300 border border-slate-600/30">
                      {doubt.category}
                    </span>
                    <span
                      className={`badge border ${
                        doubt.status === 'OPEN'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {doubt.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(doubt.created_at)}
                  </span>
                </div>

                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {doubt.question}
                </p>

                {/* Evaluator Response */}
                {doubt.status === 'RESOLVED' && doubt.response && (
                  <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        Evaluator Response
                      </span>
                      {doubt.responded_by_name && (
                        <span className="text-[11px] text-slate-500">— {doubt.responded_by_name}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {doubt.response}
                    </p>
                    {doubt.resolved_at && (
                      <p className="text-[11px] text-slate-500 mt-2">
                        Resolved on {formatDate(doubt.resolved_at)}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TAB 4: GRADES & HISTORY
// ═════════════════════════════════════════════════════════════

function GradesTab({
  submissions,
  attendance,
  avgMarks,
  presentCount,
  assignments,
}: {
  submissions: Submission[];
  attendance: AttendanceRecord[];
  avgMarks: number;
  presentCount: number;
  assignments: Assignment[];
}) {
  const gradedCount = submissions.filter((s) => s.status === 'GRADED').length;
  const pendingCount = submissions.filter((s) => s.status === 'PENDING').length;
  const reviewedCount = submissions.filter((s) => s.status === 'REVIEWED').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-slate-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-sky-400" />
          Grades & History
        </h2>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Submissions" value={submissions.length} icon={<Send className="w-5 h-5" />} color="indigo" />
        <StatCard label="Average Marks" value={avgMarks > 0 ? `${avgMarks.toFixed(1)}%` : '—'} icon={<TrendingUp className="w-5 h-5" />} color="sky" />
        <StatCard label="Graded" value={gradedCount} icon={<CheckCircle2 className="w-5 h-5" />} color="emerald" />
        <StatCard label="Attendance" value={presentCount} icon={<Calendar className="w-5 h-5" />} color="violet" />
      </div>

      {/* Submissions List */}
      <div>
        <h3 className="font-display font-semibold text-sm text-slate-300 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          Submission History
        </h3>

        {submissions.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-slate-800/50 rounded-2xl mb-4">
              <Inbox className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="font-display font-semibold text-lg text-slate-400 mb-2">No Submissions Yet</h3>
            <p className="text-sm text-slate-500 max-w-md">
              Submit your first work from the Submit Work tab to see your history here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions
              .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
              .map((submission, index) => {
                const linkedAssignment = assignments.find((a) => a.id === submission.assignment_id);
                const marksPercentage = submission.marks !== null ? (submission.marks / submission.max_marks) * 100 : 0;

                return (
                  <motion.div
                    key={submission.id}
                    custom={index}
                    variants={listItemVariants}
                    initial="initial"
                    animate="animate"
                    className="card"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <h4 className="font-display font-semibold text-slate-100 text-sm">
                          {linkedAssignment ? linkedAssignment.title : 'General Submission'}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(submission.submitted_at)}
                          </span>
                          <span className="font-mono">{submission.course_code}</span>
                        </div>
                      </div>

                      <span
                        className={`badge border shrink-0 ${
                          submission.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : submission.status === 'REVIEWED'
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {submission.status}
                      </span>
                    </div>

                    {/* Code Preview */}
                    {submission.code_content && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-500">
                          <Eye className="w-3 h-3" />
                          Code Preview
                        </div>
                        <pre className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 text-xs font-mono text-slate-400 overflow-x-auto max-h-[100px] overflow-y-auto">
                          {submission.code_content.substring(0, 300)}
                          {submission.code_content.length > 300 ? '...' : ''}
                        </pre>
                      </div>
                    )}

                    {/* Files */}
                    {submission.files.length > 0 && (
                      <div className="flex items-center gap-2 mb-3 text-[11px] text-slate-500">
                        <Paperclip className="w-3 h-3" />
                        {submission.files.length} file{submission.files.length !== 1 ? 's' : ''} attached
                      </div>
                    )}

                    {/* Marks */}
                    {submission.status === 'GRADED' && submission.marks !== null && (
                      <div className="mt-3 pt-3 border-t border-slate-700/30">
                        <div className="flex items-end justify-between mb-2">
                          <div>
                            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Score</p>
                            <div className="flex items-baseline gap-1">
                              <span className="font-display font-bold text-3xl text-white">
                                {submission.marks}
                              </span>
                              <span className="text-sm text-slate-500">/ {submission.max_marks}</span>
                            </div>
                          </div>
                          <span
                            className={`font-display font-bold text-lg ${
                              marksPercentage >= 80
                                ? 'text-emerald-400'
                                : marksPercentage >= 50
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                            }`}
                          >
                            {marksPercentage.toFixed(0)}%
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${marksPercentage}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.1 }}
                            className={`h-full rounded-full ${
                              marksPercentage >= 80
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                : marksPercentage >= 50
                                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                  : 'bg-gradient-to-r from-rose-500 to-rose-400'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    {/* Feedback */}
                    {submission.feedback && (
                      <div className="mt-3 p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
                        <div className="flex items-center gap-2 mb-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Feedback</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {submission.feedback}
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>

      {/* Attendance Summary */}
      <div>
        <h3 className="font-display font-semibold text-sm text-slate-300 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          Attendance History
        </h3>

        {attendance.length === 0 ? (
          <div className="card py-8 text-center">
            <p className="text-sm text-slate-500">No attendance records found.</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/40">
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check In</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check Out</th>
                  <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {attendance
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((record) => (
                    <tr key={record.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 text-slate-300 font-mono text-xs">{record.date}</td>
                      <td className="py-3 text-slate-400 text-xs">{record.course_code}</td>
                      <td className="py-3 text-slate-400 font-mono text-xs">
                        {record.check_in_time
                          ? new Date(record.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="py-3 text-slate-400 font-mono text-xs">
                        {record.check_out_time
                          ? new Date(record.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="py-3">
                        <span
                          className={`badge border text-[10px] ${
                            record.status === 'PRESENT'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : record.status === 'LATE'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : record.status === 'LEFT_EARLY'
                                  ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {record.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// STAT CARD COMPONENT
// ═════════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'indigo' | 'sky' | 'emerald' | 'violet';
}) {
  const colorMap = {
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    sky: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  };

  const c = colorMap[color];

  return (
    <div className="card flex flex-col items-center text-center py-5">
      <div className={`p-2.5 rounded-xl ${c.bg} border ${c.border} mb-3`}>
        <span className={c.text}>{icon}</span>
      </div>
      <span className="font-display font-bold text-2xl text-white">{value}</span>
      <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mt-1">{label}</span>
    </div>
  );
}

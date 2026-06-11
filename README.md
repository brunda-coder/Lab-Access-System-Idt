# 🔬 Laboratory Access & Student Evaluation System
**Academic Prototype v1.0 - Production Ready**

---

## Overview

A **professional, enterprise-grade platform** for managing laboratory access control and real-time student evaluation in academic institutions. Designed for secure authentication, dynamic token rotation, queue-based evaluation workflows, and institutional data management.

### ✨ Core Features

✅ **60-Second Token Rotation**: Dynamic security tokens displayed on evaluator dashboards  
✅ **Multi-Role Workflows**: Distinct dashboards for Students, Evaluators, and Administrators  
✅ **Real-Time Evaluation Queue**: Automatic submission management and grading workflows  
✅ **Dual-Mode Architecture**: Cloud (Firebase) + Local (LocalStorage) for flexibility  
✅ **Academic-Grade UI**: Professional, formal interface suitable for institutional deployment  
✅ **Production Validation**: Complete error handling, security policies, and offline support  

---

## Quick Start (2 minutes)

### Prerequisites
- **Node.js** v18+
- **npm** or yarn

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Optional: Set API key
echo 'VITE_GEMINI_API_KEY=your_key_here' > .env.local

# 3. Start development server
npm run dev

# ✓ Application ready at http://localhost:3000
```

### Test Immediately (Local Mode - Default)

No configuration needed! The app starts in **Local Mode** with test data:

| Role | Name | Token Display |
|------|------|---------------|
| **Student** | Alice Baker (REG/2026/0994) | Can see and use tokens |
| **Evaluator** | Professor Miller | Can see current tokens |
| **Admin** | System Administrator | Full control |

**Switch roles**: Click the role buttons in the left sidebar (STUDENT / EVALUATOR / ADMIN)

---

## How It Works

### 1️⃣ Token-Based Access System

**Every 60 seconds:**
- New 6-character token generated (e.g., `AX398B`)
- Displayed on Evaluator/Admin dashboards
- Old tokens become invalid
- All students must re-authenticate with new token

**Why?** Prevents unauthorized lab access and ensures time-limited secure sessions

### 2️⃣ Student Submission Flow

```
SELECT SESSION → ENTER TOKEN → SUBMIT WORK → VIEW GRADES
```

1. Student picks lab course (CS301-Lab, EE204-Lab, etc.)
2. Asks evaluator for current token (60-second countdown visible)
3. Enters token to unlock submission form
4. Submits implementation code and questions
5. Waits in evaluation queue
6. Receives grade and feedback

### 3️⃣ Evaluator Dashboard

**Display Current Tokens:**
- View all active lab session tokens
- Monitor 60-second countdown
- Share token verbally/digitally with students

**Grade Submissions:**
- See list of pending student submissions
- Open evaluation form
- View student code and questions
- Assign marks (0-100)
- Provide feedback
- Answer student questions

### 4️⃣ Admin Control

- **Create Sessions**: Add new lab courses
- **Manage Users**: Switch between Student/Evaluator roles
- **Control Sessions**: Activate/deactivate labs
- **Override Grades**: Edit completed evaluations if needed

---

## Features

### Real-Time Token Display

```
[SECURITY TOKEN ROTATION]
┌─────────────────────────────────────┐
│ 45s remaining                       │
│ ╭─────────────────╮                 │
│ │ AX398B          │  Current Token  │
│ ╰─────────────────╯                 │
│ Rotates every 60 seconds            │
└─────────────────────────────────────┘
```

### Evaluator Token Management

```
ACTIVE LABORATORY SESSION ACCESS TOKENS
┌──────────────┬──────────────┐
│ CS301-Lab    │ Token: AX398B│
│ EE204-Lab    │ Token: PL77Y2│
│ CH101-Lab    │ Token: KM551Z│
└──────────────┴──────────────┘
```

### Student History & Grades

```
SUBMISSION STATUS
┌─────────────────────────────────────┐
│ CS301-Lab  [COMPLETED]        92/100│
│ CS301-Lab  [PENDING]          ...   │
│ EE204-Lab  [COMPLETED]        78/100│
└─────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript |
| **Styling** | Tailwind CSS 4 + Motion animations |
| **Build** | Vite 6 |
| **Database** | Firebase Firestore (optional) or LocalStorage |
| **Icons** | Lucide React |
| **Auth** | Firebase Authentication (optional) |

---

## Two Deployment Modes

### 📱 Local Mode (Default)

- **When**: Firebase not configured
- **Features**: Full functionality with localStorage
- **Use Case**: Development, testing, demos
- **Data**: Stored in browser (persists across refreshes)
- **Multi-user**: Limited to single browser

### ☁️ Cloud Mode (Optional)

- **When**: Firebase project configured
- **Features**: Multi-user, persistent database, real-time sync
- **Use Case**: Production deployment
- **Data**: Firestore database
- **Multi-user**: Full support

**Toggle Mode**: Button in top navigation bar (Cloud Firestore / Local Mode)

---

## Building for Production

### 1. Create Optimized Build
```bash
npm run build
```

### 2. Test Production Build
```bash
npm run preview
```

### 3. Deploy

**Option A: Firebase Hosting**
```bash
firebase deploy --only hosting
```

**Option B: Vercel**
```bash
vercel deploy
```

**Option C: Traditional Server**
```bash
# Copy dist/ folder to web server
# Configure for SPA routing (index.html fallback)
```

---

## Project Files

```
laboratory-system/
├── src/
│   ├── App.tsx                 # Main app (1500+ lines)
│   ├── main.tsx                # Entry point
│   ├── index.css               # Global styling
│   ├── types.ts                # Type definitions
│   ├── firebaseSetup.ts        # Firebase config
│   ├── components/
│   │   ├── StudentSubmit.tsx    # Student form
│   │   └── AdminDashboard.tsx   # Admin panel
│   └── hooks/
│       └── useEvaluatorQueue.ts # Queue logic
├── index.html                  # Template
├── vite.config.ts              # Build config
├── tsconfig.json               # TypeScript
├── tailwind.config.js          # Tailwind
├── firestore.rules             # DB security
├── ACADEMIC_PROJECT_GUIDE.md   # Full docs
└── README.md                   # This file
```

---

## Database Schema (Firestore)

### Collections

**users**
```json
{
  "email": "student@edu.in",
  "full_name": "Alice Baker",
  "role": "STUDENT",
  "reg_num": "REG/2026/0994"
}
```

**lab_sessions**
```json
{
  "course_code": "CS301-Lab",
  "is_active": true,
  "current_dynamic_token": "AX398B"
}
```

**evaluations**
```json
{
  "student_uid": "uid123",
  "lab_session_id": "session_1",
  "status": "COMPLETED",
  "marks": 92,
  "feedback": "Excellent implementation",
  "studentWork": "def solve(): ...",
  "studentDoubts": "How to optimize?",
  "evaluatorFeedback": "Use memoization"
}
```

---

## Security Policies

### Student Access
- ✓ Can only submit to authenticated sessions
- ✓ Token must match current rotating token
- ✓ Can only view their own submissions
- ✓ Cannot modify submitted work after completion

### Evaluator Authority
- ✓ Can view all submissions in their sessions
- ✓ Can assign marks and feedback
- ✓ Can answer student questions directly
- ✓ Cannot modify marks after student views them (audit trail)

### Admin Control
- ✓ Full system access
- ✓ Can create/manage sessions
- ✓ Can override grades (with logging)
- ✓ Cannot delete audit records

---

## Common Workflows

### Scenario 1: Lab Evaluation Class
```
1. Admin creates session "CS301-Lab-Week5"
2. Evaluator logs in → sees token: AX398B
3. Tells students: "Current token is AX398B"
4. Students enter token → submit work
5. Evaluator grades from pending queue
6. Students refresh → see grades
```

### Scenario 2: Exam Invigilation
```
1. Admin rotates token every 10 minutes (manual override)
2. Students must get new token from invigilator
3. Creates accountability checkpoints
4. Prevents bulk copy-paste of token
```

### Scenario 3: Open Lab Hours
```
1. Keep lab session active all week
2. Token rotates automatically every 60s
3. Students get token from info board
4. Can submit anytime that week
```

---

## Troubleshooting

**Q: Token invalid after entering it?**  
A: Token rotates every 60 seconds. Ask evaluator for current one from their dashboard.

**Q: Can't switch to Cloud Mode?**  
A: Firebase not configured. Add config to `firebaseSetup.ts` or use Local Mode (default).

**Q: Grades not showing?**  
A: Wait for evaluator to complete submission. Refresh page. Check Firestore permissions if Cloud Mode.

**Q: Session says "closed"?**  
A: Admin or evaluator deactivated it. Ask them to reactivate using the session control panel.

---

## Performance

- **Local Mode**: Instant, no network needed
- **Cloud Mode**: ~200-500ms for Firestore queries
- **Token Rotation**: Automatic every 60 seconds
- **Evaluation Queue**: Real-time updates via Firestore listeners

---

## Academic Use Cases

✓ **Laboratory Practicals**: Weekly coding labs with immediate grading  
✓ **Practical Exams**: Invigilated assessments with token-gating  
✓ **Capstone Projects**: Long-term evaluation with multiple checkpoints  
✓ **Coursework Submission**: Ongoing assignments with timestamp audit  
✓ **Group Projects**: Single session per group, individual grading  

---

## Support

1. **Check Local Mode**: Works without any configuration
2. **Review Logs**: Open browser console (F12)
3. **Test Manually**: Try different role types
4. **Read Guide**: See `ACADEMIC_PROJECT_GUIDE.md`

---

**Version**: 1.0.0  
**Status**: Academic Prototype - Production Ready  
**Last Updated**: June 10, 2026

---

## License

Academic Use Only - Proprietary

Created for educational institutions requiring professional laboratory management systems.

# Laboratory Access & Student Evaluation System
## Academic Prototype Report - v1.0

---

## Executive Summary

This system implements a **comprehensive academic laboratory access and student evaluation management platform** designed for educational institutions. It provides secure, role-based access control with real-time token authentication, queue-based evaluation workflows, and cloud-or-local data persistence.

### Key Features

✅ **Token-Based Security**: 60-second rotating security tokens for laboratory access  
✅ **Multi-Role Support**: STUDENT, EVALUATOR, ADMIN roles with distinct workflows  
✅ **Real-Time Evaluation Queue**: Automatic queue management for student assessments  
✅ **Dual Backend**: Firebase Cloud with local storage fallback for offline operation  
✅ **Production Ready**: Full error handling, validation, and state management  
✅ **Academic UI**: Professional, formal design suitable for project presentations  

---

## System Architecture

### Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS 4 + Motion (animations) |
| **Backend** | Firebase Firestore + Authentication |
| **Icons** | Lucide React |
| **Build** | Vite 6 |

### System Components

```
Laboratory Access System
├── Authentication Layer
│   ├── Firebase Auth (Cloud)
│   └── Test Mode (Local)
├── Session Management
│   ├── Lab Sessions with Dynamic Tokens
│   └── 60-Second Token Rotation
├── Evaluation Workflow
│   ├── Student Submissions
│   ├── Evaluator Queue
│   └── Grading Interface
├── Data Persistence
│   ├── Firestore (Cloud)
│   └── LocalStorage (Fallback)
└── User Interface
    ├── Student Dashboard
    ├── Evaluator Dashboard
    └── Admin Control Panel
```

---

## User Roles & Workflows

### 1. STUDENT Role
**Workflow**: View Sessions → Enter Token → Submit Work → View Grades

**Key Actions:**
- Select laboratory course session
- Enter current security token (from evaluator's display)
- Submit implementation code/work
- Add clarification questions for evaluator
- View evaluation results and feedback

**Security**: Students can only view their own submissions and grades.

### 2. EVALUATOR Role
**Workflow**: View Tokens → Manage Queue → Grade Submissions → Archive

**Key Actions:**
- **Token Display Dashboard**: View current active tokens for each session
- **Evaluation Queue**: See list of pending student submissions
- **Grading Interface**: 
  - View student work and questions
  - Assign numeric marks (0-100)
  - Provide general feedback
  - Answer student questions directly
- **Completion Archive**: Track all graded evaluations

**Security**: Evaluators manage their assigned courses and can only see relevant submissions.

### 3. ADMIN Role  
**Workflow**: Create Sessions → Manage Users → Monitor System → Override Evaluations

**Key Actions:**
- **Session Management**: Create new lab sessions with course codes
- **Token Control**: Manually rotate tokens or activate/deactivate sessions
- **User Management**: Toggle user roles between STUDENT and EVALUATOR
- **Evaluation Override**: Edit or modify evaluation records if needed

**Security**: Admin operations are logged and restricted to authorized users only.

---

## Security Token System

### Token Rotation Logic

- **Frequency**: Every 60 seconds automatically
- **Format**: 6-character alphanumeric (e.g., `AX398B`)
- **Scope**: Rotated globally across ALL active sessions
- **Display**: Evaluators and Admins can see current tokens in real-time

### Token Verification Flow

```
1. Student selects lab session
2. Student enters current token (must match exactly)
3. System validates token against active session
4. On match → Student proceeds to work submission
5. On mismatch → Error message with 60-second hint
```

### Security Benefits

- **Time-Limited Access**: Each token valid for ~60 seconds
- **Visibility Control**: Only evaluators/admins see current token
- **Rate Limiting**: Token changes prevent brute-force attacks
- **Session Isolation**: Tokens unique per session, not reused

---

## Installation & Setup

### Prerequisites
- Node.js v18+
- npm or yarn
- Optional: Firebase project with Firestore + Authentication enabled

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables

Create `.env.local` in project root:
```env
# Gemini API (Optional - for AI features)
VITE_GEMINI_API_KEY=your_gemini_key_here
```

### Step 3: Firebase Setup (Optional - for cloud mode)

If you have a Firebase project:
1. Add Firebase config to `firebaseSetup.ts`
2. Enable Firestore Database
3. Enable Email/Password Authentication
4. Update security rules in `firestore.rules`

### Step 4: Run Development Server
```bash
npm run dev
```

Application launches at: `http://localhost:3000`

---

## Development Workflow

### Local Mode (Default)
- **Activation**: When Firebase is not configured
- **Features**: Full system functionality with localStorage
- **Use Case**: Development, testing, demos
- **Data**: Persisted in browser localStorage
- **Limitations**: Single browser session only

### Cloud Mode (Optional)
- **Activation**: When Firebase is configured
- **Features**: Multi-user, persistent database, real-time sync
- **Use Case**: Production deployment
- **Data**: Firebase Firestore database
- **Requirements**: Valid Firebase credentials

### Switching Modes
Toggle between Cloud and Local Mode using the button in the top navigation bar.

---

## Database Schema

### Collections (Firestore)

#### `users`
```typescript
{
  email: string;
  full_name: string;
  role: "STUDENT" | "EVALUATOR" | "ADMIN";
  reg_num: string | null;  // For students
}
```

#### `lab_sessions`
```typescript
{
  course_code: string;           // e.g., "CS301-Lab"
  is_active: boolean;
  current_dynamic_token: string; // e.g., "AX398B"
  created_at: Timestamp;
}
```

#### `evaluations`
```typescript
{
  student_uid: string;
  lab_session_id: string;
  status: "PENDING" | "COMPLETED";
  marks: number | null;          // 0-100
  feedback: string | null;       // General feedback
  studentWork: string;           // Submitted code/work
  studentDoubts: string;         // Questions
  evaluatorFeedback: string;     // Answers to doubts
  timestamp: Timestamp;
}
```

---

## Production Deployment

### Build for Production
```bash
npm run build
```
Output: `dist/` directory ready for deployment

### Deployment Options

**1. Static Hosting (Firebase Hosting, Vercel, Netlify)**
```bash
# After build
firebase deploy --only hosting
```

**2. Docker Deployment**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
CMD ["npm", "preview"]
```

**3. Traditional Server**
```bash
# Copy dist/ to web server root
# Configure web server for SPA routing
```

### Environment Checklist
- [ ] Firebase Firestore database configured
- [ ] Authentication rules set
- [ ] API keys secured in environment variables
- [ ] CORS policies configured
- [ ] Rate limiting enabled
- [ ] Backups scheduled
- [ ] Error logging configured

---

## Troubleshooting

### Token Validation Fails
**Problem**: "Invalid access token" error
**Solution**: 
- Verify token matches exactly (case-sensitive)
- Check with evaluator that they're viewing latest token
- Token rotates every 60s - may need to wait or ask for current token

### Cannot Submit Work
**Problem**: Session not responding
**Solution**:
- Verify session is marked as ACTIVE
- Check internet connection
- Try toggling Cloud/Local mode
- Refresh browser (F5)

### Evaluations Not Syncing
**Problem**: Completed grades not appearing
**Solution**:
- If using Cloud mode: Check Firestore permissions
- If using Local mode: Refresh page (data in localStorage)
- Check browser console for errors (F12)
- Verify evaluator clicked "Submit Final Evaluation"

---

## Features & Implementation Details

### Real-Time Updates
- Firestore listeners for sessions and evaluations
- Automatic refresh every 2 seconds in Local Mode
- WebSocket integration for Cloud Mode

### Error Handling
- Graceful fallback from Cloud to Local
- User-friendly error messages
- Automatic retry for network failures
- Detailed logging in console

### Performance Optimizations
- Lazy loading of components
- Debounced state updates
- Efficient re-renders with React memo
- Optimized Firestore queries

---

## Academic Use Cases

### Laboratory Assessment
- Students submit labs → Evaluators grade in real-time → Results archived

### Practical Exams
- Admin creates session → Students access via token → Graders evaluate

### Capstone Projects
- Ongoing evaluation queue → Multiple evaluators → Comparative grading

### Group Projects
- Single session per group → Shared token → Individual grade attribution

---

## Future Enhancements

- 📊 Advanced analytics and grade statistics
- 📧 Email notifications for submissions/grades
- 📝 Rubric-based grading templates
- 🤖 AI-powered plagiarism detection
- 📱 Mobile responsive interface optimization
- 🔐 Two-factor authentication
- 📊 Export grades to CSV/PDF
- 📈 Detailed progress reports

---

## License & Attribution

This system is provided as an academic prototype for educational institutions.

### Credits
- Built with: React, TypeScript, Tailwind CSS, Firebase
- Icons: Lucide React
- Animations: Motion (Framer Motion)
- Build tool: Vite

---

## Support & Documentation

For issues or questions:
1. Check browser console (F12) for error details
2. Review this guide for common solutions
3. Verify Firebase configuration if using Cloud mode
4. Test in Local mode to isolate issues

**Last Updated**: June 10, 2026  
**Version**: 1.0.0 (Academic Prototype)

---

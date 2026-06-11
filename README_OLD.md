# Laboratory Access & Student Evaluation System

A comprehensive digital platform for managing laboratory access control and real-time student evaluation in academic environments. This system provides secure authentication, token-based session management, and automated assessment workflows for educational institutions.

## Features

- **Secure Access Control**: Dynamic token-based authentication with 60-second rotation intervals
- **Real-time Session Management**: Live laboratory session tracking and management
- **Multi-role Support**: Role-based access control for administrators, evaluators, and students
- **Automated Evaluation Queue**: Streamlined assessment workflow with evaluation queue management
- **Cloud Integration**: Firebase backend with offline-first local storage fallback
- **Academic Workflow**: Professional evaluation submission and grading interface

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- Gemini API key (for AI-powered features)

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the project root with the following:
```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Firebase Configuration (Optional)
If using Firebase backend, ensure your Firebase configuration is properly set in `firebaseSetup.ts`.

### 4. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Building for Production
```bash
npm run build
```

## Project Structure

- `src/` - Application source code
  - `components/` - Reusable React components
  - `hooks/` - Custom React hooks
  - `types.ts` - TypeScript type definitions
  - `firebaseSetup.ts` - Firebase configuration and utilities
  - `App.tsx` - Main application component
- `public/` - Static assets
- `dist/` - Production build output

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication)
- **Build Tool**: Vite
- **UI Components**: Lucide React, Motion
- **AI Integration**: Google Gemini AI

## Academic Use

This system is designed specifically for educational institutions requiring robust laboratory session management and student evaluation workflows. It supports multiple evaluation modalities and provides comprehensive audit trails for institutional compliance.

## License

Proprietary - Academic Use Only

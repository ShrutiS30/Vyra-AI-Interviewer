# AI Interviewer — SDE Interview Studio

A full-stack AI-powered technical interview platform designed to simulate FAANG/MAANG Software Development Engineer (SDE) interviews with company-specific rounds, resume-driven questioning, voice-based interaction, and strict hiring-bar evaluation.

## Features

- **Email-Based Authentication & Persistence**: Sign up and sign in with email/password (Firebase Authentication + Firestore, with a localStorage fallback keyed by email for local development).
- **Candidate Profile & Resume Skill Extraction**: Upload a PDF resume (or paste resume text) to automatically extract technical skills, college, degree, and graduation year into an editable Candidate Profile.
- **Company-Specific Interview Tracks**: Calibrated interview blueprints, core topics, and questions for Google, Amazon, Microsoft, Meta, Apple, Netflix, and Uber.
- **Multiple SDE Rounds**: Supports Full SDE Loop (DSA, System Design, CS Core, Behavioral), DSA Round, System Design, Behavioral, and HR Round.
- **Resume-First Question Flow**: Generates personalized questions from the candidate's uploaded resume first, followed by company-calibrated SDE round questions.
- **Voice & Audio Interview Room**:
  - Text-to-Speech (TTS) reads interview questions aloud via the Web Speech Synthesis API.
  - Dual-mode Speech-to-Text (STT) captures microphone audio via `MediaRecorder` with live Web Speech API preview and Gemini multimodal audio transcription fallback (`POST /api/interview/transcribe`), plus an editable transcript box.
  - 2-minute per-question countdown timer and progress tracker.
- **Strict AI Evaluation (0–10 Scale)**: Evaluates every answer against the target company's SDE hiring bar with per-question scores, actionable feedback, strengths, areas for improvement, and a final hiring verdict (`Strong Hire`, `Hire`, or `No Hire`).
- **Light & Dark Themes**: Full-platform editorial Light and Dark themes persisted in `localStorage`.

## Tech Stack

### Frontend
- **React 18** (`react`, `react-dom`)
- **Vite 5** (`vite`, `@vitejs/plugin-react`)
- **Tailwind CSS 3** (`tailwindcss`, `postcss`, `autoprefixer`)
- **React Router v6** (`react-router-dom`)
- **Framer Motion** (`framer-motion`)
- **Lucide React** (`lucide-react`)
- **Axios** (`axios`)
- **React Dropzone** (`react-dropzone`)
- **Browser Web APIs**: `MediaRecorder`, `navigator.mediaDevices.getUserMedia`, `SpeechRecognition` / `webkitSpeechRecognition`, `SpeechSynthesis`

### Backend
- **Node.js** (ES Modules)
- **Express** (`express`)
- **Google Generative AI SDK** (`@google/generative-ai` — `gemini-3.8-flash` / `gemini-3.5-flash-lite` / `gemini-flash-latest`)
- **Multer** (`multer`) for PDF and audio multipart uploads
- **pdf-parse** (`pdf-parse`) for PDF text extraction
- **CORS & Dotenv** (`cors`, `dotenv`)

### Database & Authentication
- **Firebase Authentication** (Email/Password)
- **Cloud Firestore** (User profiles, skills, and interview history per user)

## Project Structure

```text
AI Interviewer/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── components/         # Navbar, CompanyCard, CompanyLogo, AudioWave, ProgressBar, InterviewerAvatar
│   │   ├── context/            # AuthContext, ThemeContext
│   │   ├── pages/              # Login, Register, Dashboard, Profile, Interview, Results
│   │   ├── firebase.js         # Firebase initialization with local fallback
│   │   ├── App.jsx             # Protected/public routing
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── server/                     # Node.js + Express backend
│   ├── routes/
│   │   ├── resume.js           # POST /api/resume/upload, /questions, /parse-text
│   │   └── interview.js        # POST /api/interview/questions, /evaluate, /transcribe
│   ├── utils/
│   │   └── gemini.js           # Gemini prompts, model fallback, audio transcription, strict grading
│   ├── index.js
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Local Setup

1. **Install dependencies**:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Configure environment variables**:
   - Create `server/.env` from `server/.env.example`:
     ```env
     GEMINI_API_KEY=your_gemini_api_key
     PORT=3001
     CLIENT_URL=http://localhost:5173
     ```
   - Create `client/.env` from `client/.env.example` with your Firebase Web App credentials (optional; falls back to local email-keyed `localStorage` if omitted):
     ```env
     VITE_FIREBASE_API_KEY=your_key
     VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     VITE_API_URL=http://localhost:3001
     ```

3. **Run both servers**:
   ```bash
   # Terminal 1 (Backend)
   cd server && npm run dev

   # Terminal 2 (Frontend)
   cd client && npm run dev
   ```
   Open `http://localhost:5173` in Chrome or Edge.

## Deployment

- **Backend (`server/`)**: Deploy as a Node.js Web Service on Render, Railway, or Fly.io with root directory `server`, build command `npm install`, start command `npm start`, and environment variables `GEMINI_API_KEY`, `PORT`, and `CLIENT_URL` (set to your deployed frontend URL).
- **Frontend (`client/`)**: Deploy on Vercel or Netlify with root directory `client`, build command `npm run build`, output directory `dist`, and `VITE_API_URL` set to your deployed backend URL (plus Firebase env vars if enabled).

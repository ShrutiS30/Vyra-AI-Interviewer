import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { db, isFirebaseConfigured } from '../firebase';
import Navbar from '../components/Navbar';
import CompanyCard from '../components/CompanyCard';
import CompanyLogo from '../components/CompanyLogo';
import {
  Upload, CheckCircle, FileText, ChevronRight, Clock,
  Star, Briefcase, AlertCircle, Loader2, Code2, Layers,
  Users, UserCheck, Rocket, HelpCircle, Edit3, ArrowUpRight, ArrowLeft
} from 'lucide-react';

const COMPANIES = [
  {
    id: 'google',
    name: 'Google',
    tagline: 'Algorithms & Googleyness',
    color: '#4285f4',
    focus: 'Heavy emphasis on optimal Big-O algorithms, graph/DP problems, large-scale distributed design, and intellectual humility.',
    topics: ['Graphs & DP', 'System Design at Scale', 'Concurrency', 'Googleyness'],
    sampleQuestions: [
      'Design a globally distributed web crawler that respects politeness and avoids duplicate URLs.',
      'Given a stream of words and queries, return the top K most frequent autocomplete suggestions in real time.',
      'Tell me about a time you navigated high ambiguity without clear requirements.'
    ]
  },
  {
    id: 'amazon',
    name: 'Amazon',
    tagline: 'Leadership Principles',
    color: '#f59e0b',
    focus: 'Every round blends coding/OOP design with Amazon’s 16 Leadership Principles evaluated via the STAR method.',
    topics: ['Leadership Principles (STAR)', 'Scalable OOP', 'Distributed Systems', 'Trees & Heaps'],
    sampleQuestions: [
      'Tell me about a time you took ownership of a critical production issue outside your scope.',
      'Design a parking lot or package locker system using clean object-oriented principles.',
      'Find the K closest delivery points to a warehouse origin.'
    ]
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    tagline: 'Growth Mindset & Design',
    color: '#00a4ef',
    focus: 'Balanced focus on clean, bug-free coding, collaborative problem solving, product thinking, and growth mindset.',
    topics: ['Clean Code & Edge Cases', 'Trees & Linked Lists', 'API & Low-Level Design', 'Collaboration'],
    sampleQuestions: [
      'Design a collaborative real-time document editor supporting concurrent edits.',
      'Serialize and deserialize a binary search tree without extra metadata.',
      'Describe a time you received critical feedback and how it changed your approach.'
    ]
  },
  {
    id: 'meta',
    name: 'Meta',
    tagline: 'Speed, Scale & Product',
    color: '#1877f2',
    focus: 'Fast, accurate coding (usually 2 medium/hard problems in 45 mins), social-scale architecture, and product sense.',
    topics: ['Coding Speed', 'Graphs & BFS/DFS', 'News Feed Architecture', 'Product Sense'],
    sampleQuestions: [
      'Design Instagram’s home feed ranking and fan-out pipeline for billions of users.',
      'Clone an undirected graph and find the shortest path between two nodes.',
      'How would you diagnose a sudden 20% drop in daily active users?'
    ]
  },
  {
    id: 'apple',
    name: 'Apple',
    tagline: 'Craftsmanship & Quality',
    color: '#64748b',
    focus: 'Deep domain mastery, memory/performance efficiency, user-centric engineering, and meticulous attention to detail.',
    topics: ['Memory & Performance', 'OS & Concurrency', 'Clean Architecture', 'User Experience'],
    sampleQuestions: [
      'Design an LRU Cache that is thread-safe and minimizes lock contention.',
      'How does virtual memory paging work, and how would you profile an app with high memory pressure?',
      'Tell me about a feature where you obsessed over a subtle edge case or UX detail.'
    ]
  },
  {
    id: 'netflix',
    name: 'Netflix',
    tagline: 'Freedom & Responsibility',
    color: '#e50914',
    focus: 'Senior-level autonomy, high-reliability microservices, streaming/CDN architecture, and strong culture-memo alignment.',
    topics: ['CDN & Streaming', 'Resilient Microservices', 'Chaos Engineering', 'Culture Memo Fit'],
    sampleQuestions: [
      'Design a global video streaming CDN that adapts bitrate dynamically under network congestion.',
      'How do you design circuit breakers and graceful degradation in distributed microservices?',
      'Tell me about an unpopular technical decision you championed and owned.'
    ]
  },
  {
    id: 'uber',
    name: 'Uber',
    tagline: 'Real-World Systems',
    color: '#27272a',
    focus: 'Practical engineering problems around geospatial indexing, real-time matching, surge pricing, and high-throughput events.',
    topics: ['Geospatial & Quadtrees', 'Real-Time Matching', 'Event-Driven Systems', 'Graph Routing'],
    sampleQuestions: [
      'Design Uber’s real-time driver-rider matching and location tracking service.',
      'Given a city road graph with live traffic weights, find the fastest route between two coordinates.',
      'How would you prevent double-booking a driver under high concurrency?'
    ]
  }
];

const ROUNDS = [
  { id: 'Full SDE Loop', label: 'Full SDE Loop', Icon: Rocket, desc: 'DSA, System Design, CS Core & Behavioral' },
  { id: 'DSA', label: 'DSA Round', Icon: Code2, desc: 'Data structures & algorithms' },
  { id: 'System Design', label: 'System Design', Icon: Layers, desc: 'Architecture & scalability' },
  { id: 'Behavioral', label: 'Behavioral', Icon: Users, desc: 'STAR method & leadership' },
  { id: 'HR', label: 'HR Round', Icon: UserCheck, desc: 'Culture fit & expectations' }
];

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [hasStartedJourney, setHasStartedJourney] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadError, setUploadError] = useState('');
  const [showPasteMode, setShowPasteMode] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedRound, setSelectedRound] = useState(null);

  const [pastInterviews, setPastInterviews] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [profile, setProfile] = useState({
    name: currentUser?.displayName || '',
    college: '',
    degree: '',
    graduationYear: '',
    experience: '',
    skills: []
  });
  const [skillInput, setSkillInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState('');
  const [extractingTextProfile, setExtractingTextProfile] = useState(false);

  // Load candidate profile
  useEffect(() => {
    if (!currentUser) return;
    async function fetchProfile() {
      try {
        if (!isFirebaseConfigured) {
          const key = `ai_interviewer_profile_${currentUser.email}`;
          const saved = JSON.parse(localStorage.getItem(key) || 'null');
          if (saved) {
            setProfile(prev => ({ ...prev, ...saved, skills: Array.isArray(saved.skills) ? saved.skills : [] }));
          }
          return;
        }
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile(prev => ({
            ...prev,
            name: data.displayName || data.name || prev.name,
            college: data.college || '',
            degree: data.degree || '',
            graduationYear: data.graduationYear || '',
            experience: data.experience || '',
            skills: Array.isArray(data.skills) ? data.skills : []
          }));
        }
      } catch (e) {
        console.error('Failed to load profile:', e);
      }
    }
    fetchProfile();
  }, [currentUser]);

  async function saveProfileToStore(nextProfile) {
    if (!currentUser) return;
    setSavingProfile(true);
    try {
      if (!isFirebaseConfigured) {
        const key = `ai_interviewer_profile_${currentUser.email}`;
        localStorage.setItem(key, JSON.stringify({ ...nextProfile, email: currentUser.email, updatedAt: new Date().toISOString() }));
      } else {
        await setDoc(doc(db, 'users', currentUser.uid), {
          email: currentUser.email,
          displayName: nextProfile.name,
          college: nextProfile.college,
          degree: nextProfile.degree,
          graduationYear: nextProfile.graduationYear,
          experience: nextProfile.experience,
          skills: nextProfile.skills,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      setProfileSavedMsg('Profile saved');
      setTimeout(() => setProfileSavedMsg(''), 2500);
    } catch (e) {
      console.error('Save profile error:', e);
    } finally {
      setSavingProfile(false);
    }
  }

  function mergeExtractedProfile(extracted) {
    if (!extracted) return;
    setProfile(prev => {
      const existingLower = new Set(prev.skills.map(s => s.toLowerCase()));
      const newSkills = (extracted.skills || []).filter(s => s && !existingLower.has(s.toLowerCase()));
      const merged = {
        name: prev.name || extracted.name || '',
        college: prev.college || extracted.college || '',
        degree: prev.degree || extracted.degree || '',
        graduationYear: prev.graduationYear || extracted.graduationYear || '',
        experience: prev.experience || '',
        skills: [...prev.skills, ...newSkills]
      };
      saveProfileToStore(merged);
      return merged;
    });
  }

  function handleAddSkill(e) {
    if (e) e.preventDefault();
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    const exists = profile.skills.some(s => s.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      setProfile(prev => ({ ...prev, skills: [...prev.skills, trimmed] }));
    }
    setSkillInput('');
  }

  function handleRemoveSkill(skillToRemove) {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  }

  useEffect(() => {
    if (!currentUser) return;
    async function fetchHistory() {
      try {
        if (!isFirebaseConfigured) {
          const key = `ai_interviewer_history_${currentUser.email}`;
          const saved = JSON.parse(localStorage.getItem(key) || '[]');
          setPastInterviews(saved.slice(0, 5));
          return;
        }
        const ref = collection(db, 'users', currentUser.uid, 'interviews');
        const q = query(ref, orderBy('date', 'desc'), limit(5));
        const snap = await getDocs(q);
        setPastInterviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingHistory(false);
      }
    }
    fetchHistory();
  }, [currentUser]);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setResumeFile(file);
    setUploadStatus('uploading');
    setUploadError('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await axios.post('/api/resume/upload', formData);
      setResumeText(res.data.text || '');
      if (res.data.extractedProfile) {
        mergeExtractedProfile(res.data.extractedProfile);
      }
      setUploadStatus('success');
      setShowPasteMode(false);
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed. Please try another PDF or paste your resume text.');
      setUploadStatus('error');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  });

  function handleStartInterview() {
    if (!selectedCompany || !selectedRound) return;
    navigate('/interview', {
      state: {
        company: { id: selectedCompany.id, name: selectedCompany.name },
        round: { id: selectedRound.id, label: selectedRound.label, desc: selectedRound.desc },
        resumeText
      }
    });
  }

  function formatDate(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getScoreColor(score) {
    if (score >= 8) return '#16a34a';
    if (score >= 5) return '#d97706';
    return '#dc2626';
  }

  function getVerdictColor(verdict) {
    if (verdict === 'Strong Hire') return 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10';
    if (verdict === 'Hire') return 'text-blue-700 dark:text-blue-400 bg-blue-500/10';
    return 'text-red-700 dark:text-red-400 bg-red-500/10';
  }

  const avgScore = pastInterviews.length > 0
    ? (pastInterviews.reduce((sum, item) => sum + (Number(item.score) || 0), 0) / pastInterviews.length).toFixed(1)
    : '—';

  return (
    <div className="min-h-screen transition-colors duration-300">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {!hasStartedJourney ? (
            <motion.div
              key="welcome-stage"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="min-h-[calc(100vh-11rem)] flex items-center justify-center"
            >
              <div className="w-full max-w-2xl">
                <div className="card flex flex-col justify-between p-8 sm:p-10">
                  <div>
                    <span className="inline-block text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3">
                      Candidate Workspace
                    </span>
                    <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">
                      Prepare for Top Engineering Interviews, {currentUser?.displayName || 'Candidate'}.
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-3 text-sm sm:text-base leading-relaxed max-w-xl">
                      Upload your resume, select a target company, and complete a voice-guided SDE interview tailored to their real hiring bar.
                    </p>

                    <div className="mt-7">
                      <button
                        type="button"
                        onClick={() => setHasStartedJourney(true)}
                        className="btn-primary inline-flex items-center gap-2.5 px-6 py-3 text-sm"
                      >
                        <span>Start Your Journey</span>
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  </div>

                  {/* Trusted Company Strip */}
                  <div className="mt-8 pt-5 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center gap-4">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Calibrated for:
                    </span>
                    <div className="flex items-center gap-3.5 text-zinc-700 dark:text-zinc-300">
                      {COMPANIES.map(c => (
                        <div key={c.id} title={c.name} className="opacity-80 hover:opacity-100 transition-opacity">
                          <CompanyLogo companyId={c.id} size={18} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="setup-stage"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setHasStartedJourney(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to Overview
                </button>
              </div>

        {/* Step 1: Resume Upload */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              STEP 01
            </span>
            <h3 className="font-editorial text-xl font-semibold text-zinc-900 dark:text-white">
              Upload Your Resume
            </h3>
            <div className="ml-auto">
              <button
                type="button"
                onClick={() => setShowPasteMode(v => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:underline"
              >
                <Edit3 size={13} />
                {showPasteMode ? 'Switch to PDF upload' : 'Or paste resume text'}
              </button>
            </div>
          </div>

          {uploadStatus === 'success' && !showPasteMode ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
              <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-emerald-800 dark:text-emerald-300 font-medium text-sm">
                  Resume parsed successfully
                </p>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5 truncate">
                  {resumeFile ? `${resumeFile.name} (${resumeText.split(/\s+/).length} words)` : `${resumeText.split(/\s+/).length} words loaded`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setUploadStatus('idle'); setResumeText(''); setResumeFile(null); }}
                className="ml-auto text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs font-semibold"
              >
                Replace
              </button>
            </div>
          ) : showPasteMode ? (
            <div className="space-y-3">
              <textarea
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  if (e.target.value.trim()) setUploadStatus('success');
                  else setUploadStatus('idle');
                }}
                placeholder="Paste your resume text here (experience, projects, skills)..."
                className="w-full min-h-[130px] rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 p-3.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 dark:focus:ring-white/20"
              />
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="url"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  placeholder="Or paste a resume link (PDF/HTML URL)"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!resumeUrl.trim()) return;
                    setUploadStatus('uploading');
                    setUploadError('');
                    try {
                      const res = await axios.post('/api/resume/from-url', { url: resumeUrl });
                      setResumeText(res.data.text || '');
                      if (res.data.extractedProfile) mergeExtractedProfile(res.data.extractedProfile);
                      setUploadStatus('success');
                    } catch (err) {
                      setUploadError(err.response?.data?.error || 'Failed to load resume from URL.');
                      setUploadStatus('error');
                    }
                  }}
                  className="btn-secondary whitespace-nowrap"
                >
                  Load from URL
                </button>
              </div>

              {resumeText.trim() && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <span>{resumeText.trim().split(/\s+/).length} words ready for resume-based questions</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={extractingTextProfile}
                      onClick={async () => {
                        setExtractingTextProfile(true);
                        try {
                          const { data } = await axios.post('/api/resume/parse-text', { resumeText });
                          if (data.extractedProfile) mergeExtractedProfile(data.extractedProfile);
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setExtractingTextProfile(false);
                        }
                      }}
                      className="font-semibold text-zinc-900 dark:text-white underline underline-offset-2 disabled:opacity-50"
                    >
                      {extractingTextProfile ? 'Extracting skills...' : 'Extract Skills & Info to Profile'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setResumeText(''); setUploadStatus('idle'); }}
                      className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragActive
                  ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800/60'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
              }`}
            >
              <input {...getInputProps()} />
              {uploadStatus === 'uploading' ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={28} className="text-zinc-700 dark:text-zinc-300 animate-spin" />
                  <p className="text-zinc-600 dark:text-zinc-300 text-sm">Parsing your resume...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Upload size={20} className="text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <div>
                    <p className="text-zinc-900 dark:text-white font-medium text-sm">
                      {isDragActive ? 'Drop your PDF here' : 'Drag & drop your resume PDF'}
                    </p>
                    <p className="text-zinc-500 text-xs mt-1">or click to browse (PDF up to 10 MB)</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="flex items-center gap-2 mt-3 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Step 2: Company Selection */}
        <div className="card">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              STEP 02
            </span>
            <h3 className="font-editorial text-xl font-semibold text-zinc-900 dark:text-white">
              Select Target Company
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {COMPANIES.map(company => (
              <CompanyCard
                key={company.id}
                company={company}
                selected={selectedCompany?.id === company.id}
                onClick={() => setSelectedCompany(selectedCompany?.id === company.id ? null : company)}
              />
            ))}
          </div>

          {/* Company Interview Blueprint & Sample Questions */}
          {selectedCompany && (
            <div className="mt-6 p-5 rounded-2xl bg-white/50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0">
                  <CompanyLogo companyId={selectedCompany.id} size={22} />
                </div>
                <div>
                  <h4 className="font-editorial font-semibold text-zinc-900 dark:text-white text-base">
                    {selectedCompany.name} SDE Interview Blueprint
                  </h4>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                    {selectedCompany.focus}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedCompany.topics.map(topic => (
                  <span
                    key={topic}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                  >
                    {topic}
                  </span>
                ))}
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                  <HelpCircle size={13} />
                  Representative Questions Asked by {selectedCompany.name}
                </div>
                <ul className="space-y-2">
                  {selectedCompany.sampleQuestions.map((q, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-zinc-800 dark:text-zinc-200 bg-white dark:bg-[#131720] border border-zinc-200/80 dark:border-zinc-800 rounded-xl px-4 py-2.5 flex items-start gap-3"
                    >
                      <span className="text-xs font-bold text-zinc-400 mt-0.5">0{idx + 1}</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Round Selection */}
        {selectedCompany && (
          <div className="card">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                STEP 03
              </span>
              <h3 className="font-editorial text-xl font-semibold text-zinc-900 dark:text-white">
                Select Interview Round
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {ROUNDS.map(round => {
                const IconComp = round.Icon;
                const isSelected = selectedRound?.id === round.id;
                return (
                  <button
                    key={round.id}
                    type="button"
                    onClick={() => setSelectedRound(isSelected ? null : round)}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-zinc-900 dark:border-white bg-zinc-900/[0.04] dark:bg-white/[0.06] shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#131720] hover:border-zinc-400 dark:hover:border-zinc-600'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
                      isSelected
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}>
                      <IconComp size={18} />
                    </div>
                    <div className="font-semibold text-zinc-900 dark:text-white text-sm">{round.label}</div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">{round.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Start Interview CTA */}
        {selectedCompany && selectedRound && (
          <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-zinc-900/20 dark:border-white/20">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <CompanyLogo companyId={selectedCompany.id} size={22} />
              </div>
              <div>
                <h3 className="font-editorial text-lg font-semibold text-zinc-900 dark:text-white">
                  {selectedCompany.name} — {selectedRound.label}
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  {resumeText
                    ? 'Resume included: resume questions first, followed by company SDE questions.'
                    : 'Optional: upload or paste a resume above for personalized resume questions first.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStartInterview}
              className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>Begin Interview</span>
              <ChevronRight size={17} />
            </button>
          </div>
        )}

        {/* Past Interviews & Your Performance */}
        <div className="card space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Clock size={18} className="text-zinc-500 dark:text-zinc-400" />
              <h3 className="font-editorial text-xl font-semibold text-zinc-900 dark:text-white">
                Past Interviews
              </h3>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="text-zinc-500 animate-spin" />
              </div>
            ) : pastInterviews.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  No interviews recorded yet. Complete your first session above to track your progress.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastInterviews.map(interview => {
                  const comp = COMPANIES.find(c => c.id === interview.company);
                  return (
                    <div
                      key={interview.id}
                      onClick={() => {
                        if (interview.feedback) {
                          const compObj = comp || { id: interview.company, name: interview.company };
                          const roundObj = ROUNDS.find(r => r.id === interview.round) || { id: interview.round, label: interview.round };
                          navigate('/results', { state: { result: interview.feedback, company: compObj, round: roundObj } });
                        }
                      }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0">
                        <CompanyLogo companyId={interview.company} size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-zinc-900 dark:text-white capitalize text-sm">
                          {interview.company} — {interview.round}
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">{formatDate(interview.date)}</div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <div className="text-base font-bold" style={{ color: getScoreColor(interview.score) }}>
                            {interview.score}/10
                          </div>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getVerdictColor(interview.verdict)}`}>
                            {interview.verdict}
                          </span>
                        </div>
                        <ArrowUpRight size={16} className="text-zinc-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star size={18} className="text-zinc-500 dark:text-zinc-400" />
              <h3 className="font-editorial text-xl font-semibold text-zinc-900 dark:text-white">
                Your Performance
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white/50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800">
                <div className="text-2xl font-editorial font-bold text-zinc-900 dark:text-white">{pastInterviews.length}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Sessions</div>
              </div>
              <div className="p-4 rounded-xl bg-white/50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800">
                <div className="text-2xl font-editorial font-bold text-zinc-900 dark:text-white">{avgScore}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Avg Rating</div>
              </div>
              <div className="p-4 rounded-xl bg-white/50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800">
                <div className="text-2xl font-editorial font-bold text-zinc-900 dark:text-white">{COMPANIES.length}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Tracks</div>
              </div>
              <div className="p-4 rounded-xl bg-white/50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800">
                <div className="text-lg font-semibold truncate text-zinc-900 dark:text-white">
                  {uploadStatus === 'success' ? 'Ready' : 'Pending'}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Resume</div>
              </div>
            </div>
          </div>
          </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

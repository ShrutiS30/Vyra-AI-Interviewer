import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db, isFirebaseConfigured } from '../firebase';
import AudioWave from '../components/AudioWave';
import ProgressBar from '../components/ProgressBar';
import CompanyLogo from '../components/CompanyLogo';
import InterviewerAvatar from '../components/InterviewerAvatar';
import {
  Mic, MicOff, SkipForward, Volume2, VolumeX,
  Clock, ChevronRight, Loader2, AlertCircle, Sun, Moon
} from 'lucide-react';

export default function Interview() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const { company, round, resumeText } = state || {};

  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(120); // 2 min per question
  const [timerActive, setTimerActive] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [micError, setMicError] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const isRecordingRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');

  // Cleanup mic & TTS on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  // Redirect if no state
  useEffect(() => {
    if (!company || !round) {
      navigate('/');
    }
  }, []);

  // Load questions
  useEffect(() => {
    if (!company || !round) return;
    async function fetchQuestions() {
      setLoading(true);
      setError('');
      try {
        const [genRes, resumeRes] = await Promise.allSettled([
          axios.post('/api/interview/questions', { company: company.name, roundType: round.id }),
          resumeText
            ? axios.post('/api/resume/questions', { resumeText, company: company.name })
            : Promise.resolve({ data: { questions: [] } })
        ]);

        const genQs = genRes.status === 'fulfilled' ? (genRes.value.data.questions || []) : [];
        const resumeQs = resumeRes.status === 'fulfilled' ? (resumeRes.value.data.questions || []) : [];

        // Ask resume questions first, then company/DSA/SDE round questions
        const all = [...resumeQs, ...genQs];
        if (all.length === 0) throw new Error('No questions received.');
        setQuestions(all);
        setAnswers(new Array(all.length).fill(''));
      } catch (e) {
        setError(e.message || 'Failed to load questions. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchQuestions();
  }, []);

  // Speak question when it changes
  useEffect(() => {
    if (questions.length > 0 && !loading && ttsEnabled) {
      speakQuestion(questions[currentIdx]);
    }
  }, [currentIdx, questions, loading]);

  // Timer
  useEffect(() => {
    if (timerActive && timer > 0) {
      timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      handleNext();
    }
    return () => clearTimeout(timerRef.current);
  }, [timerActive, timer]);

  // Start timer when recording begins
  useEffect(() => {
    if (isRecording) {
      setTimer(120);
      setTimerActive(true);
    } else {
      setTimerActive(false);
    }
  }, [isRecording]);

  function speakQuestion(text) {
    window.speechSynthesis.cancel();
    if (!ttsEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function launchLivePreviewRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (e) => {
        let interim = '';
        let finalChunk = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            finalChunk += t + ' ';
          } else {
            interim += t;
          }
        }
        if (finalChunk) {
          accumulatedTranscriptRef.current += finalChunk;
        }
        setCurrentAnswer((accumulatedTranscriptRef.current + interim).trimStart());
      };

      // If live SpeechRecognition fails (e.g. offline/network in Chrome), keep MediaRecorder running!
      recognition.onerror = (e) => {
        console.warn('Live speech preview unavailable:', e.error);
      };

      recognition.onend = () => {
        if (isRecordingRef.current) {
          setTimeout(() => {
            if (isRecordingRef.current) {
              try { launchLivePreviewRecognition(); } catch {}
            }
          }, 200);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Could not start live speech preview:', err);
    }
  }

  async function startRecording() {
    setMicError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('Microphone access is not supported in this browser or context (requires localhost/HTTPS). You can type your answer below.');
      return;
    }

    window.speechSynthesis.cancel();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;

      accumulatedTranscriptRef.current = currentAnswer ? currentAnswer.trimEnd() + ' ' : '';
      isRecordingRef.current = true;
      setIsRecording(true);

      // Optional live preview via Web Speech API (falls back to Gemini audio transcription on stop)
      launchLivePreviewRecognition();
    } catch (permErr) {
      console.error('Microphone error:', permErr);
      setMicError(
        permErr.name === 'NotAllowedError'
          ? 'Microphone permission denied. Allow mic access in your browser address bar and try again.'
          : permErr.name === 'NotFoundError'
            ? 'No microphone detected. Please connect a microphone or type your answer below.'
            : `Could not access microphone (${permErr.message}). You can type your answer below.`
      );
    }
  }

  async function stopRecording() {
    isRecordingRef.current = false;
    setIsRecording(false);
    setTimerActive(false);

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    let audioBlob = null;
    if (recorder && recorder.state !== 'inactive') {
      audioBlob = await new Promise((resolve) => {
        recorder.onstop = () => {
          const type = recorder.mimeType || 'audio/webm';
          resolve(new Blob(audioChunksRef.current, { type }));
        };
        try {
          recorder.stop();
        } catch {
          resolve(null);
        }
      });
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    // If live SpeechRecognition didn't capture anything, transcribe the recorded audio via Gemini backend
    const existingText = (accumulatedTranscriptRef.current || currentAnswer || '').trim();
    if (!existingText && audioBlob && audioBlob.size > 1000) {
      setIsTranscribing(true);
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'answer.webm');
        const { data } = await axios.post('/api/interview/transcribe', formData);
        if (data.transcript) {
          accumulatedTranscriptRef.current = data.transcript;
          setCurrentAnswer(data.transcript);
          return data.transcript;
        } else {
          setMicError('No speech was detected in your recording. Try speaking closer to the mic or type your answer.');
        }
      } catch (err) {
        console.error('Backend transcription failed:', err);
        setMicError('Could not transcribe audio automatically. Please type your answer below.');
      } finally {
        setIsTranscribing(false);
      }
    }
    return existingText;
  }

  async function handleNext() {
    const transcribed = await stopRecording();
    setMicError('');
    window.speechSynthesis.cancel();

    const finalText = (currentAnswer || transcribed || '').trim();
    const updatedAnswers = [...answers];
    updatedAnswers[currentIdx] = finalText || '(No answer provided)';
    setAnswers(updatedAnswers);
    setCurrentAnswer('');
    accumulatedTranscriptRef.current = '';

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setTimer(120);
    } else {
      // All done — evaluate
      submitInterview(updatedAnswers);
    }
  }

  async function submitInterview(finalAnswers) {
    setEvaluating(true);
    try {
      const qaPairs = questions.map((q, i) => ({
        question: q,
        answer: finalAnswers[i] || '(No answer provided)'
      }));

      const { data } = await axios.post('/api/interview/evaluate', {
        company: company.name,
        answers: qaPairs
      });

      const ev = data.evaluation || data;
      const mergedQA = qaPairs.map((qa, i) => ({
        question: qa.question,
        answer: qa.answer,
        score: ev.perQuestionFeedback?.[i]?.score,
        feedback: ev.perQuestionFeedback?.[i]?.feedback || ''
      }));

      const normalizedResult = {
        score: ev.overallScore ?? ev.score ?? 0,
        verdict: ev.finalVerdict ?? ev.verdict ?? 'No Hire',
        summary: ev.verdictReason ?? ev.summary ?? ev.overallFeedback ?? 'Interview completed.',
        strengths: ev.strengths || [],
        areasForImprovement: ev.areasForImprovement || [],
        questionsAndAnswers: mergedQA
      };

      // Store in Firestore or localStorage fallback
      if (!isFirebaseConfigured) {
        const key = `ai_interviewer_history_${currentUser.email}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.unshift({
          id: Date.now().toString(),
          email: currentUser.email,
          company: company.id,
          round: round.id,
          date: new Date().toISOString(),
          score: normalizedResult.score,
          verdict: normalizedResult.verdict,
          questionsAndAnswers: mergedQA,
          feedback: normalizedResult
        });
        localStorage.setItem(key, JSON.stringify(existing));
      } else {
        const interviewData = {
          email: currentUser.email,
          company: company.id,
          round: round.id,
          date: serverTimestamp(),
          score: normalizedResult.score,
          verdict: normalizedResult.verdict,
          questionsAndAnswers: mergedQA,
          feedback: normalizedResult
        };

        const ref = collection(db, 'users', currentUser.uid, 'interviews');
        await addDoc(ref, interviewData);
      }

      navigate('/results', { state: { result: normalizedResult, company, round } });
    } catch (e) {
      setError('Evaluation failed: ' + (e.response?.data?.error || e.message));
      setEvaluating(false);
    }
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-[#0b1120]">
        <Loader2 size={40} className="text-indigo-500 animate-spin" />
        <p className="text-slate-800 dark:text-slate-200 text-lg font-medium">Preparing your interview questions...</p>
        <p className="text-slate-500 text-sm">AI is crafting {company?.name} style questions</p>
      </div>
    );
  }

  if (evaluating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-[#0b1120]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
        <p className="text-slate-800 dark:text-slate-200 text-lg font-medium">Evaluating your answers...</p>
        <p className="text-slate-500 text-sm">AI is analyzing your performance</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-[#0b1120] px-4 text-center">
        <AlertCircle size={40} className="text-red-500" />
        <p className="text-red-600 dark:text-red-400 text-lg">{error}</p>
        <button onClick={() => navigate('/')} className="btn-secondary">Back to Dashboard</button>
      </div>
    );
  }

  const question = questions[currentIdx];

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      {/* Header */}
      <div className="glass px-6 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
              <CompanyLogo companyId={company?.id} size={22} />
            </div>
            <div>
              <h1 className="font-editorial font-bold text-zinc-900 dark:text-white capitalize text-lg">{company?.name}</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">{round?.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {/* TTS toggle */}
            <button
              onClick={() => {
                setTtsEnabled(v => !v);
                window.speechSynthesis.cancel();
              }}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              title="Toggle voice"
            >
              {ttsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            {/* Timer */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold ${
              timer < 30
                ? 'text-red-600 dark:text-red-400 bg-red-500/10'
                : 'text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800'
            }`}>
              <Clock size={14} />
              {formatTime(timer)}
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-4xl mx-auto w-full px-6 pt-6">
        <ProgressBar current={currentIdx + 1} total={questions.length} />
      </div>

        {/* Main content */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
          <InterviewerAvatar isSpeaking={isSpeaking} isRecording={isRecording} companyName={company?.name} />
        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-medium">
            <Volume2 size={14} className="animate-pulse" />
            Reading question aloud...
          </div>
        )}

        {/* Question card */}
        <div className="card flex-1 flex flex-col">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full whitespace-nowrap">
              Q{currentIdx + 1}
            </span>
            <p className="text-slate-900 dark:text-white text-lg leading-relaxed font-medium">{question}</p>
          </div>

          {/* Answer transcript */}
          <div className="mt-4 flex-1 min-h-[140px] rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 p-4 flex flex-col">
            <textarea
              value={currentAnswer}
              onChange={(e) => {
                setCurrentAnswer(e.target.value);
                accumulatedTranscriptRef.current = e.target.value;
              }}
              placeholder={isRecording ? 'Listening... (speak into your microphone)' : 'Your spoken answer will appear here when you start recording (or type as fallback)...'}
              className="w-full flex-1 bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none leading-relaxed min-h-[110px]"
            />
          </div>

          {/* Audio wave */}
          <div className="mt-4">
            <AudioWave isActive={isRecording} />
          </div>

          {isTranscribing && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <Loader2 size={14} className="animate-spin" />
              <span>Transcribing your recorded audio...</span>
            </div>
          )}

          {micError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{micError}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="btn-primary flex items-center gap-2 flex-1 justify-center"
            >
              <Mic size={20} />
              Start Answering
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 flex-1 justify-center py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }}
            >
              <MicOff size={20} />
              Stop Recording
            </button>
          )}

          <button
            onClick={handleNext}
            className="btn-secondary flex items-center gap-2 whitespace-nowrap"
          >
            {currentIdx < questions.length - 1 ? (
              <><SkipForward size={18} /> Skip / Next</>
            ) : (
              <><ChevronRight size={18} /> Finish</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

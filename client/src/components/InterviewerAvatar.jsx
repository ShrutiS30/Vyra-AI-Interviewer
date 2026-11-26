import React from 'react';
import { motion } from 'framer-motion';

export default function InterviewerAvatar({ isSpeaking, isRecording, companyName, passwordFocused }) {
  const [waving, setWaving] = React.useState(false);

  React.useEffect(() => {
    if (passwordFocused) { setWaving(false); return; }
    const t = setTimeout(() => setWaving(true), 4500);
    const t2 = setTimeout(() => setWaving(false), 6000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [passwordFocused]);

  const coverEyes = passwordFocused;

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <motion.div
        animate={{ rotate: coverEyes ? 0 : (waving ? [0, -8, 8, 0] : -6) }}
        transition={{ duration: 0.6 }}
        className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-pink-400 via-rose-500 to-amber-400 p-1 shadow-lg"
        style={{ transformOrigin: 'bottom center' }}
      >
        <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden relative">
          <motion.div
            animate={{
              scale: isSpeaking ? [1, 1.15, 1] : isRecording ? [1, 1.08, 1] : 1,
              opacity: isSpeaking || isRecording ? 0.8 : 0.4
            }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="absolute inset-0 bg-gradient-to-t from-rose-500/30 to-indigo-500/30 rounded-full blur-md"
          />

          <svg
            viewBox="0 0 120 120"
            className="w-16 h-16 sm:w-20 sm:h-20 relative z-10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M25 65C25 40 40 25 60 25C80 25 95 40 95 65C95 85 90 100 90 100H30C30 100 25 85 25 65Z" fill="#3f2314" />
            <path d="M35 35C45 20 75 20 85 35C90 45 95 60 95 65C95 65 80 30 60 30C40 30 25 65 25 65C25 60 30 45 35 35Z" fill="#5c341b" />
            <circle cx="60" cy="65" r="28" fill="#ffdbac" />
            <circle cx="45" cy="74" r="5" fill="#ff9494" opacity="0.6" />
            <circle cx="75" cy="74" r="5" fill="#ff9494" opacity="0.6" />

            {coverEyes ? (
              <g>
                <path d="M42 58 Q50 52 58 58" stroke="#2d1505" strokeWidth="2" fill="none" />
                <path d="M62 58 Q70 52 78 58" stroke="#2d1505" strokeWidth="2" fill="none" />
              </g>
            ) : (
              <motion.g
                animate={{ scaleY: [1, 0.1, 1] }}
                transition={{ repeat: Infinity, repeatDelay: 4, duration: 0.2 }}
              >
                <ellipse cx="50" cy="60" rx="3.5" ry="4.5" fill="#2d1505" />
                <circle cx="49" cy="58" r="1" fill="white" />
                <ellipse cx="70" cy="60" rx="3.5" ry="4.5" fill="#2d1505" />
                <circle cx="69" cy="58" r="1" fill="white" />
              </motion.g>
            )}

            {coverEyes && (
              <g>
                <ellipse cx="48" cy="62" rx="9" ry="6" fill="#ffdbac" stroke="#c2410c" strokeWidth="1" />
                <ellipse cx="72" cy="62" rx="9" ry="6" fill="#ffdbac" stroke="#c2410c" strokeWidth="1" />
              </g>
            )}

            {isSpeaking ? (
              <motion.ellipse
                cx="60" cy="76" rx="4" ry="6" fill="#e11d48"
                animate={{ scaleY: [0.8, 1.4, 0.8], scaleX: [0.9, 1.1, 0.9] }}
                transition={{ repeat: Infinity, duration: 0.3 }}
              />
            ) : isRecording ? (
              <motion.path
                d="M54 75Q60 82 66 75" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round"
                animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}
              />
            ) : (
              <path d="M54 74Q60 80 66 74" stroke="#c2410c" strokeWidth="2.5" strokeLinecap="round" />
            )}

            <path d="M60 22C65 15 75 18 70 25C65 28 60 22 60 22Z" fill="#f43f5e" />
            <circle cx="61" cy="23" r="3" fill="#fb7185" />
          </svg>

          {waving && !coverEyes && (
            <motion.div
              initial={{ rotate: 0, x: 40, y: -30 }}
              animate={{ rotate: [0, 25, -10, 25, 0] }}
              transition={{ duration: 1.2 }}
              className="absolute top-2 right-2 z-20 text-2xl"
            >
              👋
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          {coverEyes ? 'Shh... typing password' : isSpeaking ? 'AI Interviewer Speaking...' : isRecording ? 'Listening to your answer...' : `${companyName || 'AI'} Interviewer Ready`}
        </span>
      </div>
    </div>
  );
}

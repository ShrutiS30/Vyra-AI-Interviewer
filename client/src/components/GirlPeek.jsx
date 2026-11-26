import React from 'react';
import { motion } from 'framer-motion';

export default function GirlPeek({ passwordFocused }) {
  const [waving, setWaving] = React.useState(false);

  React.useEffect(() => {
    if (passwordFocused) { setWaving(false); return; }
    const t = setTimeout(() => setWaving(true), 4500);
    const t2 = setTimeout(() => setWaving(false), 6000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [passwordFocused]);

  return (
    <div className="absolute -bottom-2 -left-4 z-20 pointer-events-none" style={{ transform: 'scale(0.85)', transformOrigin: 'bottom left' }}>
      <motion.div
        animate={{ rotate: passwordFocused ? 0 : (waving ? [0, -6, 6, 0] : -8) }}
        transition={{ duration: 0.6 }}
        style={{ transformOrigin: 'bottom center' }}
      >
        <svg viewBox="0 0 120 200" className="w-28 h-44" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Body / Dress */}
          <path d="M45 110 Q60 100 75 110 L80 180 Q60 190 40 180 Z" fill="#f43f5e" />
          {/* Arms */}
          <path d="M45 115 Q30 130 35 150" stroke="#ffdbac" strokeWidth="6" strokeLinecap="round" />
          <path d="M75 115 Q90 130 85 150" stroke="#ffdbac" strokeWidth="6" strokeLinecap="round" />
          {/* Head */}
          <circle cx="60" cy="70" r="26" fill="#ffdbac" />
          {/* Hair */}
          <path d="M34 70 Q34 40 60 38 Q86 40 86 70 Q86 55 60 50 Q34 55 34 70Z" fill="#3f2314" />
          {/* Cheeks */}
          <circle cx="46" cy="78" r="4" fill="#ff9494" opacity="0.6" />
          <circle cx="74" cy="78" r="4" fill="#ff9494" opacity="0.6" />
          {/* Eyes */}
          {passwordFocused ? (
            <g>
              <path d="M48 64 Q52 58 56 64" stroke="#2d1505" strokeWidth="2" fill="none" />
              <path d="M64 64 Q68 58 72 64" stroke="#2d1505" strokeWidth="2" fill="none" />
              <ellipse cx="50" cy="68" rx="8" ry="5" fill="#ffdbac" stroke="#c2410c" strokeWidth="1" />
              <ellipse cx="70" cy="68" rx="8" ry="5" fill="#ffdbac" stroke="#c2410c" strokeWidth="1" />
            </g>
          ) : (
            <g>
              <ellipse cx="50" cy="66" rx="3.5" ry="4.5" fill="#2d1505" />
              <circle cx="49" cy="64" r="1" fill="white" />
              <ellipse cx="70" cy="66" rx="3.5" ry="4.5" fill="#2d1505" />
              <circle cx="69" cy="64" r="1" fill="white" />
            </g>
          )}
          {/* Mouth */}
          <path d="M54 78 Q60 84 66 78" stroke="#c2410c" strokeWidth="2.5" strokeLinecap="round" />
          {/* Bow */}
          <path d="M60 40 C65 33 75 36 70 43 C65 46 60 40 60 40Z" fill="#f43f5e" />
          <circle cx="61" cy="41" r="3" fill="#fb7185" />
        </svg>
        {waving && !passwordFocused && (
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, 25, -10, 25, 0] }}
            transition={{ duration: 1.2 }}
            className="absolute top-24 right-0 text-2xl"
          >
            👋
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

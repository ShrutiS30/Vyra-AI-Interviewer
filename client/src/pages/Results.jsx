import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CompanyLogo from '../components/CompanyLogo';
import {
  CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp,
  RotateCcw, TrendingUp, TrendingDown, Award, Star
} from 'lucide-react';

export default function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const { result, company, round } = state || {};

  const [openIdx, setOpenIdx] = useState(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!result) navigate('/');
  }, []);

  useEffect(() => {
    if (!result?.score) return;
    let start = 0;
    const target = result.score;
    const step = target / 30;
    const interval = setInterval(() => {
      start += step;
      if (start >= target) {
        setAnimatedScore(target);
        clearInterval(interval);
      } else {
        setAnimatedScore(parseFloat(start.toFixed(1)));
      }
    }, 40);
    return () => clearInterval(interval);
  }, [result?.score]);

  if (!result) return null;

  const score = result.score || 0;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;

  function getScoreColor(s) {
    if (s >= 8) return '#22c55e';
    if (s >= 5) return '#eab308';
    return '#ef4444';
  }

  function getVerdictStyle(v) {
    if (v === 'Strong Hire') return { color: '#16a34a', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)' };
    if (v === 'Hire') return { color: '#2563eb', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)' };
    return { color: '#dc2626', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)' };
  }

  const verdictStyle = getVerdictStyle(result.verdict);
  const scoreColor = getScoreColor(score);

  return (
    <div className="min-h-screen transition-colors duration-300">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
              <CompanyLogo companyId={company?.id} size={24} />
            </div>
            <div className="text-left">
              <h1 className="font-editorial text-2xl font-bold text-zinc-900 dark:text-white capitalize">{company?.name}</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">{round?.label} Evaluation Report</p>
            </div>
          </div>
        </div>

        {/* Score + Verdict */}
        <div className="card flex flex-col sm:flex-row items-center gap-8">
          {/* Score circle */}
          <div className="relative flex-shrink-0">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle
                cx="70" cy="70" r={radius}
                fill="none"
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="10"
              />
              <circle
                cx="70" cy="70" r={radius}
                fill="none"
                stroke={scoreColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (animatedScore / 10) * circumference}
                transform="rotate(-90 70 70)"
                style={{ transition: 'stroke-dashoffset 0.1s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">{animatedScore.toFixed(1)}</span>
              <span className="text-slate-500 text-sm">/10</span>
            </div>
          </div>

          {/* Verdict + summary */}
          <div className="flex-1 text-center sm:text-left">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-base font-bold mb-3"
              style={{ color: verdictStyle.color, background: verdictStyle.bg, border: `1px solid ${verdictStyle.border}` }}
            >
              {result.verdict === 'Strong Hire' && <Award size={18} />}
              {result.verdict === 'Hire' && <CheckCircle size={18} />}
              {result.verdict === 'No Hire' && <XCircle size={18} />}
              {result.verdict}
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
              {result.summary || result.overallFeedback || 'Interview completed.'}
            </p>
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-emerald-500" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Strengths</h3>
            </div>
            <ul className="space-y-2.5">
              {(result.strengths || []).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300 text-sm">
                  <Star size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
              {(!result.strengths || result.strengths.length === 0) && (
                <li className="text-slate-500 text-sm">Not available</li>
              )}
            </ul>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={18} className="text-amber-500" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Areas to Improve</h3>
            </div>
            <ul className="space-y-2.5">
              {(result.areasForImprovement || result.improvements || []).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300 text-sm">
                  <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
              {(!(result.areasForImprovement || result.improvements) || (result.areasForImprovement || result.improvements || []).length === 0) && (
                <li className="text-slate-500 text-sm">Not available</li>
              )}
            </ul>
          </div>
        </div>

        {/* Per-question accordion */}
        <div className="card">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Question-by-Question Breakdown</h3>
          <div className="space-y-3">
            {(result.questionsAndAnswers || result.perQuestion || []).map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    Q{i + 1}
                  </span>
                  <span className="flex-1 text-slate-800 dark:text-slate-200 text-sm font-medium line-clamp-1">
                    {item.question}
                  </span>
                  {item.score !== undefined && (
                    <span className="text-sm font-semibold mr-2" style={{ color: getScoreColor(item.score) }}>
                      {item.score}/10
                    </span>
                  )}
                  {openIdx === i ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>

                {openIdx === i && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-200 dark:border-slate-700/60 pt-3 bg-slate-50/60 dark:bg-slate-900/40">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Your Answer</p>
                      <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{item.answer || '(No answer provided)'}</p>
                    </div>
                    {item.feedback && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Feedback</p>
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{item.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="btn-primary flex items-center gap-2 flex-1 justify-center"
          >
            <RotateCcw size={18} />
            Back to Dashboard / New Interview
          </button>
        </div>
      </div>
    </div>
  );
}

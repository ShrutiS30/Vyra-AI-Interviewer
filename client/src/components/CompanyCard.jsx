import React from 'react';
import { Check } from 'lucide-react';
import CompanyLogo from './CompanyLogo';

export default function CompanyCard({ company, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative p-4 rounded-2xl border text-left transition-all duration-200 group w-full ${
        selected
          ? 'border-zinc-900 dark:border-white bg-zinc-900/[0.04] dark:bg-white/[0.06] shadow-sm'
          : 'bg-white dark:bg-[#131720] border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:-translate-y-0.5'
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center">
          <Check size={12} className="text-white dark:text-zinc-900" />
        </div>
      )}

      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/70 flex items-center justify-center mb-3 text-zinc-900 dark:text-white transition-transform duration-200 group-hover:scale-105">
        <CompanyLogo companyId={company.id} size={22} />
      </div>

      <div className="font-semibold text-zinc-900 dark:text-white text-sm">{company.name}</div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
        {company.tagline}
      </div>
    </button>
  );
}

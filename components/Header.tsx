import React from 'react';
import { Cog6ToothIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { Language } from '../types';
import { t } from '../constants/translations';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenReference: () => void;
  onToggleLanguage: () => void;
  lang: Language;
}

const USFlag = () => (
  <svg viewBox="0 0 60 40" className="w-4 h-3 rounded-[1px] shadow-sm ring-1 ring-slate-200 overflow-hidden shrink-0">
    <rect width="60" height="40" fill="#bd3d44" />
    <path stroke="#fff" strokeWidth="3.5" d="M0 5h60M0 12h60M0 19h60M0 26h60M0 33h60" />
    <rect width="28" height="21" fill="#192f5d" />
    <path fill="#fff" d="M3 3h2v2H3zm5 0h2v2H8zm5 0h2v2h-2zm5 0h2v2h-2zm5 0h2v2h-2zM5 7h2v2H5zm5 0h2v2h-2zm5 0h2v2h-2zm5 0h2v2h-2zM3 11h2v2H3zm5 0h2v2H8zm5 0h2v2h-2zm5 0h2v2h-2zm5 0h2v2h-2zM5 15h2v2H5zm5 0h2v2h-2zm5 0h2v2h-2zm5 0h2v2h-2z" opacity="0.9" />
  </svg>
);

const JPFlag = () => (
  <svg viewBox="0 0 60 40" className="w-4 h-3 rounded-[1px] shadow-sm ring-1 ring-slate-200 overflow-hidden shrink-0">
    <rect width="60" height="40" fill="#fff" />
    <circle cx="30" cy="20" r="12" fill="#bc002d" />
  </svg>
);

const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenReference,
  onToggleLanguage,
  lang
}) => {
  const baseUrl = import.meta.env.BASE_URL ?? '/';

  return (
    <header className="h-12 border-b border-slate-200 flex items-center justify-between px-4 bg-white/90 backdrop-blur-md z-40 sticky top-0 supports-[backdrop-filter]:bg-white/60">

      {/* Logo & Title */}
      <div className="flex items-center gap-2 select-none">
        <div className="w-7 h-7 rounded-md overflow-hidden shadow-sm ring-1 ring-slate-200/70 bg-white">
          <img src={`${baseUrl}icon.svg`} alt="CP Geometry Visualizer" className="w-full h-full object-cover" />
        </div>
        <h1 className="font-bold text-xs tracking-tight text-slate-800 hidden sm:block">{t(lang, 'title')}</h1>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1">

        {/* Language Toggle */}
        <button
          onClick={onToggleLanguage}
          className="flex items-center justify-center gap-1.5 px-0 sm:px-2 py-1 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all border border-transparent w-8 sm:w-[68px]"
          title={lang === 'en' ? "Switch to Japanese" : "Switch to English"}
        >
          {lang === 'en' ? <USFlag /> : <JPFlag />}
          <span className="uppercase hidden sm:inline text-[10px] sm:text-xs">{lang}</span>
        </button>

        {/* Reference */}
        <button
          onClick={onOpenReference}
          className="flex items-center justify-center gap-1.5 px-0 sm:px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all w-8 sm:w-auto sm:min-w-[70px]"
          title={t(lang, 'syntaxRef')}
        >
          <BookOpenIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">{t(lang, 'help')}</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center gap-1.5 px-0 sm:px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all w-8 sm:w-auto sm:min-w-[70px]"
          title={t(lang, 'settings')}
        >
          <Cog6ToothIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">{t(lang, 'settings')}</span>
        </button>

        {/* GitHub */}
        <a
          href="https://github.com/tatesoto/cp-geo-visualizer"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 px-0 sm:px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all w-8 sm:w-auto sm:min-w-[70px]"
          title="GitHub"
          aria-label="GitHub"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          <span className="hidden sm:inline whitespace-nowrap">GitHub</span>
        </a>

      </div>
    </header>
  );
};

export default Header;

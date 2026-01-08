import React, { useState, useRef, useEffect } from 'react';
import { ListBulletIcon, Cog6ToothIcon, BookOpenIcon, ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/outline';
import { Language } from '../types';
import { t } from '../constants/translations';

interface HeaderProps {
  isObjectListOpen: boolean;
  setIsObjectListOpen: (isOpen: boolean) => void;
  onOpenSettings: () => void;
  onOpenReference: () => void;
  onSaveImage: () => void;
  onShareBlob?: () => Promise<{ blob: Blob | null, filename: string } | null>;
  onToggleLanguage: () => void;
  lang: Language;
  activeMobileTab: 'editor' | 'visualizer';
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
  isObjectListOpen,
  setIsObjectListOpen,
  onOpenSettings,
  onOpenReference,
  onSaveImage,
  onShareBlob,
  onToggleLanguage,
  lang,
  activeMobileTab
}) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setIsShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = () => {
    onSaveImage();
    setIsShareOpen(false);
  };

  const handleShareClick = async () => {
    const isMobile = window.innerWidth < 768; // Simple check similar to EditorPanel
    if (isMobile && navigator.share && onShareBlob) {
      try {
        const result = await onShareBlob();
        if (result && result.blob) {
          const file = new File([result.blob], result.filename, { type: result.blob.type });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              // title is often used, text sometimes conflicts with files on some implementations
              title: 'CP Visualization',
              text: t(lang, 'shareText'),
            });
            return;
          }
        }
      } catch (error) {
        // If user cancelled sharing, don't open the dropdown
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Error sharing:', error);
      }
    }

    // Fallback or Desktop: Open dropdown
    setIsShareOpen(!isShareOpen);
  };

  const visualizerOnlyClass = activeMobileTab === 'editor' ? 'hidden md:flex' : 'flex';

  return (
    <header className="h-12 border-b border-slate-200 flex items-center justify-between px-4 bg-white/90 backdrop-blur-md z-40 sticky top-0 supports-[backdrop-filter]:bg-white/60">

      {/* Logo & Title */}
      <div className="flex items-center gap-2 select-none">
        <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="2" />
            <path d="M11.3 7.1L5 20" />
            <path d="M12.7 7.1L19 20" />
            <path d="M5 20a11 11 0 0 0 14 0" />
          </svg>
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

        <div className={`h-4 w-px bg-slate-200 mx-1 ${visualizerOnlyClass}`}></div>

        {/* Object List Toggle */}
        <button
          onClick={() => setIsObjectListOpen(!isObjectListOpen)}
          className={`${visualizerOnlyClass} items-center justify-center gap-1.5 px-0 sm:px-2.5 py-1 rounded-md text-xs font-medium border transition-all w-8 sm:w-auto sm:min-w-[110px] ${isObjectListOpen
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          title={t(lang, 'objectList')}
        >
          <ListBulletIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">{t(lang, 'objectList')}</span>
        </button>

        {/* Share Dropdown */}
        <div className={`relative ml-0.5 ${visualizerOnlyClass}`} ref={shareMenuRef}>
          <button
            onClick={handleShareClick}
            className={`
                    flex items-center justify-center gap-1.5 px-0 sm:px-2.5 py-1 rounded-md text-xs font-semibold border transition-all active:scale-95 w-8 sm:w-auto
                    ${isShareOpen
                ? 'bg-slate-800 text-white border-transparent'
                : 'bg-slate-900 text-white border-transparent hover:bg-slate-800 shadow-sm'}
                `}
            title={t(lang, 'share')}
          >
            <ShareIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t(lang, 'share')}</span>
          </button>

        {isShareOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
              <button
                onClick={handleDownload}
                className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                {t(lang, 'downloadImage')}
              </button>

              {/* Disabled X Share Button */}
              <div className="w-full text-left px-4 py-2 text-xs font-medium text-slate-400 flex items-center gap-2 cursor-not-allowed opacity-75">
                <svg className="w-3.5 h-3.5 grayscale opacity-50" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                <div className="flex flex-col">
                  <span>{t(lang, 'shareOnX')}</span>
                  <span className="text-[9px] text-slate-400 font-normal">Coming soon in future update</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`h-4 w-px bg-slate-200 mx-1 ${visualizerOnlyClass}`}></div>

        {/* GitHub */}
        <a
          href="https://github.com/tatesoto/cp-geo-visualizer"
          target="_blank"
          rel="noreferrer"
          className={`flex items-center justify-center gap-1.5 px-0 sm:px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all w-8 sm:w-auto sm:min-w-[70px] ${visualizerOnlyClass}`}
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

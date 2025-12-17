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
  onToggleLanguage: () => void;
  lang: Language;
}

const USFlag = () => (
  <svg viewBox="0 0 60 40" className="w-5 h-3.5 rounded-[2px] shadow-sm ring-1 ring-slate-200 overflow-hidden shrink-0">
    <rect width="60" height="40" fill="#bd3d44"/>
    <path stroke="#fff" strokeWidth="3.5" d="M0 5h60M0 12h60M0 19h60M0 26h60M0 33h60"/>
    <rect width="28" height="21" fill="#192f5d"/>
    <path fill="#fff" d="M3 3h2v2H3zm5 0h2v2H8zm5 0h2v2h-2zm5 0h2v2h-2zm5 0h2v2h-2zM5 7h2v2H5zm5 0h2v2h-2zm5 0h2v2h-2zm5 0h2v2h-2zM3 11h2v2H3zm5 0h2v2H8zm5 0h2v2h-2zm5 0h2v2h-2zm5 0h2v2h-2zM5 15h2v2H5zm5 0h2v2h-2zm5 0h2v2h-2zm5 0h2v2h-2z" opacity="0.9"/>
  </svg>
);

const JPFlag = () => (
  <svg viewBox="0 0 60 40" className="w-5 h-3.5 rounded-[2px] shadow-sm ring-1 ring-slate-200 overflow-hidden shrink-0">
    <rect width="60" height="40" fill="#fff"/>
    <circle cx="30" cy="20" r="12" fill="#bc002d"/>
  </svg>
);

const Header: React.FC<HeaderProps> = ({ 
    isObjectListOpen, 
    setIsObjectListOpen, 
    onOpenSettings, 
    onOpenReference,
    onSaveImage,
    onToggleLanguage,
    lang 
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

  return (
    <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white/90 backdrop-blur-md z-40 sticky top-0 supports-[backdrop-filter]:bg-white/60">
      
      {/* Logo & Title */}
      <div className="flex items-center gap-3 select-none">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="5" r="2" />
                  <path d="M11.3 7.1L5 20" />
                  <path d="M12.7 7.1L19 20" />
                  <path d="M5 20a11 11 0 0 0 14 0" />
              </svg>
          </div>
          <h1 className="font-bold text-sm tracking-tight text-slate-800 hidden sm:block">{t(lang, 'title')}</h1>
      </div>
      
      {/* Right Actions */}
      <div className="flex items-center gap-1.5 md:gap-2">

          {/* Language Toggle - Fixed width */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all border border-transparent w-[72px]"
            title={lang === 'en' ? "Switch to Japanese" : "Switch to English"}
          >
            {lang === 'en' ? <USFlag /> : <JPFlag />}
            <span className="uppercase">{lang}</span>
          </button>

          {/* Reference - Fixed min-width for stability */}
          <button
            onClick={onOpenReference}
            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all min-w-[84px]"
            title={t(lang, 'syntaxRef')}
          >
            <BookOpenIcon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">{t(lang, 'help')}</span>
          </button>
          
          {/* Settings - Fixed min-width for stability */}
          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all min-w-[40px] sm:min-w-[84px]"
            title={t(lang, 'settings')}
          >
            <Cog6ToothIcon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">{t(lang, 'settings')}</span>
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          
          {/* Object List Toggle - Fixed min-width for stability */}
          <button
             onClick={() => setIsObjectListOpen(!isObjectListOpen)}
             className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all min-w-[40px] sm:min-w-[136px] ${
                 isObjectListOpen 
                 ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' 
                 : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
             }`}
          >
             <ListBulletIcon className="w-4 h-4 shrink-0" />
             <span className="hidden sm:inline whitespace-nowrap">{t(lang, 'objectList')}</span>
          </button>

          {/* Share Dropdown */}
          <div className="relative ml-1" ref={shareMenuRef}>
            <button
                onClick={() => setIsShareOpen(!isShareOpen)}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95
                    ${isShareOpen 
                        ? 'bg-slate-800 text-white border-transparent' 
                        : 'bg-slate-900 text-white border-transparent hover:bg-slate-800 shadow-sm'}
                `}
                title={t(lang, 'share')}
            >
                <ShareIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t(lang, 'share')}</span>
            </button>
            
            {isShareOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    <button 
                        onClick={handleDownload}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        {t(lang, 'downloadImage')}
                    </button>
                    
                    {/* Disabled X Share Button */}
                    <div className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-400 flex items-center gap-2 cursor-not-allowed opacity-75">
                         <svg className="w-3.5 h-3.5 grayscale opacity-50" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                         <div className="flex flex-col">
                             <span>{t(lang, 'shareOnX')}</span>
                             <span className="text-[9px] text-slate-400 font-normal">Coming soon in future update</span>
                         </div>
                    </div>
                </div>
            )}
          </div>

      </div>
    </header>
  );
};

export default Header;
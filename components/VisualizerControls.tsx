import React, { useState, useEffect, useRef } from 'react';
import { ArrowsPointingOutIcon, ListBulletIcon, ShareIcon, ArrowDownTrayIcon, AdjustmentsHorizontalIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { ShapeType, Language } from '../types';
import { t } from '../constants/translations';

interface VisualizerControlsProps {
    visibleIdTypes: ShapeType[];
    onToggleIdType: (type: ShapeType) => void;
    onResetView: () => void;
    availableGroups: string[];
    activeGroupId: string | null;
    onSelectGroup: (groupId: string | null) => void;
    isObjectListOpen: boolean;
    onToggleObjectList: () => void;
    onSaveImage: () => void;
    onShareBlob?: () => Promise<{ blob: Blob | null, filename: string } | null>;
    isVisible: boolean;
    onToggleVisible: () => void;
    lang: Language;
}

const VisualizerControls: React.FC<VisualizerControlsProps> = ({
    visibleIdTypes,
    onToggleIdType,
    onResetView,
    availableGroups,
    activeGroupId,
    onSelectGroup,
    isObjectListOpen,
    onToggleObjectList,
    onSaveImage,
    onShareBlob,
    isVisible,
    onToggleVisible,
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

    useEffect(() => {
        if (!isVisible) {
            setIsShareOpen(false);
        }
    }, [isVisible]);

    const handleDownload = () => {
        onSaveImage();
        setIsShareOpen(false);
    };

    const handleShareClick = async () => {
        const isMobile = window.innerWidth < 768;
        if (isMobile && navigator.share && onShareBlob) {
            try {
                const result = await onShareBlob();
                if (result && result.blob) {
                    const file = new File([result.blob], result.filename, { type: result.blob.type });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: 'CP Visualization',
                            text: t(lang, 'shareText'),
                        });
                        return;
                    }
                }
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') return;
                console.error('Error sharing:', error);
            }
        }

        setIsShareOpen(!isShareOpen);
    };

    const ID_TOGGLE_OPTIONS = [
        {
            type: ShapeType.POINT,
            icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6" /></svg>,
            label: t(lang, 'points')
        },
        {
            type: ShapeType.SEGMENT,
            icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="4" y1="20" x2="20" y2="4" /></svg>,
            label: t(lang, 'segments')
        },
        {
            type: ShapeType.LINE,
            icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="2" y1="22" x2="22" y2="2" /></svg>,
            label: t(lang, 'lines')
        },
        {
            type: ShapeType.CIRCLE,
            icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="7" /></svg>,
            label: t(lang, 'circles')
        },
        {
            type: ShapeType.POLYGON,
            icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 4L4 20L20 20L12 4Z" /></svg>,
            label: t(lang, 'polygons')
        }
    ];

    if (!isVisible) {
        return (
            <div className="absolute top-6 right-6 flex flex-col gap-3 pointer-events-none z-10">
                <button
                    onClick={onToggleVisible}
                    className="pointer-events-auto flex items-center gap-2 rounded-xl border border-gray-200/70 bg-white/90 backdrop-blur px-3 py-2 text-xs font-medium text-gray-600 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] hover:bg-gray-50 hover:text-gray-900 transition-all"
                    title={t(lang, 'showControls')}
                >
                    <AdjustmentsHorizontalIcon className="w-4 h-4" />
                    <span className="hidden sm:inline whitespace-nowrap">{t(lang, 'controls')}</span>
                </button>
            </div>
        );
    }

    return (
        <div className="absolute top-6 right-6 flex flex-col gap-3 pointer-events-none z-10">
            {/* Floating Island Container */}
            <div className="pointer-events-auto flex items-center bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-200/60 p-1 gap-1 backdrop-blur-sm">

                {/* Group Selector */}
                {availableGroups.length > 0 && (
                    <>
                        <div className="flex items-center pl-3 pr-1 py-1 gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide select-none">{t(lang, 'group_label')}</span>
                            <div className="relative">
                                <select
                                    value={activeGroupId || ''}
                                    onChange={(e) => onSelectGroup(e.target.value || null)}
                                    className="bg-transparent text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg pl-2 pr-6 py-1 border border-transparent hover:border-gray-200 outline-none appearance-none cursor-pointer h-7 min-w-[60px] transition-colors"
                                >
                                    <option value="">{t(lang, 'group_all')}</option>
                                    {availableGroups.length > 0 && <option disabled>──────────</option>}
                                    {availableGroups.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
                                    <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="w-px h-5 bg-gray-100 mx-0.5"></div>
                    </>
                )}

                {/* ID Toggles Group */}
                <div className="flex items-center gap-0.5 border-r border-gray-100 pr-1 mr-1">
                    {ID_TOGGLE_OPTIONS.map((opt) => {
                        const isActive = visibleIdTypes.includes(opt.type);
                        return (
                            <button
                                key={opt.type}
                                onClick={() => onToggleIdType(opt.type)}
                                className={`
                                w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200
                                ${isActive
                                        ? 'bg-black text-white shadow-sm'
                                        : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}
                            `}
                                title={`Toggle ${opt.label} IDs`}
                            >
                                {opt.icon}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={onResetView}
                    className="flex items-center justify-center gap-1.5 px-2 h-8 rounded-lg text-gray-500 hover:text-black hover:bg-gray-50 transition-all w-auto"
                    title={t(lang, 'fitToScreen')}
                >
                    <ArrowsPointingOutIcon className="w-4 h-4" />
                    <span className="text-xs font-semibold whitespace-nowrap">{t(lang, 'fitToScreen')}</span>
                </button>

                <div className="w-px h-5 bg-gray-100 mx-0.5"></div>

                {/* Object List Toggle */}
                <button
                    onClick={onToggleObjectList}
                    className={`flex items-center justify-center gap-1.5 px-2 h-8 rounded-lg text-xs font-medium border transition-all w-8 sm:w-auto sm:min-w-[110px] ${isObjectListOpen
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    title={t(lang, 'objectList')}
                >
                    <ListBulletIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">{t(lang, 'objectList')}</span>
                </button>

                {/* Share Dropdown */}
                <div className="relative ml-0.5" ref={shareMenuRef}>
                    <button
                        onClick={handleShareClick}
                        className={`
                            flex items-center justify-center gap-1.5 px-2 h-8 rounded-lg text-xs font-semibold border transition-all active:scale-95 w-8 sm:w-auto
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

                <div className="w-px h-5 bg-gray-100 mx-0.5"></div>

                <button
                    onClick={onToggleVisible}
                    className="flex items-center justify-center gap-1.5 px-2 h-8 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all w-8 sm:w-auto"
                    title={t(lang, 'hideControls')}
                >
                    <EyeSlashIcon className="w-4 h-4" />
                    <span className="hidden sm:inline whitespace-nowrap">{t(lang, 'hideControls')}</span>
                </button>
            </div>
        </div>
    );
};

export default VisualizerControls;

import React, { useState, useEffect } from 'react';
import { ArrowsPointingOutIcon, ListBulletIcon, ShareIcon, ArrowDownTrayIcon, AdjustmentsHorizontalIcon, EyeSlashIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { ShapeType, Language, IdIndexBase } from '../types';
import { t } from '../constants/translations';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';

interface VisualizerControlsProps {
    visibleIdTypes: ShapeType[];
    onToggleIdType: (type: ShapeType) => void;
    idIndexBase: IdIndexBase;
    onChangeIdIndexBase: (base: IdIndexBase) => void;
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
    idIndexBase,
    onChangeIdIndexBase,
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
    const ALL_GROUP_VALUE = '__all__';
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isIdOpen, setIsIdOpen] = useState(false);

    useEffect(() => {
        if (!isVisible) {
            setIsShareOpen(false);
            setIsIdOpen(false);
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
                        return true;
                    }
                }
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') return true;
                console.error('Error sharing:', error);
            }
        }
        return false;
    };

    const handleShareTriggerPointerDown = async (event: React.PointerEvent<HTMLButtonElement>) => {
        const isMobile = window.innerWidth < 768;
        if (!isMobile || !navigator.share || !onShareBlob) return;
        event.preventDefault();
        const handled = await handleShareClick();
        if (!handled) {
            setIsShareOpen(true);
        }
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
            <div className="pointer-events-auto flex flex-col bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-200/60 p-1 gap-1 backdrop-blur-sm">

                {/* Primary Row */}
                <div className="flex w-full md:w-auto items-center gap-1 flex-wrap md:flex-nowrap">
                    <button
                        onClick={onResetView}
                        className="flex items-center justify-center gap-1.5 px-2 h-8 rounded-lg text-gray-500 hover:text-black hover:bg-gray-50 transition-all w-auto"
                        title={t(lang, 'fitToScreen')}
                    >
                        <ArrowsPointingOutIcon className="w-4 h-4" />
                        <span className="text-xs font-semibold whitespace-nowrap">{t(lang, 'fitToScreen')}</span>
                    </button>

                    {/* Group Selector */}
                    {availableGroups.length > 0 && (
                        <>
                            <div className="flex items-center pl-3 pr-1 py-1 gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide select-none">{t(lang, 'group_label')}</span>
                                <Select
                                    value={activeGroupId ?? ALL_GROUP_VALUE}
                                    onValueChange={(value) => onSelectGroup(value === ALL_GROUP_VALUE ? null : value)}
                                >
                                    <SelectTrigger className="h-7 w-[80px] sm:w-[96px] text-gray-700 font-medium">
                                        <SelectValue className="data-[placeholder]:text-gray-400" placeholder={t(lang, 'group_all')} />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                        <SelectItem value={ALL_GROUP_VALUE}>{t(lang, 'group_all')}</SelectItem>
                                        {availableGroups.length > 0 && <SelectSeparator />}
                                        {availableGroups.map((g) => (
                                            <SelectItem key={g} value={g}>
                                                {g}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    {/* IDs Toggle */}
                    <DropdownMenu open={isIdOpen} onOpenChange={setIsIdOpen}>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="flex items-center justify-center gap-1.5 px-2 h-8 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all w-auto shrink-0"
                                title={t(lang, 'toggleIds')}
                            >
                                <span className="whitespace-nowrap">{t(lang, 'ids')}</span>
                                <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${isIdOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="start"
                        className="min-w-[180px] max-w-[calc(100vw-32px)] p-2"
                    >
                        <div className="flex flex-wrap gap-0.5">
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
                            <DropdownMenuSeparator />
                            <div className="space-y-1">
                                <div className="px-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                    {t(lang, 'idIndexing')}
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => onChangeIdIndexBase(0)}
                                        className={`
                                            flex-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors
                                            ${idIndexBase === 0
                                                ? 'bg-black text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                                        `}
                                        title={t(lang, 'idIndexingZero')}
                                    >
                                        0-indexed
                                    </button>
                                    <button
                                        onClick={() => onChangeIdIndexBase(1)}
                                        className={`
                                            flex-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors
                                            ${idIndexBase === 1
                                                ? 'bg-black text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                                        `}
                                        title={t(lang, 'idIndexingOne')}
                                    >
                                        1-indexed
                                    </button>
                                </div>
                                {/* <div className="px-1 text-[10px] text-gray-400">
                                    {t(lang, 'idIndexingDesc')}
                                </div> */}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

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
                    <DropdownMenu open={isShareOpen} onOpenChange={setIsShareOpen}>
                        <DropdownMenuTrigger asChild>
                            <button
                                onPointerDown={handleShareTriggerPointerDown}
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
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onSelect={handleDownload} className="gap-2">
                                <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                                {t(lang, 'downloadImage')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled className="items-start gap-2 text-slate-400 opacity-75">
                                <svg className="h-3.5 w-3.5 grayscale opacity-50" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                                <div className="flex flex-col">
                                    <span>{t(lang, 'shareOnX')}</span>
                                    <span className="text-[9px] text-slate-400 font-normal">Coming soon in future update</span>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

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
        </div>
    );
};

export default VisualizerControls;

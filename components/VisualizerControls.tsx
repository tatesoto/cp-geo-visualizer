import React from 'react';
import { ArrowsPointingInIcon } from '@heroicons/react/24/outline';
import { ShapeType, Language } from '../types';
import { t } from '../constants/translations';

interface VisualizerControlsProps {
  visibleIdTypes: ShapeType[];
  onToggleIdType: (type: ShapeType) => void;
  onResetView: () => void;
  availableGroups: string[];
  activeGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  lang: Language;
}

const VisualizerControls: React.FC<VisualizerControlsProps> = ({ 
  visibleIdTypes, 
  onToggleIdType, 
  onResetView,
  availableGroups,
  activeGroupId,
  onSelectGroup,
  lang
}) => {
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
                                <hr />
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
               className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-black hover:bg-gray-50 transition-all"
               title={t(lang, 'fitToScreen')}
              >
               <ArrowsPointingInIcon className="w-4 h-4" />
             </button>
         </div>
    </div>
  );
};

export default VisualizerControls;
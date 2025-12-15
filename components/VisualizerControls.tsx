import React from 'react';
import { ArrowsPointingInIcon, TagIcon } from '@heroicons/react/24/outline';
import { ShapeType } from '../types';

interface VisualizerControlsProps {
  visibleIdTypes: ShapeType[];
  onToggleIdType: (type: ShapeType) => void;
  onResetView: () => void;
}

const ID_TOGGLE_OPTIONS = [
    { 
        type: ShapeType.POINT, 
        icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5" /></svg>,
        title: "Points"
    },
    { 
        type: ShapeType.SEGMENT, 
        icon: <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="4" y1="20" x2="20" y2="4" /></svg>,
        title: "Segments"
    },
    { 
        type: ShapeType.LINE, 
        icon: <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="2" y1="22" x2="22" y2="2" /><path d="M19 2L22 2L22 5" fill="none"/><path d="M5 22L2 22L2 19" fill="none"/></svg>,
        title: "Lines"
    },
    { 
        type: ShapeType.CIRCLE, 
        icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="7" /></svg>,
        title: "Circles"
    },
    { 
        type: ShapeType.POLYGON, 
        icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4L4 20L20 20L12 4Z" /></svg>,
        title: "Polygons"
    }
];

const VisualizerControls: React.FC<VisualizerControlsProps> = ({ 
  visibleIdTypes, 
  onToggleIdType, 
  onResetView 
}) => {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none">
         <div className="flex flex-col gap-2 pointer-events-auto">
             
             {/* ID Toggle Button with Hover Menu */}
             <div className="group relative flex items-center justify-end">
                 {/* Flyout Menu */}
                 <div className="absolute right-full mr-2 hidden group-hover:flex bg-slate-800/90 backdrop-blur border border-slate-700 rounded p-1 gap-1 shadow-xl transition-all">
                     {ID_TOGGLE_OPTIONS.map((opt) => (
                         <button 
                            key={opt.type}
                            onClick={() => onToggleIdType(opt.type)}
                            className={`p-1.5 rounded border transition-colors ${visibleIdTypes.includes(opt.type) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'}`}
                            title={`Toggle ${opt.title} IDs`}
                         >
                             {opt.icon}
                         </button>
                     ))}
                 </div>

                 <button 
                   className={`p-2 rounded border shadow-lg transition flex items-center justify-center ${visibleIdTypes.length > 0 ? 'bg-yellow-600/80 border-yellow-500 text-white' : 'bg-slate-800/80 backdrop-blur border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                   title="Toggle IDs (Hover for options)"
                 >
                   <TagIcon className="w-5 h-5" />
                 </button>
             </div>

             <button 
               onClick={onResetView}
               className="bg-slate-800/80 backdrop-blur p-2 rounded text-slate-400 hover:text-white border border-slate-700 shadow-lg hover:bg-slate-700 transition flex items-center justify-center"
               title="Fit to Screen"
              >
               <ArrowsPointingInIcon className="w-5 h-5" />
             </button>
         </div>
    </div>
  );
};

export default VisualizerControls;
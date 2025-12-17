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
        icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6" /></svg>,
        label: "Points"
    },
    { 
        type: ShapeType.SEGMENT, 
        icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="4" y1="20" x2="20" y2="4" /></svg>,
        label: "Segments"
    },
    { 
        type: ShapeType.LINE, 
        icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="2" y1="22" x2="22" y2="2" /></svg>,
        label: "Lines"
    },
    { 
        type: ShapeType.CIRCLE, 
        icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="7" /></svg>,
        label: "Circles"
    },
    { 
        type: ShapeType.POLYGON, 
        icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 4L4 20L20 20L12 4Z" /></svg>,
        label: "Poly"
    }
];

const VisualizerControls: React.FC<VisualizerControlsProps> = ({ 
  visibleIdTypes, 
  onToggleIdType, 
  onResetView 
}) => {
  return (
    <div className="absolute top-6 right-6 flex flex-col gap-3 pointer-events-none z-10">
         {/* Floating Island Container */}
         <div className="pointer-events-auto flex items-center bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-200/60 p-1 gap-1 backdrop-blur-sm">
             
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

             {/* Actions Group */}
             <button 
               onClick={onResetView}
               className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-black hover:bg-gray-50 transition-all"
               title="Fit to Screen"
              >
               <ArrowsPointingInIcon className="w-4 h-4" />
             </button>
         </div>
    </div>
  );
};

export default VisualizerControls;
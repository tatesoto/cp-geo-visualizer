import React, { useMemo, useState } from 'react';
import { Shape, ShapeType } from '../types';
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface ObjectListProps {
  shapes: Shape[];
  highlightedShapeId: string | null;
  onSelectShape: (id: string | null) => void;
  onClose: () => void;
}

const ObjectList: React.FC<ObjectListProps> = ({ shapes, highlightedShapeId, onSelectShape, onClose }) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    [ShapeType.POINT]: true,
    [ShapeType.SEGMENT]: true,
    [ShapeType.LINE]: true,
    [ShapeType.CIRCLE]: true,
    [ShapeType.POLYGON]: true,
    [ShapeType.TEXT]: true,
  });

  const groupedShapes = useMemo(() => {
    const groups: Partial<Record<ShapeType, Shape[]>> = {};
    shapes.forEach(shape => {
      if (!groups[shape.type]) groups[shape.type] = [];
      groups[shape.type]!.push(shape);
    });
    return groups;
  }, [shapes]);

  const toggleSection = (type: string) => {
    setOpenSections(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const getIcon = (type: ShapeType) => {
    switch (type) {
      case ShapeType.POINT: return <span className="text-[10px] border border-current rounded-full w-4 h-4 flex items-center justify-center">P</span>;
      case ShapeType.LINE: return <span className="text-[10px] w-4 flex justify-center">/</span>;
      case ShapeType.SEGMENT: return <span className="text-[10px] w-4 flex justify-center">—</span>;
      case ShapeType.CIRCLE: return <span className="text-[10px] border border-current rounded-full w-4 h-4 flex items-center justify-center">O</span>;
      case ShapeType.POLYGON: return <span className="text-[10px] border border-current w-4 h-4 flex items-center justify-center">⬠</span>;
      case ShapeType.TEXT: return <span className="text-[10px] font-serif w-4 flex justify-center">T</span>;
      default: return <span>?</span>;
    }
  };

  const getInfo = (shape: Shape) => {
    switch (shape.type) {
      case ShapeType.POINT: return `${shape.x}, ${shape.y}`;
      case ShapeType.LINE: 
      case ShapeType.SEGMENT: return `(${shape.p1.x},${shape.p1.y}) -> (${shape.p2.x},${shape.p2.y})`;
      case ShapeType.CIRCLE: return `(${shape.x},${shape.y}) r=${shape.r}`;
      case ShapeType.POLYGON: return `${shape.points.length} vertices`;
      case ShapeType.TEXT: return `"${shape.content}"`;
      default: return '';
    }
  };

  const getTypeLabel = (type: ShapeType) => {
    switch (type) {
        case ShapeType.POINT: return 'Points';
        case ShapeType.LINE: return 'Lines';
        case ShapeType.SEGMENT: return 'Segments';
        case ShapeType.CIRCLE: return 'Circles';
        case ShapeType.POLYGON: return 'Polygons';
        case ShapeType.TEXT: return 'Text';
        default: return 'Other';
    }
  };

  // Define sort order
  const typeOrder = [
      ShapeType.POINT,
      ShapeType.SEGMENT,
      ShapeType.LINE,
      ShapeType.POLYGON,
      ShapeType.CIRCLE,
      ShapeType.TEXT
  ];

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl z-20">
      <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Objects ({shapes.length})</span>
        <button 
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 text-lg leading-none"
        >
          &times;
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {shapes.length === 0 ? (
          <div className="text-slate-600 text-xs text-center mt-10 italic">
            No objects parsed.
          </div>
        ) : (
          typeOrder.map((type) => {
            const groupShapes = groupedShapes[type];
            if (!groupShapes || groupShapes.length === 0) return null;

            const isOpen = openSections[type];

            return (
                <div key={type} className="mb-2">
                    <div 
                        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-slate-800 rounded select-none text-slate-400 hover:text-slate-200 transition-colors"
                        onClick={() => toggleSection(type)}
                    >
                         {isOpen ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                         <span className="text-xs font-bold uppercase tracking-wide">{getTypeLabel(type)}</span>
                         <span className="ml-auto text-[10px] bg-slate-800 px-1.5 rounded-full text-slate-500">{groupShapes.length}</span>
                    </div>

                    {isOpen && (
                        <div className="pl-2 mt-1 space-y-1">
                            {groupShapes.map((shape) => (
                                <div
                                    key={shape.id}
                                    onClick={() => onSelectShape(shape.id)}
                                    className={`
                                        flex items-center gap-3 p-2 rounded cursor-pointer transition-colors border
                                        ${highlightedShapeId === shape.id 
                                        ? 'bg-blue-900/30 border-blue-700/50' 
                                        : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'}
                                    `}
                                >
                                    <div 
                                        className="w-2 h-2 rounded-full shrink-0" 
                                        style={{ backgroundColor: shape.color || '#fff' }} 
                                    />
                                    <div className="text-slate-400 shrink-0">
                                        {getIcon(shape.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-mono text-slate-300 truncate">
                                                ID:{shape.id}
                                            </span>
                                            {shape.label && <span className="text-[10px] text-yellow-500/80 bg-yellow-900/20 px-1 rounded truncate max-w-[80px]">{shape.label}</span>}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-mono truncate">
                                            {getInfo(shape)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ObjectList;
import React, { useMemo, useState, useRef } from 'react';
import { Shape, ShapeType, Language } from '../types';
import { ChevronRightIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { t } from '../constants/translations';

interface ObjectListProps {
  shapes: Shape[];
  highlightedShapeId: string | null;
  onSelectShape: (id: string | null) => void;
  onClose: () => void;
  lang: Language;
}

const VirtualSection = ({ 
    shapes, 
    highlightedShapeId, 
    onSelectShape, 
    getInfo 
}: {
    shapes: Shape[],
    highlightedShapeId: string | null,
    onSelectShape: (id: string | null) => void,
    getInfo: (shape: Shape) => string
}) => {
    const [scrollTop, setScrollTop] = useState(0);
    const itemHeight = 36; // More compact
    const containerHeight = 300; 
    
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    const totalHeight = shapes.length * itemHeight;
    const startIndex = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 1;
    const visibleShapes = shapes.slice(startIndex, startIndex + visibleCount);
    const offsetY = startIndex * itemHeight;

    return (
        <div 
            onScroll={handleScroll}
            className="overflow-y-auto bg-white"
            style={{ maxHeight: containerHeight }}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleShapes.map((shape) => (
                         <div
                            key={shape.id}
                            onClick={() => onSelectShape(shape.id)}
                            style={{ height: itemHeight }}
                            className={`
                                flex items-center gap-3 px-4 cursor-pointer transition-colors border-l-[3px]
                                ${highlightedShapeId === shape.id 
                                ? 'bg-blue-50 border-blue-500' 
                                : 'border-transparent hover:bg-gray-50'}
                            `}
                        >
                            <div 
                                className="w-1.5 h-1.5 rounded-full shrink-0" 
                                style={{ backgroundColor: shape.color || '#000' }} 
                            />
                            <div className="flex-1 min-w-0 flex items-center justify-between">
                                <span className={`text-[11px] font-mono truncate ${highlightedShapeId === shape.id ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                                    {shape.id}
                                </span>
                                <div className="flex items-center gap-2">
                                     {shape.label && <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 rounded-sm">{shape.label}</span>}
                                     <span className="text-[10px] text-gray-400 font-mono truncate max-w-[100px] text-right">
                                        {getInfo(shape)}
                                     </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ObjectList: React.FC<ObjectListProps> = ({ shapes, highlightedShapeId, onSelectShape, onClose, lang }) => {
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

  const getInfo = (shape: Shape) => {
    switch (shape.type) {
      case ShapeType.POINT: return `${shape.x}, ${shape.y}`;
      case ShapeType.LINE: 
      case ShapeType.SEGMENT: return `(${shape.p1.x},${shape.p1.y}) → (${shape.p2.x},${shape.p2.y})`;
      case ShapeType.CIRCLE: return `O(${shape.x},${shape.y}) r=${shape.r}`;
      case ShapeType.POLYGON: return `${shape.points.length} pts`;
      case ShapeType.TEXT: return `"${shape.content}"`;
      default: return '';
    }
  };

  const getTypeLabel = (type: ShapeType) => {
    switch (type) {
        case ShapeType.POINT: return t(lang, 'points');
        case ShapeType.LINE: return t(lang, 'lines');
        case ShapeType.SEGMENT: return t(lang, 'segments');
        case ShapeType.CIRCLE: return t(lang, 'circles');
        case ShapeType.POLYGON: return t(lang, 'polygons');
        case ShapeType.TEXT: return t(lang, 'annotations');
        default: return t(lang, 'other');
    }
  };

  const typeOrder = [
      ShapeType.POINT,
      ShapeType.SEGMENT,
      ShapeType.LINE,
      ShapeType.POLYGON,
      ShapeType.CIRCLE,
      ShapeType.TEXT
  ];

  return (
    <div className="w-[320px] bg-white border-l border-gray-200 flex flex-col h-full shadow-2xl z-30">
      <div className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
        <span className="text-xs font-semibold text-gray-900 tracking-tight">{t(lang, 'inspector')}</span>
        <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{shapes.length} items</span>
            <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors"
            >
            <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-2 space-y-2">
        {shapes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
             <span className="text-sm">{t(lang, 'noObjects')}</span>
          </div>
        ) : (
          typeOrder.map((type) => {
            const groupShapes = groupedShapes[type];
            if (!groupShapes || groupShapes.length === 0) return null;

            const isOpen = openSections[type];

            return (
                <div key={type} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    <div 
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleSection(type)}
                    >
                         {isOpen ? <ChevronDownIcon className="w-3 h-3 text-gray-400" /> : <ChevronRightIcon className="w-3 h-3 text-gray-400" />}
                         <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">{getTypeLabel(type)}</span>
                         <span className="ml-auto text-[10px] text-gray-400">{groupShapes.length}</span>
                    </div>

                    {isOpen && (
                        <div className="border-t border-gray-100">
                             <VirtualSection 
                                shapes={groupShapes}
                                highlightedShapeId={highlightedShapeId}
                                onSelectShape={onSelectShape}
                                getInfo={getInfo}
                            />
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
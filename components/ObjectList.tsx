import React from 'react';
import { Shape, ShapeType } from '../types';

interface ObjectListProps {
  shapes: Shape[];
  highlightedShapeId: string | null;
  onHoverShape: (id: string | null) => void;
  onClose: () => void;
}

const ObjectList: React.FC<ObjectListProps> = ({ shapes, highlightedShapeId, onHoverShape, onClose }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Scroll to highlighted item if it wasn't triggered by mouse enter on the list itself
  // (Optional refinement, skipping for now to keep simple interaction)

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
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1"
      >
        {shapes.length === 0 ? (
          <div className="text-slate-600 text-xs text-center mt-10 italic">
            No objects parsed.
          </div>
        ) : (
          shapes.map((shape, index) => (
            <div
              key={index}
              onMouseEnter={() => onHoverShape(shape.id)}
              onMouseLeave={() => onHoverShape(null)}
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
          ))
        )}
      </div>
    </div>
  );
};

export default ObjectList;
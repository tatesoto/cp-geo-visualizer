import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Shape, ShapeType, Language, IdIndexBase } from '../types';
import { ChevronRightIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { t } from '../constants/translations';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { formatShapeId } from '../utils/formatId';

interface ObjectListProps {
  shapes: Shape[];
  highlightedShapeId: string | null;
  onSelectShape: (id: string | null) => void;
  onClose: () => void;
  activeGroupId: string | null;
  availableGroups: string[];
  onSelectGroup: (groupId: string | null) => void;
  idIndexBase: IdIndexBase;
  lang: Language;
}

const VirtualSection = ({
  shapes,
  highlightedShapeId,
  onSelectShape,
  getInfo,
  formatId
}: {
  shapes: Shape[],
  highlightedShapeId: string | null,
  onSelectShape: (id: string | null) => void,
  getInfo: (shape: Shape) => string,
  formatId: (id: string) => string
}) => {
  return (
    <div className="bg-white">
      {shapes.map((shape) => (
        <div
          key={shape.id}
          onClick={() => onSelectShape(shape.id)}
          className={`
            flex h-9 items-center gap-3 px-4 cursor-pointer transition-colors border-l-[3px]
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
              {formatId(shape.id)}
            </span>
            <div className="flex items-center gap-2">
              {shape.groupId && (
                <span className="text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 rounded-sm font-mono whitespace-nowrap">
                  G:{shape.groupId}
                </span>
              )}
              {shape.label && <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 rounded-sm">{shape.label}</span>}
                  <span className="text-[10px] text-gray-400 font-geo-mono truncate max-w-[100px] text-right">
                    {getInfo(shape)}
                  </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ObjectList: React.FC<ObjectListProps> = ({
  shapes,
  highlightedShapeId,
  onSelectShape,
  onClose,
  activeGroupId,
  availableGroups,
  onSelectGroup,
  idIndexBase,
  lang
}) => {
  const ALL_GROUP_VALUE = '__all__';
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    [ShapeType.POINT]: true,
    [ShapeType.SEGMENT]: true,
    [ShapeType.LINE]: true,
    [ShapeType.CIRCLE]: true,
    [ShapeType.POLYGON]: true,
    [ShapeType.TEXT]: true,
  });

  // Filter shapes based on activeGroupId
  const filteredShapes = useMemo(() => {
    if (!activeGroupId) return shapes;
    return shapes.filter(s => s.groupId === activeGroupId);
  }, [shapes, activeGroupId]);

  const groupedShapes = useMemo(() => {
    const groups: Partial<Record<ShapeType, Shape[]>> = {};
    filteredShapes.forEach(shape => {
      if (!groups[shape.type]) groups[shape.type] = [];
      groups[shape.type]!.push(shape);
    });
    return groups;
  }, [filteredShapes]);

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

  const formatId = (id: string) => formatShapeId(id, idIndexBase);

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

  // Resizable Logic
  const [listHeight, setListHeight] = useState(window.innerHeight * 0.4);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768 && listHeight === 0) {
        setListHeight(window.innerHeight * 0.4);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [listHeight]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    startYRef.current = e.touches[0].clientY;
    startHeightRef.current = listHeight;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return;
    const currentY = e.touches[0].clientY;
    const deltaY = startYRef.current - currentY; // Drag up increases height
    const newHeight = Math.min(Math.max(startHeightRef.current + deltaY, 150), window.innerHeight * 0.8);
    setListHeight(newHeight);
  };

  return (
    <>


      {/* List Container - Resizable on Mobile, Sidebar on Desktop */}
      <div
        style={{ height: isMobile ? listHeight : undefined }}
        className={`
            w-full border-t border-gray-200 shrink-0 relative z-10
            bg-white flex min-h-0 flex-col overflow-hidden shadow-[0_-1px_3px_rgba(0,0,0,0.05)]
            md:w-[320px] md:h-full md:border-t-0 md:border-l md:border-gray-200 md:shadow-2xl md:z-30
        `}
      >
        {/* Header with Drag Area */}
        <div
          className="bg-white border-b border-gray-100 shrink-0 flex flex-col touch-none relative z-20"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {/* Mobile Drag Handle Indicator */}
          <div className="w-full flex justify-center pt-2 pb-1 md:hidden cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1 bg-gray-200 rounded-full"></div>
          </div>

          <div className="h-10 md:h-12 flex items-center justify-between px-4 gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-xs font-semibold text-gray-900 tracking-tight whitespace-nowrap">{t(lang, 'inspector')}</span>

              {availableGroups.length > 0 && (
                <>
                  <div className="h-4 w-px bg-gray-200"></div>
                  <div className="flex-1 min-w-0 max-w-[140px]">
                    <Select
                      value={activeGroupId ?? ALL_GROUP_VALUE}
                      onValueChange={(value) => onSelectGroup(value === ALL_GROUP_VALUE ? null : value)}
                    >
                      <SelectTrigger className="h-6 w-full bg-gray-50 text-[11px] text-gray-700 font-medium hover:bg-gray-100 border-gray-200 shadow-none">
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
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {availableGroups.length === 0 && <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full whitespace-nowrap">{filteredShapes.length} items</span>}
              {availableGroups.length > 0 && <span className="text-[10px] text-gray-400 whitespace-nowrap">{filteredShapes.length}</span>}

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-900 transition-colors p-1"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 bg-gray-50/50 relative z-0">
          <div className="px-2 pb-2 pt-0 space-y-2">
            {filteredShapes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <span className="text-sm">{t(lang, 'noObjects')}</span>
              </div>
            ) : (
              typeOrder.map((type) => {
                const groupShapes = groupedShapes[type];
                if (!groupShapes || groupShapes.length === 0) return null;

                const isOpen = openSections[type];

                return (
                  <div key={type} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div
                      className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 cursor-pointer bg-white hover:bg-gray-50 transition-colors rounded-t-lg"
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
                          formatId={formatId}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default ObjectList;

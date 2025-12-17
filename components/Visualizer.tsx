import React, { useRef, useEffect, useState, useCallback, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import { Shape, ShapeType, Viewport, Language } from '../types';
import { getBoundingBox, worldToScreen, screenToWorld } from '../services/geometry';
import { drawGrid, drawAxes, drawShape, drawTimeoutIndicator } from '../services/renderer';
import { t } from '../constants/translations';

export interface VisualizerHandle {
  resetView: () => void;
  getCanvasBlob: () => Promise<Blob | null>;
}

interface VisualizerProps {
  shapes: Shape[];
  highlightedShapeId?: string | null;
  visibleIdTypes?: ShapeType[];
  renderTimeout?: number;
  lang: Language;
}

const Visualizer = forwardRef<VisualizerHandle, VisualizerProps>(({ 
    shapes, 
    highlightedShapeId, 
    visibleIdTypes = [], 
    renderTimeout = 200,
    lang
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<Viewport>({ centerX: 0, centerY: 0, scale: 50 });
  const requestRef = useRef<number>(0);
  
  // Refs for current state to be accessible inside requestAnimationFrame callback
  const shapesRef = useRef<Shape[]>(shapes);
  const highlightedRef = useRef<string | null | undefined>(highlightedShapeId);
  const visibleIdTypesRef = useRef(visibleIdTypes);
  const renderTimeoutRef = useRef(renderTimeout);

  const [hoverInfo, setHoverInfo] = useState<{x: number, y: number, text: string} | null>(null);

  // --- Rendering Logic ---

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.scale(dpr, dpr);
    
    const viewport = viewportRef.current;
    const width = rect.width;
    const height = rect.height;

    // Grid & Axes
    drawGrid(ctx, width, height, viewport);
    drawAxes(ctx, width, height, viewport);

    // Culling Calculation
    const p1 = screenToWorld(0, 0, viewport, width, height);
    const p2 = screenToWorld(width, height, viewport, width, height);
    
    const viewMinX = Math.min(p1.x, p2.x);
    const viewMaxX = Math.max(p1.x, p2.x);
    const viewMinY = Math.min(p1.y, p2.y);
    const viewMaxY = Math.max(p1.y, p2.y);

    const padding = 50 / viewport.scale;
    const cullMinX = viewMinX - padding;
    const cullMaxX = viewMaxX + padding;
    const cullMinY = viewMinY - padding;
    const cullMaxY = viewMaxY + padding;

    // Fast visibility check
    const isVisible = (s: Shape): boolean => {
        if (s.id === highlightedRef.current) return true; 
        switch (s.type) {
            case ShapeType.POINT:
            case ShapeType.TEXT:
                return s.x >= cullMinX && s.x <= cullMaxX && s.y >= cullMinY && s.y <= cullMaxY;
            case ShapeType.CIRCLE:
                return (s.x + s.r) >= cullMinX && (s.x - s.r) <= cullMaxX &&
                       (s.y + s.r) >= cullMinY && (s.y - s.r) <= cullMaxY;
            case ShapeType.SEGMENT:
                return Math.max(s.p1.x, s.p2.x) >= cullMinX && Math.min(s.p1.x, s.p2.x) <= cullMaxX &&
                       Math.max(s.p1.y, s.p2.y) >= cullMinY && Math.min(s.p1.y, s.p2.y) <= cullMaxY;
            case ShapeType.LINE: return true;
            case ShapeType.POLYGON:
                let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for(const p of s.points) {
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                }
                return maxX >= cullMinX && minX <= cullMaxX && maxY >= cullMinY && minY <= cullMaxY;
        }
        return true;
    };

    const renderStart = performance.now();
    let isTimedOut = false;

    // Main Draw Loop
    for (let i = 0; i < shapesRef.current.length; i++) {
        // Check timeout every 500 items
        if (i % 500 === 0 && performance.now() - renderStart > renderTimeoutRef.current) {
             isTimedOut = true;
             break;
        }

        const shape = shapesRef.current[i];
        if (shape.id === highlightedRef.current) continue;
        if (!isVisible(shape)) continue;
        
        drawShape(ctx, shape, viewport, width, height, false, visibleIdTypesRef.current);
    }

    if (isTimedOut) {
        drawTimeoutIndicator(ctx, height, lang);
    }

    // Draw Highlighted Shape on top
    if (highlightedRef.current) {
        const shape = shapesRef.current.find(s => s.id === highlightedRef.current);
        if (shape) {
            drawShape(ctx, shape, viewport, width, height, true, visibleIdTypesRef.current);
        }
    }

  }, [lang]);

  const requestRender = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(draw);
  };

  // --- View Control Logic ---

  const fitToShapes = () => {
    const bbox = getBoundingBox(shapesRef.current);
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    const worldW = bbox.maxX - bbox.minX;
    const worldH = bbox.maxY - bbox.minY;

    const scaleX = w / worldW;
    const scaleY = h / worldH;
    let scale = Math.min(scaleX, scaleY);
    
    if (!isFinite(scale) || scale === 0) scale = 50; 
    scale *= 0.8; // Padding

    viewportRef.current = {
      centerX: (bbox.minX + bbox.maxX) / 2,
      centerY: (bbox.minY + bbox.maxY) / 2,
      scale: scale
    };
    requestRender();
  };

  useImperativeHandle(ref, () => ({
    resetView: () => fitToShapes(),
    getCanvasBlob: () => {
        return new Promise<Blob | null>((resolve) => {
            if (!canvasRef.current) {
                resolve(null);
                return;
            }
            canvasRef.current.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
        });
    }
  }));

  // --- Effect Hooks ---

  useEffect(() => {
    shapesRef.current = shapes;
    fitToShapes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes]);

  useEffect(() => {
    highlightedRef.current = highlightedShapeId;
    visibleIdTypesRef.current = visibleIdTypes;
    renderTimeoutRef.current = renderTimeout;
    requestRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedShapeId, visibleIdTypes, renderTimeout]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => requestRender());
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [draw]);

  // --- Event Handlers ---

  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const zoomFactor = Math.pow(2, delta);
    
    const container = containerRef.current;
    if(!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const viewport = viewportRef.current;
    const worldMouse = screenToWorld(mouseX, mouseY, viewport, rect.width, rect.height);

    const newScale = viewport.scale * zoomFactor;
    const newCenterX = worldMouse.x - (mouseX - rect.width / 2) / newScale;
    const newCenterY = worldMouse.y - (mouseY - rect.height / 2) / -newScale;

    viewportRef.current = { ...viewport, scale: newScale, centerX: newCenterX, centerY: newCenterY };
    requestRender();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if(!container) return;
    
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const viewport = viewportRef.current;
    
    if (isDraggingRef.current) {
        const dx = e.clientX - lastMousePosRef.current.x;
        const dy = e.clientY - lastMousePosRef.current.y;
        viewportRef.current = {
            ...viewport,
            centerX: viewport.centerX - dx / viewport.scale,
            centerY: viewport.centerY - dy / -viewport.scale
        };
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        requestRender();
    }

    // Hover Detection
    let hoveredShape: Shape | null = null;
    const threshold = 10; 
    
    for (let i = shapesRef.current.length - 1; i >= 0; i--) {
        const s = shapesRef.current[i];
        if (s.type === ShapeType.POINT) {
            const screenP = worldToScreen(s.x, s.y, viewport, rect.width, rect.height);
            const dist = Math.sqrt(Math.pow(screenP.x - mouseX, 2) + Math.pow(screenP.y - mouseY, 2));
            if (dist <= threshold) {
                hoveredShape = s;
                break;
            }
        }
    }

    if (hoveredShape && hoveredShape.type === ShapeType.POINT) {
        setHoverInfo({
            x: mouseX,
            y: mouseY,
            text: `ID: ${hoveredShape.id} (${hoveredShape.x}, ${hoveredShape.y})`
        });
    } else {
        const worldPos = screenToWorld(mouseX, mouseY, viewport, rect.width, rect.height);
        setHoverInfo({
            x: mouseX,
            y: mouseY,
            text: `(${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)})`
        });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden bg-white cursor-crosshair select-none"
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isDraggingRef.current = false; setHoverInfo(null); }}
        className="block"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* HUD Info */}
      <div className="absolute bottom-5 right-5 bg-white/90 backdrop-blur border border-gray-100 shadow-sm rounded-lg px-3 py-2 text-[10px] text-gray-500 font-mono flex gap-4 pointer-events-none">
        <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            {shapes.length} {t(lang, 'objects')}
        </span>
        <span className="opacity-50">|</span>
        <span>{t(lang, 'scrollToZoom')}</span>
        <span>{t(lang, 'dragToPan')}</span>
      </div>

      {/* Hover Tooltip */}
      {hoverInfo && (
          <div 
            className="absolute bg-black/90 backdrop-blur text-white text-[10px] px-2 py-1 rounded-md pointer-events-none whitespace-nowrap z-50 font-mono shadow-xl translate-x-3 translate-y-3"
            style={{ left: hoverInfo.x, top: hoverInfo.y }}
          >
              {hoverInfo.text}
          </div>
      )}
    </div>
  );
});

Visualizer.displayName = 'Visualizer';

export default Visualizer;
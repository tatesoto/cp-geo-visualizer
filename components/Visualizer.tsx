import React, { useRef, useEffect, useState, useCallback, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import { Shape, ShapeType, Viewport, Language } from '../types';
import { getBoundingBox, worldToScreen, screenToWorld } from '../services/geometry';
import { t } from '../constants/translations';

export interface VisualizerHandle {
  resetView: () => void;
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
  const shapesRef = useRef<Shape[]>(shapes);
  const highlightedRef = useRef<string | null | undefined>(highlightedShapeId);
  const visibleIdTypesRef = useRef(visibleIdTypes);
  const renderTimeoutRef = useRef(renderTimeout);

  const [hoverInfo, setHoverInfo] = useState<{x: number, y: number, text: string} | null>(null);

  const requestRender = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(draw);
  };

  const fitToShapes = () => {
    const bbox = getBoundingBox(shapesRef.current);
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    const worldW = bbox.maxX - bbox.minX;
    const worldH = bbox.maxY - bbox.minY;

    // Determine scale to fit with padding
    const scaleX = w / worldW;
    const scaleY = h / worldH;
    let scale = Math.min(scaleX, scaleY);
    
    if (!isFinite(scale) || scale === 0) scale = 50; 

    // Padding factor (0.8 = 80% of screen usage)
    scale *= 0.8;

    viewportRef.current = {
      centerX: (bbox.minX + bbox.maxX) / 2,
      centerY: (bbox.minY + bbox.maxY) / 2,
      scale: scale
    };
    requestRender();
  };

  useImperativeHandle(ref, () => ({
    resetView: () => fitToShapes()
  }));

  useEffect(() => {
    shapesRef.current = shapes;
    fitToShapes();
  }, [shapes]);

  useEffect(() => {
    highlightedRef.current = highlightedShapeId;
    visibleIdTypesRef.current = visibleIdTypes;
    renderTimeoutRef.current = renderTimeout;
    requestRender();
  }, [highlightedShapeId, visibleIdTypes, renderTimeout]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, viewport: Viewport) => {
    const { centerX, centerY, scale } = viewport;
    
    const targetPixelSpacing = 100;
    const rawStep = targetPixelSpacing / scale;
    const exponent = Math.floor(Math.log10(rawStep));
    let step = Math.pow(10, exponent);
    if (rawStep / step > 5) step *= 5;
    else if (rawStep / step > 2) step *= 2;

    const startXWorld = centerX - (width / 2) / scale;
    const endXWorld = centerX + (width / 2) / scale;
    const startYWorld = centerY - (height / 2) / scale;
    const endYWorld = centerY + (height / 2) / scale;

    // Grid Styling
    ctx.strokeStyle = '#f1f5f9'; // Slate 100 - very subtle
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]); // Dashed grid

    const renderStep = step * ((endXWorld - startXWorld) / step > 200 ? 5 : 1);
    
    ctx.beginPath();
    // Verticals
    for (let x = Math.floor(startXWorld / renderStep) * renderStep; x <= endXWorld; x += renderStep) {
      const s = worldToScreen(x, 0, viewport, width, height);
      ctx.moveTo(s.x, 0);
      ctx.lineTo(s.x, height);
    }
    // Horizontals
    for (let y = Math.floor(startYWorld / renderStep) * renderStep; y <= endYWorld; y += renderStep) {
      const s = worldToScreen(0, y, viewport, width, height);
      ctx.moveTo(0, s.y);
      ctx.lineTo(width, s.y);
    }
    ctx.stroke();
    ctx.setLineDash([]); // Reset

    // Labels
    ctx.fillStyle = '#94a3b8'; // Slate 400
    ctx.font = '10px "Inter", sans-serif';
    
    // X Axis Labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const origin = worldToScreen(0, 0, viewport, width, height);
    const labelY = Math.min(Math.max(origin.y + 8, 8), height - 20);
    
    for (let x = Math.floor(startXWorld / renderStep) * renderStep; x <= endXWorld; x += renderStep) {
      const s = worldToScreen(x, 0, viewport, width, height);
      if (s.x < 0 || s.x > width) continue;
      // Skip 0 if we draw axes later
      if (Math.abs(x) < 1e-9) continue; 
      ctx.fillText(parseFloat(x.toPrecision(6)).toString(), s.x, labelY);
    }

    // Y Axis Labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const labelX = Math.min(Math.max(origin.x - 8, 40), width - 8);

    for (let y = Math.floor(startYWorld / renderStep) * renderStep; y <= endYWorld; y += renderStep) {
      const s = worldToScreen(0, y, viewport, width, height);
      if (s.y < 0 || s.y > height) continue;
      if (Math.abs(y) < 1e-9) continue;
      ctx.fillText(parseFloat(y.toPrecision(6)).toString(), labelX, s.y);
    }
  };

  const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape, viewport: Viewport, width: number, height: number, isHighlight: boolean) => {
      const baseLineWidth = 2; 

      ctx.beginPath();
      
      if (isHighlight) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = baseLineWidth + 2;
          ctx.shadowColor = 'rgba(0,0,0,0.15)';
          ctx.shadowBlur = 12;
      } else {
          ctx.strokeStyle = shape.color || '#000';
          ctx.lineWidth = baseLineWidth;
          ctx.shadowBlur = 0;
          ctx.fillStyle = shape.color || '#000';
      }

      // Keep track of a reference point to draw ID near
      let labelPoint = { x: 0, y: 0 };

      switch (shape.type) {
        case ShapeType.POINT: {
          const s = worldToScreen(shape.x, shape.y, viewport, width, height);
          labelPoint = s;
          const r = isHighlight ? 5 : 3;
          ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
          
          if (isHighlight) {
              ctx.stroke();
              ctx.fillStyle = '#fff';
              ctx.fill();
              ctx.beginPath();
              ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
              ctx.fillStyle = shape.color || '#000';
              ctx.fill();
          } else {
              ctx.fill();
          }
          
          if (shape.label && !isHighlight) {
              ctx.font = '500 11px "Inter", sans-serif';
              ctx.fillStyle = '#64748b';
              ctx.fillText(shape.label, s.x + 8, s.y - 8);
          }
          break;
        }
        case ShapeType.LINE: {
            const topLeft = screenToWorld(0, 0, viewport, width, height);
            const bottomRight = screenToWorld(width, height, viewport, width, height);
            
            const minX = Math.min(topLeft.x, bottomRight.x);
            const maxX = Math.max(topLeft.x, bottomRight.x);
            const minY = Math.min(topLeft.y, bottomRight.y);
            const maxY = Math.max(topLeft.y, bottomRight.y);

            const worldWidth = maxX - minX;
            const worldHeight = maxY - minY;
            const diagonal = Math.sqrt(worldWidth * worldWidth + worldHeight * worldHeight);

            const dx = shape.p2.x - shape.p1.x;
            const dy = shape.p2.y - shape.p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            
            if (len === 0) break;

            const ndx = dx / len;
            const ndy = dy / len;
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const t = (centerX - shape.p1.x) * ndx + (centerY - shape.p1.y) * ndy;
            const closestX = shape.p1.x + t * ndx;
            const closestY = shape.p1.y + t * ndy;
            const extend = Math.max(diagonal, 100) * 1.5; 

            const pStart = { x: closestX - ndx * extend, y: closestY - ndy * extend };
            const pEnd = { x: closestX + ndx * extend, y: closestY + ndy * extend };

            const s1 = worldToScreen(pStart.x, pStart.y, viewport, width, height);
            const s2 = worldToScreen(pEnd.x, pEnd.y, viewport, width, height);

            ctx.moveTo(s1.x, s1.y);
            ctx.lineTo(s2.x, s2.y);
            ctx.stroke();
            
            const sCenter = worldToScreen(closestX, closestY, viewport, width, height);
            labelPoint = sCenter;
            break;
        }
        case ShapeType.SEGMENT: {
          const s1 = worldToScreen(shape.p1.x, shape.p1.y, viewport, width, height);
          const s2 = worldToScreen(shape.p2.x, shape.p2.y, viewport, width, height);
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(s2.x, s2.y);
          ctx.stroke();
          
          labelPoint = { x: (s1.x + s2.x)/2, y: (s1.y + s2.y)/2 };

          if (!isHighlight) {
             // draw small endpoints
            ctx.beginPath();
            ctx.fillStyle = shape.color || '#000';
            ctx.arc(s1.x, s1.y, 2, 0, Math.PI*2);
            ctx.arc(s2.x, s2.y, 2, 0, Math.PI*2);
            ctx.fill();
          }
          break;
        }
        case ShapeType.CIRCLE: {
          const center = worldToScreen(shape.x, shape.y, viewport, width, height);
          const radiusScreen = shape.r * viewport.scale;
          ctx.beginPath();
          ctx.arc(center.x, center.y, radiusScreen, 0, Math.PI * 2);
          ctx.stroke();
          labelPoint = center;
          if (!isHighlight) {
            ctx.globalAlpha = 0.05;
            ctx.fill();
            ctx.globalAlpha = 1.0;
          }
          break;
        }
        case ShapeType.POLYGON: {
            if (shape.points.length > 0) {
                const start = worldToScreen(shape.points[0].x, shape.points[0].y, viewport, width, height);
                labelPoint = start;
                ctx.moveTo(start.x, start.y);
                for (let i = 1; i < shape.points.length; i++) {
                    const p = worldToScreen(shape.points[i].x, shape.points[i].y, viewport, width, height);
                    ctx.lineTo(p.x, p.y);
                }
                ctx.closePath();
                ctx.stroke();
                
                ctx.globalAlpha = isHighlight ? 0.2 : 0.08;
                ctx.fillStyle = shape.color || '#000';
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
            break;
        }
        case ShapeType.TEXT: {
            const s = worldToScreen(shape.x, shape.y, viewport, width, height);
            labelPoint = s;
            ctx.font = `500 ${shape.fontSize || 12}px "Inter", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (isHighlight) {
                const metrics = ctx.measureText(shape.content);
                const h = (shape.fontSize || 12);
                ctx.strokeStyle = '#000';
                ctx.strokeRect(s.x - metrics.width/2 - 6, s.y - h/2 - 6, metrics.width + 12, h + 12);
            }
            ctx.fillStyle = '#000';
            ctx.fillText(shape.content, s.x, s.y);
            break;
        }
      }
      
      ctx.shadowBlur = 0;

      const shouldDrawId = shape.type !== ShapeType.TEXT && (visibleIdTypesRef.current.includes(shape.type) || isHighlight);

      if (shouldDrawId) {
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          
          const text = `${shape.id}`;
          const x = labelPoint.x + 6;
          const y = labelPoint.y - 6;

          // White stroke for contrast
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 4;
          ctx.lineJoin = 'round';
          ctx.strokeText(text, x, y);

          ctx.fillStyle = '#0f172a'; 
          ctx.fillText(text, x, y);
      }
  }

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

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    
    const viewport = viewportRef.current;
    const width = rect.width;
    const height = rect.height;

    drawGrid(ctx, width, height, viewport);

    // Axes
    const origin = worldToScreen(0, 0, viewport, width, height);
    ctx.beginPath();
    ctx.strokeStyle = '#cbd5e1'; // Slate 300
    ctx.lineWidth = 2;
    ctx.moveTo(0, origin.y);
    ctx.lineTo(width, origin.y);
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, height);
    ctx.stroke();

    // Culling
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

    // Use for loop instead of forEach to allow break
    for (let i = 0; i < shapesRef.current.length; i++) {
        // Check timeout every 500 items to reduce overhead
        if (i % 500 === 0 && performance.now() - renderStart > renderTimeoutRef.current) {
             isTimedOut = true;
             break;
        }

        const shape = shapesRef.current[i];
        if (shape.id === highlightedRef.current) continue;
        if (!isVisible(shape)) continue;
        drawShape(ctx, shape, viewport, width, height, false);
    }

    if (isTimedOut) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(0, height - 30, 360, 30);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px "Inter", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(t(lang, 'renderingTimeout'), 10, height - 15);
        ctx.restore();
    }

    if (highlightedRef.current) {
        const shape = shapesRef.current.find(s => s.id === highlightedRef.current);
        if (shape) {
            drawShape(ctx, shape, viewport, width, height, true);
        }
    }

  }, [lang]);

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

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => requestRender());
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

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
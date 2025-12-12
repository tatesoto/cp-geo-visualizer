import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { Shape, ShapeType, Viewport } from '../types';
import { getBoundingBox, worldToScreen, screenToWorld } from '../services/geometry';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface VisualizerProps {
  shapes: Shape[];
}

const Visualizer: React.FC<VisualizerProps> = ({ shapes }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use Ref for viewport to avoid React render cycle on pan/zoom
  const viewportRef = useRef<Viewport>({ centerX: 0, centerY: 0, scale: 50 });
  const requestRef = useRef<number>(0);
  const shapesRef = useRef<Shape[]>(shapes);

  // State only for UI overlay elements that don't need 60fps updates
  const [hoverInfo, setHoverInfo] = useState<{x: number, y: number, text: string} | null>(null);

  // Update shapes ref when prop changes
  useEffect(() => {
    shapesRef.current = shapes;
    if (shapes.length > 0) {
        fitToShapes();
    }
    requestRender();
  }, [shapes]);

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

    viewportRef.current = {
      centerX: (bbox.minX + bbox.maxX) / 2,
      centerY: (bbox.minY + bbox.maxY) / 2,
      scale: scale
    };
    requestRender();
  };

  const requestRender = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(draw);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, viewport: Viewport) => {
    const { centerX, centerY, scale } = viewport;
    
    // Calculate adaptive grid step
    // We want grid lines to be roughly 50-150 pixels apart
    const targetPixelSpacing = 100;
    const rawStep = targetPixelSpacing / scale;
    const exponent = Math.floor(Math.log10(rawStep));
    let step = Math.pow(10, exponent);
    
    // Fine tune 1, 2, 5 intervals
    if (rawStep / step > 5) step *= 5;
    else if (rawStep / step > 2) step *= 2;

    const startXWorld = centerX - (width / 2) / scale;
    const endXWorld = centerX + (width / 2) / scale;
    const startYWorld = centerY - (height / 2) / scale;
    const endYWorld = centerY + (height / 2) / scale;

    const startX = Math.floor(startXWorld / step) * step;
    const startY = Math.floor(startYWorld / step) * step;

    ctx.strokeStyle = '#1e293b'; // Slate 800 - subtle grid
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b'; // Slate 500 - text
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Vertical Lines
    for (let x = startX; x <= endXWorld; x += step) {
      const s = worldToScreen(x, 0, viewport, width, height);
      ctx.beginPath();
      ctx.moveTo(s.x, 0);
      ctx.lineTo(s.x, height);
      ctx.stroke();
      
      // Label on X Axis
      const origin = worldToScreen(0, 0, viewport, width, height);
      const labelY = Math.min(Math.max(origin.y + 5, 5), height - 15);
      ctx.fillText(parseFloat(x.toPrecision(6)).toString(), s.x, labelY);
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Horizontal Lines
    for (let y = startY; y <= endYWorld; y += step) {
      const s = worldToScreen(0, y, viewport, width, height);
      ctx.beginPath();
      ctx.moveTo(0, s.y);
      ctx.lineTo(width, s.y);
      ctx.stroke();

      // Label on Y Axis
      const origin = worldToScreen(0, 0, viewport, width, height);
      const labelX = Math.min(Math.max(origin.x - 5, 30), width - 5);
      ctx.fillText(parseFloat(y.toPrecision(6)).toString(), labelX, s.y);
    }
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    // Only resize if needed to avoid overhead
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transform before clearing
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.scale(dpr, dpr);
    
    const viewport = viewportRef.current;
    
    // Draw Grid first
    drawGrid(ctx, rect.width, rect.height, viewport);

    // Draw Axes
    const origin = worldToScreen(0, 0, viewport, rect.width, rect.height);
    ctx.beginPath();
    ctx.strokeStyle = '#475569'; // Slate 600 - brighter axis
    ctx.lineWidth = 2;
    // X axis
    ctx.moveTo(0, origin.y);
    ctx.lineTo(rect.width, origin.y);
    // Y axis
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, rect.height);
    ctx.stroke();

    const pointRadius = Math.max(3, 4); 
    const lineWidth = 2; 

    shapesRef.current.forEach(shape => {
      ctx.beginPath();
      ctx.strokeStyle = shape.color || '#fff';
      ctx.fillStyle = shape.color || '#fff';
      ctx.lineWidth = lineWidth;

      switch (shape.type) {
        case ShapeType.POINT: {
          const s = worldToScreen(shape.x, shape.y, viewport, rect.width, rect.height);
          ctx.arc(s.x, s.y, pointRadius, 0, Math.PI * 2);
          ctx.fill();
          if (shape.label) {
              ctx.font = '12px sans-serif';
              ctx.fillStyle = '#cbd5e1';
              ctx.fillText(shape.label, s.x + 8, s.y - 8);
          }
          break;
        }
        case ShapeType.LINE: {
            // Robust infinite line drawing
            // 1. Calculate the visible world bounds
            const topLeft = screenToWorld(0, 0, viewport, rect.width, rect.height);
            const bottomRight = screenToWorld(rect.width, rect.height, viewport, rect.width, rect.height);
            
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
            
            if (len === 0) break; // Degenerate line

            const ndx = dx / len;
            const ndy = dy / len;

            // Find point on line closest to viewport center
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            
            // Project (center - p1) onto direction to find parameter t
            const t = (centerX - shape.p1.x) * ndx + (centerY - shape.p1.y) * ndy;
            const closestX = shape.p1.x + t * ndx;
            const closestY = shape.p1.y + t * ndy;

            // Extend in both directions enough to cover the viewport
            // Extending by diagonal length is sufficient if centered
            // Use a slight multiplier to be safe
            const extend = Math.max(diagonal, 100) * 1.5; 

            const pStart = {
                x: closestX - ndx * extend,
                y: closestY - ndy * extend
            };
            const pEnd = {
                x: closestX + ndx * extend,
                y: closestY + ndy * extend
            };

            const s1 = worldToScreen(pStart.x, pStart.y, viewport, rect.width, rect.height);
            const s2 = worldToScreen(pEnd.x, pEnd.y, viewport, rect.width, rect.height);

            ctx.moveTo(s1.x, s1.y);
            ctx.lineTo(s2.x, s2.y);
            ctx.stroke();
            break;
        }
        case ShapeType.SEGMENT: {
          const s1 = worldToScreen(shape.p1.x, shape.p1.y, viewport, rect.width, rect.height);
          const s2 = worldToScreen(shape.p2.x, shape.p2.y, viewport, rect.width, rect.height);
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(s2.x, s2.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(s1.x, s1.y, 2, 0, Math.PI*2);
          ctx.arc(s2.x, s2.y, 2, 0, Math.PI*2);
          ctx.fill();
          break;
        }
        case ShapeType.CIRCLE: {
          const center = worldToScreen(shape.x, shape.y, viewport, rect.width, rect.height);
          const radiusScreen = shape.r * viewport.scale;
          ctx.beginPath();
          ctx.arc(center.x, center.y, radiusScreen, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 0.1;
          ctx.fill();
          ctx.globalAlpha = 1.0;
          break;
        }
        case ShapeType.POLYGON: {
            if (shape.points.length > 0) {
                const start = worldToScreen(shape.points[0].x, shape.points[0].y, viewport, rect.width, rect.height);
                ctx.moveTo(start.x, start.y);
                for (let i = 1; i < shape.points.length; i++) {
                    const p = worldToScreen(shape.points[i].x, shape.points[i].y, viewport, rect.width, rect.height);
                    ctx.lineTo(p.x, p.y);
                }
                ctx.closePath();
                ctx.stroke();
                ctx.globalAlpha = 0.1;
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
            break;
        }
        case ShapeType.TEXT: {
            const s = worldToScreen(shape.x, shape.y, viewport, rect.width, rect.height);
            ctx.font = `${shape.fontSize || 12}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(shape.content, s.x, s.y);
            break;
        }
      }
    });

  }, []);

  // Event Handlers for Mouse Interaction
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
    
    // Adjust center so worldMouse remains at mouseX, mouseY
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
    
    // Dragging Logic
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

    // Hit Testing logic
    let hoveredShape: Shape | null = null;
    const threshold = 10; // hit radius in pixels
    
    // Check shapes in reverse order (top to bottom)
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

  // Resize observer
  useLayoutEffect(() => {
    const handleResize = () => requestRender();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden bg-slate-900 cursor-crosshair group"
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
            isDraggingRef.current = false;
            setHoverInfo(null);
        }}
        className="block"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
           <button 
             onClick={fitToShapes}
             className="bg-slate-800/80 hover:bg-slate-700 text-white p-2 rounded shadow backdrop-blur-sm transition-colors"
             title="Reset View"
            >
               <ArrowPathIcon className="w-5 h-5" />
           </button>
      </div>

      {/* HUD Info */}
      <div className="absolute bottom-4 right-4 bg-slate-800/90 backdrop-blur p-3 rounded shadow-lg text-xs text-slate-300 pointer-events-none select-none border border-slate-700">
        <div className="font-mono">Objects: {shapes.length}</div>
        <div className="text-slate-500 mt-1">Scroll to zoom • Drag to pan</div>
      </div>

      {/* Hover Tooltip */}
      {hoverInfo && (
          <div 
            className="absolute bg-black/80 backdrop-blur-sm border border-slate-700 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap z-50 font-mono"
            style={{ 
                left: hoverInfo.x + 15, 
                top: hoverInfo.y + 15 
            }}
          >
              {hoverInfo.text}
          </div>
      )}
    </div>
  );
};

export default Visualizer;
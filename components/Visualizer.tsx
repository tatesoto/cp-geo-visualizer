import React, { useRef, useEffect, useState, useCallback, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import { Shape, ShapeType, Viewport } from '../types';
import { getBoundingBox, worldToScreen, screenToWorld } from '../services/geometry';

export interface VisualizerHandle {
  resetView: () => void;
}

interface VisualizerProps {
  shapes: Shape[];
  highlightedShapeId?: string | null;
  visibleIdTypes?: ShapeType[];
}

const Visualizer = forwardRef<VisualizerHandle, VisualizerProps>(({ shapes, highlightedShapeId, visibleIdTypes = [] }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use Ref for viewport to avoid React render cycle on pan/zoom
  const viewportRef = useRef<Viewport>({ centerX: 0, centerY: 0, scale: 50 });
  const requestRef = useRef<number>(0);
  const shapesRef = useRef<Shape[]>(shapes);
  const highlightedRef = useRef<string | null | undefined>(highlightedShapeId);
  const visibleIdTypesRef = useRef(visibleIdTypes);

  // State only for UI overlay elements that don't need 60fps updates
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

    viewportRef.current = {
      centerX: (bbox.minX + bbox.maxX) / 2,
      centerY: (bbox.minY + bbox.maxY) / 2,
      scale: scale
    };
    requestRender();
  };

  useImperativeHandle(ref, () => ({
    resetView: () => {
      fitToShapes();
    }
  }));

  // Update shapes and auto-fit
  useEffect(() => {
    shapesRef.current = shapes;
    fitToShapes();
  }, [shapes]);

  // Update props trigger render
  useEffect(() => {
    highlightedRef.current = highlightedShapeId;
    visibleIdTypesRef.current = visibleIdTypes;
    requestRender();
  }, [highlightedShapeId, visibleIdTypes]);

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

    // Optimization: Don't draw thousands of grid lines if zoomed way out
    // Limit grid lines to reasonable amount (e.g. 100)
    const xLineCount = (endXWorld - startX) / step;
    const yLineCount = (endYWorld - startY) / step;
    const skipMultiplier = (xLineCount > 100 || yLineCount > 100) ? 5 : 1;
    const renderStep = step * skipMultiplier;

    // Vertical Lines
    for (let x = Math.floor(startXWorld / renderStep) * renderStep; x <= endXWorld; x += renderStep) {
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
    for (let y = Math.floor(startYWorld / renderStep) * renderStep; y <= endYWorld; y += renderStep) {
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

  const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape, viewport: Viewport, width: number, height: number, isHighlight: boolean) => {
      const pointRadius = Math.max(3, 4); 
      const baseLineWidth = 2; 

      ctx.beginPath();
      
      if (isHighlight) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = baseLineWidth + 3;
          ctx.shadowColor = shape.color || '#fff';
          ctx.shadowBlur = 10;
      } else {
          ctx.strokeStyle = shape.color || '#fff';
          ctx.lineWidth = baseLineWidth;
          ctx.shadowBlur = 0;
          ctx.fillStyle = shape.color || '#fff';
      }

      // Keep track of a reference point to draw ID near
      let labelPoint = { x: 0, y: 0 };

      switch (shape.type) {
        case ShapeType.POINT: {
          const s = worldToScreen(shape.x, shape.y, viewport, width, height);
          labelPoint = s;
          ctx.arc(s.x, s.y, isHighlight ? pointRadius + 2 : pointRadius, 0, Math.PI * 2);
          if (isHighlight) {
              ctx.stroke();
              ctx.fillStyle = shape.color || '#fff';
              ctx.fill();
          } else {
              ctx.fill();
          }
          
          if (shape.label && !isHighlight) {
              ctx.font = '12px sans-serif';
              ctx.fillStyle = '#cbd5e1';
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
            
            // Use closest point to center as label point
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
            ctx.beginPath();
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
            ctx.globalAlpha = 0.1;
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
                
                ctx.globalAlpha = isHighlight ? 0.3 : 0.1;
                ctx.fillStyle = shape.color || '#fff';
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
            break;
        }
        case ShapeType.TEXT: {
            const s = worldToScreen(shape.x, shape.y, viewport, width, height);
            labelPoint = s;
            ctx.font = `${shape.fontSize || 12}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (isHighlight) {
                const metrics = ctx.measureText(shape.content);
                const h = (shape.fontSize || 12);
                ctx.strokeStyle = shape.color || '#fff';
                ctx.strokeRect(s.x - metrics.width/2 - 4, s.y - h/2 - 4, metrics.width + 8, h + 8);
            }
            ctx.fillStyle = isHighlight ? '#fff' : (shape.color || '#fff');
            ctx.fillText(shape.content, s.x, s.y);
            break;
        }
      }
      
      // Reset shadow
      ctx.shadowBlur = 0;

      // Draw ID if allowed by type OR if highlighted
      // TEXT type never shows ID
      const shouldDrawId = shape.type !== ShapeType.TEXT && (visibleIdTypesRef.current.includes(shape.type) || isHighlight);

      if (shouldDrawId) {
          ctx.font = '10px monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          
          const text = `${shape.id}`;
          const x = labelPoint.x + 4;
          const y = labelPoint.y - 4;

          // Black stroke for better contrast
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.lineJoin = 'round';
          ctx.strokeText(text, x, y);

          // White text
          ctx.fillStyle = '#ffffff'; 
          ctx.fillText(text, x, y);
      }
  }

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
    const width = rect.width;
    const height = rect.height;

    // Draw Grid first
    drawGrid(ctx, width, height, viewport);

    // Draw Axes
    const origin = worldToScreen(0, 0, viewport, width, height);
    ctx.beginPath();
    ctx.strokeStyle = '#475569'; // Slate 600 - brighter axis
    ctx.lineWidth = 2;
    // X axis
    ctx.moveTo(0, origin.y);
    ctx.lineTo(width, origin.y);
    // Y axis
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, height);
    ctx.stroke();

    // PERFORMANCE OPTIMIZATION: Culling
    // Calculate world bounds of the viewport
    const viewMin = screenToWorld(0, height, viewport, width, height); // Top-Left in screen is MinX, MaxY in world? Wait. screenToWorld(0, height) is Bottom-Left in screen logic (y=height).
    // Let's use corners:
    const p1 = screenToWorld(0, 0, viewport, width, height);
    const p2 = screenToWorld(width, height, viewport, width, height);
    
    const viewMinX = Math.min(p1.x, p2.x);
    const viewMaxX = Math.max(p1.x, p2.x);
    const viewMinY = Math.min(p1.y, p2.y);
    const viewMaxY = Math.max(p1.y, p2.y);

    // Padding to avoid clipping thick lines or circles near edge
    const padding = 50 / viewport.scale; // 50px buffer
    const cullMinX = viewMinX - padding;
    const cullMaxX = viewMaxX + padding;
    const cullMinY = viewMinY - padding;
    const cullMaxY = viewMaxY + padding;

    const isVisible = (s: Shape): boolean => {
        if (s.id === highlightedRef.current) return true; // Always draw highlight
        
        switch (s.type) {
            case ShapeType.POINT:
            case ShapeType.TEXT:
                return s.x >= cullMinX && s.x <= cullMaxX && s.y >= cullMinY && s.y <= cullMaxY;
            case ShapeType.CIRCLE:
                // Bounding box check for circle
                return (s.x + s.r) >= cullMinX && (s.x - s.r) <= cullMaxX &&
                       (s.y + s.r) >= cullMinY && (s.y - s.r) <= cullMaxY;
            case ShapeType.SEGMENT:
                // Simple bounding box for segment
                return Math.max(s.p1.x, s.p2.x) >= cullMinX && Math.min(s.p1.x, s.p2.x) <= cullMaxX &&
                       Math.max(s.p1.y, s.p2.y) >= cullMinY && Math.min(s.p1.y, s.p2.y) <= cullMaxY;
            case ShapeType.LINE:
                // Lines are infinite, assume always visible unless we do complex math.
                // But typically Lines span the whole view. 
                // Optimization: if both points are far on one side of viewport, maybe skip?
                // Infinite lines are tricky. Always draw them to be safe.
                return true;
            case ShapeType.POLYGON:
                // Check if any point is in bounds OR if polygon encompasses view.
                // Simple AABB check for polygon.
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

    // Standard Draw Loop
    shapesRef.current.forEach(shape => {
        // Skip highlighted shape, draw it last
        if (shape.id === highlightedRef.current) return;
        // Culling
        if (!isVisible(shape)) return;
        
        drawShape(ctx, shape, viewport, width, height, false);
    });

    // Draw Highlighted Shape Last (on top)
    if (highlightedRef.current) {
        const shape = shapesRef.current.find(s => s.id === highlightedRef.current);
        if (shape) {
            drawShape(ctx, shape, viewport, width, height, true);
        }
    }

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
    
    // Optimization: Only check shapes roughly in view?
    // Using spatial index would be best, but simple loop is O(N).
    // Reverse iteration is good for z-order.
    
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

  // Resize observer for layout changes
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
        requestRender();
    });
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
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
});

Visualizer.displayName = 'Visualizer';

export default Visualizer;
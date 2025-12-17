import { Shape, ShapeType, Viewport, Language } from '../types';
import { worldToScreen, screenToWorld } from './geometry';
import { t } from '../constants/translations';

export const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, viewport: Viewport) => {
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
  ctx.strokeStyle = '#f1f5f9'; // Slate 100
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]); 

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

export const drawAxes = (ctx: CanvasRenderingContext2D, width: number, height: number, viewport: Viewport) => {
    const origin = worldToScreen(0, 0, viewport, width, height);
    ctx.beginPath();
    ctx.strokeStyle = '#cbd5e1'; // Slate 300
    ctx.lineWidth = 2;
    ctx.moveTo(0, origin.y);
    ctx.lineTo(width, origin.y);
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, height);
    ctx.stroke();
};

export const drawShape = (
    ctx: CanvasRenderingContext2D, 
    shape: Shape, 
    viewport: Viewport, 
    width: number, 
    height: number, 
    isHighlight: boolean,
    visibleIdTypes: ShapeType[]
) => {
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

    const shouldDrawId = shape.type !== ShapeType.TEXT && (visibleIdTypes.includes(shape.type) || isHighlight);

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
};

export const drawTimeoutIndicator = (ctx: CanvasRenderingContext2D, height: number, lang: Language) => {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, height - 30, 360, 30);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(t(lang, 'renderingTimeout'), 10, height - 15);
    ctx.restore();
};
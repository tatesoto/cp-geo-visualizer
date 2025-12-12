import { Shape, ShapeType, Viewport } from '../types';

export const getBoundingBox = (shapes: Shape[]) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  if (shapes.length === 0) {
    return { minX: -10, minY: -10, maxX: 10, maxY: 10 };
  }

  const update = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  shapes.forEach(s => {
    switch (s.type) {
      case ShapeType.POINT:
        update(s.x, s.y);
        break;
      case ShapeType.LINE:
      case ShapeType.SEGMENT:
        update(s.p1.x, s.p1.y);
        update(s.p2.x, s.p2.y);
        break;
      case ShapeType.CIRCLE:
        update(s.x - s.r, s.y - s.r);
        update(s.x + s.r, s.y + s.r);
        break;
      case ShapeType.POLYGON:
        s.points.forEach(p => update(p.x, p.y));
        break;
    }
  });

  // Add padding
  const width = maxX - minX;
  const height = maxY - minY;
  const paddingX = Math.max(width * 0.1, 1);
  const paddingY = Math.max(height * 0.1, 1);

  return {
    minX: minX - paddingX,
    maxX: maxX + paddingX,
    minY: minY - paddingY,
    maxY: maxY + paddingY
  };
};

export const worldToScreen = (wx: number, wy: number, viewport: Viewport, canvasWidth: number, canvasHeight: number) => {
  // Translate to center relative to world center, scale, then center on canvas
  const sx = (wx - viewport.centerX) * viewport.scale + canvasWidth / 2;
  // Flip Y for screen coords
  const sy = -(wy - viewport.centerY) * viewport.scale + canvasHeight / 2;
  return { x: sx, y: sy };
};

export const screenToWorld = (sx: number, sy: number, viewport: Viewport, canvasWidth: number, canvasHeight: number) => {
  const wx = (sx - canvasWidth / 2) / viewport.scale + viewport.centerX;
  const wy = (sy - canvasHeight / 2) / -viewport.scale + viewport.centerY;
  return { x: wx, y: wy };
};

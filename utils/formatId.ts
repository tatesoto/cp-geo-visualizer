import { IdIndexBase } from '../types';

export const formatShapeId = (id: string, indexBase: IdIndexBase): string => {
  if (indexBase === 0) return id;
  const match = id.match(/^(.*?)(\d+)$/);
  if (!match) return id;
  const prefix = match[1];
  const num = Number.parseInt(match[2], 10);
  if (Number.isNaN(num)) return id;
  return `${prefix}${num + 1}`;
};

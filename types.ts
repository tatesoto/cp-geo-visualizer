export enum ShapeType {
  POINT = 'POINT',
  LINE = 'LINE',
  SEGMENT = 'SEGMENT',
  CIRCLE = 'CIRCLE',
  POLYGON = 'POLYGON',
  TEXT = 'TEXT',
}

export interface BaseShape {
  id: string;
  type: ShapeType;
  color?: string;
  label?: string;
}

export interface PointShape extends BaseShape {
  type: ShapeType.POINT;
  x: number;
  y: number;
}

export interface LineShape extends BaseShape {
  type: ShapeType.LINE;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
}

export interface SegmentShape extends BaseShape {
  type: ShapeType.SEGMENT;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
}

export interface CircleShape extends BaseShape {
  type: ShapeType.CIRCLE;
  x: number;
  y: number;
  r: number;
}

export interface PolygonShape extends BaseShape {
  type: ShapeType.POLYGON;
  points: { x: number; y: number }[];
}

export interface TextShape extends BaseShape {
  type: ShapeType.TEXT;
  x: number;
  y: number;
  content: string;
  fontSize?: number;
}

export type Shape = PointShape | LineShape | SegmentShape | CircleShape | PolygonShape | TextShape;

export interface Viewport {
  centerX: number;
  centerY: number;
  scale: number;
}

export interface ParseResult {
  shapes: Shape[];
  error: string | null;
}

export type Language = 'en' | 'ja';

export interface AppConfig {
  executionTimeout: number;
  renderTimeout: number;
  language: Language;
}
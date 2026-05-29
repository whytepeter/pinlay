/**
 * Markup tool + shape types.
 *
 * Drawing is shape-based (vector list), not raster — every stroke / shape
 * is stored as an object so the select tool can hit-test, highlight, and
 * delete individual items. Undo/redo just snapshots the shape list.
 */
export type DrawTool =
  | "grab"
  | "rect"
  | "circle"
  | "arrow"
  | "text"
  | "blur";

export interface RectShape {
  type: "rect";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  lw: number;
}
export interface CircleShape {
  type: "circle";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  lw: number;
}
export interface ArrowShape {
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  lw: number;
}
export interface TextShape {
  type: "text";
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
}
export interface BlurShape {
  type: "blur";
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Shape =
  | RectShape
  | CircleShape
  | ArrowShape
  | TextShape
  | BlurShape;

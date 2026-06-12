import {
  type BoundingBox,
  type NormalizedRectangle,
  type ProcessBackgroundImageRequest,
} from '@campus/contracts';

export interface EditorRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CanvasMode = 'rooms' | 'image' | 'crop';

export interface BackgroundImageEditDraft {
  scale: number;
  /** Free rotation in degrees, applied clockwise about the image centre. */
  rotationDegrees: number;
  offsetX: number;
  offsetY: number;
  cropRect: EditorRectangle;
  /** Display-only opacity used while aligning the image over the footprint. */
  opacity: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 3;

/** Default alignment opacity so the footprint stays visible through the image. */
export const DEFAULT_IMAGE_OPACITY = 0.8;

export function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_IMAGE_OPACITY;
  }
  return Math.min(Math.max(value, 0.1), 1);
}

export function clampBackgroundScale(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE);
}

export function createDefaultCropRect(bounds: BoundingBox): EditorRectangle {
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: Math.max(bounds.width, 1),
    height: Math.max(bounds.height, 1),
  };
}

export function createMinimumCropSize(bounds: BoundingBox): number {
  return Math.max(Math.min(bounds.width, bounds.height) * 0.12, 32);
}

export function clampCropRect(
  rectangle: EditorRectangle,
  bounds: BoundingBox,
  minimumSize = createMinimumCropSize(bounds),
): EditorRectangle {
  const width = Math.min(Math.max(rectangle.width, minimumSize), bounds.width);
  const height = Math.min(Math.max(rectangle.height, minimumSize), bounds.height);
  const x = Math.min(Math.max(rectangle.x, bounds.minX), bounds.maxX - width);
  const y = Math.min(Math.max(rectangle.y, bounds.minY), bounds.maxY - height);

  return { x, y, width, height };
}

export function getBackgroundImageRect(
  bounds: BoundingBox,
  scale: number,
  offsetX: number,
  offsetY: number,
): EditorRectangle {
  const normalizedScale = clampBackgroundScale(scale);
  const width = bounds.width * normalizedScale;
  const height = bounds.height * normalizedScale;
  const centerX = bounds.minX + bounds.width / 2 + offsetX;
  const centerY = bounds.minY + bounds.height / 2 + offsetY;

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

export function quarterTurnsToDegrees(rotationQuarterTurns: number): number {
  const normalized = ((Math.trunc(rotationQuarterTurns) % 4) + 4) % 4;
  return normalized * 90;
}

export function toNormalizedRectangle(
  bounds: BoundingBox,
  rectangle: EditorRectangle,
): NormalizedRectangle {
  return {
    x: bounds.width > 0 ? (rectangle.x - bounds.minX) / bounds.width : 0,
    y: bounds.height > 0 ? (rectangle.y - bounds.minY) / bounds.height : 0,
    width: bounds.width > 0 ? rectangle.width / bounds.width : 1,
    height: bounds.height > 0 ? rectangle.height / bounds.height : 1,
  };
}

export function normalizeRotationDegrees(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return ((value % 360) + 360) % 360;
}

export function toBackgroundProcessRequest(
  bounds: BoundingBox,
  draft: {
    rotationDegrees: number;
    scale: number;
    offsetX: number;
    offsetY: number;
    cropRect: EditorRectangle;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
  },
): ProcessBackgroundImageRequest {
  return {
    rotationDegrees: normalizeRotationDegrees(draft.rotationDegrees),
    scale: clampBackgroundScale(draft.scale),
    offsetX: bounds.width > 0 ? draft.offsetX / bounds.width : 0,
    offsetY: bounds.height > 0 ? draft.offsetY / bounds.height : 0,
    cropRect: toNormalizedRectangle(bounds, clampCropRect(draft.cropRect, bounds)),
    flipHorizontal: draft.flipHorizontal ?? false,
    flipVertical: draft.flipVertical ?? false,
  };
}

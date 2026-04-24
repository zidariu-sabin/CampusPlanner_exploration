import sharp from 'sharp';
import { getBoundingBox, type GeoJsonPolygon, type ProcessBackgroundImageRequest } from '@campus/contracts';

interface CanvasSize {
  width: number;
  height: number;
}

export async function processMapBackgroundImage(
  sourcePath: string,
  footprintGeoJson: GeoJsonPolygon,
  edits: ProcessBackgroundImageRequest,
): Promise<Buffer> {
  const metadata = await sharp(sourcePath).metadata();
  const canvasSize = getCanvasSize(metadata.width ?? 1600, metadata.height ?? 900, footprintGeoJson);
  const scaledWidth = Math.max(Math.round(canvasSize.width * edits.scale), 1);
  const scaledHeight = Math.max(Math.round(canvasSize.height * edits.scale), 1);
  const transformedImage = await sharp(sourcePath)
    .resize({
      width: scaledWidth,
      height: scaledHeight,
      fit: 'fill',
    })
    .rotate(edits.rotationQuarterTurns * 90, {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const transformedMetadata = await sharp(transformedImage).metadata();
  const offsetX = edits.offsetX * canvasSize.width;
  const offsetY = edits.offsetY * canvasSize.height;
  const compositeLeft = Math.round((canvasSize.width - (transformedMetadata.width ?? 0)) / 2 + offsetX);
  const compositeTop = Math.round((canvasSize.height - (transformedMetadata.height ?? 0)) / 2 + offsetY);
  const crop = normalizeCrop(edits.cropRect, canvasSize);
  const composited = await sharp({
    create: {
      width: canvasSize.width,
      height: canvasSize.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: transformedImage,
        left: compositeLeft,
        top: compositeTop,
      },
    ])
    .png()
    .toBuffer();

  return sharp(composited)
    .extract(crop)
    .resize({
      width: canvasSize.width,
      height: canvasSize.height,
      fit: 'fill',
    })
    .png()
    .toBuffer();
}

function getCanvasSize(sourceWidth: number, sourceHeight: number, footprintGeoJson: GeoJsonPolygon): CanvasSize {
  const bounds = getBoundingBox(footprintGeoJson);
  const aspectRatio = bounds.width > 0 && bounds.height > 0 ? bounds.width / bounds.height : 1;
  const sourceArea = Math.max(sourceWidth * sourceHeight, 1);
  const width = Math.max(Math.round(Math.sqrt(sourceArea * aspectRatio)), 1);
  const height = Math.max(Math.round(width / Math.max(aspectRatio, 1e-6)), 1);

  return { width, height };
}

function normalizeCrop(
  cropRect: ProcessBackgroundImageRequest['cropRect'],
  canvasSize: CanvasSize,
): { left: number; top: number; width: number; height: number } {
  const left = Math.max(Math.min(Math.round(cropRect.x * canvasSize.width), canvasSize.width - 1), 0);
  const top = Math.max(Math.min(Math.round(cropRect.y * canvasSize.height), canvasSize.height - 1), 0);
  const right = Math.max(Math.min(Math.round((cropRect.x + cropRect.width) * canvasSize.width), canvasSize.width), left + 1);
  const bottom = Math.max(
    Math.min(Math.round((cropRect.y + cropRect.height) * canvasSize.height), canvasSize.height),
    top + 1,
  );

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

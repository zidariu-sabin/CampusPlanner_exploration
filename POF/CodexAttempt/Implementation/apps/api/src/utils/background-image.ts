import sharp from 'sharp';
import { getProjectedBoundingBox, type GeoJsonPolygon, type ProcessBackgroundImageRequest } from '@campus/contracts';

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
  let pipeline = sharp(sourcePath).resize({
    width: scaledWidth,
    height: scaledHeight,
    fit: 'fill',
  });
  if (edits.flipHorizontal) {
    pipeline = pipeline.flop();
  }
  if (edits.flipVertical) {
    pipeline = pipeline.flip();
  }
  const transformedImage = await pipeline
    .rotate(edits.rotationDegrees, {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const transformedMetadata = await sharp(transformedImage).metadata();
  const transformedWidth = transformedMetadata.width ?? 0;
  const transformedHeight = transformedMetadata.height ?? 0;
  const offsetX = edits.offsetX * canvasSize.width;
  const offsetY = edits.offsetY * canvasSize.height;
  const compositeLeft = Math.round((canvasSize.width - transformedWidth) / 2 + offsetX);
  const compositeTop = Math.round((canvasSize.height - transformedHeight) / 2 + offsetY);

  // Sharp's composite requires the overlay to fit fully within the base image at
  // non-negative coordinates — otherwise it throws "Image to composite must have
  // same dimensions or smaller". Scaling the image up (or a large offset/rotation)
  // makes the transformed image larger than canvasSize, so composite onto a base
  // sized to the union of the canvas and the placed image, then extract the target
  // canvas region back out. The two steps must be separate sharp invocations:
  // sharp applies composite last in its pipeline, so an extract chained after it
  // would shrink the base *before* the overlay lands and re-trigger the error.
  const regionLeft = Math.min(0, compositeLeft);
  const regionTop = Math.min(0, compositeTop);
  const regionRight = Math.max(canvasSize.width, compositeLeft + transformedWidth);
  const regionBottom = Math.max(canvasSize.height, compositeTop + transformedHeight);

  const crop = normalizeCrop(edits.cropRect, canvasSize);
  const compositedUnion = await sharp({
    create: {
      width: regionRight - regionLeft,
      height: regionBottom - regionTop,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: transformedImage,
        left: compositeLeft - regionLeft,
        top: compositeTop - regionTop,
      },
    ])
    .png()
    .toBuffer();
  const composited = await sharp(compositedUnion)
    .extract({
      left: -regionLeft,
      top: -regionTop,
      width: canvasSize.width,
      height: canvasSize.height,
    })
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
  const bounds = getProjectedBoundingBox(footprintGeoJson);
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
  const right = Math.max(
    Math.min(Math.round((cropRect.x + cropRect.width) * canvasSize.width), canvasSize.width),
    left + 1,
  );
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

import fs from 'node:fs/promises';
import path from 'node:path';

import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { AppDataSource } from '../data-source.js';
import { config } from '../config.js';
import { FloorMapEntity } from '../entities/floor-map.entity.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getFloorMapOrFail, listFloorMaps, replaceRooms, updateFloorMap } from '../services/floor-map.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { processMapBackgroundImage } from '../utils/background-image.js';
import { HttpError } from '../utils/http-error.js';
import { toFloorMapDto, toFloorMapSummaryDto } from '../utils/serializers.js';
import { ensurePolygon } from '../utils/validation.js';

function routeParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  throw new HttpError(400, `Missing route parameter: ${name}.`);
}

const floorMapSchema = z.object({
  name: z.string().trim().min(2).max(120),
  floorLabel: z.string().trim().min(1).max(50),
  footprintGeoJson: z.any(),
});

const replaceRoomsSchema = z.object({
  rooms: z.array(
    z.object({
      id: z.uuid().optional(),
      name: z.string().trim().min(1).max(120),
      color: z.string().trim().min(4).max(20),
      sortOrder: z.number().int(),
      geometryGeoJson: z.any(),
    }),
  ),
});

const processBackgroundImageSchema = z
  .object({
    rotationQuarterTurns: z.number().int().min(0).max(3),
    scale: z.number().positive().min(0.25).max(3),
    offsetX: z.number().finite().min(-2).max(2),
    offsetY: z.number().finite().min(-2).max(2),
    cropRect: z.object({
      x: z.number().finite().min(0).max(1),
      y: z.number().finite().min(0).max(1),
      width: z.number().finite().positive().max(1),
      height: z.number().finite().positive().max(1),
    }),
  })
  .superRefine((body, context) => {
    if (body.cropRect.x + body.cropRect.width > 1) {
      context.addIssue({
        code: 'custom',
        path: ['cropRect', 'width'],
        message: 'Crop rectangle extends beyond the normalized image viewport.',
      });
    }

    if (body.cropRect.y + body.cropRect.height > 1) {
      context.addIssue({
        code: 'custom',
        path: ['cropRect', 'height'],
        message: 'Crop rectangle extends beyond the normalized image viewport.',
      });
    }
  });

await fs.mkdir(config.uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, config.uploadsDir),
    filename: (_request, file, callback) => {
      const extension = path.extname(file.originalname) || '.png';
      callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`);
    },
  }),
});

export const floorMapsRouter = Router();

floorMapsRouter.use(authenticate);

floorMapsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const floorMaps = await listFloorMaps(request.user!.organizationId);
    response.json(floorMaps.map(toFloorMapSummaryDto));
  }),
);

floorMapsRouter.get(
  '/:floorMapId',
  asyncHandler(async (request, response) => {
    const floorMap = await getFloorMapOrFail(
      request.user!.organizationId,
      routeParam(request.params.floorMapId, 'floorMapId'),
    );
    response.json(toFloorMapDto(floorMap));
  }),
);

floorMapsRouter.patch(
  '/:floorMapId',
  requireRole('owner', 'admin'),
  asyncHandler(async (request, response) => {
    const body = floorMapSchema.parse(request.body);
    const floorMap = await updateFloorMap(
      request.user!.organizationId,
      routeParam(request.params.floorMapId, 'floorMapId'),
      {
        ...body,
        footprintGeoJson: ensurePolygon(body.footprintGeoJson),
      },
    );
    response.json(toFloorMapDto(floorMap));
  }),
);

floorMapsRouter.post(
  '/:floorMapId/background-image',
  requireRole('owner', 'admin'),
  upload.single('image'),
  asyncHandler(async (request, response) => {
    if (!request.file) {
      throw new HttpError(400, 'An image file is required.');
    }

    const floorMap = await getFloorMapOrFail(
      request.user!.organizationId,
      routeParam(request.params.floorMapId, 'floorMapId'),
    );
    const previousBackgroundImageUrl = floorMap.backgroundImageUrl;
    floorMap.backgroundImageUrl = `/uploads/${request.file.filename}`;
    await AppDataSource.getRepository(FloorMapEntity).save(floorMap);
    await deleteManagedUpload(previousBackgroundImageUrl);

    response.json(toFloorMapDto(await getFloorMapOrFail(request.user!.organizationId, floorMap.id)));
  }),
);

floorMapsRouter.post(
  '/:floorMapId/background-image/process',
  requireRole('owner', 'admin'),
  asyncHandler(async (request, response) => {
    const body = processBackgroundImageSchema.parse(request.body);
    const floorMap = await getFloorMapOrFail(
      request.user!.organizationId,
      routeParam(request.params.floorMapId, 'floorMapId'),
    );

    if (!floorMap.backgroundImageUrl) {
      throw new HttpError(400, 'Upload a background image before applying image edits.');
    }

    const sourcePath = managedUploadPath(floorMap.backgroundImageUrl);
    if (!sourcePath) {
      throw new HttpError(400, 'Only locally uploaded background images can be processed.');
    }

    const processedBackground = await processMapBackgroundImage(sourcePath, floorMap.footprintGeoJson, body);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const outputPath = path.join(config.uploadsDir, fileName);
    const previousBackgroundImageUrl = floorMap.backgroundImageUrl;

    await fs.writeFile(outputPath, processedBackground);
    floorMap.backgroundImageUrl = `/uploads/${fileName}`;
    await AppDataSource.getRepository(FloorMapEntity).save(floorMap);
    await deleteManagedUpload(previousBackgroundImageUrl);

    response.json(toFloorMapDto(await getFloorMapOrFail(request.user!.organizationId, floorMap.id)));
  }),
);

floorMapsRouter.put(
  '/:floorMapId/rooms',
  requireRole('owner', 'admin'),
  asyncHandler(async (request, response) => {
    const body = replaceRoomsSchema.parse(request.body);
    const floorMap = await replaceRooms(
      request.user!.organizationId,
      routeParam(request.params.floorMapId, 'floorMapId'),
      body.rooms.map((room) => ({
        ...room,
        geometryGeoJson: ensurePolygon(room.geometryGeoJson),
      })),
    );

    response.json(toFloorMapDto(floorMap));
  }),
);

function managedUploadPath(backgroundImageUrl: string | null): string | null {
  if (!backgroundImageUrl || !backgroundImageUrl.startsWith('/uploads/')) {
    return null;
  }

  return path.join(config.uploadsDir, path.basename(backgroundImageUrl));
}

async function deleteManagedUpload(backgroundImageUrl: string | null): Promise<void> {
  const uploadPath = managedUploadPath(backgroundImageUrl);
  if (!uploadPath) {
    return;
  }

  try {
    await fs.unlink(uploadPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      throw error;
    }
  }
}

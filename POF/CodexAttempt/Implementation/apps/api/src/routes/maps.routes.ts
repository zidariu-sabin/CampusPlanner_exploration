import fs from 'node:fs/promises';
import path from 'node:path';

import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { AppDataSource } from '../data-source.js';
import { config } from '../config.js';
import { FloorMapEntity } from '../entities/floor-map.entity.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getMapOrFail, replaceRooms, resolveParentMapIdOrFail } from '../services/map.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { processMapBackgroundImage } from '../utils/background-image.js';
import { HttpError } from '../utils/http-error.js';
import { toMapDto, toMapSummaryDto } from '../utils/serializers.js';
import { ensurePolygon } from '../utils/validation.js';

function routeParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  throw new HttpError(400, `Missing route parameter: ${name}.`);
}

const mapSchema = z.object({
  name: z.string().trim().min(2).max(120),
  floorLabel: z.string().trim().min(1).max(50),
  timezone: z.string().trim().min(1).default('Europe/Bucharest'),
  parentMapId: z.string().uuid().nullable().optional().default(null),
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

export const mapsRouter = Router();

mapsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (_request, response) => {
    const maps = await AppDataSource.getRepository(FloorMapEntity).find({
      relations: {
        parentMap: true,
        childMaps: true,
        rooms: true,
      },
      order: {
        name: 'ASC',
      },
    });

    response.json(maps.map(toMapSummaryDto));
  }),
);

mapsRouter.get(
  '/:mapId',
  authenticate,
  asyncHandler(async (request, response) => {
    response.json(toMapDto(await getMapOrFail(routeParam(request.params.mapId, 'mapId'))));
  }),
);

mapsRouter.post(
  '/',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (request, response) => {
    const body = mapSchema.parse(request.body);
    const map = AppDataSource.getRepository(FloorMapEntity).create({
      name: body.name,
      floorLabel: body.floorLabel,
      timezone: body.timezone,
      parentMapId: await resolveParentMapIdOrFail(null, body.parentMapId),
      footprintGeoJson: ensurePolygon(body.footprintGeoJson),
      backgroundFitMode: 'contain',
    });

    await AppDataSource.getRepository(FloorMapEntity).save(map);
    response.status(201).json(toMapDto(await getMapOrFail(map.id)));
  }),
);

mapsRouter.patch(
  '/:mapId',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (request, response) => {
    const body = mapSchema.parse(request.body);
    const map = await getMapOrFail(routeParam(request.params.mapId, 'mapId'));
    map.name = body.name;
    map.floorLabel = body.floorLabel;
    map.timezone = body.timezone;
    map.parentMapId = await resolveParentMapIdOrFail(map.id, body.parentMapId);
    map.footprintGeoJson = ensurePolygon(body.footprintGeoJson);

    await AppDataSource.getRepository(FloorMapEntity).save(map);
    response.json(toMapDto(await getMapOrFail(map.id)));
  }),
);

mapsRouter.post(
  '/:mapId/background-image',
  authenticate,
  requireRole('admin'),
  upload.single('image'),
  asyncHandler(async (request, response) => {
    if (!request.file) {
      throw new HttpError(400, 'An image file is required.');
    }

    const map = await getMapOrFail(routeParam(request.params.mapId, 'mapId'));
    const previousBackgroundImageUrl = map.backgroundImageUrl;
    map.backgroundImageUrl = `/uploads/${request.file.filename}`;
    await AppDataSource.getRepository(FloorMapEntity).save(map);
    await deleteManagedUpload(previousBackgroundImageUrl);

    response.json(toMapDto(await getMapOrFail(map.id)));
  }),
);

mapsRouter.post(
  '/:mapId/background-image/process',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (request, response) => {
    const body = processBackgroundImageSchema.parse(request.body);
    const map = await getMapOrFail(routeParam(request.params.mapId, 'mapId'));

    if (!map.backgroundImageUrl) {
      throw new HttpError(400, 'Upload a background image before applying image edits.');
    }

    const sourcePath = managedUploadPath(map.backgroundImageUrl);
    if (!sourcePath) {
      throw new HttpError(400, 'Only locally uploaded background images can be processed.');
    }

    const processedBackground = await processMapBackgroundImage(sourcePath, map.footprintGeoJson, body);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const outputPath = path.join(config.uploadsDir, fileName);
    const previousBackgroundImageUrl = map.backgroundImageUrl;

    await fs.writeFile(outputPath, processedBackground);
    map.backgroundImageUrl = `/uploads/${fileName}`;
    await AppDataSource.getRepository(FloorMapEntity).save(map);
    await deleteManagedUpload(previousBackgroundImageUrl);

    response.json(toMapDto(await getMapOrFail(map.id)));
  }),
);

mapsRouter.put(
  '/:mapId/rooms',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (request, response) => {
    const body = replaceRoomsSchema.parse(request.body);
    const map = await replaceRooms(
      routeParam(request.params.mapId, 'mapId'),
      body.rooms.map((room) => ({
        ...room,
        geometryGeoJson: ensurePolygon(room.geometryGeoJson),
      })),
    );

    response.json(toMapDto(map));
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

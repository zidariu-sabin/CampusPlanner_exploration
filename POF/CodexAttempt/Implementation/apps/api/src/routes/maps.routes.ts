import fs from 'node:fs/promises';
import path from 'node:path';

import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { AppDataSource } from '../data-source.js';
import { config } from '../config.js';
import { FloorMapEntity } from '../entities/floor-map.entity.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getMapOrFail, replaceRooms } from '../services/map.service.js';
import { asyncHandler } from '../utils/async-handler.js';
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
    map.backgroundImageUrl = `/uploads/${request.file.filename}`;
    await AppDataSource.getRepository(FloorMapEntity).save(map);

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

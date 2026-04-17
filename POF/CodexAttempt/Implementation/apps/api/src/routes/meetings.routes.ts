import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/auth.js';
import { createMeeting, deleteMeeting, listMeetingsByMapAndDate, loadMeetingOrFail, updateMeeting } from '../services/meeting.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';
import { toMeetingDto } from '../utils/serializers.js';

const meetingSchema = z.object({
  roomId: z.uuid(),
  title: z.string().trim().min(1).max(120),
  description: z.string().max(2000).default(''),
  localDate: z.iso.date(),
  hour: z.number().int().min(0).max(23),
  participantUserIds: z.array(z.uuid()).default([]),
});

const querySchema = z.object({
  mapId: z.uuid(),
  date: z.iso.date(),
});

export const meetingsRouter = Router();

function routeParam(value: string | string[] | undefined, name: string): string {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  throw new HttpError(400, `Missing route parameter: ${name}.`);
}

meetingsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (request, response) => {
    const query = querySchema.parse(request.query);
    const meetings = await listMeetingsByMapAndDate(query.mapId, query.date);
    return response.json(meetings.map(toMeetingDto));
  }),
);

meetingsRouter.post(
  '/',
  authenticate,
  asyncHandler(async (request, response) => {
    const body = meetingSchema.parse(request.body);
    response.status(201).json(toMeetingDto(await createMeeting({ ...body, createdBy: request.user! })));
  }),
);

meetingsRouter.patch(
  '/:meetingId',
  authenticate,
  asyncHandler(async (request, response) => {
    const body = meetingSchema.parse(request.body);
    response.json(
      toMeetingDto(
        await updateMeeting(routeParam(request.params.meetingId, 'meetingId'), {
          ...body,
          actor: request.user!,
        }),
      ),
    );
  }),
);

meetingsRouter.delete(
  '/:meetingId',
  authenticate,
  asyncHandler(async (request, response) => {
    const meetingId = routeParam(request.params.meetingId, 'meetingId');
    await loadMeetingOrFail(meetingId).catch(() => {
      throw new HttpError(404, 'Meeting not found.');
    });
    await deleteMeeting(meetingId, request.user!);
    response.status(204).send();
  }),
);

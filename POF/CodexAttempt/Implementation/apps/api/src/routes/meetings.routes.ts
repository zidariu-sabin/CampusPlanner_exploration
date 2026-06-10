import { Router } from 'express';
import { z } from 'zod';

import { authenticate } from '../middleware/auth.js';
import {
  createMeeting,
  deleteMeeting,
  listMeetingsByResourceAndDate,
  listMyMeetings,
  loadMeetingOrFail,
  updateMeeting,
} from '../services/meeting.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';
import { toMeetingDto } from '../utils/serializers.js';

const meetingSchema = z.object({
  bookableResourceId: z.uuid(),
  title: z.string().trim().min(1).max(120),
  description: z.string().max(2000).default(''),
  localDate: z.iso.date(),
  hour: z.number().int().min(0).max(23),
  participantUserIds: z.array(z.uuid()).default([]),
});

const querySchema = z.object({
  bookableResourceId: z.uuid(),
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
    const meetings = await listMeetingsByResourceAndDate(
      request.user!.organizationId,
      query.bookableResourceId,
      query.date,
    );
    return response.json(meetings.map(toMeetingDto));
  }),
);

meetingsRouter.get(
  '/mine',
  authenticate,
  asyncHandler(async (request, response) => {
    const meetings = await listMyMeetings(request.user!);
    return response.json(meetings.map(toMeetingDto));
  }),
);

meetingsRouter.get(
  '/:meetingId',
  authenticate,
  asyncHandler(async (request, response) => {
    const meeting = await loadMeetingOrFail(
      request.user!.organizationId,
      routeParam(request.params.meetingId, 'meetingId'),
    );
    return response.json(toMeetingDto(meeting));
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
    await deleteMeeting(routeParam(request.params.meetingId, 'meetingId'), request.user!);
    response.status(204).send();
  }),
);

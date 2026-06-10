import { Between, In } from 'typeorm';

import { buildDayUtcRange, buildMeetingWindow } from '../utils/time.js';

import { AppDataSource } from '../data-source.js';
import { MeetingEntity } from '../entities/meeting.entity.js';
import { UserEntity } from '../entities/user.entity.js';
import { HttpError } from '../utils/http-error.js';
import { resourceCampus } from '../utils/serializers.js';
import { getBookableResourceOrFail } from './bookable-resource.service.js';

const meetingRepository = () => AppDataSource.getRepository(MeetingEntity);
const userRepository = () => AppDataSource.getRepository(UserEntity);

const meetingRelations = {
  bookableResource: {
    room: {
      floorMap: {
        building: {
          campusPlace: {
            campus: true,
          },
        },
      },
    },
    campusPlace: {
      campus: true,
    },
  },
  createdBy: true,
  participants: true,
} as const;

/** Meeting participants must belong to the same organization as the creator. */
async function findParticipants(ids: string[], creator: UserEntity): Promise<UserEntity[]> {
  const uniqueIds = Array.from(new Set([creator.id, ...ids]));
  const users = await userRepository().findBy({
    id: In(uniqueIds),
    organizationId: creator.organizationId,
  });

  if (users.length !== uniqueIds.length) {
    throw new HttpError(400, 'One or more participants do not exist in your organization.');
  }

  return users;
}

export async function createMeeting(input: {
  bookableResourceId: string;
  title: string;
  description: string;
  localDate: string;
  hour: number;
  participantUserIds: string[];
  createdBy: UserEntity;
}): Promise<MeetingEntity> {
  const resource = await getBookableResourceOrFail(input.createdBy.organizationId, input.bookableResourceId);
  const timezone = resourceCampus(resource).timezone;
  const window = buildMeetingWindow(timezone, input.localDate, input.hour);
  const participants = await findParticipants(input.participantUserIds, input.createdBy);

  const meeting = meetingRepository().create({
    bookableResourceId: resource.id,
    title: input.title.trim(),
    description: input.description.trim(),
    startsAtUtc: window.startsAtUtc,
    endsAtUtc: window.endsAtUtc,
    createdByUserId: input.createdBy.id,
    participants,
  });

  await meetingRepository().save(meeting);
  return loadMeetingOrFail(input.createdBy.organizationId, meeting.id);
}

function canManageMeeting(actor: UserEntity, meeting: MeetingEntity): boolean {
  return actor.role === 'owner' || actor.role === 'admin' || meeting.createdByUserId === actor.id;
}

export async function updateMeeting(
  meetingId: string,
  input: {
    bookableResourceId: string;
    title: string;
    description: string;
    localDate: string;
    hour: number;
    participantUserIds: string[];
    actor: UserEntity;
  },
): Promise<MeetingEntity> {
  const meeting = await loadMeetingOrFail(input.actor.organizationId, meetingId);
  if (!canManageMeeting(input.actor, meeting)) {
    throw new HttpError(403, 'Only the meeting creator or an organization admin can update this meeting.');
  }

  const resource = await getBookableResourceOrFail(input.actor.organizationId, input.bookableResourceId);
  const timezone = resourceCampus(resource).timezone;
  const window = buildMeetingWindow(timezone, input.localDate, input.hour);
  const participants = await findParticipants(input.participantUserIds, input.actor);

  meeting.bookableResourceId = resource.id;
  meeting.title = input.title.trim();
  meeting.description = input.description.trim();
  meeting.startsAtUtc = window.startsAtUtc;
  meeting.endsAtUtc = window.endsAtUtc;
  meeting.participants = participants;

  await meetingRepository().save(meeting);
  return loadMeetingOrFail(input.actor.organizationId, meeting.id);
}

export async function deleteMeeting(meetingId: string, actor: UserEntity): Promise<void> {
  const meeting = await loadMeetingOrFail(actor.organizationId, meetingId);
  if (!canManageMeeting(actor, meeting)) {
    throw new HttpError(403, 'Only the meeting creator or an organization admin can delete this meeting.');
  }

  await meetingRepository().delete({ id: meetingId });
}

export async function listMeetingsByResourceAndDate(
  organizationId: string,
  bookableResourceId: string,
  localDate: string,
): Promise<MeetingEntity[]> {
  const resource = await getBookableResourceOrFail(organizationId, bookableResourceId);
  const range = buildDayUtcRange(resourceCampus(resource).timezone, localDate);

  return meetingRepository().find({
    where: {
      bookableResourceId: resource.id,
      startsAtUtc: Between(range.start, range.end),
    },
    relations: meetingRelations,
    order: { startsAtUtc: 'ASC' },
  });
}

/** Upcoming meetings the user created or participates in. */
export async function listMyMeetings(user: UserEntity): Promise<MeetingEntity[]> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const meetingIds = await meetingRepository()
    .createQueryBuilder('meeting')
    .select('meeting.id', 'id')
    .leftJoin('meeting.participants', 'participant')
    .where('meeting.ends_at_utc >= :cutoff', { cutoff })
    .andWhere('(meeting.created_by_user_id = :userId OR participant.id = :userId)', { userId: user.id })
    .getRawMany<{ id: string }>();

  if (meetingIds.length === 0) {
    return [];
  }

  return meetingRepository().find({
    where: { id: In(meetingIds.map((row) => row.id)) },
    relations: meetingRelations,
    order: { startsAtUtc: 'ASC' },
  });
}

export async function loadMeetingOrFail(organizationId: string, meetingId: string): Promise<MeetingEntity> {
  const meeting = await meetingRepository().findOne({
    where: { id: meetingId },
    relations: meetingRelations,
  });

  if (!meeting || meeting.bookableResource.organizationId !== organizationId) {
    throw new HttpError(404, 'Meeting not found.');
  }

  return meeting;
}

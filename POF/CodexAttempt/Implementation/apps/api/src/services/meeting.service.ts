import { Between, In } from 'typeorm';

import { buildDayUtcRange, buildMeetingWindow } from '../utils/time.js';

import { AppDataSource } from '../data-source.js';
import { MeetingEntity } from '../entities/meeting.entity.js';
import { RoomEntity } from '../entities/room.entity.js';
import { UserEntity } from '../entities/user.entity.js';
import { HttpError } from '../utils/http-error.js';

const meetingRepository = () => AppDataSource.getRepository(MeetingEntity);
const roomRepository = () => AppDataSource.getRepository(RoomEntity);
const userRepository = () => AppDataSource.getRepository(UserEntity);

export async function getRoomOrFail(roomId: string): Promise<RoomEntity> {
  const room = await roomRepository().findOne({
    where: { id: roomId },
    relations: { map: true },
  });

  if (!room) {
    throw new HttpError(404, 'Room not found.');
  }

  return room;
}

async function findParticipants(ids: string[], creator: UserEntity): Promise<UserEntity[]> {
  const uniqueIds = Array.from(new Set([creator.id, ...ids]));
  const users = await userRepository().findBy({ id: In(uniqueIds) });
  if (users.length !== uniqueIds.length) {
    throw new HttpError(400, 'One or more participants do not exist.');
  }

  return users;
}

export async function createMeeting(input: {
  roomId: string;
  title: string;
  description: string;
  localDate: string;
  hour: number;
  participantUserIds: string[];
  createdBy: UserEntity;
}): Promise<MeetingEntity> {
  const room = await getRoomOrFail(input.roomId);
  const window = buildMeetingWindow(room.map.timezone, input.localDate, input.hour);
  const participants = await findParticipants(input.participantUserIds, input.createdBy);

  const meeting = meetingRepository().create({
    roomId: room.id,
    title: input.title.trim(),
    description: input.description.trim(),
    startsAtUtc: window.startsAtUtc,
    endsAtUtc: window.endsAtUtc,
    createdByUserId: input.createdBy.id,
    participants,
  });

  await meetingRepository().save(meeting);
  return loadMeetingOrFail(meeting.id);
}

export async function updateMeeting(
  meetingId: string,
  input: {
    roomId: string;
    title: string;
    description: string;
    localDate: string;
    hour: number;
    participantUserIds: string[];
    actor: UserEntity;
  },
): Promise<MeetingEntity> {
  const meeting = await loadMeetingOrFail(meetingId);
  if (input.actor.role !== 'admin' && meeting.createdByUserId !== input.actor.id) {
    throw new HttpError(403, 'Only the meeting creator or an admin can update this meeting.');
  }

  const room = await getRoomOrFail(input.roomId);
  const window = buildMeetingWindow(room.map.timezone, input.localDate, input.hour);
  const participants = await findParticipants(input.participantUserIds, input.actor);

  meeting.roomId = room.id;
  meeting.title = input.title.trim();
  meeting.description = input.description.trim();
  meeting.startsAtUtc = window.startsAtUtc;
  meeting.endsAtUtc = window.endsAtUtc;
  meeting.participants = participants;

  await meetingRepository().save(meeting);
  return loadMeetingOrFail(meeting.id);
}

export async function deleteMeeting(meetingId: string, actor: UserEntity): Promise<void> {
  const meeting = await loadMeetingOrFail(meetingId);
  if (actor.role !== 'admin' && meeting.createdByUserId !== actor.id) {
    throw new HttpError(403, 'Only the meeting creator or an admin can delete this meeting.');
  }

  await meetingRepository().delete({ id: meetingId });
}

export async function listMeetingsByMapAndDate(mapId: string, localDate: string): Promise<MeetingEntity[]> {
  const room = await roomRepository().findOne({
    where: { mapId },
    relations: { map: true },
  });
  if (!room) {
    return [];
  }

  const range = buildDayUtcRange(room.map.timezone, localDate);
  return meetingRepository().find({
    where: {
      startsAtUtc: Between(range.start, range.end),
      room: {
        mapId,
      },
    },
    relations: {
      room: {
        map: true,
      },
      createdBy: true,
      participants: true,
    },
    order: {
      startsAtUtc: 'ASC',
    },
  });
}

export async function loadMeetingOrFail(meetingId: string): Promise<MeetingEntity> {
  const meeting = await meetingRepository().findOne({
    where: { id: meetingId },
    relations: {
      room: {
        map: true,
      },
      createdBy: true,
      participants: true,
    },
  });

  if (!meeting) {
    throw new HttpError(404, 'Meeting not found.');
  }

  return meeting;
}

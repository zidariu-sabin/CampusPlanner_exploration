import { DateTime } from 'luxon';

import { HttpError } from './http-error.js';

export function buildMeetingWindow(timezone: string, localDate: string, hour: number): {
  startsAtUtc: Date;
  endsAtUtc: Date;
} {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new HttpError(400, 'Meeting hour must be an integer between 0 and 23.');
  }

  const start = DateTime.fromISO(`${localDate}T${String(hour).padStart(2, '0')}:00:00`, { zone: timezone });
  if (!start.isValid) {
    throw new HttpError(400, 'Invalid local date or timezone.');
  }

  const end = start.plus({ hours: 1 });
  return {
    startsAtUtc: start.toUTC().toJSDate(),
    endsAtUtc: end.toUTC().toJSDate(),
  };
}

export function toMeetingLocalFields(startsAtUtc: Date, timezone: string): { localDate: string; hour: number } {
  const local = DateTime.fromJSDate(startsAtUtc, { zone: 'utc' }).setZone(timezone);
  return {
    localDate: local.toISODate() ?? '',
    hour: local.hour,
  };
}

export function buildDayUtcRange(timezone: string, localDate: string): { start: Date; end: Date } {
  const start = DateTime.fromISO(`${localDate}T00:00:00`, { zone: timezone });
  if (!start.isValid) {
    throw new HttpError(400, 'Invalid local date.');
  }

  return {
    start: start.toUTC().toJSDate(),
    end: start.plus({ days: 1 }).toUTC().toJSDate(),
  };
}


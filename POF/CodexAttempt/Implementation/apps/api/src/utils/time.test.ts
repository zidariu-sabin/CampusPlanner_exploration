import { describe, expect, it } from 'vitest';

import { buildMeetingWindow, toMeetingLocalFields } from './time.js';

describe('meeting time helpers', () => {
  it('converts local map time to UTC and back', () => {
    const window = buildMeetingWindow('Europe/Bucharest', '2026-04-14', 10);
    const local = toMeetingLocalFields(window.startsAtUtc, 'Europe/Bucharest');

    expect(local.localDate).toBe('2026-04-14');
    expect(local.hour).toBe(10);
    expect(window.endsAtUtc.getTime() - window.startsAtUtc.getTime()).toBe(60 * 60 * 1000);
  });
});

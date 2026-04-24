import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppDataSource } from '../data-source.js';
import { HttpError } from '../utils/http-error.js';
import { resolveParentMapIdOrFail } from './map.service.js';

interface MockMapRecord {
  id: string;
  parentMapId: string | null;
}

describe('resolveParentMapIdOrFail', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows root maps without querying the repository', async () => {
    const repositorySpy = vi.spyOn(AppDataSource, 'getRepository');

    await expect(resolveParentMapIdOrFail(null, null)).resolves.toBeNull();
    expect(repositorySpy).not.toHaveBeenCalled();
  });

  it('accepts a valid parent map', async () => {
    mockMapRepository({
      building: { id: 'building', parentMapId: null },
    });

    await expect(resolveParentMapIdOrFail(null, 'building')).resolves.toBe('building');
  });

  it('rejects a nonexistent parent map', async () => {
    mockMapRepository({});

    await expect(resolveParentMapIdOrFail(null, 'missing-parent')).rejects.toMatchObject<HttpError>({
      status: 400,
      message: 'Parent map not found.',
    });
  });

  it('rejects setting a map as its own parent', async () => {
    await expect(resolveParentMapIdOrFail('campus', 'campus')).rejects.toMatchObject<HttpError>({
      status: 400,
      message: 'A map cannot be its own parent.',
    });
  });

  it('rejects cycles across multiple levels', async () => {
    mockMapRepository({
      floor: { id: 'floor', parentMapId: 'building' },
      building: { id: 'building', parentMapId: 'campus' },
      campus: { id: 'campus', parentMapId: null },
    });

    await expect(resolveParentMapIdOrFail('campus', 'floor')).rejects.toMatchObject<HttpError>({
      status: 400,
      message: 'A map cannot be assigned to one of its descendants.',
    });
  });
});

function mockMapRepository(records: Record<string, MockMapRecord>) {
  vi.spyOn(AppDataSource, 'getRepository').mockReturnValue({
    findOne: vi.fn(async ({ where }: { where: { id: string } }) => records[where.id] ?? null),
  } as never);
}

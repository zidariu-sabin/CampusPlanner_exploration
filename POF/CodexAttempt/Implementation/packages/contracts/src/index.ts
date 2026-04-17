export type Role = 'admin' | 'user';
export type BackgroundFitMode = 'contain';

export type GeoJsonPosition = [number, number];

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: GeoJsonPosition[][];
}

export interface UserSummaryDto {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}

export interface AuthResponseDto {
  token: string;
  expiresInSeconds: number;
  user: UserSummaryDto;
}

export interface RoomDto {
  id: string;
  mapId: string;
  name: string;
  color: string;
  sortOrder: number;
  geometryGeoJson: GeoJsonPolygon;
}

export interface MapSummaryDto {
  id: string;
  name: string;
  floorLabel: string;
  timezone: string;
  backgroundImageUrl: string | null;
  backgroundFitMode: BackgroundFitMode;
  roomCount: number;
}

export interface MapDto extends MapSummaryDto {
  footprintGeoJson: GeoJsonPolygon;
  rooms: RoomDto[];
}

export interface MeetingDto {
  id: string;
  roomId: string;
  mapId: string;
  title: string;
  description: string;
  startsAtUtc: string;
  endsAtUtc: string;
  localDate: string;
  hour: number;
  createdBy: UserSummaryDto;
  participants: UserSummaryDto[];
}

export interface CreateMapRequest {
  name: string;
  floorLabel: string;
  timezone?: string;
  footprintGeoJson: GeoJsonPolygon;
}

export interface UpdateMapRequest extends CreateMapRequest {}

export interface EditableRoomInput {
  id?: string;
  name: string;
  color: string;
  sortOrder: number;
  geometryGeoJson: GeoJsonPolygon;
}

export interface ReplaceRoomsRequest {
  rooms: EditableRoomInput[];
}

export interface CreateMeetingRequest {
  roomId: string;
  title: string;
  description: string;
  localDate: string;
  hour: number;
  participantUserIds: string[];
}

export interface UpdateMeetingRequest extends CreateMeetingRequest {}

export interface EditorRoomModel {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sortOrder: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function closeRing(points: GeoJsonPosition[]): GeoJsonPosition[] {
  if (points.length === 0) {
    return points;
  }

  const [firstX, firstY] = points[0];
  const last = points[points.length - 1];
  if (last[0] === firstX && last[1] === firstY) {
    return points;
  }

  return [...points, [firstX, firstY]];
}

export function createPolygon(points: GeoJsonPosition[]): GeoJsonPolygon {
  return {
    type: 'Polygon',
    coordinates: [closeRing(points)],
  };
}

export function createRectanglePolygon(
  x: number,
  y: number,
  width: number,
  height: number,
): GeoJsonPolygon {
  return createPolygon([
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ]);
}

export function getOuterRing(polygon: GeoJsonPolygon): GeoJsonPosition[] {
  return polygon.coordinates[0] ?? [];
}

export function getBoundingBox(polygon: GeoJsonPolygon): BoundingBox {
  const points = getOuterRing(polygon);
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function polygonToPointsAttribute(polygon: GeoJsonPolygon): string {
  return getOuterRing(polygon)
    .slice(0, -1)
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
}

function isPointOnSegment(point: GeoJsonPosition, start: GeoJsonPosition, end: GeoJsonPosition): boolean {
  const [px, py] = point;
  const [sx, sy] = start;
  const [ex, ey] = end;
  const cross = (py - sy) * (ex - sx) - (px - sx) * (ey - sy);

  if (Math.abs(cross) > 1e-9) {
    return false;
  }

  const dot = (px - sx) * (px - ex) + (py - sy) * (py - ey);
  return dot <= 1e-9;
}

export function isPointInPolygon(point: GeoJsonPosition, polygon: GeoJsonPolygon): boolean {
  const ring = getOuterRing(polygon);
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index];
    const prior = ring[previous];

    if (isPointOnSegment(point, prior, current)) {
      return true;
    }

    const intersects =
      current[1] > point[1] !== prior[1] > point[1] &&
      point[0] <
        ((prior[0] - current[0]) * (point[1] - current[1])) / (prior[1] - current[1] || 1e-12) +
          current[0];

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function orientation(a: GeoJsonPosition, b: GeoJsonPosition, c: GeoJsonPosition): number {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(value) < 1e-9) {
    return 0;
  }

  return value > 0 ? 1 : 2;
}

function segmentsIntersect(
  startA: GeoJsonPosition,
  endA: GeoJsonPosition,
  startB: GeoJsonPosition,
  endB: GeoJsonPosition,
): boolean {
  const o1 = orientation(startA, endA, startB);
  const o2 = orientation(startA, endA, endB);
  const o3 = orientation(startB, endB, startA);
  const o4 = orientation(startB, endB, endA);

  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  return (
    (o1 === 0 && isPointOnSegment(startB, startA, endA)) ||
    (o2 === 0 && isPointOnSegment(endB, startA, endA)) ||
    (o3 === 0 && isPointOnSegment(startA, startB, endB)) ||
    (o4 === 0 && isPointOnSegment(endA, startB, endB))
  );
}

export function polygonContainsPolygon(container: GeoJsonPolygon, candidate: GeoJsonPolygon): boolean {
  const containerRing = getOuterRing(container);
  const candidateRing = getOuterRing(candidate);
  const candidatePoints = candidateRing.slice(0, -1);

  if (candidatePoints.some((point) => !isPointInPolygon(point, container))) {
    return false;
  }

  for (let i = 0; i < candidatePoints.length; i += 1) {
    const candidateStart = candidateRing[i];
    const candidateEnd = candidateRing[i + 1];

    for (let j = 0; j < containerRing.length - 1; j += 1) {
      const containerStart = containerRing[j];
      const containerEnd = containerRing[j + 1];

      if (
        segmentsIntersect(candidateStart, candidateEnd, containerStart, containerEnd) &&
        !isPointOnSegment(candidateStart, containerStart, containerEnd) &&
        !isPointOnSegment(candidateEnd, containerStart, containerEnd)
      ) {
        return false;
      }
    }
  }

  return true;
}

export function roomModelToPolygon(room: Pick<EditorRoomModel, 'x' | 'y' | 'width' | 'height'>): GeoJsonPolygon {
  return createRectanglePolygon(room.x, room.y, room.width, room.height);
}

export function polygonToRoomModel(
  polygon: GeoJsonPolygon,
  base: Pick<EditorRoomModel, 'id' | 'name' | 'color' | 'sortOrder'>,
): EditorRoomModel {
  const box = getBoundingBox(polygon);
  return {
    ...base,
    x: box.minX,
    y: box.minY,
    width: box.width,
    height: box.height,
  };
}


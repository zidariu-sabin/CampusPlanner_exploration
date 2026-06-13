export type OrganizationRole = 'owner' | 'admin' | 'member';
export type Role = OrganizationRole;
export type BackgroundFitMode = 'contain';

export type CampusPlaceType =
  | 'building'
  | 'sports_field'
  | 'tennis_court'
  | 'parking'
  | 'outdoor_area'
  | 'other';

export type BookableResourceKind = 'room' | 'campus_place';

export type GeoJsonPosition = [number, number];

const WEB_MERCATOR_RADIUS_METERS = 6378137;
const MAX_WEB_MERCATOR_LATITUDE = 85.05112878;

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: GeoJsonPosition[][];
}

export interface UserSummaryDto {
  id: string;
  email: string;
  displayName: string;
  role: OrganizationRole;
  organizationId: string;
}

export interface AuthResponseDto {
  token: string;
  expiresInSeconds: number;
  user: UserSummaryDto;
  organization: OrganizationDto;
}

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
}

export interface OrganizationInviteDto {
  id: string;
  token: string;
  role: OrganizationRole;
  email: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface CreateInviteRequest {
  role: Exclude<OrganizationRole, 'owner'>;
  email?: string | null;
  expiresInDays?: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  organizationName: string;
}

export interface RegisterWithInviteRequest {
  email: string;
  password: string;
  displayName: string;
  inviteToken: string;
}

export interface CampusSummaryDto {
  id: string;
  name: string;
  timezone: string;
  boundaryGeoJson: GeoJsonPolygon | null;
  /**
   * Camera-fit extent for overviews: the campus boundary if set, otherwise the
   * bounding rectangle of the campus's place footprints, or null if empty.
   */
  extentGeoJson: GeoJsonPolygon | null;
  placeCount: number;
  buildingCount: number;
  floorCount: number;
  roomCount: number;
}

export interface CampusDto extends CampusSummaryDto {
  places: CampusPlaceDto[];
}

export interface CreateCampusRequest {
  name: string;
  timezone?: string;
  boundaryGeoJson?: GeoJsonPolygon | null;
}

export interface UpdateCampusRequest extends CreateCampusRequest {}

export interface CampusPlaceDto {
  id: string;
  campusId: string;
  name: string;
  type: CampusPlaceType;
  bookable: boolean;
  footprintGeoJson: GeoJsonPolygon;
  buildingId: string | null;
  bookableResourceId: string | null;
  floorCount: number;
}

export interface CreateCampusPlaceRequest {
  name: string;
  type: CampusPlaceType;
  bookable?: boolean;
  footprintGeoJson: GeoJsonPolygon;
}

export interface UpdateCampusPlaceRequest extends CreateCampusPlaceRequest {}

export interface BookableResourceDto {
  id: string;
  kind: BookableResourceKind;
  name: string;
  campusId: string;
  campusName: string;
  timezone: string;
  campusPlaceId: string | null;
  campusPlaceName: string | null;
  roomId: string | null;
  floorMapId: string | null;
  floorLabel: string | null;
}

export interface RoomDto {
  id: string;
  floorMapId: string;
  name: string;
  color: string;
  sortOrder: number;
  geometryGeoJson: GeoJsonPolygon;
  bookableResourceId: string | null;
}

export interface FloorMapSummaryDto {
  id: string;
  buildingId: string;
  campusPlaceId: string;
  campusPlaceName: string;
  campusId: string;
  name: string;
  floorLabel: string;
  timezone: string;
  backgroundImageUrl: string | null;
  backgroundFitMode: BackgroundFitMode;
  roomCount: number;
}

export interface FloorMapDto extends FloorMapSummaryDto {
  footprintGeoJson: GeoJsonPolygon;
  rooms: RoomDto[];
}

/** Compatibility aliases: older frontend code refers to floor maps as "maps". */
export type MapSummaryDto = FloorMapSummaryDto;
export type MapDto = FloorMapDto;

/**
 * A room match returned by the org-wide room search, carrying the full
 * campus → space → floor context needed to drive the map selection chain.
 */
export interface RoomSearchResultDto {
  roomId: string;
  roomName: string;
  floorMapId: string;
  floorLabel: string;
  buildingId: string;
  campusPlaceId: string;
  campusPlaceName: string;
  campusId: string;
  campusName: string;
  bookableResourceId: string | null;
}

export interface MeetingDto {
  id: string;
  bookableResourceId: string;
  roomId: string | null;
  floorMapId: string | null;
  title: string;
  description: string;
  startsAtUtc: string;
  endsAtUtc: string;
  localDate: string;
  hour: number;
  createdBy: UserSummaryDto;
  participants: UserSummaryDto[];
}

export interface CreateFloorMapRequest {
  name: string;
  floorLabel: string;
  footprintGeoJson: GeoJsonPolygon;
}

export interface UpdateFloorMapRequest extends CreateFloorMapRequest {}

/** Compatibility aliases for the floor-map request types. */
export type CreateMapRequest = CreateFloorMapRequest;
export type UpdateMapRequest = UpdateFloorMapRequest;

export interface NormalizedRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessBackgroundImageRequest {
  rotationDegrees: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  cropRect: NormalizedRectangle;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
}

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
  bookableResourceId: string;
  title: string;
  description: string;
  localDate: string;
  hour: number;
  participantUserIds: string[];
}

export interface UpdateMeetingRequest extends CreateMeetingRequest {}

export type EditorRoomShape = 'rectangle' | 'polygon';

export interface EditorRoomModel {
  id: string;
  name: string;
  color: string;
  shape: EditorRoomShape;
  x: number;
  y: number;
  width: number;
  height: number;
  sortOrder: number;
  geometryGeoJson: GeoJsonPolygon;
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

export function createRectanglePolygon(x: number, y: number, width: number, height: number): GeoJsonPolygon {
  return createPolygon([
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ]);
}

export function projectGeoJsonPosition(position: GeoJsonPosition): GeoJsonPosition {
  const [longitude, latitude] = position;
  const clampedLatitude = Math.min(Math.max(latitude, -MAX_WEB_MERCATOR_LATITUDE), MAX_WEB_MERCATOR_LATITUDE);
  const x = WEB_MERCATOR_RADIUS_METERS * degreesToRadians(longitude);
  const mercatorY =
    WEB_MERCATOR_RADIUS_METERS * Math.log(Math.tan(Math.PI / 4 + degreesToRadians(clampedLatitude) / 2));

  return [x, -mercatorY];
}

export function unprojectGeoJsonPosition(position: GeoJsonPosition): GeoJsonPosition {
  const [x, y] = position;
  const longitude = radiansToDegrees(x / WEB_MERCATOR_RADIUS_METERS);
  const latitude = radiansToDegrees(Math.atan(Math.sinh(-y / WEB_MERCATOR_RADIUS_METERS)));

  return [longitude, latitude];
}

export function projectGeoJsonPolygon(polygon: GeoJsonPolygon): GeoJsonPolygon {
  return transformPolygonPositions(polygon, projectGeoJsonPosition);
}

export function unprojectGeoJsonPolygon(polygon: GeoJsonPolygon): GeoJsonPolygon {
  return transformPolygonPositions(polygon, unprojectGeoJsonPosition);
}

export function getProjectedBoundingBox(polygon: GeoJsonPolygon): BoundingBox {
  return getBoundingBox(projectGeoJsonPolygon(polygon));
}

export function projectedPolygonToPointsAttribute(polygon: GeoJsonPolygon): string {
  return polygonToPointsAttribute(projectGeoJsonPolygon(polygon));
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

function isPointOnSegment(
  point: GeoJsonPosition,
  start: GeoJsonPosition,
  end: GeoJsonPosition,
): boolean {
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
      point[0] < ((prior[0] - current[0]) * (point[1] - current[1])) / (prior[1] - current[1] || 1e-12) + current[0];

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

export function polygonContainsPolygon(
  container: GeoJsonPolygon,
  candidate: GeoJsonPolygon,
): boolean {
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

export function roomModelToPolygon(
  room: Pick<EditorRoomModel, 'x' | 'y' | 'width' | 'height'> &
    Partial<Pick<EditorRoomModel, 'shape' | 'geometryGeoJson'>>,
): GeoJsonPolygon {
  if (room.shape === 'polygon' && room.geometryGeoJson) {
    return room.geometryGeoJson;
  }

  return createRectanglePolygon(room.x, room.y, room.width, room.height);
}

export function polygonToRoomModel(
  polygon: GeoJsonPolygon,
  base: Pick<EditorRoomModel, 'id' | 'name' | 'color' | 'sortOrder'>,
): EditorRoomModel {
  const box = getBoundingBox(polygon);
  const shape: EditorRoomShape = isAxisAlignedRectangle(polygon, box) ? 'rectangle' : 'polygon';

  return {
    ...base,
    shape,
    x: box.minX,
    y: box.minY,
    width: box.width,
    height: box.height,
    geometryGeoJson:
      shape === 'rectangle' ? createRectanglePolygon(box.minX, box.minY, box.width, box.height) : polygon,
  };
}

function isAxisAlignedRectangle(polygon: GeoJsonPolygon, box: BoundingBox): boolean {
  const ring = getOuterRing(polygon);
  if (ring.length !== 5) {
    return false;
  }

  const expected = closeRing([
    [box.minX, box.minY],
    [box.maxX, box.minY],
    [box.maxX, box.maxY],
    [box.minX, box.maxY],
  ]);

  return ring.every((point, index) => point[0] === expected[index][0] && point[1] === expected[index][1]);
}

function transformPolygonPositions(
  polygon: GeoJsonPolygon,
  transform: (position: GeoJsonPosition) => GeoJsonPosition,
): GeoJsonPolygon {
  return {
    ...polygon,
    coordinates: polygon.coordinates.map((ring) => ring.map(transform)),
  };
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

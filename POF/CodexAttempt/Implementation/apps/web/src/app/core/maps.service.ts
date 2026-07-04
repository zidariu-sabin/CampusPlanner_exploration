import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  FloorMapDto,
  FloorMapSummaryDto,
  ProcessBackgroundImageRequest,
  ReplaceRoomsRequest,
  UpdateFloorMapRequest,
} from '@campus/contracts';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from './api';

/** Floor-map API client. Floor maps are created through FloorsService under a building. */
@Injectable({ providedIn: 'root' })
export class MapsService {
  private readonly http = inject(HttpClient);

  list(): Promise<FloorMapSummaryDto[]> {
    return firstValueFrom(this.http.get<FloorMapSummaryDto[]>(apiUrl('/floor-maps')));
  }

  get(floorMapId: string): Promise<FloorMapDto> {
    return firstValueFrom(this.http.get<FloorMapDto>(apiUrl(`/floor-maps/${floorMapId}`)));
  }

  update(floorMapId: string, payload: UpdateFloorMapRequest): Promise<FloorMapDto> {
    return firstValueFrom(this.http.patch<FloorMapDto>(apiUrl(`/floor-maps/${floorMapId}`), payload));
  }

  replaceRooms(floorMapId: string, payload: ReplaceRoomsRequest): Promise<FloorMapDto> {
    return firstValueFrom(this.http.put<FloorMapDto>(apiUrl(`/floor-maps/${floorMapId}/rooms`), payload));
  }

  uploadBackground(floorMapId: string, file: File): Promise<FloorMapDto> {
    const formData = new FormData();
    formData.append('image', file);
    return firstValueFrom(this.http.post<FloorMapDto>(apiUrl(`/floor-maps/${floorMapId}/background-image`), formData));
  }

  processBackground(floorMapId: string, payload: ProcessBackgroundImageRequest): Promise<FloorMapDto> {
    return firstValueFrom(
      this.http.post<FloorMapDto>(apiUrl(`/floor-maps/${floorMapId}/background-image/process`), payload),
    );
  }
}

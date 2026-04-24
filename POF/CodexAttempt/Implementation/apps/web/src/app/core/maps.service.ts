import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CreateMapRequest,
  MapDto,
  MapSummaryDto,
  ProcessBackgroundImageRequest,
  ReplaceRoomsRequest,
  UpdateMapRequest,
} from '@campus/contracts';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from './api';

@Injectable({ providedIn: 'root' })
export class MapsService {
  private readonly http = inject(HttpClient);

  list(): Promise<MapSummaryDto[]> {
    return firstValueFrom(this.http.get<MapSummaryDto[]>(apiUrl('/maps')));
  }

  get(mapId: string): Promise<MapDto> {
    return firstValueFrom(this.http.get<MapDto>(apiUrl(`/maps/${mapId}`)));
  }

  create(payload: CreateMapRequest): Promise<MapDto> {
    return firstValueFrom(this.http.post<MapDto>(apiUrl('/maps'), payload));
  }

  update(mapId: string, payload: UpdateMapRequest): Promise<MapDto> {
    return firstValueFrom(this.http.patch<MapDto>(apiUrl(`/maps/${mapId}`), payload));
  }

  replaceRooms(mapId: string, payload: ReplaceRoomsRequest): Promise<MapDto> {
    return firstValueFrom(this.http.put<MapDto>(apiUrl(`/maps/${mapId}/rooms`), payload));
  }

  uploadBackground(mapId: string, file: File): Promise<MapDto> {
    const formData = new FormData();
    formData.append('image', file);
    return firstValueFrom(this.http.post<MapDto>(apiUrl(`/maps/${mapId}/background-image`), formData));
  }

  processBackground(mapId: string, payload: ProcessBackgroundImageRequest): Promise<MapDto> {
    return firstValueFrom(this.http.post<MapDto>(apiUrl(`/maps/${mapId}/background-image/process`), payload));
  }
}

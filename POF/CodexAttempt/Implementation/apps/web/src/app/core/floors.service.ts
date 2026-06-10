import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CreateFloorMapRequest, FloorMapDto, FloorMapSummaryDto } from '@campus/contracts';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from './api';

@Injectable({ providedIn: 'root' })
export class FloorsService {
  private readonly http = inject(HttpClient);

  listForBuilding(buildingId: string): Promise<FloorMapSummaryDto[]> {
    return firstValueFrom(this.http.get<FloorMapSummaryDto[]>(apiUrl(`/buildings/${buildingId}/floors`)));
  }

  createForBuilding(buildingId: string, payload: CreateFloorMapRequest): Promise<FloorMapDto> {
    return firstValueFrom(this.http.post<FloorMapDto>(apiUrl(`/buildings/${buildingId}/floors`), payload));
  }
}

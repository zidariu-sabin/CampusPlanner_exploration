import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CampusDto,
  CampusPlaceDto,
  CampusSummaryDto,
  CreateCampusPlaceRequest,
  CreateCampusRequest,
  UpdateCampusPlaceRequest,
  UpdateCampusRequest,
} from '@campus/contracts';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from './api';

@Injectable({ providedIn: 'root' })
export class CampusesService {
  private readonly http = inject(HttpClient);

  list(): Promise<CampusSummaryDto[]> {
    return firstValueFrom(this.http.get<CampusSummaryDto[]>(apiUrl('/campuses')));
  }

  get(campusId: string): Promise<CampusDto> {
    return firstValueFrom(this.http.get<CampusDto>(apiUrl(`/campuses/${campusId}`)));
  }

  create(payload: CreateCampusRequest): Promise<CampusDto> {
    return firstValueFrom(this.http.post<CampusDto>(apiUrl('/campuses'), payload));
  }

  update(campusId: string, payload: UpdateCampusRequest): Promise<CampusDto> {
    return firstValueFrom(this.http.patch<CampusDto>(apiUrl(`/campuses/${campusId}`), payload));
  }

  delete(campusId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(apiUrl(`/campuses/${campusId}`)));
  }

  createPlace(campusId: string, payload: CreateCampusPlaceRequest): Promise<CampusPlaceDto> {
    return firstValueFrom(this.http.post<CampusPlaceDto>(apiUrl(`/campuses/${campusId}/places`), payload));
  }

  updatePlace(campusId: string, placeId: string, payload: UpdateCampusPlaceRequest): Promise<CampusPlaceDto> {
    return firstValueFrom(
      this.http.patch<CampusPlaceDto>(apiUrl(`/campuses/${campusId}/places/${placeId}`), payload),
    );
  }

  deletePlace(campusId: string, placeId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(apiUrl(`/campuses/${campusId}/places/${placeId}`)));
  }
}

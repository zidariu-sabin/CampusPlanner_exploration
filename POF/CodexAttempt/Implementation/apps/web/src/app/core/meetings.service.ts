import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CreateMeetingRequest, MeetingDto, UpdateMeetingRequest } from '@campus/contracts';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from './api';

@Injectable({ providedIn: 'root' })
export class MeetingsService {
  private readonly http = inject(HttpClient);

  list(mapId: string, date: string): Promise<MeetingDto[]> {
    const params = new HttpParams().set('mapId', mapId).set('date', date);
    return firstValueFrom(this.http.get<MeetingDto[]>(apiUrl('/meetings'), { params }));
  }

  create(payload: CreateMeetingRequest): Promise<MeetingDto> {
    return firstValueFrom(this.http.post<MeetingDto>(apiUrl('/meetings'), payload));
  }

  update(meetingId: string, payload: UpdateMeetingRequest): Promise<MeetingDto> {
    return firstValueFrom(this.http.patch<MeetingDto>(apiUrl(`/meetings/${meetingId}`), payload));
  }

  delete(meetingId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(apiUrl(`/meetings/${meetingId}`)));
  }
}


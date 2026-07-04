import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CreateInviteRequest, OrganizationDto, OrganizationInviteDto } from '@campus/contracts';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from './api';

@Injectable({ providedIn: 'root' })
export class OrganizationsService {
  private readonly http = inject(HttpClient);

  me(): Promise<OrganizationDto> {
    return firstValueFrom(this.http.get<OrganizationDto>(apiUrl('/organizations/me')));
  }

  listInvites(): Promise<OrganizationInviteDto[]> {
    return firstValueFrom(this.http.get<OrganizationInviteDto[]>(apiUrl('/organizations/invites')));
  }

  createInvite(payload: CreateInviteRequest): Promise<OrganizationInviteDto> {
    return firstValueFrom(this.http.post<OrganizationInviteDto>(apiUrl('/organizations/invites'), payload));
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { UserSummaryDto } from '@campus/contracts';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from './api';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  list(): Promise<UserSummaryDto[]> {
    return firstValueFrom(this.http.get<UserSummaryDto[]>(apiUrl('/users')));
  }
}


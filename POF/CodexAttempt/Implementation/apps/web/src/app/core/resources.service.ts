import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BookableResourceDto } from '@campus/contracts';
import { firstValueFrom } from 'rxjs';

import { apiUrl } from './api';

@Injectable({ providedIn: 'root' })
export class ResourcesService {
  private readonly http = inject(HttpClient);

  list(): Promise<BookableResourceDto[]> {
    return firstValueFrom(this.http.get<BookableResourceDto[]>(apiUrl('/bookable-resources')));
  }
}

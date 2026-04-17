import { environment } from '../../environments/environment';

export function apiUrl(path: string): string {
  return `${environment.apiBaseUrl}${path}`;
}

export function assetUrl(path: string | null): string | null {
  if (!path) {
    return null;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return apiUrl(path);
}


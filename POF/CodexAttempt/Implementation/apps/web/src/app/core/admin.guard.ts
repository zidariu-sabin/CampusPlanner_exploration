import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const loginUrl = router.createUrlTree(['/login'], {
    queryParams: { redirectTo: state.url },
  });

  if (!authService.isLoggedIn()) {
    return loginUrl;
  }

  if (!authService.user()) {
    await authService.refreshMe();
  }

  return authService.isAdmin() ? true : router.createUrlTree(['/']);
};

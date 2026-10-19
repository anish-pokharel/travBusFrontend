import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

/** UX only. The API enforces every permission again on the server. */
export const authGuard: CanActivateFn = (_r, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const roleGuard = (...roles: Role[]): CanActivateFn => (_r, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  return roles.includes(auth.role()!) ? true : router.createUrlTree([auth.homeFor(auth.role())]);
};

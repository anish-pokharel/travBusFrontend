import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { API_URL } from './config';

const isAuthCall = (url: string) => /\/auth\/(login|register|refresh|logout|forgot-password|reset-password)/.test(url);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const addToken = (r: typeof req) => (auth.accessToken && r.url.startsWith(API_URL) ? r.clone({ setHeaders: { Authorization: `Bearer ${auth.accessToken}` } }) : r);

  return next(addToken(req)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isAuthCall(req.url) && req.url.startsWith(API_URL)) {
        // access token expired -> try to rotate once, then replay the request
        return from(auth.refresh()).pipe(
          switchMap((ok) => {
            if (!ok) { router.navigate(['/login'], { queryParams: { returnUrl: router.url } }); return throwError(() => err); }
            return next(addToken(req));
          })
        );
      }
      return throwError(() => err);
    })
  );
};

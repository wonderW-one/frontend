import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { ApiService } from '../services/api';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const apiService = inject(ApiService);
  const token = localStorage.getItem('access_token');

  // Ne pas attacher de token sur les routes d'authentification elles-mêmes
  const estRouteAuth = req.url.includes('/token/') || req.url.includes('/inscription/');

  const requeteAuthentifiee = token && !estRouteAuth
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(requeteAuthentifiee).pipe(
    catchError((error: HttpErrorResponse) => {
      // Le token a expiré ou est invalide : on tente un rafraîchissement automatique
      if (error.status === 401 && !estRouteAuth) {
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
          localStorage.clear();
          router.navigate(['/login']);
          return throwError(() => error);
        }

        return apiService.refreshToken(refreshToken).pipe(
          switchMap((tokens: { access: string }) => {
            localStorage.setItem('access_token', tokens.access);
            const requeteAvecNouveauToken = req.clone({
              setHeaders: { Authorization: `Bearer ${tokens.access}` }
            });
            return next(requeteAvecNouveauToken);
          }),
          catchError((refreshError) => {
            // Le refresh token est lui aussi invalide/expiré : déconnexion forcée
            localStorage.clear();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
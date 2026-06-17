import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';

export const authGuard = (): boolean | UrlTree => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');

  // Si le token existe, l'accès est autorisé
  if (token) {
    return true;
  }

  // Sinon, redirection fluide vers l'interface de connexion
  return router.createUrlTree(['/login']);
};
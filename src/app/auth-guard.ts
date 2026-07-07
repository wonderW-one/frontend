import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, UrlTree } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  exp: number;
  role?: string;
  user_id?: number;
  has_profile?: boolean;
}

export const authGuard = (route: ActivatedRouteSnapshot): boolean | UrlTree => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');

  if (!token) {
    console.warn('Accès refusé : Aucun jeton trouvé.');
    return router.createUrlTree(['/login']);
  }

  try {
    const decoded = jwtDecode<JwtPayload>(token);

    const expirationDate = decoded.exp * 1000;
    if (Date.now() >= expirationDate) {
      console.warn('Accès refusé : Le jeton a expiré.');
      localStorage.clear();
      return router.createUrlTree(['/login']);
    }

    const roleUtilisateur = decoded.role;
    const roleAttendu = route.data ? route.data['roleAttendu'] : null;

    if (roleAttendu && roleUtilisateur !== roleAttendu) {
      console.warn(`Accès interdit. Rôle requis: ${roleAttendu}, Rôle possédé: ${roleUtilisateur}`);

      switch (roleUtilisateur) {
        case 'ADMIN':
          return router.createUrlTree(['/admin-dashboard']);
        case 'MANAGER':
          return router.createUrlTree(['/manager-dashboard']);
        case 'TRAVAILLEUR':
          return router.createUrlTree(['/staff-dashboard']);
        case 'CLIENT':
          return router.createUrlTree(['/dashboard']);
        default:
          // Rôle inconnu ou absent : on ne peut pas décider en toute sécurité, retour au login
          localStorage.clear();
          return router.createUrlTree(['/login']);
      }
    }

    return true;
  } catch (e) {
    console.error('Erreur critique de décodage ou de validation du token JWT:', e);
    localStorage.clear();
    return router.createUrlTree(['/login']);
  }
};
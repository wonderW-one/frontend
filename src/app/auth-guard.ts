import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

export const authGuard = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');

  // Si pas de jeton, redirection immédiate à l'authentification
  if (!token) {
    return router.createUrlTree(['/login']);
  }

  try {
    const decoded: any = jwtDecode(token);
    const roleUtilisateur = decoded.role; // Assure-toi que Django envoie bien 'role' dans le JWT
    
    // Récupération sécurisée du rôle attendu configuré dans app.routes.ts
    const roleAttendu = route.data ? route.data['roleAttendu'] : null;

    // Si la route exige un rôle précis et que l'utilisateur ne l'a pas
    if (roleAttendu && roleUtilisateur !== roleAttendu) {
      console.warn(`Accès refusé. Rôle requis: ${roleAttendu}, Rôle trouvé: ${roleUtilisateur}`);
      return router.createUrlTree(['/login']);
    }

    return true; // Tout est OK, l'accès est accordé
  } catch (e) {
    console.error('Erreur de décodage du token JWT:', e);
    localStorage.removeItem('access_token'); // Nettoyage en cas de token corrompu
    return router.createUrlTree(['/login']);
  }
};
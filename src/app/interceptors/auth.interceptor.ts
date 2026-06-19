import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Récupération du token stocké au moment du login
  const token = localStorage.getItem('access_token'); 

  // Si le token existe, on clone la requête pour y injecter le header Authorization
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
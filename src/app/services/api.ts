import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://127.0.0.1:8000/api';
  private http = inject(HttpClient);

  /** * Récupérer les en-têtes contenant le jeton JWT.
   * Cette méthode privée évite de répéter le code de sécurité dans chaque fonction.
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    if (token) {
      // SimpleJWT de Django requiert impérativement le préfixe "Bearer "
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
    }
    return new HttpHeaders();
  }

  /** * Authentifier l'utilisateur et récupérer la paire de jetons (Access & Refresh)
   * Cible la route : path('api/token/', TokenObtainPairView.as_view())
   */
  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/token/`, { username, password });
  }

  /**
   * Rafraîchir un jeton d'accès expiré à l'aide du jeton de rafraîchissement
   * Cible la route : path('api/token/refresh/', TokenRefreshView.as_view())
   */
  refreshToken(refresh: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/token/refresh/`, { refresh });
  }

  /** Récupérer le profil du client connecté */
  getProfile(clientId: number = 1): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/clients/${clientId}/`, { headers });
  }

  /** Récupérer la liste des bureaux */
  getBureauxDisponibles(): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/bureaux/`, { headers }).pipe(
      map(response => response.results || response)
    );
  }

  /** Récupérer les réservations en cours */
  getMesReservations(): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/reservations/`, { headers }).pipe(
      map(response => response.results || response)
    );
  }

  /** Récupérer le suivi des paiements */
  getPaiements(): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/paiements/`, { headers }).pipe(
      map(response => response.results || response)
    );
  }

  /** Créer une réservation */
  creerReservation(bureauId: number, clientId: number, dateDebut: string, dateFin: string): Observable<any> {
    const headers = this.getAuthHeaders();
    const body = {
      bureau: bureauId,
      client: clientId,
      date_debut: dateDebut, // Format : YYYY-MM-DD
      date_fin: dateFin
    };
    return this.http.post<any>(`${this.apiUrl}/reservations/`, body, { headers });
  }
}
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode'; // Importation de la bibliothèque

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://127.0.0.1:8000/api';
  private http = inject(HttpClient);

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return token 
      ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) 
      : new HttpHeaders();
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/token/`, { username, password });
  }

  /**
   * SOLUTION ALTERNATIVE : Décode le token JWT pour trouver l'ID de l'utilisateur
   * et appelle directement l'endpoint individuel /clients/{id}/
   */
  getMonProfil(): Observable<any> {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      return throwError(() => new Error('Aucun token d’accès trouvé'));
    }

    try {
      // Décodage du token pour récupérer les infos
      const decoded: any = jwtDecode(token);
      
      // ATTENTION : Vérifie le nom de la clé dans ton token (souvent 'user_id' ou 'sub')
      const userId = decoded.user_id || decoded.sub; 

      if (!userId) {
        return throwError(() => new Error('ID utilisateur introuvable dans le token'));
      }

      // On réutilise ton endpoint existant /api/clients/{id}/
      return this.getProfile(userId);

    } catch (error) {
      return throwError(() => new Error('Erreur lors du décodage du token JWT'));
    }
  }

  /**
   * Récupère le profil d'un client spécifique par son ID (Utilisé par Admin / Staff ET maintenant par le client lui-même)
   */
  getProfile(userId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/clients/${userId}/`, { headers });
  }

  getBureauxDisponibles(): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/bureaux/disponibles/`, { headers }).pipe(
      map(response => response.results || response)
    );
  }
  
  getMesReservations(): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/reservations/`, { headers }).pipe(
      map(response => response.results || response)
    );
  }

  getPaiements(): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/paiements/`, { headers }).pipe(
      map(response => response.results || response)
    );
  }

  creerReservation(bureauId: number, dateDebut: string, dateFin: string): Observable<any> {
    const headers = this.getAuthHeaders();
    const body = {
      bureau: bureauId,
      date_debut: dateDebut, 
      date_fin: dateFin
    };
    return this.http.post<any>(`${this.apiUrl}/reservations/`, body, { headers });
  }
}
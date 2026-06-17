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
   * RÉCENT : Récupère le profil du client connecté via le Token JWT (évite les erreurs d'ID / 404)
   * Cible l'action @action(detail=False, url_path='me') de Django
   */
  getMonProfil(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/clients/me/`, { headers });
  }

  /**
   * Récupère le profil d'un client spécifique par son ID (Utile pour Admin / Staff)
   */
  getProfile(userId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/clients/${userId}/`, { headers });
  }

  getBureauxDisponibles(): Observable<any[]> {
    const headers = this.getAuthHeaders();
    // Cible précisément /api/bureaux/disponibles/
    return this.http.get<any>(`${this.apiUrl}/bureaux/disponibles/`, { headers }).pipe(
      map(response => response.results || response)
    );
  }
  
  getMesReservations(): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/reservations/mes-reservations/`, { headers }).pipe(
      map(response => response.results || response)
    );
  }

  getPaiements(): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/paiements/mes-paiements/`, { headers }).pipe(
      map(response => response.results || response)
    );
  }

  /**
   * Créer une réservation.
   * Le client est automatiquement associé par le backend grâce au Token JWT
   */
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
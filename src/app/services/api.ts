import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';

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
  
  registerClient(donneesClient: any): Observable<any> {
    // L'endpoint correspond généralement à l'URL liée à ton ClientViewSet
    return this.http.post<any>(`${this.apiUrl}/clients/`, donneesClient);
  }

  /**
   * Enregistre un nouveau bureau dans le backend Django (Réservé Admin/Staff)
   */
  creerBureau(donneesBureau: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/bureaux/`, donneesBureau, { headers });
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
      const decoded: any = jwtDecode(token);
      const userId = decoded.user_id || decoded.sub; 

      if (!userId) {
        return throwError(() => new Error('ID utilisateur introuvable dans le token'));
      }

      return this.getProfile(userId);

    } catch (error) {
      return throwError(() => new Error('Erreur lors du décodage du token JWT'));
    }
  }

  /**
   * Récupère le profil d'un client spécifique par son ID
   */
  getBatiments(): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/batiments/`, { headers }).pipe(
      map(response => response.results || response)
    );
  }
  
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

  getContrats(): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/contrats/`, { headers }).pipe(
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
  
  /* méthode HTTP POST pour cibler l'endpoint */
  validerPaiement(paiementId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/paiements/${paiementId}/valider-paiement/`, {}, { headers });
  }

  // ==========================================
  // NOUVELLES MÉTHODES AJOUTÉES
  // ==========================================

  /**
   * AJOUT 1 : Créer une location directe (immédiate) sans passer par une réservation
   */
  creerLocationDirecte(bureauId: number, dateDebut: string, dateFin: string): Observable<any> {
    const headers = this.getAuthHeaders();
    const body = {
      bureau: bureauId,
      date_debut: dateDebut,
      date_fin: dateFin
    };
    // Adapte l'URL selon ton routage Django (ex: /locations/ ou /locations/louer-immédiat/)
    return this.http.post<any>(`${this.apiUrl}/locations/`, body, { headers });
  }

  /**
   * AJOUT 2 : Convertir une réservation existante en un contrat de location actif
   */
  convertirReservationEnLocation(reservationId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    // Utilise une action personnalisée sur le ViewSet de tes réservations
    return this.http.post<any>(`${this.apiUrl}/reservations/${reservationId}/convertir-location/`, {}, { headers });
  }

  /**
   * AJOUT 3 : Soumettre une demande d'enregistrement de paiement (Statut initial En Attente)
   */
  soumettreDemandePaiement(donneesPaiement: { contrat: string; mode: string; mois_paye: number }): Observable<any> {
    const headers = this.getAuthHeaders();
    const body = {
      contrat: Number(donneesPaiement.contrat),
      mode_paiement: donneesPaiement.mode,
      mois_paye: donneesPaiement.mois_paye,
      annee_paye: new Date().getFullYear() // Envoie automatiquement l'année en cours
    };
    return this.http.post<any>(`${this.apiUrl}/paiements/`, body, { headers });
  }
}
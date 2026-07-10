// api.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  



  // NOTE: Les en-têtes d'authentification Bearer sont injectés automatiquement
  // par auth.interceptor.ts pour toutes les requêtes sécurisées.

  // ==========================================
  //  🔐 AUTHENTIFICATION & UTILISATEURS
  // ==========================================

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/token/`, { username, password });
  }

  refreshToken(refresh: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/token/refresh/`, { refresh });
  }

  registerClient(donneesClient: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/clients/inscription/`, donneesClient);
  }

  // ✅ CORRIGÉ : appelle directement l'endpoint dédié /clients/mon-profil/
  // au lieu de décoder le JWT et de chercher par un ID qui ne correspond pas
  // forcément au profil (Client.id ≠ User.id).
  getMonProfil(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/clients/mon-profil/`);
  }

  // ==========================================
  //  🏢 STRUCTURE, IMMEUBLES & BUREAUX
  // ==========================================

  getBatiments(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/batiments/`).pipe(
      map(response => response.results || response)
    );
  }

  getNiveaux(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/niveaux/`).pipe(
      map(response => response.results || response)
    );
  }

  getTypesBureau(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/types-bureau/`).pipe(
      map(response => response.results || response)
    );
  }

  getBureaux(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/bureaux/`).pipe(
      map(response => response.results || response)
    );
  }

  getBureauxDisponibles(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/bureaux/disponibles/`).pipe(
      map(response => response.results || response)
    );
  }

  creerBureau(donneesBureau: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bureaux/`, donneesBureau);
  }

  // ==========================================
  //  📅 RÉSERVATIONS (CLIENTS & MANAGERS)
  // ==========================================

  getMesReservations(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/reservations/`).pipe(
      map(response => response.results || response)
    );
  }

  creerReservation(bureauId: number, dateDebut: string, dateFin: string): Observable<any> {
    const body = {
      bureau: bureauId,
      date_debut: dateDebut,
      date_fin: dateFin
    };
    return this.http.post<any>(`${this.apiUrl}/reservations/`, body);
  }

  annulerReservation(reservationId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reservations/${reservationId}/annuler/`, {});
  }

  convertirReservationEnContrat(reservationId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reservations/${reservationId}/convertir-contrat/`, {});
  }

  // ==========================================
  //  💼 CONTRATS DE LOCATION & BAILS
  // ==========================================

  getContrats(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/contrats/`).pipe(
      map(response => response.results || response)
    );
  }

  creerContratDirect(bureauId: number, dateDebut: string, dateFin: string): Observable<any> {
    const payload = {
      bureau: bureauId,
      date_debut: dateDebut,
      date_fin: dateFin
    };
    return this.http.post<any>(`${this.apiUrl}/contrats/`, payload);
  }
  demanderContratDirect(bureauId: number, dateFin: string): Observable<any> {
    const payload = { bureau: bureauId, date_fin: dateFin };
    return this.http.post<any>(`${this.apiUrl}/contrats/`, payload);
  }
  
  validerContrat(contratId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/contrats/${contratId}/valider-contrat/`, {});
  }
  
  rejeterContrat(contratId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/contrats/${contratId}/rejeter-contrat/`, {});
  }
  
  // ==========================================
  //  💳 JOURNAL DES FLUX ET PAIEMENTS
  // ==========================================

  getPaiements(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/paiements/`).pipe(
      map(response => response.results || response)
    );
  }

  soumettreDemandePaiement(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/paiements/`, data);
  }

  // ✅ CORRIGÉ : l'URL correspond maintenant à l'action réellement exposée
  // par le backend (valider-paiement), en POST.
  validerPaiement(paiementId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/paiements/${paiementId}/valider-paiement/`, {});
  }
}
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html', 
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  // Signaux pour stocker les états de l'application
  client = signal<any>(null);
  bureauxDisponibles = signal<any[]>([]);
  reservations = signal<any[]>([]);
  paiements = signal<any[]>([]);
  
  bureauSelectionneId = signal<number | null>(null);
  selectedReservation = signal<any | null>(null);
  // Gestion des formulaires via un Signal dictionnaire réactif
  formReservation = signal<{ [key: number]: { dateDebut: string; dateFin: string } }>({});

  toggleReservationDetails(reservation: any, indexCalcule: number): void {
    console.log('Réservation cliquée :', reservation, 'Index :', indexCalcule);
    
    if (this.selectedReservation()?.id === reservation.id) {
      this.selectedReservation.set(null); // On ferme si on re-clique sur le même
    } else {
      // On fusionne l'index calculé dans l'objet pour le retrouver dans le HTML
      const reservationAvecIndex = { ...reservation, indexAffichage: indexCalcule };
      this.selectedReservation.set(reservationAvecIndex); // On ouvre le nouveau
    }
  }

  ngOnInit(): void {
    const token = localStorage.getItem('access_token');
    
    if (token) {
      this.chargerDonneesTableauDeBord();
    } else {
      this.executerConnexionTemporaire();
    }
  }

  onLogout(): void {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      // Nettoyage complet des données d'authentification locales
      localStorage.clear(); 
      
      // 2. On redirige instantanément l'utilisateur vers la page de login
      // Remplacez '/login' par le chemin exact défini dans votre app.routes.ts
      this.router.navigate(['/login']);
    }
  }

  private executerConnexionTemporaire(): void {
    const username = "PDGgestion"; 
    const password = "123M@gis"; 

    this.apiService.login(username, password).subscribe({
      next: (tokens: any) => {
        localStorage.setItem('access_token', tokens.access);
        // ALIGNEMENT : api.ts extrait désormais l'ID via le JWT, mais on le garde en cache par sécurité
        if (tokens.user_id) {
          localStorage.setItem('user_id', tokens.user_id.toString());
        }
        this.chargerDonneesTableauDeBord();
      },
      error: (err: any) => console.error('La connexion a échoué. Vérifiez vos identifiants Django.', err)
    });
  }

  chargerDonneesTableauDeBord(): void {
    console.log("Démarrage du chargement des données via Token JWT...");
  
    // 1. Profil utilisateur connecté (reçoit l'objet direct grâce au décodage JWT dans api.ts)
    this.apiService.getMonProfil().subscribe({
      next: (data: any) => this.client.set(data),
      error: (err: any) => console.error('⚠️ Erreur profil :', err)
    });
  
    // 2. Bureaux Disponibles
    this.apiService.getBureauxDisponibles().subscribe({
      next: (data: any[]) => { 
        this.bureauxDisponibles.set(data);
        
        const initialForms: { [key: number]: { dateDebut: string; dateFin: string } } = {};
        data.forEach((b: any) => {
          initialForms[b.id] = { dateDebut: '', dateFin: '' };
        });
        this.formReservation.set(initialForms);
      },
      error: (err: any) => console.error('⚠️ Erreur bureaux :', err)
    });
  
    // 3. Réservations (filtrées automatiquement côté backend par client)
    this.apiService.getMesReservations().subscribe({
      next: (data: any) => {
        // Si Django renvoie de la pagination, on prend .results, sinon on prend data en secours
        const listeReservations = data && data.results ? data.results : data;
        this.reservations.set(listeReservations);
      },
      error: (err: any) => console.error('⚠️ Erreur réservations :', err)
    });
  
    // 4. Paiements (filtrés automatiquement côté backend par client)
    this.apiService.getPaiements().subscribe({
      next: (data: any) => this.paiements.set(data),
      error: (err: any) => console.error('⚠️ Erreur paiements :', err)
    });
  }

  updateDate(bureauId: number, field: 'dateDebut' | 'dateFin', value: string): void {
    this.formReservation.update(forms => ({
      ...forms,
      [bureauId]: {
        ...forms[bureauId],
        [field]: value
      }
    }));
  }

  toggleDetails(bureauId: number): void {
    this.bureauSelectionneId.update(id => id === bureauId ? null : bureauId);
  }

  /**
   * Méthode utilitaire pour forcer et nettoyer le format YYYY-MM-DD pour Django
   */
  private formaterDatePourDjango(dateInput: any): string {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    
    const annee = d.getFullYear();
    const mois = ('0' + (d.getMonth() + 1)).slice(-2);
    const jour = ('0' + d.getDate()).slice(-2);
    
    return `${annee}-${mois}-${jour}`;
  }

  onReserver(bureauId: number): void {
    const dates = this.formReservation()[bureauId];
    
    if (!dates || !dates.dateDebut || !dates.dateFin) {
      alert('Veuillez renseigner les deux dates.');
      return;
    }

    const dateDebutNettoyee = this.formaterDatePourDjango(dates.dateDebut);
    const dateFinNettoyee = this.formaterDatePourDjango(dates.dateFin);

    this.apiService.creerReservation(bureauId, dateDebutNettoyee, dateFinNettoyee).subscribe({
      next: () => {
        alert('Réservation enregistrée avec succès !');
        this.bureauSelectionneId.set(null);
        this.chargerDonneesTableauDeBord(); // Rafraîchissement automatique et instantané
      },
      error: (err: any) => {
        console.error("Détails de l'erreur backend :", err);
        
        // AMÉLIORATION : Extraction propre des erreurs de validation levées par le modèle Django
        if (err.error && typeof err.error === 'object') {
          const clesErreurs = Object.keys(err.error);
          // Récupère le premier message d'erreur dictionnaire (ex: pour la clé 'date_debut' ou 'non_field_errors')
          const premierMessage = err.error[clesErreurs[0]];
          alert(`Erreur de validation : ${Array.isArray(premierMessage) ? premierMessage[0] : premierMessage}`);
        } else {
          alert('Erreur lors de la réservation : ' + (err.message || 'Erreur serveur inconnue.'));
        }
      }
    });
  }
}
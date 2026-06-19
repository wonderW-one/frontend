import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; // AJOUT : Requis pour utiliser ngModel dans le formulaire de paiement
import { ApiService } from '../services/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule], // AJOUT : Intégration de FormsModule ici
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
  contrats = signal<any[]>([]);
  
  bureauSelectionneId = signal<number | null>(null);
  selectedReservation = signal<any | null>(null);
  
  // Gestion des formulaires via un Signal dictionnaire réactif
  formReservation = signal<{ [key: number]: { dateDebut: string; dateFin: string } }>({});

  // AJOUT : Structure réactive pour le formulaire de déclaration de paiement
  formPaiement = signal({
    contrat: '',
    mode: 'CASH',
    mois_paye: new Date().getMonth() + 1
  });

  toggleReservationDetails(reservation: any, indexCalcule: number): void {
    console.log('Réservation cliquée :', reservation, 'Index :', indexCalcule);
    
    if (this.selectedReservation()?.id === reservation.id) {
      this.selectedReservation.set(null);
    } else {
      const reservationAvecIndex = { ...reservation, indexAffichage: indexCalcule };
      this.selectedReservation.set(reservationAvecIndex);
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
      localStorage.clear(); 
      this.router.navigate(['/login']);
    }
  }

  private executerConnexionTemporaire(): void {
    const username = "PDGgestion"; 
    const password = "123M@gis"; 

    this.apiService.login(username, password).subscribe({
      next: (tokens: any) => {
        localStorage.setItem('access_token', tokens.access);
        if (tokens.user_id) {
          localStorage.setItem('user_id', tokens.user_id.toString());
        }
        this.chargerDonneesTableauDeBord();
      },
      error: (err: any) => console.error('La connexion a échoué.', err)
    });
  }

  chargerDonneesTableauDeBord(): void {
    console.log("Démarrage du chargement des données via Token JWT...");
  
    this.apiService.getMonProfil().subscribe({
      next: (data: any) => this.client.set(data),
      error: (err: any) => console.error('⚠️ Erreur profil :', err)
    });
  
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
  
    this.apiService.getMesReservations().subscribe({
      next: (data: any) => {
        const listeReservations = data && data.results ? data.results : data;
        this.reservations.set(listeReservations);
      },
      error: (err: any) => console.error('⚠️ Erreur réservations :', err)
    });

    this.apiService.getContrats().subscribe({
      next: (data: any[]) => this.contrats.set(data),
      error: (err: any) => console.error('⚠️ Erreur contrats :', err)
    });
  
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
        this.chargerDonneesTableauDeBord();
      },
      error: (err: any) => this.gererErreurBackend(err)
    });
  }

  // AJOUT 1 : Louer instantanément sans réservation préalable
  onLouerDirectement(bureauId: number): void {
    const dates = this.formReservation()[bureauId];
    if (!dates || !dates.dateDebut || !dates.dateFin) {
      alert('Veuillez spécifier les dates de début et de fin pour générer le contrat immédiat.');
      return;
    }
  
    const dateDebutNettoyee = this.formaterDatePourDjango(dates.dateDebut);
    const dateFinNettoyee = this.formaterDatePourDjango(dates.dateFin);
  
    if (confirm('Confirmez-vous la création d\'un contrat immédiat pour ce bureau ?')) {
      // Appel du service modifié pour les contrats
      this.apiService.creerContratDirect(bureauId, dateDebutNettoyee, dateFinNettoyee).subscribe({
        next: (reponse: any) => {
          alert('Contrat immédiat enregistré en base de données avec succès !');
          this.bureauSelectionneId.set(null);
          this.chargerDonneesTableauDeBord();
        },
        error: (err: any) => this.gererErreurBackend(err)
      });
    }
  }

  // AJOUT 2 : Convertir une réservation existante en contrat de location actif
  onLouerDepuisReservation(reservation: any): void {
    if (confirm(`Voulez-vous transformer la réservation #${reservation.id} en contrat actif maintenant ?`)) {
      // Appel de la nouvelle méthode du service API pour les contrats
      this.apiService.convertirReservationEnContrat(reservation.id).subscribe({
        next: () => {
          alert('La réservation a été validée et enregistrée en tant que contrat actif !');
          this.selectedReservation.set(null);
          this.chargerDonneesTableauDeBord();
        },
        error: (err: any) => this.gererErreurBackend(err)
      });
    }
  }

  // AJOUT 3 : Déclarer un paiement (POST) destiné à être validé par le Staff/Admin
  onSoumettrePaiement(): void {
    const dataPaiement = this.formPaiement();
    if (!dataPaiement.contrat) {
      alert('Veuillez saisir un numéro de contrat valide.');
      return;
    }

    this.apiService.soumettreDemandePaiement(dataPaiement).subscribe({
      next: () => {
        alert('Demande d\'encaissement envoyée ! Elle apparaîtra comme "En attente" jusqu\'à ce qu\'un administrateur ou un travailleur la valide.');
        // Réinitialisation du champ contrat
        this.formPaiement.update(f => ({ ...f, contrat: '' }));
        this.chargerDonneesTableauDeBord();
      },
      error: (err: any) => this.gererErreurBackend(err)
    });
  }

  /**
   * Centralisation du traitement des erreurs HTTP du backend Django Rest Framework
   */
  private gererErreurBackend(err: any): void {
    console.error("Détails de l'erreur backend :", err);
    if (err.error && typeof err.error === 'object') {
      const clesErreurs = Object.keys(err.error);
      const premierMessage = err.error[clesErreurs[0]];
      alert(`Erreur : ${Array.isArray(premierMessage) ? premierMessage[0] : premierMessage}`);
    } else {
      alert('Une erreur est survenue lors de l\'opération : ' + (err.error?.detail || err.message || 'Erreur inconnue.'));
    }
  }
}
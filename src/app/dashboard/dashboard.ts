import { Component, OnInit, inject, signal ,computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  client = signal<any>(null);
  bureauxDisponibles = signal<any[]>([]);
  reservations = signal<any[]>([]);
  paiements = signal<any[]>([]);
  contrats = signal<any[]>([]);
  bureaux = signal<any[]>([]);

  bureauSelectionneId = signal<number | null>(null);
  selectedReservation = signal<any | null>(null);

  formReservation = signal<{ [key: number]: { dateDebut: string; dateFin: string } }>({});

  formPaiement = signal({
    contrat: null as number | null,
    montant: null as number | null,
    mode: 'CASH',
    mois_paye: new Date().getMonth() + 1
  });

  estStaff = computed(() => {
    const role = this.client()?.role;
    return role === 'ADMIN' || role === 'TRAVAILLEUR' || role === 'MANAGER';
  });

  toggleReservationDetails(reservation: any, indexCalcule: number): void {
    if (this.selectedReservation()?.id === reservation.id) {
      this.selectedReservation.set(null);
    } else {
      this.selectedReservation.set({ ...reservation, indexAffichage: indexCalcule });
    }
  }

  ngOnInit(): void {
    const token = localStorage.getItem('access_token');
    if (!token) {
      this.router.navigate(['/login']);
    } else {
      this.chargerDonneesTableauDeBord();
    }
  }

  onLogout(): void {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      localStorage.clear();
      this.router.navigate(['/login']);
    }
  }

  chargerDonneesTableauDeBord(): void {
    this.apiService.getMonProfil().subscribe({
      next: (data: any) => this.client.set(data),
      error: (err: any) => console.error('⚠️ Erreur profil :', err)
    });

    this.apiService.getBureaux().subscribe({
      next: (data: any[]) => this.bureaux.set(data),
      error: (err: any) => console.error('⚠️ Erreur bureaux :', err)
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
      error: (err: any) => console.error('⚠️ Erreur bureaux disponibles :', err)
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
      [bureauId]: { ...forms[bureauId], [field]: value }
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

  onLouerDirectement(bureauId: number): void {
    const dates = this.formReservation()[bureauId];
    if (!dates || !dates.dateFin) {
    
      alert('Veuillez spécifier une date de fin.');
      return;
    }
  
    const dateFinNettoyee = this.formaterDatePourDjango(dates.dateFin);
  
    if (confirm("Confirmez-vous l'envoi d'une demande de location directe pour ce bureau ? Elle sera activée après validation par un administrateur ou un travailleur.")) {
      this.apiService.demanderContratDirect(bureauId, dateFinNettoyee).subscribe({
        next: () => {
          alert('Demande envoyée ! Elle sera active dès validation par un responsable.');
          this.bureauSelectionneId.set(null);
          this.chargerDonneesTableauDeBord();
        },
        error: (err: any) => this.gererErreurBackend(err)
      });
    }
  }
  
  onValiderContrat(contratId: number): void {
    if (confirm('Valider ce contrat maintenant ?')) {
      this.apiService.validerContrat(contratId).subscribe({
        next: () => { alert('Contrat validé.'); this.chargerDonneesTableauDeBord(); },
        error: (err: any) => this.gererErreurBackend(err)
      });
    }
  }
  
  onRejeterContrat(contratId: number): void {
    if (confirm('Rejeter cette demande de contrat ?')) {
      this.apiService.rejeterContrat(contratId).subscribe({
        next: () => { alert('Demande rejetée.'); this.chargerDonneesTableauDeBord(); },
        error: (err: any) => this.gererErreurBackend(err)
      });
    }
  }

  onAnnulerReservation(reservationId: number): void {
    if (confirm(`Voulez-vous annuler la réservation #${reservationId} ?`)) {
      this.apiService.annulerReservation(reservationId).subscribe({
        next: () => {
          alert('Réservation annulée avec succès.');
          this.selectedReservation.set(null);
          this.chargerDonneesTableauDeBord();
        },
        error: (err: any) => this.gererErreurBackend(err)
      });
    }
  }

  onLouerDepuisReservation(reservation: any): void {
    if (confirm(`Voulez-vous transformer la réservation #${reservation.id} en contrat actif maintenant ?`)) {
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

  onSoumettrePaiement(): void {
    const dataPaiement = this.formPaiement();
    if (!dataPaiement.contrat) {
      alert('Veuillez sélectionner un contrat valide.');
      return;
    }

    this.apiService.soumettreDemandePaiement(dataPaiement).subscribe({
      next: () => {
        alert('Demande d\'encaissement envoyée ! Elle apparaîtra comme "En attente" jusqu\'à validation.');
        this.formPaiement.set({
          contrat: null,
          montant: null,
          mode: 'CASH',
          mois_paye: new Date().getMonth() + 1
        });
        this.chargerDonneesTableauDeBord();
      },
      error: (err: any) => this.gererErreurBackend(err)
    });
  }

  private gererErreurBackend(err: any): void {
    console.error("Détails de l'erreur backend :", err);
    if (err.error && typeof err.error === 'object') {
      const clesErreurs = Object.keys(err.error);
      const premierMessage = err.error[clesErreurs[0]];
      alert(`Erreur : ${Array.isArray(premierMessage) ? premierMessage[0] : premierMessage}`);
    } else {
      alert('Une erreur est survenue : ' + (err.error?.detail || err.message || 'Erreur inconnue.'));
    }
  }
}
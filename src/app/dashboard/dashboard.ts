import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

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

  // ---------- ÉDITION DE PROFIL ----------
  modalProfilOuvert = signal(false);
  formProfil = signal<any>({});
  photoProfilFichier = signal<File | null>(null);
  enregistrementProfilEnCours = signal(false);

  // ---------- TOASTS ----------
  toasts = signal<Toast[]>([]);
  private toastIdCounter = 0;

  estStaff = computed(() => {
    const role = this.client()?.role;
    return role === 'ADMIN' || role === 'TRAVAILLEUR' || role === 'MANAGER';
  });

  // ---------- KPIs FINANCIERS ----------
  contratsActifs = computed(() =>
    this.contrats().filter(c => c.statut === 'VALIDE')
  );

  // 🔴 BUG CORRIGÉ : le <select> du formulaire de paiement listait TOUS les
  // contrats (contrats()), y compris ceux EN_ATTENTE ou REJETE. Le backend les
  // refuse désormais (voir Paiement.clean() / PaiementSerializer.validate()),
  // mais le client pouvait quand même les sélectionner et se prendre une
  // erreur 400 après coup. On ne propose maintenant que les contrats VALIDE.
  contratsPourPaiement = computed(() =>
    this.contrats().filter(c => c.statut === 'VALIDE')
  );

  totalResteAPayer = computed(() => {
    return this.contratsActifs().reduce((somme, c) => {
      const totalPaye = this.paiements()
        .filter(p => p.contrat === c.id && (p.statut === 'PAID' || p.statut_paiement === 'PAID'))
        .reduce((s, p) => s + Number(p.montant || 0), 0);
      const montantContrat = Number(c.montant || 0);
      return somme + Math.max(montantContrat - totalPaye, 0);
    }, 0);
  });

  prochaineEcheance = computed(() => {
    const dates = this.contratsActifs()
      .map(c => c.date_fin)
      .filter(Boolean)
      .sort();
    return dates.length ? dates[0] : null;
  });

  reservationsEnAttente = computed(() =>
    this.reservations().filter(r => r.is_active).length
  );

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
      error: (err: any) => {
        console.error('⚠️ Erreur profil :', err);
        this.afficherToast('error', "Impossible de charger votre profil.");
      }
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
    // Si la date est déjà au format YYYY-MM-DD (cas des <input type="date">),
    // on la garde telle quelle : la faire passer par new Date() puis relire
    // getFullYear()/getMonth()/getDate() en heure LOCALE peut décaler la date
    // d'un jour pour les fuseaux horaires négatifs (UTC minuit → veille en local).
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    const d = new Date(dateInput);
    const annee = d.getFullYear();
    const mois = ('0' + (d.getMonth() + 1)).slice(-2);
    const jour = ('0' + d.getDate()).slice(-2);
    return `${annee}-${mois}-${jour}`;
  }

  onReserver(bureauId: number): void {
    const dates = this.formReservation()[bureauId];
    if (!dates || !dates.dateDebut || !dates.dateFin) {
      this.afficherToast('error', 'Veuillez renseigner les deux dates.');
      return;
    }

    const dateDebutNettoyee = this.formaterDatePourDjango(dates.dateDebut);
    const dateFinNettoyee = this.formaterDatePourDjango(dates.dateFin);

    this.apiService.creerReservation(bureauId, dateDebutNettoyee, dateFinNettoyee).subscribe({
      next: () => {
        this.afficherToast('success', 'Réservation enregistrée avec succès !');
        this.bureauSelectionneId.set(null);
        this.chargerDonneesTableauDeBord();
      },
      error: (err: any) => this.gererErreurBackend(err)
    });
  }

  onLouerDirectement(bureauId: number): void {
    const dates = this.formReservation()[bureauId];
    if (!dates || !dates.dateFin) {
      this.afficherToast('error', 'Veuillez spécifier une date de fin.');
      return;
    }

    const dateFinNettoyee = this.formaterDatePourDjango(dates.dateFin);

    if (confirm("Confirmez-vous l'envoi d'une demande de location directe pour ce bureau ? Elle sera activée après validation par un administrateur ou un travailleur.")) {
      this.apiService.demanderContratDirect(bureauId, dateFinNettoyee).subscribe({
        next: () => {
          this.afficherToast('success', 'Demande envoyée ! Elle sera active dès validation par un responsable.');
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
        next: () => { this.afficherToast('success', 'Contrat validé.'); this.chargerDonneesTableauDeBord(); },
        error: (err: any) => this.gererErreurBackend(err)
      });
    }
  }

  onRejeterContrat(contratId: number): void {
    if (confirm('Rejeter cette demande de contrat ?')) {
      this.apiService.rejeterContrat(contratId).subscribe({
        next: () => { this.afficherToast('info', 'Demande rejetée.'); this.chargerDonneesTableauDeBord(); },
        error: (err: any) => this.gererErreurBackend(err)
      });
    }
  }

  onAnnulerReservation(reservationId: number): void {
    if (confirm(`Voulez-vous annuler la réservation #${reservationId} ?`)) {
      this.apiService.annulerReservation(reservationId).subscribe({
        next: () => {
          this.afficherToast('success', 'Réservation annulée avec succès.');
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
          this.afficherToast('success', 'La réservation a été validée et enregistrée en tant que contrat actif !');
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
      this.afficherToast('error', 'Veuillez sélectionner un contrat valide.');
      return;
    }

    this.apiService.soumettreDemandePaiement(dataPaiement).subscribe({
      next: () => {
        this.afficherToast('success', "Demande d'encaissement envoyée ! Elle apparaîtra comme « En attente » jusqu'à validation.");
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

  // ---------- ÉDITION DE PROFIL ----------

  ouvrirModalProfil(): void {
    const c = this.client();
    this.formProfil.set({
      telephone: c?.telephone || '',
      addresse: c?.addresse || '',
      date_naissance: c?.date_naissance || '',
      lieu_naissance: c?.lieu_naissance || '',
      nationalite: c?.nationalite || '',
      profession: c?.profession || '',
      type_piece_identite: c?.type_piece_identite || '',
      numero_piece_identite: c?.numero_piece_identite || ''
    });
    this.photoProfilFichier.set(null);
    this.modalProfilOuvert.set(true);
  }

  fermerModalProfil(): void {
    this.modalProfilOuvert.set(false);
  }

  onPhotoProfilSelectionnee(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.photoProfilFichier.set(input.files[0]);
    }
  }

  onEnregistrerProfil(): void {
    this.enregistrementProfilEnCours.set(true);
    const formData = new FormData();
    Object.entries(this.formProfil()).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        formData.append(key, value as string);
      }
    });
    const photo = this.photoProfilFichier();
    if (photo) {
      formData.append('photo_profil', photo, photo.name);
    }

    this.apiService.mettreAJourMonProfil(formData).subscribe({
      next: (data: any) => {
        this.client.set(data);
        this.enregistrementProfilEnCours.set(false);
        this.modalProfilOuvert.set(false);
        this.afficherToast('success', 'Profil mis à jour avec succès.');
      },
      error: (err: any) => {
        this.enregistrementProfilEnCours.set(false);
        this.gererErreurBackend(err);
      }
    });
  }

  // ---------- TOASTS ----------

  afficherToast(type: 'success' | 'error' | 'info', message: string): void {
    const id = ++this.toastIdCounter;
    this.toasts.update(t => [...t, { id, type, message }]);
    setTimeout(() => this.retirerToast(id), 4500);
  }

  retirerToast(id: number): void {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }

  private gererErreurBackend(err: any): void {
    console.error("Détails de l'erreur backend :", err);
    let message = 'Une erreur est survenue.';
    if (err.error && typeof err.error === 'object') {
      const clesErreurs = Object.keys(err.error);
      const premierMessage = err.error[clesErreurs[0]];
      message = Array.isArray(premierMessage) ? premierMessage[0] : premierMessage;
    } else {
      message = err.error?.detail || err.message || 'Erreur inconnue.';
    }
    this.afficherToast('error', message);
  }
}
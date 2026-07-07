import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manager-dashboard.html',
  styleUrls: ['./manager-dashboard.css']
})
export class ManagerDashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  listeReservations = signal<any[]>([]);
  listePaiements = signal<any[]>([]);
  listelocation = signal<any[]>([]);
  listeBureaux = signal<any[]>([]);
  chiffreAffaire = signal<number>(0);
  tauxOccupation = signal<number>(0);

  ongletActif = signal<'vue-ensemble' | 'reservations' | 'contrats' | 'paiements'>('vue-ensemble');

  ngOnInit(): void {
    this.chargerDonneesManager();
  }

  chargerDonneesManager(): void {
    this.apiService.getMesReservations().subscribe({
      next: (data: any) => {
        this.listeReservations.set(data && data.results ? data.results : data);
      },
      error: (err) => console.error('Erreur réservations manager', err)
    });

    this.apiService.getContrats().subscribe({
      next: (data) => this.listelocation.set(data),
      error: (err) => console.error('Erreur contrats manager', err)
    });

    this.apiService.getBureaux().subscribe({
      next: (bureauList) => {
        this.listeBureaux.set(bureauList);
        const totalBureaux = bureauList.length;
        // ✅ CORRIGÉ : 'est_reserve' n'existe pas dans BureauSerializer, seul 'statut' est fiable
        const bureauxOccupes = bureauList.filter((b: any) => b.statut === 'OCCUPE').length;
        this.tauxOccupation.set(totalBureaux > 0 ? Math.round((bureauxOccupes / totalBureaux) * 100) : 0);
      },
      error: (err) => console.error('Erreur récupération bureaux pour statistiques', err)
    });

    this.apiService.getPaiements().subscribe({
      next: (data) => {
        this.listePaiements.set(data);
        const total = data
          .filter((p: any) => {
            const status = p.statut || p.statut_paiement;
            return status === 'PAID' || status === 'PAYE';
          })
          .reduce((sum: number, current: any) => sum + Number(current.montant || 0), 0);
        this.chiffreAffaire.set(total);
      },
      error: (err) => console.error('Erreur flux de paiements manager', err)
    });
  }

  approuverEtCreerContrat(reservationId: number): void {
    if (confirm('Voulez-vous approuver cette réservation et générer officiellement le contrat de location ?')) {
      // ✅ CORRIGÉ : plus de vérification typeof inutile, la méthode existe toujours
      this.apiService.convertirReservationEnContrat(reservationId).subscribe({
        next: () => {
          alert('Réservation approuvée ! Contrat de bail généré avec succès.');
          this.chargerDonneesManager();
        },
        error: (err) => this.gererErreurBackend(err)
      });
    }
  }

  annulerReservation(reservationId: number): void {
    if (confirm('Voulez-vous refuser ou annuler cette demande de réservation ?')) {
      this.apiService.annulerReservation(reservationId).subscribe({
        next: () => {
          alert('La réservation a été annulée / refusée.');
          this.listeReservations.update(res => res.filter(r => r.id !== reservationId));
          this.chargerDonneesManager();
        },
        error: (err) => this.gererErreurBackend(err)
      });
    }
  }

  validerEncaissement(paiementId: number): void {
    if (confirm('Confirmez-vous la réception des fonds ? Le paiement sera marqué comme PAYÉ.')) {
      this.apiService.validerPaiement(paiementId).subscribe({
        next: (res) => {
          alert(res?.detail || "Paiement validé et enregistré dans le chiffre d'affaires !");
          this.chargerDonneesManager();
        },
        error: (err) => this.gererErreurBackend(err)
      });
    }
  }

  changerOnglet(onglet: 'vue-ensemble' | 'reservations' | 'contrats' | 'paiements'): void {
    this.ongletActif.set(onglet);
  }

  deconnexion(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  private gererErreurBackend(err: any): void {
    console.error('Erreur backend :', err);
    if (err.error && typeof err.error === 'object') {
      const cles = Object.keys(err.error);
      const premierMessage = err.error[cles[0]];
      alert(`Erreur : ${Array.isArray(premierMessage) ? premierMessage[0] : premierMessage}`);
    } else {
      alert('Erreur : ' + (err.error?.detail || err.message || 'Erreur inconnue.'));
    }
  }
}
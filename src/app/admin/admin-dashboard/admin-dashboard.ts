import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  ongletActif = signal<'vue-ensemble' | 'bureaux' | 'reservations' | 'contrats' | 'suivi-clients' | 'suivi-workers' | 'paiements'>('vue-ensemble');
  listeBureaux = signal<any[]>([]);
  listeReservations = signal<any[]>([]);
  listePaiements = signal<any[]>([]);
  totalRevenus = signal<number>(0);
  batiments = signal<any[]>([]);
  niveaux = signal<any[]>([]);
  typesBureau = signal<any[]>([]);
  listeContrats = signal<any[]>([]);

  bureauForm = signal({
    numero: '',
    niveau: '',
    espace: 0,
    unite: 0,
    batiment: '',
    type: ''
  });

  ngOnInit(): void {
    this.chargerDonneesAdmin();
  }

  chargerDonneesAdmin(): void {
    this.apiService.getBatiments().subscribe({
      next: (data: any[]) => this.batiments.set(data),
      error: (err: any) => console.error('⚠️ Erreur lors du chargement des bâtiments :', err)
    });

    this.apiService.getNiveaux().subscribe({
      next: (data: any[]) => this.niveaux.set(data),
      error: (err: any) => console.error('⚠️ Erreur lors du chargement des niveaux :', err)
    });

    this.apiService.getTypesBureau().subscribe({
      next: (data: any[]) => this.typesBureau.set(data),
      error: (err: any) => console.error('⚠️ Erreur lors du chargement des types de bureau :', err)
    });

    this.apiService.getBureaux().subscribe({
      next: (data) => this.listeBureaux.set(data),
      error: (err) => console.error('Erreur bureaux admin', err)
    });

    this.apiService.getMesReservations().subscribe({
      next: (data) => this.listeReservations.set(data),
      error: (err) => console.error('Erreur réservations admin', err)
    });

    this.apiService.getContrats().subscribe({
      next: (data) => this.listeContrats.set(data),
      error: (err) => console.error('Erreur contrats admin', err)
    });

    this.apiService.getPaiements().subscribe({
      next: (data) => {
        this.listePaiements.set(data);
        this.recalculerRevenus();
      },
      error: (err) => console.error('Erreur paiements admin', err)
    });
  }

  // Niveaux filtrés selon le bâtiment sélectionné dans le formulaire
  niveauxDuBatimentSelectionne(): any[] {
    const batimentId = this.bureauForm().batiment;
    if (!batimentId) return [];
    return this.niveaux().filter(n => String(n.batiment) === String(batimentId));
  }

  getStatutTemporel(dateDebutStr: string, dateFinStr: string): { label: string, css: string } {
    if (!dateDebutStr || !dateFinStr) return { label: 'Inconnu', css: 'badge-expire' };

    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);

    const debut = new Date(dateDebutStr);
    const fin = new Date(dateFinStr);

    if (aujourdhui < debut) {
      return { label: 'À venir', css: 'badge-avenir' };
    } else if (aujourdhui >= debut && aujourdhui <= fin) {
      return { label: 'En cours', css: 'badge-encours' };
    } else {
      return { label: 'Expiré', css: 'badge-expire' };
    }
  }

  ajouterBureau(): void {
    const donnees = this.bureauForm();

    if (!donnees.numero || !donnees.espace || !donnees.batiment || !donnees.niveau || !donnees.type) {
      alert('Veuillez remplir tous les champs obligatoires (numéro, superficie, bâtiment, niveau, type).');
      return;
    }

    this.apiService.creerBureau(donnees).subscribe({
      next: (res) => {
        alert('Bureau enregistré !');
        this.listeBureaux.update(b => [...b, res]);
        this.bureauForm.set({
          numero: '', niveau: '', espace: 0, unite: 0, batiment: '', type: ''
        });
      },
      error: (err) => this.gererErreurBackend(err)
    });
  }

  // ✅ AJOUT : Méthode pour accepter/valider un contrat en attente
  onValiderContrat(contratId: number): void {
    if (confirm('Valider ce contrat maintenant ?')) {
      this.apiService.validerContrat(contratId).subscribe({
        next: () => {
          alert('Contrat validé avec succès.');
          this.chargerDonneesAdmin(); // Rafraîchit l'affichage global
        },
        error: (err) => this.gererErreurBackend(err)
      });
    }
  }

  // ✅ AJOUT : Méthode pour rejeter un contrat en attente
  onRejeterContrat(contratId: number): void {
    if (confirm('Rejeter cette demande de contrat ?')) {
      this.apiService.rejeterContrat(contratId).subscribe({
        next: () => {
          alert('Demande de contrat rejetée.');
          this.chargerDonneesAdmin(); // Rafraîchit l'affichage global
        },
        error: (err) => this.gererErreurBackend(err)
      });
    }
  }

  changerOnglet(onglet: 'vue-ensemble' | 'bureaux' | 'reservations' | 'contrats' | 'suivi-clients' | 'suivi-workers' | 'paiements'): void {
    this.ongletActif.set(onglet);
  }

  deconnexion(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  validerLePaiement(paiementId: number): void {
    if (confirm('Voulez-vous vraiment marquer ce paiement comme PAYÉ ?')) {
      this.apiService.validerPaiement(paiementId).subscribe({
        next: (res) => {
          alert(res.detail || 'Paiement validé avec succès !');
          this.listePaiements.update(paiements =>
            paiements.map(p => p.id === paiementId ? { ...p, statut: 'PAID', statut_paiement: 'PAID' } : p)
          );
          this.recalculerRevenus();
        },
        error: (err) => this.gererErreurBackend(err)
      });
    }
  }

  private recalculerRevenus(): void {
    const revenus = this.listePaiements()
      .filter((p: any) => {
        const statut = p.statut || p.statut_paiement;
        return statut === 'PAID' || statut === 'PAYE' || statut === 'COMPLETED';
      })
      .reduce((sum: number, current: any) => sum + Number(current.montant || 0), 0);
    this.totalRevenus.set(revenus);
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
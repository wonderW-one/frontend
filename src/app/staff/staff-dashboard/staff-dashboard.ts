import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface RapportTravail {
  id: string;
  titre: string;
  description: string;
  date: string; // ISO string
  auteur: string;
}

const CLE_STOCKAGE_RAPPORTS = 'rapports_travail_staff';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-dashboard.html',
  styleUrls: ['./staff-dashboard.css']
})
export class StaffDashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  ongletActif = signal<'bureaux' | 'clients' | 'contrats' | 'paiements' | 'rapport'>('bureaux');

  // ---------- DONNÉES ----------
  profil = signal<any>(null);
  bureauxStatut = signal<any[]>([]);
  clients = signal<any[]>([]);
  reservations = signal<any[]>([]);
  contrats = signal<any[]>([]);
  paiements = signal<any[]>([]);

  // ---------- FICHE CLIENT ----------
  clientSelectionne = signal<any | null>(null);
  rechercheClient = signal<string>('');

  // ---------- TOASTS ----------
  toasts = signal<Toast[]>([]);
  private toastIdCounter = 0;

  // ---------- RAPPORT DE TRAVAIL ----------
  rapports = signal<RapportTravail[]>([]);
  formRapport = signal({ titre: '', description: '' });

  // ---------- KPIs ----------
  clientsFiltres = computed(() => {
    const terme = this.rechercheClient().trim().toLowerCase();
    const liste = this.clients();
    if (!terme) return liste;
    return liste.filter((c: any) => {
      const nom = `${c.user_detail?.first_name || ''} ${c.user_detail?.last_name || ''} ${c.user_detail?.username || ''} ${c.user_detail?.email || ''}`.toLowerCase();
      return nom.includes(terme);
    });
  });

  totalClients = computed(() => this.clients().filter(c => c.role === 'CLIENT').length);
  bureauxOccupes = computed(() => this.bureauxStatut().filter(b => b.statut === 'OCCUPE').length);
  contratsEnAttente = computed(() => this.contrats().filter(c => c.statut === 'EN_ATTENTE').length);
  paiementsEnAttenteAdmin = computed(() =>
    this.paiements().filter(p => (p.statut || p.statut_paiement) === 'PENDING_ADMIN').length
  );

  // Réservations / contrats / paiements liés au client actuellement ouvert dans la fiche
  reservationsDuClient = computed(() => {
    const client = this.clientSelectionne();
    if (!client) return [];
    return this.reservations().filter(r => r.client === client.id);
  });

  contratsDuClient = computed(() => {
    const client = this.clientSelectionne();
    if (!client) return [];
    return this.contrats().filter(c => c.client === client.id);
  });

  paiementsDuClient = computed(() => {
    const client = this.clientSelectionne();
    if (!client) return [];
    return this.paiements().filter(p => p.client === client.id);
  });

  totalPayeParClient = computed(() => {
    return this.paiementsDuClient()
      .filter(p => (p.statut || p.statut_paiement) === 'PAID')
      .reduce((somme, p) => somme + Number(p.montant || 0), 0);
  });

  ngOnInit(): void {
    this.chargerDonneesStaff();
    this.chargerRapports();
  }

  chargerDonneesStaff(): void {
    this.apiService.getMonProfil().subscribe({
      next: (data: any) => this.profil.set(data),
      error: (err: any) => console.error('⚠️ Erreur profil staff :', err)
    });

    // ✅ On charge TOUS les bureaux, pas seulement les disponibles, sinon l'écran
    // "Statut des Espaces (Temps Réel)" ne peut jamais montrer un bureau occupé
    this.apiService.getBureaux().subscribe({
      next: (data) => this.bureauxStatut.set(data),
      error: (err) => console.error('Erreur bureaux staff', err)
    });

    this.apiService.getClients().subscribe({
      next: (data) => this.clients.set(data),
      error: (err) => console.error('Erreur clients staff', err)
    });

    this.apiService.getMesReservations().subscribe({
      next: (data: any) => {
        const liste = data && data.results ? data.results : data;
        this.reservations.set(liste);
      },
      error: (err) => console.error('Erreur réservations staff', err)
    });

    this.apiService.getContrats().subscribe({
      next: (data) => this.contrats.set(data),
      error: (err) => console.error('Erreur contrats staff', err)
    });

    this.apiService.getPaiements().subscribe({
      next: (data) => this.paiements.set(data),
      error: (err) => console.error('Erreur paiements staff', err)
    });
  }

  changerOnglet(onglet: 'bureaux' | 'clients' | 'contrats' | 'paiements' | 'rapport'): void {
    this.ongletActif.set(onglet);
  }

  // ---------- FICHE CLIENT ----------

  ouvrirFicheClient(client: any): void {
    this.clientSelectionne.set(client);
    this.ongletActif.set('clients');
  }

  fermerFicheClient(): void {
    this.clientSelectionne.set(null);
  }

  getStatutTemporel(dateDebutStr: string, dateFinStr: string): { label: string, css: string } {
    if (!dateDebutStr || !dateFinStr) return { label: 'Inconnu', css: 'badge-expire' };

    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const debut = new Date(dateDebutStr);
    const fin = new Date(dateFinStr);

    if (aujourdhui < debut) return { label: 'À venir', css: 'badge-avenir' };
    if (aujourdhui >= debut && aujourdhui <= fin) return { label: 'En cours', css: 'badge-encours' };
    return { label: 'Expiré', css: 'badge-expire' };
  }

  // ---------- RAPPORT DE TRAVAIL ----------
  // Journal local des activités du travailleur (aucun backend dédié pour l'instant).

  private chargerRapports(): void {
    try {
      const brut = localStorage.getItem(CLE_STOCKAGE_RAPPORTS);
      this.rapports.set(brut ? JSON.parse(brut) : []);
    } catch {
      this.rapports.set([]);
    }
  }

  private sauvegarderRapports(): void {
    localStorage.setItem(CLE_STOCKAGE_RAPPORTS, JSON.stringify(this.rapports()));
  }

  ajouterRapport(): void {
    const donnees = this.formRapport();
    if (!donnees.titre.trim() || !donnees.description.trim()) {
      this.afficherToast('error', 'Veuillez renseigner un titre et une description.');
      return;
    }

    const auteur = this.profil()?.user_detail?.first_name
      || this.profil()?.user_detail?.username
      || 'Travailleur';

    const nouveauRapport: RapportTravail = {
      id: `${Date.now()}`,
      titre: donnees.titre.trim(),
      description: donnees.description.trim(),
      date: new Date().toISOString(),
      auteur
    };

    this.rapports.update(liste => [nouveauRapport, ...liste]);
    this.sauvegarderRapports();
    this.formRapport.set({ titre: '', description: '' });
    this.afficherToast('success', 'Rapport de travail enregistré.');
  }

  supprimerRapport(id: string): void {
    if (!confirm('Supprimer ce rapport de travail ?')) return;
    this.rapports.update(liste => liste.filter(r => r.id !== id));
    this.sauvegarderRapports();
    this.afficherToast('info', 'Rapport supprimé.');
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

  deconnexion(): void {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      this.router.navigate(['/login']);
    }
  }
}
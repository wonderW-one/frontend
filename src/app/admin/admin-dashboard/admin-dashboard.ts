import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ConfirmationDemandee {
  message: string;
  intitule: string;
  action: () => void;
}

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

  ongletActif = signal<'vue-ensemble' | 'bureaux' | 'batiments-niveaux' | 'reservations' | 'contrats' | 'suivi-clients' | 'suivi-workers' | 'paiements' | 'clients' | 'batiments' | 'fiche-clients'>('vue-ensemble');
  listeBureaux = signal<any[]>([]);
  listeReservations = signal<any[]>([]);
  listePaiements = signal<any[]>([]);
  totalRevenus = signal<number>(0);
  batiments = signal<any[]>([]);
  niveaux = signal<any[]>([]);
  typesBureau = signal<any[]>([]);
  listeContrats = signal<any[]>([]);
  listeClients = signal<any[]>([]);

  // ---------- STATISTIQUES PAR BÂTIMENT ----------
  statistiquesBatiments = signal<{ [id: number]: { taux_occupation: number; revenues_totaux: number; nombre_bureaux: number } }>({});

  // ---------- TOASTS ----------
  toasts = signal<Toast[]>([]);
  private toastIdCounter = 0;

  // ---------- MODALE DE CONFIRMATION ----------
  confirmationDemandee = signal<ConfirmationDemandee | null>(null);

  // ---------- FORMULAIRES ----------
  bureauForm = signal({
    numero: '',
    niveau: '',
    espace: 0,
    unite: 0,
    batiment: '',
    type: ''
  });

  batimentForm = signal({
    nom: '',
    adresse: '',
    nombre_etages: 0,
    proprietaire_nom: '',
    proprietaire_telephone: ''
  });

  niveauForm = signal({
    nom: '',
    batiment: ''
  });
  clientSelectionne = signal<any | null>(null);

  // ---------- KPIs ----------
  contratsEnAttente = computed(() =>
    this.listeContrats().filter(c => c.statut === 'EN_ATTENTE').length
  );

  paiementsEnAttenteAdmin = computed(() =>
    this.listePaiements().filter(p => (p.statut || p.statut_paiement) === 'PENDING_ADMIN').length
  );

  tauxOccupationMoyen = computed(() => {
    const stats = Object.values(this.statistiquesBatiments());
    if (!stats.length) return 0;
    const total = stats.reduce((s, b) => s + (b.taux_occupation || 0), 0);
    return Math.round((total / stats.length) * 10) / 10;
  });

  ngOnInit(): void {
    this.chargerDonneesAdmin();
  }

  chargerDonneesAdmin(): void {
    this.apiService.getBatiments().subscribe({
      next: (data: any[]) => {
        this.batiments.set(data);
        this.chargerStatistiquesBatiments(data);
      },
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

    this.apiService.getClients().subscribe({
      next: (data) => this.listeClients.set(data),
      error: (err) => console.error('Erreur clients admin', err)
    });
  }

  private chargerStatistiquesBatiments(batimentsList: any[]): void {
    batimentsList.forEach(b => {
      this.apiService.getStatistiquesBatiment(b.id).subscribe({
        next: (stats: any) => {
          this.statistiquesBatiments.update(s => ({ ...s, [b.id]: stats }));
        },
        error: (err: any) => console.error(`⚠️ Erreur statistiques bâtiment #${b.id} :`, err)
      });
    });
  }
  

  documentContratDuClient(userId: number): string | null {
    // 🔴 BUG CORRIGÉ : cette méthode reçoit l'ID de l'objet User (c.user_id, tel
    // qu'utilisé dans la fiche client), alors que `contrat.client` renvoyé par
    // l'API est la clé primaire du profil Client (Client.id), pas de User.id.
    // Ces deux valeurs ne coïncident quasiment jamais -> aucun document n'était
    // jamais trouvé. On compare désormais via contrat.client_detail.user.id,
    // qui est bien l'ID utilisateur.
    const contratsDuClient = this.listeContrats()
      .filter(c => c.client_detail?.user?.id === userId && c.document_contrat_signe)
      .sort((a, b) => b.id - a.id);
    return contratsDuClient.length ? contratsDuClient[0].document_contrat_signe : null;
  }

  voirFicheClient(client: any): void {
    this.clientSelectionne.set(client);
  }

  fermerFicheClient(): void {
    this.clientSelectionne.set(null);
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

  // ---------- GESTION DES BUREAUX ----------

  ajouterBureau(): void {
    const donnees = this.bureauForm();

    if (!donnees.numero || !donnees.espace || !donnees.batiment || !donnees.niveau || !donnees.type) {
      this.afficherToast('error', 'Veuillez remplir tous les champs obligatoires (numéro, superficie, bâtiment, niveau, type).');
      return;
    }

    this.apiService.creerBureau(donnees).subscribe({
      next: (res) => {
        this.afficherToast('success', 'Bureau enregistré avec succès.');
        this.listeBureaux.update(b => [...b, res]);
        this.bureauForm.set({
          numero: '', niveau: '', espace: 0, unite: 0, batiment: '', type: ''
        });
      },
      error: (err) => this.gererErreurBackend(err)
    });
  }

  onArchiverBureau(bureau: any): void {
    this.demanderConfirmation(
      `Archiver le bureau ${bureau.numero} ? Il ne sera plus proposé à la location.`,
      'Archiver',
      () => {
        this.apiService.archiverBureau(bureau.id).subscribe({
          next: () => {
            this.afficherToast('success', 'Bureau archivé avec succès.');
            this.listeBureaux.update(list => list.filter(b => b.id !== bureau.id));
          },
          error: (err) => this.gererErreurBackend(err)
        });
      }
    );
  }

  // ---------- GESTION DES BÂTIMENTS & NIVEAUX ----------

  ajouterBatiment(): void {
    const donnees = this.batimentForm();
    if (!donnees.nom || !donnees.adresse) {
      this.afficherToast('error', "Le nom et l'adresse du bâtiment sont obligatoires.");
      return;
    }

    this.apiService.creerBatiment(donnees).subscribe({
      next: (res) => {
        this.afficherToast('success', `Bâtiment "${res.nom}" créé avec succès.`);
        this.batiments.update(b => [...b, res]);
        this.batimentForm.set({ nom: '', adresse: '', nombre_etages: 0, proprietaire_nom: '', proprietaire_telephone: '' });
      },
      error: (err) => this.gererErreurBackend(err)
    });
  }

  ajouterNiveau(): void {
    const donnees = this.niveauForm();
    if (!donnees.nom || !donnees.batiment) {
      this.afficherToast('error', 'Le nom du niveau et le bâtiment associé sont obligatoires.');
      return;
    }

    this.apiService.creerNiveau(donnees).subscribe({
      next: (res) => {
        this.afficherToast('success', `Niveau "${res.nom}" créé avec succès.`);
        this.niveaux.update(n => [...n, res]);
        this.niveauForm.set({ nom: '', batiment: '' });
      },
      error: (err) => this.gererErreurBackend(err)
    });
  }

  statistiquesDuBatiment(batimentId: number) {
    return this.statistiquesBatiments()[batimentId] || null;
  }

  // ---------- GESTION DES CONTRATS ----------

  onValiderContrat(contratId: number): void {
    this.demanderConfirmation('Valider ce contrat maintenant ?', 'Valider', () => {
      this.apiService.validerContrat(contratId).subscribe({
        next: () => {
          this.afficherToast('success', 'Contrat validé avec succès.');
          this.chargerDonneesAdmin();
        },
        error: (err) => this.gererErreurBackend(err)
      });
    });
  }

  onRejeterContrat(contratId: number): void {
    this.demanderConfirmation('Rejeter cette demande de contrat ?', 'Rejeter', () => {
      this.apiService.rejeterContrat(contratId).subscribe({
        next: () => {
          this.afficherToast('info', 'Demande de contrat rejetée.');
          this.chargerDonneesAdmin();
        },
        error: (err) => this.gererErreurBackend(err)
      });
    });
  }

  // ---------- GESTION DES RÉSERVATIONS (validation admin/travailleur) ----------

  onValiderReservation(reservationId: number): void {
    this.demanderConfirmation('Valider cette réservation ?', 'Valider', () => {
      this.apiService.validerReservation(reservationId).subscribe({
        next: () => {
          this.afficherToast('success', 'Réservation validée avec succès.');
          this.chargerDonneesAdmin();
        },
        error: (err) => this.gererErreurBackend(err)
      });
    });
  }

  onRejeterReservation(reservationId: number): void {
    this.demanderConfirmation('Rejeter cette demande de réservation ?', 'Rejeter', () => {
      this.apiService.rejeterReservation(reservationId).subscribe({
        next: () => {
          this.afficherToast('info', 'Demande de réservation rejetée.');
          this.chargerDonneesAdmin();
        },
        error: (err) => this.gererErreurBackend(err)
      });
    });
  }

  onDocumentContratSelectionne(event: Event, contratId: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const fichier = input.files[0];

    this.apiService.uploaderDocumentContrat(contratId, fichier).subscribe({
      next: () => {
        this.afficherToast('success', 'Document de contrat téléversé avec succès.');
        this.chargerDonneesAdmin();
      },
      error: (err) => this.gererErreurBackend(err)
    });
    input.value = '';
  }

  // ---------- GESTION DES CLIENTS ----------

  onChangerRoleClient(client: any, nouveauRole: string): void {
    if (client.role === nouveauRole) return;
    this.demanderConfirmation(
      `Changer le rôle de ${client.user_detail?.first_name || client.user_detail?.username} en "${nouveauRole}" ?`,
      'Confirmer',
      () => {
        this.apiService.mettreAJourRoleClient(client.id, nouveauRole).subscribe({
          next: () => {
            this.afficherToast('success', 'Rôle mis à jour avec succès.');
            this.listeClients.update(list =>
              list.map(c => c.user_id === client.user_id ? { ...c, role: nouveauRole } : c)
            );
          },
          error: (err) => this.gererErreurBackend(err)
        });
      }
    );
  }

  changerOnglet(onglet: 'vue-ensemble' | 'bureaux' | 'batiments-niveaux' | 'reservations' | 'contrats' | 'suivi-clients' | 'suivi-workers' | 'paiements' | 'clients' | 'batiments' | 'fiche-clients'): void {
    this.ongletActif.set(onglet);
  }

  deconnexion(): void {
    this.demanderConfirmation('Voulez-vous vraiment vous déconnecter ?', 'Déconnexion', () => {
      localStorage.clear();
      this.router.navigate(['/login']);
    });
  }

  validerLePaiement(paiementId: number): void {
    this.demanderConfirmation('Voulez-vous vraiment marquer ce paiement comme PAYÉ ?', 'Valider le paiement', () => {
      this.apiService.validerPaiement(paiementId).subscribe({
        next: (res) => {
          this.afficherToast('success', res.detail || 'Paiement validé avec succès !');
          this.listePaiements.update(paiements =>
            paiements.map(p => p.id === paiementId ? { ...p, statut: 'PAID', statut_paiement: 'PAID' } : p)
          );
          this.recalculerRevenus();
        },
        error: (err) => this.gererErreurBackend(err)
      });
    });
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

  // ---------- TOASTS ----------

  afficherToast(type: 'success' | 'error' | 'info', message: string): void {
    const id = ++this.toastIdCounter;
    this.toasts.update(t => [...t, { id, type, message }]);
    setTimeout(() => this.retirerToast(id), 4500);
  }

  retirerToast(id: number): void {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }

  // ---------- MODALE DE CONFIRMATION ----------

  demanderConfirmation(message: string, intitule: string, action: () => void): void {
    this.confirmationDemandee.set({ message, intitule, action });
  }

  confirmerAction(): void {
    const demande = this.confirmationDemandee();
    if (demande) {
      demande.action();
    }
    this.confirmationDemandee.set(null);
  }

  annulerConfirmation(): void {
    this.confirmationDemandee.set(null);
  }

  private gererErreurBackend(err: any): void {
    console.error('Erreur backend :', err);
    let message = 'Une erreur est survenue.';
    if (err.error && typeof err.error === 'object') {
      const cles = Object.keys(err.error);
      const premierMessage = err.error[cles[0]];
      message = Array.isArray(premierMessage) ? premierMessage[0] : premierMessage;
    } else {
      message = err.error?.detail || err.message || 'Erreur inconnue.';
    }
    this.afficherToast('error', message);
  }
}
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  // Signaux pour stocker les états de l'application
  client = signal<any>(null);
  bureauxDisponibles = signal<any[]>([]);
  reservations = signal<any[]>([]);
  paiements = signal<any[]>([]);
  
  bureauSelectionneId = signal<number | null>(null);

  // Gestion des formulaires via un Signal dictionnaire réactif
  formReservation = signal<{ [key: number]: { dateDebut: string; dateFin: string } }>({});

  ngOnInit(): void {
    const token = localStorage.getItem('access_token');
    
    if (token) {
      this.chargerDonneesTableauDeBord();
    } else {
      this.executerConnexionTemporaire();
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
      error: (err: any) => console.error('La connexion a échoué. Vérifiez vos identifiants Django.', err)
    });
  }

  chargerDonneesTableauDeBord(): void {
    console.log("Démarrage du chargement des données via Token JWT...");
  
    // 1. Profil utilisateur connecté
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
  
    // 3. Réservations
    this.apiService.getMesReservations().subscribe({
      next: (data: any) => this.reservations.set(data),
      error: (err: any) => console.error('⚠️ Erreur réservations :', err)
    });
  
    // 4. Paiements
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
    
    // On extrait l'année, le mois et le jour de manière isolée pour éviter les décalages de fuseaux horaires (Timezone)
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

    // CORRECTION : Nettoyage et formatage strict avant l'envoi à l'API
    const dateDebutNettoyee = this.formaterDatePourDjango(dates.dateDebut);
    const dateFinNettoyee = this.formaterDatePourDjango(dates.dateFin);

    this.apiService.creerReservation(bureauId, dateDebutNettoyee, dateFinNettoyee).subscribe({
      next: () => {
        alert('Réservation enregistrée avec succès !');
        this.bureauSelectionneId.set(null);
        this.chargerDonneesTableauDeBord(); // Rafraîchissement automatique des listes
      },
      error: (err: any) => {
        console.error(err);
        // Affiche un message d'erreur plus lisible si Django renvoie un dictionnaire
        const messageErreur = err.error && typeof err.error === 'object' 
          ? JSON.stringify(err.error) 
          : err.message;
        alert('Erreur lors de la réservation : ' + messageErreur);
      }
    });
  }
}
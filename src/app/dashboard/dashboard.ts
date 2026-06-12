import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  currentClientId = 1; 

  // Déclaration des Signaux d'état
  client = signal<any>(null);
  bureauxDisponibles = signal<any[]>([]);
  reservations = signal<any[]>([]);
  paiements = signal<any[]>([]);
  
  bureauSelectionneId: number | null = null;
  formReservation: { [key: number]: { dateDebut: string; dateFin: string } } = {};

  ngOnInit(): void {
    const username = "wonder1"; 
    const password = "wonder123"; 

    this.apiService.login(username, password).subscribe({
      next: (tokens: any) => {
        console.log('Jeton JWT obtenu !');
        localStorage.setItem('access_token', tokens.access);
        
        // On charge les données maintenant qu'on est authentifié
        this.chargerDonneesTableauDeBord();
      },
      error: (err: any) => {
        console.error('La connexion a échoué. Vérifiez vos identifiants Django.', err);
      }
    });
  }

  chargerDonneesTableauDeBord(): void {
    console.log("Démarrage du chargement des données pour le client ID :", this.currentClientId);
  
    // 1. Profil
    this.apiService.getProfile(this.currentClientId).subscribe({
      next: (data: any) => {
        this.client.set(data);
        console.log('Données profil reçues avec succès :', this.client());
      },
      error: (err: any) => {
        console.error('⚠️ Erreur critique profil :', err);
      }
    });
  
    // 2. Bureaux Disponibles
    this.apiService.getBureauxDisponibles().subscribe({
      next: (data: any[]) => { 
        this.bureauxDisponibles.set(data);
        console.log('Données bureaux reçues avec succès :', this.bureauxDisponibles());
        
        // Initialisation des formulaires de réservation pour chaque bureau
        if (data) {
          data.forEach((b: any) => {
            this.formReservation[b.id] = { dateDebut: '', dateFin: '' };
          });
        }
      },
      error: (err: any) => {
        console.error('⚠️ Erreur critique bureaux :', err);
      }
    });
  
    // 3. Réservations
    this.apiService.getMesReservations().subscribe({
      next: (data: any) => {
        this.reservations.set(data);
        console.log('Données réservations reçues avec succès :', this.reservations());
      },
      error: (err: any) => {
        console.error('⚠️ Erreur critique réservations :', err);
      }
    });
  
    // 4. Paiements
    this.apiService.getPaiements().subscribe({
      next: (data: any) => {
        this.paiements.set(data);
        console.log('Données paiements reçues avec succès :', this.paiements());
      },
      error: (err: any) => {
        console.error('⚠️ Erreur critique paiements :', err);
      }
    });
  }

  toggleDetails(bureauId: number): void {
    this.bureauSelectionneId = this.bureauSelectionneId === bureauId ? null : bureauId;
  }

  onReserver(bureauId: number): void {
    const dates = this.formReservation[bureauId];
    
    if (!dates || !dates.dateDebut || !dates.dateFin) {
      alert('Veuillez renseigner les deux dates.');
      return;
    }

    this.apiService.creerReservation(
      bureauId, 
      this.currentClientId, 
      dates.dateDebut, 
      dates.dateFin
    ).subscribe({
      next: () => {
        alert('Réservation enregistrée !');
        this.bureauSelectionneId = null;
        this.chargerDonneesTableauDeBord(); // Rafraîchit automatiquement les signaux
      },
      error: (err: any) => {
        console.error(err);
        alert('Erreur lors de la réservation : ' + JSON.stringify(err.error));
      }
    });
  }
}
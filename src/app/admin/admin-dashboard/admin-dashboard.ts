import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule , ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule , ReactiveFormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  ongletActif = signal<'vue-ensemble' | 'bureaux' | 'reservations' | 'paiements'>('vue-ensemble');
  listeBureaux = signal<any[]>([]);
  listeReservations = signal<any[]>([]);
  listePaiements = signal<any[]>([]);
  totalRevenus = signal<number>(0);

  bureauForm = signal({
    numero: '',
    niveau: 0,
    espace: 0,
    prix: 0,
    unite: 0,
    batiment: '', 
    type: 0
  });

  ngOnInit(): void {
    this.chargerDonneesAdmin();
  }

  chargerDonneesAdmin(): void {
    this.apiService.getBureauxDisponibles().subscribe({
      next: (data) => this.listeBureaux.set(data),
      error: (err) => console.error('Erreur bureaux admin', err)
    });

    this.apiService.getMesReservations().subscribe({
      next: (data) => this.listeReservations.set(data),
      error: (err) => console.error('Erreur réservations admin', err)
    });

    this.apiService.getPaiements().subscribe({
      next: (data) => {
        this.listePaiements.set(data);
        const revenus = data
        .filter((p: any) => {
          const statut = p.statut || p.statut_paiement;
          return statut === 'PAID' || statut === 'PAYE' || statut === 'COMPLETED';
        })
        .reduce((sum: number, current: any) => sum + Number(current.montant), 0);
        this.totalRevenus.set(revenus);
      },
      error: (err) => console.error('Erreur paiements admin', err)
    });
  }

  ajouterBureau(): void {
    console.log('--- tentative d’ajout de bureau ---');
    const donnees = this.bureauForm();
    console.log('Données actuelles du formulaire :', donnees);
  
    if (!donnees.numero || !donnees.espace) {
        alert('Veuillez remplir le numéro et la superficie.');
        return;
    }
  
    console.log('Envoi de la requête HTTP via ApiService...');
    this.apiService.creerBureau(donnees).subscribe({
      next: (res) => {
        console.log('Réponse positive du serveur Django !', res);
        alert('Bureau enregistré !');
        this.listeBureaux.update(b => [...b, res]);
      },
      error: (err) => {
        console.error('Le serveur Django a renvoyé une erreur :', err);
        alert(`Erreur serveur : ${err.status} - ${err.message}`);
      }
    });
  }

  changerOnglet(onglet: 'vue-ensemble' | 'bureaux' | 'reservations' | 'paiements'): void {
    this.ongletActif.set(onglet);
  }

  deconnexion(): void {
    localStorage.removeItem('access_token');
    this.router.navigate(['/login']);
  }
}
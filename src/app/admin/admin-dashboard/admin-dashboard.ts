import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    espace: 0,
    prix: 0,
    unite: 'Mois',
    batiment: '', 
    type_bureau: '' 
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
          .filter((p: any) => p.statut_paiement === 'PAYE' || p.statut_paiement === 'PAID')
          .reduce((sum: number, current: any) => sum + Number(current.montant), 0);
        this.totalRevenus.set(revenus);
      },
      error: (err) => console.error('Erreur paiements admin', err)
    });
  }

  ajouterBureau(): void {
    const donnees = this.bureauForm();
    if (!donnees.numero || !donnees.prix) {
      alert('Veuillez remplir les champs obligatoires.');
      return;
    }
    console.log('Données envoyées au backend Django :', donnees);
    alert('Action simulée avec succès ! (Données prêtes pour Django)');
  }

  changerOnglet(onglet: 'vue-ensemble' | 'bureaux' | 'reservations' | 'paiements'): void {
    this.ongletActif.set(onglet);
  }

  deconnexion(): void {
    localStorage.removeItem('access_token');
    this.router.navigate(['/login']);
  }
}
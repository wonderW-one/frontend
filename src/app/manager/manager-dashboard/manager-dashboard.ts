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
  chiffreAffaire = signal<number>(0);

  ngOnInit(): void {
    this.chargerDonneesManager();
  }

  chargerDonneesManager(): void {
    this.apiService.getMesReservations().subscribe(data => this.listeReservations.set(data));
    this.apiService.getPaiements().subscribe(data => {
      this.listePaiements.set(data);
      const total = data
        .filter((p: any) => p.statut_paiement === 'PAYE' || p.statut_paiement === 'PAID')
        .reduce((sum: number, current: any) => sum + Number(current.montant), 0);
      this.chiffreAffaire.set(total);
    });
  }

  deconnexion(): void {
    localStorage.removeItem('access_token');
    this.router.navigate(['/login']);
  }
}
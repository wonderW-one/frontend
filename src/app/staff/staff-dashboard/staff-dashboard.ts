import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './staff-dashboard.html',
  styleUrls: ['./staff-dashboard.css']
})
export class StaffDashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);
  bureauxStatut = signal<any[]>([]);

  ngOnInit(): void {
    // ✅ CORRIGÉ : on charge TOUS les bureaux, pas seulement les disponibles,
    // sinon l'écran "Statut des Espaces (Temps Réel)" ne peut jamais montrer un bureau occupé
    this.apiService.getBureaux().subscribe({
      next: (data) => this.bureauxStatut.set(data),
      error: (err) => console.error('Erreur bureaux staff', err)
    });
  }

  deconnexion(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
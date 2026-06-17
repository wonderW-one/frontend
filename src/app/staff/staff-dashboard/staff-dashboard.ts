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
    this.apiService.getBureauxDisponibles().subscribe({
      next: (data) => this.bureauxStatut.set(data),
      error: (err) => console.error('Erreur bureaux staff', err)
    });
  }

  deconnexion(): void {
    localStorage.removeItem('access_token');
    this.router.navigate(['/login']);
  }
}
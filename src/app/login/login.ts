import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';
import { jwtDecode } from 'jwt-decode';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  private apiService = inject(ApiService);
  private router = inject(Router);

  username = '';
  password = '';
  errorMessage = signal<string | null>(null);

  onLogin(): void {
    this.apiService.login(this.username, this.password).subscribe({
      next: (tokens: any) => {
        // 1. Stocker le token
        localStorage.setItem('access_token', tokens.access);

        try {
          // 2. Décoder le token pour obtenir le rôle
          const decoded: any = jwtDecode(tokens.access);
          const role = decoded.role; // Assure-toi que ton backend envoie bien la clé 'role'

          // 3. Redirection automatique selon le rôle
          this.redirigerSelonRole(role);

        } catch (error) {
          this.errorMessage.set("Erreur lors de la lecture des droits utilisateur.");
        }
      },
      error: (err) => {
        this.errorMessage.set("Identifiants incorrects ou serveur indisponible.");
      }
    });
  }

  private redirigerSelonRole(role: string): void {
    switch (role) {
      case 'ADMIN':
        this.router.navigate(['/admin-dashboard']);
        break;
      case 'MANAGER':
        this.router.navigate(['/manager-dashboard']);
        break;
      case 'TRAVAILLEUR':
      case 'STAFF':
        this.router.navigate(['/staff-dashboard']);
        break;
      case 'CLIENT':
      default:
        this.router.navigate(['/dashboard']); // Ton tableau de bord client actuel
        break;
    }
  }
}
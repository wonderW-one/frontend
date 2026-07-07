import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  private apiService = inject(ApiService);
  private router = inject(Router);

  username = '';
  password = '';
  chargementEnCours = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  onLogin(): void {
    if (!this.username || !this.password) {
      this.errorMessage.set('Veuillez renseigner votre identifiant et votre mot de passe.');
      return;
    }

    this.chargementEnCours.set(true);
    this.errorMessage.set(null);

    this.apiService.login(this.username, this.password).subscribe({
      next: (response: { access: string; refresh: string }) => {
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
        this.chargementEnCours.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.chargementEnCours.set(false);
        if (err.status === 401) {
          this.errorMessage.set("Nom d'utilisateur ou mot de passe incorrect.");
        } else {
          this.errorMessage.set('Erreur de connexion au serveur backend.');
        }
      }
    });
  }
}
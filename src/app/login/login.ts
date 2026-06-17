import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h2>Connexion Espace Bureau</h2>
        <p class="subtitle">Accédez à votre tableau de bord de réservation</p>

        @if (errorMessage()) {
          <div class="error-banner">
            {{ errorMessage() }}
          </div>
        }

        <form [formGroup]="loginForm" (ngSubmit)="onLogin()">
          <div class="form-group">
            <label for="username">Nom d'utilisateur</label>
            <input id="username" type="text" formControlName="username" class="form-input">
          </div>

          <div class="form-group">
            <label for="password">Mot de passe</label>
            <input id="password" type="password" formControlName="password" class="form-input">
          </div>

          <button type="submit" [disabled]="loginForm.invalid" class="btn-login">
            Se connecter
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f1f5f9; }
    .login-card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); width: 100%; max-width: 400px; }
    h2 { color: #1e293b; margin-bottom: 0.5rem; font-size: 1.5rem; text-align: center; }
    .subtitle { color: #64748b; font-size: 0.875rem; margin-bottom: 2rem; text-align: center; }
    .form-group { margin-bottom: 1.25rem; }
    label { display: block; font-size: 0.875rem; color: #475569; margin-bottom: 0.5rem; font-weight: 500; }
    .form-input { width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem; box-sizing: border-box; }
    .form-input:focus { border-color: #6366f1; outline: none; }
    .btn-login { width: 100%; padding: 0.75rem; background: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 1rem; }
    .btn-login:disabled { background: #94a3b8; cursor: not-allowed; }
    .error-banner { background: #fee2e2; color: #991b1b; padding: 0.75rem; border-radius: 6px; font-size: 0.875rem; margin-bottom: 1.25rem; border: 1px solid #fca5a5; }
  `]
})
export class LoginComponent {
  private fb = inject(NonNullableFormBuilder);
  private apiService = inject(ApiService);
  private router = inject(Router);

  errorMessage = signal<string | null>(null);

  // Initialisation par défaut avec vos paramètres Django de test
  loginForm = this.fb.group({
    username: ['wonder1', [Validators.required]],
    password: ['wonder123', [Validators.required]]
  });

  onLogin(): void {
    if (this.loginForm.invalid) return;

    const { username, password } = this.loginForm.getRawValue();

    this.apiService.login(username, password).subscribe({
      next: (tokens: any) => {
        // Enregistrement des données de session globale
        localStorage.setItem('access_token', tokens.access);
        
        // Extraction de l'ID utilisateur de la charge utile Django
        const userId = tokens.user_id || 1; 
        localStorage.setItem('user_id', userId.toString());

        // Redirection vers le Dashboard sécurisé
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set(
          err.error?.detail || 'Impossible de s\'authentifier. Vérifiez vos identifiants API.'
        );
      }
    });
  }
}
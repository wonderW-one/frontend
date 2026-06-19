import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  private apiService = inject(ApiService);
  private router = inject(Router);

  // État initial des données exigées par le ClientSerializer
  formInscription = signal({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    telephone: '',
    addresse: '',
    date_naissance: ''
  });

  chargementEnCours = signal<boolean>(false);

  onInscription(): void {
    const data = this.formInscription();

    // Petite validation de sécurité côté client
    if (!data.username || !data.password || !data.email || !data.first_name || !data.last_name) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    this.chargementEnCours.set(true);

    this.apiService.registerClient(data).subscribe({
      next: (response) => {
        alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
        this.chargementEnCours.set(false);
        this.router.navigate(['/login']); // Redirection vers la page de connexion
      },
      error: (err) => {
        this.chargementEnCours.set(false);
        console.error("Erreur d'inscription :", err);
        
        // Extraction des erreurs de validation (ex: "Ce nom d'utilisateur est déjà pris.")
        if (err.error && typeof err.error === 'object') {
          const clesErreurs = Object.keys(err.error);
          const premierMessage = err.error[clesErreurs[0]];
          alert(`Erreur : ${Array.isArray(premierMessage) ? premierMessage[0] : premierMessage}`);
        } else {
          alert("Une erreur est survenue lors de l'inscription.");
        }
      }
    });
  }
}
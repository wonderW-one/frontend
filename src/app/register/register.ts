// register.ts
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api';

interface FormulaireInscription {
  username?: string;
  password?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  telephone?: string | null;
  addresse?: string | null;
  date_naissance?: string | null;
  lieu_naissance?: string | null;
  nationalite?: string | null;
  profession?: string | null;
  type_piece_identite?: string | null;
  numero_piece_identite?: string | null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  private apiService = inject(ApiService);
  private router = inject(Router);

  formInscription = signal<FormulaireInscription>({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    telephone: '',
    addresse: '',
    date_naissance: '',
    lieu_naissance: '',
    nationalite: '',
    profession: '',
    type_piece_identite: '',
    numero_piece_identite: ''
  });

  fichierPhoto = signal<File | null>(null);
  chargementEnCours = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  onFichierSelectionne(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fichierPhoto.set(input.files[0]);
    }
  }

  onInscription(): void {
    const donnees = this.formInscription();

    if (!donnees.username || !donnees.password) {
      this.errorMessage.set("Le nom d'utilisateur et le mot de passe sont obligatoires.");
      return;
    }

    this.chargementEnCours.set(true);
    this.errorMessage.set(null);

    const formData = new FormData();
    Object.entries(donnees).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        formData.append(key, value as string);
      }
    });

    const photo = this.fichierPhoto();
    if (photo) {
      formData.append('photo_profil', photo, photo.name);
    }

    this.apiService.registerClient(formData).subscribe({
      next: () => {
        this.chargementEnCours.set(false);
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        this.chargementEnCours.set(false);
        this.errorMessage.set(this.extraireMessageErreur(err));
      }
    });
  }

  private extraireMessageErreur(err: any): string {
    if (err.error && typeof err.error === 'object') {
      if (err.error.detail) {
        return typeof err.error.detail === 'string' ? err.error.detail : JSON.stringify(err.error.detail);
      }
      return Object.entries(err.error)
        .map(([key, val]) => `${key} : ${Array.isArray(val) ? (val as string[]).join(', ') : val}`)
        .join(' | ');
    }
    return "Une erreur inattendue est survenue lors de l'inscription.";
  }
}
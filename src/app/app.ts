import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // 1. Importation du module de routage d'Angular

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet], // 2. On déclare RouterOutlet dans les imports
  template: `<router-outlet></router-outlet>` // 3. On demande à Angular d'afficher le composant lié à l'URL actuelle
})
export class App {}
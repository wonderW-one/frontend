import { Component } from '@angular/core';
import { DashboardComponent } from './dashboard/dashboard'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DashboardComponent], // On a enlevé RouterOutlet ici
  template: `<app-dashboard></app-dashboard>`
})
export class App {}
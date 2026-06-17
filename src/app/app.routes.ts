import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { DashboardComponent } from './dashboard/dashboard'; // Client
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard';
import { ManagerDashboardComponent } from './manager/manager-dashboard/manager-dashboard';
import { StaffDashboardComponent } from './staff/staff-dashboard/staff-dashboard';
import { authGuard } from './auth-guard';

export const routes: Routes = [
  // La route login ne doit JAMAIS avoir de canActivate: [authGuard]
  { path: 'login', component: LoginComponent },
  
  // Configuration des rôles attendus par le guard
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [authGuard], 
    data: { roleAttendu: 'CLIENT' } 
  },
  { 
    path: 'admin-dashboard', 
    component: AdminDashboardComponent, 
    canActivate: [authGuard], 
    data: { roleAttendu: 'ADMIN' } 
  },
  { 
    path: 'manager-dashboard', 
    component: ManagerDashboardComponent, 
    canActivate: [authGuard], 
    data: { roleAttendu: 'MANAGER' } 
  },
  { 
    path: 'staff-dashboard', 
    component: StaffDashboardComponent, 
    canActivate: [authGuard], 
    data: { roleAttendu: 'STAFF' } 
  },

  // Redirections par défaut (sans slash initial)
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
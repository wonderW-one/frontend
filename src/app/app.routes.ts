import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { DashboardComponent } from './dashboard/dashboard';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard';
import { ManagerDashboardComponent } from './manager/manager-dashboard/manager-dashboard';
import { StaffDashboardComponent } from './staff/staff-dashboard/staff-dashboard';
import { authGuard } from './auth-guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

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
    data: { roleAttendu: 'TRAVAILLEUR' }
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
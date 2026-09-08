import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent)
  }
];

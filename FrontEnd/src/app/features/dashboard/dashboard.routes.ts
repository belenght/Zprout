import { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard-view/dashboard-view').then((m) => m.DashboardViewComponent)
  }
];

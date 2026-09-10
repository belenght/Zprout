import { Routes } from '@angular/router';

export const limpiezaClasificacionRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/limpieza-bandeja/limpieza-bandeja').then((m) => m.LimpiezaBandejaComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/limpieza-form/limpieza-form').then((m) => m.LimpiezaFormComponent)
  }
];

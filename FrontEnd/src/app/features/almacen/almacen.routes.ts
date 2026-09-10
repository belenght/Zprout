import { Routes } from '@angular/router';

export const almacenRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/almacen-list/almacen-list').then((m) => m.AlmacenListComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/almacen-form/almacen-form').then((m) => m.AlmacenFormComponent)
  }
];

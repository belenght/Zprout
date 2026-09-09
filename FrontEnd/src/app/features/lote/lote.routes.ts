import { Routes } from '@angular/router';

export const loteRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/lote-list/lote-list').then((m) => m.LoteListComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/lote-ingreso/lote-ingreso').then((m) => m.LoteIngresoComponent)
  },
  {
    path: 'detalle/:id',
    loadComponent: () => import('./pages/lote-detalle/lote-detalle').then((m) => m.LoteDetalleComponent)
  }
];

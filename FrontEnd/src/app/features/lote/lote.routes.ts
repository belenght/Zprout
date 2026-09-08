import { Routes } from '@angular/router';

export const loteRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/lote-list/lote-list').then((m) => m.LoteListComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/lote-ingreso/lote-ingreso').then((m) => m.LoteIngresoComponent)
  }
  // TODO: agregar 'detalle/:id' con el stepper visual del ciclo de vida del lote
  // (Ingreso -> CC Inicial -> Limpieza -> CC Intermedio -> Est. Venta -> Curado -> CC Final -> Habilitado).
];

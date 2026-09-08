import { Routes } from '@angular/router';

export const tipoSemillaRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/tipo-semilla-list/tipo-semilla-list').then(m => m.TipoSemillaListComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/tipo-semilla-form/tipo-semilla-form').then(m => m.TipoSemillaFormComponent)
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/tipo-semilla-form/tipo-semilla-form').then(m => m.TipoSemillaFormComponent)
  }
];

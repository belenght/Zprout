import { Routes } from '@angular/router';

// TODO: este feature todavia no tiene pages (list/form).
// Para completarlo, copiar la carpeta pages/ de features/tipo-semilla/
// y reemplazar TipoSemilla -> Insumo / tipo-semilla -> insumo.
//
// Una vez creadas las pages, descomentar esto y la linea correspondiente
// en app.routes.ts:
//
// export const insumoRoutes: Routes = [
//   { path: '', loadComponent: () => import('./pages/insumo-list/insumo-list').then(m => m.InsumoListComponent) },
//   { path: 'nuevo', loadComponent: () => import('./pages/insumo-form/insumo-form').then(m => m.InsumoFormComponent) },
//   { path: 'editar/:id', loadComponent: () => import('./pages/insumo-form/insumo-form').then(m => m.InsumoFormComponent) }
// ];

export const insumoRoutes: Routes = [];

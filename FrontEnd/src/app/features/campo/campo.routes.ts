import { Routes } from '@angular/router';

// TODO: este feature todavia no tiene pages (list/form).
// Para completarlo, copiar la carpeta pages/ de features/tipo-semilla/
// y reemplazar TipoSemilla -> Campo / tipo-semilla -> campo.
//
// Una vez creadas las pages, descomentar esto y la linea correspondiente
// en app.routes.ts:
//
// export const campoRoutes: Routes = [
//   { path: '', loadComponent: () => import('./pages/campo-list/campo-list').then(m => m.CampoListComponent) },
//   { path: 'nuevo', loadComponent: () => import('./pages/campo-form/campo-form').then(m => m.CampoFormComponent) },
//   { path: 'editar/:id', loadComponent: () => import('./pages/campo-form/campo-form').then(m => m.CampoFormComponent) }
// ];

export const campoRoutes: Routes = [];

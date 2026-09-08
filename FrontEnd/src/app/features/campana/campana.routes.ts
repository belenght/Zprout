import { Routes } from '@angular/router';

// TODO: este feature todavia no tiene pages (list/form).
// Para completarlo, copiar la carpeta pages/ de features/tipo-semilla/
// y reemplazar TipoSemilla -> Campana / tipo-semilla -> campana.
//
// Una vez creadas las pages, descomentar esto y la linea correspondiente
// en app.routes.ts:
//
// export const campanaRoutes: Routes = [
//   { path: '', loadComponent: () => import('./pages/campana-list/campana-list').then(m => m.CampanaListComponent) },
//   { path: 'nuevo', loadComponent: () => import('./pages/campana-form/campana-form').then(m => m.CampanaFormComponent) },
//   { path: 'editar/:id', loadComponent: () => import('./pages/campana-form/campana-form').then(m => m.CampanaFormComponent) }
// ];

export const campanaRoutes: Routes = [];

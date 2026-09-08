import { Routes } from '@angular/router';

// TODO: este feature todavia no tiene pages (list/form).
// Para completarlo, copiar la carpeta pages/ de features/tipo-semilla/
// y reemplazar TipoSemilla -> Partida / tipo-semilla -> partida.
//
// Una vez creadas las pages, descomentar esto y la linea correspondiente
// en app.routes.ts:
//
// export const partidaRoutes: Routes = [
//   { path: '', loadComponent: () => import('./pages/partida-list/partida-list').then(m => m.PartidaListComponent) },
//   { path: 'nuevo', loadComponent: () => import('./pages/partida-form/partida-form').then(m => m.PartidaFormComponent) },
//   { path: 'editar/:id', loadComponent: () => import('./pages/partida-form/partida-form').then(m => m.PartidaFormComponent) }
// ];

export const partidaRoutes: Routes = [];

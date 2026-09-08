import { Routes } from '@angular/router';

// TODO: este feature todavia no tiene pages (list/form).
// Para completarlo, copiar la carpeta pages/ de features/tipo-semilla/
// y reemplazar TipoSemilla -> Almacen / tipo-semilla -> almacen.
//
// Una vez creadas las pages, descomentar esto y la linea correspondiente
// en app.routes.ts:
//
// export const almacenRoutes: Routes = [
//   { path: '', loadComponent: () => import('./pages/almacen-list/almacen-list').then(m => m.AlmacenListComponent) },
//   { path: 'nuevo', loadComponent: () => import('./pages/almacen-form/almacen-form').then(m => m.AlmacenFormComponent) },
//   { path: 'editar/:id', loadComponent: () => import('./pages/almacen-form/almacen-form').then(m => m.AlmacenFormComponent) }
// ];

export const almacenRoutes: Routes = [];

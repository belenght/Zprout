import { Routes } from '@angular/router';

// TODO: este feature todavia no tiene pages (list/form).
// Para completarlo, copiar la carpeta pages/ de features/tipo-semilla/
// y reemplazar TipoSemilla -> EstimacionVenta / tipo-semilla -> estimacion-venta.
//
// Una vez creadas las pages, descomentar esto y la linea correspondiente
// en app.routes.ts:
//
// export const estimacionVentaRoutes: Routes = [
//   { path: '', loadComponent: () => import('./pages/estimacion-venta-list/estimacion-venta-list').then(m => m.EstimacionVentaListComponent) },
//   { path: 'nuevo', loadComponent: () => import('./pages/estimacion-venta-form/estimacion-venta-form').then(m => m.EstimacionVentaFormComponent) },
//   { path: 'editar/:id', loadComponent: () => import('./pages/estimacion-venta-form/estimacion-venta-form').then(m => m.EstimacionVentaFormComponent) }
// ];

export const estimacionVentaRoutes: Routes = [];

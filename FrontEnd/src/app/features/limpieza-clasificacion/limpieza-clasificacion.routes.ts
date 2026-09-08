import { Routes } from '@angular/router';

// TODO: este feature todavia no tiene pages (list/form).
// Para completarlo, copiar la carpeta pages/ de features/tipo-semilla/
// y reemplazar TipoSemilla -> LimpiezaClasificacion / tipo-semilla -> limpieza-clasificacion.
//
// Una vez creadas las pages, descomentar esto y la linea correspondiente
// en app.routes.ts:
//
// export const limpiezaClasificacionRoutes: Routes = [
//   { path: '', loadComponent: () => import('./pages/limpieza-clasificacion-list/limpieza-clasificacion-list').then(m => m.LimpiezaClasificacionListComponent) },
//   { path: 'nuevo', loadComponent: () => import('./pages/limpieza-clasificacion-form/limpieza-clasificacion-form').then(m => m.LimpiezaClasificacionFormComponent) },
//   { path: 'editar/:id', loadComponent: () => import('./pages/limpieza-clasificacion-form/limpieza-clasificacion-form').then(m => m.LimpiezaClasificacionFormComponent) }
// ];

export const limpiezaClasificacionRoutes: Routes = [];

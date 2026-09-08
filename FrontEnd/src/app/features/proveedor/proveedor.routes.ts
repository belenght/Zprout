import { Routes } from '@angular/router';

// TODO: este feature todavia no tiene pages (list/form).
// Para completarlo, copiar la carpeta pages/ de features/tipo-semilla/
// y reemplazar TipoSemilla -> Proveedor / tipo-semilla -> proveedor.
//
// Una vez creadas las pages, descomentar esto y la linea correspondiente
// en app.routes.ts:
//
// export const proveedorRoutes: Routes = [
//   { path: '', loadComponent: () => import('./pages/proveedor-list/proveedor-list').then(m => m.ProveedorListComponent) },
//   { path: 'nuevo', loadComponent: () => import('./pages/proveedor-form/proveedor-form').then(m => m.ProveedorFormComponent) },
//   { path: 'editar/:id', loadComponent: () => import('./pages/proveedor-form/proveedor-form').then(m => m.ProveedorFormComponent) }
// ];

export const proveedorRoutes: Routes = [];

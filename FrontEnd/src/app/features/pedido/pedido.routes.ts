import { Routes } from '@angular/router';

// TODO: este feature todavia no tiene pages (list/form).
// Para completarlo, copiar la carpeta pages/ de features/tipo-semilla/
// y reemplazar TipoSemilla -> Pedido / tipo-semilla -> pedido.
//
// Una vez creadas las pages, descomentar esto y la linea correspondiente
// en app.routes.ts:
//
// export const pedidoRoutes: Routes = [
//   { path: '', loadComponent: () => import('./pages/pedido-list/pedido-list').then(m => m.PedidoListComponent) },
//   { path: 'nuevo', loadComponent: () => import('./pages/pedido-form/pedido-form').then(m => m.PedidoFormComponent) },
//   { path: 'editar/:id', loadComponent: () => import('./pages/pedido-form/pedido-form').then(m => m.PedidoFormComponent) }
// ];

export const pedidoRoutes: Routes = [];

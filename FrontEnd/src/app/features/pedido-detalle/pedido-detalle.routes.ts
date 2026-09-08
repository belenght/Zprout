import { Routes } from '@angular/router';

// TODO: este feature todavia no tiene pages (list/form).
// Para completarlo, copiar la carpeta pages/ de features/tipo-semilla/
// y reemplazar TipoSemilla -> PedidoDetalle / tipo-semilla -> pedido-detalle.
//
// Una vez creadas las pages, descomentar esto y la linea correspondiente
// en app.routes.ts:
//
// export const pedidoDetalleRoutes: Routes = [
//   { path: '', loadComponent: () => import('./pages/pedido-detalle-list/pedido-detalle-list').then(m => m.PedidoDetalleListComponent) },
//   { path: 'nuevo', loadComponent: () => import('./pages/pedido-detalle-form/pedido-detalle-form').then(m => m.PedidoDetalleFormComponent) },
//   { path: 'editar/:id', loadComponent: () => import('./pages/pedido-detalle-form/pedido-detalle-form').then(m => m.PedidoDetalleFormComponent) }
// ];

export const pedidoDetalleRoutes: Routes = [];

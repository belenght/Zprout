import { Routes } from '@angular/router';

export const controlCalidadRoutes: Routes = [
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/control-calidad-form/control-calidad-form').then((m) => m.ControlCalidadFormComponent)
  }
  // TODO: agregar 'listado' (historial de controles) y el formulario de CC Final
  // sobre Partida (seccion D, segundo formulario del brief) cuando se necesite.
];

import { Routes } from '@angular/router';

export const controlCalidadRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/control-calidad-bandeja/control-calidad-bandeja').then((m) => m.ControlCalidadBandejaComponent)
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/control-calidad-form/control-calidad-form').then((m) => m.ControlCalidadFormComponent)
  }
  // TODO: el formulario de CC Final (sobre Partida) vive en el modulo de Partida (CUU06),
  // no aca -- este modulo solo cubre CC inicial/intermedio sobre Lote.
];

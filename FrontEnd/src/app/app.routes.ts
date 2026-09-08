import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes)
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayoutComponent),
    //canActivate: [authGuard], //DESCOMENTAR CUANDO HABILITEMOS LOGIN
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // --- Modulos de operacion (brief, seccion 3 y 4) ---
      { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.dashboardRoutes) },
      { path: 'lotes', loadChildren: () => import('./features/lote/lote.routes').then((m) => m.loteRoutes) },

      // TODO: 'calidad' mapea al feature 'control-calidad' (mismo backend: control_calidad).
      // Ya tiene el formulario de CC inicial con range.validator.ts; falta la CC final sobre Partida.
      { path: 'calidad', loadChildren: () => import('./features/control-calidad/control-calidad.routes').then((m) => m.controlCalidadRoutes) },

      // TODO: 'limpieza' mapea al feature 'limpieza-clasificacion'. Falta el formulario con
      // el calculo de % de merma en tiempo real (seccion E del brief).
      // { path: 'limpieza', loadChildren: () => import('./features/limpieza-clasificacion/limpieza-clasificacion.routes').then((m) => m.limpiezaClasificacionRoutes) },

      // TODO: 'curado' mapea al feature 'partida' (tipo_curado, fecha_curado, fecha_envasado
      // son campos de Partida). Falta el formulario con calculo de bolsas e insumos (seccion F).
      // { path: 'curado', loadChildren: () => import('./features/partida/partida.routes').then((m) => m.partidaRoutes) },

      // TODO: 'pedidos' mapea a los features 'pedido' + 'pedido-detalle'. Falta el FormArray
      // dinamico y la logica de verificacion de stock (seccion G).
      // { path: 'pedidos', loadChildren: () => import('./features/pedido/pedido.routes').then((m) => m.pedidoRoutes) },

      // --- Catalogos de mantenimiento ---
      { path: 'tipo-semilla', loadChildren: () => import('./features/tipo-semilla/tipo-semilla.routes').then((m) => m.tipoSemillaRoutes) },
      // TODO: descomentar a medida que se arme cada catalogo (seguir el patron de tipo-semilla)
      // { path: 'almacen', loadChildren: () => import('./features/almacen/almacen.routes').then((m) => m.almacenRoutes) },
      // { path: 'campana', loadChildren: () => import('./features/campana/campana.routes').then((m) => m.campanaRoutes) },
      // { path: 'campo', loadChildren: () => import('./features/campo/campo.routes').then((m) => m.campoRoutes) },
      // { path: 'insumo', loadChildren: () => import('./features/insumo/insumo.routes').then((m) => m.insumoRoutes) },
      // { path: 'proveedor', loadChildren: () => import('./features/proveedor/proveedor.routes').then((m) => m.proveedorRoutes) },
      // { path: 'rol', loadChildren: () => import('./features/rol/rol.routes').then((m) => m.rolRoutes) },
      // { path: 'usuario', loadChildren: () => import('./features/usuario/usuario.routes').then((m) => m.usuarioRoutes) },
    ]
  }
];

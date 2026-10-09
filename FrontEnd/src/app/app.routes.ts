import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ListadoLotesComponent } from './components/lotes/listado-lotes/listado-lotes.component';
import { NuevoLoteComponent } from './components/lotes/nuevo-lote/nuevo-lote.component';
import { DetalleLoteComponent } from './components/lotes/detalle-lote/detalle-lote.component';
import { RegistrarLimpiezaComponent } from './components/lotes/registrar-limpieza/registrar-limpieza.component';
import { CalidadComponent } from './components/calidad/calidad.component';
import { RegistrarControlComponent } from './components/calidad/registrar-control/registrar-control.component';
import { DetallePartidaComponent } from './components/calidad/detalle-partida/detalle-partida.component';
import { CuradoComponent } from './components/curado/curado.component';
import { RegistrarCuradoComponent } from './components/curado/registrar-curado/registrar-curado.component';
import { RegistrarControlFinalComponent } from './components/curado/registrar-control-final/registrar-control-final.component';
import { AlmacenComponent } from './components/almacen/almacen.component';
import { PedidosComponent } from './components/pedidos/pedidos.component';
import { GestionarPedidoComponent } from './components/pedidos/gestionar-pedido/gestionar-pedido.component';
import { ReportesComponent } from './components/reportes/reportes.component';
import { CatalogosComponent } from './components/catalogos/catalogos.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { SolicitudesComponent } from './components/solicitudes/solicitudes.component';
import { TrazabilidadComponent } from './components/trazabilidad/trazabilidad.component';
import { BitacoraComponent } from './components/bitacora/bitacora.component';
import { ROL_ADMIN } from './shared/roles';
import { ROL_ACOPIO, ROL_CALIDAD, ROL_COMERCIAL, ROL_OPERARIO } from './shared/permisos';
import { RoleGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    canActivate: [RoleGuard],
    children: [
      { path: '', component: DashboardComponent },

      // Modulo Lotes (CUU01)
      { path: 'lotes', component: ListadoLotesComponent },
      { path: 'lotes/nuevo', component: NuevoLoteComponent, canActivate: [RoleGuard], data: { roles: [ROL_ADMIN, ROL_ACOPIO] } },
      { path: 'lotes/:id', component: DetalleLoteComponent },
      // CUU03 - Registrar limpieza y clasificacion (GUI-08)
      { path: 'lotes/:loteId/limpieza', component: RegistrarLimpiezaComponent, canActivate: [RoleGuard], data: { roles: [ROL_ADMIN, ROL_OPERARIO] } },

      // Modulo Calidad (CUU02) - bandeja real + registro de CC sobre Lote
      { path: 'calidad', component: CalidadComponent },
      { path: 'calidad/registrar/:loteId', component: RegistrarControlComponent, canActivate: [RoleGuard], data: { roles: [ROL_ADMIN, ROL_CALIDAD] } },
      // Trazabilidad de una partida (destino de "Ver partida")
      { path: 'calidad/partidas/:partidaId', component: DetallePartidaComponent },

      // Modulo Curado/Partidas (CUU05 + CUU06)
      { path: 'curado', component: CuradoComponent },
      { path: 'curado/registrar/:loteId', component: RegistrarCuradoComponent, canActivate: [RoleGuard], data: { roles: [ROL_ADMIN, ROL_OPERARIO] } },
      { path: 'curado/control-final/:partidaId', component: RegistrarControlFinalComponent, canActivate: [RoleGuard], data: { roles: [ROL_ADMIN, ROL_CALIDAD] } },

      // Pantallas principales del resto de los modulos (ver GUI). Con datos
      // de ejemplo por ahora - falta conectar cada una a su service real.
      { path: 'almacen', component: AlmacenComponent },

      // Modulo Pedidos (CUU07)
      { path: 'pedidos', component: PedidosComponent },
      { path: 'pedidos/nuevo', component: GestionarPedidoComponent, canActivate: [RoleGuard], data: { roles: [ROL_ADMIN, ROL_COMERCIAL] } },

      // Mi perfil (cualquier usuario logueado)
      { path: 'perfil', component: PerfilComponent },

      { path: 'reportes', component: ReportesComponent },

      // Trazabilidad lote <-> partida <-> cliente (lectura, todos los roles)
      { path: 'trazabilidad', component: TrazabilidadComponent },

      // Bitacora de administracion: solo administrador
      { path: 'bitacora', component: BitacoraComponent, canActivate: [RoleGuard], data: { roles: [ROL_ADMIN] } },

      // ABM de catalogos maestros (TipoDeSemilla, Campo, Proveedor)
      { path: 'catalogos', component: CatalogosComponent, canActivate: [RoleGuard], data: { roles: [ROL_ADMIN, ROL_ACOPIO] } },

      // Gestion de usuarios: solo administrador
      { path: 'usuarios', component: UsuariosComponent, canActivate: [RoleGuard], data: { roles: ['administrador'] } },

      // Solicitudes de cuenta (registro GUI-02): solo administrador
      { path: 'solicitudes', component: SolicitudesComponent, canActivate: [RoleGuard], data: { roles: ['administrador'] } },
    ],
  },

  { path: '**', redirectTo: '' },
];
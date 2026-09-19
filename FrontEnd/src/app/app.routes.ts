import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ListadoLotesComponent } from './components/lotes/listado-lotes/listado-lotes.component';
import { NuevoLoteComponent } from './components/lotes/nuevo-lote/nuevo-lote.component';
import { DetalleLoteComponent } from './components/lotes/detalle-lote/detalle-lote.component';
import { CalidadComponent } from './components/calidad/calidad.component';
import { CuradoComponent } from './components/curado/curado.component';
import { AlmacenComponent } from './components/almacen/almacen.component';
import { PedidosComponent } from './components/pedidos/pedidos.component';
import { ReportesComponent } from './components/reportes/reportes.component';
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
      { path: 'lotes/nuevo', component: NuevoLoteComponent },
      { path: 'lotes/:id', component: DetalleLoteComponent },

      // Pantallas principales del resto de los modulos (ver GUI). Con datos
      // de ejemplo por ahora - falta conectar cada una a su service real.
      { path: 'calidad', component: CalidadComponent },
      { path: 'curado', component: CuradoComponent },
      { path: 'almacen', component: AlmacenComponent },
      { path: 'pedidos', component: PedidosComponent },
      { path: 'reportes', component: ReportesComponent },
    ],
  },

  { path: '**', redirectTo: '' },
];

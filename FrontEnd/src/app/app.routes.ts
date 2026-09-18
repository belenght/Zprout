import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ListadoLotesComponent } from './components/lotes/listado-lotes/listado-lotes.component';
import { NuevoLoteComponent } from './components/lotes/nuevo-lote/nuevo-lote.component';
import { DetalleLoteComponent } from './components/lotes/detalle-lote/detalle-lote.component';
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

      // Los siguientes modulos se agregan a medida que se construyan:
      // 'calidad', 'curado', 'almacen', 'pedidos', 'reportes'
    ],
  },

  { path: '**', redirectTo: '' },
];

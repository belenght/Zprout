import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthStateService } from '../../../services/auth-state.service';
import { AuthService } from '../../../services/auth.service';
import { ROL_ADMIN } from '../../../shared/roles';
import { ROL_ACOPIO } from '../../../shared/permisos';

interface ItemNav {
  label: string;
  icono: string;
  ruta?: string; // sin ruta = modulo todavia no implementado en el front
  roles?: string[]; // si esta, solo lo ven esos roles (desc_rol del JWT)
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  // Ver el comentario en header.component.ts: se expone el observable
  // directo para usarlo con el pipe async en el template, en vez de una
  // variable booleana actualizada a mano dentro de un subscribe manual.
  autenticado$: Observable<boolean>;

  // Se listan todos los modulos del dominio (ver GUI, indice de pantallas)
  // aunque todavia no todos tengan componente propio en el front; los que
  // no tienen 'ruta' se muestran deshabilitados en vez de journal a un 404.
  items: ItemNav[] = [
    { label: 'Dashboard', icono: 'bi-grid-1x2', ruta: '/' },
    { label: 'Lotes', icono: 'bi-boxes', ruta: '/lotes' },
    { label: 'Calidad', icono: 'bi-check2-square', ruta: '/calidad' },
    { label: 'Curado', icono: 'bi-droplet', ruta: '/curado' },
    { label: 'Almacén', icono: 'bi-building', ruta: '/almacen' },
    { label: 'Pedidos', icono: 'bi-bag', ruta: '/pedidos' },
    { label: 'Trazabilidad', icono: 'bi-diagram-3', ruta: '/trazabilidad' },
    { label: 'Reportes', icono: 'bi-graph-up', ruta: '/reportes' },
    { label: 'Catálogos', icono: 'bi-collection', ruta: '/catalogos', roles: [ROL_ADMIN, ROL_ACOPIO] },
    { label: 'Usuarios', icono: 'bi-people', ruta: '/usuarios', roles: [ROL_ADMIN] },
    { label: 'Solicitudes', icono: 'bi-person-check', ruta: '/solicitudes', roles: [ROL_ADMIN] },
    { label: 'Bitácora', icono: 'bi-journal-text', ruta: '/bitacora', roles: [ROL_ADMIN] },
  ];

  constructor(private authStateService: AuthStateService, private authService: AuthService) {
    this.autenticado$ = this.authStateService.authState$;
  }

  // Se evalua en cada chequeo de cambios: lee el rol del JWT, asi que
  // reacciona solo si se loguea otro usuario sin recargar la pagina.
  get itemsVisibles(): ItemNav[] {
    const rol = this.authService.getRole();
    return this.items.filter((i) => !i.roles || (rol !== null && i.roles.includes(rol)));
  }
}
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthStateService } from '../../../services/auth-state.service';

interface ItemNav {
  label: string;
  icono: string;
  ruta?: string; // sin ruta = modulo todavia no implementado en el front
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
    { label: 'Reportes', icono: 'bi-graph-up', ruta: '/reportes' },
    { label: 'Catálogos', icono: 'bi-collection', ruta: '/catalogos' },
  ];

  constructor(private authStateService: AuthStateService) {
    this.autenticado$ = this.authStateService.authState$;
  }
}
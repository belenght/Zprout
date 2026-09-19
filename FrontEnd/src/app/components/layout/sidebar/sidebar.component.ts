import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
export class SidebarComponent implements OnInit {
  autenticado = false;

  // Se listan todos los modulos del dominio (ver GUI, indice de pantallas)
  // aunque todavia no todos tengan componente propio en el front; los que
  // no tienen 'ruta' se muestran deshabilitados en vez de journal a un 404.
  items: ItemNav[] = [
    { label: 'Dashboard', icono: 'bi-grid-1x2', ruta: '/' },
    { label: 'Lotes', icono: 'bi-boxes', ruta: '/lotes' },
    { label: 'Calidad', icono: 'bi-check2-square' },
    { label: 'Curado', icono: 'bi-droplet' },
    { label: 'Almacén', icono: 'bi-building' },
    { label: 'Pedidos', icono: 'bi-bag' },
    { label: 'Reportes', icono: 'bi-graph-up' },
  ];

  constructor(private authStateService: AuthStateService) {}

  ngOnInit(): void {
    this.authStateService.authState$.subscribe((isAuthenticated) => {
      this.autenticado = isAuthenticated;
    });
  }
}

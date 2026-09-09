import { Component, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NAV_GROUPS } from '../nav-items';
import { AuthService } from '../../features/auth/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.html'
})
export class MainLayoutComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  navGroups = NAV_GROUPS;
  usuario = computed(() => this.auth.usuarioActual());

  // TODO: cuando exista el modulo de Campana, reemplazar por la campana activa real.
  campanaActiva = 'Campana 2025/2026';

  // El backend solo devuelve "nombre" en el login (sin apellido), asi que las
  // iniciales del avatar salen de las dos primeras letras de ese campo.
  iniciales(nombre: string): string {
    return nombre.slice(0, 2).toUpperCase();
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

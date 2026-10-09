import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { AuthStateService } from '../../../services/auth-state.service';
import { PerfilService } from '../../../services/perfil.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  // Se expone el observable directo (en vez de una variable booleana que se
  // pisa a mano dentro del subscribe) para que el *ngIf del template use
  // el pipe async: async se encarga de marcar el componente para chequeo en
  // cada emision, sin depender de que la mutacion manual dispare CD sola.
  autenticado$: Observable<boolean>;
  // Foto de perfil (data URL) o null: cuando es null el avatar muestra las iniciales.
  foto$: Observable<string | null>;
  nombre = '';
  rol = '';
  menuAbierto = false;

  constructor(
    private authService: AuthService,
    private authStateService: AuthStateService,
    private perfilService: PerfilService,
    private router: Router,
    private host: ElementRef<HTMLElement>
  ) {
    this.autenticado$ = this.authStateService.authState$;
    this.foto$ = this.perfilService.perfil$.pipe(map((p) => p?.foto ?? null));
  }

  ngOnInit(): void {
    this.authStateService.authState$.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        // Se vuelve a leer del token cada vez que se emite (tambien cuando el
        // perfil cambia el nombre y reemplaza el token).
        this.nombre = this.authService.getUserName() ?? '';
        this.rol = this.authService.getRole() ?? '';
        if (!this.perfilService.perfilActual) {
          // La foto es decorativa: si falla, quedan las iniciales.
          this.perfilService.cargar().subscribe({ error: () => {} });
        }
      } else {
        this.nombre = '';
        this.rol = '';
        this.menuAbierto = false;
      }
    });
  }

  get iniciales(): string {
    return this.nombre
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  // Cierra el menu al hacer click en cualquier otro lado de la pantalla.
  @HostListener('document:click', ['$event'])
  cerrarSiClickAfuera(event: MouseEvent): void {
    if (this.menuAbierto && !this.host.nativeElement.contains(event.target as Node)) {
      this.menuAbierto = false;
    }
  }

  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  logout(): void {
    this.authService.logout();
    this.menuAbierto = false;
    this.router.navigate(['/login']);
  }
}

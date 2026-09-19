import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { AuthStateService } from '../../../services/auth-state.service';

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
  nombre = '';
  rol = '';
  menuAbierto = false;

  constructor(
    private authService: AuthService,
    private authStateService: AuthStateService,
    private router: Router
  ) {
    this.autenticado$ = this.authStateService.authState$;
  }

  ngOnInit(): void {
    this.authStateService.authState$.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.nombre = this.authService.getUserName() ?? '';
        this.rol = this.authService.getRole() ?? '';
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

  logout(): void {
    this.authService.logout();
    this.menuAbierto = false;
    this.router.navigate(['/login']);
  }
}
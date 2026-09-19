import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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
  autenticado = false;
  nombre = '';
  rol = '';
  menuAbierto = false;

  constructor(
    private authService: AuthService,
    private authStateService: AuthStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authStateService.authState$.subscribe((isAuthenticated) => {
      this.autenticado = isAuthenticated;
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

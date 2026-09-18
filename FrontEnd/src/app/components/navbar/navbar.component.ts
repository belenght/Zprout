import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthStateService } from '../../services/auth-state.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  autenticado = false;
  nombre = '';
  rol = '';

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
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

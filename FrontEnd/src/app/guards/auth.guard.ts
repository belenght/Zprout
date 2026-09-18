import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    const expectedRoles = route.data['roles'] as Array<string> | undefined;
    if (!expectedRoles || expectedRoles.length === 0) {
      return true; // ruta protegida sin restriccion de rol especifica
    }

    const userRole = this.authService.getRole();
    if (userRole && expectedRoles.includes(userRole)) {
      return true;
    }

    this.router.navigate(['/']);
    return false;
  }
}

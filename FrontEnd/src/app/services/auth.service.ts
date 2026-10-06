import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { environment } from '../environments/environment';
import { AuthStateService } from './auth-state.service';
import { LoginRequest, LoginResponse, RegistroRequest, RolRegistro, TokenPayload } from '../interfaces/login';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private jwtHelper = new JwtHelperService();

  constructor(private http: HttpClient, private authStateService: AuthStateService) {}

  login(credenciales: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credenciales).pipe(
      tap((res) => {
        sessionStorage.setItem('token', res.token);
        this.authStateService.setAuthState(true);
      })
    );
  }

  // Registro publico (GUI-02): no devuelve token, la cuenta queda pendiente.
  registro(datos: RegistroRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/registro`, datos);
  }

  // Roles que se pueden pedir al registrarse (el backend excluye administrador).
  getRolesRegistro(): Observable<RolRegistro[]> {
    return this.http.get<RolRegistro[]>(`${this.apiUrl}/auth/roles-registro`);
  }

  logout(): void {
    sessionStorage.removeItem('token');
    this.authStateService.setAuthState(false);
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      return !this.jwtHelper.isTokenExpired(token);
    } catch {
      return false;
    }
  }

  getToken(): string | null {
    if (typeof window === 'undefined' || !sessionStorage) return null;
    return sessionStorage.getItem('token');
  }

  private getPayload(): TokenPayload | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return this.jwtHelper.decodeToken(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  getRole(): string | null {
    return this.getPayload()?.rol ?? null;
  }

  getUserId(): number | null {
    return this.getPayload()?.id_usuario ?? null;
  }

  getUserName(): string | null {
    return this.getPayload()?.nombre ?? null;
  }
}
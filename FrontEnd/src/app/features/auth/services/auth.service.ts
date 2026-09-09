import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LoginPayload, LoginResponse, UsuarioAutenticado } from '../models/auth.model';

const STORAGE_KEY = 'zprout.sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  // Signal con la sesion actual; null si no hay usuario logueado.
  private sesion = signal<UsuarioAutenticado | null>(this.leerSesionGuardada());

  usuarioActual = computed(() => this.sesion());
  estaAutenticado = computed(() => this.sesion() !== null);

  /**
   * POST /api/auth/login (usuario.routes.ts -> authRouter, ver usuario.controller.ts -> login).
   * El backend valida nombre_usuario/password en texto plano (sin hashing todavia) y
   * responde { id_usuario, nombre, rol }. No hay JWT: la sesion se sostiene solo en el
   * front (localStorage) mientras no se implemente autenticacion por token.
   */
  login(payload: LoginPayload): Observable<UsuarioAutenticado> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      map((respuesta) => this.aSesion(respuesta)),
      tap((usuario) => this.guardarSesion(usuario))
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.sesion.set(null);
  }

  /**
   * No hay token todavia (ver comentario en login()). Se deja el metodo para no romper
   * auth.interceptor.ts: mientras no exista JWT, simplemente no agrega header Authorization.
   */
  getToken(): string | null {
    return null;
  }

  private aSesion(respuesta: LoginResponse): UsuarioAutenticado {
    return {
      id_usuario: respuesta.id_usuario,
      nombre: respuesta.nombre,
      perfil: respuesta.rol?.desc_rol ?? 'Sin rol asignado'
    };
  }

  private guardarSesion(usuario: UsuarioAutenticado): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));
    this.sesion.set(usuario);
  }

  private leerSesionGuardada(): UsuarioAutenticado | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioAutenticado;
    } catch {
      return null;
    }
  }
}

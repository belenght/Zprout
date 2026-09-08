import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LoginPayload, UsuarioAutenticado } from '../models/auth.model';

const STORAGE_KEY = 'zprout.sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  // Signal con la sesion actual; null si no hay usuario logueado.
  private sesion = signal<UsuarioAutenticado | null>(this.leerSesionGuardada());

  usuarioActual = computed(() => this.sesion());
  estaAutenticado = computed(() => this.sesion() !== null);

  /**
   * TODO: confirmar con el backend el path real de login (asumido /usuario/login).
   * Mientras el backend no tenga login propio, se puede simular localmente
   * comentando la llamada http y resolviendo con un usuario de prueba.
   */
  login(payload: LoginPayload): Observable<UsuarioAutenticado> {
    return this.http
      .post<UsuarioAutenticado>(`${environment.apiUrl}/usuario/login`, payload)
      .pipe(tap((usuario) => this.guardarSesion(usuario)));
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.sesion.set(null);
  }

  getToken(): string | null {
    return this.sesion()?.token ?? null;
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

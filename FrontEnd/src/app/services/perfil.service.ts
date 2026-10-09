import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { handleHttpError } from './base-http.service';
import { AuthService } from './auth.service';
import { AuthStateService } from './auth-state.service';

// Espejo de BackEnd/src/usuario/perfil.controller.ts (perfilDe)
export interface Perfil {
  id_usuario: number;
  nombre: string;
  apellido: string;
  nombre_usuario: string;
  email: string;
  fecha_nacimiento: string | null; // YYYY-MM-DD
  rol: string | null;
  id_rol: number | null;
  estado: string;
  created_at: string;
  foto: string | null; // data URL (JPEG) o null si no tiene foto
}

export interface ActualizarPerfilPayload {
  nombre: string;
  apellido: string;
  email: string;
  fecha_nacimiento: string | null;
  // Solo los puede enviar un administrador (el backend responde 403 si no).
  nombre_usuario?: string;
  id_rol?: number;
}

export interface CambiarPasswordPayload {
  password_actual: string;
  password_nueva: string;
  password_repetida: string;
}

/**
 * "Mi perfil" del usuario logueado. Guarda el perfil en un BehaviorSubject
 * para que el header (avatar) y la pantalla de perfil muestren lo mismo sin
 * pedirlo dos veces.
 */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private apiUrl = `${environment.apiUrl}/usuarios/me`;
  private perfilSubject = new BehaviorSubject<Perfil | null>(null);
  perfil$ = this.perfilSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    authStateService: AuthStateService
  ) {
    // Al cerrar sesion se descarta el perfil: no puede quedar la foto de la
    // persona anterior si entra otra en el mismo navegador.
    authStateService.authState$.subscribe((autenticado) => {
      if (!autenticado) this.perfilSubject.next(null);
    });
  }

  get perfilActual(): Perfil | null {
    return this.perfilSubject.value;
  }

  cargar(): Observable<Perfil> {
    return this.http.get<Perfil>(this.apiUrl).pipe(
      tap((perfil) => this.perfilSubject.next(perfil)),
      catchError(handleHttpError)
    );
  }

  actualizar(datos: ActualizarPerfilPayload): Observable<Perfil> {
    return this.http.patch<{ perfil: Perfil; token: string }>(this.apiUrl, datos).pipe(
      tap((res) => {
        // El nombre viaja en el JWT: se reemplaza el token para que el header lo vea.
        this.authService.setToken(res.token);
        this.perfilSubject.next(res.perfil);
      }),
      map((res) => res.perfil),
      catchError(handleHttpError)
    );
  }

  cambiarPassword(datos: CambiarPasswordPayload): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/password`, datos).pipe(catchError(handleHttpError));
  }

  subirFoto(imagen: string): Observable<string | null> {
    return this.http.put<{ foto: string | null }>(`${this.apiUrl}/foto`, { imagen }).pipe(
      tap((res) => this.actualizarFoto(res.foto)),
      map((res) => res.foto),
      catchError(handleHttpError)
    );
  }

  eliminarFoto(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/foto`).pipe(
      tap(() => this.actualizarFoto(null)),
      catchError(handleHttpError)
    );
  }

  private actualizarFoto(foto: string | null): void {
    const actual = this.perfilSubject.value;
    if (actual) this.perfilSubject.next({ ...actual, foto });
  }
}

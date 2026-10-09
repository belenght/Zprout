import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { environment } from '../environments/environment';
import { handleHttpError } from './base-http.service';
import { EstadoUsuario, RolRegistro, SolicitudUsuario } from '../interfaces/login';
import { ActualizarUsuarioAdminPayload, UsuarioAdmin } from '../interfaces/usuario-admin';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Solo admin (el backend lo valida con verificarRol('administrador')).
  getSolicitudes(estado: EstadoUsuario): Observable<SolicitudUsuario[]> {
    const params = new HttpParams().set('estado', estado);
    return this.http
      .get<SolicitudUsuario[]>(`${this.apiUrl}/usuarios/solicitudes`, { params })
      .pipe(catchError(handleHttpError));
  }

  cambiarEstado(id_usuario: number, estado: EstadoUsuario, id_rol?: number): Observable<SolicitudUsuario> {
    return this.http
      .patch<SolicitudUsuario>(`${this.apiUrl}/usuarios/${id_usuario}/estado`, { estado, id_rol })
      .pipe(catchError(handleHttpError));
  }

  // Roles asignables al aprobar (GET /roles pide token, el admin ya tiene).
  getRolesAsignables(): Observable<RolRegistro[]> {
    return this.http.get<RolRegistro[]>(`${this.apiUrl}/roles`).pipe(catchError(handleHttpError));
  }

  // ---- Gestion de usuarios (solo administrador) ----

  getUsuariosGestion(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${this.apiUrl}/usuarios/gestion`).pipe(catchError(handleHttpError));
  }

  getUsuarioGestion(id: number): Observable<UsuarioAdmin> {
    return this.http.get<UsuarioAdmin>(`${this.apiUrl}/usuarios/gestion/${id}`).pipe(catchError(handleHttpError));
  }

  actualizarUsuarioGestion(id: number, datos: ActualizarUsuarioAdminPayload): Observable<UsuarioAdmin> {
    return this.http
      .patch<UsuarioAdmin>(`${this.apiUrl}/usuarios/gestion/${id}`, datos)
      .pipe(catchError(handleHttpError));
  }

  restablecerPassword(id: number, password_nueva: string, password_repetida: string): Observable<{ ok: boolean }> {
    return this.http
      .put<{ ok: boolean }>(`${this.apiUrl}/usuarios/gestion/${id}/password`, { password_nueva, password_repetida })
      .pipe(catchError(handleHttpError));
  }

  eliminarUsuarioGestion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/usuarios/gestion/${id}`).pipe(catchError(handleHttpError));
  }
}

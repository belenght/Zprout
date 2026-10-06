import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { environment } from '../environments/environment';
import { handleHttpError } from './base-http.service';
import { EstadoUsuario, RolRegistro, SolicitudUsuario } from '../interfaces/login';

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
}
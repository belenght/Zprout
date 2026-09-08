import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Usuario, UsuarioPayload } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/usuario`;

  getAll(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.baseUrl);
  }

  getById(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.baseUrl}/${id}`);
  }

  create(payload: UsuarioPayload): Observable<Usuario> {
    return this.http.post<Usuario>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<UsuarioPayload>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

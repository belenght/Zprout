import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Rol, RolPayload } from '../models/rol.model';

@Injectable({ providedIn: 'root' })
export class RolService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rol`;

  getAll(): Observable<Rol[]> {
    return this.http.get<Rol[]>(this.baseUrl);
  }

  getById(id: number): Observable<Rol> {
    return this.http.get<Rol>(`${this.baseUrl}/${id}`);
  }

  create(payload: RolPayload): Observable<Rol> {
    return this.http.post<Rol>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<RolPayload>): Observable<Rol> {
    return this.http.put<Rol>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

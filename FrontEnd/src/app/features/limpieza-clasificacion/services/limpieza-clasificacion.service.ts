import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LimpiezaClasificacion, LimpiezaClasificacionPayload } from '../models/limpieza-clasificacion.model';

@Injectable({ providedIn: 'root' })
export class LimpiezaClasificacionService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/limpieza_clasificacion`;

  getAll(): Observable<LimpiezaClasificacion[]> {
    return this.http.get<LimpiezaClasificacion[]>(this.baseUrl);
  }

  getById(id: number): Observable<LimpiezaClasificacion> {
    return this.http.get<LimpiezaClasificacion>(`${this.baseUrl}/${id}`);
  }

  create(payload: LimpiezaClasificacionPayload): Observable<LimpiezaClasificacion> {
    return this.http.post<LimpiezaClasificacion>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<LimpiezaClasificacionPayload>): Observable<LimpiezaClasificacion> {
    return this.http.put<LimpiezaClasificacion>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

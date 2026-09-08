import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ControlCalidad, ControlCalidadPayload } from '../models/control-calidad.model';

@Injectable({ providedIn: 'root' })
export class ControlCalidadService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/control_calidad`;

  getAll(): Observable<ControlCalidad[]> {
    return this.http.get<ControlCalidad[]>(this.baseUrl);
  }

  getById(id: number): Observable<ControlCalidad> {
    return this.http.get<ControlCalidad>(`${this.baseUrl}/${id}`);
  }

  create(payload: ControlCalidadPayload): Observable<ControlCalidad> {
    return this.http.post<ControlCalidad>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<ControlCalidadPayload>): Observable<ControlCalidad> {
    return this.http.put<ControlCalidad>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TipoSemilla, TipoSemillaPayload } from '../models/tipo-semilla.model';

@Injectable({ providedIn: 'root' })
export class TipoSemillaService {
  private http = inject(HttpClient);
  // El path debe matchear la ruta expuesta por tipo_semilla.routes.ts en el backend
  private readonly baseUrl = `${environment.apiUrl}/tipo_semilla`;

  getAll(): Observable<TipoSemilla[]> {
    return this.http.get<TipoSemilla[]>(this.baseUrl);
  }

  getById(id: number): Observable<TipoSemilla> {
    return this.http.get<TipoSemilla>(`${this.baseUrl}/${id}`);
  }

  create(payload: TipoSemillaPayload): Observable<TipoSemilla> {
    return this.http.post<TipoSemilla>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<TipoSemillaPayload>): Observable<TipoSemilla> {
    return this.http.put<TipoSemilla>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Insumo, InsumoPayload } from '../models/insumo.model';

@Injectable({ providedIn: 'root' })
export class InsumoService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/insumo`;

  getAll(): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(this.baseUrl);
  }

  getById(id: number): Observable<Insumo> {
    return this.http.get<Insumo>(`${this.baseUrl}/${id}`);
  }

  create(payload: InsumoPayload): Observable<Insumo> {
    return this.http.post<Insumo>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<InsumoPayload>): Observable<Insumo> {
    return this.http.put<Insumo>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

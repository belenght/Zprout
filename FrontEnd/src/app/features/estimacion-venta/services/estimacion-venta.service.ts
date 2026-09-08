import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EstimacionVenta, EstimacionVentaPayload } from '../models/estimacion-venta.model';

@Injectable({ providedIn: 'root' })
export class EstimacionVentaService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/estimacion_venta`;

  getAll(): Observable<EstimacionVenta[]> {
    return this.http.get<EstimacionVenta[]>(this.baseUrl);
  }

  getById(id: number): Observable<EstimacionVenta> {
    return this.http.get<EstimacionVenta>(`${this.baseUrl}/${id}`);
  }

  create(payload: EstimacionVentaPayload): Observable<EstimacionVenta> {
    return this.http.post<EstimacionVenta>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<EstimacionVentaPayload>): Observable<EstimacionVenta> {
    return this.http.put<EstimacionVenta>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

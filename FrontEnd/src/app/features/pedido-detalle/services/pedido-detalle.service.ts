import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PedidoDetalle, PedidoDetallePayload } from '../models/pedido-detalle.model';

@Injectable({ providedIn: 'root' })
export class PedidoDetalleService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/pedido_detalle`;

  getAll(): Observable<PedidoDetalle[]> {
    return this.http.get<PedidoDetalle[]>(this.baseUrl);
  }

  getById(id: number): Observable<PedidoDetalle> {
    return this.http.get<PedidoDetalle>(`${this.baseUrl}/${id}`);
  }

  create(payload: PedidoDetallePayload): Observable<PedidoDetalle> {
    return this.http.post<PedidoDetalle>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<PedidoDetallePayload>): Observable<PedidoDetalle> {
    return this.http.put<PedidoDetalle>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

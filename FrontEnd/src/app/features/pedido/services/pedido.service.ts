import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Pedido, PedidoPayload } from '../models/pedido.model';

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/pedido`;

  getAll(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.baseUrl);
  }

  getById(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.baseUrl}/${id}`);
  }

  create(payload: PedidoPayload): Observable<Pedido> {
    return this.http.post<Pedido>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<PedidoPayload>): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

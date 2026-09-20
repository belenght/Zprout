import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import {
  Pedido,
  DetallePedidoCompleto,
  GestionarPedidoPayload,
  ResultadoGestionarPedido,
  ResultadoReintentar,
} from '../interfaces/pedido';
import { handleHttpError } from './base-http.service';

@Injectable({ providedIn: 'root' })
export class PedidoService {
  private apiUrl = `${environment.apiUrl}/pedidos`;

  constructor(private http: HttpClient) {}

  getPedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.apiUrl).pipe(catchError(handleHttpError));
  }

  getPedido(id: number): Observable<DetallePedidoCompleto> {
    return this.http.get<DetallePedidoCompleto>(`${this.apiUrl}/${id}`).pipe(catchError(handleHttpError));
  }

  gestionarPedido(payload: GestionarPedidoPayload): Observable<ResultadoGestionarPedido> {
    return this.http.post<ResultadoGestionarPedido>(this.apiUrl, payload).pipe(catchError(handleHttpError));
  }

  // CUU07, paso 4: "Mercaderia entregada a Logistica". Solo valido desde
  // "Aprobado para despacho" (backend responde 409 si no).
  despacharPedido(id: number): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.apiUrl}/${id}/despachar`, {}).pipe(catchError(handleHttpError));
  }

  // CUU07, alternativo 3.b: el Area Comercial cancela por falta de stock.
  // Solo valido desde "Pendiente de stock".
  cancelarPedido(id: number): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.apiUrl}/${id}/cancelar`, {}).pipe(catchError(handleHttpError));
  }

  // Vuelve a correr la asignacion FIFO de stock sobre un pedido "Pendiente
  // de stock" (por ej. despues de curar mas partidas de esa variedad).
  reintentarAsignacion(id: number): Observable<ResultadoReintentar> {
    return this.http.post<ResultadoReintentar>(`${this.apiUrl}/${id}/reintentar`, {}).pipe(catchError(handleHttpError));
  }
}

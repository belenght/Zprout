import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  EstadoLote,
  EstadoLotePayload,
  EstadoPartida,
  EstadoPartidaPayload
} from '../models/estado.model';

// TODO: confirmar con el backend los paths reales de estado.routes.ts;
// se asumen /estado/lote/:nroLote y /estado/partida/:nroPartida para el
// historial, y POST /estado generico para dar de alta un nuevo estado.
@Injectable({ providedIn: 'root' })
export class EstadoService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/estado`;

  // --- Historial de estados de un Lote ---
  getHistorialLote(nroLote: number): Observable<EstadoLote[]> {
    return this.http.get<EstadoLote[]>(`${this.baseUrl}/lote/${nroLote}`);
  }

  create(payload: EstadoLotePayload): Observable<EstadoLote> {
    return this.http.post<EstadoLote>(this.baseUrl, payload);
  }

  // --- Historial de estados de una Partida ---
  getHistorialPartida(nroPartida: number): Observable<EstadoPartida[]> {
    return this.http.get<EstadoPartida[]>(`${this.baseUrl}/partida/${nroPartida}`);
  }

  createEstadoPartida(payload: EstadoPartidaPayload): Observable<EstadoPartida> {
    return this.http.post<EstadoPartida>(this.baseUrl, payload);
  }

  delete(idEstado: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${idEstado}`);
  }
}

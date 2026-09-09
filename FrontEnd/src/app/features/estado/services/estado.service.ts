import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EstadoLote, EstadoPartida } from '../models/estado.model';

// Estado es de solo lectura (ver estado.controller.ts): no hay POST/PUT/DELETE
// en el backend, los estados se generan solos como efecto de otras acciones.
@Injectable({ providedIn: 'root' })
export class EstadoService {
  private http = inject(HttpClient);
  // Ruta real: estadoRouter montado en /api/estados (ver app.ts)
  private readonly baseUrl = `${environment.apiUrl}/estados`;

  getHistorialLote(idLote: number): Observable<EstadoLote[]> {
    return this.http.get<EstadoLote[]>(`${this.baseUrl}/lote/${idLote}`);
  }

  getActualLote(idLote: number): Observable<EstadoLote> {
    return this.http.get<EstadoLote>(`${this.baseUrl}/lote/${idLote}/actual`);
  }

  getHistorialPartida(idPartida: number): Observable<EstadoPartida[]> {
    return this.http.get<EstadoPartida[]>(`${this.baseUrl}/partida/${idPartida}`);
  }

  getActualPartida(idPartida: number): Observable<EstadoPartida> {
    return this.http.get<EstadoPartida>(`${this.baseUrl}/partida/${idPartida}/actual`);
  }
}

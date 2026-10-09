import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { handleHttpError } from './base-http.service';
import {
  BusquedaTraza, DemandaCurado, RegistroBitacora, RespuestaAlertas, TrazaCliente, TrazaLote, TrazaPartida,
} from '../interfaces/extras';

// Trazabilidad, alertas, bitacora y demanda de curado: todos GET de solo lectura.
@Injectable({ providedIn: 'root' })
export class TrazabilidadService {
  private api = `${environment.apiUrl}/trazabilidad`;
  constructor(private http: HttpClient) {}

  buscar(q: string): Observable<BusquedaTraza> {
    return this.http.get<BusquedaTraza>(`${this.api}/buscar`, { params: new HttpParams().set('q', q) }).pipe(catchError(handleHttpError));
  }
  porLote(id: number): Observable<TrazaLote> {
    return this.http.get<TrazaLote>(`${this.api}/lote/${id}`).pipe(catchError(handleHttpError));
  }
  porPartida(id: number): Observable<TrazaPartida> {
    return this.http.get<TrazaPartida>(`${this.api}/partida/${id}`).pipe(catchError(handleHttpError));
  }
  porCliente(nombre: string): Observable<TrazaCliente> {
    return this.http.get<TrazaCliente>(`${this.api}/cliente`, { params: new HttpParams().set('nombre', nombre) }).pipe(catchError(handleHttpError));
  }
}

@Injectable({ providedIn: 'root' })
export class AlertaService {
  constructor(private http: HttpClient) {}
  getAlertas(): Observable<RespuestaAlertas> {
    return this.http.get<RespuestaAlertas>(`${environment.apiUrl}/alertas`).pipe(catchError(handleHttpError));
  }
}

@Injectable({ providedIn: 'root' })
export class BitacoraService {
  constructor(private http: HttpClient) {}
  getRegistros(filtros: { accion?: string; usuario?: string; limite?: number } = {}): Observable<RegistroBitacora[]> {
    let params = new HttpParams();
    if (filtros.accion) params = params.set('accion', filtros.accion);
    if (filtros.usuario) params = params.set('usuario', filtros.usuario);
    if (filtros.limite) params = params.set('limite', filtros.limite);
    return this.http.get<RegistroBitacora[]>(`${environment.apiUrl}/bitacora`, { params }).pipe(catchError(handleHttpError));
  }
}

@Injectable({ providedIn: 'root' })
export class DemandaCuradoService {
  constructor(private http: HttpClient) {}
  getDemanda(): Observable<DemandaCurado[]> {
    return this.http.get<DemandaCurado[]>(`${environment.apiUrl}/pedidos/demanda-curado`).pipe(catchError(handleHttpError));
  }
}

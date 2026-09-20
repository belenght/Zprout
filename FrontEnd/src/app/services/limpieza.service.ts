import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { LimpiezaClasificacion, RegistrarLimpiezaPayload } from '../interfaces/limpieza';
import { handleHttpError } from './base-http.service';

@Injectable({ providedIn: 'root' })
export class LimpiezaService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getLimpiezasPorLote(loteId: number): Observable<LimpiezaClasificacion[]> {
    return this.http
      .get<LimpiezaClasificacion[]>(`${this.apiUrl}/lotes/${loteId}/limpiezas`)
      .pipe(catchError(handleHttpError));
  }

  getLimpiezas(): Observable<LimpiezaClasificacion[]> {
    return this.http.get<LimpiezaClasificacion[]>(`${this.apiUrl}/limpiezas`).pipe(catchError(handleHttpError));
  }

  /**
   * CUU03 - Registrar limpieza y clasificacion. Se mantiene igual criterio
   * que ControlCalidadService.registrarControlLote: sin handleHttpError,
   * porque el componente necesita distinguir el 409 de "estado invalido"
   * (alternativo 1.a) del 400 de "volumen inconsistente" (alternativo 3.a)
   * para mostrar el mensaje correcto.
   */
  registrarLimpieza(payload: RegistrarLimpiezaPayload): Observable<LimpiezaClasificacion> {
    return this.http.post<LimpiezaClasificacion>(`${this.apiUrl}/limpiezas`, payload);
  }
}

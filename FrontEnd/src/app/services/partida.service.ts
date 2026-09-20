import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Partida, RegistrarCuradoPayload, RegistrarControlFinalPayload, ResultadoControlFinal } from '../interfaces/partida';
import { handleHttpError } from './base-http.service';

@Injectable({ providedIn: 'root' })
export class PartidaService {
  private apiUrl = `${environment.apiUrl}/partidas`;

  constructor(private http: HttpClient) {}

  getPartidas(): Observable<Partida[]> {
    return this.http.get<Partida[]>(this.apiUrl).pipe(catchError(handleHttpError));
  }

  getPartida(id: number): Observable<Partida> {
    return this.http.get<Partida>(`${this.apiUrl}/${id}`).pipe(catchError(handleHttpError));
  }

  /**
   * CUU05 - Registrar curado y envasado. Sin handleHttpError a proposito: el
   * componente necesita distinguir el 409 de "lote no esta en Para curar"
   * del 400 de "volumen supera stock disponible" para mostrar el mensaje
   * correcto (mismo criterio que LimpiezaService.registrarLimpieza).
   */
  registrarCurado(payload: RegistrarCuradoPayload): Observable<Partida> {
    return this.http.post<Partida>(`${this.apiUrl}/curado`, payload);
  }

  /**
   * CUU06 - Registrar control final + generar Informe de Partida. Sin
   * handleHttpError: el backend responde 409 con { fuera_de_rango, rangos }
   * (alternativo 3.b) y el componente necesita ese body estructurado tal
   * cual, igual que ControlCalidadService.registrarControlLote.
   */
  registrarControlFinal(payload: RegistrarControlFinalPayload): Observable<ResultadoControlFinal> {
    return this.http.post<ResultadoControlFinal>(`${this.apiUrl}/control-final`, payload);
  }
}


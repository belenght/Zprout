import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { ControlDeCalidad, RegistrarControlLotePayload } from '../interfaces/control-calidad';
import { handleHttpError } from './base-http.service';

@Injectable({ providedIn: 'root' })
export class ControlCalidadService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getControlesPorLote(loteId: number): Observable<ControlDeCalidad[]> {
    return this.http
      .get<ControlDeCalidad[]>(`${this.apiUrl}/lotes/${loteId}/controles-calidad`)
      .pipe(catchError(handleHttpError));
  }

  /**
   * CUU02 - Registrar Control de Calidad (sobre Lote, inicial o intermedio).
   * OJO: a proposito NO usa handleHttpError aca. El backend responde 409 con
   * un body estructurado { fuera_de_rango: true, rangos } cuando los
   * parametros estan fuera de rango (alternativo 3.a) y todavia hace falta
   * que el usuario confirme; el componente necesita ese body tal cual llega
   * para mostrar el flujo de confirmacion, no un mensaje ya aplanado.
   */
  registrarControlLote(payload: RegistrarControlLotePayload): Observable<ControlDeCalidad> {
    return this.http.post<ControlDeCalidad>(`${this.apiUrl}/controles-calidad/lote`, payload);
  }
}

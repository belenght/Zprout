import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ControlCalidad, ControlCalidadLotePayload } from '../models/control-calidad.model';

@Injectable({ providedIn: 'root' })
export class ControlCalidadService {
  private http = inject(HttpClient);
  // Rutas reales: controlCalidadRouter en /api/controles-calidad y
  // controlCalidadPorLoteRouter en /api/lotes/:loteId/controles-calidad (ver app.ts).
  // No hay GET por id ni PUT/DELETE: un control de calidad no se edita ni se borra.
  private readonly baseUrl = `${environment.apiUrl}/controles-calidad`;
  private readonly lotesUrl = `${environment.apiUrl}/lotes`;

  listarPorLote(idLote: number): Observable<ControlCalidad[]> {
    return this.http.get<ControlCalidad[]>(`${this.lotesUrl}/${idLote}/controles-calidad`);
  }

  /**
   * CUU02. Puede devolver un error 409 con { fuera_de_rango: true, rangos }
   * cuando los valores no entran en el rango del TipoDeSemilla del lote y
   * todavia no se confirmo el alta igual (ver control_calidad.controller.ts).
   * Para forzar el alta pese al rango, reenviar el mismo payload con
   * confirmar_no_apto: true.
   */
  registrarSobreLote(payload: ControlCalidadLotePayload): Observable<ControlCalidad> {
    return this.http.post<ControlCalidad>(`${this.baseUrl}/lote`, payload);
  }
}

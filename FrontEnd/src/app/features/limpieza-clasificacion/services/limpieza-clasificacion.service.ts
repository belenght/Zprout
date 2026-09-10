import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LimpiezaClasificacion, LimpiezaPayload } from '../models/limpieza-clasificacion.model';

@Injectable({ providedIn: 'root' })
export class LimpiezaClasificacionService {
  private http = inject(HttpClient);
  // Rutas reales: limpiezaPorLoteRouter en /api/lotes/:loteId/limpiezas y
  // limpiezaRouter en /api/limpiezas (ver app.ts). No hay GET por id ni
  // PUT/DELETE: un registro de limpieza no se edita ni se borra.
  private readonly baseUrl = `${environment.apiUrl}/limpiezas`;
  private readonly lotesUrl = `${environment.apiUrl}/lotes`;

  listarPorLote(idLote: number): Observable<LimpiezaClasificacion[]> {
    return this.http.get<LimpiezaClasificacion[]>(`${this.lotesUrl}/${idLote}/limpiezas`);
  }

  /** CUU03. El backend responde 409 si el lote no esta en estado 'En limpieza'. */
  registrar(payload: LimpiezaPayload): Observable<LimpiezaClasificacion> {
    return this.http.post<LimpiezaClasificacion>(this.baseUrl, payload);
  }
}

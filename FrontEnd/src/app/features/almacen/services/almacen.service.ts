import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Almacen, AlmacenPayload } from '../models/almacen.model';

@Injectable({ providedIn: 'root' })
export class AlmacenService {
  private http = inject(HttpClient);
  // Ruta real: almacenRouter montado en /api/almacenes (ver app.ts)
  private readonly baseUrl = `${environment.apiUrl}/almacenes`;

  getAll(): Observable<Almacen[]> {
    return this.http.get<Almacen[]>(this.baseUrl);
  }

  create(payload: AlmacenPayload): Observable<Almacen> {
    return this.http.post<Almacen>(this.baseUrl, payload);
  }

  /**
   * Asigna un lote a este almacen. Endpoint nuevo (ver lote.controller.ts ->
   * asignarAlmacenLote), pero la relacion Lote-Almacen que expone SI esta en
   * el Modelo de Dominio (Almacen 1 -- 0..* Lote) -- solo se le agrego la
   * forma de setearla desde la API, no se inventa la relacion.
   */
  asignarLote(idLote: number, idAlmacen: number | null): Observable<unknown> {
    return this.http.patch(`${environment.apiUrl}/lotes/${idLote}/almacen`, { almacen_id: idAlmacen });
  }
}

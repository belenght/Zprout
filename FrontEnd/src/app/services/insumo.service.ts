import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Insumo } from '../interfaces/insumo';
import { handleHttpError } from './base-http.service';

@Injectable({ providedIn: 'root' })
export class InsumoService {
  private apiUrl = `${environment.apiUrl}/insumos`;

  constructor(private http: HttpClient) {}

  getInsumos(): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(this.apiUrl).pipe(catchError(handleHttpError));
  }

  // El backend deduplica por nombre_insumo (ver insumo.controller.ts): si ya
  // existe uno con ese nombre, lo devuelve en vez de crear otro. Habilita el
  // flujo de GUI-10 "crear insumo al vuelo" sin service aparte de busqueda.
  crearInsumo(nombre_insumo: string, unidad_medida?: string): Observable<Insumo> {
    return this.http.post<Insumo>(this.apiUrl, { nombre_insumo, unidad_medida }).pipe(catchError(handleHttpError));
  }
}

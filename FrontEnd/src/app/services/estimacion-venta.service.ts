import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { EstimacionVenta } from '../interfaces/estimacion-venta';
import { handleHttpError } from './base-http.service';

@Injectable({ providedIn: 'root' })
export class EstimacionVentaService {
  private apiUrl = `${environment.apiUrl}/estimaciones-venta`;

  constructor(private http: HttpClient) {}

  // Sin filtro trae todas (se usa para armar el listado de GUI-09 sin N+1);
  // con loteId filtra server-side (se usa en GUI-10 al abrir un lote puntual).
  getEstimaciones(loteId?: number): Observable<EstimacionVenta[]> {
    const url = loteId ? `${this.apiUrl}?lote_id=${loteId}` : this.apiUrl;
    return this.http.get<EstimacionVenta[]>(url).pipe(catchError(handleHttpError));
  }
}

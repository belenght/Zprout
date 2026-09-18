import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Lote, NuevoLotePayload } from '../interfaces/lote';
import { handleHttpError } from './base-http.service';

@Injectable({ providedIn: 'root' })
export class LoteService {
  private apiUrl = `${environment.apiUrl}/lotes`;

  constructor(private http: HttpClient) {}

  getLotes(): Observable<Lote[]> {
    return this.http.get<Lote[]>(this.apiUrl).pipe(catchError(handleHttpError));
  }

  getLote(id: number): Observable<Lote> {
    return this.http.get<Lote>(`${this.apiUrl}/${id}`).pipe(catchError(handleHttpError));
  }

  registrarIngreso(payload: NuevoLotePayload): Observable<Lote> {
    return this.http.post<Lote>(this.apiUrl, payload).pipe(catchError(handleHttpError));
  }

  asignarAlmacen(id: number, almacenId: number): Observable<Lote> {
    return this.http.patch<Lote>(`${this.apiUrl}/${id}/almacen`, { almacen_id: almacenId }).pipe(
      catchError(handleHttpError)
    );
  }
}

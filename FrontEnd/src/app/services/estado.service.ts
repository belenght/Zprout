import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { EstadoHistorial } from '../interfaces/estado';
import { handleHttpError } from './base-http.service';

@Injectable({ providedIn: 'root' })
export class EstadoService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getHistorialPorLote(loteId: number): Observable<EstadoHistorial[]> {
    return this.http
      .get<EstadoHistorial[]>(`${this.apiUrl}/estados/lote/${loteId}`)
      .pipe(catchError(handleHttpError));
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { TipoDeSemilla } from '../interfaces/catalogos';
import { handleHttpError } from './base-http.service';

@Injectable({ providedIn: 'root' })
export class TipoSemillaService {
  private apiUrl = `${environment.apiUrl}/tipos-semilla`;

  constructor(private http: HttpClient) {}

  getTiposSemilla(): Observable<TipoDeSemilla[]> {
    return this.http.get<TipoDeSemilla[]>(this.apiUrl).pipe(catchError(handleHttpError));
  }

  crearTipoSemilla(tipo: TipoDeSemilla): Observable<TipoDeSemilla> {
    return this.http.post<TipoDeSemilla>(this.apiUrl, tipo).pipe(catchError(handleHttpError));
  }

  actualizarTipoSemilla(id: number, tipo: Partial<TipoDeSemilla>): Observable<TipoDeSemilla> {
    return this.http.put<TipoDeSemilla>(`${this.apiUrl}/${id}`, tipo).pipe(catchError(handleHttpError));
  }

  eliminarTipoSemilla(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(handleHttpError));
  }
}

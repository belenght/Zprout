import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Campo } from '../interfaces/catalogos';
import { handleHttpError } from './base-http.service';

@Injectable({ providedIn: 'root' })
export class CampoService {
  private apiUrl = `${environment.apiUrl}/campos`;

  constructor(private http: HttpClient) {}

  getCampos(): Observable<Campo[]> {
    return this.http.get<Campo[]>(this.apiUrl).pipe(catchError(handleHttpError));
  }

  crearCampo(campo: Campo): Observable<Campo> {
    return this.http.post<Campo>(this.apiUrl, campo).pipe(catchError(handleHttpError));
  }

  actualizarCampo(id: number, campo: Partial<Campo>): Observable<Campo> {
    return this.http.put<Campo>(`${this.apiUrl}/${id}`, campo).pipe(catchError(handleHttpError));
  }

  eliminarCampo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(handleHttpError));
  }
}

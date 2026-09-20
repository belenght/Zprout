import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Almacen } from '../interfaces/almacen';
import { handleHttpError } from './base-http.service';

@Injectable({ providedIn: 'root' })
export class AlmacenService {
  private apiUrl = `${environment.apiUrl}/almacenes`;

  constructor(private http: HttpClient) {}

  getAlmacenes(): Observable<Almacen[]> {
    return this.http.get<Almacen[]>(this.apiUrl).pipe(catchError(handleHttpError));
  }

  crearAlmacen(almacen: { tipo: string; capacidad: number }): Observable<Almacen> {
    return this.http.post<Almacen>(this.apiUrl, almacen).pipe(catchError(handleHttpError));
  }

  actualizarAlmacen(id: number, almacen: Partial<{ tipo: string; capacidad: number }>): Observable<Almacen> {
    return this.http.put<Almacen>(`${this.apiUrl}/${id}`, almacen).pipe(catchError(handleHttpError));
  }

  eliminarAlmacen(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(handleHttpError));
  }
}

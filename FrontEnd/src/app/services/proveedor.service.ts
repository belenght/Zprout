import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Proveedor } from '../interfaces/catalogos';
import { handleHttpError } from './base-http.service';

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private apiUrl = `${environment.apiUrl}/proveedores`;

  constructor(private http: HttpClient) {}

  getProveedores(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(this.apiUrl).pipe(catchError(handleHttpError));
  }

  crearProveedor(proveedor: Proveedor): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.apiUrl, proveedor).pipe(catchError(handleHttpError));
  }

  actualizarProveedor(id: number, proveedor: Partial<Proveedor>): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.apiUrl}/${id}`, proveedor).pipe(catchError(handleHttpError));
  }

  eliminarProveedor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(handleHttpError));
  }
}

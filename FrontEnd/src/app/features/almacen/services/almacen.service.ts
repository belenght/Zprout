import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Almacen, AlmacenPayload } from '../models/almacen.model';

@Injectable({ providedIn: 'root' })
export class AlmacenService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/almacen`;

  getAll(): Observable<Almacen[]> {
    return this.http.get<Almacen[]>(this.baseUrl);
  }

  getById(id: number): Observable<Almacen> {
    return this.http.get<Almacen>(`${this.baseUrl}/${id}`);
  }

  create(payload: AlmacenPayload): Observable<Almacen> {
    return this.http.post<Almacen>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<AlmacenPayload>): Observable<Almacen> {
    return this.http.put<Almacen>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

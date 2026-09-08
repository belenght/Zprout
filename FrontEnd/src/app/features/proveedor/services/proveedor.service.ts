import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Proveedor, ProveedorPayload } from '../models/proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/proveedor`;

  getAll(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(this.baseUrl);
  }

  getById(id: number): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.baseUrl}/${id}`);
  }

  create(payload: ProveedorPayload): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<ProveedorPayload>): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

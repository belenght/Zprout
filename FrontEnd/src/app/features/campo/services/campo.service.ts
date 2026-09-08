import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Campo, CampoPayload } from '../models/campo.model';

@Injectable({ providedIn: 'root' })
export class CampoService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/campo`;

  getAll(): Observable<Campo[]> {
    return this.http.get<Campo[]>(this.baseUrl);
  }

  getById(id: number): Observable<Campo> {
    return this.http.get<Campo>(`${this.baseUrl}/${id}`);
  }

  create(payload: CampoPayload): Observable<Campo> {
    return this.http.post<Campo>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<CampoPayload>): Observable<Campo> {
    return this.http.put<Campo>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

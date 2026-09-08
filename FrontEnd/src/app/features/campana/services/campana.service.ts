import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Campana, CampanaPayload } from '../models/campana.model';

@Injectable({ providedIn: 'root' })
export class CampanaService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/campana`;

  getAll(): Observable<Campana[]> {
    return this.http.get<Campana[]>(this.baseUrl);
  }

  getById(id: number): Observable<Campana> {
    return this.http.get<Campana>(`${this.baseUrl}/${id}`);
  }

  create(payload: CampanaPayload): Observable<Campana> {
    return this.http.post<Campana>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<CampanaPayload>): Observable<Campana> {
    return this.http.put<Campana>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Partida, PartidaPayload } from '../models/partida.model';

@Injectable({ providedIn: 'root' })
export class PartidaService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/partida`;

  getAll(): Observable<Partida[]> {
    return this.http.get<Partida[]>(this.baseUrl);
  }

  getById(id: number): Observable<Partida> {
    return this.http.get<Partida>(`${this.baseUrl}/${id}`);
  }

  create(payload: PartidaPayload): Observable<Partida> {
    return this.http.post<Partida>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<PartidaPayload>): Observable<Partida> {
    return this.http.put<Partida>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

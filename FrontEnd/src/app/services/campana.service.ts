import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { handleHttpError } from './base-http.service';

// DTO que llega del backend (campana.controller.ts)
export interface Campana {
  id_campana: number;
  nombre: string; // ej: "2025/2026"
  fecha_inicio?: string;
  fecha_fin?: string | null;
  vigente: boolean;
}

@Injectable({ providedIn: 'root' })
export class CampanaService {
  private apiUrl = `${environment.apiUrl}/campanas`;

  constructor(private http: HttpClient) {}

  // El backend responde 404 si no hay ninguna campaña marcada como vigente.
  getCampanaVigente(): Observable<Campana> {
    return this.http.get<Campana>(`${this.apiUrl}/vigente`).pipe(catchError(handleHttpError));
  }
}
